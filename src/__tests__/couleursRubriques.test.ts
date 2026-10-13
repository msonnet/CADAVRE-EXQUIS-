import { describe, it, expect } from 'vitest'
import { AMBIANCES, type AmbianceKey } from '../reve/pools'
import { garantirContraste, ratioContraste } from '../reve/contraste'
import { composerSeance } from '../reve/Decor'
import type { SeanceReve } from '../reve/Decor'
import { pavesAccueil, versLch } from '../lib/nuances'

/**
 * Cinq rubriques, cinq couleurs — pour TOUTES les ambiances.
 *
 * La page des Règles distingue cinq entrées : cadavre écrit, cadavre
 * dessiné, l'Atelier, le poème du jour, l'Encrier. Elle n'avait que trois
 * couleurs — l'accent, le second, l'encre — si bien que deux paires
 * portaient la même : l'Atelier avec le poème du jour, l'Encrier avec le
 * cadavre écrit. À l'écran, des jumelles qui n'ont rien à voir.
 *
 * Chaque ambiance porte QUATRE accents ; on n'en exposait que deux.
 * `tierce` et `quarte` ouvrent les deux autres, et avec l'encre cela fait
 * cinq.
 *
 * ── Pourquoi la mesure balaie tout ────────────────────────────────────────
 *
 * L'ambiance est tirée au sort chaque jour, et l'indice du premier accent
 * l'est aussi. Vérifier la palette d'aujourd'hui ne prouverait rien : c'est
 * le pire tirage qu'il faut tenir, sur les sept ambiances et les quatre
 * points de départ.
 */

const CLES = Object.keys(AMBIANCES) as AmbianceKey[]

/**
 * Les cinq couleurs d'un tirage donné, telles que `Decor` les compose.
 *
 * `horsEncre` y est recopiée : sur les ambiances sombres, un accent VAUT
 * l'encre — le crème du papier joue les deux rôles — et il cède alors la
 * place à son `hover`, une couleur écrite dans la palette et non inventée.
 */
function cinqCouleurs(cle: AmbianceKey, depart: number): string[] {
  const a = AMBIANCES[cle]
  const bg = a.bg
  const ink = garantirContraste(a.ink, bg, 4.5)
  const at = (i: number) => {
    const acc = a.accents[(depart + i) % a.accents.length]
    const brut = acc.hex.toLowerCase() === a.ink.toLowerCase() ? acc.hover : acc.hex
    return garantirContraste(brut, bg, 4.5)
  }
  return [
    at(0),   // cadavre écrit
    at(1),   // cadavre dessiné
    at(2),   // l'Atelier
    at(3),   // le poème du jour
    ink,     // l'Encrier — son nom, l'encre
  ]
}

describe('les cinq rubriques des Règles ne se confondent jamais', () => {
  it('chaque ambiance porte au moins quatre accents', () => {
    // C'est ce qui rend les cinq couleurs possibles. Une ambiance ajoutée
    // avec trois accents ferait retomber deux rubriques sur la même.
    for (const cle of CLES) {
      expect(AMBIANCES[cle].accents.length, cle).toBeGreaterThanOrEqual(4)
    }
  })

  it('les cinq sont distinctes, à tout tirage', () => {
    for (const cle of CLES) {
      for (let depart = 0; depart < AMBIANCES[cle].accents.length; depart++) {
        const cinq = cinqCouleurs(cle, depart)
        expect(new Set(cinq.map(c => c.toLowerCase())).size,
          `${cle} · départ ${depart} — ${cinq.join(' ')}`).toBe(5)
      }
    }
  })

  it('et toutes lisibles sur le fond du jour', () => {
    // Une rubrique ne devient pas illisible parce qu'elle est la
    // quatrième : `tierce` et `quarte` passent le même plancher que les
    // deux premières.
    for (const cle of CLES) {
      const bg = AMBIANCES[cle].bg
      for (let depart = 0; depart < AMBIANCES[cle].accents.length; depart++) {
        for (const c of cinqCouleurs(cle, depart)) {
          expect(ratioContraste(c, bg), `${cle} · ${c}`).toBeGreaterThanOrEqual(4.4)
        }
      }
    }
  })
})

/**
 * Les quatre pavés de l'accueil — Cadavre écrit, dessiné, Mode en ligne,
 * L'Atelier — portent UNE couleur et ses nuances : l'accent du jour, puis
 * trois variations de sa clarté, à la même teinte (`pavesAccueil`).
 *
 * Le premier jet leur donnait les quatre accents de l'ambiance : quatre tons
 * qui, pour l'auteur, différaient trop. Le risque s'inverse donc — non plus
 * des pavés jumeaux d'une palette à l'autre, mais des nuances trop proches
 * pour séparer quatre portes, ou poussées si loin qu'elles deviennent une
 * autre couleur. C'est ce que ces mesures tiennent, sur tous les tirages.
 *
 * Elles passent par `composerSeance`, le VRAI code des ambiances, et non par
 * une recopie : une recopie qui dérive cache exactement ce qu'elle prétend
 * tenir.
 */
function lab(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  const [x, y, z] = [
    (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.95047,
    0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2],
    (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.08883,
  ].map(t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116))
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
const deltaE = (a: string, b: string) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }

/** Un tirage par ambiance ET par accent d'ouverture : on balaie les graines jusqu'à les avoir tous. */
function tousLesTirages(): SeanceReve[] {
  const voulus = CLES.reduce((n, cle) => n + AMBIANCES[cle].accents.length, 0)
  const vus = new Map<string, SeanceReve>()
  for (let graine = 1; graine < 20000 && vus.size < voulus; graine++) {
    const s = composerSeance(graine)
    vus.set(`${s.ambiance.name}|${s.accent.name}`, s)
  }
  return [...vus.values()]
}
const TIRAGES = tousLesTirages()
const nom = (s: SeanceReve) => `${s.ambiance.name} · ${s.accent.name}`
const pavesDe = (s: SeanceReve) => pavesAccueil(s.colorSchema.hex, s.colorSchema.bg)
/** Les voisinages de la grille 2 × 2 : écrit | dessiné au-dessus de en ligne | Atelier. */
const VOISINS: [number, number][] = [[0, 1], [2, 3], [0, 2], [1, 3]]
// Mesuré sur les 28 tirages : les nuances s'écartent de la teinte de
// l'accent de 1,8° au plus (l'arrondi à 8 bits), deux voisins sont à 7,0 au
// moins, et la clarté s'éloigne de 0,34 au plus — sur le crème d'« encre
// profonde », qui n'a de place que vers le bas et la prend toute pour que
// quatre crèmes ne se confondent pas.
const TEINTE_MAX = 4
const VOISIN_MIN = 6
const CLARTE_MAX = 0.35

describe('les quatre pavés de l’accueil', () => {
  it('la mesure couvre les sept ambiances et chaque accent d’ouverture', () => {
    expect(TIRAGES.length).toBe(CLES.reduce((n, cle) => n + AMBIANCES[cle].accents.length, 0))
  })

  it('le cadavre écrit porte l’accent du jour tel quel', () => {
    for (const s of TIRAGES) expect(pavesDe(s)[0], nom(s)).toBe(s.colorSchema.hex)
  })

  it('le texte, couleur du papier, se lit sur chacun des quatre', () => {
    for (const s of TIRAGES) for (const f of pavesDe(s)) {
      expect(ratioContraste(s.colorSchema.bg, f), `${nom(s)} · ${f}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('ce sont des nuances de l’accent : sa teinte, à peine écartée', () => {
    for (const s of TIRAGES) {
      const base = versLch(s.colorSchema.hex)
      for (const f of pavesDe(s).slice(1)) {
        const c = versLch(f)
        // Une couleur presque grise n'a pas de teinte qui se lise : on ne la
        // juge que si l'accent en a une.
        if (base.C < 0.04 || c.C < 0.02) continue
        const dh = Math.abs(((c.h - base.h) * 180 / Math.PI + 540) % 360 - 180)
        expect(dh, `${nom(s)} · ${s.colorSchema.hex} → ${f}`).toBeLessThanOrEqual(TEINTE_MAX)
      }
    }
  })

  it('assez écartées pour séparer quatre portes, jamais au point d’en faire une autre couleur', () => {
    for (const s of TIRAGES) {
      const p = pavesDe(s)
      for (const [a, b] of VOISINS) {
        expect(deltaE(p[a], p[b]), `${nom(s)} · ${p[a]} / ${p[b]}`).toBeGreaterThanOrEqual(VOISIN_MIN)
      }
      for (const f of p.slice(1)) {
        const L = versLch(f).L
        expect(Math.abs(L - versLch(p[0]).L), `${nom(s)} · ${f}`).toBeLessThanOrEqual(CLARTE_MAX)
        // Ni noire, ni blanche : une nuance qui y tombe a perdu sa couleur.
        expect(L, `${nom(s)} · ${f}`).toBeGreaterThanOrEqual(0.26)
        expect(L, `${nom(s)} · ${f}`).toBeLessThanOrEqual(0.97)
      }
    }
  })
})
