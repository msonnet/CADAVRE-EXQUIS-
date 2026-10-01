import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Ce qui part en galerie.
 *
 * La table `gallery` se lit avec la clé anonyme. Une case de la table
 * locale y partait avec le prénom tapé aux préparatifs — « Nadja »,
 * souvent celui d'un enfant — et un `moi` qui ne veut rien dire chez un
 * autre. La galerie ne montre aucune couture : rien de cela n'a à quitter
 * le téléphone.
 */

const insertions: Array<Record<string, unknown>> = []
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: async (ligne: Record<string, unknown>) => { insertions.push(ligne); return { error: null } },
    }),
  },
  uploaderImageGalerie: async () => null,
}))
vi.mock('../i18n', () => ({ tr: (fr: string) => fr, langueActuelle: () => 'fr' }))

import { publierPoeme, casesPourGalerie } from '../lib/publier'
import type { Poeme, Case } from '../types'

function cas(n: number, extra: Partial<Case>): Case {
  return { numero: n, fonction: 'sujet', consigne: '', auteur: 'humain', texte: `fragment ${n}`, ts: n, ...extra }
}

const poeme: Poeme = {
  id: 'p1',
  titre: 'la cire',
  structureId: 'phrase-simple',
  cases: [
    cas(1, { joueurNumero: 1, pseudo: 'Nadja' }),
    cas(2, { auteur: 'ia', voixSlot: 1, voixNom: 'geologue' }),
    cas(3, { joueurNumero: 2, pseudo: 'Léa' }),
    cas(4, { joueurNumero: 1, moi: true }),
  ],
  mode: 'standard',
  visibilite: 'aveugle',
  dateCreation: 0,
  dateModification: 0,
}

describe('publierPoeme — les noms des mains restent au téléphone', () => {
  beforeEach(() => { insertions.length = 0 })

  it("le payload ne porte ni prénom ni « moi »", async () => {
    await publierPoeme(poeme, { pseudo: 'auteur', id: 'u1' })
    expect(insertions).toHaveLength(1)
    const payload = insertions[0].payload as string
    expect(payload).not.toContain('Nadja')
    expect(payload).not.toContain('Léa')
    const cases = (JSON.parse(payload) as { cases: Case[] }).cases
    for (const c of cases) {
      expect(c).not.toHaveProperty('pseudo')
      expect(c).not.toHaveProperty('moi')
    }
  })

  it('garde le texte, le numéro de la main et la voix', () => {
    const cases = casesPourGalerie(poeme.cases)
    expect(cases.map(c => c.texte)).toEqual(poeme.cases.map(c => c.texte))
    expect(cases[0].joueurNumero).toBe(1)
    expect(cases[1].voixNom).toBe('geologue')
    // le poème du recueil n'est pas touché
    expect(poeme.cases[0].pseudo).toBe('Nadja')
  })
})
