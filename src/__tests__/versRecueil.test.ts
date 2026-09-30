import { describe, it, expect, vi } from 'vitest'

vi.mock('../i18n', () => ({ tr: (fr: string) => fr, langueActuelle: () => 'fr' }))

import { poemeDuSalon, poemeDuJour, mainsDuPoeme, idSalon, idJour } from '../lib/versRecueil'
import { attribution, libelleMains } from '../lib/attribution'
import { reconstruirePoeme, getStructure } from '../structures'
import { composerSauvegarde, lireSauvegarde } from '../lib/recueil'

/**
 * Le poème écrit en salon et le poème du jour entrent au recueil.
 *
 * Avant : aucun des deux n'appelait `sauvegarderPoeme`. Le salon s'efface
 * chaque nuit, le poème du jour ne se relit que la veille — les deux poèmes
 * écrits avec de vraies autres mains étaient les seuls qu'on perdait.
 */

const PSEUDOS = new Map([['a', 'Nadja'], ['b', 'Soupault']])

describe('le poème du salon', () => {
  const p = poemeDuSalon({
    code: 'KX7Q', structureId: 'phrase-simple', moi: 'b', pseudos: PSEUDOS,
    contributions: [
      { case_index: 2, texte: 'le vin nouveau', player_id: 'a' },
      { case_index: 0, texte: 'la cire', player_id: 'a' },
      { case_index: 1, texte: 'boira', player_id: 'b' },
    ],
  })

  it('garde l\'ordre des cases, et se relit comme en fin de partie', () => {
    expect(p.cases.map(c => c.texte)).toEqual(['la cire', 'boira', 'le vin nouveau'])
    expect(reconstruirePoeme(p.cases, getStructure('phrase-simple'))).toContain('la cire boira le vin nouveau')
  })

  it('les coutures rendent les noms : le pseudo, et « toi » pour soi', () => {
    expect(p.cases.map(c => attribution(c))).toEqual(['Nadja', 'toi', 'Nadja'])
  })

  it('un identifiant par salon — rouvrir la page ne duplique rien', () => {
    expect(p.id).toBe(idSalon('KX7Q'))
    expect(p.origine).toBe('salon')
  })

  it('compte ses mains', () => {
    expect(libelleMains(mainsDuPoeme(p)!)).toBe('2 MAINS')
  })

  it('une voix garde son nom de persona', () => {
    const v = poemeDuSalon({
      code: 'Z', structureId: 'phrase-simple', moi: 'b', pseudos: PSEUDOS,
      contributions: [{ case_index: 0, texte: 'x', player_id: 'a', voice_name: 'Le greffier' }],
    })
    expect(attribution(v.cases[0], 1)).toBe('voix 1 · Le greffier')
  })
})

describe('le poème du jour', () => {
  const p = poemeDuJour({
    langue: 'fr', jour: '2026-09-22',
    vers: [
      { rang: 2, texte: 'sous la lampe sourde', pseudo: null, voix: false, voixNom: null, aMoi: false },
      { rang: 1, texte: 'la cire se souvient', pseudo: 'Nadja', voix: false, voixNom: null, aMoi: false },
      { rang: 3, texte: 'un baromètre en deuil', pseudo: null, voix: true, voixNom: 'le météorologue', aMoi: false },
      { rang: 4, texte: 'et moi je signe', pseudo: 'Soupault', voix: false, voixNom: null, aMoi: true },
    ],
  })

  it('un vers par case, dans l\'ordre des rangs', () => {
    expect(reconstruirePoeme(p.cases, getStructure(p.structureId)).split('\n')).toEqual([
      'la cire se souvient', 'sous la lampe sourde', 'un baromètre en deuil', 'et moi je signe',
    ])
  })

  it('une main anonyme n\'est pas « toi »', () => {
    // Le repli d'`attribution` disait « toi » à toute main sans numéro.
    expect(p.cases.map(c => attribution(c))).toEqual(['Nadja', 'une main', 'voix · le météorologue', 'toi'])
  })

  it('trois mains, une voix', () => {
    expect(mainsDuPoeme(p)).toBe(3)
  })

  it('un identifiant par langue et par jour', () => {
    expect(p.id).toBe(idJour('fr', '2026-09-22'))
    expect(p.jour).toBe('2026-09-22')
  })

  it('traverse la sauvegarde sans perdre ses noms', () => {
    const lu = lireSauvegarde(composerSauvegarde([p], []))
    expect(lu.ok).toBe(true)
    if (lu.ok) {
      expect(lu.data.poemes[0].origine).toBe('jour')
      expect(lu.data.poemes[0].cases.map(c => attribution(c))).toEqual(['Nadja', 'une main', 'voix · le météorologue', 'toi'])
    }
  })
})

describe('un poème joué sur ce téléphone ne change pas', () => {
  it('ni ses coutures, ni son pied de carte', () => {
    const c = { numero: 1, fonction: '', consigne: '', auteur: 'humain' as const, texte: 'x', ts: 0 }
    expect(attribution(c)).toBe('toi')
    expect(mainsDuPoeme({ cases: [c] })).toBeNull()
  })
})
