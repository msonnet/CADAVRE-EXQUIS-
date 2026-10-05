import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  composerAffichePoeme, composerAfficheDessin, composerCorpsVideo, composerSurimpression,
  composerLectureVideo, ZONE_SURE, STORY_W, Y, IMAGE_MIN,
  invitationDuJour, texteDuPartage, type Boite, type Mesure,
} from '../lib/affiche'

/**
 * La grille de l'affiche de partage, dans l'esprit de couleursRubriques :
 * on balaie les cas au lieu de regarder deux captures.
 *
 * Avant, mesuré dans Chromium : l'invitation tracée à 1888 sur l'adresse à
 * 1882, la marque posée sur l'illustration, un poème illustré de trois vers
 * entré dans le passe-partout, et toute la signature sous le champ de
 * réponse d'une story (1770–1882).
 */

// Approximation de Playfair italique : un demi-cadratin par signe.
const mesurer: Mesure = (texte, police) => {
  const taille = Number(/(\d+)px/.exec(police)?.[1] ?? 40)
  return [...texte].length * taille * 0.48
}

const COURT = 'la cire'
const MOYEN = 'le vernis craquelé avale une lampe sourde\nsous la paupière du fleuve\nun horloger compte les noyés'
const vers = [
  'le vernis craquelé avale une lampe sourde',
  'sous la paupière du fleuve une cuillère',
  'un horloger compte les noyés à rebours',
  'la baleine infirme écrit au crayon',
]
const long = (n: number) => Array.from({ length: n }, (_, i) => vers[i % 4]).join('\n')
const phrase = 'le vernis craquelé avale une lampe sourde sous la paupière du fleuve où un horloger compte les noyés à rebours'

const POEMES = [COURT, MOYEN, phrase, long(8), long(14), long(22), long(40), '']
const TITRES = ['', 'Le vernis', 'Un titre assez long pour tenir sur deux lignes au moins, voire trois si l’on insiste']
const IMAGES = [null, { w: 768, h: 1024 }, { w: 1024, h: 1024 }, { w: 1600, h: 900 }, { w: 600, h: 1400 }]

function verifier(boites: Boite[], cas: string) {
  for (const b of boites) {
    expect(b.haut, `${cas} · ${b.nom} entre sous l'interface du haut`).toBeGreaterThanOrEqual(ZONE_SURE.haut)
    expect(b.bas, `${cas} · ${b.nom} descend sous le champ de réponse`).toBeLessThanOrEqual(ZONE_SURE.bas)
    expect(b.bas, `${cas} · ${b.nom} est vide ou inversé`).toBeGreaterThanOrEqual(b.haut)
  }
  const triees = [...boites].sort((a, b) => a.haut - b.haut)
  for (let i = 1; i < triees.length; i++) {
    const a = triees[i - 1], b = triees[i]
    expect(a.bas, `${cas} · ${a.nom} recouvre ${b.nom}`).toBeLessThanOrEqual(b.haut)
  }
}

describe("l'affiche d'un poème", () => {
  it('aucune boîte de texte ne se recouvre, toutes tiennent dans la zone sûre', () => {
    let n = 0
    for (const texte of POEMES) for (const titre of TITRES) for (const image of IMAGES) {
      const a = composerAffichePoeme({ titre, texte, image }, mesurer)
      verifier(a.boites, `« ${texte.slice(0, 20)} » · titre ${titre.length} · image ${image ? `${image.w}×${image.h}` : 'aucune'}`)
      n++
    }
    expect(n).toBe(POEMES.length * TITRES.length * IMAGES.length)
  })

  it("l'illustration reste une vraie image, même sous un long poème", () => {
    for (const texte of POEMES) for (const image of IMAGES.slice(1)) {
      const a = composerAffichePoeme({ texte, image }, mesurer)
      expect(a.image).not.toBeNull()
      expect(Math.max(a.image!.w, a.image!.h)).toBeGreaterThanOrEqual(440)
      expect(a.image!.x).toBeGreaterThanOrEqual(96)
      expect(a.image!.x + a.image!.w).toBeLessThanOrEqual(STORY_W - 96)
    }
  })

  it("sur l'affiche illustrée, l'image passe avant le poème", () => {
    // Relevé sur les affiches régénérées après la grille : titre, trois vers
    // et une image 3:4 donnaient une planche de 418 × 557 — un timbre, 36 %
    // de la surface d'avant (693 × 924), parce que le poème se composait
    // d'abord et que l'image ne recevait que le reste.
    const avecTitre = composerAffichePoeme({ titre: 'Le vernis', texte: MOYEN, image: { w: 768, h: 1024 } }, mesurer).image!
    expect(avecTitre.h).toBeGreaterThanOrEqual(680)
    expect(avecTitre.w * avecTitre.h).toBeGreaterThanOrEqual(340_000)
    const sansTitre = composerAffichePoeme({ texte: MOYEN, image: { w: 768, h: 1024 } }, mesurer).image!
    expect(sansTitre.h).toBeGreaterThanOrEqual(760)
    // Le poème court garde un corps de lecture, pas une note de bas de page.
    expect(composerAffichePoeme({ titre: 'Le vernis', texte: COURT, image: { w: 768, h: 1024 } }, mesurer).corps.taille).toBeGreaterThanOrEqual(40)
    // Un poème long ne fait pas tomber l'image sous son plancher ; il garde
    // au moins trois vers avant « […] », deux sous un titre de deux lignes.
    TITRES.forEach((titre, i) => {
      const a = composerAffichePoeme({ titre, texte: long(22), image: { w: 768, h: 1024 } }, mesurer)
      expect(a.image!.h, `titre ${titre.length}`).toBeGreaterThanOrEqual(IMAGE_MIN)
      expect(a.corps.lignes.length, `titre ${titre.length}`).toBeGreaterThanOrEqual(i < 2 ? 4 : 3)
    })
  })

  it('un long poème se coupe sur « […] » plutôt que de déborder', () => {
    const a = composerAffichePoeme({ texte: long(40), image: { w: 768, h: 1024 } }, mesurer)
    expect(a.corps.lignes.at(-1)?.texte).toBe('[…]')
    const b = composerAffichePoeme({ texte: long(40) }, mesurer)
    expect(b.corps.lignes.at(-1)?.texte).toBe('[…]')
  })

  it('un poème court remonte au tiers optique au lieu de tomber au centre', () => {
    const a = composerAffichePoeme({ texte: COURT }, mesurer)
    const poeme = a.boites.find(b => b.nom === 'poème')!
    const lettrine = a.boites.find(b => b.nom === 'lettrine')!
    const milieu = (lettrine.haut + poeme.bas) / 2
    // Le centre de la zone de contenu est vers 912 ; le bloc doit être plus haut.
    expect(milieu).toBeLessThan(880)
  })

  it('la lettrine reste sur un poème court sans illustration', () => {
    expect(composerAffichePoeme({ texte: MOYEN }, mesurer).lettrine?.char).toBe('L')
  })

  it('la lettrine garde son blanc au-dessus du premier vers', () => {
    // Relevé dans Chromium au premier passage de la grille : 23 px entre le
    // pied du « L » et la hampe de « la cire », contre une soixantaine avant —
    // la lettrine semblait posée sur le vers. On mesure jusqu'au haut des
    // hampes (0,8 corps au-dessus de la ligne de base).
    for (const texte of [COURT, MOYEN, long(4)]) {
      const a = composerAffichePoeme({ texte }, mesurer)
      expect(a.lettrine, `« ${texte.slice(0, 20)} »`).not.toBeNull()
      const premier = a.corps.lignes[0]
      const blanc = premier.y - a.corps.taille * 0.8 - a.lettrine!.baseline
      expect(blanc, `« ${texte.slice(0, 20)} »`).toBeGreaterThanOrEqual(48)
    }
  })

  it('le pli passe dans le blanc entre deux lignes, jamais dans leurs lettres', () => {
    // Hauteur visible d'une ligne : 0,8 corps au-dessus de la ligne de base
    // (capitales, hampes), 0,3 en dessous (jambages). Le pli était posé à une
    // demi-interligne sous la ligne de base — dans les hampes de la suivante.
    const cas = [
      composerAffichePoeme({ texte: MOYEN }, mesurer).corps,
      composerAffichePoeme({ texte: MOYEN, image: { w: 768, h: 1024 } }, mesurer).corps,
      composerCorpsVideo({ texte: long(22) }, mesurer).corps,
    ]
    for (const c of cas) {
      expect(c.plis.length).toBeGreaterThan(0)
      for (const y of c.plis) {
        const i = c.lignes.findIndex(l => l.y > y) - 1
        expect(y, 'le pli touche les jambages de la ligne du dessus').toBeGreaterThan(c.lignes[i].y + 0.3 * c.taille)
        expect(y, 'le pli barre les hampes de la ligne du dessous').toBeLessThan(c.lignes[i + 1].y - 0.8 * c.taille)
      }
    }
  })

  it('le pli passe entre les fragments, jamais après le dernier', () => {
    const a = composerAffichePoeme({ texte: MOYEN }, mesurer)
    expect(a.corps.plis).toHaveLength(2)
    const derniere = a.corps.lignes.at(-1)!.y
    for (const y of a.corps.plis) expect(y).toBeLessThan(derniere)
  })
})

describe("l'affiche d'un dessin", () => {
  it('aucune boîte ne se recouvre, toutes tiennent dans la zone sûre', () => {
    const lecture = 'Un oiseau à jambes de notaire, qui porte une horloge à la place du ventre et marche sur la mer sans jamais se mouiller les chevilles ni la conscience, ce qui lui vaut la méfiance des mouettes.'
    for (const texte of ['', lecture]) for (const image of [null, ...IMAGES.slice(1), { w: 2400, h: 600 }]) {
      const a = composerAfficheDessin({ texte, image }, mesurer)
      verifier(a.boites, `dessin · lecture ${texte.length} · ${image ? `${image.w}×${image.h}` : 'aucune'}`)
    }
  })

  it('un rouleau très horizontal se couche à la verticale', () => {
    const a = composerAfficheDessin({ image: { w: 2400, h: 600 } }, mesurer)
    expect(a.image?.tourner).toBe(true)
    expect(a.image!.h).toBeGreaterThan(a.image!.w)
  })
})

describe('la vidéo suit la même grille', () => {
  it('le poème seul tient sous le titre, au-dessus de l’invitation', () => {
    for (const texte of POEMES) for (const titre of TITRES) {
      const v = composerCorpsVideo({ titre, texte }, mesurer)
      verifier(v.boites, `vidéo · « ${texte.slice(0, 20)} » · titre ${titre.length}`)
      for (const l of v.corps.lignes) expect(l.y).toBeLessThanOrEqual(Y.contenuBas)
    }
  })

  it('le poème en surimpression ne descend plus sur la marque', () => {
    for (const texte of POEMES) for (const titre of TITRES) {
      const v = composerSurimpression({ titre, texte }, mesurer)
      verifier(v.boites, `surimpression · « ${texte.slice(0, 20)} » · titre ${titre.length}`)
      expect(v.bas).toBeLessThanOrEqual(Y.contenuBas)
      expect(v.haut).toBeGreaterThanOrEqual(Y.contenuHaut)
    }
  })

  it('la lecture d’un dessin finit au-dessus de l’invitation', () => {
    const lecture = 'Un oiseau à jambes de notaire, qui porte une horloge à la place du ventre et marche sur la mer sans jamais se mouiller les chevilles ni la conscience, ce qui lui vaut la méfiance des mouettes.'
    const l = composerLectureVideo(lecture, mesurer)!
    verifier(l.boites, 'lecture vidéo')
    expect(l.lignes).toHaveLength(4)
    expect(composerLectureVideo('  ', mesurer)).toBeNull()
  })
})

describe('ce que le partage emporte', () => {
  afterEach(() => vi.unstubAllGlobals())
  const langue = (l: 'fr' | 'en') => vi.stubGlobal('localStorage', { getItem: () => l, setItem: () => {} })

  it("l'invitation est traduite et mène au poème du jour", () => {
    langue('fr')
    expect(invitationDuJour()).toBe('Ajoute ta main au poème du jour.')
    langue('en')
    expect(invitationDuJour()).toBe("Add your hand to today's poem.")
    expect(invitationDuJour()).not.toMatch(/main|cadavre/)
  })

  it("le texte de la feuille porte l'invitation et un lien", () => {
    langue('en')
    const t = texteDuPartage(invitationDuJour(), 'https://cadavre-exquis-beta.vercel.app/poeme-du-jour')
    expect(t).toContain("Add your hand to today's poem.")
    expect(t).toMatch(/https:\/\/\S+\/poeme-du-jour$/)
    // Sobre : ni emoji ni point d'exclamation.
    expect(t).not.toMatch(/[!\u{1F300}-\u{1FAFF}]/u)
  })
})
