import { describe, it, expect, afterEach } from 'vitest'
import { libelleMorceaux, libelleMains, libelleSerie } from '../lib/attribution'

/** Force la langue de l'interface le temps d'une mesure. */
function enLangue<T>(l: 'fr' | 'en', f: () => T): T {
  const avant = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => l }, configurable: true, writable: true,
  })
  try { return f() } finally {
    if (avant) Object.defineProperty(globalThis, 'localStorage', avant)
    else delete (globalThis as Record<string, unknown>).localStorage
  }
}

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
  it('compte des fragments là où une case est un morceau de phrase', () => {
    expect(libelleMorceaux('phrase-simple', 5)).toBe('5 FRAGMENTS')
    expect(libelleMorceaux('phrase-etoffee', 3)).toBe('3 FRAGMENTS')
  })

  it('compte des vers partout où une case EST un vers', () => {
    // `reconstruirePoeme` joint les cases de `vers-libre` et d'`atelier` par
    // des retours à la ligne : ce sont des vers, pas des fragments. Le
    // libellé avait oublié `vers-libre` et le recueil annonçait
    // « 2 FRAGMENTS » pour un poème de deux vers — vu à l'écran.
    expect(libelleMorceaux('vers-libre', 4)).toBe('4 VERS')
    expect(libelleMorceaux('atelier', 37)).toBe('37 VERS')
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

describe('libelleSerie — la dernière poche de chiffres romains', () => {
  afterEach(() => { delete (globalThis as Record<string, unknown>).localStorage })

  it('écrit la série en chiffres arabes, à toute longueur', () => {
    // « ✦ IIᵉ nuit de suite » passait encore ; au centième jour on lisait
    // « ✦ Cᵉ nuit de suite ». Les romains restent justes là où ils comptent
    // une revue ou une scène — l'année de l'en-tête, les actes — parce que
    // ceux-là sont bornés.
    expect(enLangue('fr', () => libelleSerie(2))).toBe('✦ 2ᵉ nuit de suite')
    expect(enLangue('fr', () => libelleSerie(100))).toBe('✦ 100ᵉ nuit de suite')
    for (const n of [2, 7, 40, 100, 365]) {
      expect(enLangue('fr', () => libelleSerie(n)), String(n)).not.toMatch(/[IVXLCDM]{2,}/)
    }
  })

  it('parle anglais — elle ne le faisait pas du tout', () => {
    // La phrase était écrite en français dans le code, sans `tr()` : toute
    // l'interface anglaise affichait « nuit de suite ».
    expect(enLangue('en', () => libelleSerie(2))).toBe('✦ 2 nights running')
    for (const n of [2, 7, 100]) {
      expect(enLangue('en', () => libelleSerie(n)), String(n)).not.toMatch(/nuit/)
    }
  })
})
