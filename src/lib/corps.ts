/**
 * Quelle partie du corps une bande dessine.
 *
 * ── La panne ──────────────────────────────────────────────────────────────
 *
 * Les libellés existaient — `ConfigurationDessin` les écrivait dans un
 * tableau que rien n'affichait. Pendant la partie, l'écran disait « BANDE
 * 2/4 » et rien d'autre : le joueur devinait s'il dessinait un ventre ou des
 * genoux. Or c'est la règle même du cadavre exquis dessiné — chacun sait
 * QUELLE partie il dessine, jamais à quoi ressemblent les autres. Sans le
 * nom, deux joueurs dessinaient deux bustes et l'assemblage n'était plus un
 * corps.
 *
 * Deux à sept bandes : le salon en ligne va jusqu'à sept mains.
 *
 * Aucune importation : se mesure seul.
 */

type Langue = 'fr' | 'en'

const PARTIES: Record<number, { fr: string[]; en: string[] }> = {
  2: { fr: ['la tête', 'le corps'], en: ['the head', 'the body'] },
  3: { fr: ['la tête', 'le corps', 'les jambes'], en: ['the head', 'the body', 'the legs'] },
  4: { fr: ['la tête', 'le corps', 'la taille', 'les jambes'], en: ['the head', 'the body', 'the waist', 'the legs'] },
  5: { fr: ['la tête', 'le buste', 'le ventre', 'les hanches', 'les jambes'], en: ['the head', 'the chest', 'the belly', 'the hips', 'the legs'] },
  6: { fr: ['la tête', 'le cou', 'le buste', 'le ventre', 'les hanches', 'les jambes'], en: ['the head', 'the neck', 'the chest', 'the belly', 'the hips', 'the legs'] },
  7: { fr: ['la tête', 'le cou', 'le buste', 'le ventre', 'les hanches', 'les genoux', 'les pieds'], en: ['the head', 'the neck', 'the chest', 'the belly', 'the hips', 'the knees', 'the feet'] },
}

/** « la tête », « les jambes »… — `null` hors des tailles connues. */
export function partieDuCorps(indice: number, total: number, langue: Langue): string | null {
  const p = PARTIES[total]?.[langue]
  return p && indice >= 0 && indice < p.length ? p[indice] : null
}

/** Le même, sans article — pour les petites capitales : « TÊTE », « JAMBES ». */
export function partieNue(indice: number, total: number, langue: Langue): string | null {
  const p = partieDuCorps(indice, total, langue)
  return p ? p.replace(/^(la |le |les |l['’]|the )/i, '') : null
}

/** Toute la silhouette, dans l'ordre : « tête · corps · jambes ». */
export function silhouette(total: number, langue: Langue): string {
  const p = PARTIES[total]?.[langue] ?? []
  return p.map((_, i) => partieNue(i, total, langue)).join(' · ')
}
