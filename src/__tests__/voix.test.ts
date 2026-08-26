import { describe, it, expect } from 'vitest'
import { VOIX, promptSysteme } from '../../api/_voices'

// Les quarante-six voix ne sont plus seulement des métiers. On vérifie ici que
// la matière humaine est bien là, qu'elle est singulière, et que le cadran de
// technicité agit vraiment sur ce que la voix reçoit.

describe('les quarante-six voix', () => {
  it('portent toutes les sept champs', () => {
    expect(VOIX).toHaveLength(46)
    for (const v of VOIX) {
      for (const champ of ['situation', 'lexique', 'gestes', 'souffle', 'enjeu', 'dehors', 'defaut'] as const) {
        expect(typeof v[champ], `${v.id}.${champ}`).toBe('string')
        expect(v[champ].length, `${v.id}.${champ}`).toBeGreaterThan(20)
      }
      expect(typeof v.technicite, v.id).toBe('number')
      expect(v.technicite, v.id).toBeGreaterThanOrEqual(0)
      expect(v.technicite, v.id).toBeLessThanOrEqual(1)
    }
  })

  it("n'ont ni enjeu ni défaut en commun — c'est la condition pour rester quarante-six", () => {
    for (const champ of ['enjeu', 'defaut', 'dehors'] as const) {
      const vus = new Set(VOIX.map(v => v[champ]))
      expect(vus.size, champ).toBe(46)
    }
  })

  it('gardent un dehors assez fourni pour être tiré au sort', () => {
    for (const v of VOIX) {
      expect(v.dehors.split(', ').length, v.id).toBeGreaterThanOrEqual(4)
    }
  })

  it('couvrent toute la plage du cadran, pas seulement le haut', () => {
    const t = VOIX.map(v => v.technicite)
    expect(Math.min(...t)).toBeLessThanOrEqual(0.15)
    expect(Math.max(...t)).toBeGreaterThanOrEqual(0.85)
    // Au moins un tiers des voix sous 0,75 : sans quoi le cadran ne sert à rien
    expect(t.filter(x => x < 0.75).length).toBeGreaterThanOrEqual(10)
  })

  it('donnent aux voix les moins techniques les valeurs les plus basses', () => {
    const par = Object.fromEntries(VOIX.map(v => [v.id, v.technicite]))
    expect(par['enfant']).toBeLessThan(0.3)
    expect(par['somnambule']).toBeLessThan(0.4)
    expect(par['convalescent']).toBeLessThan(0.4)
    expect(par['insomniaque']).toBeLessThan(0.4)
    expect(par['greffier']).toBeGreaterThan(0.8)
    expect(par['chimiste']).toBeGreaterThan(0.8)
    expect(par['notice']).toBeGreaterThan(0.8)
  })
})

describe('le prompt système', () => {
  const voix = (id: string) => VOIX.find(v => v.id === id)!

  it("porte toujours l'enjeu et le défaut", () => {
    for (const v of VOIX) {
      for (let i = 0; i < 8; i++) {
        const p = promptSysteme(v, 'groupe-nominal')
        expect(p, v.id).toContain(v.enjeu)
        expect(p, v.id).toContain(v.defaut)
        expect(p, v.id).toContain(v.situation)
      }
    }
  })

  it("sert le dehors à l'enfant bien plus souvent que le métier", () => {
    const e = voix('enfant')
    let dehors = 0
    for (let i = 0; i < 400; i++) {
      if (promptSysteme(e, 'groupe-nominal').includes('ne vient pas de ton travail')) dehors++
    }
    expect(dehors / 400).toBeGreaterThan(0.75)
  })

  it('sert le métier au greffier bien plus souvent que le dehors', () => {
    const g = voix('greffier')
    let metier = 0
    for (let i = 0; i < 400; i++) {
      if (promptSysteme(g, 'groupe-nominal').includes('ses matières')) metier++
    }
    expect(metier / 400).toBeGreaterThan(0.8)
  })

  it("ne sert jamais une liste de choses sur une case verbe — le dehors n'a pas de gestes", () => {
    for (const v of VOIX) {
      for (let i = 0; i < 20; i++) {
        const p = promptSysteme(v, 'verbe')
        if (p.includes('ne vient pas de ton travail')) {
          expect(p, v.id).not.toContain(v.dehors.split(', ')[0])
        }
      }
    }
  })

  it('ne montre jamais le lexique en entier — la voix retomberait sur son premier article', () => {
    for (const v of VOIX) {
      for (let i = 0; i < 10; i++) {
        expect(promptSysteme(v, 'groupe-nominal'), v.id).not.toContain(v.lexique)
        expect(promptSysteme(v, 'groupe-nominal'), v.id).not.toContain(v.dehors)
      }
    }
  })
})
