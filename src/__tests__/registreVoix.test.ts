import { describe, it, expect } from 'vitest'
import type { Case, Poeme } from '../types'
import { idDeVoix, nomsDeVoix } from '../data/voiceIds'
import { registreDesVoix, nomDuPoeme } from '../lib/registreVoix'

/**
 * Le registre des voix relit le recueil. Il doit reconnaître la même voix
 * sous les trois écritures que le recueil garde d'elle — l'identifiant du
 * serveur, son nom français, son nom anglais — et ne lui attribuer que ce
 * qu'elle a écrit.
 */

const J = 86_400_000
function poeme(id: string, date: number, cases: Partial<Case>[], extra: Partial<Poeme> = {}): Poeme {
  return {
    id, titre: null, structureId: 'phrase-simple', mode: 'standard', visibilite: 'aveugle',
    dateCreation: date, dateModification: date,
    cases: cases.map((c, i) => ({ numero: i + 1, fonction: '', consigne: '', auteur: 'humain', texte: '', ts: date, ...c })),
    ...extra,
  }
}

describe('idDeVoix', () => {
  it("reconnaît l'identifiant, le nom français et le nom anglais", () => {
    expect(idDeVoix('meteorologue')).toBe('meteorologue')
    expect(idDeVoix('Le météorologue')).toBe('meteorologue')
    expect(idDeVoix('The meteorologist')).toBe('meteorologue')
  })

  it('ignore la casse et l’apostrophe typographique', () => {
    expect(idDeVoix('le fossoyeur')).toBe('fossoyeur')
    expect(idDeVoix('L’apiculteur')).toBe('apiculteur')
    expect(idDeVoix('le souffleur de verre')).toBe('souffleur de verre')
  })

  it('ne devine pas un nom inconnu', () => {
    expect(idDeVoix('Écho')).toBeNull()
    expect(idDeVoix('constructor')).toBeNull()
    expect(idDeVoix(undefined)).toBeNull()
  })

  it('sépare les noms joints par les coutures', () => {
    expect(nomsDeVoix('Le marin · Le graveur')).toEqual(['Le marin', 'Le graveur'])
    expect(nomsDeVoix(undefined)).toEqual([])
  })
})

describe('registreDesVoix', () => {
  const t0 = Date.UTC(2026, 8, 14)
  const recueil: Poeme[] = [
    // Cadavre écrit : l'identifiant du serveur.
    poeme('p1', t0, [
      { texte: 'le vernis craquelé' },
      { auteur: 'ia', voixNom: 'meteorologue', texte: 'avale' },
      { auteur: 'ia', voixNom: 'chimiste', texte: 'une lampe sourde', fallback: true },
    ]),
    // Atelier : les noms affichés, et le détail des cases.
    poeme('p2', t0 + 2 * J, [
      {
        auteur: 'mixte', nbVoix: 2, voixNom: 'Le météorologue · Le graveur',
        texte: 'la pluie grave trois lettres sur le seuil',
        mains: [
          { role: 'SUJET', texte: 'la pluie' },
          { role: 'VERBE', texte: 'grave trois lettres', voixNom: 'Le graveur' },
          { role: 'LIEU', texte: 'sur le seuil', voixNom: 'Le météorologue' },
          { role: 'CHUTE', texte: 'rien', voixNom: 'Le chimiste', reserve: true },
        ],
      },
    ], { structureId: 'atelier', titre: 'Le givre' }),
    // Atelier ancien : les noms seuls, en anglais.
    poeme('p3', t0 + 4 * J, [
      { auteur: 'ia', nbVoix: 2, voixNom: 'The meteorologist · The sailor', texte: 'the salt forgets its harbour' },
    ], { structureId: 'atelier' }),
    // Poème du jour.
    poeme('jour-fr-2026-09-20', t0 + 6 * J, [
      { moi: true, texte: 'la cire coule vers le nord' },
      { auteur: 'ia', voixNom: 'greffier', texte: 'nord consigné au procès-verbal' },
      { auteur: 'ia', voixNom: 'Écho', texte: 'une voix que le registre ne connaît pas' },
    ], { structureId: 'vers-libre', origine: 'jour' }),
  ]
  const r = registreDesVoix(recueil)

  it('ne recense que les voix qui ont écrit', () => {
    expect([...r.keys()].sort()).toEqual(['graveur', 'greffier', 'marin', 'meteorologue'])
  })

  it('réunit une voix sous ses trois écritures, et compte ses séances', () => {
    const f = r.get('meteorologue')!
    expect(f.seances).toBe(3)
    expect(f.premiere).toBe(t0)
    expect(f.vers.map(v => v.poemeId)).toEqual(['p1', 'p2', 'p3'])
    expect(f.numero).toBe(3)
  })

  it("à l'Atelier, rend à la voix SA case, et garde le vers en contexte", () => {
    const v = r.get('graveur')!.vers[0]
    expect(v.texte).toBe('grave trois lettres')
    expect(v.ligne).toBe('la pluie grave trois lettres sur le seuil')
    expect(v.poeme).toBe('Le givre')
  })

  it("un vers ancien sans détail des cases est marqué comme partagé", () => {
    const v = r.get('marin')!.vers[0]
    expect(v.texte).toBe('the salt forgets its harbour')
    expect(v.partage).toBe(2)
  })

  it("la réserve n'est à personne", () => {
    expect(r.has('chimiste')).toBe(false)
  })

  it('nomme le poème par son titre, ou par son premier vers', () => {
    expect(r.get('greffier')!.vers[0].poeme).toBe('la cire coule vers le nord')
    expect(nomDuPoeme(recueil[1])).toBe('Le givre')
  })

  it('un recueil sans voix donne un registre vide', () => {
    expect(registreDesVoix([poeme('seul', t0, [{ texte: 'rien que moi' }])]).size).toBe(0)
  })
})
