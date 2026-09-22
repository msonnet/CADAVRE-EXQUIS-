import { describe, it, expect } from 'vitest'
import { contientDeLIA, mentionIA } from '../lib/attribution'
import { composerTexte, composerSauvegarde } from '../lib/recueil'
import type { Poeme, Case } from '../types'

/**
 * Le marquage des textes de synthèse — 22 septembre 2026.
 *
 * L'article 50 du règlement européen sur l'IA, applicable depuis le 2 août
 * 2026, demande que les sorties d'un système générant du texte de synthèse
 * soient identifiables comme telles, et cette obligation est portée par qui
 * met le système sur le marché — pas par le fournisseur du modèle.
 *
 * Dans l'application, les coutures le disent déjà et le disent bien. Mais
 * un poème EXPORTÉ en `.txt` sortait nu : rien dans le fichier ne disait
 * qu'une machine y avait écrit. C'est ce trou que ces mesures ferment, et
 * elles gardent aussi l'autre bord — ne rien apposer sur un poème
 * entièrement humain, sans quoi la mention ne voudrait plus rien dire.
 */

function c(auteur: Case['auteur'], texte: string): Case {
  return { numero: 1, fonction: 'libre', consigne: '', auteur, texte, ts: 0 }
}

function poeme(cases: Case[]): Poeme {
  return {
    id: 'p1', titre: 'le vernis', structureId: 'phrase-simple',
    cases, dateCreation: Date.UTC(2026, 8, 14),
  } as Poeme
}

describe('contientDeLIA', () => {
  it('voit une voix, et une main partagée', () => {
    expect(contientDeLIA([c('humain', 'a'), c('ia', 'b')])).toBe(true)
    // 'mixte' est un vers d'atelier où le médium et une voix se partagent
    // la ligne : une machine y a bien écrit.
    expect(contientDeLIA([c('humain', 'a'), c('mixte', 'b')])).toBe(true)
  })

  it('ne voit rien là où il n’y a que des mains', () => {
    expect(contientDeLIA([c('humain', 'a'), c('humain', 'b')])).toBe(false)
    expect(contientDeLIA([])).toBe(false)
  })
})

describe('le recueil exporté porte la mention', () => {
  it('quand une voix a écrit', () => {
    const txt = composerTexte([poeme([c('humain', 'le vernis'), c('ia', 'avale une lampe')])])
    expect(txt).toContain(mentionIA())
    expect(txt, 'le modèle est nommé').toMatch(/Claude|Anthropic/)
  })

  it('jamais sur un poème entièrement humain', () => {
    // La mention partout la viderait de son sens, et mentirait dans
    // l'autre sens : le jeu se joue très bien sans aucune voix.
    const txt = composerTexte([poeme([c('humain', 'le vernis'), c('humain', 'craquelé')])])
    expect(txt).not.toContain(mentionIA())
    expect(txt).not.toMatch(/intelligence artificielle|artificial intelligence/)
  })

  it('une fois par poème, et sur le bon', () => {
    const txt = composerTexte([
      poeme([c('humain', 'premier poème, tout humain')]),
      { ...poeme([c('ia', 'second poème, une voix')]), id: 'p2', titre: 'la cire' },
    ])
    expect(txt.split(mentionIA()).length - 1, 'une seule mention').toBe(1)
    // Et elle suit le poème qu'elle concerne, pas l'autre.
    expect(txt.indexOf(mentionIA())).toBeGreaterThan(txt.indexOf('la cire'))
  })

  it('n’est pas une exclamation et ne porte pas d’emoji', () => {
    const m = mentionIA()
    expect(m).not.toMatch(/[!\u{1F300}-\u{1FAFF}]/u)
  })
})

describe('la sauvegarde porte déjà le marquage lisible par machine', () => {
  it('`auteur` survit à l’aller-retour JSON', () => {
    // C'est ce champ qui rend le fichier exploitable par un outil, et il
    // existait avant l'obligation. Rien à ajouter — mais rien à perdre non
    // plus, d'où cette mesure.
    const s = JSON.parse(composerSauvegarde([poeme([c('humain', 'a'), c('ia', 'b')])]))
    expect(s.poemes[0].cases.map((x: Case) => x.auteur)).toEqual(['humain', 'ia'])
  })
})
