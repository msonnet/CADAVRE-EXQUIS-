import { describe, it, expect } from 'vitest'
import { cadenceRetour, tirerPlan, voixEntendues, placerVoix, multiplicitesVoix } from '../pages/Atelier'

// Ces tests importaient une COPIE des fonctions d'Atelier.tsx, « pour ne pas
// dépendre du DOM ni de React ». La copie avait déjà divergé : elle tirait
// encore entre 5 et 27 vers et ignorait la répartition des voix. Un test qui
// vérifie un double ne vérifie rien. Vitest importe le module réel sans peine.

const NB_VOIX_MAX = 46 // VOICE_IDS.length

// ── Tests cadenceRetour ──────────────────────────────────────────────────────

describe('cadenceRetour', () => {
  it('returns [1, 2] for 1 voice (minimum cadence)', () => {
    expect(cadenceRetour(1)).toEqual([1, 2])
  })

  it('returns [2, 3] for maximum voices (slowest cadence)', () => {
    expect(cadenceRetour(NB_VOIX_MAX)).toEqual([2, 3])
  })

  it('always returns pasMin <= pasMax', () => {
    for (let n = 1; n <= NB_VOIX_MAX; n++) {
      const [min, max] = cadenceRetour(n)
      expect(min).toBeLessThanOrEqual(max)
    }
  })

  it('cadence increases monotonically with voice count', () => {
    const maxPrev = cadenceRetour(1)[1]
    let prev = maxPrev
    for (let n = 2; n <= NB_VOIX_MAX; n++) {
      const [, max] = cadenceRetour(n)
      expect(max).toBeGreaterThanOrEqual(prev)
      prev = max
    }
  })

  it('clamps below 1 to the same as 1', () => {
    expect(cadenceRetour(0)).toEqual(cadenceRetour(1))
  })

  it('clamps above max to the same as max', () => {
    expect(cadenceRetour(NB_VOIX_MAX + 10)).toEqual(cadenceRetour(NB_VOIX_MAX))
  })
})

// ── Tests tirerPlan ──────────────────────────────────────────────────────────

describe('tirerPlan — invariants structurels', () => {
  const RUNS = 200

  it('totalVers est toujours compris entre 5 et 37', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(4, true)
      expect(plan.totalVers).toBeGreaterThanOrEqual(5)
      expect(plan.totalVers).toBeLessThanOrEqual(37)
    }
  })

  it('le poème s\'allonge assez pour loger toutes les voix convoquées', () => {
    for (const nb of [46, 30, 12, 6]) {
      for (let i = 0; i < 60; i++) {
        const plan = tirerPlan(nb, true)
        // Il faut au moins ceil(nb / 5) vers porteurs : cinq voix par vers au plus.
        expect(Object.keys(plan.voixParVers).length).toBeGreaterThanOrEqual(Math.ceil(nb / 5))
      }
    }
  })

  it('mode seul : tous les vers reviennent au médium', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(0, false)
      expect(plan.toursJoueur.length).toBe(plan.totalVers)
      expect(plan.voixPool.length).toBe(0)
      expect(plan.toursFragmentJoueur).toEqual([])
    }
  })

  it('avec voix : le premier et le dernier vers appartiennent toujours au médium', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(3, true)
      expect(plan.toursJoueur).toContain(0)
      expect(plan.toursJoueur).toContain(plan.totalVers - 1)
    }
  })

  it('avec voix : au moins un vers est laissé aux voix', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(3, false)
      expect(plan.toursJoueur.length).toBeLessThan(plan.totalVers)
    }
  })

  it('voixPool contient exactement nbVoix éléments', () => {
    for (const n of [1, 5, 10, 46]) {
      const plan = tirerPlan(n, true)
      expect(plan.voixPool.length).toBe(n)
    }
  })

  it('toursJoueur est trié et sans doublons', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(4, true)
      const sorted = [...plan.toursJoueur].sort((a, b) => a - b)
      expect(plan.toursJoueur).toEqual(sorted)
      const unique = new Set(plan.toursJoueur)
      expect(unique.size).toBe(plan.toursJoueur.length)
    }
  })

  it('toursJoueur contient uniquement des indices valides (0 à totalVers-1)', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(4, true)
      for (const t of plan.toursJoueur) {
        expect(t).toBeGreaterThanOrEqual(0)
        expect(t).toBeLessThan(plan.totalVers)
      }
    }
  })

  it('echo est transmis fidèlement dans le plan', () => {
    const p1 = tirerPlan(2, true)
    const p2 = tirerPlan(2, false)
    expect(p1.echo).toBe(true)
    expect(p2.echo).toBe(false)
  })
})

// ── Tests toursFragmentJoueur ────────────────────────────────────────────────

describe('repartirVoix — la table ronde a vraiment lieu', () => {
  // Le tirage se faisait vers par vers sans mémoire : convoquer 46 voix n'en
  // faisait parler qu'une trentaine, et l'une d'elles jusqu'à huit fois.
  for (const nb of [46, 30, 12, 6, 3, 1]) {
    it(`${nb} voix convoquées : les ${nb} prennent la parole`, () => {
      for (let i = 0; i < 120; i++) {
        const plan = tirerPlan(nb, true)
        expect(voixEntendues(plan)).toBe(nb)
      }
    })
  }

  it('jamais deux fois la même voix sur un même vers', () => {
    for (const nb of [46, 12, 3]) {
      for (let i = 0; i < 80; i++) {
        const plan = tirerPlan(nb, true)
        for (const ligne of Object.values(plan.voixParVers)) {
          expect(new Set(ligne).size).toBe(ligne.length)
        }
      }
    }
  })

  it('au plus cinq voix sur un vers — le gabarit ne va pas au-delà', () => {
    for (const nb of [46, 30, 12]) {
      for (let i = 0; i < 80; i++) {
        const plan = tirerPlan(nb, true)
        for (const ligne of Object.values(plan.voixParVers)) {
          expect(ligne.length).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('au plus quatre voix sur un vers de fragment — le médium garde sa case', () => {
    for (let i = 0; i < 200; i++) {
      const plan = tirerPlan(46, true)
      for (const t of plan.toursFragmentJoueur) {
        expect((plan.voixParVers[t] ?? []).length).toBeLessThanOrEqual(4)
      }
    }
  })

  it('les index désignent toujours une voix du pool', () => {
    for (let i = 0; i < 120; i++) {
      const plan = tirerPlan(46, true)
      for (const ligne of Object.values(plan.voixParVers)) {
        for (const v of ligne) {
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThan(plan.voixPool.length)
        }
      }
    }
  })

  it('mode seul : aucune voix, aucune répartition', () => {
    for (let i = 0; i < 40; i++) {
      expect(Object.keys(tirerPlan(0, true).voixParVers)).toHaveLength(0)
    }
  })

  it('rotation : personne ne parle deux fois avant que tout le monde ait parlé', () => {
    for (let i = 0; i < 120; i++) {
      const plan = tirerPlan(12, true)
      const ordre = Object.keys(plan.voixParVers)
        .map(Number).sort((a, b) => a - b)
        .flatMap(v => plan.voixParVers[v])
      // Le premier tour de file couvre exactement les 12 voix, sans doublon.
      expect(new Set(ordre.slice(0, 12)).size).toBe(12)
    }
  })
})

describe('placerVoix — les mots-outils ne mangent pas une voix unique', () => {
  const OUTIL = 'conjonction-coord'
  const PLEIN = 'groupe-nominal'

  it('la case outil revient à la voix qui parle ailleurs', () => {
    // 7 parle deux fois dans le poème, 3 une seule.
    const place = placerVoix([3, 7], [OUTIL, PLEIN], { 3: 1, 7: 2 })
    expect(place[0]).toBe(7)
    expect(place[1]).toBe(3)
  })

  it('quel que soit l\'ordre de départ', () => {
    const place = placerVoix([7, 3], [OUTIL, PLEIN], { 3: 1, 7: 2 })
    expect(place[0]).toBe(7)
    expect(place[1]).toBe(3)
  })

  it('la case outil peut être ailleurs qu\'en tête', () => {
    const place = placerVoix([3, 7, 9], [PLEIN, PLEIN, OUTIL], { 3: 1, 7: 1, 9: 4 })
    expect(place[2]).toBe(9)
    expect(new Set(place)).toEqual(new Set([3, 7, 9]))
  })

  it('deux cases outils vont aux deux voix les plus présentes', () => {
    const place = placerVoix([1, 2, 3], [OUTIL, OUTIL, PLEIN], { 1: 1, 2: 3, 3: 2 })
    expect(place[2]).toBe(1)                       // l'unique garde la case pleine
    expect(new Set([place[0], place[1]])).toEqual(new Set([2, 3]))
  })

  it('toutes uniques : on ne prétend pas choisir, l\'ordre est rendu tel quel', () => {
    const depart = [4, 5, 6]
    expect(placerVoix(depart, [OUTIL, PLEIN, PLEIN], { 4: 1, 5: 1, 6: 1 })).toEqual(depart)
  })

  it('aucune case outil : rien ne bouge', () => {
    const depart = [4, 5]
    expect(placerVoix(depart, [PLEIN, PLEIN], { 4: 1, 5: 9 })).toEqual(depart)
  })

  it('rend toujours une permutation complète, sans trou ni doublon', () => {
    const types = [OUTIL, PLEIN, 'conjonction-subord', PLEIN, PLEIN]
    for (let i = 0; i < 300; i++) {
      const voix = [10, 11, 12, 13, 14]
      const mult: Record<number, number> = {}
      voix.forEach(v => { mult[v] = 1 + Math.floor(Math.random() * 3) })
      const place = placerVoix(voix, types, mult)
      expect(place).toHaveLength(voix.length)
      expect(place.every(v => typeof v === 'number')).toBe(true)
      expect(new Set(place)).toEqual(new Set(voix))
    }
  })

  it('sur un plan réel, une voix unique ne tombe jamais sur un mot-outil', () => {
    const types = [OUTIL, PLEIN, PLEIN, PLEIN, PLEIN]
    for (let i = 0; i < 300; i++) {
      const plan = tirerPlan(46, true)
      const mult = multiplicitesVoix(plan)
      for (const ligne of Object.values(plan.voixParVers)) {
        if (ligne.length < 2) continue
        const place = placerVoix(ligne, types.slice(0, ligne.length), mult)
        const surOutil = place[0]
        // Sauf si TOUTES les voix du vers sont uniques — là, rien à sauver.
        if (ligne.some(v => (mult[v] ?? 0) > 1)) {
          expect(mult[surOutil]).toBeGreaterThan(1)
        }
      }
    }
  })
})

describe('toursFragmentJoueur — invariants', () => {
  const RUNS = 200

  it('est un sous-ensemble de toursJoueur', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(10, true)
      for (const t of plan.toursFragmentJoueur) {
        expect(plan.toursJoueur).toContain(t)
      }
    }
  })

  it("ne contient jamais le premier ni le dernier vers", () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(10, true)
      expect(plan.toursFragmentJoueur).not.toContain(0)
      expect(plan.toursFragmentJoueur).not.toContain(plan.totalVers - 1)
    }
  })

  it('est toujours vide en mode seul', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(0, true)
      expect(plan.toursFragmentJoueur).toEqual([])
    }
  })

  it('probabilité croissante : plus de fragments avec plus de voix (statistique)', () => {
    // Sur 500 plans, le ratio moyen avec 46 voix doit être supérieur à celui avec 1 voix
    const SAMPLES = 500
    let ratioFaible = 0
    let ratioEleve = 0
    for (let i = 0; i < SAMPLES; i++) {
      const planFaible = tirerPlan(1, false)
      const planEleve = tirerPlan(46, false)
      const middleFaible = planFaible.toursJoueur.filter(t => t !== 0 && t !== planFaible.totalVers - 1).length
      const middleEleve = planEleve.toursJoueur.filter(t => t !== 0 && t !== planEleve.totalVers - 1).length
      if (middleFaible > 0) ratioFaible += planFaible.toursFragmentJoueur.length / middleFaible
      if (middleEleve > 0) ratioEleve += planEleve.toursFragmentJoueur.length / middleEleve
    }
    // 46 voix → ratio proche de 1.0 ; 1 voix → ratio proche de 1/46 ≈ 0.02
    expect(ratioEleve / SAMPLES).toBeGreaterThan(ratioFaible / SAMPLES)
  })
})

// ── Tests eviter — logique des conjonctions courtes ──────────────────────────

describe('eviter — conjonctions courtes', () => {
  const CONJ_COURTES = new Set(['or', 'si', 'en', 'et', 'ni'])

  function extraireConjCourtesUsees(versTextes: string[]): string[] {
    return versTextes.flatMap(texte => {
      const m = texte.trim().toLowerCase().match(/^[a-zà-ÿ]+/)
      return m && CONJ_COURTES.has(m[0]) ? [m[0]] : []
    })
  }

  it('détecte "or" en tête de vers', () => {
    expect(extraireConjCourtesUsees(['Or le silence attend'])).toContain('or')
  })

  it('détecte "en" en tête de vers (gérondif)', () => {
    expect(extraireConjCourtesUsees(['En tombant, la lumière tremble'])).toContain('en')
  })

  it('ne détecte pas "en" au milieu d\'un vers', () => {
    const result = extraireConjCourtesUsees(['La nuit en silence'])
    expect(result).not.toContain('en')
  })

  it('détecte plusieurs vers ayant des conjonctions différentes', () => {
    const result = extraireConjCourtesUsees(['Or le vent souffle', 'Et la pluie tombe', 'Si le ciel consent'])
    expect(result).toContain('or')
    expect(result).toContain('et')
    expect(result).toContain('si')
  })

  it("n'inclut pas les mots > 2 caractères qui ne sont pas des conjonctions", () => {
    const result = extraireConjCourtesUsees(['Le silence attend'])
    expect(result).not.toContain('le')
    expect(result).not.toContain('silence')
  })

  it('le filtre > 2 chars sur les mots principaux ne supprime pas les conjonctions courtes', () => {
    // Simulation de la construction de `eviter`
    const versTextes = ['Or le vent souffle']
    const conjCourtesUsees = extraireConjCourtesUsees(versTextes)
    const eviter = [
      ...versTextes.flatMap(v => v.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []).filter(m => m.length > 2),
      ...conjCourtesUsees,
    ]
    // 'or' ne serait PAS dans la liste principale (longueur 2), mais est ajouté par conjCourtesUsees
    expect(eviter).toContain('or')
    // Les mots longs sont bien présents
    expect(eviter).toContain('vent')
    expect(eviter).toContain('souffle')
    // 'le' (longueur 2) n'est pas dans la liste principale
    const fromMain = versTextes.flatMap(v => v.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []).filter(m => m.length > 2)
    expect(fromMain).not.toContain('le')
  })
})

// ── Tests budget de questions — miroir de la logique JeuAtelier ──────────────

describe('budget de questions par poème', () => {
  // Miroir du calcul dans ecrireVersIA : une question max par poème,
  // deux au-delà de XX vers — l'interrogatif reste un événement
  function questionsOk(versTextes: string[], totalVers: number): boolean {
    return versTextes.filter(t => t.includes('?')).length
      < Math.max(1, Math.floor(totalVers / 10))
  }

  it('autorise une question quand le poème n\'en contient aucune', () => {
    expect(questionsOk(['Le sel des heures', 'la nuit garde tout'], 19)).toBe(true)
  })

  it('bloque la deuxième question sur un poème de 19 vers', () => {
    expect(questionsOk(['Qui pleure sous la craie ?'], 19)).toBe(false)
  })

  it('autorise deux questions sur un poème de 20 vers ou plus', () => {
    expect(questionsOk(['Qui pleure sous la craie ?'], 20)).toBe(true)
    expect(questionsOk(['Qui veille ?', 'Où vont les ombres ?'], 27)).toBe(false)
  })

  it('budget minimal de 1 même pour les poèmes courts (5 vers)', () => {
    expect(questionsOk([], 5)).toBe(true)
    expect(questionsOk(['Que reste-t-il encore ?'], 5)).toBe(false)
  })

  it('compte les questions où qu\'elles soient dans le vers', () => {
    expect(questionsOk(['Pourquoi la terre tremble-t-elle la nuit ? murmure le vent'], 12)).toBe(false)
  })
})
