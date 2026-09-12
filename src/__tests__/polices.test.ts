import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Pas plus de trois familles, jamais.
 *
 * Le 12 septembre, l'application en chargeait quatre : Bodoni Moda, Playfair
 * Display, Raleway et Caveat. Cette dernière n'apparaissait qu'UNE fois dans
 * tout le dépôt — le « № 477 » griffonné sur un collage — et pesait 102 Ko,
 * soit un cinquième du poids typographique. Elle est retirée.
 *
 * Ce test est un garde-fou, pas un constat : une quatrième famille se glisse
 * vite, et sur une PWA installable chaque famille est précachée pour toujours.
 */

const RACINE = resolve(__dirname, '../..')
const PLAFOND = 3

/** Les familles réellement déclarées en `@font-face`. */
function famillesDeclarees(): string[] {
  const css = readFileSync(resolve(RACINE, 'src/polices.css'), 'utf8')
  const noms = [...css.matchAll(/font-family:\s*'([^']+)'/g)].map(m => m[1])
  return [...new Set(noms)].sort()
}

describe('les polices embarquées', () => {
  it('ne dépasse pas trois familles', () => {
    const f = famillesDeclarees()
    expect(f, `familles déclarées : ${f.join(', ')}`).toHaveLength(PLAFOND)
  })

  it('sont bien celles que la maquette emploie', () => {
    expect(famillesDeclarees()).toEqual(['Bodoni Moda', 'Playfair Display', 'Raleway'])
  })

  it('n’a plus un seul fichier orphelin dans /fonts', () => {
    const fichiers = readdirSync(resolve(RACINE, 'public/fonts')).filter(f => f.endsWith('.woff2'))
    const css = readFileSync(resolve(RACINE, 'src/polices.css'), 'utf8')
    for (const f of fichiers) {
      expect(css, `${f} n'est déclaré nulle part`).toContain(f)
    }
    // Deux styles × deux sous-ensembles par famille, sauf celles qui n'ont
    // pas d'italique dessinée.
    expect(fichiers.length).toBeLessThanOrEqual(PLAFOND * 4)
  })

  it('aucune famille retirée n’est encore RÉFÉRENCÉE', () => {
    // On cherche une référence de fonte, pas le mot : les commentaires qui
    // racontent le retrait de Caveat sont légitimes et doivent survivre.
    // Premier jet de ce test : un simple `caveat` insensible à la casse —
    // il tombait sur ma propre note d'historique dans `tailwind.config.js`.
    const REFERENCES = [
      /fontFamily\s*=\s*["']Caveat/i,      // attribut SVG
      /['"]Caveat['"]\s*[,\]]/i,           // pile de familles
      /font-family:[^;]*Caveat/i,          // CSS
      /\bfont-caveat\b/i,                  // classe Tailwind
      /^\s*caveat\s*:/im,                  // alias dans la config
    ]
    const sources = [
      'src/reve/collages.tsx', 'src/lib/typo.ts', 'tailwind.config.js',
      'index.html', 'src/index.css', 'src/polices.css',
    ]
    for (const s of sources) {
      const contenu = readFileSync(resolve(RACINE, s), 'utf8')
      for (const re of REFERENCES) {
        expect(re.test(contenu), `${s} référence encore Caveat (${re})`).toBe(false)
      }
    }
  })
})
