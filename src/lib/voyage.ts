/**
 * Le voyage du feuillet — du recueil à la page du poème.
 *
 * Plan « moderne », point 3, maquette retenue par l'auteur le 11 novembre
 * (`scripts/temoins/recueil-feuille/maquette.html`) : toucher un poème du
 * recueil ne fait plus un fondu de page. La ligne touchée DEVIENT un feuillet
 * de papier : elle se soulève, le reste du recueil s'efface autour d'elle, et
 * le feuillet glisse à sa place sur la page du poème en grandissant jusqu'à
 * la feuille ENTIÈRE, déjà dépliée. L'en-tête arrive, puis les actions.
 * Sans son. (« Ça va trop vite, le son est agaçant. La feuille doit déjà
 * être dépliée » : le voyage dure 0,75 s.)
 *
 * Deux pages se partagent le mouvement : le recueil joue le début (le
 * feuillet se soulève, le reste s'efface), puis passe la main ; la page du
 * poème joue la suite. Le relais vit ici, en mémoire — pas dans
 * l'historique : revenu par « précédent » ou après un rechargement, on ne
 * rejoue rien.
 *
 * Aucune importation : se mesure seul.
 */

/** ms — l'horloge du voyage, depuis le toucher. */
export const VOYAGE = {
  /** La ligne touchée devient papier et se soulève. */
  leve: [0, 320] as const,
  /** Le reste du recueil s'efface autour d'elle. */
  fuite: [60, 380] as const,
  /** Le recueil passe la main à la page du poème. */
  relais: 380,
  /** Le feuillet glisse à sa place et grandit jusqu'à la feuille : 0,75 s. */
  glisse: [380, 1130] as const,
  /** Le texte de la ligne s'efface… */
  ligne: [500, 760] as const,
  /** … celui de la feuille apparaît. */
  feuille: [700, 1040] as const,
  /** L'en-tête de la page du poème arrive. */
  entete: [500, 980] as const,
  /** Le feuillet est posé : la vraie feuille prend sa place. */
  arrivee: 1130,
  /** Les actions arrivent ; fin du voyage. */
  fin: 1530,
}

export const borne01 = (v: number) => Math.min(1, Math.max(0, v))
/** L'avancée de t entre a et b, de 0 à 1. */
export const part = (t: number, [a, b]: readonly [number, number]) => borne01((t - a) / (b - a))
export const lisse = (x: number) => x * x * (3 - 2 * x)
export const sortieCube = (x: number) => 1 - Math.pow(1 - x, 3)

/** Une courbe de Bézier d'animation (`cubic-bezier` du CSS). */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const X = (s: number) => ((ax * s + bx) * s + cx) * s
  const Y = (s: number) => ((ay * s + by) * s + cy) * s
  const dX = (s: number) => (3 * ax * s + 2 * bx) * s + cx
  return (x: number) => {
    x = borne01(x)
    let s = x
    for (let i = 0; i < 8; i++) {
      const e = X(s) - x, d = dX(s)
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break
      s -= e / d
    }
    // Repli par dichotomie si Newton s'égare.
    if (Math.abs(X(s) - x) > 1e-4) {
      let a = 0, b = 1
      s = x
      for (let i = 0; i < 30; i++) { if (X(s) < x) a = s; else b = s; s = (a + b) / 2 }
    }
    return Y(s)
  }
}

export const courbeGlisse = bezier(0.3, 0, 0.2, 1)

export interface Rect { x: number; y: number; w: number; h: number }

/** La place et l'allure du feuillet à l'instant t, de la ligne `de` à la feuille `vers`. */
export function feuilletA(t: number, de: Rect, vers: Rect | null) {
  const leve = sortieCube(part(t, VOYAGE.leve))
  const v = vers ? courbeGlisse(part(t, VOYAGE.glisse)) : 0
  const cible = vers ?? de
  const mix = (a: number, b: number) => a + (b - a) * v
  return {
    x: mix(de.x, cible.x),
    // Soulevé de trois pixels, et un rien plus grand, tant qu'il n'a pas voyagé.
    y: mix(de.y, cible.y) - 3 * leve * (1 - v),
    w: mix(de.w, cible.w),
    h: mix(de.h, cible.h),
    echelle: 1 + 0.015 * leve * (1 - v),
    papier: leve,
    ligne: 1 - lisse(part(t, VOYAGE.ligne)),
    feuille: lisse(part(t, VOYAGE.feuille)),
  }
}

// ── Le relais entre les deux pages ──────────────────────────────────────────

export interface Relais {
  /** Le poème ouvert. */
  id: string
  /** La ligne touchée, à l'écran (`getBoundingClientRect`). */
  de: Rect
  /** Ce que la ligne portait : son titre et sa ligne de métadonnées. */
  titre: string
  meta: string
  /** `performance.now()` au toucher. */
  depart: number
}

let relais: Relais | null = null

export function confierVoyage(r: Relais) { relais = r }

/**
 * La page du poème reprend le voyage — pour ce poème, et s'il est encore en
 * cours. Sinon rien : elle s'ouvre comme avant (revenue par « précédent »,
 * rechargée). Le relais n'est pas effacé à la lecture : une page montée deux
 * fois de suite le retrouve.
 */
export function reprendreVoyage(id: string, maintenant = performance.now()): Relais | null {
  const r = relais
  if (!r || r.id !== id) return null
  const ecoule = maintenant - r.depart
  return ecoule >= 0 && ecoule < VOYAGE.arrivee ? r : null
}
