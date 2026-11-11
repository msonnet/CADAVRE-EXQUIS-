import { describe, it, expect } from 'vitest'
import {
  REGLAGES, etatInitial, pas, estCalme, progres, placer, pliDe, progresDe, positionDe, angleA, poidsCourbe,
  REGLAGES_DESSIN, lenteurDe, perspectiveDe, cadreDe, echelleEnsemble,
  suivreDoigt, elanPourPasser, elanAuLacher,
  type EtatPli, type Mode,
} from '../lib/paquet'
import { papierDeLaFeuille, papierDuDessin } from '../lib/papier'

/**
 * Le paquet — la physique du poème qu'on déplie au doigt (maquette validée le
 * 11 novembre). Ces mesures tiennent ce que l'auteur a réglé à l'essai.
 */

/** Laisse tomber un pli jusqu'à ce qu'il soit posé ; rend le côté et la durée. */
function chute(th0: number, w0: number, enchaine = false) {
  const e: EtatPli = { ...etatInitial(), th: th0, w: w0 }
  const mode: Mode = 'chute'
  const h = 1 / 480
  let t = 0
  while (t < 5) {
    pas(e, h, mode, 0)
    t += h
    if (e.posee && estCalme(e, enchaine)) break
  }
  return { cote: e.th >= Math.PI ? 'avant' : e.th <= 0 ? 'arrière' : 'en l’air', t, e }
}

describe('le pli tombe sous son poids, du côté où il penche', () => {
  it('lâché après la verticale, il se couche en avant', () => {
    expect(chute(100 * Math.PI / 180, 0).cote).toBe('avant')
  })
  it('lâché avant la verticale, il se referme', () => {
    expect(chute(70 * Math.PI / 180, 0).cote).toBe('arrière')
  })
  it('lâché juste après la verticale, il touche la table en un peu plus d’une demi-seconde (« trop rapide » à 0,3 s)', () => {
    const e: EtatPli = { ...etatInitial(), th: 100 * Math.PI / 180 }
    let t = 0
    while (e.th < Math.PI && t < 3) { pas(e, 1 / 480, 'chute', 0); t += 1 / 480 }
    expect(t).toBeGreaterThan(0.45)
    expect(t).toBeLessThan(0.75)
  })
  it('la poussée d’un toucher suffit à le faire passer, depuis la table', () => {
    expect(chute(0, REGLAGES.poussee, true).cote).toBe('avant')
  })
  it('l’esquisse le soulève puis il retombe fermé', () => {
    expect(chute(0, REGLAGES.esquisse).cote).toBe('arrière')
  })
  it('lancé depuis la table, il n’est pas compté comme la touchant (le défaut du 11 novembre)', () => {
    const e: EtatPli = { ...etatInitial(), th: 0, w: REGLAGES.poussee }
    pas(e, 0, 'chute', 0) // la première image, de durée nulle
    expect(e.posee).toBe(false)
    expect(e.w).toBe(REGLAGES.poussee)
  })
})

describe('le papier se courbe, puis se pose à plat', () => {
  it('en chute, le bord libre traîne : la courbure s’oppose au mouvement', () => {
    const e: EtatPli = { ...etatInitial(), th: 1.2, w: 10 }
    for (let i = 0; i < 40; i++) pas(e, 1 / 480, 'chute', 0)
    expect(e.beta).toBeLessThan(0)
  })
  it('posé, il ne reste aucune courbure', () => {
    const { e } = chute(100 * Math.PI / 180, 0)
    expect(Math.abs(e.beta)).toBeLessThan(0.01)
  })
  it('contre la table et sous le doigt, la courbe s’efface', () => {
    const e: EtatPli = { ...etatInitial(), th: 0.01, libre: 0 }
    expect(poidsCourbe(e)).toBeLessThan(0.01)
    e.beta = 0.5
    expect(angleA(e, 1, poidsCourbe(e))).toBeLessThan(0.02)
  })
  it('les angles restent entre la table et la table', () => {
    const e: EtatPli = { ...etatInitial(), th: 3.1, beta: 0.8 }
    expect(angleA(e, 1, 1)).toBeLessThanOrEqual(Math.PI)
    const f: EtatPli = { ...etatInitial(), th: 0.05, beta: -0.8 }
    expect(angleA(f, 1, 1)).toBeGreaterThanOrEqual(0)
  })
})

describe('le doigt et la position', () => {
  it('placer puis lire rend la même position', () => {
    const e = etatInitial()
    for (const p of [0, 0.3, 1, 1.75, 3]) { placer(e, p, 5); expect(progres(e)).toBeCloseTo(p, 9) }
  })
  it('au bout, le rabat est couché sur la dernière bande', () => {
    const e = etatInitial()
    placer(e, 4, 5)
    expect(e.k).toBe(3)
    expect(e.th).toBeCloseTo(Math.PI, 9)
    expect(pliDe(4, 5)).toBe(3)
  })
  it('la course du doigt va d’un milieu de bande au suivant, et revient', () => {
    const milieux = [50, 120, 160, 210]
    for (const p of [0, 0.5, 1, 2.25, 3]) expect(progresDe(positionDe(p, milieux), milieux)).toBeCloseTo(p, 9)
    expect(progresDe(0, milieux)).toBe(0)
    expect(progresDe(999, milieux)).toBe(3)
  })
})

describe('le papier du paquet', () => {
  it('a un dos, un rien plus terne que sa face', () => {
    for (const [fond, encre] of [['#f2ede2', '#0c0a06'], ['#141640', '#f0e4cc']]) {
      const p = papierDeLaFeuille(fond, encre)
      expect(p.dos).toMatch(/^#[0-9a-f]{6}$/)
      expect(p.dos).not.toBe(p.couleur)
    }
  })
})

describe('le dessin plié', () => {
  it('une grande feuille tombe plus lentement, sans traîner au-delà de 1,7', () => {
    expect(lenteurDe(30)).toBe(1)
    expect(lenteurDe(150)).toBeGreaterThan(1.3)
    expect(lenteurDe(150)).toBeLessThan(1.4)
    expect(lenteurDe(2000)).toBe(1.7)
  })
  it('une feuille plus large se regarde de plus loin', () => {
    expect(perspectiveDe(200)).toBe(1300)
    expect(perspectiveDe(400)).toBeGreaterThan(perspectiveDe(300))
  })
  // Trois bandes de 400 px puis le bas de la feuille, sur un écran de 700 px.
  const tops = [0, 400, 800, 1200], hs = [400, 400, 400, 88], VH = 700
  it('fermé, le paquet se montre entier', () => {
    expect(cadreDe(tops, hs, 0, 0, 'repos', VH)).toBe(0)
  })
  it('la bande qu’on découvre se voit entière, son nom compris', () => {
    for (const k of [1, 2]) {
      const cam = cadreDe(tops, hs, k, 0, 'repos', VH)
      expect(cam).toBeLessThanOrEqual(tops[k])
      expect(tops[k] + hs[k] - cam).toBeLessThanOrEqual(VH)
    }
  })
  it('ouvert, la vue reste sur les jambes', () => {
    expect(cadreDe(tops, hs, 3, 0, 'ouvert', VH)).toBe(800)
  })
  it('reculée, le dessin entier laisse sa place à la lecture', () => {
    const s = echelleEnsemble(VH, 1288, true)
    expect(1288 * s).toBeLessThanOrEqual(VH * REGLAGES_DESSIN.resserre + 0.01)
    expect(VH - 1288 * s).toBeGreaterThanOrEqual(REGLAGES_DESSIN.placeLecture)
    // Sans lecture à venir, il prend l'écran ; jamais plus grand que nature.
    expect(echelleEnsemble(VH, 1288, false)).toBeGreaterThan(s)
    expect(echelleEnsemble(VH, 200, true)).toBe(1)
  })
  it('le grand pli enchaîne sans attendre que son bord ait fini de trembler', () => {
    const e: EtatPli = { ...etatInitial(), beta: 0.04, vbeta: 1 }
    expect(estCalme(e, true, true)).toBe(true)
    expect(estCalme(e, true)).toBe(false)
    expect(estCalme(e, false, true)).toBe(false)
  })
  it('le papier du dessin est celui du studio, et l’ombre est celle de la table', () => {
    const clair = papierDuDessin('#fdf8f2', '#f0e4cc'), nuit = papierDuDessin('#fdf8f2', '#141640')
    expect(clair.couleur).toBe('#fdf8f2')
    expect(clair.sombre).toBe(false)
    expect(clair.dos).not.toBe(clair.couleur)
    expect(nuit.ombre).not.toBe(clair.ombre)
    expect(papierDuDessin('#2f3438', '#f0e4cc').sombre).toBe(true)
  })
})

describe('le doigt, au geste vif (« trop rapide quand on le fait manuellement », 11 novembre)', () => {
  it('un geste lent mène le papier exactement', () => {
    let p = 0, cible = 0
    for (let i = 0; i < 60; i++) { cible += 0.005; p = suivreDoigt(p, cible, 1 / 60) }
    expect(Math.abs(cible - p)).toBeLessThan(0.02)
  })
  it('un geste vif ne retourne pas le pli d’un coup : il se dresse à son rythme', () => {
    let p = 0
    for (let i = 0; i < 6; i++) p = suivreDoigt(p, 3, 1 / 60)   // un dixième de seconde
    expect(p).toBeLessThanOrEqual(REGLAGES.vitesseDoigt / Math.PI * 0.1 + 1e-9)
    // Un pli entier, au plus vite : une demi-seconde.
    let q = 0, t = 0
    while (q < 1 && t < 3) { q = suivreDoigt(q, 3, 1 / 60); t += 1 / 60 }
    expect(t).toBeGreaterThan(0.5)
  })
  it('lâché, il part du côté où le doigt l’a mené, même si le papier est en retard', () => {
    for (const deg of [0, 20, 45, 70, 88]) {
      const th = deg * Math.PI / 180
      const e: EtatPli = { ...etatInitial(), th }
      expect(chute(th, elanAuLacher(e, 0, 0.8)).cote, `${deg}° vers l’avant`).toBe('avant')
    }
    for (const deg of [92, 110, 135, 160, 180]) {
      const th = deg * Math.PI / 180
      const e: EtatPli = { ...etatInitial(), th }
      expect(chute(th, elanAuLacher(e, 0, 0.2)).cote, `${deg}° vers l’arrière`).toBe('arrière')
    }
  })
  it('sa vitesse reste celle du papier : jamais plus que l’élan qu’il lui faut', () => {
    const e: EtatPli = { ...etatInitial(), th: 0.3 }
    expect(elanAuLacher(e, 2, 0.8)).toBe(elanPourPasser(0.3))
    expect(elanAuLacher(e, -1, 0.1)).toBe(-1)
  })
})
