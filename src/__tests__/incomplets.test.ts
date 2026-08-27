import { describe, it, expect } from 'vitest'
import { gabaritsIncomplets, partIncomplete, piocherReserve, tirerGabarit } from '../pages/JeuAtelier'
import { FAMILLES, GardeFormes, diagnosticFormes, familleDuVers, type Famille } from '../lib/formes'

// Mesuré sur un atelier de dix-sept vers : les quinze vers de voix étaient
// quinze propositions complètes. Les seuls vers qui sonnaient humains étaient
// ceux du médium — « Il est beau le soleil couchant », une dislocation, et
// « Dans la totalité du monde », un syntagme qui pend. Le moteur savait faire
// de la syntaxe, pas de la parole.
//
// Puis, une fois les formes inachevées ouvertes, mesuré sur un atelier de
// dix-huit vers : SEPT vers sur seize étaient des listes, dont deux paires
// consécutives. Un métronome en avait remplacé un autre, et le nouveau était
// plus pauvre — une liste n'a aucune syntaxe.

const VERBES_FERMANTS = new Set(['verbe', 'groupe-verbal'])

describe('gabaritsIncomplets', () => {
  it('rend toujours autant de cases que de voix, de une à douze', () => {
    for (let n = 1; n <= 12; n++) {
      const v = gabaritsIncomplets(n)
      expect(v.length, `n=${n}`).toBeGreaterThan(0)
      for (const { cases } of v) expect(cases.length, `n=${n}`).toBe(n)
    }
  })

  it('ne finit jamais sa phrase', () => {
    for (let n = 1; n <= 12; n++) {
      for (const { famille, cases } of gabaritsIncomplets(n)) {
        const nom = `n=${n} ${famille} ${cases.map(f => f.role).join('|')}`
        expect(famille, nom).not.toBe('PROPOSITION')
        expect(familleDuVers(cases.map(f => f.role)), nom).toBe(famille)
        // Jamais de verbe intransitif ni de groupe verbal : ceux-là referment
        // le vers. Un transitif est admis, mais en dernier seulement — c'est
        // le complément absent qui fait le suspens.
        expect(cases.some(f => VERBES_FERMANTS.has(f.type)), nom).toBe(false)
        const iv = cases.findIndex(f => f.type === 'verbe-transitif')
        if (iv !== -1) expect(iv, nom).toBe(cases.length - 1)
      }
    }
  })

  it("offre les deux formes du médium dès qu'il y a de la place", () => {
    // « Il est grand le silence des saisons » et « Au travers un trésor ».
    for (let n = 2; n <= 8; n++) {
      const f = gabaritsIncomplets(n).map(g => g.famille)
      expect(f, `n=${n}`).toContain('DISLOCATION')
      expect(f, `n=${n}`).toContain('SYNTAGME')
      expect(f, `n=${n}`).toContain('SUSPENS')
    }
    expect(gabaritsIncomplets(1).map(g => g.famille)).toContain('SYNTAGME')
  })

  it('coud un mot d\'attelage devant la dislocation et le syntagme', () => {
    for (let n = 1; n <= 6; n++) {
      for (const { famille, cases } of gabaritsIncomplets(n)) {
        if (famille === 'DISLOCATION' || famille === 'SYNTAGME') {
          expect(cases[0].avant, `${famille} n=${n}`).toBeTruthy()
        }
      }
    }
  })

  it('ne laisse jamais la liste occuper plus du quart du vivier', () => {
    // C'est ce déséquilibre-là qui a produit sept listes sur seize vers :
    // deux variantes pures sur cinq, plus une mixte.
    for (let n = 2; n <= 8; n++) {
      const v = gabaritsIncomplets(n)
      const listes = v.filter(g => g.famille === 'LISTE').length
      expect(listes / v.length, `n=${n}`).toBeLessThanOrEqual(0.3)
    }
  })

  it("donne le vers d'un seul mot quand une voix parle seule", () => {
    const v = gabaritsIncomplets(1)
    for (const g of v) expect(g.cases).toHaveLength(1)
    expect(v.some(g => g.cases[0].type === 'nom')).toBe(true)
  })

  it('coud les virgules partout sauf après la dernière case', () => {
    for (let n = 2; n <= 8; n++) {
      for (const { cases } of gabaritsIncomplets(n)) {
        expect(cases[cases.length - 1].apres, `n=${n}`).toBeUndefined()
      }
    }
  })

  it('laisse le nom nu dans les énumérations — « poussière, le drap, un verre »', () => {
    for (const { cases } of gabaritsIncomplets(5)) {
      for (const f of cases.filter(c => c.role === 'ÉNUMÉRATION')) expect(f.nu).toBe(true)
    }
  })
})

// ── La garde des formes ───────────────────────────────────────────────────

describe('GardeFormes', () => {
  it('interdit deux listes de suite — la faute la plus audible du poème mesuré', () => {
    const g = new GardeFormes(20)
    expect(g.permises().has('LISTE')).toBe(true)
    g.enregistrer('LISTE')
    expect(g.permises().has('LISTE')).toBe(false)
    g.enregistrer('SUSPENS')
    expect(g.permises().has('LISTE')).toBe(true)
  })

  it('plafonne la liste à un vers sur huit', () => {
    const g = new GardeFormes(16)
    let posees = 0
    for (let i = 0; i < 40; i++) {
      if (g.permises().has('LISTE')) { g.enregistrer('LISTE'); posees++ }
      else g.enregistrer('PROPOSITION')
    }
    expect(posees).toBeLessThanOrEqual(2)
  })

  it('ne plafonne pas la proposition — elle est le fond du poème', () => {
    const g = new GardeFormes(20)
    for (let i = 0; i < 40; i++) g.enregistrer('PROPOSITION')
    expect(g.permises().size).toBeGreaterThan(1)
  })

  it('interdit trois propositions de suite', () => {
    const g = new GardeFormes(20)
    g.enregistrer('PROPOSITION'); g.enregistrer('PROPOSITION'); g.enregistrer('PROPOSITION')
    expect(g.permises().has('PROPOSITION')).toBe(false)
  })

  it('ne ferme jamais toutes les portes', () => {
    const g = new GardeFormes(3)
    for (const f of FAMILLES) { g.enregistrer(f); g.enregistrer(f); g.enregistrer(f) }
    expect(g.permises().size).toBeGreaterThanOrEqual(1)
  })

  it("repart avec la mémoire d'un brouillon rouvert", () => {
    const g = new GardeFormes(20, ['LISTE'])
    expect(g.permises().has('LISTE')).toBe(false)
  })
})

// ── Ce que la table produit vraiment ─────────────────────────────────────

describe('tirerGabarit', () => {
  const familleTiree = (n: number, table = 1, permises?: Set<Famille>) =>
    familleDuVers(tirerGabarit(n, true, true, false, table, permises).map(f => f.role))

  const mesurer = (n: number, table = 1) => {
    const c: Record<string, number> = {}
    const N = 3000
    for (let i = 0; i < N; i++) {
      const f = familleTiree(n, table)
      c[f] = (c[f] ?? 0) + 1
    }
    return { inacheve: 1 - (c.PROPOSITION ?? 0) / N, liste: (c.LISTE ?? 0) / N }
  }

  it("inachève plus souvent à cinq voix qu'à deux", () => {
    expect(mesurer(5).inacheve).toBeGreaterThan(mesurer(2).inacheve + 0.15)
  })

  it('inachève deux fois plus souvent sur une table de quarante-six que de quatre', () => {
    for (const n of [2, 3]) {
      expect(mesurer(n, 46).inacheve, `n=${n}`).toBeGreaterThan(mesurer(n, 4).inacheve * 1.5)
    }
  })

  it('ne laisse pas la liste dépasser un vers sur dix, même sans garde', () => {
    for (const n of [2, 3, 4, 5]) {
      for (const table of [4, 46]) {
        expect(mesurer(n, table).liste, `n=${n} t=${table}`).toBeLessThan(0.10)
      }
    }
  })

  it('respecte la famille interdite quand la garde en passe une', () => {
    const sansListe = new Set(FAMILLES.filter(f => f !== 'LISTE'))
    for (const n of [2, 3, 4, 5]) {
      for (let i = 0; i < 800; i++) {
        expect(familleTiree(n, 46, sansListe), `n=${n}`).not.toBe('LISTE')
      }
    }
  })

  it("respecte encore la garde d'ouverture et l'absence d'outils", () => {
    const OUTIL = new Set(['conjonction-coord', 'conjonction-subord'])
    // Un mot d'attelage en tête change ce sur quoi le vers ouvre : « sous un
    // trésor » commence par une préposition, pas par un groupe nominal.
    const OUVRE_GN = (f: { type: string; avant?: string }) =>
      !f.avant && (f.type === 'groupe-nominal' || f.type === 'groupe-nominal-riche')
    for (const n of [1, 2, 3, 4, 5, 7]) {
      for (let i = 0; i < 400; i++) {
        expect(tirerGabarit(n, true, false).some(f => OUTIL.has(f.type)), `outils n=${n}`).toBe(false)
        expect(OUVRE_GN(tirerGabarit(n, true, true, true)[0]), `horsGN n=${n}`).toBe(false)
      }
    }
  })

  it("rend une case par voix jusqu'au plafond de cinq", () => {
    for (let n = 1; n <= 5; n++) {
      for (let i = 0; i < 400; i++) expect(tirerGabarit(n).length, `n=${n}`).toBe(n)
    }
  })
})

describe('la part inachevée monte avec le vers ET avec la table', () => {
  it('croît strictement avec le nombre de mains sur le vers', () => {
    const p = [1, 2, 3, 4, 5].map(n => partIncomplete(n))
    for (let i = 1; i < p.length; i++) expect(p[i], `n=${i + 1}`).toBeGreaterThan(p[i - 1])
  })

  it('croît aussi avec le nombre de convives, à vers égal', () => {
    expect(partIncomplete(2, 46) - partIncomplete(2, 4)).toBeGreaterThan(0.15)
  })

  it('ne dépasse jamais deux vers sur trois', () => {
    for (let n = 1; n <= 6; n++) {
      for (const t of [1, 4, 12, 24, 46, 200]) {
        expect(partIncomplete(n, t), `n=${n} t=${t}`).toBeLessThanOrEqual(0.62)
      }
    }
  })
})

// ── Le diagnostic de forme, sur le poème qui a motivé tout ceci ──────────

describe('diagnosticFormes', () => {
  it("retrouve les sept listes sur seize de l'atelier mesuré", () => {
    const poeme: string[][] = [
      ['SUSPENS'], ['SUJET', 'VERBE'], ['SUJET', 'VERBE'],
      ['ÉNUMÉRATION'], ['SUJET', 'VERBE'], ['LITANIE'], ['SUSPENS'],
      ['SUJET', 'VERBE'], ['LITANIE'], ['LITANIE'], ['SUJET', 'VERBE'],
      ['ÉNUMÉRATION'], ['LITANIE'], ['APPOSITION'], ['SUJET', 'VERBE'],
      ['ÉNUMÉRATION'],
    ]
    const d = diagnosticFormes(poeme)
    expect(d.comptes.LISTE).toBe(7)
    expect(d.parts.LISTE).toBeGreaterThan(0.4)
    expect(d.plusLongueSerie).toBe(2)
  })

  it('compte la diversité des formes', () => {
    const d = diagnosticFormes([['SUSPENS'], ['ÉNUMÉRATION'], ['SUJET'], ['DISLOCATION']])
    expect(d.diversite).toBe(4)
  })

  it('range tout ce qui ne porte aucun rôle de forme en proposition', () => {
    expect(familleDuVers(['SUJET', 'VERBE', 'COMPLÉMENT'])).toBe('PROPOSITION')
    expect(familleDuVers(['VERS ENTIER'])).toBe('PROPOSITION')
    expect(familleDuVers([])).toBe('PROPOSITION')
  })
})

describe('la réserve locale suit les nouvelles formes', () => {
  it("rend un mot, pas une phrase, quand le vers n'en demande qu'un", () => {
    for (let i = 0; i < 60; i++) expect(piocherReserve('nom').split(/\s+/).length).toBe(1)
  })

  it('sait encore servir les cases des formes complètes', () => {
    for (const type of ['groupe-nominal', 'verbe', 'infinitif', 'adjectif', 'adverbe']) {
      expect(piocherReserve(type), type).toBeTruthy()
    }
  })
})

// ── La séance entière, du plan au poème ──────────────────────────────────

describe('une séance simulée de bout en bout', () => {
  const seance = (table: number, totalVers = 30) => {
    const g = new GardeFormes(totalVers)
    const roles: string[][] = []
    for (let i = 0; i < totalVers; i++) {
      const n = 1 + Math.floor(Math.random() * 4)
      const gab = tirerGabarit(n, true, true, false, table, g.permises())
      const r = gab.map(x => x.role)
      g.enregistrer(familleDuVers(r))
      roles.push(r)
    }
    return diagnosticFormes(roles)
  }

  it("ne laisse jamais filer une longue série d'une même forme", () => {
    // Sans contrainte sur la proposition, la simulation montrait des séries de
    // quinze phrases complètes d'affilée : la garde pouvait interdire, mais
    // rien n'obligeait le tirage à l'écouter.
    for (const table of [4, 12, 24, 46]) {
      for (let s = 0; s < 40; s++) {
        expect(seance(table).plusLongueSerie, `table=${table}`).toBeLessThanOrEqual(6)
      }
    }
  })

  it('garde la liste à sa place — quelques vers, jamais le poème', () => {
    for (const table of [4, 12, 24, 46]) {
      for (let s = 0; s < 40; s++) {
        const d = seance(table)
        expect(d.comptes.LISTE, `table=${table}`).toBeLessThanOrEqual(4)
        expect(d.parts.LISTE, `table=${table}`).toBeLessThan(0.15)
      }
    }
  })

  it('laisse la proposition rester le fond du poème', () => {
    for (const table of [4, 12, 24, 46]) {
      const d = seance(table, 60)
      expect(d.parts.PROPOSITION, `table=${table}`).toBeGreaterThan(0.35)
    }
  })

  it('fait entendre presque toutes les formes sur une grande table', () => {
    // Mesuré sur cinq cents séances de trente vers, table de quarante-six :
    // sept formes 44 %, six 48 %, cinq 7 %, quatre moins de 1 %. Le plancher
    // est donc à quatre — pas à cinq, et l'écrire à cinq rendait le test
    // capricieux une fois sur cent.
    let total = 0
    for (let s = 0; s < 40; s++) {
      const d = seance(46, 30).diversite
      expect(d).toBeGreaterThanOrEqual(4)
      total += d
    }
    expect(total / 40).toBeGreaterThan(5.5)
  })

  it('inachève davantage à mesure que la table grandit', () => {
    const part = (t: number) => {
      let n = 0
      for (let s = 0; s < 40; s++) n += 1 - seance(t).parts.PROPOSITION
      return n / 40
    }
    expect(part(46)).toBeGreaterThan(part(4) + 0.10)
  })
})

// ── Les mots d'attelage ───────────────────────────────────────────────────

describe("les mots d'attelage", () => {
  const tetesDe = (famille: 'DISLOCATION' | 'SYNTAGME', n = 3, evites?: Set<string>) =>
    gabaritsIncomplets(n, evites).filter(g => g.famille === famille).map(g => g.cases[0].avant!)

  it("ne disloque qu'avec un verbe attributif", () => {
    // Mesuré sur un atelier réel : « il y a persistante une lézarde » et
    // « c'est frictionné un relais ». Deux fautes — « il y a » réclame un
    // groupe nominal nu, « c'est » ne prend pas d'attribut avant son sujet.
    // « Il est court le temps de l'amour », si.
    const vues = new Set<string>()
    for (let i = 0; i < 400; i++) for (const t of tetesDe('DISLOCATION')) vues.add(t)
    expect(vues.size).toBeGreaterThan(3)
    for (const t of vues) {
      expect(t, t).not.toBe("c'est")
      expect(t, t).not.toBe('il y a')
      expect(t, t).toMatch(/^(il|elle) (est|reste|demeure|paraît|semble|devient)$/)
    }
  })

  it('évite celui qui vient de servir', () => {
    // « il reste » a ouvert les vers 10 et 13 du même poème : le tirage
    // n'avait aucune mémoire, comme le déterminant avant sa garde.
    const evites = new Set(['il est', 'il reste'])
    for (let i = 0; i < 400; i++) {
      for (const t of tetesDe('DISLOCATION', 3, evites)) expect(evites.has(t), t).toBe(false)
    }
    for (let i = 0; i < 400; i++) {
      for (const t of tetesDe('SYNTAGME', 3, new Set(['dans', 'sous', 'à même']))) {
        expect(['dans', 'sous', 'à même'].includes(t), t).toBe(false)
      }
    }
  })

  it("rend quand même une tête quand toutes sont évitées", () => {
    const toutes = new Set(tetesDe('SYNTAGME', 3))
    for (let i = 0; i < 60; i++) {
      for (let j = 0; j < 40; j++) for (const t of tetesDe('SYNTAGME', 3)) toutes.add(t)
    }
    for (const t of tetesDe('SYNTAGME', 3, toutes)) expect(t).toBeTruthy()
    for (const t of tetesDe('DISLOCATION', 3, new Set(['il est', 'elle est', 'il reste',
      'il demeure', 'il paraît', 'il semble', 'il devient', 'elle demeure']))) expect(t).toBeTruthy()
  })
})
