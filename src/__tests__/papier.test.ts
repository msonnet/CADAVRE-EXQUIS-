import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pli, feuille, plume, sonsActifs, reglerSons } from '../audio/papier'

/**
 * Le son du papier s'entend sur un téléphone.
 *
 * Avant : des sinusoïdes de 110 à 330 Hz derrière un passe-bas à 2,4 kHz —
 * la bande exacte qu'un haut-parleur de téléphone ne rend pas. Et un bouton
 * son qui ne coupait rien.
 */

type Filtre = { type: string; frequency: { value: number }; Q: { value: number } }
function faux() {
  const filtres: Filtre[] = []
  const departs: number[] = []
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} })
  const noeud = () => ({ connect() {} })
  const ctx = {
    sampleRate: 8000,
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => ({ ...noeud(), buffer: null, start: (t: number) => departs.push(t) }),
    createBiquadFilter: () => { const f = { ...noeud(), type: '', frequency: { value: 0 }, Q: { value: 0 } }; filtres.push(f); return f },
    createGain: () => ({ ...noeud(), gain: param() }),
  }
  return { ctx: ctx as unknown as BaseAudioContext, filtres, departs }
}

describe('le papier', () => {
  it('vit au-dessus de 1 kHz, là où un téléphone rend quelque chose', () => {
    for (const son of [pli, plume]) {
      const { ctx, filtres } = faux()
      son(ctx, {} as AudioNode, 0)
      for (const f of filtres) expect(f.frequency.value, son.name).toBeGreaterThan(1000)
    }
  })

  it('la feuille garde un souffle grave, mais aussi un frôlement aigu', () => {
    const { ctx, filtres } = faux()
    feuille(ctx, {} as AudioNode, 0)
    expect(filtres.some(f => f.type === 'highpass' && f.frequency.value > 3000)).toBe(true)
  })

  it('deux plis de suite ne sont pas identiques', () => {
    const a = faux(); pli(a.ctx, {} as AudioNode, 0)
    const b = faux(); pli(b.ctx, {} as AudioNode, 0)
    expect(a.filtres.map(f => f.frequency.value)).not.toEqual(b.filtres.map(f => f.frequency.value))
  })
})

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
  })

  it('tous les sons obéissent — le bouton ne ment plus', () => {
    const src = join(__dirname, '..')
    expect(readFileSync(join(src, 'hooks/useSound.ts'), 'utf8')).toMatch(/if \(!sonsActifs\(\)\) return/)
    expect(readFileSync(join(src, 'hooks/useAmbiance.ts'), 'utf8')).toMatch(/reglerSons\(/)
  })

  it('le papier ne passe pas par le passe-bas de 2,4 kHz', () => {
    const t = readFileSync(join(__dirname, '../hooks/useSound.ts'), 'utf8')
    expect(t).toMatch(/pli\(ctx, brut, t\)/)
    expect(t).toMatch(/const brut = ctx\.destination/)
  })

  it('le dépli s\'entend, sur les trois feuillets qui se déplient', () => {
    for (const f of ['pages/FinDePartie.tsx', 'pages/FinOnline.tsx', 'pages/PoemeDuJour.tsx']) {
      expect(readFileSync(join(__dirname, '..', f), 'utf8'), f).toMatch(/onVolet=\{\(\) => jouer\('pli'\)\}/)
    }
  })
})
