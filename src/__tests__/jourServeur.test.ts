import { describe, it, expect } from 'vitest'
import {
  dernierMot, refusDuVers, langueValide, refusDeSignalement,
  MOTS_MAX, CARACTERES_MAX, PLANCHER_VERS, SEUIL_RETRAIT,
} from '../../api/_jour.js'
import { nettoyerVersDeVoix } from '../../api/cleanup.js'
import {
  dernierMot as dernierMotClient,
  refusDuVers as refusDuVersClient,
  MOTS_MAX as MOTS_MAX_CLIENT,
  CARACTERES_MAX as CARACTERES_MAX_CLIENT,
  PLANCHER_VERS as PLANCHER_CLIENT,
} from '../lib/jourLogique'

/**
 * Le poème du jour, côté serveur.
 *
 * Les règles sont en double : `src/lib/jourLogique.ts` les tient pour
 * refuser un vers de douze mots sans aller-retour, `api/_jour.ts` les tient
 * pour trancher. Un client n'est jamais l'autorité sur une règle de jeu.
 *
 * Une duplication qui DÉRIVE est pire qu'une duplication assumée : ces tests
 * existent pour que les deux copies restent d'accord, et pour mesurer ce que
 * le serveur accepte d'un modèle qui n'en fait qu'à sa tête.
 */

describe('les deux copies de la règle disent la même chose', () => {
  it('mêmes bornes', () => {
    expect(MOTS_MAX).toBe(MOTS_MAX_CLIENT)
    expect(CARACTERES_MAX).toBe(CARACTERES_MAX_CLIENT)
    expect(PLANCHER_VERS).toBe(PLANCHER_CLIENT)
  })

  it('même écho, sur les cas qui piègent', () => {
    for (const t of [
      'la cire se souvient des doigts',
      'un cheval dort debout.',
      '« une valise »',
      'personne ne rallume l’âtre',
      'il descend jusqu’au sous-sol —',
      '   ',
    ]) {
      expect(dernierMot(t), t).toBe(dernierMotClient(t))
    }
  })

  it('même verdict sur un vers', () => {
    for (const t of [
      '', '   ', 'exquis', 'la cire se souvient des doigts',
      'un\ndeux', 'x'.repeat(CARACTERES_MAX + 1),
      Array(MOTS_MAX + 1).fill('mot').join(' '),
    ]) {
      expect(refusDuVers(t), JSON.stringify(t)).toBe(refusDuVersClient(t))
    }
  })
})

describe('le serveur se méfie de ce qu’on lui envoie', () => {
  it('refuse ce qui n’est même pas du texte', () => {
    // Le client peut poster n'importe quoi : un nombre, un objet, rien.
    for (const v of [undefined, null, 42, {}, []]) {
      expect(refusDuVers(v as unknown), String(v)).toBe('vide')
    }
  })

  it('ne reconnaît que deux langues', () => {
    expect(langueValide('en')).toBe('en')
    expect(langueValide('fr')).toBe('fr')
    for (const v of [undefined, null, 'de', 'EN', 42, {}]) {
      expect(langueValide(v), String(v)).toBe('fr')
    }
  })
})

describe('ce qu’on garde de la réponse d’une voix', () => {
  it('ne prend que la première ligne', () => {
    // Le modèle rend parfois une strophe quand la consigne l'inspire trop.
    expect(nettoyerVersDeVoix('le sel monte\nla porte bat\nune ombre')).toBe('le sel monte')
  })

  it('ôte les guillemets et le point final', () => {
    expect(nettoyerVersDeVoix('« le sel monte lentement »')).toBe('le sel monte lentement')
    expect(nettoyerVersDeVoix('"une porte bat."')).toBe('une porte bat')
    expect(nettoyerVersDeVoix('le cuivre chante !')).toBe('le cuivre chante')
  })

  it('refuse un vers qui déborde la règle des mains humaines', () => {
    // Une voix qui écrirait douze mots casserait la règle que les joueurs
    // subissent : la chaîne serait injuste avant d'être belle.
    expect(nettoyerVersDeVoix(Array(MOTS_MAX + 1).fill('mot').join(' '))).toBeNull()
    expect(nettoyerVersDeVoix('x'.repeat(CARACTERES_MAX + 1))).toBeNull()
  })

  it('refuse une réponse vide ou purement décorative', () => {
    for (const v of ['', '   ', '\n\n', '« »', '...']) {
      expect(nettoyerVersDeVoix(v), JSON.stringify(v)).toBeNull()
    }
  })

  it('rend un vers propre tel quel', () => {
    expect(nettoyerVersDeVoix('la rouille avance sur les noms')).toBe('la rouille avance sur les noms')
  })

  it('ce qu’il rend est toujours recevable par la règle', () => {
    // La garantie qui compte : tout ce qui sort d'ici passe `refusDuVers`.
    for (const brut of [
      'le sel monte\nautre chose', '« une porte bat. »', 'le cuivre chante quand on l’oublie',
      '   un cheval dort debout   ', 'les miroirs changent de côté !',
    ]) {
      const v = nettoyerVersDeVoix(brut)
      expect(v, brut).not.toBeNull()
      expect(refusDuVers(v as string), brut).toBeNull()
    }
  })
})

describe('qui peut signaler quel vers', () => {
  const dUnAutre = { main_id: 'autre', voix: false }

  it('refuse le SIEN', () => {
    // Se signaler soi-même permettrait de retirer son propre vers après coup,
    // donc de récrire le poème des autres. C'est la règle qui compte le plus.
    expect(refusDeSignalement({ main_id: 'moi', voix: false }, 'moi', false)).toBe('sien')
  })

  it('refuse celui d’une VOIX', () => {
    // Elle n'a pas de main à protéger, et un vers de voix qui déplaît est un
    // défaut de gabarit — il se corrige à la source, pas par signalement.
    expect(refusDeSignalement({ main_id: null, voix: true }, 'moi', false)).toBe('voix')
  })

  it('refuse deux fois la même main sur le même vers', () => {
    expect(refusDeSignalement(dUnAutre, 'moi', true)).toBe('deja')
  })

  it('refuse un vers qui n’existe pas', () => {
    expect(refusDeSignalement(null, 'moi', false)).toBe('introuvable')
  })

  it('accepte le vers d’une autre main, une fois', () => {
    expect(refusDeSignalement(dUnAutre, 'moi', false)).toBeNull()
  })

  it('demande DEUX signalements pour retirer', () => {
    // À un seul, n'importe qui ferait tomber chaque vers du poème l'un après
    // l'autre — une main par vers, et la règle « un signalement par main et
    // par vers » n'y changerait rien.
    expect(SEUIL_RETRAIT).toBeGreaterThanOrEqual(2)
  })
})
