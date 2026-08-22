import { describe, it, expect } from 'vitest'
import { tirerGabarit } from '../pages/JeuAtelier'

const OUTIL = new Set(['conjonction-coord', 'conjonction-subord'])

describe('tirerGabarit — les cases outils', () => {
  it("ne s'ouvrent jamais quand aucune voix du vers ne parle ailleurs", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      for (let i = 0; i < 400; i++) {
        const g = tirerGabarit(n, true, false)
        expect(g.some(f => OUTIL.has(f.type))).toBe(false)
      }
    }
  })

  it('restent possibles quand une voix revient dans le poème', () => {
    let vues = 0
    for (const n of [2, 3, 4, 5]) {
      for (let i = 0; i < 400; i++) {
        if (tirerGabarit(n, true, true).some(f => OUTIL.has(f.type))) vues++
      }
    }
    expect(vues).toBeGreaterThan(0)
  })

  it('rend toujours exactement nVoix cases', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      for (const outils of [true, false]) {
        for (let i = 0; i < 200; i++) {
          expect(tirerGabarit(n, false, outils)).toHaveLength(n)
        }
      }
    }
  })
})
