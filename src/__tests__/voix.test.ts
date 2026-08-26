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

  it('gardent un dehors aussi profond que leur lexique', () => {
    // À cinq entrées dont quatre tirées, la voix voyait presque toute sa liste
    // à chaque appel : l'enfant a rendu « le couloir » huit fois sur quatorze.
    // C'est le défaut du menu, déjà corrigé une fois sur le lexique.
    for (const v of VOIX) {
      expect(v.dehors.split(', ').length, v.id).toBeGreaterThanOrEqual(9)
    }
  })

  it('ne répètent pas une même chose dans un dehors', () => {
    for (const v of VOIX) {
      const items = v.dehors.split(', ')
      expect(new Set(items).size, v.id).toBe(items.length)
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

  it("demande l'ordinaire quand le mot vient du dehors, et l'écart quand il vient du métier", () => {
    // « le mot juste n'y figure probablement pas, ne les recopie pas » a été
    // écrite pour le lexique de métier. Servie sur le dehors, elle chasse la
    // voix de l'ordinaire, et il ne lui reste que le dictionnaire : le rêveur
    // a rendu « une centrifugeuse », l'insomniaque « ma soude ».
    for (const v of VOIX) {
      for (let i = 0; i < 30; i++) {
        const p = promptSysteme(v, 'groupe-nominal')
        const dehors = p.includes('ne vient pas de ton travail')
        expect(p.includes('Ne les recopie pas'), `${v.id} dehors=${dehors}`).toBe(!dehors)
        expect(p.includes('doit rester ORDINAIRE'), `${v.id} dehors=${dehors}`).toBe(dehors)
      }
    }
  })

  it('interdit le verbe de métier quand le geste vient du dehors', () => {
    const e = VOIX.find(v => v.id === 'enfant')!
    let vus = 0
    for (let i = 0; i < 60; i++) {
      const p = promptSysteme(e, 'verbe')
      if (p.includes('ne vient pas de ton travail')) {
        expect(p).toContain('geste ORDINAIRE')
        vus++
      }
    }
    expect(vus).toBeGreaterThan(30)
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
