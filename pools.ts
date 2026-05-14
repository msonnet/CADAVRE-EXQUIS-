// ════════════════════════════════════════════════
// Pools de données : marginalia, dérèglements, hachures
// ════════════════════════════════════════════════

export interface MargEntry {
  txt: string
  sub: string
}

/** Annotations manuscrites — pool ~25 entrées */
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

export type DereglementId =
  | 'pate'      // pâté d'encre
  | 'errata'    // bandeau d'errata
  | 'tampon'    // tampon de censure
  | 'coin'      // coin de page corné
  | 'compteur'  // compteur fou
  | 'biais'     // lettre déréglée

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
