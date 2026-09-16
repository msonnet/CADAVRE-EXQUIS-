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

/** Une case d'un vers d'atelier, et la main qui l'a remplie. */
export interface MainCase {
  role: string          // la case grammaticale (SUJET, VERBE…)
  texte: string         // le fragment tel qu'il a été cousu
  voixNom?: string      // la persona ; absente pour le médium et pour la réserve
  reserve?: boolean     // true si le fragment vient de la réserve, pas d'une voix
}

export interface Case {
  numero: number
  fonction: string
  consigne: string
  auteur: 'humain' | 'ia' | 'mixte'
  joueurNumero?: number   // numéro du joueur humain en mode multijoueur
  voixSlot?: number       // slot IA stable dans la séquence (1-based) — pour affichage cohérent
  voixNom?: string        // persona qui a écrit le fragment — révélée dans les coutures, jamais pendant la partie
  nbVoix?: number         // atelier : combien de voix ont écrit CE vers (0 = le médium seul)
  mains?: MainCase[]      // atelier : qui a rempli quelle case, dans l'ordre du vers
  texte: string
  ts: number
  /** L'amorce du cadavre du jour : donnée à tout le monde, écrite par
   *  personne. Les coutures ne doivent l'attribuer à aucune main. */
  donne?: boolean
  fallback?: boolean      // true si le fragment provient de la réserve (API indisponible ou doublon remplacé)
}

export interface Illustration {
  url: string
  style: string
  promptLibre?: string
  promptUtilise: string
  dateGeneration: number
}

/**
 * La marque du cadavre du jour, portée par le poème lui-même.
 *
 * Sans elle, la page du jour ne peut PAS montrer des poèmes de la même
 * base : elle filtrait sur la seule date de publication, et ramassait donc
 * n'importe quel poème publié le même jour — une séance d'Atelier à
 * trente-sept vers, une partie libre dans une autre structure. La
 * comparaison, qui est tout l'intérêt du rendez-vous, était cassée à la
 * requête.
 */
export interface MarqueRituel {
  /** AAAA-MM-JJ local du rendez-vous. */
  jour: string
  /** L'amorce donnée ce jour-là — recopiée pour que la galerie soit lisible
   *  sans rejouer le calcul de la contrainte. */
  amorce: string
}

export interface Poeme {
  id: string
  titre: string | null
  structureId: StructureId
  mode: ModeJeu
  visibilite: Visibilite
  cases: Case[]
  illustration?: Illustration
  rituel?: MarqueRituel
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
