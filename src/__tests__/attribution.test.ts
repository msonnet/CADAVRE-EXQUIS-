import { describe, it, expect } from 'vitest'
import { attribution } from '../lib/attribution'
import type { Case } from '../types'

const base = { numero: 1, fonction: 'vers 1', consigne: '', texte: 'x', ts: 0 }

describe('attribution — vers d\'atelier', () => {
  it('annonce le nombre de mains avant les noms', () => {
    const c: Case = { ...base, auteur: 'ia', nbVoix: 3, voixNom: 'le fossoyeur · le graveur · l\'apiculteur' }
    expect(attribution(c)).toBe("III voix · le fossoyeur · le graveur · l'apiculteur")
  })

  it('accorde le singulier', () => {
    expect(attribution({ ...base, auteur: 'ia', nbVoix: 1, voixNom: 'le boucher' }))
      .toBe('une voix · le boucher')
  })

  it('sait lire un vers mixte — que personne ne savait lire', () => {
    expect(attribution({ ...base, auteur: 'mixte', nbVoix: 2, voixNom: 'le marin · le graveur' }))
      .toBe('toi et II voix · le marin · le graveur')
  })

  it('le médium seul sur son vers', () => {
    expect(attribution({ ...base, auteur: 'humain', nbVoix: 0 })).toBe('toi seul')
  })

  it('sans nom de voix — quand tout vient de la réserve', () => {
    expect(attribution({ ...base, auteur: 'ia', nbVoix: 2 })).toBe('II voix')
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
