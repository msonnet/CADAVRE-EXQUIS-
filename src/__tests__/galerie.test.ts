import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('../i18n', () => ({ tr: (fr: string) => fr, langueActuelle: () => 'fr' }))

import {
  versPublies, incipit, tetePublication, estAnonyme, motifExact, memePseudo, attributionPubliee,
  aDesCoutures, REACTIONS, libelleEchos, libelleLectures, retenusDeLaSemaine,
  nouvelles, phraseNouvelles, phraseCourrier, extraitCourt, correspond, dateSignature,
  type Publication, type PoemePublie,
} from '../lib/galerie'
import { lienDe } from '../lib/publier'

/**
 * La galerie se lit comme le sommaire d'une revue — audit du 30 septembre.
 *
 * Trois fautes mesurées à l'écran avant correction :
 * - le titre de repli collait les cases par « · » et se coupait à 48 signes
 *   (« le vernis · craquelé · avale · une lampe… ») ;
 * - l'aperçu empilait les cases, une par ligne (« le vernis / craquelé ») ;
 * - les réactions et les vues étaient des emoji (🌙, 👁), en couleur sur iOS.
 *
 * Et une quatrième, plus basse : le feuillet ignorait qu'il avait été
 * publié, si bien que l'auteur ne pouvait jamais apprendre qu'il avait été lu.
 */

const SRC = join(__dirname, '..')
const lire = (f: string) => readFileSync(join(SRC, f), 'utf8')

const c = (texte: string, extra: Record<string, unknown> = {}) => ({
  numero: 0, fonction: '', consigne: '', auteur: 'humain' as const, texte, ts: 0, ...extra,
})

const VERNIS: PoemePublie = {
  structureId: 'phrase-etoffee', langue: 'fr', titre: null,
  cases: [
    c('le vernis', { fonction: 'sujet' }),
    c('craquelé', { fonction: 'adjectif du sujet', auteur: 'ia', voixNom: 'greffier' }),
    c('avale'),
    c('une lampe', { auteur: 'ia', voixNom: 'meteorologue' }),
    c('sourde'),
  ],
}

function pub(p: PoemePublie, extra: Partial<Publication> = {}): Publication {
  return {
    id: 'g1', type: 'poeme', titre: null, payload: JSON.stringify(p), image_url: null,
    author_pseudo: 'Mireille', author_avatar: null, author_id: 'u1',
    created_at: '2026-09-29T10:00:00Z', views_count: 14, ...extra,
  }
}

describe('le poème entier, et non ses fragments', () => {
  it('une phrase étoffée se recoud en UN vers, comme au recueil', () => {
    expect(versPublies(VERNIS)).toEqual(['le vernis craquelé avale une lampe sourde'])
  })

  it('la phrase courte garde ses séparateurs', () => {
    const v = versPublies({ structureId: 'phrase-simple', langue: 'fr', cases: [c('la baleine infirme'), c('repasse'), c('les dimanches de verre')] })
    expect(v).toHaveLength(1)
    expect(v[0]).toContain('la baleine infirme')
    expect(v[0]).toContain('les dimanches de verre')
  })

  it('le vers libre garde un vers par case', () => {
    expect(versPublies({ structureId: 'vers-libre', langue: 'fr', cases: [c('un'), c('deux'), c('trois')] })).toEqual(['un', 'deux', 'trois'])
  })

  it('le titre de repli est l’incipit ENTIER — ni « · », ni coupe à 48 signes', () => {
    const t = tetePublication(pub(VERNIS))
    expect(t).toBe('le vernis craquelé avale une lampe sourde')
    expect(t).not.toContain('·')
    expect(incipit(VERNIS)).toBe(t)
  })

  it('le titre donné passe avant l’incipit', () => {
    expect(tetePublication(pub(VERNIS, { titre: 'Le Sel nocturne' }))).toBe('Le Sel nocturne')
  })

  it('une publication ancienne, cases réduites à leur texte, se lit encore', () => {
    const v = versPublies({ structureId: 'phrase-etoffee', cases: [{ texte: 'le vernis' }, { texte: 'craquelé' }, { texte: 'avale' }, { texte: 'une lampe' }, { texte: 'sourde' }] })
    expect(v).toEqual(['le vernis craquelé avale une lampe sourde'])
  })

  it('aucun écran de la galerie ne joint plus les cases lui-même', () => {
    for (const f of ['pages/Galerie.tsx', 'pages/ProfilPublic.tsx', 'components/EntreeGalerie.tsx']) {
      const s = lire(f)
      expect(s, f).not.toMatch(/\.map\(\s*\w+\s*=>\s*\w+\.texte\s*\)\s*\.join\(/)
    }
  })

  it('la recherche lit aussi le poème', () => {
    expect(correspond(pub(VERNIS), 'lampe sourde')).toBe(true)
    expect(correspond(pub(VERNIS), 'MIREILLE')).toBe(true)
    expect(correspond(pub(VERNIS), 'baleine')).toBe(false)
  })
})

describe('les coutures, lues par un inconnu', () => {
  it('la main qui publie est nommée, et non « toi »', () => {
    expect(attributionPubliee(VERNIS.cases[0], 'Mireille').texte).toBe('Mireille')
  })

  it('une voix garde son nom', () => {
    const a = attributionPubliee(VERNIS.cases[1], 'Mireille')
    expect(a.voix.join(' ')).toMatch(/greffier/i)
  })

  it('les mains d’un salon gardent leur nom, la sienne prend celui de qui publie', () => {
    expect(attributionPubliee(c('x', { pseudo: 'Ondine' }), 'Mireille').texte).toBe('Ondine')
    expect(attributionPubliee(c('x', { moi: true }), 'Mireille').texte).toBe('Mireille')
  })

  it('une case sans auteur ne s’attribue à personne', () => {
    expect(attributionPubliee({ texte: 'x' }, 'Mireille').texte).toBe('une main')
    expect(aDesCoutures({ structureId: 'vers-libre', cases: [{ texte: 'x' }] })).toBe(false)
    expect(aDesCoutures(VERNIS)).toBe(true)
  })

  it('un vers d’atelier écrit avec des voix dit qui les a tenues', () => {
    const a = attributionPubliee(c('x', { auteur: 'mixte', nbVoix: 2, voixNom: "Le greffier · L'horloger" }), 'Mireille')
    expect(a.texte).toBe('Mireille et 2 voix')
    expect(a.voix).toHaveLength(2)
  })
})

describe('des signes de la maison, pas des emoji', () => {
  // Un caractère a une présentation emoji par défaut, ou vit dans le plan
  // des pictogrammes (au-delà de U+FFFF) qu'aucune des trois familles de la
  // maison ne dessine — et le repli système y met n'importe quoi.
  const emoji = /\p{Emoji_Presentation}|[\u{10000}-\u{10FFFF}]/u

  it('les quatre réactions s’impriment en signes typographiques', () => {
    for (const r of REACTIONS) expect(r.signe, r.cle).not.toMatch(emoji)
  })

  it('les clés écrites en base ne changent pas — les réactions passées restent comptées', () => {
    expect(REACTIONS.map(r => r.cle)).toEqual(['🌙', '✦', '❀', '🜔'])
  })

  it('les écrans de la galerie n’impriment aucun emoji', () => {
    for (const f of ['pages/Galerie.tsx', 'pages/ProfilPublic.tsx', 'components/EntreeGalerie.tsx', 'components/MentionPublication.tsx']) {
      // Les commentaires peuvent citer l'ancien emoji ; le code, non.
      const code = lire(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      expect(code, f).not.toMatch(emoji)
    }
  })

  it('les vues deviennent des LECTURES, et zéro se tait', () => {
    expect(libelleLectures(0)).toBe('')
    expect(libelleLectures(1)).toBe('1 LECTURE')
    expect(libelleEchos({ lectures: 14, reactions: { '🌙': 3, '✦': 0, '🜔': 1 } })).toBe('☾ 3 · ⁂ 1 · 14 LECTURES')
    expect(libelleEchos({ lectures: 0, reactions: {} })).toBe('')
  })
})

describe('la signature', () => {
  it('« Anonyme » n’est l’auteur de personne', () => {
    expect(estAnonyme('Anonyme')).toBe(true)
    expect(estAnonyme(' anonymous ')).toBe(true)
    expect(estAnonyme('Mireille')).toBe(false)
  })

  it('un pseudo cherché par ilike vaut une égalité', () => {
    expect(motifExact('M_reille%')).toBe('M\\_reille\\%')
  })

  it('« * », que PostgREST change en %, ne rattrape plus les autres pseudos', () => {
    // `M*` partait tel quel : la page de « M* » rassemblait tous les M.
    expect(motifExact('M*')).not.toContain('*')
    expect(motifExact('M*')).toBe('M_')
    // Le motif ramène large, l'égalité trie au retour.
    expect(['M*', 'Mo', 'Mireille', 'm*'].filter(p => memePseudo(p, 'M*'))).toEqual(['M*', 'm*'])
    expect(lire('pages/ProfilPublic.tsx')).toMatch(/memePseudo\(/)
  })

  it('la date tait l’année quand c’est celle-ci', () => {
    expect(dateSignature('2026-09-29T10:00:00Z', new Date('2026-10-01T00:00:00Z'))).toBe('29 SEPTEMBRE')
    expect(dateSignature('2025-09-29T10:00:00Z', new Date('2026-10-01T00:00:00Z'))).toBe('29 SEPTEMBRE 2025')
  })
})

describe('la semaine des lecteurs', () => {
  const t0 = Date.parse('2026-10-01T12:00:00Z')
  const il = (h: number) => new Date(t0 - h * 3600e3).toISOString()

  it('retient les plus lus des sept derniers jours, sans les plus anciens', () => {
    const rows = [
      { gallery_id: 'a', emoji: '🌙', reactor_key: 'k1', created_at: il(1) }, { gallery_id: 'a', emoji: '✦', reactor_key: 'k2', created_at: il(2) },
      { gallery_id: 'b', emoji: '❀', reactor_key: 'k1', created_at: il(3) },
      { gallery_id: 'c', emoji: '🌙', reactor_key: 'k1', created_at: il(24 * 8) }, { gallery_id: 'c', emoji: '🌙', reactor_key: 'k2', created_at: il(24 * 9) }, { gallery_id: 'c', emoji: '🌙', reactor_key: 'k3', created_at: il(24 * 10) },
    ]
    expect(retenusDeLaSemaine(rows, t0)).toEqual(['a', 'b'])
  })

  it('à égalité, la réaction la plus récente l’emporte', () => {
    expect(retenusDeLaSemaine([
      { gallery_id: 'x', emoji: '🌙', reactor_key: 'k', created_at: il(5) },
      { gallery_id: 'y', emoji: '🌙', reactor_key: 'k', created_at: il(1) },
    ], t0)).toEqual(['y', 'x'])
  })

  // L'insertion est ouverte à tous, `emoji` est un texte libre : compter
  // les lignes brutes laissait hisser son poème en tête à coups de lignes.
  it('ne compte que les quatre réactions du jeu', () => {
    const fausses = Array.from({ length: 50 }, (_, i) => ({ gallery_id: 'triche', emoji: 'x', reactor_key: `f${i}`, created_at: il(1) }))
    const vraies = [{ gallery_id: 'lu', emoji: '✦', reactor_key: 'k', created_at: il(2) }]
    expect(retenusDeLaSemaine([...fausses, ...vraies], t0)).toEqual(['lu'])
  })

  it('un lecteur compte une fois par publication, quelles que soient ses réactions', () => {
    const un = REACTIONS.map(r => ({ gallery_id: 'seul', emoji: r.cle, reactor_key: 'k', created_at: il(1) }))
    const deux = [
      { gallery_id: 'deux', emoji: '🌙', reactor_key: 'k1', created_at: il(3) },
      { gallery_id: 'deux', emoji: '🌙', reactor_key: 'k2', created_at: il(3) },
    ]
    expect(retenusDeLaSemaine([...un, ...deux], t0)).toEqual(['deux', 'seul'])
  })

  it('une publication supprimée quitte aussi le sommaire de la semaine', () => {
    const s = lire('pages/Galerie.tsx')
    const corps = s.slice(s.indexOf('const supprimerItem'), s.indexOf('const chargerItems'))
    expect(corps).toMatch(/setRetenus\(prev => prev\.filter/)
  })
})

describe('le courrier de l’auteur', () => {
  it('ne compte que ce qui est arrivé depuis le dernier relevé', () => {
    const n = nouvelles({ a: { l: 10, r: 1 }, b: { l: 3, r: 0 } }, { a: { l: 13, r: 2 }, b: { l: 3, r: 0 } })
    expect(n).toEqual([{ id: 'a', lectures: 3, reactions: 1 }])
  })

  it('une publication jamais relevée compte tout ce qu’elle a reçu', () => {
    expect(nouvelles(null, { a: { l: 2, r: 0 } })).toEqual([{ id: 'a', lectures: 2, reactions: 0 }])
  })

  it('la phrase ne dit jamais « 0 »', () => {
    expect(phraseNouvelles({ lectures: 3, reactions: 1 })).toBe('3 lectures et une réaction')
    expect(phraseNouvelles({ lectures: 0, reactions: 2 })).toBe('2 réactions')
    expect(phraseNouvelles({ lectures: 1, reactions: 0 })).toBe('une lecture')
  })

  it('« depuis ton dernier passage » seulement s’il y a eu un passage', () => {
    expect(phraseCourrier('le vernis', { lectures: 2, reactions: 0 }, true)).toBe('« le vernis » — 2 lectures depuis ton dernier passage.')
    expect(phraseCourrier('le vernis', { lectures: 2, reactions: 0 }, false)).toBe('« le vernis » — 2 lectures.')
    expect(phraseCourrier('le vernis', { lectures: 2, reactions: 0 }, false, 2)).toContain('2 autres de tes feuillets')
  })

  it('l’extrait se coupe au mot', () => {
    expect(extraitCourt('le vernis craquelé avale une lampe sourde au fond du puits', 30)).toBe('le vernis craquelé avale une…')
  })
})

describe('le feuillet garde sa publication', () => {
  it('la ligne rendue par la base devient le lien du feuillet', () => {
    expect(lienDe({ id: 'g1', created_at: '2026-09-22T10:00:00Z' })).toEqual({ id: 'g1', date: Date.parse('2026-09-22T10:00:00Z') })
  })

  it('sans ligne rendue, le feuillet reste marqué publié — sans compteurs', () => {
    const l = lienDe(null)
    expect(l.id).toBeUndefined()
    expect(l.date).toBeGreaterThan(0)
  })

  it('le feuillet ne redevient plus publiable deux secondes après « PUBLIÉ »', () => {
    for (const f of ['pages/PoemeDetail.tsx', 'pages/DessinDetail.tsx']) {
      const s = lire(f)
      expect(s, f).not.toMatch(/setPublished\(false\)/)
      expect(s, f).toMatch(/marquer(Dessin)?Publie\(/)
    }
  })

  // Recharger la page de fin d'un salon rendait « ✦ GALERIE » : l'état
  // repartait de `false` sans lire le feuillet, et le poème repartait.
  it('la page de fin d’un salon relit la publication de son feuillet', () => {
    const s = lire('pages/FinOnline.tsx')
    expect(s).toMatch(/chargerPoeme\(idSalon\(code\)\)/)
    expect(s).toMatch(/chargerDessin\(idDessinSalon\(code\)\)/)
    // Le dessin a un feuillet par salon, et non un par appui.
    expect(s).not.toMatch(/dessin-online-\$\{Date\.now\(\)/)
  })

  it('la salle publie les noms des mains, pas des cases nues', () => {
    const s = lire('pages/FinOnline.tsx')
    expect(s).not.toMatch(/cases\s*=\s*\w+\.map\(\s*\w+\s*=>\s*\(\{\s*texte:/)
    expect(s).toMatch(/publierPoeme\(/)
  })
})
