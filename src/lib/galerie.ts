import type { Case } from '../types'
import { getStructure, reconstruirePoeme } from '../structures'
import { attributionEnMorceaux, nomAffiche } from './attribution'
import { tr } from '../i18n'

/**
 * La galerie lue comme le sommaire d'une revue — audit du 30 septembre.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * La vitrine publique montrait des FRAGMENTS et non des poèmes. Le titre de
 * repli collait les cases par des points médians et se coupait à 48 signes
 * (« le vernis · craquelé · avale · une lampe · sourd ») ; l'aperçu empilait
 * les cases, une par ligne (« le vernis / craquelé »). C'est exactement le
 * défaut que le lot 11 a corrigé au recueil, resté entier ici — avec ses
 * séparateurs perdus (« et », les virgules de la phrase courte).
 *
 * Tout ce qui se lit d'une publication passe désormais par ce module, sans
 * une seule requête : la galerie, la page d'un auteur, le profil, le
 * recueil et le feuillet l'emploient, et les mesures le lisent sous Node.
 */

export type TypePublication = 'poeme' | 'dessin'

/** Une ligne de la table `gallery`, telle que les écrans la lisent. */
export interface Publication {
  id: string
  type: TypePublication
  titre: string | null
  payload: string
  image_url: string | null
  author_pseudo: string
  author_avatar: string | null
  author_id?: string | null
  created_at: string
  views_count?: number | null
}

/** Le payload d'un poème : les cases ENTIÈRES, coutures comprises. */
export interface PoemePublie {
  cases: Partial<Case>[]
  structureId: string
  titre?: string | null
  langue?: string
}

export interface DessinPublie {
  imageDataUrl?: string
  texteVision?: string | null
  nbBandes?: number
  langue?: string
}

export function lirePoemePublie(payload: string): PoemePublie | null {
  try {
    const p = JSON.parse(payload) as PoemePublie
    return p && Array.isArray(p.cases) ? p : null
  } catch { return null }
}

export function lireDessinPublie(payload: string): DessinPublie | null {
  try { return JSON.parse(payload) as DessinPublie } catch { return null }
}

/** Langue d'une publication — portée par le payload ; l'historique est français. */
export function languePublication(it: Pick<Publication, 'payload'>): 'fr' | 'en' {
  try {
    const l = (JSON.parse(it.payload) as { langue?: string }).langue
    return l === 'en' ? 'en' : 'fr'
  } catch { return 'fr' }
}

// ── Le poème entier ──────────────────────────────────────────────────────

/** Une case lue d'un payload ancien peut n'avoir que son texte. */
function caseComplete(c: Partial<Case>, i: number): Case {
  return {
    numero: i + 1, fonction: '', consigne: '', auteur: 'humain', ts: 0,
    ...c,
    texte: typeof c.texte === 'string' ? c.texte : '',
  }
}

/**
 * Les vers du poème, reconstruits comme au recueil : la phrase courte et la
 * phrase étoffée se recousent en UNE ligne avec leurs séparateurs, le vers
 * libre et l'Atelier gardent un vers par case. La structure est lue dans la
 * langue de la PUBLICATION — « et » ne doit pas devenir « and » parce que le
 * lecteur a changé de langue.
 */
export function versPublies(p: PoemePublie): string[] {
  const langue = p.langue === 'en' ? 'en' : 'fr'
  const structure = getStructure(p.structureId, langue)
  const entier = reconstruirePoeme(p.cases.map(caseComplete), structure)
  return entier.split('\n').map(l => l.trim()).filter(Boolean)
}

/** Le premier vers — l'incipit, qui sert de titre aux poèmes sans titre. */
export function incipit(p: PoemePublie): string {
  return versPublies(p)[0] ?? ''
}

/**
 * Ce qui tient lieu de titre dans le sommaire. Le titre donné d'abord ;
 * sinon l'incipit ENTIER — c'est l'affichage qui le replie sur deux lignes,
 * jamais une coupe à 48 signes au milieu d'un mot.
 */
export function tetePublication(it: Publication): string {
  if (it.titre?.trim()) return it.titre.trim()
  if (it.type === 'poeme') {
    const p = lirePoemePublie(it.payload)
    if (p?.titre?.trim()) return p.titre.trim()
    const premier = p ? incipit(p) : ''
    if (premier) return premier
  } else {
    const d = lireDessinPublie(it.payload)
    const ligne = d?.texteVision?.split('\n').find(l => l.trim())?.trim()
    if (ligne) return ligne
  }
  return tr('Sans titre', 'Untitled')
}

// ── La signature ─────────────────────────────────────────────────────────

/**
 * Les pseudos qui ne désignent PERSONNE. Sans compte, on publie sous
 * « Anonyme », et `/u/Anonyme` rassemblait tous les anonymes du jeu sous un
 * même nom — une page d'auteur qui n'en est pas une.
 */
export function estAnonyme(pseudo: string | null | undefined): boolean {
  const p = (pseudo ?? '').trim().toLowerCase()
  return p === '' || p === 'anonyme' || p === 'anonymous'
}

/** « 29 SEPTEMBRE », et l'année seulement quand ce n'est pas celle-ci. */
export function dateSignature(iso: string | number, maintenant: Date = new Date()): string {
  const d = new Date(iso)
  const memeAnnee = d.getFullYear() === maintenant.getFullYear()
  return d.toLocaleDateString(tr('fr-FR', 'en-GB'), {
    day: 'numeric', month: 'long', ...(memeAnnee ? {} : { year: 'numeric' }),
  }).toUpperCase()
}

// ── Les coutures d'une publication ───────────────────────────────────────

/**
 * Qui a écrit cette case, lu par un INCONNU.
 *
 * `attribution` est écrite pour le recueil, où le lecteur est l'auteur :
 * une case humaine y dit « toi ». En galerie, le lecteur est quelqu'un
 * d'autre, et « toi » le désignerait, lui. La main qui publie reprend donc
 * son nom ; tout le reste — voix, mains de salon, joueurs — se dit comme au
 * recueil, par la même fonction.
 */
export function attributionPubliee(c: Partial<Case>, auteur: string): { texte: string; voix: string[] } {
  // Les salons publiaient leurs cases réduites à leur texte : sans `auteur`,
  // on ne sait pas qui a écrit, et l'attribuer à celui qui publie serait
  // inventer.
  if (!c.auteur) return { texte: tr('une main', 'a hand'), voix: [] }
  const cas = caseComplete(c, 0)
  if (typeof cas.nbVoix === 'number') {
    const { texte, voix } = attributionEnMorceaux(cas)
    if (cas.auteur === 'humain' || cas.nbVoix === 0) return { texte: auteur, voix: [] }
    if (cas.auteur === 'mixte') {
      const compte = cas.nbVoix === 1 ? tr('une voix', 'one voice') : `${cas.nbVoix} ${tr('voix', 'voices')}`
      return { texte: `${auteur} ${tr('et', 'and')} ${compte}`, voix: voix.map(nomAffiche) }
    }
    return { texte, voix: voix.map(nomAffiche) }
  }
  // La case de celui qui publie : « toi » au recueil, son nom ici.
  const sienne = cas.moi || (cas.auteur === 'humain' && !cas.joueurNumero && !('pseudo' in cas))
  const { texte, voix } = attributionEnMorceaux(sienne ? { ...cas, moi: false, pseudo: auteur } : cas)
  return { texte, voix: voix.map(nomAffiche) }
}

/** Les coutures ne s'ouvrent que si elles ont quelque chose à dire. */
export function aDesCoutures(p: PoemePublie): boolean {
  return p.cases.some(c => !!c.auteur)
}

// ── Les réactions ────────────────────────────────────────────────────────

/**
 * Quatre réactions, en SIGNES de la maison et non en emoji.
 *
 * `cle` est la valeur écrite en base et ne change pas : les réactions déjà
 * posées sous « 🌙 » restent comptées. Seul ce qu'on IMPRIME change. Sur
 * iOS, « 🌙 » et « 👁 » sortaient en pictogrammes Apple jaunes et beiges,
 * seuls points de couleur d'une page qui n'en a que deux, sous un jeu qui
 * s'interdit l'emoji.
 *
 * ☾ ✦ ❀ ⁂ n'ont aucune présentation emoji (Unicode ne leur en donne pas,
 * la mesure le vérifie) : ils prennent l'encre de l'ambiance. Le quatrième
 * était l'alchimique « 🜔 », qu'aucune des trois familles de la maison ne
 * dessine : capturé, le repli système le rendait « ⊖ », un signe moins.
 * L'astérisme « ⁂ » dit le trouble sans dire « moins ».
 */
export const REACTIONS = [
  { cle: '🌙', signe: '☾', libelle: () => tr('Onirique', 'Dreamlike') },
  { cle: '✦', signe: '✦', libelle: () => tr('Sublime', 'Sublime') },
  { cle: '❀', signe: '❀', libelle: () => tr('Délicat', 'Delicate') },
  { cle: '🜔', signe: '⁂', libelle: () => tr('Troublant', 'Unsettling') },
] as const

export type CleReaction = typeof REACTIONS[number]['cle']

export function estCleReaction(s: string): s is CleReaction {
  return REACTIONS.some(r => r.cle === s)
}

/** Ce qu'une publication a reçu : ses lectures, et ses réactions par clé. */
export interface Echos {
  lectures: number
  reactions: Partial<Record<string, number>>
}

/** Compte les lignes de `gallery_reactions` par publication. */
export function compterReactions(rows: { gallery_id: string; emoji: string }[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  for (const r of rows) {
    const m = (out[r.gallery_id] ??= {})
    m[r.emoji] = (m[r.emoji] ?? 0) + 1
  }
  return out
}

export function totalReactions(e: Pick<Echos, 'reactions'>): number {
  return REACTIONS.reduce((s, r) => s + (e.reactions[r.cle] ?? 0), 0)
}

/** « 14 LECTURES » — et rien du tout pour zéro, qui ne dit rien. */
export function libelleLectures(n: number): string {
  if (n <= 0) return ''
  return n === 1 ? tr('1 LECTURE', '1 READ') : tr(`${n} LECTURES`, `${n} READS`)
}

/**
 * « ☾ 3 · ✦ 1 · 14 LECTURES » — ce qu'un poème a reçu, en petites
 * capitales. Les réactions à zéro se taisent : quatre « 0 » alignés sous un
 * poème neuf font un tableau de score, pas une revue.
 */
export function libelleEchos(e: Echos): string {
  const parts = REACTIONS
    .filter(r => (e.reactions[r.cle] ?? 0) > 0)
    .map(r => `${r.signe} ${e.reactions[r.cle]}`)
  const l = libelleLectures(e.lectures)
  if (l) parts.push(l)
  return parts.join(' · ')
}

// ── La semaine des lecteurs ──────────────────────────────────────────────

/**
 * Les publications qui ont le plus reçu ces sept derniers jours.
 *
 * La seule découverte possible était un fil chronologique : un poème
 * publié lundi était enfoui jeudi sous trente autres, quels qu'aient été ses
 * lecteurs. Le sommaire en garde trois, sans afficher le compte — un
 * classement chiffré ferait un palmarès, et la revue n'en tient pas.
 * À égalité, la réaction la plus récente l'emporte.
 */
export function retenusDeLaSemaine(
  rows: { gallery_id: string; created_at?: string | null }[],
  maintenant: number,
  n = 3,
): string[] {
  const depuis = maintenant - 7 * 86_400_000
  const parId = new Map<string, { total: number; dernier: number }>()
  for (const r of rows) {
    const t = r.created_at ? Date.parse(r.created_at) : NaN
    if (!Number.isFinite(t) || t < depuis || t > maintenant + 60_000) continue
    const e = parId.get(r.gallery_id) ?? { total: 0, dernier: 0 }
    e.total += 1
    e.dernier = Math.max(e.dernier, t)
    parId.set(r.gallery_id, e)
  }
  return [...parId.entries()]
    .sort((a, b) => b[1].total - a[1].total || b[1].dernier - a[1].dernier)
    .slice(0, n)
    .map(([id]) => id)
}

// ── Le courrier de l'auteur ──────────────────────────────────────────────

/** Ce qu'on a déjà montré à l'auteur : lectures et réactions, par publication. */
export type Releve = Record<string, { l: number; r: number }>

export interface Nouvelles { id: string; lectures: number; reactions: number }

/**
 * Ce qui est arrivé depuis le dernier passage au recueil.
 *
 * Le recueil compare ce qu'il lit à ce qu'il avait montré la fois d'avant :
 * un compteur qui affiche toujours « 14 » ne dit pas qu'on vient d'être lu,
 * une ligne qui dit « trois lectures depuis ta dernière visite » le dit. Le
 * plus lu d'abord. Une publication jamais relevée compte tout ce qu'elle a.
 */
export function nouvelles(avant: Releve | null, maintenant: Releve): Nouvelles[] {
  const out: Nouvelles[] = []
  for (const [id, m] of Object.entries(maintenant)) {
    const a = avant?.[id] ?? { l: 0, r: 0 }
    const lectures = Math.max(0, m.l - a.l)
    const reactions = Math.max(0, m.r - a.r)
    if (lectures + reactions > 0) out.push({ id, lectures, reactions })
  }
  return out.sort((x, y) => (y.reactions * 3 + y.lectures) - (x.reactions * 3 + x.lectures))
}

/** « 3 lectures et 1 réaction » — la phrase du courrier, sans chiffre nul. */
export function phraseNouvelles(n: Pick<Nouvelles, 'lectures' | 'reactions'>): string {
  const l = n.lectures === 1 ? tr('une lecture', 'one read') : tr(`${n.lectures} lectures`, `${n.lectures} reads`)
  const r = n.reactions === 1 ? tr('une réaction', 'one reaction') : tr(`${n.reactions} réactions`, `${n.reactions} reactions`)
  if (n.lectures > 0 && n.reactions > 0) return `${l} ${tr('et', 'and')} ${r}`
  return n.lectures > 0 ? l : r
}

/**
 * La ligne du courrier, au-dessus du recueil.
 *
 * « depuis ton dernier passage » seulement quand il y a eu un passage
 * relevé : la première fois, ce que la publication a reçu n'a pas d'avant,
 * et la phrase mentirait. `autres` : les publications qui ont aussi reçu
 * quelque chose, comptées sans être détaillées — un courrier tient en une
 * ligne, il n'est pas un tableau de bord.
 */
export function phraseCourrier(tete: string, n: Pick<Nouvelles, 'lectures' | 'reactions'>, depuis: boolean, autres = 0): string {
  const quoi = phraseNouvelles(n)
  const base = depuis
    ? tr(`« ${extraitCourt(tete)} » — ${quoi} depuis ton dernier passage`, `“${extraitCourt(tete)}” — ${quoi} since your last visit`)
    : tr(`« ${extraitCourt(tete)} » — ${quoi}`, `“${extraitCourt(tete)}” — ${quoi}`)
  if (autres <= 0) return `${base}.`
  return autres === 1
    ? tr(`${base}, et un autre de tes feuillets a eu des lecteurs.`, `${base}, and another of your pages had readers.`)
    : tr(`${base}, et ${autres} autres de tes feuillets ont eu des lecteurs.`, `${base}, and ${autres} more of your pages had readers.`)
}

/** Un extrait court pour une phrase : coupé au mot, jamais dans le mot. */
export function extraitCourt(s: string, max = 38): string {
  const t = s.trim()
  if (t.length <= max) return t
  const coupe = t.slice(0, max)
  const espace = coupe.lastIndexOf(' ')
  return `${(espace > max * 0.5 ? coupe.slice(0, espace) : coupe).trim()}…`
}

// ── Chercher ─────────────────────────────────────────────────────────────

function sansAccents(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * La recherche lit le titre, l'auteur ET le poème. Elle ne lisait que le
 * titre et l'auteur, or la plupart des publications n'ont pas de titre :
 * chercher « baleine » ne trouvait pas « la baleine infirme ».
 */
export function correspond(it: Publication, q: string): boolean {
  const termes = sansAccents(q).split(/\s+/).filter(Boolean)
  if (!termes.length) return true
  const p = it.type === 'poeme' ? lirePoemePublie(it.payload) : null
  const d = it.type === 'dessin' ? lireDessinPublie(it.payload) : null
  const hay = sansAccents([
    it.titre ?? '', it.author_pseudo,
    p ? versPublies(p).join(' ') : '',
    d?.texteVision ?? '',
  ].join(' '))
  return termes.every(t => hay.includes(t))
}

/** Échappe `%`, `_` et `\` pour un `ilike` qui doit valoir une égalité. */
export function motifExact(s: string): string {
  return s.replace(/[\\%_]/g, c => `\\${c}`)
}

