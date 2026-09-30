import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { partieDuCorps, partieNue, silhouette } from '../lib/corps'

/**
 * Chaque bande sait quelle partie du corps elle dessine.
 *
 * Avant : les libellés dormaient dans un tableau de `ConfigurationDessin`
 * que rien n'affichait, et l'écran disait seulement « BANDE 2/4 ».
 */
describe('la silhouette', () => {
  it('de deux à sept bandes, dans les deux langues, tête en haut', () => {
    for (let n = 2; n <= 7; n++) {
      for (const l of ['fr', 'en'] as const) {
        const parties = Array.from({ length: n }, (_, i) => partieDuCorps(i, n, l))
        expect(parties.every(Boolean), `${n} · ${l}`).toBe(true)
        expect(new Set(parties).size, `${n} · ${l} sans doublon`).toBe(n)
        expect(parties[0]).toBe(l === 'fr' ? 'la tête' : 'the head')
      }
    }
  })

  it('les petites capitales perdent l\'article', () => {
    expect(partieNue(2, 3, 'fr')).toBe('jambes')
    expect(partieNue(0, 4, 'en')).toBe('head')
    expect(silhouette(3, 'fr')).toBe('tête · corps · jambes')
  })

  it('hors des tailles connues, rien plutôt qu\'un faux nom', () => {
    expect(partieDuCorps(0, 1, 'fr')).toBeNull()
    expect(partieDuCorps(5, 4, 'fr')).toBeNull()
  })

  it('les trois écrans de dessin l\'affichent', () => {
    const src = join(__dirname, '..')
    for (const f of ['pages/JeuDessin.tsx', 'components/OnlineDrawingCanvas.tsx', 'pages/JeuOnline.tsx']) {
      expect(readFileSync(join(src, f), 'utf8'), f).toMatch(/partieNue\(/)
    }
  })
})
