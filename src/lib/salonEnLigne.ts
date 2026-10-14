/**
 * Le salon en ligne — les règles qui se mesurent, sorties des écrans.
 *
 * ── Le signal du tour ─────────────────────────────────────────────────────
 *
 * Le son et la vibration partaient à chaque fragment posé par un autre, tant
 * qu'on n'avait pas encore joué : ils sonnaient donc quand ce n'était PAS
 * son tour. Et quand la main revenait vraiment, l'état « soumis » était
 * remis à zéro une image trop tard : rien ne sonnait. Le signal suit
 * désormais le seul événement qui compte, le passage de « pas mon tour » à
 * « mon tour » — jamais au chargement, où l'écran le dit déjà.
 *
 * ── Revenir par le code ───────────────────────────────────────────────────
 *
 * Une main qui fermait l'application en pleine partie ne pouvait plus y
 * revenir par son code : « Cette partie a déjà commencé ». Or sa place
 * l'attendait — la partie tourne en rond et lui rendrait la main. Le code
 * ramène maintenant chaque main à sa partie ; il n'est refusé qu'aux
 * inconnus d'une partie commencée.
 *
 * ── La voix de l'IA, au salon ─────────────────────────────────────────────
 *
 * « ✦ IA » appelait les voix sans identité ni partie réglée : le serveur
 * refusait à chaque fois (401), et le bouton ne faisait rien. Il ouvre
 * désormais UNE partie avec les voix par main et par salon, au premier
 * appel, comme le cadavre écrit l'ouvre à sa table — l'encrier est le même.
 *
 * Aucune importation : se mesure seul.
 */

/** Le signal sonne au passage de « pas mon tour » à « mon tour », et jamais à la première lecture. */
export function signalDeTour(avant: boolean | null, maintenant: boolean): boolean {
  return avant === false && maintenant
}

export type StatutSalon = 'waiting' | 'playing' | 'finished' | string

/** Où mène un code de salon, pour cette main. */
export function destinationDuCode(
  code: string,
  statut: StatutSalon,
  estMain: boolean,
  exclu = false,
): { chemin: string } | { refus: 'exclu' | 'commence' | 'termine' } {
  if (exclu) return { refus: 'exclu' }
  if (statut === 'waiting') return { chemin: `/salon/${code}` }
  if (!estMain) return { refus: statut === 'finished' ? 'termine' : 'commence' }
  return { chemin: statut === 'finished' ? `/fin-online/${code}` : `/jeu-online/${code}` }
}

/** Cette identité a-t-elle été retirée de la table par son hôte ? */
export function estExclu(salon: { exclus?: string[] | null } | null | undefined, id: string | null | undefined): boolean {
  return !!id && !!salon?.exclus?.includes(id)
}

interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

const PARTIE_VALIDE = /^[A-Za-z0-9_-]{8,64}$/

/**
 * Le reçu de la partie avec les voix, pour ce salon : le même à chaque appel,
 * et d'un rechargement à l'autre — une partie ne se paie qu'une fois.
 */
export function partieDuSalon(code: string, stockage: Stockage | null, nouveau: () => string): string {
  const cle = `partie-salon-${code}`
  try {
    const deja = stockage?.getItem(cle)
    if (deja && PARTIE_VALIDE.test(deja)) return deja
  } catch { /* stockage refusé */ }
  const id = nouveau()
  try { stockage?.setItem(cle, id) } catch { /* mode privé : un reçu par séance */ }
  return id
}
