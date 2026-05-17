// ════════════════════════════════════════════════
// SCHÉMAS CHROMATIQUES — tirés au hasard par seed
// Chaque rêve prend une teinte différente pour les dessins
// ════════════════════════════════════════════════

export type ColorKey =
  | 'rouge' | 'bleu' | 'vert' | 'ocre'
  | 'sepia' | 'pourpre' | 'ardoise' | 'cuivre'

export interface ColorSchema {
  /** Filtre CSS pour teinter les SVG noir vers cette couleur. */
  filter: string
  /** Hex de la couleur dominante (pour bordures, accents, marginalia). */
  hex: string
  /** Nom lisible. */
  label: string
}

export const COLOR_SCHEMAS: Record<ColorKey, ColorSchema> = {
  rouge: {
    filter: 'brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4500%) hue-rotate(345deg) brightness(95%) contrast(98%)',
    hex: '#e83830', label: 'Rouge écarlate',
  },
  bleu: {
    filter: 'brightness(0) saturate(100%) invert(18%) sepia(70%) saturate(2200%) hue-rotate(218deg) brightness(85%) contrast(110%)',
    hex: '#1d3a8c', label: 'Bleu de Prusse',
  },
  vert: {
    filter: 'brightness(0) saturate(100%) invert(32%) sepia(60%) saturate(1500%) hue-rotate(115deg) brightness(75%) contrast(105%)',
    hex: '#2a8a6d', label: "Vert d'absinthe",
  },
  ocre: {
    filter: 'brightness(0) saturate(100%) invert(48%) sepia(85%) saturate(800%) hue-rotate(8deg) brightness(75%) contrast(105%)',
    hex: '#c47a18', label: 'Ocre soufré',
  },
  sepia: {
    filter: 'brightness(0) saturate(100%) invert(28%) sepia(95%) saturate(800%) hue-rotate(355deg) brightness(78%) contrast(95%)',
    hex: '#6d3a18', label: 'Sépia',
  },
  pourpre: {
    filter: 'brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(1500%) hue-rotate(285deg) brightness(70%) contrast(105%)',
    hex: '#5a1a6a', label: 'Pourpre cardinal',
  },
  ardoise: {
    filter: 'brightness(0) saturate(100%) invert(15%) sepia(15%) saturate(800%) hue-rotate(180deg) brightness(60%) contrast(95%)',
    hex: '#2a3a4a', label: 'Ardoise',
  },
  cuivre: {
    filter: 'brightness(0) saturate(100%) invert(38%) sepia(85%) saturate(1500%) hue-rotate(355deg) brightness(70%) contrast(105%)',
    hex: '#a85028', label: 'Cuivre',
  },
}

/** Pool de couleurs candidates pour le tirage automatique. */
export const COLOR_POOL: ColorKey[] = ['rouge', 'bleu', 'vert', 'ocre', 'sepia', 'pourpre', 'ardoise', 'cuivre']

// ════════════════════════════════════════════════
// MOTS-CLÉS POUR LE HEADER (pipe-séparés)
// ════════════════════════════════════════════════
export const KEYWORDS_POOL = [
  'rêve', 'inconscient', 'sept voix', 'fragment',
  'plume', 'anonyme', 'automatique', 'collage',
  'cadavre', 'syntaxe', 'mémoire', 'écume',
  'aurore', 'nocturne', 'absent', 'soluble',
]

// ════════════════════════════════════════════════
// MARGINALIA & DÉRÈGLEMENTS (inchangés)
// ════════════════════════════════════════════════
export interface MargEntry {
  txt: string
  sub: string
}

export const MARGINALIA: MargEntry[] = [
  { txt: "d'après Breton, 1924", sub: "— Manifeste —" },
  { txt: "rêve du 7 mai", sub: "Tome III, p. 42" },
  { txt: "✗ tout est faux", sub: "(donc vrai)" },
  { txt: "« écrire vite »", sub: "— sans souci littéraire —" },
  { txt: "La beauté sera", sub: "convulsive ou ne sera pas" },
  { txt: "Soluble fish", sub: "cf. p. 73" },
  { txt: "✓ vu par A.B.", sub: "Iᵉʳ Congrès" },
  { txt: "Nadja a souri", sub: "20 IX MCMXXVI" },
  { txt: "ceci n'est pas", sub: "un poème" },
  { txt: "⌖ point d'aiguille", sub: "Aragon · 1928" },
  { txt: "rature obligatoire", sub: "— typographe —" },
  { txt: "le hasard fait", sub: "mal les choses" },
  { txt: "à reprendre !", sub: "cf. § VII" },
  { txt: "« j'écris donc je rêve »", sub: "— d'après Desnos —" },
  { txt: "voir : l'oiseau", sub: "mais où ?" },
  { txt: "transition impossible", sub: "✓ noté" },
  { txt: "Éluard approuve", sub: "lettre du XII mars" },
  { txt: "la femme 100 têtes", sub: "— Ernst, 1929 —" },
  { txt: "errare humanum", sub: "errare poeticum" },
  { txt: "« le sommeil de la raison »", sub: "engendre des monstres" },
  { txt: "attention : faux ami", sub: "— ne pas céder —" },
  { txt: "cinq voix manquent", sub: "? ou bien six ?" },
  { txt: "cadavre encore tiède", sub: "XX h XLVII" },
  { txt: "rêvé · pas écrit", sub: "— même chose —" },
  { txt: "mot trouvé rue", sub: "de Tournon" },
]

export type DereglementId = 'pate' | 'errata' | 'tampon' | 'coin' | 'compteur' | 'biais'

export const DERLG: DereglementId[] = ['pate', 'errata', 'tampon', 'coin', 'compteur']

export const MOTS_TROUVES = [
  'CLEF', 'OISEAU', 'INSOMNIE', 'ROSE', 'AURORE',
  'CENDRE', 'ÉCUME', 'POUSSIÈRE', 'VERTIGE', 'NUIT', 'PLUME', 'LUNE',
]

export const TXT_TAMPONS = ['BON À TIRER', 'CENSURÉ', 'LU', 'SOMMEIL', 'RÊVE №']

export const TXT_ERRATA = [
  'errata · lire « rose »',
  'corriger : aurore-cycle',
  'noté p. 73 — A.B.',
  'lire : convulsive',
]
