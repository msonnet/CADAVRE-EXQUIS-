/**
 * La partition du dévoilement d'un cadavre dessiné — à l'écran.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * La partition était écrite pour TROIS bandes, en tiers fixes, quel que soit
 * le dessin. À deux bandes, la ligne de balayage s'arrêtait au milieu d'une
 * tête ; à cinq, elle traversait deux coutures sans les marquer. Or la pause
 * sur la couture EST le geste du cadavre exquis : c'est l'instant où l'on
 * découvre ce qu'une autre main a fait du trait qu'on lui a laissé.
 *
 * Les coutures réelles ne sont pas des fractions égales — chaque bande est
 * rognée à ce qu'on y a dessiné. L'assemblage les connaît, il les donne.
 *
 * ── La durée ──────────────────────────────────────────────────────────────
 *
 * Environ trois secondes de balayage quelle que soit la longueur : entre
 * 0,45 et 1,1 s par bande, et une pause à chaque couture — un quart de
 * seconde, raccourcie au-delà de quatre bandes. Tout tient sous cinq
 * secondes, sept bandes comprises : plus lent, un grand salon devenait une
 * attente ; plus vite, deux bandes ne se regardaient pas.
 *
 * La vidéo partagée garde sa propre partition (`REVEAL_DESSIN`) : elle est
 * cadrée pour un format fixe, et un fichier n'a pas de coutures à lire.
 *
 * Aucune importation : se mesure seul.
 */

export type Segment = [debut: number, fin: number, fracDebut: number, fracFin: number]

export const ENTREE = 800
export const PAUSE_COUTURE = 250
export const BALAYAGE_TOTAL = 3000

/** Les coutures en fractions croissantes de la hauteur, 0 et 1 compris. */
export function bornes(coutures: number[]): number[] {
  const interieures = coutures
    .filter(f => Number.isFinite(f) && f > 0.001 && f < 0.999)
    .sort((a, b) => a - b)
  return [0, ...interieures, 1]
}

/** Des coutures régulières, quand l'assemblage n'a rien dit. */
export const couturesRegulieres = (n: number): number[] =>
  Array.from({ length: Math.max(0, n - 1) }, (_, i) => (i + 1) / Math.max(1, n))

export function partition(coutures: number[]): Segment[] {
  const b = bornes(coutures)
  const n = b.length - 1
  const duree = Math.max(450, Math.min(1100, BALAYAGE_TOTAL / n))
  const pause = n > 4 ? 150 : PAUSE_COUTURE
  const segs: Segment[] = []
  let t = ENTREE
  for (let i = 0; i < n; i++) {
    segs.push([t, t + duree, b[i], b[i + 1]])
    t += duree + pause
  }
  return segs
}

/** Quand le dessin est entièrement découvert. */
export const finDuBalayage = (segs: Segment[]): number => segs.length ? segs[segs.length - 1][1] : 0

const adoucir = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function fraction(segs: Segment[], t: number): { frac: number; balaye: boolean } {
  let frac = 0
  for (const [t0, t1, f0, f1] of segs) {
    if (t >= t1) { frac = f1; continue }
    if (t >= t0) return { frac: f0 + (f1 - f0) * adoucir((t - t0) / (t1 - t0)), balaye: true }
    break
  }
  return { frac, balaye: false }
}
