// Types centraux de l'application

export type StructureId =
  | 'phrase-simple'
  | 'phrase-etoffee'
  | 'vers-libre'

export type ModeJeu = 'standard' | 'hypnotique'

export type Visibilite = 'aveugle' | 'dernier-mot' | 'derniere-case'

export type PremierJoueur = 'humain' | 'ia'

export interface ConfigPartie {
  structureId: StructureId
  visibilite: Visibilite
  premierJoueur: PremierJoueur
  mode: ModeJeu
  joueursHumains: number  // 1–4
  voixIA: number          // 0–4
}

export interface Case {
  numero: number
  fonction: string
  consigne: string
  auteur: 'humain' | 'ia'
  joueurNumero?: number   // numéro du joueur humain en mode multijoueur
  // PAS de voiceId — anonymat absolu
  texte: string
  ts: number
}

export interface Illustration {
  url: string
  style: string
  promptLibre?: string
  promptUtilise: string
  dateGeneration: number
}

export interface Poeme {
  id: string
  titre: string | null
  structureId: StructureId
  mode: ModeJeu
  visibilite: Visibilite
  cases: Case[]
  illustration?: Illustration
  dateCreation: number
  dateModification: number
}

export interface EtatJeu {
  partieId: string
  config: ConfigPartie
  cases: Case[]
  _voixDejaUtilisees: string[]
  caseEnCours: number
  termine: boolean
}

export interface Reglages {
  audioAmbiantActif: boolean
  volumeAmbiant: number
  volumeTTS: number
  voixTTS: string
  vitesseApparition: number
  validationGrammaticale: 'stricte' | 'souple' | 'desactivee'
}
