import type { Poeme } from '../types'
import type { VersRecolte } from '../db'
import { getStructure, reconstruirePoeme } from '../structures'
import { tr } from '../i18n'

/**
 * Emporter le recueil — lot 20 de l'audit du 10 septembre.
 *
 * ── Ce que la vérification a corrigé au rapport ───────────────────────────
 *
 * L'audit écrit que le poème sauvegardé « part chez Supabase, rattaché à un
 * jeton anonyme ». C'est faux : `sauvegarderPoeme` écrit dans Dexie, et
 * AUCUN appel n'envoie un poème au serveur. Seules les publications en
 * galerie y vont, et ce sont des copies.
 *
 * La conclusion du rapport tient quand même, et elle est même plus sévère
 * que ce qu'il croyait : vider les données du navigateur, changer de
 * téléphone ou réinstaller la PWA efface tout, et il n'existe nulle part
 * ailleurs une seule copie.
 *
 * ── Deux fichiers, parce qu'ils ne servent pas à la même chose ────────────
 *
 * Le `.txt` est pour le médium : les poèmes, lisibles, dans l'ordre, à
 * relire ou à recopier ailleurs. C'est le livrable.
 *
 * Le `.json` est pour la machine : il se relit et rend la bibliothèque
 * entière. Sans lui, l'export serait un souvenir et non une sauvegarde —
 * on emporterait ses poèmes sans pouvoir les remettre.
 */

/** La version du format. Un jour on relira une sauvegarde d'aujourd'hui. */
export const FORMAT = 1

export interface Sauvegarde {
  format: number
  date: number
  poemes: Poeme[]
  recolte: VersRecolte[]
}

function dateLisible(ts: number): string {
  return new Date(ts).toLocaleDateString(tr('fr-FR', 'en-GB'), {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** Le recueil en texte nu — ce qu'on emporte pour le lire. */
export function composerTexte(poemes: Poeme[], recolte: VersRecolte[] = []): string {
  const blocs: string[] = []
  blocs.push(tr('CADAVRE EXQUIS — LE RECUEIL', 'CADAVRE EXQUIS — THE COLLECTION'))
  blocs.push(tr(`Emporté le ${dateLisible(Date.now())}`, `Taken on ${dateLisible(Date.now())}`))
  blocs.push('')

  for (const p of poemes) {
    const structure = getStructure(p.structureId)
    blocs.push('─'.repeat(46))
    blocs.push(`${p.titre ?? tr('Sans titre', 'Untitled')} · ${dateLisible(p.dateCreation)}`)
    blocs.push('')
    blocs.push(reconstruirePoeme(p.cases, structure))
    blocs.push('')
  }

  if (recolte.length) {
    blocs.push('─'.repeat(46))
    blocs.push(tr('LE CARNET — les vers gardés', 'THE NOTEBOOK — kept lines'))
    blocs.push('')
    for (const v of recolte) blocs.push(v.texte)
    blocs.push('')
  }

  return blocs.join('\n')
}

/** Le recueil en sauvegarde — ce qu'on emporte pour le remettre. */
export function composerSauvegarde(poemes: Poeme[], recolte: VersRecolte[] = []): string {
  const s: Sauvegarde = { format: FORMAT, date: Date.now(), poemes, recolte }
  return JSON.stringify(s, null, 2)
}

/**
 * Relit une sauvegarde, ou dit pourquoi elle est illisible.
 *
 * On valide au lieu de faire confiance : le fichier vient d'un dossier de
 * téléchargements, il a pu être tronqué, édité, ou ne pas être le nôtre. Une
 * restauration qui plante à mi-chemin laisserait une bibliothèque à moitié
 * écrasée, ce qui est pire que pas de restauration du tout.
 */
export function lireSauvegarde(brut: string): { ok: true; data: Sauvegarde } | { ok: false; raison: string } {
  let json: unknown
  try {
    json = JSON.parse(brut)
  } catch {
    return { ok: false, raison: tr('Ce fichier n’est pas une sauvegarde.', 'This file is not a backup.') }
  }
  if (!json || typeof json !== 'object') {
    return { ok: false, raison: tr('Ce fichier n’est pas une sauvegarde.', 'This file is not a backup.') }
  }
  const s = json as Partial<Sauvegarde>
  if (typeof s.format !== 'number' || s.format > FORMAT) {
    return {
      ok: false,
      raison: tr(
        'Cette sauvegarde vient d’une version plus récente du jeu.',
        'This backup comes from a newer version of the game.',
      ),
    }
  }
  if (!Array.isArray(s.poemes)) {
    return { ok: false, raison: tr('Cette sauvegarde ne contient aucun poème.', 'This backup holds no poem.') }
  }
  // On ne garde que les entrées qui ont de quoi être un poème : une
  // sauvegarde à moitié valide vaut mieux qu'un refus total.
  const poemes = s.poemes.filter((p): p is Poeme =>
    !!p && typeof p.id === 'string' && Array.isArray(p.cases) && typeof p.dateCreation === 'number')
  const recolte = Array.isArray(s.recolte)
    ? s.recolte.filter((v): v is VersRecolte => !!v && typeof v.id === 'string' && typeof v.texte === 'string')
    : []
  if (poemes.length === 0 && recolte.length === 0) {
    return { ok: false, raison: tr('Cette sauvegarde est vide.', 'This backup is empty.') }
  }
  return { ok: true, data: { format: s.format, date: s.date ?? 0, poemes, recolte } }
}

/** Le nom du fichier — daté, pour qu'on ne les confonde pas. */
export function nomDeFichier(ext: 'txt' | 'json'): string {
  return `cadavre-exquis-${new Date().toISOString().slice(0, 10)}.${ext}`
}
