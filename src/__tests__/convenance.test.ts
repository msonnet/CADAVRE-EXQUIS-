import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as client from '../lib/convenance'
import * as serveur from '../../api/_convenance.js'
import { refusDuVers as refusClient } from '../lib/jourLogique'
import { refusDuVers as refusServeur } from '../../api/_jour.js'

/**
 * La convenance — ce qui n'entre pas dans un texte que des inconnus liront.
 *
 * Deux exigences, de sens contraire, et il faut tenir les deux : écarter les
 * injures, la haine et la pornographie même maquillées ; laisser passer la
 * langue, y compris quand elle frôle (« cône », « viole », « salopette »,
 * « baiser »). Un filtre qui chasse la poésie serait pire que pas de filtre.
 */

const ECARTES: Array<[string, 'fr' | 'en' | 'tout']> = [
  ['espèce de connard', 'fr'], ['quelle salope', 'fr'], ['des putains de vers', 'fr'], ['les enculés', 'fr'],
  ['sale nègre', 'fr'], ['Hitler', 'tout'], ['pd', 'fr'], ['a bitch', 'en'], ['motherfucker', 'en'],
  // maquillés
  ['PU73', 'fr'], ['fuuuuck', 'en'], ['f.u.c.k this', 'en'], ['p u t e', 'fr'], ['p.u.t.e.', 'fr'],
  ['xX_salope_Xx', 'tout'], ['CONNNNARD', 'fr'],
]

const GARDES: Array<[string, 'fr' | 'en' | 'tout']> = [
  ['le cône de lumière', 'fr'], ['les cônes', 'fr'], ['une viole de gambe', 'fr'], ['la salopette bleue', 'fr'],
  ['le violon', 'fr'], ['un baiser', 'fr'], ['la chatte du voisin', 'fr'], ['cul-de-sac', 'fr'], ['merde alors', 'fr'],
  ['Conakry', 'tout'], ['Constantin', 'tout'], ['le fagot de bois', 'fr'], ['la queue du chat', 'fr'],
  ['une tapette à mouches', 'fr'], ['la râpe à fromage', 'fr'], ['il a du retard', 'fr'],
  ['pros and cons', 'en'], ['he will bite', 'en'], ['the pine tree', 'en'], ['to niggle', 'en'],
  ['la cire se souvient des doigts', 'fr'], ['l a y a', 'fr'], ['', 'fr'],
]

describe('la convenance écarte ce qu’elle doit', () => {
  for (const [t, l] of ECARTES) {
    it(`« ${t} » (${l})`, () => expect(client.inconvenant(t, l)).toBe(true))
  }
})

describe('et laisse passer la langue', () => {
  for (const [t, l] of GARDES) {
    it(`« ${t} » (${l})`, () => expect(client.inconvenant(t, l)).toBe(false))
  }
})

describe('un mot grossier dans une langue est innocent dans l’autre', () => {
  it('« bite » mord en anglais, « retard » est un délai en français, « con » un argument en anglais', () => {
    expect(client.inconvenant('une bite', 'fr')).toBe(true)
    expect(client.inconvenant('a bite', 'en')).toBe(false)
    expect(client.inconvenant('what a retard', 'en')).toBe(true)
    expect(client.inconvenant('un retard', 'fr')).toBe(false)
    expect(client.inconvenant('the cons', 'en')).toBe(false)
  })
  it('un nom de plume n’a pas de langue : il passe les trois listes', () => {
    expect(client.inconvenant('Bite', 'tout')).toBe(true)
    expect(client.inconvenant('Retard', 'tout')).toBe(true)
  })
})

describe('trois copies, un seul filtre', () => {
  it('le serveur a les mêmes listes que le client', () => {
    expect(serveur.MOTS_COMMUNS).toEqual(client.MOTS_COMMUNS)
    expect(serveur.MOTS_FR).toEqual(client.MOTS_FR)
    expect(serveur.MOTS_EN).toEqual(client.MOTS_EN)
    expect(serveur.RACINES).toEqual(client.RACINES)
  })

  it('et rend les mêmes verdicts', () => {
    for (const [t, l] of [...ECARTES, ...GARDES]) {
      expect(serveur.inconvenant(t, l), t).toBe(client.inconvenant(t, l))
    }
  })

  it('la base a les mêmes listes (migration du lancement)', () => {
    const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261014000010_lancement.sql'), 'utf8')
    const liste = (nom: string) => {
      const m = sql.match(new RegExp(`  ${nom}\\s+TEXT\\[\\] := ARRAY\\[([^\\]]*)\\]`))
      expect(m, nom).not.toBeNull()
      return [...m![1].matchAll(/'([^']+)'/g)].map(x => x[1])
    }
    expect(liste('communs')).toEqual([...client.MOTS_COMMUNS])
    expect(liste('fr')).toEqual([...client.MOTS_FR])
    expect(liste('en')).toEqual([...client.MOTS_EN])
    expect(liste('racines')).toEqual([...client.RACINES])
  })
})

describe('le vers du poème du jour', () => {
  it('un vers grossier est refusé, des deux côtés, dans sa langue', () => {
    expect(refusClient('avale une pute', 'fr')).toBe('inconvenant')
    expect(refusServeur('avale une pute', 'fr')).toBe('inconvenant')
    expect(refusClient('he will bite the moon', 'en')).toBeNull()
    expect(refusServeur('he will bite the moon', 'en')).toBeNull()
  })
  it('sans langue, seules les règles de forme s’appliquent (rien ne change pour les anciens appels)', () => {
    expect(refusClient('avale une pute')).toBeNull()
    expect(refusServeur('avale une pute')).toBeNull()
  })
})
