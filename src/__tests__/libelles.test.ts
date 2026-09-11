import { describe, it, expect } from 'vitest'
import { libelleMorceaux, libelleMains } from '../lib/attribution'

/**
 * Les libellés de compte — lot 9 de l'audit du 10 septembre.
 *
 * Les pieds de carte écrivaient « 5 VOIX » en comptant les CASES : une partie
 * jouée seul annonçait donc cinq voix pour une seule main.
 *
 * Le rapport supposait que « voix » désignait trois choses. Vérifié : deux.
 * Le cadavre écrit convoque les mêmes personas que l'atelier — `Jeu.tsx`
 * importe `VOICE_IDS` — donc « VOIX IA », « la voix écrit en secret » et
 * « voix 2 · L'horloger » sont justes et restent. Seul le compte mentait.
 */

describe('libelleMorceaux', () => {
  it('compte des fragments dans le cadavre écrit', () => {
    expect(libelleMorceaux('phrase-simple', 5)).toBe('5 FRAGMENTS')
    expect(libelleMorceaux('phrase-etoffee', 3)).toBe('3 FRAGMENTS')
    expect(libelleMorceaux('vers-libre', 4)).toBe('4 FRAGMENTS')
  })

  it('compte des vers à l’atelier — une case y est un vers entier', () => {
    expect(libelleMorceaux('atelier', 37)).toBe('37 VERS')
    expect(libelleMorceaux('atelier', 11)).toBe('11 VERS')
  })

  it('accorde le singulier', () => {
    expect(libelleMorceaux('phrase-simple', 1)).toBe('1 FRAGMENT')
    expect(libelleMorceaux('atelier', 1)).toBe('1 VERS')
  })

  it('ne dit jamais « voix » — c’est tout l’objet du lot', () => {
    for (const s of ['phrase-simple', 'phrase-etoffee', 'vers-libre', 'atelier']) {
      for (const n of [0, 1, 2, 5, 37]) {
        expect(libelleMorceaux(s, n)).not.toMatch(/VOIX|VOICE/i)
      }
    }
  })
})

describe('libelleMains', () => {
  it('compte des mains — de vraies personnes, dans un salon', () => {
    expect(libelleMains(4)).toBe('4 MAINS')
    expect(libelleMains(1)).toBe('1 MAIN')
  })

  it('ne dit jamais « voix » non plus', () => {
    for (const n of [1, 2, 6]) expect(libelleMains(n)).not.toMatch(/VOIX|VOICE/i)
  })
})
