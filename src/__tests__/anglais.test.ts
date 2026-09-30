import { describe, it, expect, vi } from 'vitest'

vi.mock('../i18n', () => ({ langueActuelle: () => 'en', tr: (_fr: string, en: string) => en }))

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STRUCTURES_EN, reconstruirePoeme } from '../structures'
import { validerCase } from '../utils/validation'

/**
 * Deux fautes que seul un joueur anglophone voyait.
 */
describe('la phrase canonique de Breton, en anglais', () => {
  const s = STRUCTURES_EN.find(x => x.id === 'phrase-etoffee')!

  it('se remplit dans l\'ordre de l\'anglais et se relit entière', () => {
    // Avant : nom · adjectif · verbe · nom · adjectif — la phrase de 1925
    // elle-même sortait « the corpse exquisite shall drink the wine new ».
    const cases = ['the exquisite', 'corpse', 'shall drink', 'the new', 'wine']
      .map((texte, i) => ({ numero: i + 1, fonction: '', consigne: '', auteur: 'humain' as const, texte, ts: 0 }))
    expect(reconstruirePoeme(cases, s).replace(/\s+/g, ' ').trim().toLowerCase())
      .toBe('the exquisite corpse shall drink the new wine')
  })

  it('l\'adjectif précède le nom, comme en anglais', () => {
    expect(s.cases.map(c => c.type)).toEqual(['article-adj', 'nom', 'verbe', 'article-adj', 'nom'])
  })

  it('chaque case accepte ce que la phrase canonique y met', () => {
    const attendus = ['the exquisite', 'corpse', 'drinks', 'the new', 'wine']
    s.cases.forEach((c, i) => {
      const r = validerCase(attendus[i], c.type as never, 'stricte')
      expect(r.valide, `${c.fonction} ← ${attendus[i]}`).toBe(true)
    })
  })
})

describe('l\'Atelier anglais n\'attelle pas ses vers en français', () => {
  const src = readFileSync(join(__dirname, '../pages/JeuAtelier.tsx'), 'utf8')
  const tableau = (nom: string) => {
    const m = src.match(new RegExp(`const ${nom} = \\[([^\\]]*)\\]`))
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []
  }

  it('les attelages anglais existent et ne portent aucun mot français', () => {
    const en = [...tableau('TETES_DISLOCATION_EN'), ...tableau('TETES_SYNTAGME_EN')]
    expect(en.length).toBeGreaterThan(10)
    const fr = new Set([...tableau('TETES_DISLOCATION_FR'), ...tableau('TETES_SYNTAGME_FR')])
    for (const t of en) {
      expect(fr.has(t), t).toBe(false)
      expect(t).not.toMatch(/[àâçéèêëîïôûùü]|^(il|elle)\b/)
    }
  })

  it('et c\'est la langue qui choisit', () => {
    expect(src).toMatch(/const TETES_DISLOCATION = langueActuelle\(\) === 'en' \? TETES_DISLOCATION_EN : TETES_DISLOCATION_FR/)
    expect(src).toMatch(/const TETES_SYNTAGME = langueActuelle\(\) === 'en' \? TETES_SYNTAGME_EN : TETES_SYNTAGME_FR/)
  })
})
