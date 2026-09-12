import { describe, it, expect } from 'vitest'
import { composerTexte, composerSauvegarde, lireSauvegarde, nomDeFichier, FORMAT } from '../lib/recueil'
import type { Poeme } from '../types'

/**
 * Emporter le recueil — lot 20 de l'audit du 10 septembre.
 *
 * Le rapport écrit que le poème sauvegardé « part chez Supabase, rattaché à
 * un jeton anonyme ». Vérifié : c'est faux. `sauvegarderPoeme` écrit dans
 * Dexie et aucun appel n'envoie un poème au serveur — seules les
 * publications en galerie y vont, et ce sont des copies.
 *
 * Sa conclusion tient quand même, et elle est plus sévère qu'il ne le
 * croyait : il n'existe nulle part une seule copie de la bibliothèque.
 */

const poeme = (id: string, textes: string[]): Poeme => ({
  id, titre: null, structureId: 'vers-libre', mode: 'standard', visibilite: 'aveugle',
  cases: textes.map((texte, i) => ({
    numero: i + 1, texte, auteur: 'humain' as const, fonction: 'vers', consigne: 'un vers', ts: 1,
  })),
  dateCreation: 1_700_000_000_000, dateModification: 1_700_000_000_000,
})

describe('composerTexte', () => {
  it('rend les poèmes lisibles, dans l’ordre', () => {
    const t = composerTexte([
      poeme('a', ['le vernis craque', 'sous la lampe']),
      poeme('b', ['il pleut des clous']),
    ])
    expect(t).toContain('le vernis craque')
    expect(t).toContain('sous la lampe')
    expect(t).toContain('il pleut des clous')
    expect(t.indexOf('le vernis')).toBeLessThan(t.indexOf('il pleut'))
  })

  it('emporte aussi le carnet quand il y en a un', () => {
    const t = composerTexte([poeme('a', ['un vers'])], [
      { id: 'r1', texte: 'la paille ronge un rochet', ordre: 1, dateRecolte: 1 },
    ])
    expect(t).toContain('la paille ronge un rochet')
  })

  it('ne laisse pas un recueil vide sans en-tête', () => {
    expect(composerTexte([])).toMatch(/CADAVRE EXQUIS/)
  })
})

describe('la sauvegarde et sa relecture', () => {
  it('fait l’aller-retour sans rien perdre', () => {
    const avant = [poeme('a', ['le vernis craque']), poeme('b', ['il pleut'])]
    const carnet = [{ id: 'r1', texte: 'un vers gardé', ordre: 1, dateRecolte: 9 }]
    const lu = lireSauvegarde(composerSauvegarde(avant, carnet))
    expect(lu.ok).toBe(true)
    if (!lu.ok) return
    expect(lu.data.poemes).toHaveLength(2)
    expect(lu.data.poemes[0].cases[0].texte).toBe('le vernis craque')
    expect(lu.data.recolte[0].texte).toBe('un vers gardé')
    expect(lu.data.format).toBe(FORMAT)
  })

  it('refuse ce qui n’est pas une sauvegarde', () => {
    for (const brut of ['', 'bonjour', '[]', 'null', '{"rien":1}']) {
      expect(lireSauvegarde(brut).ok, JSON.stringify(brut)).toBe(false)
    }
  })

  it('refuse une sauvegarde venue d’une version future', () => {
    const futur = JSON.stringify({ format: FORMAT + 1, date: 0, poemes: [poeme('a', ['x'])], recolte: [] })
    const lu = lireSauvegarde(futur)
    expect(lu.ok).toBe(false)
    if (lu.ok) return
    expect(lu.raison).toMatch(/récente|newer/)
  })

  it('écarte les entrées abîmées sans jeter le reste', () => {
    // Un fichier tronqué ou édité à la main : on garde ce qui tient debout.
    const mele = JSON.stringify({
      format: FORMAT, date: 0,
      poemes: [poeme('bon', ['un vers']), { id: 'cassé' }, null, { cases: [] }],
      recolte: [{ id: 'r', texte: 'gardé', ordre: 1, dateRecolte: 1 }, { texte: 'sans id' }],
    })
    const lu = lireSauvegarde(mele)
    expect(lu.ok).toBe(true)
    if (!lu.ok) return
    expect(lu.data.poemes).toHaveLength(1)
    expect(lu.data.recolte).toHaveLength(1)
  })

  it('refuse une sauvegarde qui ne contient plus rien d’exploitable', () => {
    const vide = JSON.stringify({ format: FORMAT, date: 0, poemes: [{ id: 'x' }], recolte: [] })
    expect(lireSauvegarde(vide).ok).toBe(false)
  })
})

describe('nomDeFichier', () => {
  it('porte la date, pour qu’on ne confonde pas deux sauvegardes', () => {
    expect(nomDeFichier('json')).toMatch(/^cadavre-exquis-\d{4}-\d{2}-\d{2}\.json$/)
    expect(nomDeFichier('txt')).toMatch(/\.txt$/)
  })
})
