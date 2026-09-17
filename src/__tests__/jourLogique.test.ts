import { describe, it, expect } from 'vitest'
import {
  prochainSiege, siegesAAffranchir, estScelle, mainsHumaines,
  fragmentRecevable, ATTENTE_VOIX_MS, MAX_FRAGMENT,
  type PoemeEnCours,
} from '../lib/jourLogique'

/**
 * Le cadavre du jour à plusieurs mains.
 *
 * Toutes les règles du rendez-vous vivent dans ce module, et c'est délibéré :
 * dispersées dans des requêtes SQL, elles seraient invérifiables. Ici on peut
 * simuler une journée entière — un joueur seul, puis vingt — et compter ce
 * qui en sort.
 */

function poeme(id: string, ouvert: number, mains: (string | null)[], voix: boolean[] = []): PoemeEnCours {
  return {
    id, ouvert,
    sieges: mains.map((m, i) => ({ rang: i + 1, main: m, voix: voix[i] ?? false })),
  }
}

describe('à qui tendre un siège', () => {
  it('ne rend jamais deux sièges du même poème à la même main', () => {
    // C'est la règle qui protège le jeu : deux cases d'une même phrase et la
    // main cesse d'être aveugle — elle verrait la moitié du poème et pourrait
    // le diriger.
    const p = [poeme('a', 0, ['nadja', null, null, null])]
    expect(prochainSiege(p, 'nadja', 4).quoi).toBe('ouvrir')
    expect(prochainSiege(p, 'desnos', 4)).toEqual({ quoi: 'siege', poeme: 'a', rang: 2 })
  })

  it('finit ce qui est commencé avant d’entamer autre chose', () => {
    // Éparpiller les mains sur dix poèmes à moitié vides revient, avec peu de
    // joueurs, à tout faire sceller par des voix.
    const p = [
      poeme('jeune', 100, [null, null, null, null]),
      poeme('avance', 200, ['a', 'b', 'c', null]),
      poeme('milieu', 150, ['a', null, null, null]),
    ]
    expect(prochainSiege(p, 'neuf', 4)).toEqual({ quoi: 'siege', poeme: 'avance', rang: 4 })
  })

  it('à égalité, sert le plus ancien', () => {
    const p = [
      poeme('recent', 500, ['a', null, null, null]),
      poeme('vieux', 100, ['b', null, null, null]),
    ]
    expect(prochainSiege(p, 'neuf', 4)).toEqual({ quoi: 'siege', poeme: 'vieux', rang: 2 })
  })

  it('ouvre un poème quand tous les autres portent déjà cette main', () => {
    const p = [
      poeme('a', 0, ['nadja', null, null, null]),
      poeme('b', 1, ['nadja', 'x', null, null]),
    ]
    expect(prochainSiege(p, 'nadja', 4)).toEqual({ quoi: 'ouvrir' })
  })

  it('n’ouvre rien quand il n’y aurait rien à ouvrir', () => {
    expect(prochainSiege([], 'nadja', 1)).toEqual({ quoi: 'rien' })
  })

  it('ignore les poèmes déjà scellés', () => {
    const p = [poeme('scelle', 0, ['a', 'b', 'c', 'd'])]
    expect(prochainSiege(p, 'neuf', 4)).toEqual({ quoi: 'ouvrir' })
  })
})

describe('les voix prennent les sièges que personne n’a pris', () => {
  it('laisse le temps à une vraie main avant de combler', () => {
    const p = [poeme('a', 1_000, ['x', null, null, null])]
    expect(siegesAAffranchir(p, 1_000 + ATTENTE_VOIX_MS - 1)).toEqual([])
    expect(siegesAAffranchir(p, 1_000 + ATTENTE_VOIX_MS)).toEqual([{ poeme: 'a', rang: 2 }])
  })

  it('ne comble qu’UN siège à la fois', () => {
    // Combler d'un coup scellerait le poème en une fois et chasserait les
    // humains de leur propre rendez-vous. Un poème à moitié écrit garde sa
    // chance de recevoir une vraie main au passage suivant.
    const p = [poeme('a', 0, ['x', null, null, null])]
    const dus = siegesAAffranchir(p, ATTENTE_VOIX_MS * 10)
    expect(dus).toHaveLength(1)
    expect(dus[0].rang).toBe(2)
  })

  it('ne touche pas à ce qui est scellé', () => {
    const p = [poeme('a', 0, ['x', 'y', 'z', 'w'])]
    expect(siegesAAffranchir(p, ATTENTE_VOIX_MS * 10)).toEqual([])
  })
})

describe('une journée simulée — c’est la mesure qui compte', () => {
  /** Fait tourner une journée : `mains` joueurs, un fragment chacun. */
  function journee(nbMains: number, nbCases = 4) {
    let poemes: PoemeEnCours[] = []
    let t = 0
    let n = 0
    const ouvrir = (main: string) => {
      const p = poeme(`p${++n}`, t, Array.from({ length: nbCases }, () => null))
      p.sieges[0].main = main
      poemes.push(p)
    }

    for (let i = 0; i < nbMains; i++) {
      t += 60_000   // une main par minute
      // Vieillissement paresseux, comme le fera le serveur.
      for (const d of siegesAAffranchir(poemes, t)) {
        const p = poemes.find(x => x.id === d.poeme)!
        const s = p.sieges.find(x => x.rang === d.rang)!
        s.main = 'voix'; s.voix = true
      }
      const main = `main${i}`
      const v = prochainSiege(poemes, main, nbCases)
      if (v.quoi === 'ouvrir') ouvrir(main)
      else if (v.quoi === 'siege') {
        const p = poemes.find(x => x.id === v.poeme)!
        p.sieges.find(x => x.rang === v.rang)!.main = main
      }
    }
    // Fin de journée : tout finit par se sceller.
    t += ATTENTE_VOIX_MS * nbCases
    for (let tour = 0; tour < nbCases; tour++) {
      for (const d of siegesAAffranchir(poemes, t)) {
        const p = poemes.find(x => x.id === d.poeme)!
        const s = p.sieges.find(x => x.rang === d.rang)!
        s.main = 'voix'; s.voix = true
      }
    }
    return poemes
  }

  it('un joueur seul obtient quand même un poème entier', () => {
    // C'est la limite que le modèle doit absorber : aujourd'hui, il n'y a
    // presque personne. Une main, trois voix, un poème scellé — la forme de
    // l'expérience est celle d'un jour peuplé.
    const p = journee(1)
    expect(p).toHaveLength(1)
    expect(estScelle(p[0]), 'le poème se scelle sans attendre personne').toBe(true)
    expect(mainsHumaines(p[0])).toBe(1)
  })

  it('tout se scelle, quel que soit le nombre de mains', () => {
    for (const n of [1, 2, 3, 6, 20, 60]) {
      const p = journee(n)
      expect(p.every(estScelle), `${n} mains`).toBe(true)
    }
  })

  it('plus il y a de mains, plus les poèmes sont humains', () => {
    const part = (n: number) => {
      const p = journee(n)
      const total = p.reduce((s, x) => s + x.sieges.length, 0)
      return p.reduce((s, x) => s + mainsHumaines(x), 0) / total
    }
    // Un joueur seul : un quart des cases. Vingt : la grande majorité.
    expect(part(1)).toBeCloseTo(0.25, 2)
    expect(part(20), 'vingt mains remplissent l’essentiel').toBeGreaterThan(0.7)
    expect(part(60)).toBeGreaterThan(part(6))
  })

  it('n’ouvre jamais plus de poèmes qu’il n’y a de mains', () => {
    // Un poème créé sans main dedans serait un stock fantôme, scellé par des
    // voix et payé pour personne.
    for (const n of [1, 3, 20, 60]) {
      expect(journee(n).length, `${n} mains`).toBeLessThanOrEqual(n)
    }
  })

  it('ne met jamais deux fois la même main dans un poème', () => {
    for (const n of [2, 6, 20, 60]) {
      for (const p of journee(n)) {
        const humaines = p.sieges.filter(s => !s.voix).map(s => s.main)
        expect(new Set(humaines).size, `${n} mains, poème ${p.id}`).toBe(humaines.length)
      }
    }
  })
})

describe('ce qu’on accepte comme fragment', () => {
  it('refuse le vide et le débordement', () => {
    expect(fragmentRecevable('')).toBe(false)
    expect(fragmentRecevable('   ')).toBe(false)
    expect(fragmentRecevable('x'.repeat(MAX_FRAGMENT + 1))).toBe(false)
  })

  it('refuse un vers entier là où l’on attend une case', () => {
    // Écrire une phrase dans la case « un adjectif », c'est écrire le poème
    // des autres à leur place.
    expect(fragmentRecevable('exquis\nnocturne')).toBe(false)
  })

  it('accepte une case', () => {
    expect(fragmentRecevable('exquis')).toBe(true)
    expect(fragmentRecevable('  la lampe sourde  ')).toBe(true)
  })
})
