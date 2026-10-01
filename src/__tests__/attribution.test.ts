import { describe, it, expect, vi } from 'vitest'
import { attribution, attributionEnMorceaux, nomAffiche } from '../lib/attribution'
import type { Case } from '../types'

const base = { numero: 1, fonction: 'vers 1', consigne: '', texte: 'x', ts: 0 }

describe('attribution — vers d\'atelier', () => {
  it('annonce le nombre de mains avant les noms', () => {
    const c: Case = { ...base, auteur: 'ia', nbVoix: 3, voixNom: 'le fossoyeur · le graveur · l\'apiculteur' }
    expect(attribution(c)).toBe("3 voix · le fossoyeur · le graveur · l'apiculteur")
  })

  it('accorde le singulier', () => {
    expect(attribution({ ...base, auteur: 'ia', nbVoix: 1, voixNom: 'le boucher' }))
      .toBe('une voix · le boucher')
  })

  it('sait lire un vers mixte — que personne ne savait lire', () => {
    expect(attribution({ ...base, auteur: 'mixte', nbVoix: 2, voixNom: 'le marin · le graveur' }))
      .toBe('toi et 2 voix · le marin · le graveur')
  })

  it('le médium seul sur son vers', () => {
    expect(attribution({ ...base, auteur: 'humain', nbVoix: 0 })).toBe('toi seul')
  })

  it('sans nom de voix — quand tout vient de la réserve', () => {
    expect(attribution({ ...base, auteur: 'ia', nbVoix: 2 })).toBe('2 voix')
  })
})

describe('attribution — cadavre écrit', () => {
  it('numérote la voix et la nomme', () => {
    expect(attribution({ ...base, auteur: 'ia', voixNom: 'le télégraphiste' }, 2))
      .toBe('voix 2 · le télégraphiste')
  })

  it('le joueur numéroté en multijoueur', () => {
    expect(attribution({ ...base, auteur: 'humain', joueurNumero: 3 })).toBe('joueur 3')
  })

  it('toi, par défaut', () => {
    expect(attribution({ ...base, auteur: 'humain' })).toBe('toi')
  })

  it('un vers d\'atelier ne retombe jamais sur « toi » — la régression corrigée', () => {
    // `auteur: 'mixte'` n'était traité nulle part et retombait sur « toi ».
    expect(attribution({ ...base, auteur: 'mixte', nbVoix: 1, voixNom: 'le rêveur' }))
      .not.toBe('toi')
  })
})

describe("attribution — l'identifiant qui s'affichait nu", () => {
  // Le cadavre écrit, le salon et le poème du jour gardent l'identifiant de
  // la voix. Les coutures annonçaient « voix 2 · meteorologue ».
  it("rend le nom d'une voix gardée par son identifiant", () => {
    expect(attribution({ ...base, auteur: 'ia', voixNom: 'meteorologue' }, 2))
      .toBe('voix 2 · Le météorologue')
    expect(attribution({ ...base, auteur: 'ia', voixNom: 'souffleur de verre' }))
      .toBe('voix · Le souffleur de verre')
  })

  it('laisse tel quel un nom déjà écrit, ou inconnu', () => {
    expect(attribution({ ...base, auteur: 'ia', voixNom: 'Écho' }, 1)).toBe('voix 1 · Écho')
    expect(attribution({ ...base, auteur: 'ia', voixNom: 'constructor' })).toBe('voix · constructor')
  })

  it('rend un nom reconnu dans la langue courante, et garde celui déjà écrit dans cette langue', () => {
    // Un Atelier joué en français, relu en anglais : les coutures disaient
    // « Le météorologue » et la fiche du registre « The meteorologist ».
    // Pas de navigateur sous Node : la langue est lue dans un stockage simulé.
    const st = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => st.get(k) ?? null, setItem: (k: string, v: string) => { st.set(k, v) } })
    try {
      st.set('langue', 'en')
      expect(nomAffiche('Le météorologue')).toBe('The meteorologist')
      expect(nomAffiche('the engraver')).toBe('the engraver')
      expect(nomAffiche('Écho')).toBe('Écho')
      st.set('langue', 'fr')
      expect(nomAffiche('The meteorologist')).toBe('Le météorologue')
      expect(nomAffiche('le graveur')).toBe('le graveur')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('sépare la phrase et les noms, pour que les coutures les lient un à un', () => {
    expect(attributionEnMorceaux({ ...base, auteur: 'mixte', nbVoix: 2, voixNom: 'le marin · le graveur' }))
      .toEqual({ texte: 'toi et 2 voix', voix: ['le marin', 'le graveur'] })
    expect(attributionEnMorceaux({ ...base, auteur: 'humain', nbVoix: 0, voixNom: 'le marin' }))
      .toEqual({ texte: 'toi seul', voix: [] })
  })
})
