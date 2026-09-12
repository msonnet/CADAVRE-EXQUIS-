import { describe, it, expect } from 'vitest'
import {
  accorderDislocation, accorderAdjectif, genreDuDeterminant,
  lireDislocation, diagnosticAccord,
} from '../lib/accord'

/**
 * L'accord de la dislocation — lot 15 de l'audit du 10 septembre.
 *
 * Le vers cité par le rapport comme le seul vraiment raté d'une séance de
 * onze : « il devient givré la rue, lait ». Ce n'est pas de l'étrangeté,
 * c'est une faute, et elle se lit comme un bug.
 */

describe('le vers de l’audit', () => {
  it('« il devient givré la rue, lait » retrouve sa grammaire', () => {
    expect(accorderDislocation('il devient givré la rue, lait'))
      .toBe('elle devient givrée, la rue, lait')
  })
})

describe('genreDuDeterminant', () => {
  it('lit le masculin, le féminin et le pluriel', () => {
    expect(genreDuDeterminant('le')).toBe('m')
    expect(genreDuDeterminant('un')).toBe('m')
    expect(genreDuDeterminant('la')).toBe('f')
    expect(genreDuDeterminant('cette')).toBe('f')
    expect(genreDuDeterminant('les')).toBe('pluriel')
    expect(genreDuDeterminant('des')).toBe('pluriel')
  })

  it('avoue son ignorance devant une élision ou un nom nu', () => {
    // « l'ombre » et « l'ourlet » ont le même article et deux genres.
    expect(genreDuDeterminant("l'")).toBe('inconnu')
    expect(genreDuDeterminant('pluie')).toBe('inconnu')
  })
})

describe('accorderAdjectif', () => {
  it('accorde les formes régulières au féminin', () => {
    expect(accorderAdjectif('givré', 'f')).toBe('givrée')
    expect(accorderAdjectif('grand', 'f')).toBe('grande')
    expect(accorderAdjectif('léger', 'f')).toBe('légère')
    expect(accorderAdjectif('vif', 'f')).toBe('vive')
    expect(accorderAdjectif('heureux', 'f')).toBe('heureuse')
    expect(accorderAdjectif('ancien', 'f')).toBe('ancienne')
  })

  it('connaît les irréguliers qu’il a rencontrés', () => {
    expect(accorderAdjectif('vieux', 'f')).toBe('vieille')
    expect(accorderAdjectif('blanc', 'f')).toBe('blanche')
    expect(accorderAdjectif('sec', 'f')).toBe('sèche')
    expect(accorderAdjectif('doux', 'f')).toBe('douce')
    expect(accorderAdjectif('épais', 'f')).toBe('épaisse')
  })

  it('laisse tranquille ce qui est déjà accordé', () => {
    expect(accorderAdjectif('calme', 'f')).toBe('calme')
    expect(accorderAdjectif('rouge', 'f')).toBe('rouge')
    expect(accorderAdjectif('grand', 'm')).toBe('grand')
  })

  it('marque le nombre sans inventer le genre', () => {
    expect(accorderAdjectif('grand', 'pluriel')).toBe('grands')
    expect(accorderAdjectif('épais', 'pluriel')).toBe('épais')
    expect(accorderAdjectif('beau', 'pluriel')).toBe('beaux')
    expect(accorderAdjectif('brutal', 'pluriel')).toBe('brutaux')
  })

  it('renonce plutôt que d’inventer', () => {
    // Un adjectif finissant par une voyelle autre que « e » est trop
    // irrégulier pour une règle : mieux vaut ne rien faire.
    // « kaki » est invariable, mais « poli » → « polie » est régulier : la
    // règle du -i est donc juste, et c'est la liste d'invariables qui la borne.
    expect(accorderAdjectif('kaki', 'f')).toBe('kaki')
    expect(accorderAdjectif('poli', 'f')).toBe('polie')
    expect(accorderAdjectif('sympa', 'f')).toBe('sympa')
    expect(accorderAdjectif('deux mots', 'f')).toBeNull()
  })
})

describe('accorderDislocation', () => {
  it('rend la virgule, qui n’est pas décorative', () => {
    // « il est grand le silence » n'est pas une phrase française.
    expect(accorderDislocation('il est grand le silence'))
      .toBe('il est grand, le silence')
  })

  it('accorde le pronom, le verbe et l’adjectif au pluriel', () => {
    expect(accorderDislocation('il est grand les silences'))
      .toBe('ils sont grands, les silences')
    // « des » ne dit pas le genre : on marque le nombre, pas le féminin, et
    // le pronom retombe sur « ils », forme non marquée. Garder « elles »
    // parce que la tête tirée disait « elle » serait inventer.
    expect(accorderDislocation('elle demeure ouvert des fenêtres'))
      .toBe('ils demeurent ouverts, des fenêtres')
  })

  it('accorde chacune des huit têtes', () => {
    const attendus: [string, string][] = [
      ['il est givré la rue', 'elle est givrée, la rue'],
      ['il reste givré la rue', 'elle reste givrée, la rue'],
      ['il demeure givré la rue', 'elle demeure givrée, la rue'],
      ['il paraît givré la rue', 'elle paraît givrée, la rue'],
      ['il semble givré la rue', 'elle semble givrée, la rue'],
      ['il devient givré la rue', 'elle devient givrée, la rue'],
      ['elle est givré la rue', 'elle est givrée, la rue'],
      ['elle demeure givré la rue', 'elle demeure givrée, la rue'],
    ]
    for (const [avant, apres] of attendus) {
      expect(accorderDislocation(avant), avant).toBe(apres)
    }
  })

  it('ne touche à rien quand il ne sait pas', () => {
    // Élision : le genre est indécidable.
    expect(accorderDislocation("il est givré l'ombre")).toBe("il est givré l'ombre")
    // Ce n'est pas une dislocation.
    expect(accorderDislocation('la paille ronge un rochet')).toBe('la paille ronge un rochet')
    expect(accorderDislocation('Je marche')).toBe('Je marche')
  })

  it('est idempotent — corriger deux fois ne change rien', () => {
    const une = accorderDislocation('il devient givré la rue, lait')
    expect(accorderDislocation(une)).toBe(une)
  })

  it('laisse le masculin tel quel, virgule exceptée', () => {
    expect(accorderDislocation('il est froid le carreau'))
      .toBe('il est froid, le carreau')
  })
})

describe('lireDislocation', () => {
  it('ne voit une dislocation que là où il y en a une', () => {
    expect(lireDislocation('il est grand le silence')).toMatchObject({
      tete: 'il est', adjectif: 'grand', determinant: 'le', groupe: 'le silence',
    })
    expect(lireDislocation('sous un trésor perdu')).toBeNull()
    expect(lireDislocation('il est')).toBeNull()
  })
})

describe('diagnosticAccord', () => {
  it('compte ce qu’il corrige ET ce qu’il ne sait pas corriger', () => {
    const d = diagnosticAccord([
      'il devient givré la rue, lait',      // corrigé
      'il est froid le carreau',            // corrigé (virgule)
      "il est givré l'ombre",               // laissé — élision
      'la paille ronge un rochet',          // pas une dislocation
      'Je marche',                          // pas une dislocation
    ])
    expect(d.total).toBe(5)
    expect(d.disloques).toBe(3)
    expect(d.corriges).toBe(2)
    expect(d.laisses).toBe(1)
    expect(d.fautes).toHaveLength(2)
  })

  it('ne trouve plus rien sur un poème déjà accordé', () => {
    const vers = ['il devient givré la rue', 'il est grand les silences']
      .map(accorderDislocation)
    expect(diagnosticAccord(vers).corriges).toBe(0)
  })
})

/**
 * La mesure que réclame le critère du lot : des vers réellement engendrés
 * par les gabarits, et non des exemples choisis à la main.
 *
 * Les fragments sont tirés d'un vocabulaire de substitution — les vrais
 * viennent du modèle, qu'on ne peut pas appeler ici. C'est donc la FORME des
 * assemblages qui est mesurée, pas le lexique : c'est exactement ce dont il
 * s'agit, la faute relevée par l'audit étant structurelle.
 *
 * Relevé sur 200 vers par table, trois tailles de table :
 *     disloqués 5 · fautifs AVANT 4 · APRÈS 0 · non jugés 1
 */
describe('sur des vers réellement engendrés', () => {
  const ADJ = ['givré', 'froid', 'épais', 'blanc', 'vieux', 'léger', 'creux', 'usé', 'lent', 'sec']
  const GN = ['la rue', 'le carreau', 'une lézarde', 'un relais', 'les fenêtres', 'des cendres',
              "l'ombre", 'la pluie', 'le seuil', 'des relais', 'la craie', 'un athanor']
  const pif = <T,>(v: T[]) => v[Math.floor(Math.random() * v.length)]

  it('ne laisse aucune dislocation fautive, à toutes les tables', async () => {
    const { GardeFormes, familleDuVers } = await import('../lib/formes')
    const { GardeMetrique, longueurEstimee, classeDeLongueur } = await import('../lib/metrique')
    const { tirerGabarit } = await import('../pages/JeuAtelier')
    const { souder } = await import('../lib/determinants')

    for (const table of [3, 12, 36]) {
      const vers: string[] = []
      const gf = new GardeFormes(30), gm = new GardeMetrique()
      while (vers.length < 200) {
        const n = 1 + Math.floor(Math.random() * 4)
        const g = tirerGabarit(n, true, true, false, table, gf.permises(), gm.permises(GardeMetrique.peutEtreLong(n)))
        gf.enregistrer(familleDuVers(g.map(x => x.role)))
        gm.enregistrer(classeDeLongueur(longueurEstimee(g)))
        const bouts = g.map(c => {
          const corps = c.type === 'adjectif' ? pif(ADJ) : pif(GN)
          return (c.avant ? c.avant + ' ' : '') + corps + (c.apres ?? '')
        })
        vers.push(souder(bouts.join(' ')))
      }
      const apres = diagnosticAccord(vers.map(accorderDislocation))
      expect(apres.corriges, `table ${table} — dislocations encore fautives`).toBe(0)
    }
  })
})
