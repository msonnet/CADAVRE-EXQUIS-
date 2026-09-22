import { describe, it, expect } from 'vitest'
import {
  dernierMot, echoDe, aDejaEcrit, rangSuivant, rangDe, mainsHumaines,
  refusDuVers, peutEcrire, versDuScellement, voisinage,
  PLANCHER_VERS, MOTS_MAX, CARACTERES_MAX,
  type Chaine,
} from '../lib/jourLogique'

/**
 * Le poème du jour — une chaîne, une main, un vers.
 *
 * Toutes les règles du rendez-vous vivent ici, et c'est délibéré : dispersées
 * dans des requêtes SQL, elles seraient invérifiables. On peut au contraire
 * simuler une journée entière — un joueur seul, puis deux cents — et compter
 * ce qui en sort.
 */

function chaine(amorce: string, textes: { texte: string; main: string | null }[] = []): Chaine {
  return {
    jour: '2026-09-17', amorce,
    vers: textes.map((t, i) => ({
      rang: i + 1, main: t.main, voix: t.main === null, texte: t.texte, pose: i,
    })),
  }
}

describe('l’écho — le dernier mot, et rien de plus', () => {
  it('prend le dernier mot, ponctuation ôtée', () => {
    expect(dernierMot('la cire se souvient des doigts')).toBe('doigts')
    expect(dernierMot('un cheval dort debout.')).toBe('debout')
    expect(dernierMot('  le sel monte  ')).toBe('monte')
    expect(dernierMot('« une valise »')).toBe('valise')
  })

  it('garde l’élision et les accents intacts', () => {
    expect(dernierMot('personne ne rallume l’âtre')).toBe('l’âtre')
    expect(dernierMot('il descend jusqu’au sous-sol')).toBe('sous-sol')
  })

  it('ne rend rien pour un texte vide', () => {
    expect(dernierMot('')).toBe('')
    expect(dernierMot('   ')).toBe('')
  })

  it('rend l’amorce ENTIÈRE à la première main', () => {
    // Premier jet : « la cire » devenait « cire ». On jetait justement ce
    // qui avait été donné — une graine se donne entière, déterminant
    // compris, puisqu'il oriente le genre et le nombre de ce qui suivra.
    expect(echoDe(chaine('une horloge'))).toBe('une horloge')
    expect(echoDe(chaine('la cire'))).toBe('la cire')
    expect(echoDe(chaine('une balance penche'))).toBe('une balance penche')
  })

  it('vient du dernier vers dès qu’il y en a un', () => {
    const c = chaine('une horloge', [
      { texte: 'avale le couloir', main: 'nadja' },
      { texte: 'le sel monte lentement', main: 'desnos' },
    ])
    expect(echoDe(c)).toBe('lentement')
  })
})

describe('une main, un vers, un jour', () => {
  it('refuse une deuxième main dans la même chaîne', () => {
    // C'est ce qui fait que la longueur du poème compte les GENS, et non les
    // bavards. Sans cette règle, une seule personne pourrait écrire tout le
    // poème du jour — et cesserait d'être aveugle.
    const c = chaine('le sel', [{ texte: 'la porte bat', main: 'nadja' }])
    expect(aDejaEcrit(c, 'nadja')).toBe(true)
    expect(peutEcrire(c, 'nadja')).toBe('deja-ecrit')
    expect(peutEcrire(c, 'desnos')).toBeNull()
  })

  it('ne rouvre jamais une chaîne scellée', () => {
    const c = { ...chaine('le sel'), scelle: 1 }
    expect(peutEcrire(c, 'nadja')).toBe('scelle')
  })

  it('range les vers à la suite', () => {
    const c = chaine('le sel', [
      { texte: 'un', main: 'a' }, { texte: 'deux', main: 'b' },
    ])
    expect(rangSuivant(c)).toBe(3)
    expect(rangDe(c, 'b')).toBe(2)
    expect(rangDe(c, 'inconnu')).toBeNull()
  })
})

describe('ce qu’on accepte comme vers', () => {
  it('refuse le vide', () => {
    expect(refusDuVers('')).toBe('vide')
    expect(refusDuVers('   ')).toBe('vide')
  })

  it('refuse plus de neuf mots — la borne de l’Atelier', () => {
    // `GardeMetrique` tient déjà « zéro vers de dix mots ou plus ». Une main
    // qui écrirait trois phrases écrirait le poème des autres à leur place.
    expect(refusDuVers(Array(MOTS_MAX).fill('mot').join(' '))).toBeNull()
    expect(refusDuVers(Array(MOTS_MAX + 1).fill('mot').join(' '))).toBe('trop-de-mots')
  })

  it('refuse un texte qui déborde, ou qui va à la ligne', () => {
    expect(refusDuVers('x'.repeat(CARACTERES_MAX + 1))).toBe('trop-long')
    expect(refusDuVers('un vers\nun autre')).toBe('plusieurs-lignes')
  })

  it('accepte un vers', () => {
    expect(refusDuVers('la cire se souvient des doigts')).toBeNull()
    expect(refusDuVers('  une porte bat  ')).toBeNull()
  })
})

describe('les voix ne font qu’un plancher, et seulement au scellement', () => {
  it('complète une journée trop courte', () => {
    const c = chaine('le sel', [{ texte: 'un', main: 'a' }])
    expect(versDuScellement(c)).toEqual([2, 3, 4, 5])
  })

  it('n’ajoute rien dès que le plancher est atteint', () => {
    const vers = Array.from({ length: PLANCHER_VERS }, (_, i) => ({ texte: `v${i}`, main: `m${i}` }))
    expect(versDuScellement(chaine('le sel', vers))).toEqual([])
  })

  it('n’ajoute jamais rien à une journée peuplée', () => {
    // La longueur doit rester la mesure du jour : au-delà du plancher, aucune
    // voix n'intervient, jamais.
    const vers = Array.from({ length: 200 }, (_, i) => ({ texte: `v${i}`, main: `m${i}` }))
    expect(versDuScellement(chaine('le sel', vers))).toEqual([])
  })

  it('comble un jour désert jusqu’au plancher, pas au-delà', () => {
    expect(versDuScellement(chaine('le sel'))).toHaveLength(PLANCHER_VERS)
  })
})

describe('une journée simulée — c’est la mesure qui compte', () => {
  /** Fait tourner une journée : `nb` mains, un vers chacune, puis on scelle. */
  function journee(nb: number): Chaine {
    const c = chaine('une horloge')
    for (let i = 0; i < nb; i++) {
      const main = `main${i}`
      if (peutEcrire(c, main)) continue
      c.vers.push({ rang: rangSuivant(c), main, texte: `vers de ${main}`, pose: i })
    }
    for (const rang of versDuScellement(c)) {
      c.vers.push({ rang, main: null, voix: true, voixNom: 'L’horloger', texte: 'une voix' })
    }
    c.scelle = 1
    return c
  }

  it('la longueur du poème EST le nombre de gens venus', () => {
    // C'est toute la correction : en fixant la taille, on faisait du nombre
    // de poèmes la variable d'ajustement, et « LE poème du jour » devenait
    // trente-trois parties privées.
    for (const n of [6, 12, 60, 200]) {
      expect(journee(n).vers, `${n} mains`).toHaveLength(n)
    }
  })

  it('un joueur seul obtient quand même un poème', () => {
    const c = journee(1)
    expect(c.vers).toHaveLength(PLANCHER_VERS)
    expect(mainsHumaines(c), 'la sienne, et quatre voix').toBe(1)
  })

  it('les voix disparaissent dès qu’il y a du monde', () => {
    expect(mainsHumaines(journee(PLANCHER_VERS))).toBe(PLANCHER_VERS)
    const c = journee(200)
    expect(c.vers.filter(v => v.voix), 'aucune voix à deux cents mains').toHaveLength(0)
  })

  it('le coût des voix est borné par le plancher, jamais par la foule', () => {
    // Quatre appels par jour au maximum, zéro dès cinq joueurs.
    for (const n of [0, 1, 2, 3, 4, 5, 50]) {
      const voix = journee(n).vers.filter(v => v.voix).length
      expect(voix, `${n} mains`).toBe(Math.max(0, PLANCHER_VERS - n))
      expect(voix).toBeLessThanOrEqual(PLANCHER_VERS)
    }
  })

  it('chaque main n’apparaît qu’une fois', () => {
    const c = journee(200)
    const mains = c.vers.filter(v => v.main).map(v => v.main)
    expect(new Set(mains).size).toBe(mains.length)
  })
})

describe('la révélation s’ouvre sur ton vers', () => {
  it('rend le vers de la main et ses deux voisins', () => {
    // Sur deux cents vers, ouvrir au début reviendrait à cacher la seule
    // chose qu'on vient chercher.
    const vers = Array.from({ length: 20 }, (_, i) => ({ texte: `v${i + 1}`, main: `m${i + 1}` }))
    const c = chaine('le sel', vers)
    expect(voisinage(c, 'm10').map(v => v.texte)).toEqual(['v9', 'v10', 'v11'])
  })

  it('ne déborde pas aux extrémités', () => {
    const vers = Array.from({ length: 5 }, (_, i) => ({ texte: `v${i + 1}`, main: `m${i + 1}` }))
    const c = chaine('le sel', vers)
    expect(voisinage(c, 'm1').map(v => v.texte)).toEqual(['v1', 'v2'])
    expect(voisinage(c, 'm5').map(v => v.texte)).toEqual(['v4', 'v5'])
  })

  it('montre la tête à qui n’a pas écrit ce jour-là', () => {
    const vers = Array.from({ length: 20 }, (_, i) => ({ texte: `v${i + 1}`, main: `m${i + 1}` }))
    expect(voisinage(chaine('le sel', vers), 'absent')).toHaveLength(3)
  })
})
