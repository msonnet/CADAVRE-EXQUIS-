import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { plafondLuminosite, ratioContraste } from '../reve/contraste'
import { AMBIANCES } from '../reve/pools'
import { COLLAGES } from '../reve/collages'

/**
 * Le décor vivant — `docs/direction-artistique.md`.
 *
 * Premier élément : le rotorelief dessiné à la main cède la place à un vrai
 * disque de phénakistiscope (Vienne, vers 1830, domaine public), qui tourne
 * d'un douzième de tour par image — son animation d'origine. En couleurs
 * d'origine, avec un plafond de contraste sur les ambiances sombres.
 */

const RACINE = resolve(__dirname, '../..')
const PLAFOND = 6.5

/** Ce que fait `brightness(f)` : chaque composante sRGB multipliée par f. */
const assombrir = (hex: string, f: number) =>
  '#' + [1, 3, 5].map(i => Math.floor(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('')

describe('le plafond de contraste', () => {
  it('ne touche à rien quand l\'image est plus sombre que son fond', () => {
    expect(plafondLuminosite('#333333', '#f2ede2', PLAFOND)).toBe(1)
  })

  it('ne touche à rien sous le plafond', () => {
    expect(plafondLuminosite('#eddbba', '#f2ede2', PLAFOND)).toBe(1)
  })

  it('baisse la lumière jusqu\'au plafond, pas plus bas qu\'il ne faut', () => {
    const f = plafondLuminosite('#eddbba', '#080604', PLAFOND)
    expect(f).toBeLessThan(1)
    expect(ratioContraste(assombrir('#eddbba', f), '#080604')).toBeLessThanOrEqual(PLAFOND)
    // Un centième de plus dépasserait : c'est le plus grand facteur qui tient.
    expect(ratioContraste(assombrir('#eddbba', f + 0.02), '#080604')).toBeGreaterThan(PLAFOND - 0.15)
  })
})

describe('le phénakistiscope', () => {
  const disque = COLLAGES.find(c => c.id === 'phenakistiscope')

  it('remplace le rotorelief, au même rang : les tirages du jour ne bougent pas', () => {
    expect(disque).toBeDefined()
    expect(COLLAGES.find(c => c.id === 'spirale')).toBeUndefined()
    expect(COLLAGES.length).toBe(18)
    expect(COLLAGES.indexOf(disque!)).toBe(17)
  })

  it('ne vit que sur l\'accueil : ailleurs, le rotorelief dessiné d\'avant', () => {
    expect(disque!.ailleurs).toBeDefined()
    expect(disque!.ailleurs!.w).toBe(120)
    expect(disque!.ailleurs!.draw.name).toBe('Spirale')
  })

  it('porte la couleur mesurée de son papier, que lit le plafond', () => {
    expect(disque!.papier).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('tient le plafond sur chacune des sept ambiances', () => {
    for (const a of Object.values(AMBIANCES)) {
      const f = plafondLuminosite(disque!.papier!, a.bg, PLAFOND)
      expect(ratioContraste(assombrir(disque!.papier!, f), a.bg), a.id).toBeLessThanOrEqual(PLAFOND)
      // Les claires gardent les couleurs d'origine, telles quelles.
      if (['aube', 'rose', 'celadon', 'lin'].includes(a.id)) expect(f, a.id).toBe(1)
    }
  })

  it('son image existe, légère, et elle est précachée pour le hors-ligne', () => {
    const fichier = resolve(RACINE, 'public/decor/phenakistiscope.webp')
    expect(statSync(fichier).size).toBeLessThan(80 * 1024)
    const config = readFileSync(resolve(RACINE, 'vite.config.ts'), 'utf8')
    expect(config).toMatch(/globPatterns:\s*\[[^\]]*'decor\/\*\.webp'/)
  })

  it('tourne en douze crans, et s\'arrête sous mouvement réduit', () => {
    const css = readFileSync(resolve(RACINE, 'src/index.css'), 'utf8')
    expect(css).toMatch(/\.phenakistiscope\s*\{[^}]*steps\(12\)/)
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.phenakistiscope\s*\{\s*animation:\s*none/)
  })
})
