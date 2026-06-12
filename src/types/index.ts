// Types centraux de l'application

export type StructureId =
  | 'phrase-simple'
  | 'phrase-etoffee'
  | 'vers-libre'
  | 'atelier'

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
  auteur: 'humain' | 'ia' | 'mixte'
  joueurNumero?: number   // numéro du joueur humain en mode multijoueur
  voixSlot?: number       // slot IA stable dans la séquence (1-based) — pour affichage cohérent
  texte: string
  ts: number
  fallback?: boolean      // true si le fragment provient de la réserve (API indisponible ou doublon remplacé)
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

// ── Mode dessin ──────────────────────────────────

export interface ConfigDessin {
  nbBandes: number                    // 2–5 : nombre de fragments
  joueurs: number                     // 1–5 : nombre de joueurs (peut différer des bandes)
  visibilite: 'aveugle' | 'raccord'
}

export interface BandeDessin {
  joueurIdx: number
  joueurNumero: number                // 1-based, cyclique si joueurs < nbBandes
  imageDataUrl: string                // data:image/png;base64,...
  width: number
  height: number
  lowestDrawnFraction: number         // 0–1 : fraction de hauteur du dernier pixel dessiné
  dpr: number                         // devicePixelRatio au moment du dessin
  ts: number
}

export interface DessinCadavre {
  id: string
  titre: string | null
  nbBandes: number
  imageDataUrl: string  // dessin assemblé final
  texteVision?: string  // texte généré par Claude Vision
  dateCreation: number
  dateModification: number
}
