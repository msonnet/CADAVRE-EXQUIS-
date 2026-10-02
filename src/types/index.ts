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
  fallback?: boolean      // true si le fragment provient de la réserve (API indisponible ou doublon remplacé)
  pseudo?: string         // salon ou poème du jour : la personne qui a posé la case
  moi?: boolean           // salon ou poème du jour : la case est la tienne
  /** Feuillet relié au carnet : la signature du vers telle que les coutures
   *  de son poème d'origine l'annonçaient quand on l'a gardé. */
  signature?: string
}

/**
 * Le fil qui relie un feuillet du recueil à sa publication en galerie.
 *
 * Le feuillet ignorait qu'il avait été publié : le bouton redevenait actif
 * deux secondes après « ✓ PUBLIÉ », on pouvait publier trois fois le même
 * poème, et aucune lecture ne pouvait remonter jusqu'à son auteur. `id` est
 * celui de la ligne `gallery` ; il peut manquer si la base n'a pas rendu la
 * ligne écrite — le poème reste alors marqué publié, sans compteurs.
 */
export interface LienPublication {
  id?: string
  date: number
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
  /** D'où vient le poème, quand ce n'est pas d'une partie sur ce téléphone.
   *  'carnet' : relié à la main depuis les vers gardés (`lib/composition.ts`). */
  origine?: 'salon' | 'jour' | 'carnet'
  /** Poème du jour : la journée UTC qu'il a occupée, AAAA-MM-JJ. */
  jour?: string
  /** Sa publication en galerie, s'il en a une — voir `LienPublication`. */
  publication?: LienPublication
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
  publication?: LienPublication
  dateCreation: number
  dateModification: number
}
