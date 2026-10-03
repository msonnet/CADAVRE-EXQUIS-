import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { corpsDuPoeme, TAILLE_CORPS, SIGNES_PLEIN_CORPS, styleVers, RETRAIT_DEBORD } from '../lib/composition'
import { lignesDuFeuillet } from '../lib/plis'
import { tableAPlusieurs, mainsDemandees, NB_SIEGES, type Siege } from '../lib/table'
import { TUTORIEL_TOTAL, T_FIN_REVEL, T_FIN_SUITE, T_BIBLIO, T_DETAIL } from '../hooks/useTutoriel'

/**
 * La fin de partie — le poème composé, ses coutures, et la suite proposée.
 *
 * Relevé avant : onze vers d'atelier en vingt et une lignes à 27 points, sans
 * retrait ; une lettrine qui héritait de l'italique ; les coutures qui
 * recopiaient le poème sous la carte ; un guide qui faisait visiter l'image,
 * le partage et le recueil sans jamais proposer de rejouer.
 */

const lire = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')

describe('le corps du poème', () => {
  it('une phrase courte garde le corps d’avant, au caractère près', () => {
    expect(corpsDuPoeme(['le vernis craquelé', 'avale', 'une lampe sourde'])).toBe('plein')
    expect(TAILLE_CORPS.plein).toBe('clamp(1.55rem, 7vw, 2.1rem)')
  })

  it('baisse d’un cran au-delà de vingt-huit signes, et toujours à l’Atelier', () => {
    expect(corpsDuPoeme(['x'.repeat(SIGNES_PLEIN_CORPS)])).toBe('plein')
    expect(corpsDuPoeme(['x'.repeat(SIGNES_PLEIN_CORPS + 1)])).toBe('reduit')
    expect(corpsDuPoeme(['un athanor'], 'atelier')).toBe('reduit')
  })

  it('le retrait des débords : la première ligne au bord, la suite rentre', () => {
    expect(styleVers()).toEqual({ paddingLeft: RETRAIT_DEBORD, textIndent: `-${RETRAIT_DEBORD}` })
    // À côté de la lettrine, pas de retrait négatif : le premier mot passerait dessous.
    expect(styleVers(true).textIndent).toBe(0)
  })

  it('la fin de partie lit la taille du corps au lieu d’un corps unique', () => {
    const src = lire('pages/FinDePartie.tsx')
    expect(src).toMatch(/TAILLE_CORPS\[corps\]/)
    // Et la carte ne pose plus le voile crème fixe qui grisait les ambiances sombres.
    expect(src).not.toMatch(/rgba\(240,\s*228,\s*204,\s*0\.25\)/)
  })

  it('la lettrine est droite — elle héritait de l’italique du poème', () => {
    expect(lire('components/PoemeDevoile.tsx')).toMatch(/fontStyle: 'normal'/)
  })
})

describe('les lignes du feuillet savent de quelle case elles viennent', () => {
  it('une phrase : une bande par fragment non vide', () => {
    const r = lignesDuFeuillet('phrase-simple', ['le vernis', '', 'une lampe'])
    expect(r.lignes).toEqual(['le vernis', 'une lampe'])
    expect(r.cases).toEqual([0, 2])
  })

  it('des vers : la correction d’accord, si elle rend autant de lignes', () => {
    const r = lignesDuFeuillet('atelier', ['il est givré', 'la rue'], 'elle est givrée\nla rue')
    expect(r.lignes).toEqual(['elle est givrée', 'la rue'])
    expect(r.cases).toEqual([0, 1])
  })

  it('sinon les vers bruts : une couture sous le mauvais vers mentirait', () => {
    const r = lignesDuFeuillet('vers-libre', ['un', 'deux', 'trois'], 'un deux\ntrois')
    expect(r.lignes).toEqual(['un', 'deux', 'trois'])
    expect(r.cases).toEqual([0, 1, 2])
  })
})

describe('les coutures se posent sur le poème, elles ne le recopient plus', () => {
  it.each(['pages/FinDePartie.tsx', 'pages/PoemeDetail.tsx', 'pages/FinOnline.tsx'])('%s', f => {
    const src = lire(f)
    // L'ancienne liste réimprimait chaque texte de case sous le feuillet.
    expect(src).not.toMatch(/\{c(as)?\.texte\}\s*<\/(p|span)>/)
    expect(src).toMatch(/data-couture/)
  })
})

describe('la suite que propose le guide', () => {
  it('rejouer vient AVANT la visite du recueil et de la publication', () => {
    expect(T_FIN_SUITE).toBe(T_FIN_REVEL + 1)
    expect(T_BIBLIO).toBeGreaterThan(T_FIN_SUITE)
    expect(T_DETAIL).toBe(TUTORIEL_TOTAL - 1)
    expect(TUTORIEL_TOTAL).toBe(7)
  })

  it('« À plusieurs, sur ce téléphone » : deux mains, aucune voix', () => {
    const defaut: Siege[] = ['humain', 'ia', 'vide', 'vide', 'vide', 'vide']
    const t = tableAPlusieurs(defaut)
    expect(t).toHaveLength(NB_SIEGES)
    expect(t.filter(s => s === 'humain')).toHaveLength(2)
    expect(t).not.toContain('ia')
  })

  it('la table d’une soirée garde ses mains à leur siège, et perd ses voix', () => {
    const soiree: Siege[] = ['humain', 'ia', 'humain', 'humain', 'vide', 'vide']
    // Les prénoms sont rangés par siège : une main ne change pas de place.
    expect(tableAPlusieurs(soiree)).toEqual(['humain', 'vide', 'humain', 'humain', 'vide', 'vide'])
    // Une main et une voix : la voix part, la seconde main s'assoit.
    expect(tableAPlusieurs(['ia', 'humain', 'vide', 'vide', 'vide', 'vide']))
      .toEqual(['humain', 'humain', 'vide', 'vide', 'vide', 'vide'])
  })

  it('le paramètre d’adresse ne demande qu’un nombre de mains plausible', () => {
    expect(mainsDemandees('?mains=2')).toBe(2)
    expect(mainsDemandees('?mains=1')).toBe(0)
    expect(mainsDemandees('?mains=99')).toBe(0)
    expect(mainsDemandees('?mains=deux')).toBe(0)
    expect(mainsDemandees('')).toBe(0)
  })
})
