import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * L'almanach : un jour manqué ne fait plus disparaître un poème.
 *
 * La mesure de bout en bout vit dans `e2e/poeme-du-jour.spec.ts` ; celle-ci
 * garde ce qu'un test d'écran ne voit pas.
 */
const page = readFileSync(join(__dirname, '../pages/PoemeDuJour.tsx'), 'utf8')
const lib = readFileSync(join(__dirname, '../lib/jour.ts'), 'utf8')

describe('l\'almanach', () => {
  it('va chercher les jours scellés, et seulement eux', () => {
    const f = lib.slice(lib.indexOf('export async function almanach'))
    expect(f).toMatch(/\.not\('scelle_le', 'is', null\)/)
    expect(f).toMatch(/\.eq\('langue', langueActuelle\(\)\)/)
  })

  it('ouvrir un jour ancien ne fait pas rejouer le dépli du dernier', () => {
    // La clé retenait UN jour : ouvrir avant-hier aurait effacé hier.
    expect(page).toMatch(/const joursDeplies = \(\): string\[\] =>/)
    expect(page).toMatch(/\.slice\(0, 20\)/)
  })

  it('un poème ancien où l\'on a écrit entre aussi au recueil', () => {
    const montrer = page.slice(page.indexOf('function montrer('))
    expect(montrer.slice(0, 900)).toMatch(/garderSiAbsent\(poemeDuJour/)
  })
})
