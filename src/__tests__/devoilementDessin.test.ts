import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { partition, fraction, finDuBalayage, couturesRegulieres, bornes } from '../lib/devoilementDessin'
import { echelleEnsemble } from '../lib/paquet'

/**
 * Le dévoilement d'un dessin s'arrête sur ses coutures, et le montre entier.
 *
 * Avant : trois tiers fixes quelle que soit la longueur, `objectFit: cover`
 * qui rognait la tête ou les pieds d'un dessin plus haut que l'écran, et
 * l'écran qui n'ouvrait qu'après la lecture du modèle.
 */
describe('la partition', () => {
  it('une étape par bande, de deux à sept', () => {
    for (let n = 2; n <= 7; n++) {
      expect(partition(couturesRegulieres(n))).toHaveLength(n)
    }
  })

  it('le balayage marque une pause sur chaque vraie couture', () => {
    const segs = partition([0.31, 0.72])
    expect(segs.map(s => s[3])).toEqual([0.31, 0.72, 1])
    const [, finPremiere] = segs[0]
    const [debutSeconde] = segs[1]
    // Pendant la pause, la ligne reste sur la couture.
    const milieu = (finPremiere + debutSeconde) / 2
    expect(fraction(segs, milieu)).toEqual({ frac: 0.31, balaye: false })
  })

  it('toute longueur tient en moins de cinq secondes, sans devenir un clignement', () => {
    for (let n = 2; n <= 7; n++) {
      const segs = partition(couturesRegulieres(n))
      expect(finDuBalayage(segs), `${n} bandes`).toBeLessThan(5000)
      for (const [t0, t1] of segs) expect(t1 - t0).toBeGreaterThanOrEqual(450)
    }
  })

  it('la fraction ne recule jamais', () => {
    const segs = partition([0.2, 0.5, 0.8])
    let avant = 0
    for (let t = 0; t <= finDuBalayage(segs) + 100; t += 16) {
      const { frac } = fraction(segs, t)
      expect(frac).toBeGreaterThanOrEqual(avant)
      avant = frac
    }
    expect(avant).toBe(1)
  })

  it('des coutures absurdes sont ignorées plutôt que de casser la séquence', () => {
    expect(bornes([NaN, 1.4, -1, 0.5])).toEqual([0, 0.5, 1])
  })
})

describe('l\'écran de dévoilement', () => {
  const src = readFileSync(join(__dirname, '../components/RevealDessin.tsx'), 'utf8')
  // Le dessin se déplie désormais au doigt (11 novembre) : grand pendant les
  // plis, puis la vue recule sur le dessin ENTIER — jamais rogné.
  it('ne rogne plus le dessin : reculé, il tient entier dans l’écran', () => {
    expect(src).not.toMatch(/objectFit:\s*'cover'/)
    for (const H of [300, 900, 1800, 4000]) {
      for (const lecture of [true, false]) expect(H * echelleEnsemble(700, H, lecture)).toBeLessThanOrEqual(700)
    }
  })
  it('n\'attend plus la lecture pour s\'ouvrir', () => {
    const fin = readFileSync(join(__dirname, '../pages/FinDessin.tsx'), 'utf8')
    const avant = fin.slice(0, fin.indexOf('await lireLeDessin(img)'))
    expect(avant).toMatch(/setPhase\('revele'\)/)
  })
})
