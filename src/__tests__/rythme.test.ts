import { describe, it, expect } from 'vitest'
import {
  partitionDuPoeme, plierEnPanneaux, DUREE_DEPLI, PANNEAUX_MAX, VERS_ANIMES,
} from '../lib/rythme'

/**
 * La partition du dévoilement.
 *
 * Le chiffre qui a motivé le chantier : l'ancien dévoilement posait le dernier
 * vers d'un poème d'atelier de trente-sept vers à 20,1 s (`0.3 + i * 0.55`).
 * Ces tests tiennent les deux promesses qui l'ont remplacé — le budget, et le
 * fait que le souffle du vers décide de son temps.
 */

const poeme = (n: number, mots = 5) =>
  Array.from({ length: n }, () => Array.from({ length: mots }, () => 'mot').join(' '))

describe('plierEnPanneaux', () => {
  it('donne un volet par vers quand le poème est court — le pliage d’origine', () => {
    expect(plierEnPanneaux(3)).toEqual([[0], [1], [2]])
  })

  it('ne dépasse jamais le plafond de volets', () => {
    for (const n of [1, 2, 5, 7, 24, 37, 120]) {
      expect(plierEnPanneaux(n).length).toBeLessThanOrEqual(PANNEAUX_MAX)
    }
  })

  it('n’oublie ni ne double aucun vers, à toutes les tailles', () => {
    for (let n = 1; n <= 60; n++) {
      const plats = plierEnPanneaux(n).flat()
      expect(plats).toEqual(Array.from({ length: n }, (_, i) => i))
    }
  })

  it('répartit au plus près : deux volets ne diffèrent jamais de plus d’un vers', () => {
    for (const n of [7, 13, 37, 41]) {
      const tailles = plierEnPanneaux(n).map(g => g.length)
      expect(Math.max(...tailles) - Math.min(...tailles)).toBeLessThanOrEqual(1)
    }
  })

  it('rend une liste vide pour un poème vide', () => {
    expect(plierEnPanneaux(0)).toEqual([])
    expect(partitionDuPoeme([])).toEqual({ panneaux: [], vers: [], fin: 0, facteur: 1 })
  })
})

describe('partitionDuPoeme — la durée, et la lisibilité qui la commande', () => {
  it('tient sous douze secondes à toutes les longueurs', () => {
    // Le poème d'atelier à trente-sept vers mettait 20,1 s avec l'ancien
    // dévoilement. Il n'y a plus de longueur qui fasse déborder la séquence :
    // au-delà de la tête, le reste part dans un volet déjà écrit.
    for (const n of [1, 3, 5, 9, 12, 24, 37, 50, 120]) {
      expect(partitionDuPoeme(poeme(n)).fin, `n=${n}`).toBeLessThan(12_000)
    }
  })

  it('n’écrit jamais un mot plus vite que l’œil ne le suit', () => {
    // Le reproche fait à la première version : à 25 ms par mot ce n'est plus
    // une écriture, c'est un clignotement. Le plancher est absolu, donc il
    // tient quelle que soit la longueur du poème.
    for (const n of [3, 9, 24, 37, 120]) {
      for (const v of partitionDuPoeme(poeme(n)).vers) {
        if (v.duree === 0) continue   // le volet de queue est déjà écrit
        expect(v.duree / v.mots, `n=${n}`).toBeGreaterThan(55)
      }
    }
  })

  it('anime la tête et pose le reste d’un coup', () => {
    const p = partitionDuPoeme(poeme(37))
    const animes = p.vers.filter(v => v.duree > 0).length
    expect(animes).toBe(VERS_ANIMES)
    // Les vers de la queue partagent tous l'instant d'ouverture de leur volet.
    const queue = p.vers.slice(VERS_ANIMES)
    expect(new Set(queue.map(v => v.debut)).size).toBe(1)
  })

  it('anime tout le poème quand il tient dans la tête', () => {
    const p = partitionDuPoeme(poeme(6))
    expect(p.vers.every(v => v.duree > 0)).toBe(true)
    expect(p.facteur).toBe(1)
  })

  it('avance toujours : aucun vers animé ne commence avant le précédent', () => {
    const p = partitionDuPoeme(poeme(37))
    for (let i = 1; i < VERS_ANIMES; i++) {
      expect(p.vers[i].debut).toBeGreaterThan(p.vers[i - 1].debut)
    }
  })
})

describe('partitionDuPoeme — le souffle décide du temps', () => {
  it('un vers long met plus de temps à s’écrire qu’un vers court', () => {
    const p = partitionDuPoeme(['seul', 'un vers de dix mots qui prend tout son temps ici'])
    expect(p.vers[1].duree).toBeGreaterThan(p.vers[0].duree * 2)
    expect(p.vers[0].classe).toBe('COURT')
    expect(p.vers[1].classe).toBe('LONG')
  })

  it('le silence qui suit un vers court est le plus long des trois', () => {
    // La pause ne s'expose pas : elle se lit dans l'écart au vers suivant.
    const court = partitionDuPoeme(['seul', 'x'])
    const moyen = partitionDuPoeme(['un vers de cinq mots ici', 'x'])
    const ecart = (p: ReturnType<typeof partitionDuPoeme>) =>
      p.vers[1].debut - (p.vers[0].debut + p.vers[0].duree)
    expect(ecart(court)).toBeGreaterThan(ecart(moyen))
  })

  it('une ligne vide ne prend aucune encre mais laisse respirer', () => {
    const p = partitionDuPoeme(['un vers', '', 'un autre'])
    expect(p.vers[1].duree).toBe(0)
    expect(p.vers[2].debut).toBeGreaterThan(p.vers[1].debut)
  })
})

describe('partitionDuPoeme — l’enchaînement des volets', () => {
  it('chaque volet est ouvert avant que son premier mot ne paraisse', () => {
    for (const n of [3, 12, 37]) {
      const p = partitionDuPoeme(poeme(n))
      for (const panneau of p.panneaux) {
        const premier = p.vers[panneau.lignes[0]]
        expect(premier.debut).toBeGreaterThanOrEqual(panneau.ouverture)
        // Et il s'ouvre encore un peu pendant que l'encre arrive : sans ce
        // recouvrement, la séquence se lit comme deux gestes séparés.
        expect(premier.debut).toBeLessThan(panneau.ouverture + DUREE_DEPLI)
      }
    }
  })

  it('les volets s’ouvrent dans l’ordre et jamais en même temps', () => {
    const p = partitionDuPoeme(poeme(37))
    for (let i = 1; i < p.panneaux.length; i++) {
      expect(p.panneaux[i].ouverture).toBeGreaterThan(p.panneaux[i - 1].ouverture)
    }
  })

  it('le premier volet s’ouvre au lever du rideau', () => {
    expect(partitionDuPoeme(poeme(9)).panneaux[0].ouverture).toBe(0)
  })
})
