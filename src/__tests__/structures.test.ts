import { describe, it, expect } from 'vitest'
import { getStructure, nombreCasesEffectif, reconstruirePoeme, STRUCTURES } from '../structures'

// helpers
function fakeCase(texte: string, i = 0) {
  return { numero: i + 1, fonction: '', consigne: '', auteur: 'humain' as const, texte, ts: 0 }
}

describe('getStructure', () => {
  it('returns phrase-simple when asked', () => {
    const s = getStructure('phrase-simple')
    expect(s.id).toBe('phrase-simple')
    expect(s.cases).toHaveLength(3)
  })

  it('returns phrase-etoffee with 5 cases', () => {
    const s = getStructure('phrase-etoffee')
    expect(s.id).toBe('phrase-etoffee')
    expect(s.cases).toHaveLength(5)
  })

  it('falls back to vers-libre for unknown IDs', () => {
    const s = getStructure('does-not-exist')
    expect(s.id).toBe('vers-libre')
  })

  it('returns vers-libre for vers-libre', () => {
    const s = getStructure('vers-libre')
    expect(s.id).toBe('vers-libre')
    expect(s.nombreCasesVariable).toBeDefined()
  })
})

describe('nombreCasesEffectif', () => {
  it('returns exact count for fixed structures', () => {
    expect(nombreCasesEffectif(getStructure('phrase-simple'))).toBe(3)
    expect(nombreCasesEffectif(getStructure('phrase-etoffee'))).toBe(5)
  })

  it('returns a value within [min, max] for vers-libre', () => {
    const s = getStructure('vers-libre')
    const { min, max } = s.nombreCasesVariable!
    for (let i = 0; i < 20; i++) {
      const n = nombreCasesEffectif(s)
      expect(n).toBeGreaterThanOrEqual(min)
      expect(n).toBeLessThanOrEqual(max)
    }
  })
})

describe('reconstruirePoeme', () => {
  it('joins vers-libre lines with newlines', () => {
    const s = getStructure('vers-libre')
    const cases = ['le ciel pèse', 'une main ouverte', 'le silence répond'].map(fakeCase)
    const poeme = reconstruirePoeme(cases, s)
    expect(poeme).toBe('le ciel pèse\nune main ouverte\nle silence répond')
  })

  it('assembles phrase-simple (sujet verbe complément) with spaces', () => {
    const s = getStructure('phrase-simple')
    const cases = [fakeCase('le vent froid'), fakeCase('dévore'), fakeCase('la nuit épaisse')]
    const poeme = reconstruirePoeme(cases, s)
    expect(poeme).toContain('le vent froid')
    expect(poeme).toContain('dévore')
    expect(poeme).toContain('la nuit épaisse')
  })

  it('assembles phrase-etoffee with all 5 fragments', () => {
    const s = getStructure('phrase-etoffee')
    const words = ['le cadavre', 'exquis', 'boira', 'le vin', 'nouveau']
    const cases = words.map(fakeCase)
    const poeme = reconstruirePoeme(cases, s)
    words.forEach(w => expect(poeme).toContain(w))
  })

  it('handles empty texte without throwing', () => {
    const s = getStructure('phrase-simple')
    const cases = [fakeCase(''), fakeCase(''), fakeCase('')]
    expect(() => reconstruirePoeme(cases, s)).not.toThrow()
  })
})

describe('STRUCTURES completeness', () => {
  it('has exactly 3 structures', () => {
    expect(STRUCTURES).toHaveLength(3)
  })

  it('every structure has a unique id', () => {
    const ids = STRUCTURES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every case has a non-empty consigne and type', () => {
    for (const structure of STRUCTURES) {
      for (const c of structure.cases) {
        expect(c.consigne.length).toBeGreaterThan(0)
        expect(c.type.length).toBeGreaterThan(0)
      }
    }
  })
})
