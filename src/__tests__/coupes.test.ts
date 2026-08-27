import { describe, it, expect } from 'vitest'
import { contrainteAdverbe, normaliserSortie } from '../../api/claude'

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

// ── La contrainte adverbe, tirée à chaque appel ───────────────────────────
//
// Deux mesures ont été nécessaires. Consigne d'origine : dix locutions
// prépositionnelles sur onze réponses, un seul -ment. Consigne réécrite pour
// dire que le -ment est la règle : « obliquement » onze fois sur seize. La
// collapse avait changé de côté, pas disparu — comme le boucher et son
// persillé, comme les quarante-six voix et leur article défini.

describe('contrainteAdverbe', () => {
  it('ne rend pas toujours la même forme', () => {
    const formes = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const c = contrainteAdverbe('fr')
      formes.add(c.startsWith('1 SEUL MOT : un adverbe de manière') ? 'ment'
        : c.startsWith('1 SEUL MOT : un adverbe invariable') ? 'invariable' : 'locution')
    }
    expect(formes.size).toBe(3)
  })

  it('donne à chaque forme une part qui compte', () => {
    const n: Record<string, number> = { ment: 0, invariable: 0, locution: 0 }
    for (let i = 0; i < 2000; i++) {
      const c = contrainteAdverbe('fr')
      n[c.startsWith('1 SEUL MOT : un adverbe de manière') ? 'ment'
        : c.startsWith('1 SEUL MOT : un adverbe invariable') ? 'invariable' : 'locution']++
    }
    expect(n.ment / 2000).toBeGreaterThan(0.35)
    expect(n.invariable / 2000).toBeGreaterThan(0.15)
    expect(n.locution / 2000).toBeGreaterThan(0.20)
  })

  it("ne montre jamais deux fois la même amorce — c'est ce qui défait l'ancrage", () => {
    // Quatre exemples tirés dans un vivier d'au moins seize : deux appels
    // successifs ne peuvent pas présenter la même tête de liste.
    const premiers = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const m = contrainteAdverbe('fr').match(/genre de "([^"]+)"/)
      if (m) premiers.add(m[1])
    }
    expect(premiers.size).toBeGreaterThan(20)
  })

  it("interdit toujours les adjectifs, les noms et les verbes", () => {
    for (let i = 0; i < 60; i++) {
      expect(contrainteAdverbe('fr')).toContain('INTERDIT ABSOLU')
      expect(contrainteAdverbe('en')).toContain('ABSOLUTELY FORBIDDEN')
    }
  })

  it('reste vraie de ses exemples : le -ment ne montre que des -ment', () => {
    for (let i = 0; i < 200; i++) {
      const c = contrainteAdverbe('fr')
      const ex = [...c.matchAll(/"([^"]+)"/g)].map(m => m[1])
      if (c.startsWith('1 SEUL MOT : un adverbe de manière')) {
        for (const e of ex) expect(e, e).toMatch(/ment$/)
      }
      if (c.startsWith('1 SEUL MOT : un adverbe invariable')) {
        for (const e of ex) expect(e, e).not.toMatch(/ment$/)
      }
      if (c.startsWith('2 ou 3 MOTS')) {
        for (const e of ex) expect(e.split(' ').length, e).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

describe('groupe verbal et vers entier — les deux dernières coupes', () => {
  it("ne laisse plus pendre le mot-outil", () => {
    // « le levé traverse un septembre comme » est sorti d'un atelier réel :
    // le groupe verbal n'avait aucune case dans le validateur, il repartait
    // tel quel. Cinquième et dernier endroit de la même faute.
    expect(normaliserSortie('traverse un septembre comme', 'groupe-verbal')).toBe('traverse un septembre')
    expect(normaliserSortie('pèse sur le monde et', 'groupe-verbal')).toBe('pèse sur le monde')
    expect(normaliserSortie("glisse dans l'ombre sans", 'groupe-verbal')).toBe("glisse dans l'ombre")
    expect(normaliserSortie('quelque chose demeure quand', 'libre')).toBe('quelque chose demeure')
  })

  it('garde intacts les groupes qui tiennent debout', () => {
    expect(normaliserSortie('traverse la nuit', 'groupe-verbal')).toBe('traverse la nuit')
    expect(normaliserSortie('pèse sur le monde', 'groupe-verbal')).toBe('pèse sur le monde')
    expect(normaliserSortie("l'absence a une forme", 'libre')).toBe("l'absence a une forme")
  })

  it("refuse ce qui se réduit à un seul mot après rabotage", () => {
    expect(normaliserSortie('traverse comme', 'groupe-verbal')).toBe('')
  })
})
