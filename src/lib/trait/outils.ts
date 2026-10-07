/**
 * Les instruments du studio de dessin — ce qu'ils sont, pas comment on les
 * dessine à l'écran (`rendu.ts`) ni comment ils se présentent (`Instrument`).
 *
 * Toutes les tailles sont en pixels CSS : le rendu les multiplie par la
 * densité de l'écran. Une taille est CONTINUE entre `min` et `max` : la
 * trousse en propose une valeur par défaut, les réglages (second toucher)
 * l'ajustent au pixel.
 *
 * ── Les rendus ──────────────────────────────────────────────────────────
 * `contour`  le trait entier est un polygone d'épaisseur variable, rempli
 *            d'un seul tenant. Plus de « chapelet de perles » aux jointures :
 *            l'ancien moteur posait chaque segment à part, et un outil
 *            translucide s'assombrissait partout où deux segments se
 *            recouvraient.
 * `grain`    même polygone, rempli d'un grain de papier (crayon, craie). Le
 *            grain est ancré au papier, pas au trait : repasser au même
 *            endroit noircit les mêmes creux, comme sur une vraie feuille.
 * `lavis`    polygone adouci, bord de pigment plus soutenu (aquarelle).
 * `aero`     tampons à dégradé qui s'accumulent quand on insiste.
 */

export type OutilId = 'crayon' | 'stylo' | 'plume' | 'feutre' | 'aquarelle' | 'craie' | 'aero' | 'gomme'
export type Rendu = 'contour' | 'grain' | 'lavis' | 'aero' | 'gomme'

export interface Outil {
  id: OutilId
  nom: [fr: string, en: string]
  rendu: Rendu
  taille: { min: number; max: number; defaut: number }
  /** Opacité du trait ENTIER (pas de chaque segment). */
  opacite: number
  /** Effet de la pression (ou de la vitesse au doigt) sur l'épaisseur, 0 → 1. */
  amincissement: number
  /** Effilement du début et de la fin, en multiples de la taille. 0 : bout rond. */
  effile: number
  /** Le doigt n'a pas de capteur : la vitesse tient lieu de pression. */
  pressionSimulee: boolean
  /** Le trait se pose en « produit » (le feutre teinte sans couvrir). */
  produit?: boolean
  /** La couleur ne compte pas (gomme). */
  sansCouleur?: boolean
}

export const OUTILS: Record<OutilId, Outil> = {
  crayon: {
    id: 'crayon', nom: ['Crayon', 'Pencil'], rendu: 'grain',
    taille: { min: 1, max: 12, defaut: 2.5 }, opacite: 0.9,
    amincissement: 0.35, effile: 1.5, pressionSimulee: true,
  },
  stylo: {
    // Le feutre fin d'architecte : une ligne égale, pour la précision.
    id: 'stylo', nom: ['Stylo', 'Fineliner'], rendu: 'contour',
    taille: { min: 0.75, max: 12, defaut: 2.5 }, opacite: 1,
    amincissement: 0, effile: 0, pressionSimulee: false,
  },
  plume: {
    id: 'plume', nom: ['Plume', 'Ink pen'], rendu: 'contour',
    taille: { min: 2, max: 24, defaut: 6 }, opacite: 1,
    amincissement: 0.65, effile: 3, pressionSimulee: true,
  },
  feutre: {
    id: 'feutre', nom: ['Feutre', 'Marker'], rendu: 'contour',
    taille: { min: 6, max: 48, defaut: 16 }, opacite: 0.55,
    amincissement: 0, effile: 0, pressionSimulee: false, produit: true,
  },
  aquarelle: {
    id: 'aquarelle', nom: ['Aquarelle', 'Watercolor'], rendu: 'lavis',
    taille: { min: 6, max: 60, defaut: 20 }, opacite: 0.5,
    amincissement: 0.45, effile: 2, pressionSimulee: true, produit: true,
  },
  craie: {
    id: 'craie', nom: ['Craie', 'Crayon'], rendu: 'grain',
    taille: { min: 4, max: 36, defaut: 12 }, opacite: 0.95,
    amincissement: 0.2, effile: 0.5, pressionSimulee: true,
  },
  aero: {
    id: 'aero', nom: ['Aérographe', 'Airbrush'], rendu: 'aero',
    taille: { min: 10, max: 90, defaut: 34 }, opacite: 1,
    amincissement: 0, effile: 0, pressionSimulee: false,
  },
  gomme: {
    id: 'gomme', nom: ['Gomme', 'Eraser'], rendu: 'gomme',
    taille: { min: 6, max: 70, defaut: 22 }, opacite: 1,
    amincissement: 0, effile: 0, pressionSimulee: false, sansCouleur: true,
  },
}

/** L'ordre de la trousse : du plus simple au plus pictural, la gomme au bout. */
export const ORDRE_OUTILS: OutilId[] = ['crayon', 'stylo', 'plume', 'feutre', 'aquarelle', 'craie', 'aero', 'gomme']

export interface Reglage { taille: number; opacite: number }

export function reglageParDefaut(id: OutilId): Reglage {
  const o = OUTILS[id]
  return { taille: o.taille.defaut, opacite: o.opacite }
}

/** Une taille ramenée dans la plage de l'outil — un réglage hérité ne la quitte jamais. */
export function bornerTaille(id: OutilId, taille: number): number {
  const { min, max } = OUTILS[id].taille
  return Math.min(max, Math.max(min, taille))
}

/**
 * Le chiffre gravé sur le fût, comme le « 50 » d'un crayon de Freeform :
 * la taille ramenée de 10 (le plus fin) à 100 (le plus large), à la dizaine.
 */
export function chiffreDuFut(id: OutilId, taille: number): number {
  const { min, max } = OUTILS[id].taille
  return Math.round(1 + (9 * (bornerTaille(id, taille) - min)) / (max - min)) * 10
}
