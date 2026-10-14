import { describe, it, expect, afterEach, vi } from 'vitest'
import { VOIX } from '../../api/_voices.js'
import { NOMS_VOIX, VOICE_IDS, idDeVoix, pronomsDeVoix } from '../data/voiceIds'
import { nomAffiche, libelleReserve } from '../lib/attribution'

/**
 * Le genre des voix — la parité, et l'accord de ce qui parle d'elles.
 *
 * Avant le 14 octobre : quarante-quatre noms masculins sur quarante-six, et
 * « elle dépose son fragment » imprimé sous « Le cartographe ».
 */

// Pas de navigateur sous Node : la langue est lue dans un stockage simulé.
const stockage = new Map<string, string>()
function langue(l: 'fr' | 'en') {
  vi.stubGlobal('localStorage', { getItem: (k: string) => stockage.get(k) ?? null, setItem: (k: string, v: string) => { stockage.set(k, v) } })
  stockage.set('langue', l)
}
afterEach(() => vi.unstubAllGlobals())

const personnes = VOICE_IDS.filter(id => !NOMS_VOIX[id].objet)

describe('la parité', () => {
  it('autant de femmes que d’hommes, à une voix près', () => {
    const f = personnes.filter(id => NOMS_VOIX[id].genre === 'f').length
    const m = personnes.filter(id => NOMS_VOIX[id].genre === 'm').length
    expect(f + m).toBe(45)
    expect(Math.abs(f - m)).toBeLessThanOrEqual(1)
  })

  it('la persona dit le même genre que le nom', () => {
    for (const v of VOIX) {
      const n = NOMS_VOIX[v.id]
      if (n.objet) continue
      // Une femme se dit « Tu es une … » ; un homme jamais. « Tu es
      // quelqu'un » reste permis aux hommes : le rêveur, l'insomniaque.
      expect(v.situation.startsWith('Tu es une '), v.id).toBe(n.genre === 'f')
    }
  })

  it('un nom à article visible porte l’article de son genre', () => {
    for (const id of VOICE_IDS) {
      const { fr, genre } = NOMS_VOIX[id]
      if (fr.startsWith('La ')) expect(genre, id).toBe('f')
      if (fr.startsWith('Le ')) expect(genre, id).toBe('m')
    }
  })
})

describe('les pronoms suivent le nom, pas le mot « voix »', () => {
  it('la cartographe est « elle », le fossoyeur « il »', () => {
    expect(pronomsDeVoix('cartographe', 'fr').sujet).toBe('elle')
    expect(pronomsDeVoix('fossoyeur', 'fr')).toEqual({ sujet: 'il', objet: 'le', possessif: 'son' })
    expect(pronomsDeVoix('archiviste', 'en')).toEqual({ sujet: 'she', objet: 'her', possessif: 'her' })
    expect(pronomsDeVoix('horloger', 'en').possessif).toBe('his')
  })
  it('la notice est une chose ; une voix inconnue reste « la voix »', () => {
    expect(pronomsDeVoix('notice', 'fr').sujet).toBe('elle')
    expect(pronomsDeVoix('notice', 'en').sujet).toBe('it')
    expect(pronomsDeVoix(undefined, 'fr').sujet).toBe('elle')
    expect(pronomsDeVoix('inconnue', 'en').possessif).toBe('its')
  })
})

describe('les poèmes d’avant gardent leurs voix', () => {
  it('l’ancien nom retrouve l’identifiant', () => {
    expect(idDeVoix('Le cartographe')).toBe('cartographe')
    expect(idDeVoix('le graveur')).toBe('graveur')
    expect(idDeVoix("L'épistolier")).toBe('epistolier')
  })
  it('et s’affiche sous le nom d’aujourd’hui, dans les deux langues', () => {
    langue('fr')
    expect(nomAffiche('Le cartographe')).toBe('La cartographe')
    expect(nomAffiche('le boucher')).toBe('La bouchère')
    langue('en')
    expect(nomAffiche('Le prisonnier')).toBe('The prisoner')
  })
  it('la réserve se contracte au féminin', () => {
    langue('fr')
    expect(libelleReserve('cartographe')).toBe('RÉSERVE DE LA CARTOGRAPHE')
    expect(libelleReserve('epistolier')).toBe("RÉSERVE DE L'ÉPISTOLIÈRE")
  })
})
