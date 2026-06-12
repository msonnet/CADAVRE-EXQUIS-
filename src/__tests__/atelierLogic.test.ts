import { describe, it, expect } from 'vitest'

// ── Fonctions miroir de Atelier.tsx (exportées) ──────────────────────────────
// On teste les invariants sans dépendre du DOM ni des imports React.

const NB_VOIX_MAX = 46 // VOICE_IDS.length

function cadenceRetour(nbVoix: number): [number, number] {
  const t = (Math.min(Math.max(nbVoix, 1), NB_VOIX_MAX) - 1) / (NB_VOIX_MAX - 1)
  return [Math.round(1 + t * 2), Math.round(2 + t * 4)]
}

interface PlanAtelier {
  totalVers: number
  toursJoueur: number[]
  toursFragmentJoueur: number[]
  voixPool: string[]
  echo: boolean
}

const VOICE_IDS: string[] = Array.from({ length: NB_VOIX_MAX }, (_, i) => `voix-${i}`)

function tirerPlan(nbVoix: number, echo: boolean): PlanAtelier {
  const totalVers = 5 + Math.floor(Math.random() * 23)
  if (nbVoix === 0) {
    return {
      totalVers,
      toursJoueur: Array.from({ length: totalVers }, (_, i) => i),
      toursFragmentJoueur: [],
      voixPool: [],
      echo,
    }
  }
  const [pasMin, pasMax] = cadenceRetour(nbVoix)
  const tours = [0]
  let curseur = 0
  for (;;) {
    const pas = pasMin + Math.floor(Math.random() * (pasMax - pasMin + 1))
    const suivant = curseur + pas
    if (suivant >= totalVers - 1) break
    tours.push(suivant)
    curseur = suivant
  }
  tours.push(totalVers - 1)
  if (tours.length >= totalVers) {
    tours.splice(1 + Math.floor(Math.random() * (tours.length - 2)), 1)
  }
  const pool = [...VOICE_IDS].sort(() => Math.random() - 0.5).slice(0, nbVoix)
  const probFragment = nbVoix / NB_VOIX_MAX
  const toursFragmentJoueur = tours.filter(
    t => t !== 0 && t !== totalVers - 1 && Math.random() < probFragment
  )
  return { totalVers, toursJoueur: tours, toursFragmentJoueur, voixPool: pool, echo }
}

// ── Tests cadenceRetour ──────────────────────────────────────────────────────

describe('cadenceRetour', () => {
  it('returns [1, 2] for 1 voice (minimum cadence)', () => {
    expect(cadenceRetour(1)).toEqual([1, 2])
  })

  it('returns [3, 6] for maximum voices (slowest cadence)', () => {
    expect(cadenceRetour(NB_VOIX_MAX)).toEqual([3, 6])
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

  it('totalVers est toujours compris entre 5 et 27', () => {
    for (let i = 0; i < RUNS; i++) {
      const plan = tirerPlan(4, true)
      expect(plan.totalVers).toBeGreaterThanOrEqual(5)
      expect(plan.totalVers).toBeLessThanOrEqual(27)
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
