import { getStroke, type StrokeOptions } from 'perfect-freehand'
import { OUTILS, type OutilId, type Reglage } from './outils'

/**
 * Le rendu d'un trait, d'un seul tenant.
 *
 * Le trait en cours vit sur une COUCHE à part (un second canvas posé sur la
 * feuille). Elle est redessinée entière à chaque image tant que le doigt est
 * posé, puis versée sur la feuille au lever, avec l'opacité de l'outil
 * appliquée UNE fois. C'est ce qui supprime le chapelet : un feutre à 55 %
 * reste à 55 % d'un bout à l'autre, même là où le trait repasse sur lui-même.
 * Repasser par un SECOND trait, lui, fonce — comme un vrai feutre.
 *
 * Aucun `ctx.filter` : iOS ne le gère qu'à partir de Safari 18, et l'app vise
 * iOS 16.
 */

export interface PointTrait { x: number; y: number; p: number }

/** Les options de contour d'un outil, à une taille donnée en pixels physiques. */
export function optionsContour(id: OutilId, taillePx: number, fini: boolean, pressionReelle: boolean): StrokeOptions {
  const o = OUTILS[id]
  return {
    size: taillePx,
    thinning: o.amincissement,
    smoothing: 0.6,
    streamline: 0.45,
    // Le stylet donne la vraie pression ; au doigt, la vitesse la remplace.
    simulatePressure: o.pressionSimulee && !pressionReelle,
    start: { taper: o.effile ? taillePx * o.effile : 0, cap: true },
    end: { taper: o.effile ? taillePx * o.effile : 0, cap: true },
    last: fini,
  }
}

/** Le polygone d'un trait (liste de sommets), vide s'il n'y a rien à tracer. */
export function polygone(points: PointTrait[], options: StrokeOptions): number[][] {
  if (!points.length) return []
  return getStroke(points.map(q => [q.x, q.y, q.p]), options)
}

/** Trace le chemin lissé d'un polygone fermé (milieux reliés par des quadratiques). */
export function cheminPolygone(ctx: CanvasRenderingContext2D, poly: number[][]) {
  ctx.beginPath()
  if (poly.length < 3) return
  ctx.moveTo(poly[0][0], poly[0][1])
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  }
  ctx.closePath()
}

/* ── Le grain du papier ─────────────────────────────────────────────────── */

/** Générateur pseudo-aléatoire graine fixe : le grain est le même d'un trait à l'autre. */
export function alea(graine: number) {
  let s = graine >>> 0 || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/**
 * Valeurs d'opacité d'une tuile de grain (0 → 1), sans canvas : testable.
 * `gros` — la craie : des creux en amas, le papier transparaît.
 * `fin`  — le crayon : un grain serré, qui ne laisse passer que des points.
 */
export function tuileGrain(cote: number, sorte: 'fin' | 'gros', graine = 7): Float32Array {
  const r = alea(graine), v = new Float32Array(cote * cote)
  // Bruit de valeur à deux échelles : les amas, puis la fibre.
  const grille = (pas: number) => {
    const n = Math.ceil(cote / pas) + 1, g = Array.from({ length: n * n }, r)
    return (x: number, y: number) => {
      const gx = x / pas, gy = y / pas, i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j
      const at = (a: number, b: number) => g[((b % (n - 1)) * n) + (a % (n - 1))]
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
      return (at(i, j) * (1 - sx) + at(i + 1, j) * sx) * (1 - sy) + (at(i, j + 1) * (1 - sx) + at(i + 1, j + 1) * sx) * sy
    }
  }
  const amas = grille(sorte === 'gros' ? 5 : 3), fibre = grille(1.5)
  const poidsAmas = sorte === 'gros' ? 0.35 : 0.55
  for (let y = 0; y < cote; y++) for (let x = 0; x < cote; x++) {
    const b = poidsAmas * amas(x, y) + (1 - poidsAmas) * fibre(x, y)
    // Seuil doux : en dessous, le creux du papier ; au-dessus, le pigment.
    // Premier réglage (seuil 0,42 et amas de 9) : la craie sortait en taches
    // séparées, on lisait un trait cassé plutôt qu'un trait sur papier.
    const seuil = sorte === 'gros' ? 0.34 : 0.22
    v[y * cote + x] = Math.max(0, Math.min(1, (b - seuil) / 0.3)) * (sorte === 'gros' ? 1 : 0.9)
  }
  return v
}

const motifs = new Map<string, CanvasPattern>()
function motifGrain(ctx: CanvasRenderingContext2D, couleur: string, sorte: 'fin' | 'gros', dpr: number): CanvasPattern | string {
  const cle = `${couleur}|${sorte}|${dpr}`
  const deja = motifs.get(cle); if (deja) return deja
  const cote = Math.round(64 * dpr)
  const c = document.createElement('canvas'); c.width = cote; c.height = cote
  const g = c.getContext('2d'); if (!g) return couleur
  const { r, v: vert, b } = rgb(couleur)
  const img = g.createImageData(cote, cote), a = tuileGrain(cote, sorte)
  for (let i = 0; i < a.length; i++) { img.data[i * 4] = r; img.data[i * 4 + 1] = vert; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = Math.round(255 * a[i]) }
  g.putImageData(img, 0, 0)
  const m = ctx.createPattern(c, 'repeat'); if (!m) return couleur
  if (motifs.size > 64) motifs.clear()
  motifs.set(cle, m)
  return m
}

export function rgb(hex: string) {
  const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16)
  return { r: (n >> 16) & 255, v: (n >> 8) & 255, b: n & 255 }
}

/* ── Le trait ───────────────────────────────────────────────────────────── */

export interface Contexte {
  dpr: number
  /** Couleur du papier — la gomme la repeint. */
  fond: string
  /** Le stylet a donné une pression réelle pendant ce trait. */
  pressionReelle: boolean
  fini: boolean
}

/** L'état d'un trait d'aérographe : on n'ajoute que les nouveaux tampons. */
export interface EtatAero { index: number; reste: number }

/**
 * Dessine le trait sur la couche. Pour tous les outils sauf l'aérographe, la
 * couche doit être EFFACÉE avant l'appel : le trait est redessiné entier.
 * L'aérographe, lui, accumule : `etat` retient où il en est.
 */
export function dessinerTrait(
  ctx: CanvasRenderingContext2D, id: OutilId, reglage: Reglage, couleur: string,
  points: PointTrait[], c: Contexte, etat?: EtatAero,
) {
  const o = OUTILS[id]
  const taille = reglage.taille * c.dpr
  if (o.rendu === 'aero') return tamponsAero(ctx, couleur, taille, reglage.opacite, points, etat ?? { index: 0, reste: 0 })
  const poly = polygone(points, optionsContour(id, taille, c.fini, c.pressionReelle))
  if (poly.length < 3) return
  ctx.save()
  cheminPolygone(ctx, poly)
  if (o.rendu === 'gomme') { ctx.fillStyle = c.fond; ctx.fill() }
  else if (o.rendu === 'grain') { ctx.fillStyle = motifGrain(ctx, couleur, id === 'craie' ? 'gros' : 'fin', c.dpr); ctx.fill() }
  else if (o.rendu === 'lavis') {
    // Le lavis : un corps clair, puis le pigment qui se dépose au bord en séchant.
    const { r, v, b } = rgb(couleur)
    ctx.fillStyle = `rgba(${r},${v},${b},0.62)`; ctx.fill()
    ctx.lineWidth = Math.max(1, 0.9 * c.dpr); ctx.strokeStyle = `rgba(${r},${v},${b},0.5)`; ctx.stroke()
    const coeur = polygone(points, { ...optionsContour(id, taille * 0.45, c.fini, c.pressionReelle) })
    if (coeur.length > 2) { cheminPolygone(ctx, coeur); ctx.fillStyle = `rgba(${r},${v},${b},0.22)`; ctx.fill() }
  } else { ctx.fillStyle = couleur; ctx.fill() }
  ctx.restore()
  return etat
}

function tamponsAero(ctx: CanvasRenderingContext2D, couleur: string, taille: number, opacite: number, points: PointTrait[], etat: EtatAero): EtatAero {
  const { r, v, b } = rgb(couleur)
  const rayon = taille / 2, pas = Math.max(1, rayon * 0.2), pic = 0.07 * opacite
  let { index, reste } = etat
  const tampon = (x: number, y: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rayon)
    g.addColorStop(0, `rgba(${r},${v},${b},${pic})`)
    g.addColorStop(0.35, `rgba(${r},${v},${b},${pic * 0.6})`)
    g.addColorStop(1, `rgba(${r},${v},${b},0)`)
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rayon, 0, Math.PI * 2); ctx.fill()
  }
  if (index === 0 && points.length) { tampon(points[0].x, points[0].y); index = 1 }
  for (; index < points.length; index++) {
    const a = points[index - 1], q = points[index]
    const d = Math.hypot(q.x - a.x, q.y - a.y)
    let t = pas - reste
    while (t <= d) { tampon(a.x + (q.x - a.x) * (t / d), a.y + (q.y - a.y) * (t / d)); t += pas }
    reste = d - (t - pas)
  }
  return { index, reste }
}

/**
 * Verse la couche sur la feuille : l'opacité de l'outil s'applique au trait
 * entier, et le feutre comme l'aquarelle teintent sans couvrir sur un papier
 * clair (sur l'ardoise, le produit noircirait tout).
 */
export function verser(feuille: CanvasRenderingContext2D, couche: HTMLCanvasElement, id: OutilId, reglage: Reglage, papierClair: boolean) {
  const o = OUTILS[id]
  feuille.save()
  feuille.globalAlpha = o.rendu === 'aero' ? 1 : reglage.opacite
  feuille.globalCompositeOperation = o.produit && papierClair ? 'multiply' : 'source-over'
  feuille.drawImage(couche, 0, 0)
  feuille.restore()
}

/** Le style CSS de la couche pendant le trait : il montre déjà ce que `verser` posera. */
export function styleCouche(id: OutilId, reglage: Reglage, papierClair: boolean): { opacity: number; mixBlendMode: 'multiply' | 'normal' } {
  const o = OUTILS[id]
  return { opacity: o.rendu === 'aero' ? 1 : reglage.opacite, mixBlendMode: o.produit && papierClair ? 'multiply' : 'normal' }
}
