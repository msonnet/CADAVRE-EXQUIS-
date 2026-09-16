import { describe, it, expect } from 'vitest'
import {
  contrainteDuJour, jourLocal, tailleDuSac, STRUCTURES_DU_RITUEL,
  type ContrainteDuJour,
} from '../lib/contrainteDuJour'
import { STRUCTURES, STRUCTURES_EN, getStructure } from '../structures'

/**
 * La contrainte du jour — le rituel quotidien.
 *
 * Ce module est le seul du rituel qui se mesure, et il doit l'être : une
 * contrainte qui répète la même structure quatre jours d'affilée, ou qui
 * ramène « le cadavre » une semaine sur deux, n'est pas un rendez-vous,
 * c'est une boucle qu'on remarque et qu'on quitte.
 *
 * La méthode du projet s'applique telle quelle : d'abord l'instrument,
 * ensuite la cause. On compte les séries sur plusieurs années plutôt que de
 * décréter que « le hasard fera bien les choses ».
 */

/** Les contraintes de n jours consécutifs à partir d'une date. */
function serie(n: number, depart = new Date(2026, 8, 15)): ContrainteDuJour[] {
  const out: ContrainteDuJour[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(depart)
    d.setDate(d.getDate() + i)
    out.push(contrainteDuJour(d))
  }
  return out
}

describe('la contrainte est la même pour tous, le même jour', () => {
  it('ne dépend que de la date — deux lectures donnent le même résultat', () => {
    const d = new Date(2026, 8, 15, 4, 12)
    const soir = new Date(2026, 8, 15, 23, 58)
    expect(contrainteDuJour(d)).toEqual(contrainteDuJour(soir))
  })

  it('change au passage du jour', () => {
    const a = contrainteDuJour(new Date(2026, 8, 15))
    const b = contrainteDuJour(new Date(2026, 8, 16))
    expect(a.jour).not.toBe(b.jour)
    // Structure OU amorce doit bouger : deux jours identiques de bout en
    // bout donneraient deux fois le même rendez-vous.
    expect(a.structureId !== b.structureId || a.amorce !== b.amorce).toBe(true)
  })

  it('porte le jour local, comme la série et l’ambiance', () => {
    expect(contrainteDuJour(new Date(2026, 0, 3)).jour).toBe('2026-01-03')
    expect(jourLocal(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('l’amorce tient dans sa case', () => {
  it('n’emploie que des structures du cadavre écrit — jamais l’Atelier', () => {
    for (const c of serie(400)) {
      expect(STRUCTURES_DU_RITUEL).toContain(c.structureId)
      expect(c.structureId).not.toBe('atelier')
    }
  })

  it('appartient au vocabulaire de la structure du jour', () => {
    // Une amorce d'article + nom posée en tête d'un vers libre, ou un vers
    // entier posé dans la case « article + nom » de la phrase étoffée,
    // casserait la grammaire du jeu dès le premier mot.
    for (const c of serie(400)) {
      const mots = c.amorce.trim().split(/\s+/).length
      if (c.structureId === 'phrase-etoffee') {
        expect(mots, `« ${c.amorce} » — article + nom`).toBeLessThanOrEqual(2)
      }
      if (c.structureId === 'vers-libre') {
        expect(mots, `« ${c.amorce} » — un vers`).toBeGreaterThanOrEqual(3)
      }
      expect(c.amorce, 'une amorce ne se termine pas par un point').not.toMatch(/[.!?]$/)
      expect(c.amorce).toBe(c.amorce.trim())
    }
  })

  it('remplit une case que la structure possède vraiment', () => {
    for (const c of serie(200)) {
      const s = getStructure(c.structureId)
      const max = s.nombreCasesVariable?.max ?? s.cases.length
      expect(c.nbCases).toBeGreaterThanOrEqual(2)
      expect(c.nbCases).toBeLessThanOrEqual(max)
      if (!s.nombreCasesVariable) expect(c.nbCases).toBe(s.cases.length)
    }
  })
})

describe('le rendez-vous est un cadavre exquis, pas un exercice', () => {
  it('convoque toujours au moins une voix', () => {
    // Premier jet : zéro voix, pour ne jamais entamer l'encrier. Bonne
    // réponse économique, mauvaise réponse de jeu — un cadavre exquis écrit
    // d'une seule main n'en est pas un.
    for (const c of serie(3 * 365)) {
      expect(c.voixIA, `${c.jour}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('ne prend jamais la plume au joueur', () => {
    // Au-delà de la moitié des cases restantes, le poème cesserait d'être
    // aussi le sien. `buildSequence` entrelace : plus de voix que de cases
    // libres et le médium ne jouerait presque plus.
    for (const c of serie(3 * 365)) {
      const libres = c.nbCases - 1   // l'amorce occupe la première
      expect(c.voixIA, `${c.jour} : ${c.voixIA} voix pour ${libres} cases libres`)
        .toBeLessThanOrEqual(Math.max(1, Math.ceil(libres / 2)))
      expect(c.voixIA).toBeLessThanOrEqual(3)
    }
  })

  it('ne fige pas la table sur un seul nombre', () => {
    const nombres = new Set(serie(3 * 365).map(c => c.voixIA))
    expect(nombres.size, 'la table change d’un matin à l’autre').toBeGreaterThanOrEqual(2)
  })
})

describe('les deux langues reçoivent la MÊME contrainte', () => {
  it('les sacs français et anglais ont la même taille, structure par structure', () => {
    // C'est ce qui garantit qu'un index tiré en français désigne l'amorce
    // équivalente en anglais. Un sac plus court d'un côté et les deux
    // langues jouent deux jeux différents le même jour.
    for (const id of STRUCTURES_DU_RITUEL) {
      const fr = STRUCTURES.find(s => s.id === id)
      const en = STRUCTURES_EN.find(s => s.id === id)
      expect(fr, id).toBeTruthy()
      expect(en, id).toBeTruthy()
      expect(tailleDuSac(id), `sac de ${id}`).toBeGreaterThanOrEqual(20)
    }
  })
})

describe('le rituel ne tourne pas en rond — mesuré, pas décrété', () => {
  it('ne répète jamais une structure deux jours de suite', () => {
    // Un hachage direct sur trois valeurs donne des séries de quatre ou
    // cinq assez souvent. La file mélangée, garde-raccord compris, interdit
    // la répétition : mesuré sur trente ans, la série la plus longue est 1.
    const c = serie(3 * 365)
    let serieMax = 1, courante = 1
    for (let i = 1; i < c.length; i++) {
      courante = c[i].structureId === c[i - 1].structureId ? courante + 1 : 1
      if (courante > serieMax) serieMax = courante
    }
    expect(serieMax, `série la plus longue : ${serieMax}`).toBe(1)
  })

  it('ne redonne jamais le même rendez-vous deux matins de suite', () => {
    // C'est la faute que le premier jet contenait et que la mesure a sortie :
    // au raccord de deux sacs, structure ET amorce pouvaient se répéter d'un
    // jour à l'autre. Sur trente ans : zéro. Le test couvre dix ans, ce qui
    // suffit à retomber sur le cas s'il revenait.
    const c = serie(10 * 365)
    for (let i = 1; i < c.length; i++) {
      const repete = c[i].structureId === c[i - 1].structureId && c[i].amorce === c[i - 1].amorce
      expect(repete, `${c[i - 1].jour} et ${c[i].jour} : « ${c[i].amorce} »`).toBe(false)
    }
  })

  it('emploie les trois structures à parts sensiblement égales', () => {
    const c = serie(3 * 365)
    const comptes = new Map<string, number>()
    for (const x of c) comptes.set(x.structureId, (comptes.get(x.structureId) ?? 0) + 1)
    expect(comptes.size).toBe(3)
    for (const [id, n] of comptes) {
      const part = n / c.length
      expect(part, `${id} : ${(part * 100).toFixed(1)} %`).toBeGreaterThan(0.31)
      expect(part, `${id} : ${(part * 100).toFixed(1)} %`).toBeLessThan(0.36)
    }
  })

  it('espace les retours d’une amorce — borne mesurée, pas décrétée', () => {
    /*
      Premier jet : « pas de retour avant trente jours ». Faux, et le test
      l'a montré — une file qui se vide ne promet rien au RACCORD entre deux
      sacs, où la dernière entrée de l'un peut reparaître tôt dans l'autre.
      Décréter trente aurait donné un test qui casse un jour sur vingt.

      Distribution réelle, mesurée sur trente ans après le garde-raccord :
      min 4 jours, p01 12, p05 29, médiane 90, max 179 ; 1,13 % des retours
      sous quatorze jours. Les bornes ci-dessous encadrent cette mesure.
    */
    const c = serie(10 * 365)
    const dernierRang = new Map<string, number>()
    const ecarts: number[] = []
    c.forEach((x, i) => {
      const cle = `${x.structureId}|${x.amorce}`
      const vu = dernierRang.get(cle)
      if (vu !== undefined) ecarts.push(i - vu)
      dernierRang.set(cle, i)
    })
    expect(ecarts.length, 'il y a bien des retours à mesurer').toBeGreaterThan(100)

    const plusCourt = Math.min(...ecarts)
    expect(plusCourt, `retour le plus rapproché : ${plusCourt} jours`).toBeGreaterThanOrEqual(4)

    const rapproches = ecarts.filter(e => e < 14).length / ecarts.length
    expect(rapproches, `retours sous 14 jours : ${(rapproches * 100).toFixed(2)} %`).toBeLessThan(0.03)

    const mediane = [...ecarts].sort((a, b) => a - b)[Math.floor(ecarts.length / 2)]
    expect(mediane, `médiane : ${mediane} jours`).toBeGreaterThanOrEqual(60)
  })

  it('n’enferme pas le vers libre dans une seule longueur', () => {
    const longueurs = new Set(
      serie(3 * 365).filter(c => c.structureId === 'vers-libre').map(c => c.nbCases))
    expect(longueurs.size, 'plusieurs longueurs sur trois ans').toBeGreaterThanOrEqual(3)
  })
})
