import { describe, it, expect } from 'vitest'
import { casesDeLaPartie, mainsSansCase, partieTerminee } from '../lib/tablee'

const PHRASE_COURTE = { cases: { length: 3 } }
const PHRASE_ETOFFEE = { cases: { length: 5 } }
const VERS_LIBRE = { cases: { length: 12 }, nombreCasesVariable: { min: 4, max: 12 } }

/** L'ancienne garde de JeuOnline, recopiée pour montrer ce qu'elle faisait. */
function ancienneFin(cases: number, posees: number, joueurs: number): boolean {
  if (!cases) return false
  if (joueurs && cases < joueurs) return false
  return posees >= cases
}

describe('une partie écrite en ligne se termine toujours', () => {
  it('phrase courte à quatre mains : l\'ancienne garde ne finissait jamais', () => {
    // Trois cases posées, plus personne n'a de tour.
    expect(ancienneFin(3, 3, 4)).toBe(false)
    expect(partieTerminee({ mode: 'ecrit', cases: 3, posees: 3, joueurs: 4 })).toBe(true)
  })

  it('pour toute table de 2 à 8 et toute structure fixe', () => {
    for (const s of [PHRASE_COURTE, PHRASE_ETOFFEE]) {
      for (let j = 2; j <= 8; j++) {
        const cases = casesDeLaPartie('ecrit', s, j)
        expect(partieTerminee({ mode: 'ecrit', cases, posees: cases, joueurs: j }), `${cases} cases · ${j} mains`).toBe(true)
        expect(partieTerminee({ mode: 'ecrit', cases, posees: cases - 1, joueurs: j })).toBe(false)
      }
    }
  })

  it('le dessin garde sa garde : pas de fin avant une bande par joueur', () => {
    expect(partieTerminee({ mode: 'dessin', cases: 2, posees: 2, joueurs: 4 })).toBe(false)
    expect(partieTerminee({ mode: 'dessin', cases: 4, posees: 4, joueurs: 4 })).toBe(true)
  })

  it('aucune case connue : pas de fin', () => {
    expect(partieTerminee({ mode: 'ecrit', cases: 0, posees: 0, joueurs: 3 })).toBe(false)
  })
})

describe('le nombre de cases', () => {
  it('au vers libre, chaque main écrit au moins un vers', () => {
    // Le pire tirage : la borne basse.
    for (let j = 2; j <= 8; j++) {
      expect(casesDeLaPartie('ecrit', VERS_LIBRE, j, () => 0)).toBeGreaterThanOrEqual(j)
    }
  })

  it('et ne dépasse jamais sa borne haute', () => {
    expect(casesDeLaPartie('ecrit', VERS_LIBRE, 20, () => 0.999)).toBe(12)
  })

  it('une structure fixe ne s\'allonge pas', () => {
    expect(casesDeLaPartie('ecrit', PHRASE_COURTE, 6)).toBe(3)
  })

  it('le salon annonce les mains sans case', () => {
    expect(mainsSansCase('ecrit', PHRASE_COURTE, 3)).toBe(0)
    expect(mainsSansCase('ecrit', PHRASE_COURTE, 5)).toBe(2)
    expect(mainsSansCase('ecrit', VERS_LIBRE, 8)).toBe(0)
    expect(mainsSansCase('dessin', PHRASE_COURTE, 8)).toBe(0)
  })
})
