/**
 * La convenance — ce qui n'entre pas dans un texte que des inconnus liront.
 *
 * ── Où cela s'applique ────────────────────────────────────────────────────
 *
 * Partout où un joueur écrit pour d'autres qu'il ne connaît pas : le vers du
 * poème du jour (LE poème de tout le monde), le nom de plume (affiché au
 * salon, en galerie, dans les coutures du jour), le fragment d'un salon
 * public, et ce qu'on publie en galerie. La table locale n'est pas
 * concernée : on y écrit ce qu'on veut, entre soi, sur son téléphone.
 *
 * ── Ce qui est écarté, et ce qui ne l'est pas ─────────────────────────────
 *
 * Les injures sexuelles, les insultes qui visent une origine, une religion
 * ou une orientation, et la pornographie. PAS le registre familier : un
 * « merde » ou un « cul-de-sac » appartiennent à la langue, et un filtre
 * qui les chasse finit par chasser la poésie. Pas non plus les mots qui ont
 * un sens honnête : « baiser » (le baiser), « chatte » (la chatte du
 * voisin), « queue », « tapette » (à mouches), « pine » en anglais (le pin).
 *
 * Les listes sont par langue, parce qu'un mot grossier dans l'une est
 * innocent dans l'autre : « bite » mord en anglais, « retard » est un délai
 * en français, « con » est un argument en anglais. Un nom de plume n'a pas
 * de langue : il passe les trois listes.
 *
 * ── Comment on lit ────────────────────────────────────────────────────────
 *
 * On ramène le texte à son squelette : minuscules, sans accents, chiffres
 * pris pour des lettres (« pu73 »), points, astérisques et soulignements
 * pris pour des blancs (« xX_salope_Xx »). Chaque mot de la liste admet ses
 * lettres doublées (« fuuuck »), et les mots épelés lettre à lettre
 * (« p u t e », « f.u.c.k ») sont recollés. « p*te » passe : c'est assumé.
 *
 * On compare MOT À MOT, jamais en sous-chaîne, sauf pour quelques racines
 * sans aucun sens honnête (« fuck », « encul ») : « salopette », « Conakry »
 * ou « violon » ne doivent rien craindre.
 *
 * ── Deux copies, comme les règles du poème du jour ────────────────────────
 *
 * Le client anticipe, pour dire non sans aller-retour ; le serveur tranche
 * (`api/_convenance.ts`, et la base pour les noms de plume et les fragments
 * de salon, `cadavre_inconvenant` dans la migration du lancement).
 * `convenance.test.ts` tient les trois listes d'accord.
 *
 * Aucune importation : se mesure seul.
 */

export type LangueConvenance = 'fr' | 'en' | 'tout'

/** Dans les deux langues. Rangés sans accents : on compare des squelettes. */
export const MOTS_COMMUNS: readonly string[] = [
  // la haine
  'nigger', 'nigga', 'negre', 'negresse', 'bougnoule', 'bicot', 'youpin', 'youtre',
  'faggot', 'fag', 'tarlouze', 'tafiole', 'pede', 'pd', 'gouine', 'kike', 'chink', 'tranny',
  'hitler', 'nazi',
  // la pornographie
  'porno', 'porn', 'pornographie', 'pedophile', 'pedo',
]

export const MOTS_FR: readonly string[] = [
  'pute', 'putain', 'salope', 'salopard', 'salaud', 'connard', 'connarde', 'connasse', 'con', 'conne',
  'nique', 'niquer', 'bite', 'couille', 'petasse', 'poufiasse', 'pouffiasse',
  'branleur', 'branleuse', 'branlette', 'suceuse', 'fellation', 'viol', 'violeur', 'violeuse',
]

export const MOTS_EN: readonly string[] = [
  'cunt', 'whore', 'slut', 'bitch', 'asshole', 'dickhead', 'twat', 'jizz',
  'blowjob', 'handjob', 'rape', 'rapist', 'retard', 'wanker',
]

/** Racines sans aucun sens honnête : cherchées DANS les mots. */
// « nigg » n'y est pas : « niggle » (chicaner) est un mot anglais honnête.
export const RACINES: readonly string[] = ['fuck', 'encul', 'motherf', 'fagg', 'pedophil']

/** Le squelette d'un texte : minuscules, sans accents, chiffres-lettres, sans points ni astérisques. */
export function squelette(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$€]/g, c => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '€': 'e' } as Record<string, string>)[c])
    // Des séparateurs, pas des colles : effacés, ils soudaient « xX_salope_Xx »
    // en un seul mot que rien ne reconnaissait. Les lettres épelées
    // (« f.u.c.k ») sont recollées plus loin, par `motsDe`.
    .replace(/[.*_]/g, ' ')
}

/** Un mot de la liste, lettres doublées admises : « fuck » → f+u+c+k+. */
function motif(mot: string): string {
  return [...mot].map(c => `${c}+`).join('')
}

// Le pluriel seulement : un « e » de féminin ferait de « con » un « cône »,
// et de « viol » une « viole ». Les féminins qui comptent sont dans la liste.
const SUFFIXES = '(?:s|x)?'
const cacheExacts = new Map<LangueConvenance, RegExp>()
function exacts(langue: LangueConvenance): RegExp {
  let r = cacheExacts.get(langue)
  if (!r) {
    const mots = [...MOTS_COMMUNS, ...(langue !== 'en' ? MOTS_FR : []), ...(langue !== 'fr' ? MOTS_EN : [])]
    r = new RegExp(`^(?:${mots.map(motif).join('|')})${SUFFIXES}$`)
    cacheExacts.set(langue, r)
  }
  return r
}
const RACINES_RE = new RegExp(`(?:${RACINES.map(motif).join('|')})`)

/** Les mots d'un squelette, et les mots épelés lettre à lettre recollés (« p u t e »). */
function motsDe(sq: string): string[] {
  const mots = sq.split(/[^a-z]+/).filter(Boolean)
  const recolles: string[] = []
  let suite: string[] = []
  for (const m of [...mots, '']) {
    if (m.length === 1) { suite.push(m); continue }
    if (suite.length >= 3) recolles.push(suite.join(''))
    suite = []
  }
  return [...mots, ...recolles]
}

/** Ce texte contient-il un mot qu'on ne laisse pas passer chez des inconnus ? */
export function inconvenant(texte: string, langue: LangueConvenance = 'tout'): boolean {
  if (!texte) return false
  const re = exacts(langue)
  return motsDe(squelette(texte)).some(m => re.test(m) || RACINES_RE.test(m))
}
