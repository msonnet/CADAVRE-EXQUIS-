import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import {
  PLANCHER_FEUILLET, auteurDuVers, basculerChoix, deplacerChoix, poemeDuCarnet, provenanceDuVers,
  fonctionDeCase, mettreEnTete,
} from '../lib/composition'
import { attributionPubliee } from '../lib/galerie'
import { attribution, attributionEnMorceaux, contientDeLIA } from '../lib/attribution'
import { mainsDuPoeme } from '../lib/versRecueil'
import { getStructure, reconstruirePoeme } from '../structures'
import {
  chargerPoeme, chargerRecolte, db, deplacerDansLaRecolte, mettreEnTeteDeLaRecolte, recolter,
  relierEnFeuillet, sauvegarderPoeme, viderLaRecolte, type VersRecolte,
} from '../db'
import type { Poeme } from '../types'

// Le carnet ramassait des vers et ne permettait pas d'en faire un poème : deux
// flèches qui déplacent d'un rang, et un .txt pour toute sortie. Ces mesures
// tiennent le geste qui manquait — choisir, ordonner, relier en feuillet.

const T = Date.UTC(2026, 8, 14, 12)

const vers = (id: string, texte: string, extra: Partial<VersRecolte> = {}): VersRecolte => ({
  id, texte, ordre: 1, dateRecolte: T, ...extra,
})

describe('le choix — l’ordre du toucher fait l’ordre du feuillet', () => {
  it('ajoute à la fin, dans l’ordre où l’on touche', () => {
    let c: string[] = []
    c = basculerChoix(c, 'r280')
    c = basculerChoix(c, 'r1')
    c = basculerChoix(c, 'r42')
    // Le 280e vers ouvre le poème sans un seul déplacement — il en fallait 279.
    expect(c).toEqual(['r280', 'r1', 'r42'])
  })

  it('retoucher un vers le retire du feuillet', () => {
    expect(basculerChoix(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('monte et descend dans le feuillet, sans sortir des bornes', () => {
    expect(deplacerChoix(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(deplacerChoix(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(deplacerChoix(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c'])
    expect(deplacerChoix(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
  })

  it('met un vers en tête d’un seul appui — trente vers, pas vingt-neuf flèches', () => {
    const trente = Array.from({ length: 30 }, (_, i) => `v${i + 1}`)
    expect(mettreEnTete(trente, 'v30')).toEqual(['v30', ...trente.slice(0, 29)])
    expect(mettreEnTete(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(mettreEnTete(['a', 'b'], 'z')).toEqual(['a', 'b'])
  })

  it('un seul vers ne fait pas un feuillet', () => {
    expect(PLANCHER_FEUILLET).toBe(2)
  })
})

describe('le feuillet relié', () => {
  const a = vers('r1', "l'abbé presse ma main", {
    poemeId: 'p1', poemeTitre: 'Le vernis', datePoeme: T, signature: "voix 2 · L'enlumineur", auteur: 'ia',
  })
  const b = vers('r2', 'un sel de cuisine dort dans la gorge', { datePoeme: T + 5 * 86400000, signature: 'toi', auteur: 'humain' })

  it('est un vers libre du recueil, dans l’ordre donné', () => {
    const p = poemeDuCarnet({ vers: [b, a], date: T })
    expect(p.structureId).toBe('vers-libre')
    expect(p.origine).toBe('carnet')
    expect(p.titre).toBeNull()
    expect(reconstruirePoeme(p.cases, getStructure(p.structureId)))
      .toBe("un sel de cuisine dort dans la gorge\nl'abbé presse ma main")
    expect(p.cases.map(c => c.numero)).toEqual([1, 2])
  })

  it('ses coutures sont les provenances', () => {
    const p = poemeDuCarnet({ vers: [a, b], date: T })
    expect(p.cases[0].fonction).toBe('14 septembre 2026 · Le vernis')
    expect(p.cases[1].fonction).toBe(provenanceDuVers(b))
    expect(p.cases[1].fonction).toBe('19 septembre 2026')
    expect(attribution(p.cases[1])).toBe('toi')
  })

  it('les voix de la signature redeviennent des noms de voix', () => {
    const p = poemeDuCarnet({ vers: [a], date: T })
    expect(attributionEnMorceaux(p.cases[0])).toEqual({ texte: 'voix 2', voix: ["L'enlumineur"] })
    // Un pseudo de salon qui contient le séparateur n'est pas une voix.
    const pseudo = poemeDuCarnet({ vers: [vers('r9', 'x', { signature: 'Lou · Martin' })] })
    expect(attributionEnMorceaux(pseudo.cases[0])).toEqual({ texte: 'Lou · Martin', voix: [] })
  })

  it('ne compte pas de mains : ses vers ne se sont jamais assis à la même table', () => {
    expect(mainsDuPoeme(poemeDuCarnet({ vers: [a, b] }))).toBeNull()
  })

  it('porte la mention de l’IA quand une voix y a écrit, et seulement alors', () => {
    expect(contientDeLIA(poemeDuCarnet({ vers: [a, b] }).cases)).toBe(true)
    expect(contientDeLIA(poemeDuCarnet({ vers: [b] }).cases)).toBe(false)
  })
})

describe('l’auteur des vers gardés avant qu’on le note', () => {
  const source: Poeme = {
    id: 'p1', titre: null, structureId: 'phrase-simple', mode: 'standard', visibilite: 'aveugle',
    dateCreation: T, dateModification: T,
    cases: [
      { numero: 1, fonction: 'sujet', consigne: '', auteur: 'humain', texte: 'le chien', ts: T },
      { numero: 2, fonction: 'verbe', consigne: '', auteur: 'ia', texte: 'dort encore ', ts: T },
    ],
  }

  it('se retrouve dans le poème d’origine', () => {
    expect(auteurDuVers(vers('r', 'dort encore', { poemeId: 'p1' }), source)).toBe('ia')
    expect(auteurDuVers(vers('r', 'le chien', { poemeId: 'p1' }), source)).toBe('humain')
  })

  it('puis par le compte de voix de l’Atelier', () => {
    expect(auteurDuVers(vers('r', 'x', { nbVoix: 0 }))).toBe('humain')
    expect(auteurDuVers(vers('r', 'x', { nbVoix: 3 }))).toBe('mixte')
  })

  it('dans le doute, la mention est due', () => {
    expect(auteurDuVers(vers('r', 'x', { signature: 'toi' }))).toBe('humain')
    expect(auteurDuVers(vers('r', 'x', { signature: 'Le géologue' }))).toBe('mixte')
    expect(auteurDuVers(vers('r', 'x'))).toBe('mixte')
  })
})

describe('relier, au recueil', () => {
  beforeEach(async () => {
    await viderLaRecolte()
    await db.poemes.clear()
  })

  it('le carnet garde l’auteur du vers', async () => {
    await recolter({ texte: 'la lampe reste allumée', auteur: 'ia', signature: 'voix' })
    const [v] = await chargerRecolte()
    expect(v.auteur).toBe('ia')
  })

  it('entre au recueil sans rien ôter du carnet', async () => {
    const a = await recolter({ texte: 'premier vers', signature: 'toi', auteur: 'humain' })
    const b = await recolter({ texte: 'deuxième vers', signature: 'toi', auteur: 'humain' })
    const c = await recolter({ texte: 'troisième vers', signature: 'toi', auteur: 'humain' })

    const p = await relierEnFeuillet([c.id, a.id])
    const relu = await chargerPoeme(p.id)
    expect(relu?.cases.map(x => x.texte)).toEqual(['troisième vers', 'premier vers'])
    expect(relu?.origine).toBe('carnet')
    expect((await chargerRecolte()).map(v => v.id)).toEqual([a.id, b.id, c.id])
  })

  it('deux reliures font deux feuillets — un vers sert à deux poèmes', async () => {
    const a = await recolter({ texte: 'un', signature: 'toi' })
    const b = await recolter({ texte: 'deux', signature: 'toi' })
    const p1 = await relierEnFeuillet([a.id, b.id])
    const p2 = await relierEnFeuillet([b.id, a.id])
    expect(p1.id).not.toBe(p2.id)
    expect(await db.poemes.count()).toBe(2)
  })

  it('retrouve l’auteur d’un vers ancien dans son poème d’origine', async () => {
    await sauvegarderPoeme({
      id: 'p-ancien', titre: null, structureId: 'vers-libre', mode: 'standard', visibilite: 'aveugle',
      dateCreation: T, dateModification: T,
      cases: [{ numero: 1, fonction: '', consigne: '', auteur: 'ia', texte: 'le vernis craquelé', ts: T }],
    })
    // Gardé avant ce lot : ni auteur ni compte de voix, une signature ambiguë.
    const a = await recolter({ texte: 'le vernis craquelé', poemeId: 'p-ancien', signature: 'voix' })
    const b = await recolter({ texte: 'à moi', signature: 'toi' })
    const p = await relierEnFeuillet([b.id, a.id])
    expect(p.cases.map(x => x.auteur)).toEqual(['humain', 'ia'])
  })
})

// ── Le carnet lui-même ────────────────────────────────────────────────
//
// Composer a son « EN TÊTE », le carnet n'en avait pas : son ordre est celui
// que COPIER et FICHIER emportent, et remonter le 280e vers y coûtait encore
// 279 flèches.

describe('l’ordre du carnet', () => {
  beforeEach(async () => { await viderLaRecolte() })

  it('le 280e vers passe en tête d’un seul appui', async () => {
    const ids: string[] = []
    for (let i = 1; i <= 280; i++) ids.push((await recolter({ texte: `vers ${i}` })).id)
    await mettreEnTeteDeLaRecolte(ids[279])
    const apres = await chargerRecolte()
    expect(apres[0].texte).toBe('vers 280')
    // Les autres ne bougent pas les uns par rapport aux autres.
    expect(apres.slice(1).map(v => v.texte)).toEqual(ids.slice(0, 279).map((_, i) => `vers ${i + 1}`))
  })

  it('les flèches d’un rang suivent encore, et un vers gardé ensuite va au fond', async () => {
    const a = await recolter({ texte: 'a' })
    await recolter({ texte: 'b' })
    const c = await recolter({ texte: 'c' })
    await mettreEnTeteDeLaRecolte(c.id)
    await deplacerDansLaRecolte(a.id, -1)
    await recolter({ texte: 'd' })
    expect((await chargerRecolte()).map(v => v.texte)).toEqual(['a', 'c', 'b', 'd'])
    // Le premier n'a nulle part où monter : rien ne change.
    await mettreEnTeteDeLaRecolte(a.id)
    expect((await chargerRecolte()).map(v => v.texte)).toEqual(['a', 'c', 'b', 'd'])
  })
})

// ── Relu par un autre, relu dans l'autre langue ─────────────────────────
//
// La couture d'un feuillet relié était FIGÉE au moment où l'on gardait le
// vers : « toi » restait « toi » en galerie, où il désigne le lecteur, et la
// date restait française sous l'interface anglaise.

describe('le feuillet relié, publié en galerie', () => {
  const sig = (signature: string, extra: Partial<VersRecolte> = {}) =>
    poemeDuCarnet({ vers: [vers('r', 'x', { signature, ...extra })], date: T }).cases[0]

  it('« toi » devient le nom de celui qui publie', () => {
    expect(attributionPubliee(sig('toi', { auteur: 'humain' }), 'Nathan')).toEqual({ texte: 'Nathan', voix: [] })
    expect(attributionPubliee(sig('you', { auteur: 'humain' }), 'Nathan')).toEqual({ texte: 'Nathan', voix: [] })
    expect(attributionPubliee(sig('toi seul', { auteur: 'humain' }), 'Nathan')).toEqual({ texte: 'Nathan', voix: [] })
  })

  it('« toi et 3 voix » garde ses voix, sous le nom de celui qui publie', () => {
    expect(attributionPubliee(sig('toi et 3 voix · Le boucher · Le géologue', { auteur: 'mixte' }), 'Nathan'))
      .toEqual({ texte: 'Nathan et 3 voix', voix: ['Le boucher', 'Le géologue'] })
  })

  it('les autres mains restent les leurs', () => {
    expect(attributionPubliee(sig('Desnos', { auteur: 'humain' }), 'Nathan')).toEqual({ texte: 'Desnos', voix: [] })
    expect(attributionPubliee(sig("voix 2 · L'enlumineur", { auteur: 'ia' }), 'Nathan'))
      .toEqual({ texte: 'voix 2', voix: ["L'enlumineur"] })
  })
})

describe('le feuillet relié, relu dans l’autre langue', () => {
  const changerLangue = (l: 'fr' | 'en') => vi.stubGlobal('localStorage', { getItem: () => l, setItem: () => {} })
  afterEach(() => vi.unstubAllGlobals())
  const a = vers('r1', 'x', { poemeTitre: 'Le vernis', datePoeme: T, signature: "voix 2 · L'enlumineur", auteur: 'ia' })

  it('la couture suit la langue courante — date, tête et noms', () => {
    const p = poemeDuCarnet({ vers: [a], date: T })
    changerLangue('en')
    expect(fonctionDeCase(p.cases[0])).toBe('14 September 2026 · Le vernis')
    expect(attribution(p.cases[0])).toBe('voice 2 · The illuminator')
    expect(attribution(poemeDuCarnet({ vers: [vers('r', 'x', { signature: 'toi' })] }).cases[0])).toBe('you')
    expect(attribution(poemeDuCarnet({ vers: [vers('r', 'x', { signature: 'toi et une voix · Le boucher' })] }).cases[0]))
      .toBe('you and one voice · The butcher')
  })

  it('et revient en français', () => {
    changerLangue('en')
    const p = poemeDuCarnet({ vers: [vers('r', 'x', { poemeTitre: 'Poem of the day', datePoeme: T, signature: 'player 3' })], date: T })
    changerLangue('fr')
    expect(fonctionDeCase(p.cases[0])).toBe('14 septembre 2026 · Poème du jour')
    expect(attribution(p.cases[0])).toBe('joueur 3')
  })
})
