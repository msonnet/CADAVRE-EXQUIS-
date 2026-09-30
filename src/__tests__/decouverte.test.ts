import { describe, it, expect } from 'vitest'
import { buildSequence } from '../lib/sequence'
import { CONFIG_DECOUVERTE } from '../lib/decouverte'
import { getStructure } from '../structures'

/**
 * La Découverte montre ce que les voix font.
 *
 * Avant : une seule voix sur trois cases, donc joueur · voix · joueur. Le
 * joueur écrivait deux fragments, la voix un mot, et la première révélation
 * montrait surtout ce qu'on venait d'écrire soi-même.
 */
function mains(config: typeof CONFIG_DECOUVERTE) {
  const seq = buildSequence(config.joueursHumains, config.voixIA, config.premierJoueur)
  const n = getStructure(config.structureId).cases.length
  return Array.from({ length: n }, (_, i) => seq[i % seq.length].type)
}

describe('la partie Découverte', () => {
  it('le joueur ouvre, les voix écrivent la suite', () => {
    expect(mains(CONFIG_DECOUVERTE)).toEqual(['humain', 'ia', 'ia'])
  })

  it('l\'ancienne configuration donnait deux cases sur trois au joueur', () => {
    expect(mains({ ...CONFIG_DECOUVERTE, voixIA: 1 })).toEqual(['humain', 'ia', 'humain'])
  })

  it('reste la plus courte des parties', () => {
    expect(getStructure(CONFIG_DECOUVERTE.structureId).cases.length).toBe(3)
  })
})
