/**
 * La tablée en ligne — combien de cases, et quand la partie est finie.
 *
 * Aucune importation : ces règles se mesurent seules.
 *
 * ── La panne ──────────────────────────────────────────────────────────────
 *
 * Une garde de `JeuOnline` refusait de finir la partie tant que le nombre de
 * cases restait inférieur au nombre de joueurs. Elle protégeait le DESSIN,
 * où une bande vaut un joueur et où un `nb_cases` encore vide aurait clos la
 * partie trop tôt. Mais elle s'appliquait aussi à l'ÉCRIT, où le nombre de
 * cases est celui de la structure : une phrase courte a trois cases, et un
 * salon rejoint par code n'a pas de plafond. À quatre mains, la troisième
 * case posée, plus personne n'avait de tour et la partie ne finissait
 * jamais. Tout le monde attendait devant une table vide.
 */

export type ModeSalon = 'ecrit' | 'dessin'

export interface FormeStructure {
  cases: { length: number }
  nombreCasesVariable?: { min: number; max: number }
}

/**
 * Le nombre de cases, fixé UNE fois au lancement pour que tous les clients
 * s'accordent.
 *
 * Au vers libre, la longueur est tirée entre ses bornes — mais jamais sous
 * le nombre de mains, tant que la borne haute le permet : une main qui
 * s'assied pour écrire doit écrire au moins un vers. Une structure fixe, elle,
 * ne s'allonge pas — une phrase courte a trois places, pas quatre.
 */
export function casesDeLaPartie(
  mode: ModeSalon,
  structure: FormeStructure,
  joueurs: number,
  hasard: () => number = Math.random,
): number {
  if (mode === 'dessin') return joueurs
  const v = structure.nombreCasesVariable
  if (!v) return structure.cases.length
  const tire = Math.floor(hasard() * (v.max - v.min + 1)) + v.min
  return Math.max(tire, Math.min(joueurs, v.max))
}

/** Combien de mains n'auront pas de case — à dire AVANT de lancer. */
export function mainsSansCase(mode: ModeSalon, structure: FormeStructure, joueurs: number): number {
  if (mode === 'dessin') return 0
  const plafond = structure.nombreCasesVariable?.max ?? structure.cases.length
  return Math.max(0, joueurs - plafond)
}

/**
 * La partie est finie quand toutes les cases sont posées.
 *
 * Au dessin seulement, on exige aussi que le compte couvre la table : c'est
 * là que la garde d'origine avait un sens.
 */
export function partieTerminee(p: {
  mode: ModeSalon
  cases: number
  posees: number
  joueurs: number | null | undefined
}): boolean {
  if (!p.cases) return false
  if (p.mode === 'dessin' && p.joueurs && p.cases < p.joueurs) return false
  return p.posees >= p.cases
}
