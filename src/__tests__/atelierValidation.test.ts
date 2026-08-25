import { describe, it, expect } from 'vitest'
import { validerCase } from '../utils/validation'

// Les cases du gabarit de l'Atelier, telles que le médium peut en hériter.
describe("validation du fragment du médium — le cas réel", () => {
  it("refuse la proposition entière posée dans une case SUJET", () => {
    // « Le garçon se couche » dans un GN_SUJET : d'où « Le garçon se couche
    // tient du vide », le seul vers cassé du poème de 34 voix.
    const v = validerCase('Le garçon se couche', 'groupe-nominal', 'stricte')
    expect(v.valide).toBe(false)
    expect(v.message).toBeTruthy()
  })

  it('accepte le groupe nominal attendu', () => {
    expect(validerCase('le garçon', 'groupe-nominal', 'stricte').valide).toBe(true)
  })

  it('laisse tout passer en souple — le réglage par défaut', () => {
    expect(validerCase('Le garçon se couche', 'groupe-nominal', 'souple').valide).toBe(true)
  })

  it('refuse le vide dans les deux niveaux', () => {
    for (const n of ['stricte', 'souple'] as const) {
      expect(validerCase('   ', 'groupe-nominal', n).valide).toBe(false)
    }
  })
})

describe('validation par type de case', () => {
  const cas: [string, string, boolean][] = [
    ['dévore', 'verbe-transitif', true],
    ['une ombre', 'verbe-transitif', false],
    ['nocturne', 'adjectif', true],
    ['doucement', 'adverbe', true],
    ['mais', 'conjonction-coord', true],
    ['une phrase entière et longue', 'conjonction-coord', false],
    ['brûler', 'infinitif', true],
    ['en tombant', 'gérondif', true],
    // Le participe présent seul est toléré : « tombant, la pluie creuse la
    // pierre » est du français correct, la couture tient.
    ['tombant', 'gérondif', true],
    ['la pluie tombe', 'gérondif', false],
  ]
  for (const [texte, type, attendu] of cas) {
    it(`« ${texte} » en ${type} → ${attendu ? 'accepté' : 'refusé'}`, () => {
      expect(validerCase(texte, type as never, 'stricte').valide).toBe(attendu)
    })
  }
})
