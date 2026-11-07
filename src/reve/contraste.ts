// ════════════════════════════════════════════════
// Plancher de contraste WCAG pour les tirages d'ambiance.
//
// Les pools sont soignés à la main, mais rien ne garantissait le résultat :
// ce module est le filet de sécurité. À chaque tirage, l'encre et l'accent
// sont poussés vers le noir ou le blanc (par petits pas) jusqu'à atteindre
// le ratio cible sur leur fond. Sur un tirage déjà bon, c'est un no-op.
// ════════════════════════════════════════════════

type RGB = { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Luminance relative WCAG 2.x (0 = noir, 1 = blanc). */
function luminance({ r, g, b }: RGB): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Ratio de contraste WCAG entre deux couleurs hex (1 à 21). */
export function ratioContraste(a: string, b: string): number {
  const la = luminance(hexToRgb(a))
  const lb = luminance(hexToRgb(b))
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function melanger(c: RGB, cible: RGB, t: number): RGB {
  return {
    r: c.r + (cible.r - c.r) * t,
    g: c.g + (cible.g - c.g) * t,
    b: c.b + (cible.b - c.b) * t,
  }
}

/**
 * Renvoie `couleur`, éventuellement assombrie ou éclaircie par pas de 8 %
 * jusqu'à atteindre `cible` (ratio WCAG) sur `fond`. La teinte est préservée
 * (mélange vers noir/blanc), le caractère du tirage aussi.
 */
export function garantirContraste(couleur: string, fond: string, cible: number): string {
  if (ratioContraste(couleur, fond) >= cible) return couleur
  const versBlanc = luminance(hexToRgb(fond)) < 0.5
  const extreme: RGB = versBlanc ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }
  let c = hexToRgb(couleur)
  for (let i = 0; i < 14; i++) {
    c = melanger(c, extreme, 0.08)
    if (ratioContraste(rgbToHex(c), fond) >= cible) break
  }
  return rgbToHex(c)
}

/**
 * Le PLAFOND, symétrique du plancher ci-dessus : le facteur de luminosité
 * (celui du filtre CSS `brightness()`) qui ramène une image claire posée sur
 * `fond` à `plafond` au plus. 1 : rien à baisser.
 *
 * Décidé avec l'auteur le 7 novembre pour les gravures en couleurs
 * d'origine du décor (`docs/direction-artistique.md`) : « les couleurs
 * d'origine, sauf si cela crée un trop gros contraste avec l'ambiance du
 * jour ». Mesuré : le papier crème d'un disque de 1830 fait 1,04 à 1,14:1
 * sur les ambiances claires — rien à faire —, mais 11,5 à 15:1 sur les
 * sombres, où il éclate comme une pleine lune.
 *
 * `brightness(f)` multiplie chaque composante sRGB par `f` : on cherche le
 * plus grand `f` tel que le papier ainsi assombri ne dépasse pas `plafond`
 * sur le fond. Une image PLUS SOMBRE que son fond n'a pas de plafond : ce
 * n'est pas elle qui éblouit. Le résultat est arrondi vers le bas au
 * centième, pour que le plafond tienne toujours.
 */
export function plafondLuminosite(papier: string, fond: string, plafond: number): number {
  const p = hexToRgb(papier)
  const lf = luminance(hexToRgb(fond))
  if (luminance(p) <= lf) return 1
  const ratio = (f: number) => (luminance({ r: p.r * f, g: p.g * f, b: p.b * f }) + 0.05) / (lf + 0.05)
  if (ratio(1) <= plafond) return 1
  let bas = 0, haut = 1
  for (let i = 0; i < 30; i++) {
    const m = (bas + haut) / 2
    if (ratio(m) <= plafond) bas = m; else haut = m
  }
  return Math.floor(bas * 100) / 100
}
