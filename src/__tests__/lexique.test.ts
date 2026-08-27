import { describe, it, expect } from 'vitest'
import { GardeLexique, diagnosticLexique, motRare } from '../lib/lexique'
import { TECHNICITE, technicite } from '../data/technicite'
import { VOIX } from '../../api/_voices'

// Mesuré sur un atelier de vingt-quatre vers dont les trois autres axes
// étaient réglés : 45 % de mots hors vocabulaire courant, et ZÉRO vers sur
// vingt-deux sans un seul mot rare. Les deux seuls vers qui tenaient debout
// étaient ceux du médium, et ils n'en portaient aucun : « Je marche » et
// « Parfaitement inutile ».

const POEME = [
  'Je marche',
  'tant que le câblé fixe ce palier',
  'un replat accuse réception du silence lacunairement',
  'elle est sèche le voisin hibernal',
  'à même le pain précipité, un doublon cendré',
  "toute bougie oubliée refroidit le grain du papier de brou d'ombre",
  'mais écume retient la trame',
  'obliquement, une séreuse creusée leste',
  'suinter, dériver',
  'sans coupure franche, ton coffre fort exuvial dévore un tourteau',
  "en épissant l'ébréché, la paille ronge un rochet",
  'dès que la filoche tiède, un remblai',
  'il semble usé un diverticule, ce carrelage, du liant tendu',
  'entre un archet lacté, chaque isobare',
  'affleurer, désagrader, peser',
  'depuis le corps alourdi, la chitine nacrée',
  'le siphon strié',
  'pourtant un sertissage fragmenté',
  'tandis que mon greffage résiduel',
  'ce ravinement glisse sous le seuil encore',
  'ma tasse refroidie enregistre la déclaration controuvée rapidement',
  'la déhiscence cède du lest par passes',
  'lorsque du dimanche vide calciné, tout débattement',
  'Parfaitement inutile',
]

describe('le diagnostic du lexique', () => {
  it("retrouve les deux vers du médium, et eux seuls, sans aucun mot rare", () => {
    const d = diagnosticLexique(POEME)
    expect(d.total).toBe(24)
    expect(d.densite).toBeGreaterThan(0.35)
    // Les deux vers propres sont « Je marche » et « Parfaitement inutile ».
    expect(d.versSains).toBeLessThanOrEqual(3)
    expect(d.pire).toBeGreaterThanOrEqual(3)
  })

  it('laisse passer le vocabulaire courant, ses féminins et ses pluriels', () => {
    for (const m of ['nuit', 'porte', 'cendre', 'fenêtre', 'main', 'silence', 'seuil',
                     'oubliée', 'refroidie', 'cassé', 'pierres', 'mains', 'usée']) {
      expect(motRare(m), m).toBe(false)
    }
  })

  it('attrape le mot de métier', () => {
    for (const m of ['déhiscence', 'sertissage', 'diverticule', 'isobare', 'chitine',
                     'exuvial', 'ravinement', 'lacunairement', 'controuvée', 'replat']) {
      expect(motRare(m), m).toBe(true)
    }
  })

  it("ne compte pas les mots de trois lettres ni les vides", () => {
    expect(motRare('or')).toBe(false)
    expect(motRare('sel')).toBe(false)
    expect(motRare('')).toBe(false)
    expect(motRare(',')).toBe(false)
  })
})

describe('GardeLexique', () => {
  const des = (graine: number) => {
    let x = graine
    return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296 }
  }

  it('ne laisse jamais deux cases du même vers puiser au métier', () => {
    for (let graine = 1; graine <= 40; graine++) {
      const g = new GardeLexique({ rng: des(graine) })
      for (let v = 0; v < 30; v++) {
        g.ouvrirVers()
        let n = 0
        for (let c = 0; c < 5; c++) if (g.auMetier(1)) n++
        expect(n, `graine=${graine}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it("laisse près d'un vers sur deux sans aucun mot de métier", () => {
    const g = new GardeLexique({ rng: des(7) })
    let sans = 0
    const N = 600
    for (let v = 0; v < N; v++) {
      g.ouvrirVers()
      let n = 0
      for (let c = 0; c < 4; c++) if (g.auMetier(1)) n++
      if (n === 0) sans++
    }
    expect(sans / N).toBeGreaterThan(0.35)
    expect(sans / N).toBeLessThan(0.60)
  })

  it("n'enchaîne jamais trois vers sans métier ni trois vers avec", () => {
    for (let graine = 1; graine <= 30; graine++) {
      const g = new GardeLexique({ rng: des(graine) })
      const suite: number[] = []
      for (let v = 0; v < 60; v++) suite.push(g.ouvrirVers())
      for (let i = 2; i < suite.length; i++) {
        const trois = suite.slice(i - 2, i + 1)
        expect(trois.every(q => q === 0), `graine=${graine} i=${i}`).toBe(false)
        expect(trois.every(q => q > 0), `graine=${graine} i=${i}`).toBe(false)
      }
    }
  })

  it("laisse la technicité choisir QUELLE case dépense le quota", () => {
    // Le greffier à 0,9 prend presque toujours sa part, l'enfant à 0,1 la
    // laisse. La voix garde son identité, le vers perd sa densité.
    const part = (t: number) => {
      const g = new GardeLexique({ rng: des(3) })
      let n = 0
      for (let v = 0; v < 800; v++) { g.ouvrirVers(); if (g.auMetier(t)) n++ }
      return n / 800
    }
    expect(part(0.9)).toBeGreaterThan(part(0.1) + 0.3)
  })

  it('ne dépense rien quand le vers est fermé', () => {
    // Un tirage sous le seuil ferme le vers : aucune case n'y puisera.
    const g = new GardeLexique({ rng: () => 0.01 })
    g.ouvrirVers()
    expect(g.quotaRestant).toBe(0)
    expect(g.auMetier(1)).toBe(false)
  })

  it("ouvre le vers quand le tirage est au-dessus du seuil", () => {
    const g = new GardeLexique({ rng: () => 0.99 })
    g.ouvrirVers()
    expect(g.quotaRestant).toBe(1)
    expect(g.auMetier(1)).toBe(true)
    expect(g.auMetier(1)).toBe(false)   // le quota est dépensé
  })
})

describe('la table de technicité du navigateur', () => {
  it('est la même que celle des voix, à la voix près', () => {
    expect(Object.keys(TECHNICITE)).toHaveLength(VOIX.length)
    for (const v of VOIX) expect(technicite(v.id), v.id).toBe(v.technicite)
  })

  it('retombe sur le cadran par défaut du serveur pour une voix inconnue', () => {
    expect(technicite('personne')).toBe(0.75)
  })
})
