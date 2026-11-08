import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { plafondLuminosite, ratioContraste } from '../reve/contraste'
import { AMBIANCES } from '../reve/pools'
import { MOTIFS, motifDuTirage } from '../reve/collages'
import { composerSeance, graineSuivante } from '../reve/Decor'

/**
 * Le décor vivant — `docs/direction-artistique.md`.
 *
 * Décisions de l'auteur, 7 novembre : des motifs animés sur l'accueil
 * seulement ; sept au plus, chacun avec un lien au
 * surréalisme ; un mouvement subtil qui vit de lui-même et réagit au
 * toucher ; les dix-huit dessins au trait d'avant supprimés ; de vraies
 * gravures, en couleurs d'origine, découpées avec le même bord de papier,
 * et un plafond de contraste sur les ambiances sombres. Le 8 novembre : un
 * motif par AMBIANCE et non plus par jour, et il change à chaque changement
 * d'ambiance.
 */

const RACINE = resolve(__dirname, '../..')
const PLAFOND = 6.5
const css = readFileSync(resolve(RACINE, 'src/index.css'), 'utf8')

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
    expect(ratioContraste(assombrir('#eddbba', f + 0.02), '#080604')).toBeGreaterThan(PLAFOND - 0.15)
  })
})

describe('un motif par ambiance', () => {
  it('quatre motifs produits, dans l\'ordre', () => {
    expect(MOTIFS.map(m => m.id)).toEqual(['phenakistiscope', 'lune', 'poisson', 'clef'])
    expect(motifDuTirage(0).id).toBe('phenakistiscope')
    expect(motifDuTirage(0.999).id).toBe('clef')
  })

  it('la graine décide du motif, comme de l\'ambiance : même graine, même motif', () => {
    for (const g of [1, 6, 13, 21, 74, 274, 9999]) expect(composerSeance(g).symbole).toBe(composerSeance(g).symbole)
    // Les graines des parcours : Lin écru pour chaque motif.
    expect(composerSeance(13).symbole.id).toBe('phenakistiscope')
    expect(composerSeance(21).symbole.id).toBe('lune')
    expect(composerSeance(6).symbole.id).toBe('poisson')
    expect(composerSeance(274).symbole.id).toBe('clef')
    for (const g of [13, 21, 6, 274]) expect(composerSeance(g).ambiance.id).toBe('lin')
  })

  it('les quatre motifs reviennent à parts à peu près égales', () => {
    const vus: Record<string, number> = {}
    for (let g = 0; g < 4000; g++) { const id = composerSeance(g).symbole.id; vus[id] = (vus[id] ?? 0) + 1 }
    for (const m of MOTIFS) expect(vus[m.id], m.id).toBeGreaterThan(800)
  })

  it('une nouvelle ambiance amène TOUJOURS un autre motif', () => {
    // Un hasard fixé, pour que la mesure soit la même à chaque fois.
    let x = 2463534242
    const hasard = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 }
    let g = 274
    for (let i = 0; i < 300; i++) {
      const neuve = graineSuivante(g, hasard)
      expect(composerSeance(neuve).symbole.id, `tirage ${i}`).not.toBe(composerSeance(g).symbole.id)
      g = neuve
    }
  })

  it('sans graine précédente, une graine neuve suffit', () => {
    expect(Number.isInteger(graineSuivante(null))).toBe(true)
  })

  it('les dix-huit dessins au trait sont supprimés', () => {
    const source = readFileSync(resolve(RACINE, 'src/reve/collages.tsx'), 'utf8')
    expect(source).not.toMatch(/<svg/)
    // Les noms des anciens dessins (le mot « Rotoreliefs », lui, est au cartel du disque).
    expect(source).not.toMatch(/\b(Spirale|OeilTranche|HorlogeMolle|ChapeauMelon|Hatches)\b/)
  })

  it('chaque motif nomme sa référence surréaliste sur son cartel', () => {
    const refs: Record<string, RegExp> = {
      phenakistiscope: /Rotoreliefs/, lune: /chien andalou/, poisson: /Breton/, clef: /Magritte/,
    }
    for (const m of MOTIFS) expect(m.ref, m.id).toMatch(refs[m.id])
  })
})

describe('les images des motifs', () => {
  const fichiers = ['phenakistiscope', 'lune', 'nuage', 'carpe', 'clef']

  it('existent, légères, et sont précachées pour le hors-ligne', () => {
    for (const f of fichiers) expect(statSync(resolve(RACINE, `public/decor/${f}.webp`)).size, f).toBeLessThan(90 * 1024)
    const config = readFileSync(resolve(RACINE, 'vite.config.ts'), 'utf8')
    expect(config).toMatch(/globPatterns:\s*\[[^\]]*'decor\/\*\.webp'/)
  })

  it('tiennent le plafond sur chacune des sept ambiances (le papier du bord découpé)', () => {
    for (const m of MOTIFS) for (const a of Object.values(AMBIANCES)) {
      const f = plafondLuminosite(m.papier, a.bg, PLAFOND)
      expect(ratioContraste(assombrir(m.papier, f), a.bg), `${m.id} · ${a.id}`).toBeLessThanOrEqual(PLAFOND)
    }
  })

  it('les ambiances claires gardent les couleurs d\'origine', () => {
    for (const m of MOTIFS) for (const id of ['aube', 'rose', 'celadon', 'lin'] as const) {
      expect(plafondLuminosite(m.papier, AMBIANCES[id].bg, PLAFOND), `${m.id} · ${id}`).toBe(1)
    }
  })
})

describe('le mouvement des motifs', () => {
  it('le disque tourne en douze crans, à 1,6 s le tour', () => {
    expect(css).toMatch(/\.phenakistiscope\s*\{[^}]*1\.6s steps\(12\)/)
  })

  it('chaque motif vit de lui-même et a sa réaction au toucher', () => {
    expect(css).toMatch(/\.motif-carpe\s*\{[^}]*infinite/)
    expect(css).toMatch(/\.motif-carpe\.touche\s*\{[^}]*carpe-dissout/)
    expect(css).toMatch(/\.motif-lune \.lune-nuage\s*\{[^}]*infinite/)
    // Une réaction porte un NOM d'animation à elle : sous le même nom que le
    // mouvement propre, le navigateur la raccourcirait au lieu de la jouer.
    expect(css).toMatch(/\.motif-lune\.touche \.lune-nuage\s*\{[^}]*lune-nuage-vite/)
    expect(css).toMatch(/\.motif-clef\s*\{[^}]*infinite/)
    expect(css).toMatch(/\.motif-clef\.touche\s*\{[^}]*clef-tourne/)
  })

  it('sous mouvement réduit, tout est posé', () => {
    const reduits = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n')
    for (const sel of ['.phenakistiscope', '.motif-carpe', '.motif-clef', '.motif-lune .lune-nuage', '.motif-lune .lune-astre']) {
      expect(reduits, sel).toContain(sel)
    }
    expect(reduits).toMatch(/animation:\s*none/)
  })
})
