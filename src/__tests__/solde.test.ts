import { describe, it, expect } from 'vitest'
import { libelleSolde, caseDEssai } from '../lib/solde'
import type { ActePayant } from '../lib/acces'

/**
 * Le solde de l'encrier — lot 13 de l'audit du 10 septembre.
 *
 * La réserve d'essai n'était lisible que dans les Réglages : le joueur
 * découvrait la limite au moment du refus. Elle s'écrit maintenant sous le
 * bouton qui déclenche la dépense.
 *
 * Ce qui se mesure ici, c'est le libellé — le lot 9 vient de corriger
 * ailleurs un compte qui mentait, celui-ci s'affiche juste au-dessus de la
 * dépense et n'a pas droit à l'erreur.
 */

const ACTES: ActePayant[] = ['image_pro', 'partie_ia', 'lecture_dessin']

describe('libelleSolde', () => {
  it('accorde le singulier et le pluriel', () => {
    expect(libelleSolde('partie_ia', 1)).toBe('ESSAI · 1 PARTIE AVEC LES VOIX')
    expect(libelleSolde('partie_ia', 4)).toBe('ESSAI · 4 PARTIES AVEC LES VOIX')
    expect(libelleSolde('image_pro', 1)).toBe('ESSAI · 1 ILLUSTRATION')
    expect(libelleSolde('image_pro', 5)).toBe('ESSAI · 5 ILLUSTRATIONS')
    expect(libelleSolde('lecture_dessin', 1)).toBe('ESSAI · 1 LECTURE DE DESSIN')
    expect(libelleSolde('lecture_dessin', 3)).toBe('ESSAI · 3 LECTURES DE DESSIN')
  })

  it('dit la réserve vide sans vendre quoi que ce soit', () => {
    // À zéro, le mur d'abonnement prend le relais au prochain appui et il le
    // fait mieux qu'une ligne de onze pixels. Ce qu'il faut savoir AVANT
    // d'appuyer, c'est seulement que l'appui ne passera pas.
    for (const acte of ACTES) {
      expect(libelleSolde(acte, 0)).toBe('ESSAI ÉPUISÉ')
      expect(libelleSolde(acte, -1), 'un solde négatif reste un solde vide').toBe('ESSAI ÉPUISÉ')
    }
  })

  it('tient la voix de la revue — capitales, pas d’emoji, pas d’exclamation', () => {
    for (const acte of ACTES) {
      for (const n of [0, 1, 2, 5]) {
        const l = libelleSolde(acte, n)
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
