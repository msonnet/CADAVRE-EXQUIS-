import { describe, it, expect } from 'vitest'
import { OUTILS, ORDRE_OUTILS, chiffreDuFut, bornerTaille, reglageParDefaut } from '../lib/trait/outils'
import { optionsContour, polygone, tuileGrain } from '../lib/trait/rendu'
import { redresser, type Pt } from '../lib/trait/redresser'
import { bordDeDepart, surLeBord, surLaRegle, angleAffiche, suivreDeuxDoigts, type Regle } from '../lib/trait/regle'

// Un tremblement de doigt reproductible.
function tremble(pts: Pt[], amp = 1.5, graine = 3): Pt[] {
  let s = graine
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5 }
  return pts.map(p => ({ x: p.x + r() * amp * 2, y: p.y + r() * amp * 2 }))
}
const segment = (a: Pt, b: Pt, n = 40) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }))
const contourDe = (sommets: Pt[], n = 20) => sommets.flatMap((p, i) => segment(p, sommets[(i + 1) % sommets.length], n).slice(i ? 1 : 0))

describe('les instruments', () => {
  it('la trousse contient chaque outil une fois, gomme au bout', () => {
    expect(new Set(ORDRE_OUTILS).size).toBe(Object.keys(OUTILS).length)
    expect(ORDRE_OUTILS.at(-1)).toBe('gomme')
  })
  it('chaque taille par défaut est dans sa plage', () => {
    for (const id of ORDRE_OUTILS) {
      const { min, max, defaut } = OUTILS[id].taille
      expect(min).toBeLessThan(max)
      expect(defaut).toBeGreaterThanOrEqual(min); expect(defaut).toBeLessThanOrEqual(max)
      expect(reglageParDefaut(id).taille).toBe(defaut)
    }
  })
  it('le chiffre du fût va de 10 à 100, et une taille hors plage est ramenée', () => {
    expect(chiffreDuFut('plume', OUTILS.plume.taille.min)).toBe(10)
    expect(chiffreDuFut('plume', OUTILS.plume.taille.max)).toBe(100)
    expect(chiffreDuFut('plume', 999)).toBe(100)
    expect(bornerTaille('stylo', -3)).toBe(OUTILS.stylo.taille.min)
  })
})

describe('le contour d’un trait', () => {
  // Largeur du polygone au milieu d'un trait horizontal.
  const largeurAuMilieu = (poly: number[][], x: number) => {
    const ys = poly.filter(p => Math.abs(p[0] - x) < 10).map(p => p[1])
    return Math.max(...ys) - Math.min(...ys)
  }
  const ligne = (vitesse: number) => Array.from({ length: 60 }, (_, i) => ({ x: i * vitesse, y: 100, p: 0.5 }))

  it('le stylo trace une ligne égale : la largeur ne dépend pas de la vitesse', () => {
    const lent = polygone(ligne(2), optionsContour('stylo', 8, true, false))
    const vite = polygone(ligne(9), optionsContour('stylo', 8, true, false))
    expect(largeurAuMilieu(lent, 60)).toBeCloseTo(8, 0)
    expect(largeurAuMilieu(vite, 270)).toBeCloseTo(8, 0)
  })
  it('la plume s’affine quand le geste accélère, au doigt', () => {
    const lent = polygone(ligne(1.5), optionsContour('plume', 12, true, false))
    const vite = polygone(ligne(14), optionsContour('plume', 12, true, false))
    expect(largeurAuMilieu(vite, 420)).toBeLessThan(largeurAuMilieu(lent, 45))
  })
  it('un trait est UN polygone fermé, quelle que soit sa longueur', () => {
    const poly = polygone(ligne(3), optionsContour('feutre', 20, true, false))
    expect(poly.length).toBeGreaterThan(10)
    expect(poly.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))).toBe(true)
  })
})

describe('le grain du papier', () => {
  const moyenne = (a: Float32Array) => a.reduce((s, v) => s + v, 0) / a.length
  it('est reproductible et borné', () => {
    const a = tuileGrain(48, 'fin'), b = tuileGrain(48, 'fin')
    expect(Array.from(a)).toEqual(Array.from(b))
    expect(Math.min(...a)).toBeGreaterThanOrEqual(0); expect(Math.max(...a)).toBeLessThanOrEqual(1)
  })
  it('la craie laisse plus de papier que le crayon', () => {
    const craie = tuileGrain(64, 'gros'), crayon = tuileGrain(64, 'fin')
    expect(moyenne(craie)).toBeLessThan(moyenne(crayon))
    // Le papier transparaît sous la craie, pas sous le crayon — sans que la
    // craie devienne un trait cassé (premier réglage : des taches séparées).
    const trous = (a: Float32Array) => a.filter(v => v === 0).length / a.length
    expect(trous(craie)).toBeGreaterThan(trous(crayon))
    expect(trous(craie)).toBeGreaterThan(0.05)
    expect(moyenne(craie)).toBeGreaterThan(0.35)
  })
})

describe('redresser une forme', () => {
  it('une ligne tremblée devient une droite', () => {
    const r = redresser(tremble(segment({ x: 20, y: 30 }, { x: 260, y: 140 })))
    expect(r?.forme).toBe('droite')
    expect(r!.points[0].x).toBeCloseTo(20, -1)
  })
  it('un cercle à main levée devient une ellipse', () => {
    const cercle = Array.from({ length: 80 }, (_, i) => {
      const t = (2 * Math.PI * i) / 79
      return { x: 150 + 80 * Math.cos(t), y: 150 + 70 * Math.sin(t) }
    })
    const r = redresser(tremble(cercle, 2.5))
    expect(r?.forme).toBe('ellipse')
    // Le contour rendu passe à la bonne distance du centre.
    const d = r!.points.map(p => Math.hypot(p.x - 150, p.y - 150))
    expect(Math.min(...d)).toBeGreaterThan(60); expect(Math.max(...d)).toBeLessThan(92)
  })
  it('un carré devient un rectangle aux angles droits', () => {
    const r = redresser(tremble(contourDe([{ x: 40, y: 40 }, { x: 200, y: 44 }, { x: 196, y: 190 }, { x: 38, y: 186 }]), 2))
    expect(r?.forme).toBe('rectangle')
  })
  it('un triangle devient un triangle', () => {
    const r = redresser(tremble(contourDe([{ x: 150, y: 30 }, { x: 260, y: 220 }, { x: 40, y: 220 }]), 2))
    expect(r?.forme).toBe('triangle')
  })
  it('ne touche ni à un gribouillis, ni à une courbe ouverte, ni à un point', () => {
    const gribouillis = Array.from({ length: 60 }, (_, i) => ({ x: 100 + 60 * Math.sin(i * 1.7), y: 100 + 50 * Math.cos(i * 2.9) + i }))
    expect(redresser(gribouillis)).toBeNull()
    const arc = Array.from({ length: 50 }, (_, i) => ({ x: 100 + 80 * Math.cos(i / 49 * Math.PI), y: 100 + 80 * Math.sin(i / 49 * Math.PI) }))
    expect(redresser(arc)).toBeNull()
    expect(redresser([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }])).toBeNull()
  })
})

describe('la règle', () => {
  const r: Regle = { cx: 200, cy: 300, angle: 0, longueur: 300, epaisseur: 60 }
  it('un départ près d’un bord s’y appuie, ailleurs non', () => {
    expect(bordDeDepart(r, { x: 200, y: 255 })).toBe(-1)
    expect(bordDeDepart(r, { x: 200, y: 345 })).toBe(1)
    expect(bordDeDepart(r, { x: 200, y: 200 })).toBe(0)
    expect(bordDeDepart(r, { x: 200, y: 300 })).toBe(0)
    expect(surLaRegle(r, { x: 200, y: 300 })).toBe(true)
  })
  it('le trait suit le bord, même tourné', () => {
    expect(surLeBord(r, -1, { x: 120, y: 262 })).toEqual({ x: 120, y: 270 })
    // Décalé vers l'extérieur de la demi-épaisseur du trait.
    expect(surLeBord(r, -1, { x: 120, y: 262 }, 3)).toEqual({ x: 120, y: 267 })
    const t = { ...r, angle: Math.PI / 4 }
    const p = surLeBord(t, 1, { x: 260, y: 330 })
    // Sur la droite parallèle à 45°, décalée de 30 px.
    const v = -(p.x - 200) * Math.sin(Math.PI / 4) + (p.y - 300) * Math.cos(Math.PI / 4)
    expect(v).toBeCloseTo(30, 6)
  })
  it('deux doigts la déplacent et la tournent', () => {
    const n = suivreDeuxDoigts(r, [{ x: 100, y: 300 }, { x: 300, y: 300 }], [{ x: 110, y: 310 }, { x: 310, y: 410 }])
    expect(n.cx).toBeCloseTo(210); expect(n.angle).toBeGreaterThan(0.4)
  })
  it('l’angle s’aimante aux multiples de 15°', () => {
    expect(angleAffiche((44.2 * Math.PI) / 180).degres).toBe(45)
    expect(angleAffiche((40 * Math.PI) / 180).degres).toBe(40)
    expect(angleAffiche((-1 * Math.PI) / 180).degres).toBe(0)
  })
})
