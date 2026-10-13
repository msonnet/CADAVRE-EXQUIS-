import { ratioContraste } from '../reve/contraste'

/**
 * Les nuances d'une couleur — pour les quatre pavés de l'accueil, qui
 * portent UNE couleur dominante et ses variations, pas quatre teintes.
 *
 * On travaille en OKLCH (Björn Ottosson, 2020) : clarté L, saturation C,
 * teinte h. Faire varier L ou C en gardant h, c'est rester dans la même
 * couleur ; et un même écart de L s'y voit à peu près pareil, que la couleur
 * soit un carmin ou un or — ce que ni le RVB ni le TSL ne garantissent.
 *
 * Une contrainte tient tout : le texte des pavés est de la couleur du
 * papier. Une nuance n'est retenue que si ce texte s'y lit à 4,5:1.
 */

export interface Lch { L: number; C: number; h: number }

const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const gam = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function versLch(hex: string): Lch {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => lin(v / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) }
}

function enRvb({ L, C, h }: Lch): [number, number, number] {
  const A = C * Math.cos(h), B = C * Math.sin(h)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** Retour en hex ; hors de l'écran (sRVB), on baisse la saturation, jamais la teinte. */
export function depuisLch(c: Lch): string {
  let C = c.C
  for (let k = 0; k < 40; k++) {
    const rvb = enRvb({ ...c, C })
    if (rvb.every(v => v >= -1e-4 && v <= 1 + 1e-4)) break
    C *= 0.94
  }
  return '#' + enRvb({ ...c, C }).map(v => Math.round(Math.max(0, Math.min(1, gam(Math.max(0, v)))) * 255).toString(16).padStart(2, '0')).join('')
}

/** Distance perçue entre deux couleurs (ΔE OKLab × 100, à l'échelle du ΔE76). */
export function ecart(a: string, b: string): number {
  const p = versLch(a), q = versLch(b)
  return 100 * Math.hypot(p.L - q.L, p.C * Math.cos(p.h) - q.C * Math.cos(q.h), p.C * Math.sin(p.h) - q.C * Math.sin(q.h))
}

/**
 * Le sens où une nuance gagne du contraste : plus sombre sur un papier
 * clair, plus claire sur un papier sombre (le texte est la couleur du
 * papier).
 */
export function sensDuContraste(fond: string): 1 | -1 {
  return versLch(fond).L > 0.6 ? -1 : 1
}

/** Une nuance : la même teinte, la même saturation, la clarté décalée de `dL`. */
export function nuance(base: string, dL: number): string {
  const c = versLch(base)
  return depuisLch({ ...c, L: Math.max(0.12, Math.min(0.96, c.L + dL)) })
}

/**
 * Pousse une nuance dans le sens du contraste jusqu'à ce que le texte
 * (couleur du papier) s'y lise à 4,5:1. Un no-op si c'est déjà le cas.
 */
export function lisible(couleur: string, fond: string): string {
  const sens = sensDuContraste(fond)
  let c = couleur
  for (let k = 0; k < 30 && ratioContraste(fond, c) < 4.5; k++) c = nuance(c, sens * 0.02)
  return c
}

/**
 * La plage de clarté où une couleur reste lisible sous le texte du papier
 * (4,5:1) ET dans la bande de confort — ni noire, ni blanche. Cherchée à
 * teinte et saturation constantes, par dichotomie.
 */
export function plageLisible(base: string, fond: string): [number, number] {
  const c = versLch(base)
  const lit = (L: number) => ratioContraste(fond, depuisLch({ ...c, L })) >= 4.5
  const sens = sensDuContraste(fond)
  // Du côté du papier, la limite est le contraste ; de l'autre, la bande de confort.
  let a = c.L, b = sens < 0 ? 0.9 : 0.27
  for (let k = 0; k < 24; k++) { const m = (a + b) / 2; if (lit(m)) a = m; else b = m }
  const limitePapier = a, limiteFond = sens < 0 ? 0.27 : 0.9
  return sens < 0 ? [Math.min(limiteFond, c.L), Math.max(limitePapier, c.L)] : [Math.min(limitePapier, c.L), Math.max(limiteFond, c.L)]
}

/**
 * L'échelle répartie : `n` nuances de la même couleur, la dominante exacte
 * en tête, les autres de part et d'autre d'elle à PAS ÉGAL, dans la plage
 * lisible et au plus `ampleur` de clarté — pour rester des VARIATIONS et
 * non une autre couleur. Elle ne descend plus toujours du même côté : sur
 * un papier clair, un prune foncé ne tourne plus au noir, il s'éclaircit
 * aussi. Le pas est le plus grand que la place permet ; s'il tombe sous
 * `PAS_MIN`, l'ampleur cède et l'on prend toute la plage lisible — deux
 * pavés voisins ne doivent jamais se confondre.
 */
export const PAS_MIN = 0.06
export function echelle(base: string, fond: string, n: number, ampleur = 0.14): string[] {
  const c = versLch(base)
  const [lo, hi] = plageLisible(base, fond)
  const meilleur = (amp: number) => {
    const dessous = Math.max(0, c.L - Math.max(lo, c.L - amp)), dessus = Math.max(0, Math.min(hi, c.L + amp) - c.L)
    let best = { pas: 0, i: 0 }
    for (let i = 0; i < n; i++) {            // i marches sous la dominante, n − 1 − i au-dessus
      const j = n - 1 - i
      const pas = Math.min(i ? dessous / i : Infinity, j ? dessus / j : Infinity)
      if (pas > best.pas) best = { pas, i }
    }
    return best
  }
  let { pas, i } = meilleur(ampleur)
  if (pas < PAS_MIN) ({ pas, i } = meilleur(1))
  const niveaux = [
    ...Array.from({ length: i }, (_, k) => c.L - (k + 1) * pas),
    ...Array.from({ length: n - 1 - i }, (_, k) => c.L + (k + 1) * pas),
  ].sort((x, y) => Math.abs(x - c.L) - Math.abs(y - c.L))   // de la plus proche à la plus lointaine
  return [base, ...niveaux.map(L => lisible(depuisLch({ ...c, L }), fond))]
}

/**
 * Les quatre pavés de l'accueil — écrit, dessiné, mode en ligne, Atelier :
 * l'accent du jour sur le cadavre écrit, puis trois nuances de lui, de la
 * plus proche à la plus lointaine. L'ampleur de 0,14 en clarté est celle
 * du schéma retenu par l'auteur parmi quatre, photographiés sur les sept
 * ambiances (« répartie ») : assez pour distinguer quatre portes, pas assez
 * pour en faire quatre couleurs.
 */
export function pavesAccueil(accent: string, papier: string): string[] {
  return echelle(accent, papier, 4, 0.14)
}
