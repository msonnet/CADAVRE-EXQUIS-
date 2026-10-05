/**
 * La composition du poème révélé — le corps et le retrait.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * La fin de partie composait tous les poèmes au même corps, 27 points en
 * italique sur un téléphone de 390. Une phrase courte y tient ; un vers
 * d'atelier, non : mesuré sur un poème de onze vers, dix se cassaient en
 * deux, vingt et une lignes pour onze vers. Et rien ne marquait la ligne
 * qui déborde, si bien qu'on ne savait plus où un vers finissait —
 * « le plomb chante / obliquement dans la cave / cave où dorment les /
 * sextants ».
 *
 * Deux règles d'imprimerie, et pas une de plus :
 *
 *   — le RETRAIT des débords : la suite d'un vers trop long rentre d'un
 *     cran sous son début (`RETRAIT_DEBORD`), comme dans toute édition de
 *     poésie. On voit alors où un vers commence, même cassé.
 *   — le corps baisse d'UN cran quand le vers le plus long dépasse
 *     `SIGNES_PLEIN_CORPS` signes, ou à l'Atelier, dont les vers sont des
 *     phrases entières. Un cran seulement : le poème reste l'objet de
 *     l'écran, il ne devient pas une note de bas de page.
 *
 * Aucune importation : se mesure seul.
 */

/** Au-delà, le vers le plus long ne tient plus sur une ligne à plein corps. */
export const SIGNES_PLEIN_CORPS = 28

/** Le retrait des lignes qui débordent — la suite d'un vers, pas un vers. */
export const RETRAIT_DEBORD = '1.2em'

export type Corps = 'plein' | 'reduit'

/** Le corps du poème : plein, ou un cran plus bas si ses vers sont longs. */
export function corpsDuPoeme(lignes: string[], structureId?: string): Corps {
  if (structureId === 'atelier') return 'reduit'
  const plusLong = lignes.reduce((m, l) => Math.max(m, l.trim().length), 0)
  return plusLong > SIGNES_PLEIN_CORPS ? 'reduit' : 'plein'
}

/**
 * La taille de police, pour chaque corps. Le plein est celui d'avant, au
 * caractère près : une phrase courte ne change pas d'apparence.
 */
export const TAILLE_CORPS: Record<Corps, string> = {
  plein: 'clamp(1.55rem, 7vw, 2.1rem)',
  reduit: 'clamp(1.3rem, 5.6vw, 1.75rem)',
}

/**
 * Le style d'un vers composé en retrait de débord. Le retrait est porté par
 * la marge et rendu à la première ligne par un `text-indent` négatif : la
 * première ligne part du bord, les suivantes rentrent.
 *
 * `avecLettrine` : la lettrine flotte dans le retrait, et c'est elle qui
 * tient le bord. Un `text-indent` négatif à côté d'un flottant ferait passer
 * le premier mot SOUS la lettrine.
 */
export function styleVers(avecLettrine = false): { paddingLeft: string; textIndent: string | number } {
  return { paddingLeft: RETRAIT_DEBORD, textIndent: avecLettrine ? 0 : `-${RETRAIT_DEBORD}` }
}

/** Les mots sur lesquels un incipit ne s'arrête pas : il resterait en l'air. */
const MOTS_SUSPENDUS = new Set([
  'le', 'la', 'les', "l'", 'un', 'une', 'des', 'du', 'de', "d'", 'au', 'aux',
  'à', 'et', 'ou', 'en', 'sur', 'sous', 'dans', 'par', 'pour', 'sans', 'vers',
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'and', 'or', 'with', 'by', 'for',
  'at', 'from', 'into',
])

/** Le nombre de mots que garde l'incipit d'une phrase d'un seul tenant. */
export const MOTS_INCIPIT = 4

/**
 * Le nom d'un poème sans titre : son premier vers, comme dans toute table
 * des matières de poésie.
 *
 * Premier jet : la première ligne, toujours. Mais une phrase — courte ou
 * étoffée, les deux structures d'entrée — tient sur UNE ligne : l'incipit
 * était le poème entier, affiché en titre puis recopié juste dessous. Quand
 * la première ligne est tout le poème, on n'en garde que le début, quatre
 * mots, sans finir sur un article ni une préposition. Une phrase trop courte
 * pour être coupée n'a pas d'incipit : « Sans titre » vaut mieux qu'un
 * doublon.
 */
export function incipitDe(texte: string): string {
  const lignes = texte.split('\n').map(l => l.trim()).filter(Boolean)
  const premiere = lignes[0] ?? ''
  if (lignes.length > 1) return premiere
  const mots = premiere.split(/\s+/).filter(Boolean)
  if (mots.length <= MOTS_INCIPIT) return ''
  const debut = mots.slice(0, MOTS_INCIPIT)
  while (debut.length > 1 && MOTS_SUSPENDUS.has(debut[debut.length - 1].toLocaleLowerCase())) debut.pop()
  return `${debut.join(' ').replace(/[\s,;:.—–-]+$/, '')}…`
}
