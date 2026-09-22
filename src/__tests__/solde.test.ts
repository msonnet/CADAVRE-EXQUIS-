import { describe, it, expect } from 'vitest'
import { libelleSolde, caseDEssai, resteTotal, type Reserve } from '../lib/solde'
import type { ActePayant } from '../lib/acces'

/**
 * Le solde de l'encrier — lot 13 de l'audit du 10 septembre, étendu au
 * flacon et à la ration le 22 septembre.
 *
 * La réserve d'essai n'était lisible que dans les Réglages : le joueur
 * découvrait la limite au moment du refus. Elle s'écrit maintenant sous le
 * bouton qui déclenche la dépense.
 *
 * Ce qui se mesure ici, c'est le libellé — le lot 9 a corrigé ailleurs un
 * compte qui mentait, celui-ci s'affiche juste au-dessus de la dépense et
 * n'a pas droit à l'erreur. Il en compte désormais trois au lieu d'un.
 */

const ACTES: ActePayant[] = ['image_pro', 'partie_ia', 'lecture_dessin']

/** Une réserve d'essai seule — le cas d'avant le flacon et la ration. */
function essai(n: number): Reserve {
  return { essai: n, flacon: 0, ration: 0 }
}

describe('libelleSolde', () => {
  it('accorde le singulier et le pluriel', () => {
    expect(libelleSolde('partie_ia', essai(1))).toBe('ENCRIER · 1 PARTIE AVEC LES VOIX')
    expect(libelleSolde('partie_ia', essai(4))).toBe('ENCRIER · 4 PARTIES AVEC LES VOIX')
    expect(libelleSolde('image_pro', essai(1))).toBe('ENCRIER · 1 ILLUSTRATION')
    expect(libelleSolde('image_pro', essai(5))).toBe('ENCRIER · 5 ILLUSTRATIONS')
    expect(libelleSolde('lecture_dessin', essai(1))).toBe('ENCRIER · 1 LECTURE DE DESSIN')
    expect(libelleSolde('lecture_dessin', essai(3))).toBe('ENCRIER · 3 LECTURES DE DESSIN')
  })

  it('additionne les trois réserves en un seul nombre', () => {
    // Les énumérer sous un bouton serait illisible, et l'ordre dans lequel
    // on y puise n'intéresse personne avant d'appuyer. Ce que le joueur veut
    // savoir, c'est combien de fois encore.
    expect(libelleSolde('image_pro', { essai: 2, flacon: 12, ration: 0 }))
      .toBe('ENCRIER · 14 ILLUSTRATIONS')
    expect(libelleSolde('partie_ia', { essai: 8, flacon: 0, ration: 1 }))
      .toBe('ENCRIER · 9 PARTIES AVEC LES VOIX')
    expect(resteTotal({ essai: 2, flacon: 12, ration: 1 })).toBe(15)
  })

  it('nomme la semaine quand il ne reste QUE la ration', () => {
    // C'est la seule exception, et la seule qui apprenne quelque chose : le
    // moment où le joueur découvre que la réserve revient toute seule.
    expect(libelleSolde('partie_ia', { essai: 0, flacon: 0, ration: 1 }))
      .toBe('ENCRIER · 1 PARTIE CETTE SEMAINE')
  })

  it('ne parle pas de semaine tant qu’il reste autre chose', () => {
    // Sinon le libellé annoncerait « 1 cette semaine » à qui en a neuf.
    expect(libelleSolde('partie_ia', { essai: 8, flacon: 0, ration: 1 }))
      .not.toMatch(/SEMAINE/)
    expect(libelleSolde('image_pro', { essai: 0, flacon: 3, ration: 0 }))
      .not.toMatch(/SEMAINE/)
  })

  it('dit l’encrier à sec sans vendre quoi que ce soit', () => {
    // À zéro, le mur prend le relais au prochain appui et il le fait mieux
    // qu'une ligne de onze pixels. Ce qu'il faut savoir AVANT d'appuyer,
    // c'est seulement que l'appui ne passera pas.
    for (const acte of ACTES) {
      expect(libelleSolde(acte, essai(0))).toBe('ENCRIER À SEC')
      expect(libelleSolde(acte, { essai: -1, flacon: 0, ration: 0 }),
        'un solde négatif reste un solde vide').toBe('ENCRIER À SEC')
    }
  })

  it('tient la voix de la revue — capitales, pas d’emoji, pas d’exclamation', () => {
    for (const acte of ACTES) {
      for (const r of [
        essai(0), essai(1), essai(5),
        { essai: 0, flacon: 0, ration: 1 },
        { essai: 2, flacon: 12, ration: 1 },
      ]) {
        const l = libelleSolde(acte, r)
        expect(l, l).toBe(l.toUpperCase())
        expect(l, l).not.toMatch(/[!\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
      }
    }
  })
})

describe('caseDEssai', () => {
  it('range chaque acte dans la bonne case de la réserve', () => {
    expect(caseDEssai('image_pro')).toBe('images')
    expect(caseDEssai('partie_ia')).toBe('parties')
    expect(caseDEssai('lecture_dessin')).toBe('lectures')
  })
})
