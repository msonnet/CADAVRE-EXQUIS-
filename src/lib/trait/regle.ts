/**
 * La règle du studio — posée sur l'écran, déplacée d'un doigt, tournée à
 * deux. Un trait qui COMMENCE près d'un de ses bords suit ce bord, comme un
 * crayon qu'on appuie contre une vraie règle ; ailleurs, il reste libre.
 *
 * Tout est en pixels de l'ÉCRAN : la règle ne zoome pas avec le dessin, elle
 * reste sous les doigts.
 */

export interface Regle { cx: number; cy: number; angle: number; longueur: number; epaisseur: number }
export type Pt = { x: number; y: number }

/** Distance à partir de laquelle un trait s'appuie sur la règle. */
export const AIMANT = 28

/** Le bord (−1 : haut, +1 : bas) contre lequel un départ s'appuie, ou 0. */
export function bordDeDepart(r: Regle, p: Pt): -1 | 0 | 1 {
  const c = Math.cos(r.angle), s = Math.sin(r.angle)
  const u = (p.x - r.cx) * c + (p.y - r.cy) * s, v = -(p.x - r.cx) * s + (p.y - r.cy) * c
  if (Math.abs(u) > r.longueur / 2 + AIMANT) return 0
  const h = r.epaisseur / 2
  if (v < -h && v > -h - AIMANT) return -1
  if (v > h && v < h + AIMANT) return 1
  return 0
}

/**
 * Ramène un point sur le bord choisi (projection orthogonale), décalé de
 * `ecart` vers l'extérieur : un crayon appuyé contre une règle trace À CÔTÉ
 * d'elle, pas sous son liseré.
 */
export function surLeBord(r: Regle, bord: -1 | 1, p: Pt, ecart = 0): Pt {
  const c = Math.cos(r.angle), s = Math.sin(r.angle)
  const u = (p.x - r.cx) * c + (p.y - r.cy) * s, v = bord * (r.epaisseur / 2 + ecart)
  return { x: r.cx + u * c - v * s, y: r.cy + u * s + v * c }
}

/** Le point est-il sur le corps de la règle (où le doigt la saisit) ? */
export function surLaRegle(r: Regle, p: Pt): boolean {
  const c = Math.cos(r.angle), s = Math.sin(r.angle)
  const u = (p.x - r.cx) * c + (p.y - r.cy) * s, v = -(p.x - r.cx) * s + (p.y - r.cy) * c
  return Math.abs(u) <= r.longueur / 2 && Math.abs(v) <= r.epaisseur / 2
}

/**
 * Deux doigts sur la règle : elle suit leur milieu et leur angle. Près d'un
 * angle remarquable (0°, 45°, 90°…) elle s'y aimante — à 2° près, comme on
 * aligne une équerre à l'œil.
 */
export function suivreDeuxDoigts(r: Regle, avant: [Pt, Pt], apres: [Pt, Pt]): Regle {
  const mA = { x: (avant[0].x + avant[1].x) / 2, y: (avant[0].y + avant[1].y) / 2 }
  const mB = { x: (apres[0].x + apres[1].x) / 2, y: (apres[0].y + apres[1].y) / 2 }
  const aA = Math.atan2(avant[1].y - avant[0].y, avant[1].x - avant[0].x)
  const aB = Math.atan2(apres[1].y - apres[0].y, apres[1].x - apres[0].x)
  return { ...r, cx: r.cx + mB.x - mA.x, cy: r.cy + mB.y - mA.y, angle: r.angle + (aB - aA) }
}

/** L'angle affiché, en degrés de 0 à 179, aimanté aux multiples de 15° à 2° près. */
export function angleAffiche(radians: number): { degres: number; angle: number } {
  let d = ((radians * 180) / Math.PI) % 180
  if (d < 0) d += 180
  const proche = Math.round(d / 15) * 15
  if (Math.abs(proche - d) < 2) d = proche % 180
  return { degres: Math.round(d), angle: (d * Math.PI) / 180 }
}
