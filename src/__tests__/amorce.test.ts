import { describe, it, expect } from 'vitest'
import { amorceDuJour, sacAmorces, MOTS_AMORCE_MAX } from '../lib/amorce'
import { dernierMot } from '../lib/jourLogique'

/**
 * L'amorce du jour — la tête de la chaîne.
 *
 * Premier jet : des amorces de six mots, « une porte qui donne sur la mer ».
 * C'était déjà un vers : il ne restait rien à faire à la première main, et
 * l'écho qu'elle transmettait venait d'un texte que personne n'avait écrit.
 * Une amorce n'est pas un vers, c'est ce à quoi le premier vers répond.
 */

function serie(n: number, depart = new Date(2026, 8, 17)) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(depart)
    d.setDate(d.getDate() + i)
    return amorceDuJour(d)
  })
}

describe('l’amorce est courte, et c’est une règle', () => {
  it('ne dépasse jamais trois mots', () => {
    // Déterminant + nom, déterminant + nom + adjectif, déterminant + nom +
    // verbe. Jamais plus — sinon la première main n'a plus rien à faire.
    for (const a of sacAmorces('fr')) {
      expect(a.split(/\s+/).length, `« ${a} »`).toBeLessThanOrEqual(MOTS_AMORCE_MAX)
      expect(a.split(/\s+/).length, `« ${a} »`).toBeGreaterThanOrEqual(2)
    }
    for (const a of sacAmorces('en')) {
      expect(a.split(/\s+/).length, `“${a}”`).toBeLessThanOrEqual(MOTS_AMORCE_MAX)
    }
  })

  it('ouvre sur un déterminant, jamais sur un verbe nu', () => {
    for (const a of sacAmorces('fr')) {
      expect(a, `« ${a} »`).toMatch(/^(le|la|les|un|une|des|l’)\s/)
    }
  })

  it('ne se termine pas par une ponctuation — l’écho la mangerait', () => {
    for (const a of [...sacAmorces('fr'), ...sacAmorces('en')]) {
      expect(a).not.toMatch(/[.!?,;:]$/)
      expect(a).toBe(a.trim())
    }
  })

  it('donne toujours un écho exploitable', () => {
    // C'est le seul usage réel de l'amorce : fournir un mot à la première
    // main. Une amorce dont le dernier mot s'évapore ne sert à rien.
    for (const a of sacAmorces('fr')) {
      expect(dernierMot(a).length, `« ${a} »`).toBeGreaterThan(1)
    }
  })
})

describe('les deux langues jouent la même journée', () => {
  it('les deux sacs ont la même taille', () => {
    // L'index est tiré sur le sac français et lu dans la langue active : un
    // sac plus court d'un côté et les deux langues jouent deux jeux
    // différents le même jour.
    expect(sacAmorces('en')).toHaveLength(sacAmorces('fr').length)
  })

  it('le sac est assez grand pour ne pas se répéter dans le mois', () => {
    expect(sacAmorces('fr').length).toBeGreaterThanOrEqual(30)
  })
})

describe('le rendez-vous ne tourne pas en rond', () => {
  it('ne dépend que de la date', () => {
    const matin = new Date(2026, 8, 17, 6, 0)
    const soir = new Date(2026, 8, 17, 23, 59)
    expect(amorceDuJour(matin)).toEqual(amorceDuJour(soir))
  })

  it('change tous les jours', () => {
    const c = serie(60)
    for (let i = 1; i < c.length; i++) {
      expect(c[i].texte, `${c[i - 1].jour} → ${c[i].jour}`).not.toBe(c[i - 1].texte)
    }
  })

  it('espace les retours — borne mesurée, pas décrétée', () => {
    /*
      Le sac se vide un tirage par JOUR. Avec le garde-raccord d'origine —
      une seule entrée écartée — la même amorce revenait parfois à DEUX jours
      d'écart : 0,17 % des retours, soit deux fois l'an, sur la seule chose
      que la page montre chaque matin.

      Fenêtre portée à quatre. Mesuré sur trente ans : min 5, p01 7, p05 13,
      médiane 41, et les quarante et une amorces sortent toutes. Les bornes
      ci-dessous encadrent cette mesure au lieu de la décréter.
    */
    const c = serie(10 * 365)
    const vu = new Map<string, number>()
    const ecarts: number[] = []
    c.forEach((a, i) => {
      const p = vu.get(a.texte)
      if (p !== undefined) ecarts.push(i - p)
      vu.set(a.texte, i)
    })
    expect(ecarts.length).toBeGreaterThan(100)
    expect(Math.min(...ecarts), `retour le plus rapproché : ${Math.min(...ecarts)} jours`)
      .toBeGreaterThanOrEqual(5)

    const rapproches = ecarts.filter(e => e < 7).length / ecarts.length
    expect(rapproches, `retours sous 7 jours : ${(rapproches * 100).toFixed(2)} %`).toBeLessThan(0.02)

    const mediane = [...ecarts].sort((a, b) => a - b)[Math.floor(ecarts.length / 2)]
    expect(mediane, `médiane : ${mediane} jours`).toBeGreaterThanOrEqual(30)

    expect(new Set(c.map(a => a.texte)).size, 'tout le sac finit par sortir')
      .toBe(sacAmorces('fr').length)
  })
})
