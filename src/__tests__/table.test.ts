import { describe, it, expect } from 'vitest'
import {
  nomsDesMains, nomDeMain, lireTable, mainsNommees, corpsDuNom, nettoyerNom, NOM_MAX,
  type Siege,
} from '../lib/table'
import { buildSequence } from '../lib/sequence'

/**
 * La table locale — plusieurs mains autour d'un seul téléphone.
 *
 * Relevé avant : « Passe le téléphone à Joueur 2 », des coutures signées
 * « joueur 1 », et des préparatifs revenus à « 1 main, 1 voix » après chaque
 * partie à plusieurs.
 */

const sieges = (...s: Siege[]): Siege[] => [...s, ...Array(6 - s.length).fill('vide')] as Siege[]

describe('nomsDesMains', () => {
  it('suit l’ordre où les mains jouent, sièges vides et voix sautés', () => {
    // Nadja au siège 0, une voix au 1, rien au 2, Léa au 3.
    const t = sieges('humain', 'ia', 'vide', 'humain')
    const noms = ['Nadja', 'oublié', '', 'Léa', '', '']
    expect(nomsDesMains(t, noms)).toEqual(['Nadja', 'Léa'])
    // … et c'est bien l'ordre de buildSequence : main 1 puis main 2.
    const seq = buildSequence(2, 1, 'humain').filter(p => p.type === 'humain')
    expect(seq.map(p => (p as { num: number }).num)).toEqual([1, 2])
  })

  it('une main sans prénom garde une place vide, donc son numéro', () => {
    expect(nomsDesMains(sieges('humain', 'humain', 'humain'), ['', '  ', 'Tom'])).toEqual(['', '', 'Tom'])
    expect(nomDeMain(['', '', 'Tom'], 2)).toBeUndefined()
    expect(nomDeMain(['', '', 'Tom'], 3)).toBe('Tom')
    expect(nomDeMain(undefined, 1)).toBeUndefined()
  })
})

describe('nettoyerNom', () => {
  it('ôte les blancs et borne la longueur', () => {
    expect(nettoyerNom('  Marie   Christine ')).toBe('Marie Christine')
    expect(nettoyerNom('x'.repeat(40))).toHaveLength(NOM_MAX)
  })
})

describe('lireTable', () => {
  const bonne = { sieges: sieges('humain', 'humain', 'ia'), noms: ['Nadja', 'Léa', '', '', '', ''], structureId: 'phrase-simple' }

  it('retrouve la dernière table', () => {
    const t = lireTable(JSON.stringify(bonne))
    expect(t?.sieges.filter(s => s === 'humain')).toHaveLength(2)
    expect(t?.noms.slice(0, 2)).toEqual(['Nadja', 'Léa'])
    expect(t?.structureId).toBe('phrase-simple')
  })

  it('refuse ce qui rendrait des préparatifs impossibles', () => {
    expect(lireTable(null)).toBeNull()
    expect(lireTable('{pas du json')).toBeNull()
    expect(lireTable(JSON.stringify({ ...bonne, sieges: ['humain'] }))).toBeNull()
    expect(lireTable(JSON.stringify({ ...bonne, sieges: sieges('ia', 'ia') }))).toBeNull()
    expect(lireTable(JSON.stringify({ ...bonne, sieges: sieges('humain', 'chaise' as Siege) }))).toBeNull()
  })

  it('complète des noms manquants plutôt que de tout jeter', () => {
    const t = lireTable(JSON.stringify({ sieges: bonne.sieges }))
    expect(t?.noms).toEqual(['', '', '', '', '', ''])
  })
})

describe('mainsNommees', () => {
  it('nomme chaque main une fois, dans l’ordre d’entrée', () => {
    expect(mainsNommees([{ pseudo: 'Nadja' }, {}, { pseudo: 'Léa' }, { pseudo: 'Nadja' }])).toEqual(['Nadja', 'Léa'])
    expect(mainsNommees([{}, { pseudo: '' }])).toEqual([])
  })
})

describe('corpsDuNom', () => {
  it('garde le grand corps pour un nom court, et réduit un long', () => {
    expect(corpsDuNom('Léa')).toBe('clamp(2rem, 18vw, 7rem)')
    // Dix lettres à 15vw : à 320 points, 48 px — la ligne tient.
    expect(corpsDuNom('Christophe')).toBe('clamp(2rem, 15vw, 7rem)')
  })
})
