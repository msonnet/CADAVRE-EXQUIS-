import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { plafondLuminosite, ratioContraste } from '../reve/contraste'
import { AMBIANCES } from '../reve/pools'
import { MOTIFS, motifDuJour } from '../reve/collages'
import { composerSeance } from '../reve/Decor'

/**
 * Le décor vivant — `docs/direction-artistique.md`.
 *
 * Décisions de l'auteur, 7 novembre : des motifs animés, sur l'accueil
 * seulement ; sept, un par jour de la semaine ; un mouvement subtil qui vit
 * de lui-même et se modifie légèrement au toucher ; les dix-huit dessins au
 * trait d'avant supprimés. Chaque motif est une vraie gravure, en couleurs
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
    // Un cran de plus dépasserait presque : c'est le plus grand facteur qui tient.
    expect(ratioContraste(assombrir('#eddbba', f + 0.02), '#080604')).toBeGreaterThan(PLAFOND - 0.15)
  })
})

describe('les motifs du jour', () => {
  it('sont sept au plus, tous des gravures dont on connaît le papier', () => {
    expect(MOTIFS.length).toBeGreaterThan(0)
    expect(MOTIFS.length).toBeLessThanOrEqual(7)
    for (const m of MOTIFS) expect(m.papier, m.id).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('un par jour de la semaine, lundi d\'abord ; la semaine reprend les motifs existants', () => {
    // Le 3 novembre 2026 est un lundi.
    const jour = (n: number) => new Date(2026, 10, 3 + n, 12)
    expect(motifDuJour(jour(0))).toBe(MOTIFS[0])
    for (let n = 0; n < 14; n++) {
      expect(motifDuJour(jour(n))).toBe(MOTIFS[(n % 7) % MOTIFS.length])
    }
  })

  it('la séance porte le motif du jour, quelle que soit la graine', () => {
    const lundi = new Date(2026, 10, 3, 12)
    for (const g of [1, 7, 74, 274, 9999]) expect(composerSeance(g, lundi).symbole).toBe(MOTIFS[0])
  })

  it('les tirages de chaque graine n\'ont pas bougé (côté, heure, citation)', () => {
    // Relevés avant la suppression des dessins : la pioche consommait six
    // tirages, qu'on consomme toujours.
    const s = composerSeance(6)
    expect(s.ambiance.id).toBe('lin')
    expect(s.symbolSide).toBe('right')
  })

  it('les dix-huit dessins au trait sont supprimés', () => {
    const source = readFileSync(resolve(RACINE, 'src/reve/collages.tsx'), 'utf8')
    expect(source).not.toMatch(/<svg/)
    expect(source).not.toMatch(/Spirale|Rotorelief|OeilTranche|HorlogeMolle|Hatches/)
  })

  it('tiennent le plafond sur chacune des sept ambiances', () => {
    for (const m of MOTIFS) for (const a of Object.values(AMBIANCES)) {
      const f = plafondLuminosite(m.papier, a.bg, PLAFOND)
      expect(ratioContraste(assombrir(m.papier, f), a.bg), `${m.id} · ${a.id}`).toBeLessThanOrEqual(PLAFOND)
    }
  })
})

describe('le phénakistiscope', () => {
  const disque = MOTIFS.find(m => m.id === 'phenakistiscope')!

  it('est le motif du lundi', () => {
    expect(MOTIFS[0]).toBe(disque)
  })

  it('garde ses couleurs d\'origine sur les ambiances claires', () => {
    for (const id of ['aube', 'rose', 'celadon', 'lin'] as const) {
      expect(plafondLuminosite(disque.papier, AMBIANCES[id].bg, PLAFOND), id).toBe(1)
    }
  })

  it('son image existe, légère, et elle est précachée pour le hors-ligne', () => {
    const fichier = resolve(RACINE, 'public/decor/phenakistiscope.webp')
    expect(statSync(fichier).size).toBeLessThan(80 * 1024)
    const config = readFileSync(resolve(RACINE, 'vite.config.ts'), 'utf8')
    expect(config).toMatch(/globPatterns:\s*\[[^\]]*'decor\/\*\.webp'/)
  })

  it('tourne en douze crans, ralenti à 1,6 s le tour, et s\'arrête sous mouvement réduit', () => {
    const css = readFileSync(resolve(RACINE, 'src/index.css'), 'utf8')
    expect(css).toMatch(/\.phenakistiscope\s*\{[^}]*1\.6s steps\(12\)/)
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.phenakistiscope\s*\{\s*animation:\s*none/)
  })
})
