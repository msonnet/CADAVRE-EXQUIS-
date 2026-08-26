import { describe, it, expect } from 'vitest'
import { gabaritsIncomplets, partIncomplete, piocherReserve, tirerGabarit } from '../pages/JeuAtelier'

// Mesuré sur un atelier de dix-sept vers : les quinze vers de voix étaient
// quinze propositions complètes. Les seuls vers qui sonnaient humains étaient
// ceux du médium — « Il est beau le soleil couchant », une dislocation, et
// « Dans la totalité du monde », une subordonnée qui pend. Le moteur savait
// faire de la syntaxe, pas de la parole.

// Les rôles disent l'intention mieux que les types : « la lumière tremble »
// n'a pas de complément et reste une proposition complète, tandis que « la
// craie efface » s'arrête sur un verbe qui en réclamait un.
const ROLES_INCOMPLETS = new Set([
  'APPOSITION', 'ÉNUMÉRATION', 'LITANIE', 'SUSPENS', 'UN MOT',
  'LIST', 'LITANY', 'SUSPENDED', 'ONE WORD',
])
const estIncomplet = (g: { role: string }[]) => g.some(f => ROLES_INCOMPLETS.has(f.role))

// Le plan ne met jamais plus de cinq voix sur un vers (quatre plus le médium
// sur un vers de fragment) : c'est le plafond de repartirVoix.
const PLAFOND = 5

describe('gabaritsIncomplets', () => {
  it('rend toujours autant de cases que de voix, de une à douze', () => {
    for (let n = 1; n <= 12; n++) {
      const v = gabaritsIncomplets(n)
      expect(v.length, `n=${n}`).toBeGreaterThan(0)
      for (const g of v) expect(g.length, `n=${n} ${g.map(f => f.role).join('|')}`).toBe(n)
    }
  })

  it('ne finit jamais sa phrase', () => {
    for (let n = 1; n <= 12; n++) {
      for (const g of gabaritsIncomplets(n)) {
        const nom = `n=${n} ${g.map(f => f.role).join('|')}`
        expect(estIncomplet(g), nom).toBe(true)
        // Jamais de verbe intransitif ni de groupe verbal : ceux-là referment
        // le vers. Un transitif est admis, mais seulement en dernier — c'est
        // le complément manquant qui fait le suspens.
        expect(g.some(f => f.type === 'verbe' || f.type === 'groupe-verbal'), nom).toBe(false)
        const iv = g.findIndex(f => f.type === 'verbe-transitif')
        if (iv !== -1) expect(iv, nom).toBe(g.length - 1)
      }
    }
  })

  it("offre l'énumération et la litanie dès trois voix — les deux seules formes qui grandissent", () => {
    for (let n = 3; n <= 12; n++) {
      const roles = gabaritsIncomplets(n).map(g => g.map(f => f.role).join('|'))
      expect(roles.some(r => r.split('|').every(x => x === 'ÉNUMÉRATION')), `n=${n}`).toBe(true)
      expect(roles.some(r => r.split('|').every(x => x === 'LITANIE')), `n=${n}`).toBe(true)
    }
  })

  it('donne le vers d\'un seul mot quand une voix parle seule', () => {
    const v = gabaritsIncomplets(1)
    expect(v).toHaveLength(1)
    expect(v[0]).toHaveLength(1)
    expect(v[0][0].type).toBe('nom')
  })

  it('coud les virgules partout sauf après la dernière case', () => {
    for (let n = 2; n <= 8; n++) {
      for (const g of gabaritsIncomplets(n)) {
        expect(g[g.length - 1].apres, `n=${n}`).toBeUndefined()
      }
    }
  })

  it('laisse le nom nu dans les énumérations — « poussière, le drap, un verre »', () => {
    for (const g of gabaritsIncomplets(5)) {
      const enums = g.filter(f => f.role === 'ÉNUMÉRATION')
      for (const f of enums) expect(f.nu).toBe(true)
    }
  })
})

describe('la part inachevée monte avec le vers ET avec la table', () => {
  it('croît strictement avec le nombre de mains sur le vers', () => {
    const p = [1, 2, 3, 4, 5].map(n => partIncomplete(n))
    for (let i = 1; i < p.length; i++) expect(p[i], `n=${i + 1}`).toBeGreaterThan(p[i - 1])
  })

  it('croît aussi avec le nombre de convives, à vers égal', () => {
    // La grande table n'entasse pas les voix sur un vers, elle allonge le
    // poème : mesuré, 1,5 voix par vers à quatre convives, 2,3 à quarante-six.
    // Sans ce second cadran, une séance de quarante-six voix serait à peine
    // plus inachevée qu'une séance de quatre.
    const petites = partIncomplete(2, 4)
    const grandes = partIncomplete(2, 46)
    expect(grandes - petites).toBeGreaterThan(0.15)
  })

  it('ne dépasse jamais deux vers sur trois — le poème garde des phrases', () => {
    for (let n = 1; n <= 6; n++) {
      for (const t of [1, 4, 12, 24, 46, 200]) {
        expect(partIncomplete(n, t), `n=${n} t=${t}`).toBeLessThanOrEqual(0.62)
      }
    }
  })

  it('ne bouge pas sur une petite table — la forme complète y reste la règle', () => {
    expect(partIncomplete(2, 4)).toBe(partIncomplete(2, 1))
  })
})

describe('tirerGabarit — ce que la table produit vraiment', () => {
  const mesurer = (n: number, table = 1) => {
    let inc = 0
    const N = 3000
    for (let i = 0; i < N; i++) if (estIncomplet(tirerGabarit(n, true, true, false, table))) inc++
    return inc / N
  }

  it('inachève plus souvent à cinq voix qu\'à deux', () => {
    expect(mesurer(5)).toBeGreaterThan(mesurer(2) + 0.15)
  })

  it("tient la promesse : autour de la moitié des vers à cinq voix", () => {
    const t = mesurer(5)
    expect(t).toBeGreaterThan(0.45)
    expect(t).toBeLessThan(0.65)
  })

  it('inachève deux fois plus souvent sur une table de quarante-six que sur une table de quatre', () => {
    for (const n of [2, 3]) {
      expect(mesurer(n, 46), `n=${n}`).toBeGreaterThan(mesurer(n, 4) * 1.5)
    }
  })

  it('laisse malgré tout passer des propositions complètes partout', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(mesurer(n), `n=${n}`).toBeLessThan(0.7)
  })

  it("respecte encore la garde d'ouverture et l'absence d'outils", () => {
    const OUTIL = new Set(['conjonction-coord', 'conjonction-subord'])
    const EST_GN = (t: string) => t === 'groupe-nominal' || t === 'groupe-nominal-riche'
    for (const n of [1, 2, 3, 4, 5, 7]) {
      for (let i = 0; i < 500; i++) {
        expect(tirerGabarit(n, true, false).some(f => OUTIL.has(f.type)), `outils n=${n}`).toBe(false)
        expect(EST_GN(tirerGabarit(n, true, true, true)[0].type), `horsGN n=${n}`).toBe(false)
      }
    }
  })

  it('rend une case par voix jusqu\'au plafond de cinq', () => {
    for (let n = 1; n <= PLAFOND; n++) {
      for (let i = 0; i < 400; i++) expect(tirerGabarit(n).length, `n=${n}`).toBe(n)
    }
  })

  it("ne dépasse jamais cinq cases, quelle que soit la table", () => {
    // Le plan ne demande jamais plus, mais si le plafond bougeait, un gabarit
    // plus long que le nombre de mains laisserait une case sans voix.
    for (const n of [6, 8, 12]) {
      for (let i = 0; i < 200; i++) {
        const g = tirerGabarit(n)
        expect(g.length === n || g.length === PLAFOND, `n=${n} → ${g.length}`).toBe(true)
      }
    }
  })
})

describe('la réserve locale suit les nouvelles formes', () => {
  it("rend un mot, pas une phrase, quand le vers n'en demande qu'un", () => {
    for (let i = 0; i < 60; i++) {
      const t = piocherReserve('nom')
      expect(t.split(/\s+/).length, t).toBe(1)
    }
  })

  it('sait encore servir les cases des formes complètes', () => {
    for (const type of ['groupe-nominal', 'verbe', 'infinitif', 'adjectif', 'adverbe']) {
      expect(piocherReserve(type), type).toBeTruthy()
    }
  })
})
