import { describe, it, expect } from 'vitest'
import { VOYAGE, VITESSE_RETOUR, bezier, courbeGlisse, feuilletA, confierVoyage, reprendreVoyage, reprendreRetour, instantDuVoyage, type Rect } from '../lib/voyage'

/**
 * Le voyage du feuillet, du recueil à la page du poème — la maquette retenue
 * le 11 novembre (« ça va trop vite » : le voyage dure 0,75 s).
 */

const de: Rect = { x: 16, y: 420, w: 358, h: 74 }
const vers: Rect = { x: 16, y: 210, w: 358, h: 380 }

describe('l’horloge', () => {
  it('le feuillet voyage trois quarts de seconde, le tout en un peu plus d’une seconde et demie', () => {
    expect(VOYAGE.glisse[1] - VOYAGE.glisse[0]).toBe(750)
    expect(VOYAGE.fin).toBeLessThanOrEqual(1600)
    expect(VOYAGE.relais).toBeGreaterThanOrEqual(VOYAGE.fuite[1])
  })
  it('la courbe part et arrive où il faut, sans revenir en arrière', () => {
    const c = bezier(0.3, 0, 0.2, 1)
    expect(c(0)).toBeCloseTo(0, 6)
    expect(c(1)).toBeCloseTo(1, 6)
    let avant = 0
    for (let x = 0; x <= 1; x += 0.02) { const y = courbeGlisse(x); expect(y).toBeGreaterThanOrEqual(avant - 1e-9); avant = y }
  })
})

describe('le feuillet', () => {
  it('au toucher, il est la ligne : même place, pas encore de papier', () => {
    const f = feuilletA(0, de, vers)
    expect(f).toMatchObject({ x: de.x, w: de.w, h: de.h, papier: 0, ligne: 1, feuille: 0 })
  })
  it('soulevé, il n’a pas encore bougé quand le recueil passe la main', () => {
    const f = feuilletA(VOYAGE.relais, de, vers)
    expect(f.papier).toBe(1)
    expect(Math.abs(f.y - (de.y - 3))).toBeLessThan(2)
  })
  it('à l’arrivée, il est la feuille entière, et ne montre plus la ligne', () => {
    const f = feuilletA(VOYAGE.arrivee, de, vers)
    expect(f).toMatchObject({ x: vers.x, y: vers.y, w: vers.w, h: vers.h, echelle: 1, ligne: 0, feuille: 1 })
  })
  it('tant que la feuille n’est pas mesurée, il attend soulevé à sa place', () => {
    const f = feuilletA(900, de, null)
    expect(f.x).toBe(de.x)
    expect(f.h).toBe(de.h)
  })
})

describe('le relais', () => {
  it('la page du poème le reprend, pour ce poème, tant qu’il voyage', () => {
    confierVoyage({ id: 'a', de, titre: 't', meta: 'm', depart: 1000 })
    expect(reprendreVoyage('a', 1400)).not.toBeNull()
    expect(reprendreVoyage('a', 1450)).not.toBeNull()
  })
  it('un autre poème, ou un voyage déjà fini, ne rejoue rien', () => {
    confierVoyage({ id: 'a', de, titre: 't', meta: 'm', depart: 1000 })
    expect(reprendreVoyage('b', 1400)).toBeNull()
    confierVoyage({ id: 'a', de, titre: 't', meta: 'm', depart: 1000 })
    expect(reprendreVoyage('a', 1000 + VOYAGE.arrivee + 1)).toBeNull()
  })
})

describe('le retour (« ← MES POÈMES »)', () => {
  it('refait le chemin à l’envers, plus vite', () => {
    expect(instantDuVoyage(1000, 1000, -1)).toBe(VOYAGE.fin)
    const duree = VOYAGE.fin / VITESSE_RETOUR
    expect(instantDuVoyage(1000 + duree, 1000, -1)).toBeCloseTo(0, 6)
    expect(duree).toBeLessThan(VOYAGE.fin)
  })
  it('le recueil reprend le retour en cours, pas l’aller, et pas un retour fini', () => {
    const depart = 1000, relais = depart + (VOYAGE.fin - VOYAGE.relais) / VITESSE_RETOUR
    confierVoyage({ id: 'a', de, titre: 't', meta: 'm', depart, sens: -1 })
    expect(reprendreRetour(relais + 10)).not.toBeNull()
    expect(reprendreVoyage('a', relais + 10)).toBeNull()
    expect(reprendreRetour(depart + VOYAGE.fin)).toBeNull()
    confierVoyage({ id: 'a', de, titre: 't', meta: 'm', depart })
    expect(reprendreRetour(depart + 400)).toBeNull()
  })
})
