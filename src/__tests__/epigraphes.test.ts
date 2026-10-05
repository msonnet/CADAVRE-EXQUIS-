import { describe, it, expect } from 'vitest'
import { VOIX } from '../../api/_voices'
import { VOICE_IDS } from '../data/voiceIds'
import { EPIGRAPHES } from '../data/epigraphes'

/**
 * Les épigraphes du registre des voix.
 *
 * Elles disent d'où parle une voix — un métier, un lieu, un objet — et
 * jamais ce qui la tient. L'enjeu est le non-dit de la voix : le prompt lui
 * demande de ne pas en parler, et le registre ne doit pas le faire à sa
 * place. On le vérifie mot à mot, faute de pouvoir le vérifier au sens.
 */

/** Les mots pleins d'une phrase, ramenés à une racine grossière. */
function motsPleins(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z]+/)
      .filter(m => m.length >= 5)
      .map(m => m.replace(/(es|e|s|x)$/, '')),
  )
}

describe('épigraphes', () => {
  it('chaque voix du registre a la sienne, dans les deux langues', () => {
    expect(Object.keys(EPIGRAPHES).sort()).toEqual([...VOICE_IDS].sort())
    for (const id of VOICE_IDS) {
      expect(EPIGRAPHES[id].fr.trim(), id).not.toBe('')
      expect(EPIGRAPHES[id].en.trim(), id).not.toBe('')
    }
  })

  it('une ligne sobre : courte, sans exclamation ni emoji', () => {
    for (const id of VOICE_IDS) {
      for (const t of [EPIGRAPHES[id].fr, EPIGRAPHES[id].en]) {
        expect(t.length, `${id} : ${t}`).toBeLessThanOrEqual(80)
        expect(t, id).not.toMatch(/!/)
        expect(t, id).not.toMatch(/\p{Extended_Pictographic}/u)
        expect(t, id).toMatch(/\.$/)
      }
    }
  })

  it("ne répète jamais l'enjeu de sa voix", () => {
    const fautives: string[] = []
    for (const v of VOIX) {
      const epi = EPIGRAPHES[v.id]
      if (!epi) continue
      const enjeu = motsPleins(v.enjeu)
      const communs = [...motsPleins(epi.fr)].filter(m => enjeu.has(m))
      if (communs.length) fautives.push(`${v.id} : ${communs.join(', ')}`)
    }
    expect(fautives).toEqual([])
  })

  it('les ids du client sont ceux du serveur', () => {
    expect(VOIX.map(v => v.id).sort()).toEqual([...VOICE_IDS].sort())
  })
})
