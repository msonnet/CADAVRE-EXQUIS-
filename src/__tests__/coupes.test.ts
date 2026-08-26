import { describe, it, expect } from 'vitest'
import { normaliserSortie } from '../../api/claude'

// Une coupe aveugle laisse pendre un mot-outil. Le défaut est le même trois
// fois : « de la suie noire » coupé à deux mots donnait « de la » ; « en
// lisant à voix basse » coupé à trois donne « en lisant à » ; « en doutant
// quand même » donne « en doutant quand ». Les deux derniers sont sortis d'un
// atelier réel, le premier avait été corrigé sans qu'on aille voir ailleurs.

describe('gérondif — la coupe à trois mots', () => {
  it("ne laisse plus pendre la préposition", () => {
    // Le vers 3 d'un atelier réel disait « en lisant à, son rebrousse… »
    expect(normaliserSortie('en lisant à voix basse', 'gérondif')).toBe('en lisant')
    expect(normaliserSortie('en doutant quand même', 'gérondif')).toBe('en doutant')
    expect(normaliserSortie('en glissant sur la pierre', 'gérondif')).toBe('en glissant')
    expect(normaliserSortie("en cherchant dans l'ombre", 'gérondif')).toBe('en cherchant')
  })

  it('garde les gérondifs qui tiennent debout', () => {
    expect(normaliserSortie('en tombant', 'gérondif')).toBe('en tombant')
    expect(normaliserSortie('en brûlant lentement', 'gérondif')).toBe('en brûlant lentement')
    expect(normaliserSortie('en dévidant mal', 'gérondif')).toBe('en dévidant mal')
  })

  it("refuse le gérondif réduit à son seul « en »", () => {
    expect(normaliserSortie('en', 'gérondif')).toBe('')
    expect(normaliserSortie('la pluie tombe', 'gérondif')).toBe('')
  })
})

describe('adverbe — les locutions de trois mots', () => {
  it("accepte celles qui étaient rejetées d'office", () => {
    for (const a of ['à la dérobée', 'sans un bruit', 'de guingois', 'à contre-jour',
                     'par en dessous', 'à mi-voix']) {
      expect(normaliserSortie(a, 'adverbe'), a).toBe(a)
    }
  })

  it('rabote la locution coupée', () => {
    expect(normaliserSortie('à la dérobée pendant des heures', 'adverbe')).toBe('à la dérobée')
    expect(normaliserSortie('sans bruit dans le', 'adverbe')).toBe('sans bruit')
  })

  it("refuse la tête suivie d'un simple déterminant", () => {
    expect(normaliserSortie('à la', 'adverbe')).toBe('')
    expect(normaliserSortie('en le', 'adverbe')).toBe('')
  })

  it('accepte toujours le -ment et les invariables', () => {
    expect(normaliserSortie('obliquement', 'adverbe')).toBe('obliquement')
    expect(normaliserSortie('jadis', 'adverbe')).toBe('jadis')
  })

  it('refuse toujours ce qui n\'est pas un adverbe', () => {
    expect(normaliserSortie('pesant', 'adverbe')).toBe('')
    expect(normaliserSortie('la cendre froide', 'adverbe')).toBe('')
  })
})

describe('groupe nominal riche — le même râteau, inchangé', () => {
  it("ne laisse pas pendre le mot-outil", () => {
    expect(normaliserSortie('la nuit sans fond', 'groupe-nominal-riche')).toBe('la nuit sans fond')
    expect(normaliserSortie('le bruit du vent et', 'groupe-nominal-riche')).toBe('le bruit du vent')
    expect(normaliserSortie('une vieille clef de', 'groupe-nominal-riche')).toBe('une vieille clef')
  })
})
