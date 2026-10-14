import { describe, it, expect } from 'vitest'
import { signalDeTour, destinationDuCode, estExclu, partieDuSalon } from '../lib/salonEnLigne'

describe('le signal du tour', () => {
  it('sonne quand la main revient, et seulement alors', () => {
    expect(signalDeTour(false, true)).toBe(true)
    expect(signalDeTour(true, true)).toBe(false)
    expect(signalDeTour(true, false)).toBe(false)
    expect(signalDeTour(false, false)).toBe(false)
  })

  it('ne sonne jamais à la première lecture : l’écran le dit déjà', () => {
    expect(signalDeTour(null, true)).toBe(false)
  })

  it('rejoue une partie : il sonnait à chaque fragment des autres, et se taisait quand c’était son tour', () => {
    // Trois mains, je suis la deuxième. Les tours successifs vus de mon écran :
    const monTour = [false, true, false, false, true, false, false, true]
    let avant: boolean | null = null
    const sonneries: number[] = []
    monTour.forEach((t, i) => { if (signalDeTour(avant, t)) sonneries.push(i); avant = t })
    expect(sonneries).toEqual([1, 4, 7])
  })
})

describe('revenir par le code', () => {
  it('une table qui attend s’ouvre à tous', () => {
    expect(destinationDuCode('LOUP-42', 'waiting', false)).toEqual({ chemin: '/salon/LOUP-42' })
  })
  it('une main de la partie y revient, même commencée ou finie', () => {
    expect(destinationDuCode('LOUP-42', 'playing', true)).toEqual({ chemin: '/jeu-online/LOUP-42' })
    expect(destinationDuCode('LOUP-42', 'finished', true)).toEqual({ chemin: '/fin-online/LOUP-42' })
  })
  it('un inconnu ne s’invite pas dans une partie en cours', () => {
    expect(destinationDuCode('LOUP-42', 'playing', false)).toEqual({ refus: 'commence' })
    expect(destinationDuCode('LOUP-42', 'finished', false)).toEqual({ refus: 'termine' })
  })
  it('une main retirée par l’hôte ne revient pas, même si la table attend', () => {
    expect(destinationDuCode('LOUP-42', 'waiting', false, true)).toEqual({ refus: 'exclu' })
  })
})

describe('l’exclusion', () => {
  it('se lit dans la liste du salon, et une liste absente ne retire personne', () => {
    expect(estExclu({ exclus: ['a', 'b'] }, 'b')).toBe(true)
    expect(estExclu({ exclus: ['a'] }, 'b')).toBe(false)
    expect(estExclu({}, 'b')).toBe(false)
    expect(estExclu({ exclus: null }, 'b')).toBe(false)
    expect(estExclu({ exclus: ['a'] }, null)).toBe(false)
  })
})

describe('la partie avec les voix, au salon', () => {
  function stockage() {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } }
  }
  it('un seul reçu par salon : on ne paie pas deux fois la même table', () => {
    const s = stockage(); let n = 0
    const nouveau = () => `partie-${++n}-abcdefgh`
    const a = partieDuSalon('LOUP-42', s, nouveau)
    expect(partieDuSalon('LOUP-42', s, nouveau)).toBe(a)
    expect(partieDuSalon('OURS-11', s, nouveau)).not.toBe(a)
  })
  it('un reçu illisible est remplacé ; sans stockage, un reçu par appel', () => {
    const s = stockage(); s.setItem('partie-salon-LOUP-42', 'x')
    expect(partieDuSalon('LOUP-42', s, () => 'nouveau-recu-1')).toBe('nouveau-recu-1')
    expect(partieDuSalon('LOUP-42', null, () => 'nouveau-recu-2')).toBe('nouveau-recu-2')
  })
})
