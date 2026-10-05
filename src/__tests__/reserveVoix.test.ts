import { describe, it, expect } from 'vitest'
import { RESERVE_FR, RESERVE_EN, type ReserveVoix } from '../data/reserveVoix'
import { reserveDe, puiserReserve } from '../lib/reserveVoix'
import { VOICE_IDS } from '../data/voiceIds'

/**
 * La réserve hors ligne parle la langue de SA voix.
 *
 * Avant : un stock unique et commun — « l'ombre », « chavire », « vacille »,
 * « la nuit garde tout » — sous « Le cartographe écrit… ». C'est mot pour mot
 * ce que `api/_voices.ts` désigne comme ce qui efface les voix. Dans le
 * train, une partie entière tombait dans ce stock.
 */

const FAMILLES: (keyof ReserveVoix)[] = ['gn', 'gnr', 'verbe', 'adj', 'vers']

// Ce que `_voices.ts` cite comme « des verbes que n'importe qui aurait
// posés », et la tête du stock commun qu'on quitte.
const COMMUN = new Set([
  'ronge', 'chavire', 'vacille', 'cède', 'brûle', 'craque',
  "l'ombre", 'le silence', 'la nuit', 'la cendre', 'la nuit garde tout', 'où vont les ombres ?',
  'shadow', 'silence', 'night', 'ash', 'burns', 'wavers', 'the night keeps everything',
])

const cle = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const mots = (t: string) => t.trim().split(/\s+/).length

describe.each([['fr', RESERVE_FR], ['en', RESERVE_EN]] as const)('la réserve %s', (_langue, table) => {
  it('chaque voix a la sienne, trois fragments par famille, tous distincts', () => {
    for (const id of VOICE_IDS) {
      const r = table[id]
      expect(r, id).toBeDefined()
      for (const f of FAMILLES) {
        expect(r[f], `${id} · ${f}`).toHaveLength(3)
        expect(new Set(r[f].map(cle)).size, `${id} · ${f} — doublon`).toBe(3)
        for (const t of r[f]) expect(t.trim(), `${id} · ${f}`).toBe(t)
      }
    }
    expect(Object.keys(table).sort()).toEqual([...VOICE_IDS].sort())
  })

  it('ne reprend jamais le stock commun', () => {
    const fautes = Object.entries(table).flatMap(([id, r]) =>
      FAMILLES.flatMap(f => r[f].filter(t => COMMUN.has(t.toLowerCase())).map(t => `${id} · ${t}`)))
    expect(fautes).toEqual([])
  })

  it('respecte les bornes des cases', () => {
    for (const [id, r] of Object.entries(table)) {
      for (const v of r.vers) {
        expect(mots(v), `${id} · ${v}`).toBeGreaterThanOrEqual(3)
        expect(mots(v), `${id} · ${v}`).toBeLessThanOrEqual(9)
      }
      for (const v of r.verbe) expect(mots(v), `${id} · ${v}`).toBeLessThanOrEqual(2)
    }
  })
})

describe('les familles suivent la grille de chaque langue', () => {
  it('le français veut l’article avec le nom', () => {
    for (const [id, r] of Object.entries(RESERVE_FR)) {
      for (const t of r.gn) expect(t, id).toMatch(/^(le|la|les|un|une|l'|votre) ?/i)
    }
  })

  it('l’anglais veut l’article avec l’adjectif, et le bon', () => {
    for (const [id, r] of Object.entries(RESERVE_EN)) {
      for (const t of r.adj) {
        expect(t, id).toMatch(/^(a|an|the) /)
        if (t.startsWith('a ')) expect(t, id).not.toMatch(/^a [aeiou]/)
        if (t.startsWith('an ')) expect(t, id).toMatch(/^an [aeiou]/)
      }
      // Le nom anglais est nu : la case précédente porte l'article.
      for (const t of r.gn) expect(t, id).not.toMatch(/^(a|an|the) /)
    }
  })
})

describe('puiserReserve', () => {
  it('rend un fragment de la voix pour une case qu’elle connaît', () => {
    expect(reserveDe('cartographe', 'verbe', 'fr')).toEqual(['longe', 'contourne', 'jalonne'])
    expect(reserveDe('cartographe', 'article-adj', 'en')).toEqual(RESERVE_EN.cartographe.adj)
    expect(reserveDe('cartographe', 'groupe-nominal', 'fr')).toEqual(RESERVE_FR.cartographe.gn)
  })

  it('évite ce que la partie a déjà employé', () => {
    const utilises = new Set(['longe', 'contourne'].map(cle))
    expect(puiserReserve('cartographe', 'verbe', 'fr', utilises, cle)).toBe('jalonne')
  })

  it('se tait quand la voix n’a rien — et l’appelant passe au stock commun', () => {
    const tout = new Set(RESERVE_FR.cartographe.verbe.map(cle))
    expect(puiserReserve('cartographe', 'verbe', 'fr', tout, cle)).toBeNull()
    expect(puiserReserve('cartographe', 'adverbe', 'fr', new Set(), cle)).toBeNull()
    expect(puiserReserve(undefined, 'verbe', 'fr', new Set(), cle)).toBeNull()
    expect(puiserReserve('inconnue', 'verbe', 'fr', new Set(), cle)).toBeNull()
  })
})
