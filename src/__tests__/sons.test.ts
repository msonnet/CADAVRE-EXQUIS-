import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { sonsActifs, reglerSons } from '../audio/reglageSons'

/**
 * Les sons du jeu, et le silence qu'on choisit.
 *
 * Les sons de papier synthétisés (pli, feuille, plume) ont été retirés à la
 * demande de l'auteur. Ce qui reste : les sons d'origine, et un réglage qui
 * les coupe pour de vrai — le bouton son ne coupait rien.
 */
const SRC = join(__dirname, '..')
const lire = (f: string) => readFileSync(join(SRC, f), 'utf8')

describe('le silence se choisit', () => {
  const stockage = new Map<string, string>()
  beforeEach(() => {
    stockage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => stockage.get(k) ?? null,
      setItem: (k: string, v: string) => { stockage.set(k, v) },
    })
  })

  it('les sons sont actifs par défaut, et se coupent', () => {
    expect(sonsActifs()).toBe(true)
    reglerSons(false)
    expect(sonsActifs()).toBe(false)
    reglerSons(true)
    expect(sonsActifs()).toBe(true)
  })

  it('tous les sons obéissent — le bouton ne ment plus', () => {
    expect(lire('hooks/useSound.ts')).toMatch(/if \(!sonsActifs\(\)\) return/)
    expect(lire('hooks/useAmbiance.ts')).toMatch(/reglerSons\(/)
  })
})

describe('les sons de papier sont retirés', () => {
  it('plus de synthèse de bruit, plus de son de pli ni de feuille', () => {
    expect(existsSync(join(SRC, 'audio/papier.ts'))).toBe(false)
    const son = lire('hooks/useSound.ts')
    expect(son).not.toMatch(/'pli'|'feuille'|plume\(|createBufferSource/)
  })

  it('le dépli ne déclenche plus de son par volet', () => {
    for (const f of ['components/PoemeDevoile.tsx', 'pages/FinDePartie.tsx', 'pages/FinOnline.tsx', 'pages/PoemeDuJour.tsx']) {
      expect(lire(f), f).not.toMatch(/onVolet|jouer\('pli'\)|jouer\('feuille'\)/)
    }
  })
})
