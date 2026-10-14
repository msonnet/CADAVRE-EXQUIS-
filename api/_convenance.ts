/**
 * La convenance, côté serveur — la copie qui TRANCHE.
 *
 * Le client (`src/lib/convenance.ts`) anticipe pour dire non sans
 * aller-retour ; ici on décide. Les deux copies sont tenues d'accord par
 * `convenance.test.ts`, listes et verdicts, comme les règles du poème du
 * jour. Le pourquoi des listes est écrit dans la copie du client.
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
