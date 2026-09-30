import { describe, it, expect } from 'vitest'
import { codeDeSalon, arriveeSansIdentite, texteInvitation } from '../lib/invitation'

/**
 * L'invitation porte le code, et le code survit à l'arrivée.
 *
 * Avant : on dictait le code, et un invité sans identité qui ouvrait
 * `/salon/KX7Q` était renvoyé vers `/online` tout court — le code perdu.
 */
describe('le lien d\'un salon', () => {
  it('l\'invité sans identité garde le code', () => {
    expect(arriveeSansIdentite('KX7Q')).toBe('/online?salon=KX7Q')
    expect(codeDeSalon(new URLSearchParams('salon=KX7Q').get('salon'))).toBe('KX7Q')
  })

  it('un code se lit tel qu\'on le tape, et rien d\'autre ne passe', () => {
    expect(codeDeSalon(' kx7q ')).toBe('KX7Q')
    expect(codeDeSalon('KX7Q"><script>')).toBe('KX7QSCRI')
    expect(codeDeSalon('ab')).toBeNull()
    expect(codeDeSalon(null)).toBeNull()
  })

  it('l\'invitation tient en une phrase et un lien, dans la langue du salon', () => {
    const fr = texteInvitation('KX7Q', 'https://x.app/salon/KX7Q', 'fr')
    expect(fr).toBe('Rejoins-moi à la table — salon KX7Q, Cadavre Exquis.\nhttps://x.app/salon/KX7Q')
    expect(texteInvitation('KX7Q', 'l', 'en')).toMatch(/^Join me at the table — room KX7Q/)
    // La voix de la revue : ni emoji, ni point d'exclamation.
    expect(fr).not.toMatch(/!|\p{Extended_Pictographic}/u)
  })
})
