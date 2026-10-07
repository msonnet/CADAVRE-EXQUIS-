/**
 * Les couleurs du nuancier — calculées, pas recopiées : la grille de Freeform
 * est une teinte par colonne, de l'ombre à la lumière, plus une rangée de gris.
 */

export function hsl(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(255 * x).toString(16).padStart(2, '0')).join('')
}

/** Douze teintes, du bleu au violet en passant par le rouge — l'ordre de Freeform. */
export const TEINTES = [205, 190, 170, 140, 95, 55, 42, 28, 8, 340, 300, 265]

/** Dix rangées : la première en gris, les neuf autres de l'ombre à la lumière. */
export function grilleNuancier(): string[][] {
  const gris = Array.from({ length: 12 }, (_, i) => hsl(0, 0, 100 - (i * 100) / 11))
  const rangees = Array.from({ length: 9 }, (_, r) => {
    const l = 18 + r * 9.2                      // 18 % → 92 %
    const s = r < 2 ? 70 : r > 6 ? 70 - (r - 6) * 12 : 85
    return TEINTES.map(h => hsl(h, s, l))
  })
  return [gris, ...rangees]
}

/** Les encres du jeu — celles qu'un graveur aurait sur sa table. */
export const ENCRES = [
  { nom: ['Noir de fumée', 'Lamp black'], c: '#1a1410' },
  { nom: ['Sépia', 'Sepia'], c: '#5b3a1e' },
  { nom: ['Vermillon', 'Vermilion'], c: '#c8321e' },
  { nom: ['Bleu de Prusse', 'Prussian blue'], c: '#1f3a5f' },
  { nom: ['Vert-de-gris', 'Verdigris'], c: '#3f6b5a' },
  { nom: ['Ocre', 'Ochre'], c: '#c08a2b' },
  { nom: ['Pourpre', 'Purple'], c: '#6b2a5c' },
  { nom: ['Blanc de céruse', 'Lead white'], c: '#f7f2e6' },
] as const

export function versRgb(hex: string) {
  const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
export function depuisRgb(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}
/** Une saisie hexadécimale lisible, ou null : « 1f3a5f », « #1F3A5F », « #abc ». */
export function lireHex(s: string): string | null {
  const m = s.trim().replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(m)) return '#' + m.toLowerCase()
  if (/^[0-9a-f]{3}$/i.test(m)) return '#' + m.toLowerCase().split('').map(c => c + c).join('')
  return null
}

/** Le spectre : la teinte en largeur, de la lumière (haut) à l'ombre (bas). */
export function couleurDuSpectre(fx: number, fy: number): string {
  const h = Math.max(0, Math.min(1, fx)) * 360
  const y = Math.max(0, Math.min(1, fy))
  // En haut le blanc, au milieu la couleur pure, en bas le noir.
  return hsl(h, 100, 100 - y * 100)
}
