import { describe, it, expect } from 'vitest'
import {
  FAMILLE, GardeOuverture, HORS_GN, PROFILS,
  diagnostic, familleDe, souder, tirerStrategie,
} from '../lib/determinants'
import { determinantDeCase, motsInterdits, piocherReserve, tirerGabarit } from '../pages/JeuAtelier'

// Un générateur reproductible — les mesures doivent tomber deux fois pareil
function des(graine: number): () => number {
  let x = graine
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296
    return x / 4294967296
  }
}

// Un mot d'attelage en tête change ce sur quoi le VERS ouvre : « sous un
// trésor » commence par une préposition, pas par un groupe nominal, même si la
// case, elle, en est un.
const EST_GN = (f: { type: string; avant?: string }) =>
  !f.avant && (f.type === 'groupe-nominal' || f.type === 'groupe-nominal-riche')

// Le déterminant témoin de chaque stratégie — pour fabriquer un vers de test
const TEMOIN: Record<string, string> = {
  defini: 'le', indefini: 'un', partitif: 'du', demonstratif: 'ce',
  poss_1s: 'mon', poss_2s: 'ton', poss_3s: 'son', poss_2p: 'votre',
  juridique: 'ledit', quantifieur: 'chaque', negatif: 'nul', zero: '',
}

// ── Le diagnostic : d'abord, savoir mesurer ce que l'oreille entendait ─────

describe('diagnostic', () => {
  it('retrouve la litanie de « le » qui a motivé tout ceci', () => {
    // La forme exacte du poème mesuré : douze vers de suite sur l'article défini
    const avant = [
      'en tombant, la calotte collationne le limon',
      'le carnet de bord chavire',
      "la remige s'effrite sans bruit",
      'le persillé pèse sur le monde',
      'la nacre du seuil demeure',
      "l'écluse retient son souffle",
      'le lierre fissure le mur',
      'la suie recouvre les heures',
      'le givre apprivoise la pierre',
      "l'ambre garde une lumière",
      'le sel ronge la nuit',
      'la craie efface les seuils',
      "l'écume revient sur le seuil",
    ]
    const d = diagnostic(avant)
    expect(d.plusLongueSerie).toBe(12)
    expect(d.familleDeLaSerie).toBe('DEF')
    expect(d.tauxDefini).toBeGreaterThan(0.9)
  })

  it('reconnaît chaque famille de déterminant, en français comme en anglais', () => {
    expect(familleDe('le silence tombe')).toBe('DEF')
    expect(familleDe('une ombre passe')).toBe('IND')
    expect(familleDe('du sable coule')).toBe('PART')
    expect(familleDe('cette faille respire')).toBe('DEM')
    expect(familleDe('mon ombre attend')).toBe('POSS')
    expect(familleDe('chaque fêlure compte')).toBe('QUANT')
    expect(familleDe('poussière et cendre')).toBe('ZERO')
    expect(familleDe('quand la nuit tombe')).toBe(HORS_GN)
    expect(familleDe('en tombant, la pluie creuse')).toBe(HORS_GN)

    expect(familleDe('the silence falls')).toBe('DEF')
    expect(familleDe('a shadow passes')).toBe('IND')
    expect(familleDe('some soot settles')).toBe('PART')
    expect(familleDe('this rift breathes')).toBe('DEM')
    expect(familleDe('my shadow waits')).toBe('POSS')
    expect(familleDe('each crack counts')).toBe('QUANT')
    expect(familleDe('when the night falls')).toBe(HORS_GN)
  })

  it("ne compte pas comme série les vers qui n'ouvrent pas sur un déterminant", () => {
    const d = diagnostic(['quand la nuit tombe', 'lorsque le sel monte', 'ainsi va le givre'])
    expect(d.plusLongueSerie).toBe(1)
  })
})

// ── L'idiolecte ────────────────────────────────────────────────────────────

describe('tirerStrategie', () => {
  it('ne rend que des stratégies du profil de la voix', () => {
    const rng = des(7)
    for (const [voix, profil] of Object.entries(PROFILS)) {
      // Les stratégies plurielles se replient sur leur singulier : le numéral
      // (« trois seuils ») devient un indéfini, faute de quoi le verbe écrit
      // par une AUTRE voix accorderait au singulier un sujet pluriel.
      const attendues = new Set(Object.keys(profil).map(k => k === 'numeral' ? 'IND' : FAMILLE[k]))
      for (let i = 0; i < 40; i++) {
        expect(attendues.has(FAMILLE[tirerStrategie(voix, new Set(), rng)])).toBe(true)
      }
    }
  })

  it('respecte les familles interdites tant qu\'il reste un choix', () => {
    const rng = des(11)
    for (let i = 0; i < 500; i++) {
      const s = tirerStrategie('boucher', new Set(['PART']), rng)
      expect(FAMILLE[s]).not.toBe('PART')
    }
  })

  it('ne met jamais le nom au pluriel — le verbe est écrit par une autre voix', () => {
    const rng = des(13)
    const pluriels = new Set(['defini_pl', 'indefini_pl', 'numeral'])
    for (const voix of Object.keys(PROFILS)) {
      for (let i = 0; i < 30; i++) {
        expect(pluriels.has(tirerStrategie(voix, new Set(), rng))).toBe(false)
      }
    }
  })

  it('sépare vraiment les voix : le boucher part du partitif, le télégraphiste du nom nu', () => {
    const rng = des(3)
    const compter = (voix: string, cible: string) => {
      let n = 0
      for (let i = 0; i < 600; i++) if (tirerStrategie(voix, new Set(), rng) === cible) n++
      return n / 600
    }
    expect(compter('boucher', 'partitif')).toBeGreaterThan(0.3)
    expect(compter('telegraphiste', 'zero')).toBeGreaterThan(0.3)
    expect(compter('enfant', 'poss_1s')).toBeGreaterThan(0.3)
    expect(compter('psalmiste', 'zero')).toBeGreaterThan(0.3)
  })

  it("rend quand même quelque chose quand tout est interdit", () => {
    const s = tirerStrategie('boucher', new Set(['DEF', 'IND', 'PART', 'DEM', 'POSS', 'QUANT', 'ZERO', 'NUM']))
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
  })
})

// ── La garde d'ouverture ──────────────────────────────────────────────────

describe('GardeOuverture', () => {
  it('interdit la famille qui vient de servir deux fois de suite', () => {
    const g = new GardeOuverture()
    expect(g.famillesInterdites().size).toBe(0)
    g.enregistrer('DEF')
    expect(g.famillesInterdites().size).toBe(0)
    g.enregistrer('DEF')
    expect(g.famillesInterdites().has('DEF')).toBe(true)
    g.enregistrer('PART')
    expect(g.famillesInterdites().size).toBe(0)
  })

  it("n'interdit rien après deux ouvertures hors groupe nominal", () => {
    const g = new GardeOuverture()
    g.enregistrer(HORS_GN)
    g.enregistrer(HORS_GN)
    expect(g.famillesInterdites().size).toBe(0)
  })

  it('réclame une ouverture hors groupe nominal au bout de trois à six vers', () => {
    for (const graine of [1, 2, 3, 5, 8, 13]) {
      const g = new GardeOuverture({ rng: des(graine) })
      let i = 0
      while (!g.exigeOuvertureHorsGN() && i < 20) { g.enregistrer('DEF'); i++ }
      expect(i).toBeGreaterThanOrEqual(3)
      expect(i).toBeLessThanOrEqual(6)
    }
  })

  it('repart avec la mémoire du brouillon rouvert', () => {
    const g = new GardeOuverture({ histoire: ['DEF', 'DEF'] })
    expect(g.famillesInterdites().has('DEF')).toBe(true)
  })
})

// ── Le gabarit, quand la garde réclame autre chose qu'un groupe nominal ───

describe("tirerGabarit — l'ouverture hors groupe nominal", () => {
  it("n'ouvre jamais sur un groupe nominal quand la garde l'exige", () => {
    for (const n of [2, 3, 4, 5]) {
      for (let i = 0; i < 300; i++) {
        expect(EST_GN(tirerGabarit(n, true, true, true)[0])).toBe(false)
      }
    }
  })

  it("y arrive même sans les cases outils", () => {
    for (const n of [2, 3, 4, 5]) {
      for (let i = 0; i < 300; i++) {
        const g = tirerGabarit(n, true, false, true)
        expect(EST_GN(g[0])).toBe(false)
        expect(g.some(f => f.type.startsWith('conjonction'))).toBe(false)
      }
    }
  })

  it('laisse le gabarit libre quand la garde ne demande rien', () => {
    let nominaux = 0
    for (let i = 0; i < 400; i++) if (EST_GN(tirerGabarit(3)[0])) nominaux++
    expect(nominaux).toBeGreaterThan(0)
  })
})

// ── Ce qu'on envoie au serveur ────────────────────────────────────────────

describe('determinantDeCase', () => {
  it("ne s'applique qu'aux cases qui commencent par un déterminant", () => {
    expect(determinantDeCase('groupe-nominal', 'boucher')).toBeTruthy()
    expect(determinantDeCase('groupe-nominal-riche', 'boucher')).toBeTruthy()
    expect(determinantDeCase('verbe', 'boucher')).toBeUndefined()
    expect(determinantDeCase('adjectif', 'boucher')).toBeUndefined()
    expect(determinantDeCase('adverbe', 'boucher')).toBeUndefined()
    expect(determinantDeCase('gérondif', 'boucher')).toBeUndefined()
  })

  it("ne demande au vers entier que de ne pas ouvrir sur un groupe nominal", () => {
    expect(determinantDeCase('libre', 'boucher')).toBeUndefined()
    expect(determinantDeCase('libre', 'boucher', undefined, true)).toBe(HORS_GN)
  })

  it('ne rend jamais une phrase — seulement une clé que le serveur met en mots', () => {
    for (let i = 0; i < 200; i++) {
      const d = determinantDeCase('groupe-nominal', 'enfant') as string
      expect(d).toMatch(/^[a-z_0-9]+$/)
      expect(FAMILLE[d]).toBeTruthy()
    }
  })
})

describe('piocherReserve', () => {
  it('tient la stratégie demandée quand le réseau est tombé', () => {
    for (const [strat, famille] of [['partitif', 'PART'], ['demonstratif', 'DEM'], ['poss_1s', 'POSS'], ['zero', 'ZERO']] as const) {
      for (let i = 0; i < 60; i++) {
        expect(familleDe(piocherReserve('groupe-nominal', strat))).toBe(famille)
      }
    }
  })

  it('rend quand même un fragment quand la réserve ne peut pas suivre', () => {
    expect(piocherReserve('verbe', 'partitif')).toBeTruthy()
    expect(piocherReserve('type-inconnu')).toBeTruthy()
  })
})

// ── La soudure des élisions ───────────────────────────────────────────────

describe('souder', () => {
  it("recolle l'élision coupée à la jointure de deux cases", () => {
    expect(souder("sitôt qu' une faille")).toBe("sitôt qu'une faille")
    expect(souder("l' ombre demeure")).toBe("l'ombre demeure")
  })

  it('recolle la ponctuation détachée sans coller les mots', () => {
    expect(souder('doucement , le sel ronge')).toBe('doucement, le sel ronge')
    expect(souder('le vide  demeure ')).toBe('le vide demeure')
  })

  it('ne touche pas à un vers déjà propre', () => {
    expect(souder('en tombant, la pluie creuse la pierre')).toBe('en tombant, la pluie creuse la pierre')
  })
})

// ── La mesure d'ensemble : le poème produit par la chaîne complète ────────

describe('la séance entière', () => {
  // Rejoue ce que fait l'Atelier vers après vers : la garde dit ce qui est
  // interdit, l'idiolecte de la voix tire le déterminant, la garde enregistre
  // ce qui est sorti.
  function seance(nVers: number, voix: string[], graine: number): string[] {
    const rng = des(graine)
    const garde = new GardeOuverture({ rng })
    const lignes: string[] = []
    for (let i = 0; i < nVers; i++) {
      const interdites = garde.famillesInterdites()
      let ligne: string
      if (garde.exigeOuvertureHorsGN()) {
        ligne = 'quand la nuit consent'
      } else {
        const strat = tirerStrategie(voix[i % voix.length], interdites, rng)
        ligne = `${TEMOIN[strat]} seuil demeure`.trim()
      }
      garde.enregistrer(familleDe(ligne))
      lignes.push(ligne)
    }
    return lignes
  }

  const TABLE = Object.keys(PROFILS)

  it('ne laisse plus jamais trois vers de suite ouvrir sur la même famille', () => {
    for (let graine = 1; graine <= 30; graine++) {
      const d = diagnostic(seance(40, TABLE, graine))
      expect(d.plusLongueSerie).toBeLessThanOrEqual(2)
    }
  })

  it("fait tomber l'article défini de la quasi-totalité des vers à deux sur cinq", () => {
    // Avant : douze vers sur douze. La garde plafonne les séries à deux, et
    // treize des quarante-six voix ont malgré tout le défini pour dominante —
    // deux vers sur cinq est le plancher qu'on peut tenir sans effacer les
    // idiolectes, ce qui reviendrait à remplacer un métronome par un autre.
    for (let graine = 1; graine <= 30; graine++) {
      expect(diagnostic(seance(40, TABLE, graine)).tauxDefini).toBeLessThan(0.42)
    }
  })

  it('aère le poème par des vers qui ne sont pas nominaux', () => {
    for (let graine = 1; graine <= 30; graine++) {
      const d = diagnostic(seance(40, TABLE, graine))
      expect(d.comptes[HORS_GN] ?? 0).toBeGreaterThanOrEqual(5)
    }
  })

  it('fait entendre au moins quatre familles différentes sur une table de 46', () => {
    for (let graine = 1; graine <= 30; graine++) {
      const d = diagnostic(seance(40, TABLE, graine))
      expect(Object.keys(d.comptes).length).toBeGreaterThanOrEqual(4)
    }
  })

  it('tient aussi quand la table se réduit à une seule voix — la fin du recueil', () => {
    for (const voix of ['boucher', 'telegraphiste', 'enfant', 'greffier', 'notice']) {
      const d = diagnostic(seance(30, [voix], 5))
      expect(d.plusLongueSerie).toBeLessThanOrEqual(2)
    }
  })
})

describe("l'adverbe de tête se reconnaît à sa virgule", () => {
  it('ne prend pas un nom en -ment pour un adverbe', () => {
    // Ces trois-là sont sortis de vraies voix : le somnambule, le convalescent,
    // le géologue. Lus comme des adverbes, ils faisaient croire à la garde que
    // le poème respirait déjà.
    expect(familleDe('suintement retient son souffle')).toBe('ZERO')
    expect(familleDe('décollement consent')).toBe('ZERO')
    expect(familleDe('mouvement sans fin')).toBe('ZERO')
  })

  it("reconnaît toujours l'adverbe quand la case a posé sa virgule", () => {
    expect(familleDe('doucement, le sel ronge la nuit')).toBe(HORS_GN)
    expect(familleDe('obliquement , la pluie creuse')).toBe(HORS_GN)
    expect(familleDe('softly, the salt gnaws')).toBe(HORS_GN)
    expect(familleDe('falling, the rain carves')).toBe(HORS_GN)
  })

  it("ne prend pas un nom anglais en -ing pour un gérondif", () => {
    expect(familleDe('building without end')).toBe('ZERO')
  })
})

// ── Ce que l'atelier de trente-cinq vers a montré ─────────────────────────

describe('souder — la ponctuation française garde son espace', () => {
  it("ne colle pas le point d'interrogation au dernier mot", () => {
    // Mesuré : « Qui butine encore après désoperculation? » — la règle anglaise
    // appliquée à un vers français, par une soudure qui ne distinguait pas.
    expect(souder('Qui butine encore après désoperculation ?'))
      .toBe('Qui butine encore après désoperculation ?')
    expect(souder('où va la nuit  ?')).toBe('où va la nuit ?')
    expect(souder('le sel !')).toBe('le sel !')
    expect(souder('ceci : cela')).toBe('ceci : cela')
  })

  it("pose l'espace quand la case l'avait perdue", () => {
    expect(souder('le vide reste?')).toBe('le vide reste ?')
  })

  it('colle toujours la virgule et le point', () => {
    expect(souder('doucement , le sel ronge')).toBe('doucement, le sel ronge')
    expect(souder('la nuit .')).toBe('la nuit.')
  })

  it("suit la règle anglaise quand le vers est anglais", () => {
    expect(souder('who still forages after uncapping ?', 'en'))
      .toBe('who still forages after uncapping?')
    expect(souder('softly , the salt gnaws', 'en')).toBe('softly, the salt gnaws')
  })

  it("recolle toujours l'élision", () => {
    expect(souder("sitôt qu' une faille")).toBe("sitôt qu'une faille")
  })
})

describe('le nom nu ne se pose pas après un verbe', () => {
  it("ne se tire jamais sur une case qui ne le permet pas", () => {
    // « la fraise froisse vibrure » : le nom nu en complément n'est pas une
    // ellipse, c'est la faute que la contrainte du groupe verbal interdit
    // depuis toujours (« cède terrain » / « cède du terrain »).
    for (const voix of ['telegraphiste', 'psalmiste', 'lexicographe', 'fossoyeur']) {
      for (let i = 0; i < 200; i++) {
        expect(determinantDeCase('groupe-nominal', voix)).not.toBe('zero')
        expect(determinantDeCase('groupe-nominal-riche', voix, undefined, false, true)).not.toBe('zero')
      }
    }
  })

  it('reste possible là où la poésie le connaît — le sujet', () => {
    let nus = 0
    for (let i = 0; i < 300; i++) {
      if (determinantDeCase('groupe-nominal', 'telegraphiste', undefined, false, true) === 'zero') nus++
    }
    expect(nus).toBeGreaterThan(50)
  })
})

describe('motsInterdits — les conjonctions courtes ne se font plus couper', () => {
  it('les place assez tôt pour survivre à la troncature du serveur', () => {
    // Le serveur ne garde que les soixante premiers mots. Sur trente-cinq vers,
    // « or » se retrouvait au-delà : il a ouvert les vers 7, 23 et 28.
    const vers = Array.from({ length: 35 }, (_, i) => ({ texte: `vers numéro ${'aaa'.repeat(i % 3 + 1)}${i} porte quatre mots longs ici` }))
    const liste = motsInterdits({ echo: 'cendre', vers, conjCourtes: ['or', 'en', 'si'] })
    for (const c of ['or', 'en', 'si']) {
      expect(liste.slice(0, 60), c).toContain(c)
    }
  })

  it("laisse l'écho passer devant", () => {
    const liste = motsInterdits({ echo: 'cendre', vers: [], conjCourtes: ['or'] })
    expect(liste[0]).toBe('cendre')
    expect(liste[1]).toBe('or')
  })
})

describe("motsInterdits — les morceaux des mots composés", () => {
  it('interdit aussi le préfixe court d\'un composé', () => {
    // Un atelier a rendu « à mi-verger » puis « à mi-clou » : le filtre à plus
    // de deux lettres protégeait « mi », l'élément réellement repris.
    const liste = motsInterdits({ vers: [{ texte: 'le verrou à mi-verger' }], conjCourtes: [] })
    expect(liste).toContain('mi-verger')
    expect(liste).toContain('verger')
    expect(liste).toContain('mi')
  })

  it("garde le composé entier et ses morceaux d'au moins deux lettres", () => {
    const liste = motsInterdits({ vers: [{ texte: 'un pare-boue et un coffre-fort' }], conjCourtes: [] })
    expect(liste).toContain('pare-boue')
    expect(liste).toContain('pare')
    expect(liste).toContain('boue')
    expect(liste).toContain('coffre-fort')
  })

  it('laisse toujours tomber les mots simples de deux lettres', () => {
    const liste = motsInterdits({ vers: [{ texte: 'il va au mur' }], conjCourtes: [] })
    expect(liste).not.toContain('il')
    expect(liste).not.toContain('va')
    expect(liste).toContain('mur')
  })
})
