import { clientAdmin } from './_supabase.js'
import { amorcePour, jourUTC, type Langue } from './_amorces.js'

/**
 * Le poème du jour, côté serveur.
 *
 * ── Ce que ce module garde pour lui ───────────────────────────────────────
 *
 * Le contenu des vers. C'est le pli du papier : tant que la chaîne n'est pas
 * scellée, personne ne lit ce que les autres ont écrit — ni par la base (la
 * politique RLS l'interdit), ni par l'API (rien ici ne le renvoie). Une main
 * reçoit l'ÉCHO, c'est-à-dire un mot, et son propre vers. Rien d'autre.
 *
 * ── Les règles sont en double, et c'est voulu ─────────────────────────────
 *
 * `src/lib/jourLogique.ts` les tient aussi, côté client : longueur du vers,
 * plancher, écho. Le client vérifie par politesse — pour refuser un vers de
 * douze mots sans aller-retour — et le serveur TRANCHE. Un client n'est
 * jamais l'autorité sur une règle de jeu.
 */

/** Le plus long vers qu'on accepte. Mêmes bornes que `jourLogique.ts`. */
export const MOTS_MAX = 9
export const CARACTERES_MAX = 100

/**
 * La longueur minimale d'un poème du jour.
 *
 * Les voix n'interviennent QUE là, et QU'AU scellement : en dessous de cinq
 * vers un poème n'a pas eu le temps d'en devenir un. Au-dessus, on n'ajoute
 * rien — la longueur doit rester la mesure de la journée. Le coût des voix
 * est donc borné par le plancher et jamais par la foule : quatre appels par
 * jour au maximum, zéro dès cinq joueurs.
 */
export const PLANCHER_VERS = 5

/**
 * Combien de signalements retirent un vers.
 *
 * Les vers circulent chez des inconnus : un vers déplacé entre dans LE poème
 * du jour, celui de tout le monde, et attendre une modération manuelle
 * laisserait la journée entière pour le lire.
 *
 * DEUX, et pas un. À un seul, n'importe qui pourrait faire tomber chaque
 * vers du poème l'un après l'autre — une main par vers, la règle « un
 * signalement par main et par vers » n'y changerait rien. À deux, il faut
 * deux comptes d'accord, ce qui n'empêche pas la malveillance organisée
 * mais lui demande un effort que le modérateur a le temps de voir passer.
 *
 * Le premier signalement part quand même par courriel : c'est lui le vrai
 * chemin tant que le rendez-vous est petit.
 */
export const SEUIL_RETRAIT = 2

export type RefusSignalement = 'sien' | 'deja' | 'voix' | 'introuvable'

/**
 * Cette main peut-elle signaler ce vers ?
 *
 * On refuse le SIEN — se signaler soi-même n'a aucun sens et permettrait de
 * retirer son propre vers après coup, donc de récrire le poème des autres.
 * On refuse aussi ceux d'une VOIX : elles n'ont pas de main à protéger, et
 * un vers de voix qui déplairait est un défaut de gabarit, pas une
 * malveillance — il se corrige à la source.
 */
export function refusDeSignalement(
  vers: { main_id: string | null; voix: boolean } | null,
  main: string,
  dejaSignale: boolean,
): RefusSignalement | null {
  if (!vers) return 'introuvable'
  if (vers.voix) return 'voix'
  if (vers.main_id === main) return 'sien'
  if (dejaSignale) return 'deja'
  return null
}

export interface EtatDuJour {
  jour: string
  amorce: string
  /** Le dernier mot du dernier vers, ou de l'amorce. Tout ce qu'on voit. */
  echo: string
  /** Le rang qu'occuperait cette main si elle écrivait maintenant. */
  rang: number
  /** Combien de mains sont déjà passées. Public : ce n'est pas le texte. */
  mains: number
  /** Le vers de cette main, si elle a déjà écrit — le sien, elle peut le lire. */
  monVers: { rang: number; texte: string } | null
  scelle: boolean
}

/** Le dernier mot, ponctuation ôtée. Même règle que `jourLogique.ts`. */
export function dernierMot(texte: string): string {
  const mots = String(texte ?? '').trim().split(/\s+/).filter(Boolean)
  for (let i = mots.length - 1; i >= 0; i--) {
    const mot = mots[i].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    if (mot) return mot
  }
  return ''
}

/**
 * Ce que reçoit la main qui écrit après ce vers-là.
 *
 * Le dernier mot du vers précédent — mais l'amorce ENTIÈRE quand il n'y a
 * pas de vers précédent. Une amorce n'est pas un vers dont on prend la
 * queue : c'est une graine, et une graine se donne entière ; le déterminant
 * en fait partie, il oriente le genre et le nombre de ce qui suivra.
 *
 * ── Pourquoi une fonction et non trois lignes ─────────────────────────────
 *
 * La règle était écrite TROIS fois — l'état du jour, le scellement, le
 * remplacement d'un vers retiré — et la correction de l'amorce entière n'en
 * avait touché qu'une. Les deux autres rendaient encore « cire » pour
 * « la cire » : la première voix d'une journée déserte, et le vers de
 * remplacement du tout premier rang. Écrite ici, elle ne peut plus dériver.
 */
export function echoPour(amorce: string, versPrecedent: string | null | undefined): string {
  return versPrecedent ? dernierMot(versPrecedent) : amorce
}

export type RefusVers = 'vide' | 'trop-long' | 'trop-de-mots' | 'plusieurs-lignes'

/** Ce vers est-il recevable ? Le serveur tranche, le client anticipe. */
export function refusDuVers(texte: unknown): RefusVers | null {
  if (typeof texte !== 'string') return 'vide'
  const t = texte.trim()
  if (!t) return 'vide'
  if (/[\r\n]/.test(t)) return 'plusieurs-lignes'
  if (t.length > CARACTERES_MAX) return 'trop-long'
  if (t.split(/\s+/).filter(Boolean).length > MOTS_MAX) return 'trop-de-mots'
  return null
}

export function langueValide(v: unknown): Langue {
  return v === 'en' ? 'en' : 'fr'
}

interface LigneChaine { id: string; jour: string; amorce: string; scelle_le: string | null }

/**
 * La chaîne du jour, créée si elle n'existe pas encore.
 *
 * `upsert` sur (jour, langue) plutôt que « lire puis insérer » : deux
 * premières mains qui arrivent dans la même seconde créeraient sinon deux
 * chaînes pour le même jour, et le « LE » du poème du jour serait faux dès
 * la première minute.
 */
export async function chaineDuJour(langue: Langue, quand = new Date()): Promise<LigneChaine | null> {
  const admin = clientAdmin()
  if (!admin) return null
  const jour = jourUTC(quand)

  const { data: existante } = await admin
    .from('jour_chaines')
    .select('id,jour,amorce,scelle_le')
    .eq('jour', jour).eq('langue', langue)
    .maybeSingle()
  if (existante) return existante as LigneChaine

  const { data, error } = await admin
    .from('jour_chaines')
    .upsert({ jour, langue, amorce: amorcePour(jour, langue) }, { onConflict: 'jour,langue' })
    .select('id,jour,amorce,scelle_le')
    .single()
  if (error) {
    console.error('[jour] chaîne illisible', error.message)
    return null
  }
  return data as LigneChaine
}

/**
 * Ce que cette main a le droit de savoir.
 *
 * Le SELECT ne demande jamais le texte des autres : on compte les vers et on
 * lit le dernier pour en tirer l'écho, sans jamais le renvoyer entier. Le
 * client ne peut donc pas reconstituer le poème en interrogeant l'API à
 * chaque vers — il n'obtiendrait qu'une suite de derniers mots, ce que le
 * jeu lui donne déjà.
 */
export async function etatDuJour(langue: Langue, mainId: string | null, quand = new Date()): Promise<EtatDuJour | null> {
  const admin = clientAdmin()
  const chaine = await chaineDuJour(langue, quand)
  if (!admin || !chaine) return null

  const { data: vers } = await admin
    .from('jour_vers')
    .select('rang,texte,main_id')
    .eq('chaine_id', chaine.id)
    .order('rang', { ascending: true })

  const tous = (vers ?? []) as { rang: number; texte: string; main_id: string | null }[]
  const mien = mainId ? tous.find(v => v.main_id === mainId) : undefined

  // La première main reçoit l'amorce ENTIÈRE, les suivantes un seul mot.
  const echo = echoPour(chaine.amorce, tous.length ? tous[tous.length - 1].texte : null)

  return {
    jour: chaine.jour,
    amorce: chaine.amorce,
    echo,
    rang: tous.length + 1,
    mains: tous.length,
    monVers: mien ? { rang: mien.rang, texte: mien.texte } : null,
    scelle: chaine.scelle_le !== null,
  }
}

export type VerdictEcriture =
  | { ok: true; rang: number }
  | { ok: false; motif: 'scelle' | 'deja-ecrit' | 'indisponible' | RefusVers }

/**
 * Pose un vers au bout de la chaîne.
 *
 * Le rang se dispute : deux mains qui arrivent ensemble visent le même. On
 * laisse la base trancher — l'index unique `(chaine_id, rang)` en refuse
 * une — et on retente au rang suivant. Quelques essais suffisent : à deux
 * cents mains par jour, une collision est déjà rare.
 */
export async function poserVers(
  langue: Langue,
  mainId: string,
  pseudo: string | null,
  texte: string,
  quand = new Date(),
): Promise<VerdictEcriture> {
  const refus = refusDuVers(texte)
  if (refus) return { ok: false, motif: refus }

  const admin = clientAdmin()
  const chaine = await chaineDuJour(langue, quand)
  if (!admin || !chaine) return { ok: false, motif: 'indisponible' }
  if (chaine.scelle_le) return { ok: false, motif: 'scelle' }

  for (let essai = 0; essai < 5; essai++) {
    const { count } = await admin
      .from('jour_vers')
      .select('id', { count: 'exact', head: true })
      .eq('chaine_id', chaine.id)

    const rang = (count ?? 0) + 1
    const { error } = await admin.from('jour_vers').insert({
      chaine_id: chaine.id, rang, main_id: mainId,
      pseudo: pseudo?.slice(0, 30) ?? null, texte: texte.trim(),
    })
    if (!error) return { ok: true, rang }

    // 23505 : conflit d'unicité. Deux causes, deux réponses opposées — il
    // faut lire LAQUELLE, sinon on réessaierait indéfiniment pour une main
    // qui a simplement déjà joué.
    if (error.code !== '23505') {
      console.error('[jour] vers refusé', error.message)
      return { ok: false, motif: 'indisponible' }
    }
    if (error.message.includes('une_main_par_chaine')) return { ok: false, motif: 'deja-ecrit' }
    // Sinon : le rang vient d'être pris par quelqu'un d'autre. On recommence.
  }
  return { ok: false, motif: 'indisponible' }
}

/**
 * Scelle les chaînes des jours écoulés, en complétant au plancher.
 *
 * Appelé par le cron. Il ne scelle JAMAIS la journée en cours : le poème
 * appartient à sa journée jusqu'à son dernier instant, et une chaîne scellée
 * ne se rouvre pas.
 *
 * Les vers de voix sont écrits par l'appelant (`ecrireVoix`) : ce module ne
 * sait pas parler au modèle, il sait seulement combien de vers manquent et
 * quel écho chacun reçoit.
 */
export async function chainesAsceller(quand = new Date()): Promise<{ id: string; jour: string; langue: Langue; amorce: string; manque: number; echo: string }[]> {
  const admin = clientAdmin()
  if (!admin) return []
  const aujourdhui = jourUTC(quand)

  const { data } = await admin
    .from('jour_chaines')
    .select('id,jour,langue,amorce')
    .is('scelle_le', null)
    .lt('jour', aujourdhui)
    .order('jour', { ascending: true })
    .limit(20)

  const dues: { id: string; jour: string; langue: Langue; amorce: string; manque: number; echo: string }[] = []
  for (const c of (data ?? []) as { id: string; jour: string; langue: Langue; amorce: string }[]) {
    const { data: vers } = await admin
      .from('jour_vers').select('rang,texte')
      .eq('chaine_id', c.id).order('rang', { ascending: true })
    const tous = (vers ?? []) as { rang: number; texte: string }[]
    dues.push({
      ...c,
      manque: Math.max(0, PLANCHER_VERS - tous.length),
      // Une journée déserte : la première voix est la première main, elle
      // reçoit donc l'amorce entière comme l'aurait reçue un joueur.
      echo: echoPour(c.amorce, tous.length ? tous[tous.length - 1].texte : null),
    })
  }
  return dues
}

/** Pose un vers de voix. Le rang est imposé : on complète une fin de chaîne. */
export async function poserVersDeVoix(chaineId: string, rang: number, texte: string, voixId: string): Promise<boolean> {
  const admin = clientAdmin()
  if (!admin) return false
  const { error } = await admin.from('jour_vers').insert({
    chaine_id: chaineId, rang, main_id: null, voix: true, voix_nom: voixId, texte: texte.trim(),
  })
  if (error) console.error('[jour] voix refusée', error.message)
  return !error
}

/** Ferme la chaîne. Après quoi ses vers deviennent lisibles par tous. */
export async function sceller(chaineId: string): Promise<boolean> {
  const admin = clientAdmin()
  if (!admin) return false
  const { error } = await admin
    .from('jour_chaines')
    .update({ scelle_le: new Date().toISOString() })
    .eq('id', chaineId).is('scelle_le', null)
  return !error
}


/**
 * Retire un vers : on le REMPLACE, on ne l'efface jamais.
 *
 * Un trou dans la chaîne casserait les rangs, et l'écho qu'a reçu la main
 * suivante ne voudrait plus rien dire. Le vers devient donc un vers de voix,
 * écrit sur le MÊME écho que celui qu'il remplace — la main qui a suivi
 * répondait à ce mot-là, et elle continue d'y répondre.
 *
 * Ce que le retrait efface, en revanche : le lien vers la main et son
 * pseudo. Le poème garde sa forme, la personne disparaît du registre.
 *
 * Le texte de remplacement est fourni par l'appelant — ce module ne sait pas
 * parler au modèle. S'il manque, on pose une ligne neutre plutôt que de
 * laisser le vers en place : mieux vaut un vers pâle qu'un vers signalé
 * deux fois qui reste affiché.
 */
export async function retirerVers(versId: string, remplacement: string | null, voixId: string | null): Promise<boolean> {
  const admin = clientAdmin()
  if (!admin) return false
  const { error } = await admin
    .from('jour_vers')
    .update({
      texte: remplacement ?? '—',
      retire: true,
      voix: true,
      voix_nom: remplacement ? voixId : null,
      main_id: null,
      pseudo: null,
    })
    .eq('id', versId)
  if (error) console.error('[jour] retrait impossible', error.message)
  return !error
}

/** L'écho qu'avait reçu le vers de ce rang — celui du vers précédent. */
export async function echoDuRang(chaineId: string, rang: number, amorce: string): Promise<string> {
  if (rang <= 1) return echoPour(amorce, null)
  const admin = clientAdmin()
  if (!admin) return echoPour(amorce, null)
  const { data } = await admin
    .from('jour_vers').select('texte')
    .eq('chaine_id', chaineId).eq('rang', rang - 1)
    .maybeSingle()
  return echoPour(amorce, (data as { texte?: string } | null)?.texte ?? null)
}
