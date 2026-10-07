/**
 * Redresser un trait : on dessine une forme à main levée, on garde le doigt
 * posé à la fin, et elle devient une droite, une ellipse, un rectangle ou un
 * triangle propre — le geste de Freeform.
 *
 * Ce module ne touche à rien quand il n'est pas sûr. Un gribouillis reste un
 * gribouillis : redresser à tort détruit un trait voulu, et l'on ne se méfie
 * pas d'une forme qu'on n'a pas demandée.
 */

export type Pt = { x: number; y: number }
export type Forme = 'droite' | 'ellipse' | 'rectangle' | 'triangle'
export interface Redressement { forme: Forme; points: Pt[] }

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function longueur(pts: Pt[]) {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i])
  return l
}

/** Distance d'un point au segment [a, b]. */
function auSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy
  if (!l2) return dist(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/** Ramer–Douglas–Peucker : les sommets qui portent la forme. */
export function simplifier(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice()
  let iMax = 0, dMax = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = auSegment(pts[i], pts[0], pts[pts.length - 1])
    if (d > dMax) { dMax = d; iMax = i }
  }
  if (dMax <= eps) return [pts[0], pts[pts.length - 1]]
  const g = simplifier(pts.slice(0, iMax + 1), eps), d = simplifier(pts.slice(iMax), eps)
  return [...g.slice(0, -1), ...d]
}

/** Échantillonne un polygone fermé ou ouvert tous les `pas` pixels. */
function echantillonner(sommets: Pt[], pas: number, ferme: boolean): Pt[] {
  const s = ferme ? [...sommets, sommets[0]] : sommets
  const out: Pt[] = [s[0]]
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i], n = Math.max(1, Math.ceil(dist(a, b) / pas))
    for (let k = 1; k <= n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n })
  }
  return out
}

/** L'angle intérieur au sommet b, en degrés. */
function angle(a: Pt, b: Pt, c: Pt) {
  const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y }
  const cos = (u.x * v.x + u.y * v.y) / ((Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)) || 1)
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

/**
 * Reconnaît la forme d'un trait, ou rend `null`.
 * `pas` : l'écart entre deux points de la forme rendue (en pixels du canvas).
 */
export function redresser(pts: Pt[], pas = 3): Redressement | null {
  if (pts.length < 4) return null
  const L = longueur(pts)
  if (L < 24) return null
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const diag = Math.hypot(maxX - minX, maxY - minY)
  const a = pts[0], z = pts[pts.length - 1]

  // ── La droite : presque toute la longueur va d'un bout à l'autre ──
  const ecartMax = Math.max(...pts.map(p => auSegment(p, a, z)))
  if (dist(a, z) / L > 0.9 && ecartMax < Math.max(6, 0.06 * dist(a, z))) {
    return { forme: 'droite', points: echantillonner([a, z], pas, false) }
  }

  // ── Les formes fermées : le trait revient près de son départ ──
  if (dist(a, z) > Math.max(24, 0.22 * diag)) return null
  // On referme sur le point de départ pour simplifier un contour sans « queue ».
  const boucle = [...pts, a]
  const sommets = simplifier(boucle, 0.07 * diag).slice(0, -1)
  // Un sommet trop proche de son voisin est une hésitation, pas un coin.
  const coins = sommets.filter((p, i) => dist(p, sommets[(i + 1) % sommets.length]) > 0.12 * diag)

  if (coins.length === 3) {
    const angles = coins.map((p, i) => angle(coins[(i + 2) % 3], p, coins[(i + 1) % 3]))
    if (angles.every(t => t > 18 && t < 150)) return { forme: 'triangle', points: echantillonner(coins, pas, true) }
  }
  if (coins.length === 4) {
    const angles = coins.map((p, i) => angle(coins[(i + 3) % 4], p, coins[(i + 1) % 4]))
    if (angles.every(t => Math.abs(t - 90) < 25)) {
      // Un rectangle : on garde l'orientation du premier côté, on rectifie les angles.
      const o = coins[0], u = { x: coins[1].x - o.x, y: coins[1].y - o.y }
      const lu = Math.hypot(u.x, u.y) || 1, ux = u.x / lu, uy = u.y / lu, vx = -uy, vy = ux
      const proj = coins.map(p => ({ s: (p.x - o.x) * ux + (p.y - o.y) * uy, t: (p.x - o.x) * vx + (p.y - o.y) * vy }))
      const s0 = Math.min(...proj.map(q => q.s)), s1 = Math.max(...proj.map(q => q.s))
      const t0 = Math.min(...proj.map(q => q.t)), t1 = Math.max(...proj.map(q => q.t))
      const P = (s: number, t: number) => ({ x: o.x + s * ux + t * vx, y: o.y + s * uy + t * vy })
      return { forme: 'rectangle', points: echantillonner([P(s0, t0), P(s1, t0), P(s1, t1), P(s0, t1)], pas, true) }
    }
  }

  // ── L'ellipse : axes principaux du nuage, puis l'écart au contour idéal ──
  const n = pts.length
  const cx = pts.reduce((s, p) => s + p.x, 0) / n, cy = pts.reduce((s, p) => s + p.y, 0) / n
  let sxx = 0, syy = 0, sxy = 0
  for (const p of pts) { const dx = p.x - cx, dy = p.y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(th), s = Math.sin(th)
  const loc = pts.map(p => ({ u: (p.x - cx) * c + (p.y - cy) * s, v: -(p.x - cx) * s + (p.y - cy) * c }))
  const ra = (Math.max(...loc.map(q => q.u)) - Math.min(...loc.map(q => q.u))) / 2
  const rb = (Math.max(...loc.map(q => q.v)) - Math.min(...loc.map(q => q.v))) / 2
  if (ra < 6 || rb < 6) return null
  const erreur = loc.reduce((e, q) => e + Math.abs(Math.hypot(q.u / ra, q.v / rb) - 1), 0) / n
  if (erreur > 0.16) return null
  // L'ellipse commence là où le doigt a commencé.
  const debut = Math.atan2(loc[0].v / rb, loc[0].u / ra)
  const nPts = Math.max(24, Math.ceil((Math.PI * (ra + rb)) / pas))
  const points = Array.from({ length: nPts + 1 }, (_, k) => {
    const t = debut + (2 * Math.PI * k) / nPts, u = ra * Math.cos(t), v = rb * Math.sin(t)
    return { x: cx + u * c - v * s, y: cy + u * s + v * c }
  })
  return { forme: 'ellipse', points }
}
