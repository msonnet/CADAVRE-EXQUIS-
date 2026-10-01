import { describe, it, expect } from 'vitest'
import { attribution, libelleReserve } from '../lib/attribution'
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

describe('attribution — la table locale', () => {
  it('le prénom passe avant le numéro', () => {
    // Avant : « joueur 1 » pour une main qui s'appelait Nadja.
    expect(attribution({ ...base, auteur: 'humain', joueurNumero: 1, pseudo: 'Nadja' })).toBe('Nadja')
  })

  it('seul, la main est la tienne — et non « joueur 1 »', () => {
    expect(attribution({ ...base, auteur: 'humain', joueurNumero: 1, moi: true })).toBe('toi')
  })

  it('une main sans prénom garde son numéro', () => {
    expect(attribution({ ...base, auteur: 'humain', joueurNumero: 2 })).toBe('joueur 2')
  })
})

describe('attribution — le nom des voix', () => {
  it('traduit l’identifiant que range le cadavre écrit', () => {
    // Les coutures affichaient « voix 2 · meteorologue », sans accent ni article.
    expect(attribution({ ...base, auteur: 'ia', voixNom: 'meteorologue' }, 2)).toBe('voix 2 · Le météorologue')
  })

  it('ne signe pas au nom de la voix un fragment de sa réserve', () => {
    expect(attribution({ ...base, auteur: 'ia', voixNom: 'cartographe', fallback: true }, 1)).toBe('voix 1')
  })
})

describe('libelleReserve', () => {
  it('dit de quelle voix vient la conserve, article contracté', () => {
    expect(libelleReserve('cartographe')).toBe('RÉSERVE DU CARTOGRAPHE')
    expect(libelleReserve('notice')).toBe('RÉSERVE DE LA NOTICE')
    expect(libelleReserve('herboriste')).toBe("RÉSERVE DE L'HERBORISTE")
    expect(libelleReserve('souffleur de verre')).toBe('RÉSERVE DU SOUFFLEUR DE VERRE')
  })

  it('reste nue quand le stock commun a parlé', () => {
    expect(libelleReserve(undefined)).toBe('RÉSERVE')
    expect(libelleReserve('inconnue')).toBe('RÉSERVE')
  })
})
