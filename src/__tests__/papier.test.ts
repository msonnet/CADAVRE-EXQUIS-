import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { papierDeLaFeuille, reliefDuPli, grainDuPapier } from '../lib/papier'
import { AMBIANCES } from '../reve/pools'
import { ratioContraste } from '../reve/contraste'
import { partitionDuPoeme, finDuDepli, DUREE_DEPLI } from '../lib/rythme'

/**
 * La feuille de la fin de partie — planche témoin du 8 novembre, validée par
 * l'auteur (`docs/direction-artistique.md`, chantier 3).
 */

const lire = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8')
const ambiances = Object.values(AMBIANCES)

describe('le papier de la feuille', () => {
  it('l’encre se lit sur le papier de chacune des sept ambiances', () => {
    for (const a of ambiances) {
      const p = papierDeLaFeuille(a.bg, a.ink)
      expect(ratioContraste(a.ink, p.couleur), a.id).toBeGreaterThanOrEqual(7)
    }
  })

  it('l’accent de l’ambiance s’y lit aussi — l’en-tête et la lettrine', () => {
    for (const a of ambiances) {
      const p = papierDeLaFeuille(a.bg, a.ink)
      for (const ac of a.accents) expect(ratioContraste(ac.hex, p.couleur), `${a.id} · ${ac.name}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('sur fond clair, une feuille plus claire que la table ; sur fond sombre, un papier noir', () => {
    for (const a of ambiances) {
      const p = papierDeLaFeuille(a.bg, a.ink)
      expect(p.couleur, a.id).not.toBe(a.bg)
      // Plus clair que le fond dans les deux cas : la feuille se détache.
      expect(ratioContraste(p.couleur, '#000000'), a.id).toBeGreaterThan(ratioContraste(a.bg, '#000000'))
      if (p.sombre) expect(ratioContraste(p.couleur, a.bg), `${a.id} reste sombre`).toBeLessThan(1.4)
    }
    expect(papierDeLaFeuille(AMBIANCES.lin.bg, AMBIANCES.lin.ink).sombre).toBe(false)
    expect(papierDeLaFeuille(AMBIANCES.encre.bg, AMBIANCES.encre.ink).sombre).toBe(true)
  })

  it('les plis au repos alternent un creux et une arête', () => {
    expect(reliefDuPli(0, false)).not.toBe(reliefDuPli(1, false))
    expect(reliefDuPli(2, false)).toBe(reliefDuPli(0, false))
    expect(reliefDuPli(0, true)).not.toBe(reliefDuPli(0, false))
  })

  it('hors du navigateur, aucun grain : rien à dessiner', () => {
    expect(grainDuPapier(false)).toBeUndefined()
  })
})

describe('le mot est déjà sur son volet', () => {
  const poeme = (n: number) => Array.from({ length: n }, (_, i) => `vers numéro ${i} de la lampe sourde`)

  it('le poème est posé quand le dernier volet est à plat', () => {
    for (const n of [1, 3, 5, 9, 24, 60]) {
      const p = partitionDuPoeme(poeme(n))
      const dernier = p.panneaux[p.panneaux.length - 1]
      expect(finDuDepli(p), `n=${n}`).toBe(dernier.ouverture + DUREE_DEPLI)
      expect(finDuDepli(p), `n=${n}`).toBeLessThan(12_000)
    }
    expect(finDuDepli(partitionDuPoeme([]))).toBe(0)
  })

  it('le poème de la planche est posé plus tôt qu’avec l’encre', () => {
    const p = partitionDuPoeme(['le notaire', 'phosphorescent', 'avale', 'une lampe', 'sourde'])
    expect(finDuDepli(p)).toBe(5700)
    expect(finDuDepli(p)).toBeLessThan(p.fin)
  })

  it('le vers n’a plus de masque d’encre, ni la lettrine de chute', () => {
    const src = lire('components/PoemeDevoile.tsx')
    const appel = src.slice(src.indexOf('<VersEncre'), src.indexOf('/>', src.indexOf('<VersEncre')))
    expect(appel).toMatch(/\n\s*immediat\n/)
    expect(src).not.toMatch(/y: -38/)
    expect(src).toMatch(/finDuDepli\(partition\)/)
  })

  it('un volet fermé reste dans l’arbre du lecteur d’écran', () => {
    // `visibility: hidden` retirait la copie du vers (`VersEncre`) jusqu'à
    // l'ouverture de son volet : le lecteur d'écran n'avait que le premier vers.
    const src = lire('components/Depli.tsx')
    expect(src).not.toMatch(/'hidden' : 'visible'/)
    expect(src).toMatch(/const opacity = useTransform\(k, v => \(v <= 0 \? 0 : 1\)\)/)
    expect(src).toMatch(/data-volet-papier/)
  })

  it('la fin de partie pose une feuille, et non plus une carte à liseré', () => {
    const src = lire('pages/FinDePartie.tsx')
    expect(src).toMatch(/papierDeLaFeuille\(bg, encre\)/)
    expect(src).not.toMatch(/borderLeft: `3px solid \$\{accent\}`/)
    expect(src).toMatch(/position: 'relative'/)
  })
})
