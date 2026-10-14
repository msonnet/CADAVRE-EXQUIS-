import { describe, it, expect } from 'vitest'
import { buildSequence } from '../lib/sequence'
import { CONFIG_DECOUVERTE } from '../lib/decouverte'
import { getStructure } from '../structures'

/**
 * La Découverte : le joueur écrit deux fragments, le premier et le dernier ;
 * une voix écrit celui du milieu.
 *
 * Du 30 septembre au 14 octobre, deux voix suivaient le joueur : il écrivait
 * un fragment sur trois et regardait la machine finir son poème.
 */
function mains(config: typeof CONFIG_DECOUVERTE) {
  const seq = buildSequence(config.joueursHumains, config.voixIA, config.premierJoueur)
  const n = getStructure(config.structureId).cases.length
  return Array.from({ length: n }, (_, i) => seq[i % seq.length].type)
}

describe('la partie Découverte', () => {
  it('le joueur ouvre et ferme, la voix écrit au milieu', () => {
    expect(mains(CONFIG_DECOUVERTE)).toEqual(['humain', 'ia', 'humain'])
  })

  it('la machine n’écrit jamais plus que le joueur', () => {
    const m = mains(CONFIG_DECOUVERTE)
    expect(m.filter(t => t === 'ia').length).toBeLessThan(m.filter(t => t === 'humain').length)
  })

  it('reste la plus courte des parties', () => {
    expect(getStructure(CONFIG_DECOUVERTE.structureId).cases.length).toBe(3)
  })
})
