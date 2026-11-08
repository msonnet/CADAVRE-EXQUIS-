/**
 * La feuille de la fin de partie — une feuille posée, et non une carte.
 *
 * Planche témoin du 8 novembre (`docs/direction-artistique.md`, chantier 3),
 * validée par l'auteur : la carte grise à liseré rouge se lisait comme un
 * encadré de site. Elle devient un papier posé sur l'ambiance, avec son
 * ombre, qui arrive plié et s'allonge à chaque volet (`Depli`).
 *
 * ── La couleur ────────────────────────────────────────────────────────────
 *
 * Sur une ambiance claire, le papier est PLUS CLAIR que le fond : une feuille
 * posée sur une table. Sur une ambiance sombre, un papier clair ferait un
 * trou blanc dans l'écran et obligerait à changer la couleur de l'encre ; le
 * papier y est donc un papier noir, à peine éclairé par l'encre de la
 * séance. Dans les deux cas l'encre garde sa couleur.
 *
 * ── L'ombre ───────────────────────────────────────────────────────────────
 *
 * Sur fond clair, une ombre brune et basse. Sur fond sombre une ombre ne se
 * voit pas : un liseré de lumière d'un demi-pixel fait le bord, et l'ombre
 * reste pour la profondeur.
 *
 * Le module est pur, sauf `grainDuPapier`, qui dessine sur un canvas et se
 * tait hors du navigateur.
 */

const VERS_BLANC = 0.55
const VERS_ENCRE = 0.075

const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const hex = (c: number[]) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')

function melange(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b)
  return hex(x.map((v, i) => v + (y[i] - v) * t))
}

function luminance(h: string): number {
  const [r, g, b] = rgb(h).map(v => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export interface PapierDeFeuille {
  /** La couleur du papier, opaque. */
  couleur: string
  /** Vrai sur les ambiances sombres : le papier y est un papier noir. */
  sombre: boolean
  /** L'ombre de la feuille posée (`box-shadow`). */
  ombre: string
  /** La teinte de l'ombre qui couvre un volet encore debout. */
  ombreVolet: string
}

export function papierDeLaFeuille(fond: string, encre: string): PapierDeFeuille {
  const sombre = luminance(fond) < 0.18
  return {
    couleur: sombre ? melange(fond, encre, VERS_ENCRE) : melange(fond, '#ffffff', VERS_BLANC),
    sombre,
    ombre: sombre
      ? '0 0 0 0.5px rgba(255,240,210,0.18), 0 14px 18px rgba(0,0,0,0.55)'
      : '0 1px 0.6px rgba(60,40,10,0.16), 0 12px 16px -2px rgba(60,40,10,0.15)',
    ombreVolet: sombre ? '#000000' : '#1e1406',
  }
}

/**
 * Les plis au repos, en accordéon : un creux, puis une arête.
 *
 * Volontairement faibles. Au premier rendu de la planche ils étaient trois
 * fois plus marqués, et la feuille redevenait des barres empilées — le piège
 * que décrit `Papier.tsx`.
 */
export function reliefDuPli(rang: number, sombre: boolean): string {
  if (rang % 2 === 0) {
    return `linear-gradient(to bottom, ${sombre ? 'rgba(0,0,0,0.26)' : 'rgba(40,28,10,0.04)'}, rgba(0,0,0,0) 30%)`
  }
  return `linear-gradient(to bottom, ${sombre ? 'rgba(255,240,210,0.035)' : 'rgba(255,255,255,0.45)'}, rgba(255,255,255,0) 24%), `
    + `linear-gradient(to top, ${sombre ? 'rgba(0,0,0,0.12)' : 'rgba(40,28,10,0.02)'}, rgba(0,0,0,0) 24%)`
}

/**
 * Le grain : des points rares et quelques fibres, sombres sur papier clair,
 * clairs sur papier noir. À peine visible, et séparé du reste parce que le
 * projet tient que « une feuille se reconnaît à ses plis, pas à son grain ».
 * L'auteur l'a gardé ; pour le retirer, `GRAIN = false`.
 *
 * Dessiné une fois par couleur de papier, avec un hasard fixé : deux parties
 * ont le même papier. Aucun fichier, rien à précacher.
 */
export const GRAIN = true
const grains: Partial<Record<'clair' | 'sombre', string>> = {}

export function grainDuPapier(sombre: boolean): string | undefined {
  if (!GRAIN || typeof document === 'undefined') return undefined
  const cle = sombre ? 'sombre' : 'clair'
  if (grains[cle]) return grains[cle]
  const n = 200
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')
  if (!g) return undefined
  let graine = sombre ? 3 : 7
  const hasard = () => {
    graine = (graine + 0x6d2b79f5) | 0
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const img = g.createImageData(n, n)
  const teinte = sombre ? [255, 244, 222] : [58, 44, 24]
  for (let i = 0; i < n * n; i++) {
    img.data[i * 4] = teinte[0]
    img.data[i * 4 + 1] = teinte[1]
    img.data[i * 4 + 2] = teinte[2]
    img.data[i * 4 + 3] = Math.pow(hasard(), 4) * (sombre ? 24 : 20)
  }
  g.putImageData(img, 0, 0)
  g.globalAlpha = sombre ? 0.07 : 0.08
  g.strokeStyle = sombre ? '#fff3dc' : '#3a2c18'
  g.lineWidth = 0.6
  for (let i = 0; i < 26; i++) {
    const x = hasard() * n, y = hasard() * n, l = 6 + hasard() * 16, a = hasard() * Math.PI
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(
      x + Math.cos(a) * l * 0.5 + (hasard() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (hasard() - 0.5) * 4,
      x + Math.cos(a) * l, y + Math.sin(a) * l,
    )
    g.stroke()
  }
  return (grains[cle] = `url(${c.toDataURL('image/png')})`)
}
