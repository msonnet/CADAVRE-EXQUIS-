import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bandesParMain, SE_PLIE_PAR_MAIN } from '../lib/plis'
import { getStructure, reconstruirePoeme } from '../structures'

/**
 * Un pli par main.
 *
 * Avant : une phrase courte ou étoffée se recomposait en UNE ligne, et le
 * dépli n'ouvrait qu'un volet. Le geste du jeu disparaissait pour les deux
 * structures d'entrée.
 */
describe('les bandes du feuillet', () => {
  const fragments = ['la balance rouillée', 'vacille', 'la cendre froide']

  it('une phrase se recomposait en une seule ligne — un seul volet', () => {
    const cases = fragments.map((texte, i) => ({ numero: i + 1, fonction: '', consigne: '', auteur: 'humain' as const, texte, ts: 0 }))
    expect(reconstruirePoeme(cases, getStructure('phrase-simple')).split('\n')).toHaveLength(1)
  })

  it('une bande par main', () => {
    expect(bandesParMain(fragments)).toEqual(fragments)
  })

  it('la correction d\'accord retrouve ses bandes', () => {
    expect(bandesParMain(['il devient givré', 'la rue', 'dort'], 'elle devient givrée la rue dort'))
      .toEqual(['elle devient givrée', 'la rue', 'dort'])
  })

  it('une correction qui change le nombre de mots rend les fragments bruts', () => {
    // Une bande fausse serait pire qu'un accord manquant.
    expect(bandesParMain(['il est grand', 'le silence'], 'il est grand, le silence des jours'))
      .toEqual(['il est grand', 'le silence'])
  })

  it('rien à plier : null, et l\'appelant garde ses lignes', () => {
    expect(bandesParMain(['  ', ''])).toBeNull()
  })

  it('seules les phrases se plient par main — un vers est déjà une main', () => {
    expect([...SE_PLIE_PAR_MAIN].sort()).toEqual(['phrase-etoffee', 'phrase-simple'])
  })

  it('les deux fins de partie écrites plient ainsi', () => {
    for (const f of ['pages/FinDePartie.tsx', 'pages/FinOnline.tsx']) {
      expect(readFileSync(join(__dirname, '..', f), 'utf8'), f).toMatch(/bandesParMain\(/)
    }
  })
})

describe('la lettrine', () => {
  it('est une capitale — un « l » bas-de-casse se lisait comme un trait', () => {
    const src = readFileSync(join(__dirname, '../components/PoemeDevoile.tsx'), 'utf8')
    expect(src).toMatch(/charAt\(0\)\.toLocaleUpperCase\(\)/)
  })
})
