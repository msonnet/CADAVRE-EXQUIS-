import { describe, it, expect } from 'vitest'
import {
  CLASSES, GardeMetrique, classeDeLongueur, diagnosticMetrique,
  longueurEstimee, motsDuVers,
} from '../lib/metrique'
import { tirerGabarit } from '../pages/JeuAtelier'
import { GardeFormes, familleDuVers } from '../lib/formes'

// Mesuré sur quatre cents séances simulées, à toutes les tailles de table :
// longueur moyenne 4,0 à 4,8 mots, ZÉRO pour cent de vers de dix mots ou plus,
// jusqu'à huit vers de suite de la même longueur. Le vers long n'existait pas,
// et personne ne s'en apercevait parce que personne ne le comptait.

describe('la mesure du souffle', () => {
  it('compte les mots du vers, pas la ponctuation', () => {
    expect(motsDuVers('le carreau froid')).toBe(3)
    expect(motsDuVers('presque, ce bain, la plume')).toBe(5)
    expect(motsDuVers('  verglas   recoupe ')).toBe(2)
    expect(motsDuVers('')).toBe(0)
  })

  it('range les trois souffles', () => {
    expect(classeDeLongueur(1)).toBe('COURT')
    expect(classeDeLongueur(3)).toBe('COURT')
    expect(classeDeLongueur(4)).toBe('MOYEN')
    expect(classeDeLongueur(7)).toBe('MOYEN')
    expect(classeDeLongueur(8)).toBe('LONG')
    expect(classeDeLongueur(14)).toBe('LONG')
  })

  it('estime un gabarit avant de le faire écrire', () => {
    expect(longueurEstimee([{ type: 'nom' }])).toBe(1)
    expect(longueurEstimee([{ type: 'groupe-nominal' }, { type: 'verbe' }])).toBe(3)
    // Le mot d'attelage compte : « au travers un trésor » fait quatre mots.
    expect(longueurEstimee([{ type: 'groupe-nominal', avant: 'au travers' }])).toBe(4)
    expect(longueurEstimee([{ type: 'libre', mots: 9 }])).toBe(9)
  })

  it("retrouve le souffle plat de l'atelier mesuré", () => {
    const poeme = [
      'Il est grand le silence des saisons', 'verglas recoupe',
      "tandis que l'arbre bleu infiltre du surjeu", "du suint macéré pèse sur l'encre",
      'presque, ce bain, la plume, le poussier lacunaire',
      'par renvoi interposé, la dette affleure le vide',
      'rogner, rester, inventorier, dissoudre, dénombrer',
      'ailleurs, ce colophon rabougri recense', 'ce dos sature chaque tasse à faux',
      'respire, dérégler, discordancer, psalmodier', 'mâcher, étarquer',
      'or toute bruine calme cède du terrain',
      'un athanor, du pendage, un sillon, un volcan',
      'certifier, fondre, tasser, muer', 'ma mue operculée',
      'un vin délicieux bridé résorbe cette poussière',
      'un cahier froid, son suintement, la loupe', 'Au travers un trésor',
    ]
    const d = diagnosticMetrique(poeme)
    expect(d.total).toBe(18)
    // Le plafond est le fait notable : sur dix-huit vers, pas un ne dépasse
    // huit mots. Le poème entier tient dans une seule respiration.
    expect(d.plusLong).toBe(8)
    expect(poeme.filter(v => motsDuVers(v) >= 9)).toHaveLength(0)
    expect(d.moyenne).toBeLessThan(6)
  })
})

describe('GardeMetrique', () => {
  it('interdit trois vers moyens de suite', () => {
    const g = new GardeMetrique()
    g.enregistrer('MOYEN'); g.enregistrer('MOYEN'); g.enregistrer('MOYEN')
    expect(g.permises().has('MOYEN')).toBe(false)
  })

  it('interdit trois vers courts de suite', () => {
    const g = new GardeMetrique()
    g.enregistrer('COURT'); g.enregistrer('COURT')
    expect(g.permises().has('COURT')).toBe(false)
  })

  it('réclame un vers long au bout de quatre à huit vers sans', () => {
    for (const graine of [1, 2, 3, 5, 8]) {
      let x = graine
      const rng = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296 }
      const g = new GardeMetrique({ rng })
      let i = 0
      while (!g.exigeLong() && i < 30) { g.enregistrer('MOYEN'); i++ }
      expect(i).toBeGreaterThanOrEqual(4)
      expect(i).toBeLessThanOrEqual(8)
    }
  })

  it('ne réclame le long que là où le vers a de quoi le rendre', () => {
    // Deux mains ne font pas huit mots, même en cases larges. La garde le
    // réclamait quand même : elle refusait alors tous les gabarits, le tirage
    // rendait n'importe quoi, et la protection des séries tombait avec.
    expect(GardeMetrique.peutEtreLong(1)).toBe(true)   // la voix écrit le vers entier
    expect(GardeMetrique.peutEtreLong(2)).toBe(false)
    expect(GardeMetrique.peutEtreLong(3)).toBe(true)
    const g = new GardeMetrique()
    for (let i = 0; i < 12; i++) g.enregistrer('MOYEN')
    expect(g.permises(true).has('LONG')).toBe(true)
    expect(g.permises(false).has('LONG')).toBe(false)
    expect(g.permises(false).size).toBeGreaterThan(0)
  })

  it('remet son compteur à zéro dès qu\'un vers long est passé', () => {
    const g = new GardeMetrique()
    for (let i = 0; i < 12; i++) g.enregistrer('MOYEN')
    expect(g.exigeLong()).toBe(true)
    g.enregistrer('LONG')
    expect(g.exigeLong()).toBe(false)
  })

  it('ne ferme jamais toutes les portes', () => {
    const g = new GardeMetrique()
    for (const c of CLASSES) for (let i = 0; i < 5; i++) g.enregistrer(c)
    expect(g.permises().size).toBeGreaterThanOrEqual(1)
  })
})

describe('le souffle du poème, de bout en bout', () => {
  const seance = (table: number, totalVers = 30) => {
    const gf = new GardeFormes(totalVers), gm = new GardeMetrique()
    const longueurs: number[] = []
    for (let i = 0; i < totalVers; i++) {
      const n = 1 + Math.floor(Math.random() * 4)
      const g = tirerGabarit(n, true, true, false, table, gf.permises(),
        gm.permises(GardeMetrique.peutEtreLong(n)))
      gf.enregistrer(familleDuVers(g.map(x => x.role)))
      const l = longueurEstimee(g)
      gm.enregistrer(classeDeLongueur(l))
      longueurs.push(l)
    }
    return longueurs
  }

  it('fait exister le vers long, que la mesure donnait à zéro pour cent', () => {
    for (const table of [12, 24, 46]) {
      let long = 0, n = 0
      for (let s = 0; s < 40; s++) {
        const l = seance(table)
        long += l.filter(x => x >= 8).length; n += l.length
      }
      expect(long / n, `table=${table}`).toBeGreaterThan(0.05)
    }
  })

  it('donne au moins un vers long à presque tous les poèmes un peu longs', () => {
    let avec = 0
    for (let s = 0; s < 60; s++) if (seance(24, 30).some(l => l >= 8)) avec++
    expect(avec / 60).toBeGreaterThan(0.85)
  })

  it('ne laisse pas filer une longue série de vers de même souffle', () => {
    for (const table of [4, 24, 46]) {
      for (let s = 0; s < 40; s++) {
        const d = diagnosticMetrique(seance(table).map(l => 'x '.repeat(l).trim()))
        // Mesuré sur huit cents séances de trente vers, table de quarante-six :
        // série de 3 dans 74 % des poèmes, 4 dans 20 %, 5 dans 3 %, 6 dans un
        // poème sur deux cents. Le plancher honnête est donc six — l'écrire à
        // cinq rendait le test capricieux une fois sur cinq.
        expect(d.plusLongueSerie, `table=${table}`).toBeLessThanOrEqual(6)
      }
    }
  })

  it('garde le vers court, qui est le contraste du long', () => {
    for (const table of [4, 24, 46]) {
      const l = seance(table, 60)
      expect(l.filter(x => x <= 3).length / l.length, `table=${table}`).toBeGreaterThan(0.10)
    }
  })
})
