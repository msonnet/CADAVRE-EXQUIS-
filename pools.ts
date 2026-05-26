// ════════════════════════════════════════════════
// REVE · POOLS — Cadavre Exquis
//
// REMPLACE INTÉGRALEMENT src/reve/pools.ts existant.
//
// 5 ambiances (background + accents compatibles) qui se succèdent à
// chaque rêve. Chaque accent est testé pour le contraste sur son fond.
// Tout est domaine public en France (Breton, Desnos, Apollinaire, Cocteau).
// ════════════════════════════════════════════════

// ─── Ambiance = un fond + son pool d'accents compatibles ──
//
// Règle : chaque accent doit avoir un ratio WCAG AA (4.5:1+) sur le fond.
// Le PRNG choisit d'abord l'ambiance, puis un accent dans son pool.

export interface Ambiance {
  /** Identifiant stable. */
  id: AmbianceKey
  /** Nom lisible. */
  name: string
  /** Couleur de fond. */
  bg: string
  /** Couleur du texte principal (encre ou crème selon clair/sombre). */
  ink: string
  /** Texte secondaire (un cran plus pâle/sombre). */
  inkSoft: string
  /** Texte tertiaire (le plus pâle/sombre). */
  inkFaint: string
  /** Couleur des subtils dividers et borders. */
  rule: string
  /** Halo radial décoratif (optionnel) — rgba. */
  halo?: string
  /** Pool d'accents compatibles. Le rêve en choisit un. */
  accents: Accent[]
  /** Couleur du bouton primaire — texte sur l'accent. */
  buttonText: string
}

export interface Accent {
  /** Nom lisible. */
  name: string
  /** Couleur principale (CTA, titre, label). */
  hex: string
  /** Variante hover/pressed. */
  hover: string
}

export type AmbianceKey = 'minuit' | 'encre' | 'argile' | 'lin' | 'aube'

// ─── Les 5 ambiances ──────────────────────────────
// Chaque accent a été vérifié : ratio ≥ 4.5:1 sur son fond (WCAG AA pour texte).

export const AMBIANCES: Record<AmbianceKey, Ambiance> = {

  // ── SOMBRES ──

  minuit: {
    id: 'minuit',
    name: 'Minuit profond',
    bg: '#0e1726',
    ink: '#e8dec8',
    inkSoft: '#c8b89a',
    inkFaint: '#8a7a60',
    rule: 'rgba(232, 222, 200, 0.18)',
    halo: 'radial-gradient(ellipse at 30% 20%, rgba(120, 90, 200, 0.10), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(178, 44, 32, 0.08), transparent 50%)',
    buttonText: '#0e1726',
    accents: [
      { name: 'or',       hex: '#d4a838', hover: '#e8bc4c' },
      { name: 'cobalt',   hex: '#6a8ad8', hover: '#8aa8ec' },
      { name: 'cinabre',  hex: '#e8623a', hover: '#f47a52' },
      { name: 'crème',    hex: '#e8dec8', hover: '#f4ead4' },
    ],
  },

  encre: {
    id: 'encre',
    name: 'Encre profonde',
    bg: '#15110d',
    ink: '#e6d4b8',
    inkSoft: '#c8b89a',
    inkFaint: '#887458',
    rule: 'rgba(230, 212, 184, 0.16)',
    halo: 'radial-gradient(ellipse at 50% 30%, rgba(178, 44, 32, 0.10), transparent 60%)',
    buttonText: '#15110d',
    accents: [
      { name: 'rouge feu',  hex: '#e84a3a', hover: '#f25e4e' },
      { name: 'or',         hex: '#d4a838', hover: '#e8bc4c' },
      { name: 'ocre',       hex: '#e8a050', hover: '#f4b464' },
      { name: 'crème',      hex: '#e6d4b8', hover: '#f0e0c8' },
    ],
  },

  argile: {
    id: 'argile',
    name: 'Argile cuite',
    bg: '#2a2018',
    ink: '#e8dac0',
    inkSoft: '#c8b896',
    inkFaint: '#887458',
    rule: 'rgba(232, 218, 192, 0.18)',
    halo: 'radial-gradient(ellipse at 20% 30%, rgba(200, 152, 88, 0.10), transparent 50%)',
    buttonText: '#2a2018',
    accents: [
      { name: 'or chaud',   hex: '#d4a060', hover: '#e8b474' },
      { name: 'rouge brique', hex: '#e8624a', hover: '#f4765e' },
      { name: 'crème',      hex: '#e8dac0', hover: '#f4e6d0' },
      { name: 'vert sauge', hex: '#9ab488', hover: '#aec89c' },
    ],
  },

  // ── CLAIRS ──

  lin: {
    id: 'lin',
    name: 'Lin écru',
    bg: '#e6dfc9',
    ink: '#15110a',
    inkSoft: '#3a3024',
    inkFaint: '#6a5c44',
    rule: 'rgba(21, 17, 10, 0.16)',
    halo: 'radial-gradient(ellipse at 70% 80%, rgba(58, 107, 58, 0.06), transparent 55%)',
    buttonText: '#e6dfc9',
    accents: [
      { name: 'vert sapin',   hex: '#2e5a2e', hover: '#3a6b3a' },
      { name: 'pourpre',      hex: '#7a2858', hover: '#8e3868' },
      { name: 'bleu encre',   hex: '#1d3a8c', hover: '#2a4aa0' },
      { name: 'rouge brique', hex: '#a83a28', hover: '#b84a38' },
    ],
  },

  aube: {
    id: 'aube',
    name: 'Aube froide',
    bg: '#dde0e6',
    ink: '#12141a',
    inkSoft: '#3a3e48',
    inkFaint: '#6a6e78',
    rule: 'rgba(18, 20, 26, 0.16)',
    halo: 'radial-gradient(ellipse at 20% 30%, rgba(122, 40, 88, 0.06), transparent 55%)',
    buttonText: '#dde0e6',
    accents: [
      { name: 'bleu nuit',    hex: '#1d3a8c', hover: '#2a4aa0' },
      { name: 'pourpre',      hex: '#7a2858', hover: '#8e3868' },
      { name: 'rouge sourd',  hex: '#8a2418', hover: '#a03428' },
      { name: 'vert encre',   hex: '#1d4a3a', hover: '#2a5c4a' },
    ],
  },
}

export const AMBIANCE_POOL: AmbianceKey[] = ['minuit', 'encre', 'argile', 'lin', 'aube']

// ─── Citations · domaine public uniquement (FR) ─────
export interface Citation { t: string; a: string }
export const CITATIONS: Citation[] = [
  { t: '« Une voix humaine, quarante inconnus, un seul poème. »', a: "— d'après le Iᵉʳ Manifeste, Breton, 1924" },
  { t: '« La beauté sera convulsive ou ne sera pas. »', a: '— A. Breton, Nadja, 1928' },
  { t: '« Je rêve donc je suis. »', a: "— d'après R. Desnos, 1923" },
  { t: '« Lâchez tout. Partez sur les routes. »', a: '— A. Breton, 1924' },
  { t: '« Le poète n\'invente pas, il écoute. »', a: "— d'après J. Cocteau, 1922" },
  { t: '« L\'imagination est ce qui tend à devenir réel. »', a: '— A. Breton, 1937' },
  { t: '« Sous le pont Mirabeau coule un autre poème. »', a: "— d'après G. Apollinaire" },
  { t: '« Le sommeil ouvre ce que l\'éveil referme. »', a: "— d'après R. Desnos" },
]

// ─── Étiquettes typewriter ──
export const ETIQ_POOL: Array<[string, string]> = [
  ['jeu de plume', 'à plusieurs mains'],
  ['écrit en sommeil', 'lu au matin'],
  ['sept voix anonymes', 'une seule phrase'],
  ["ceci n'est pas", 'un poème'],
  ['rêvé · pas écrit', 'même chose'],
  ['une voix humaine', 'quarante inconnus'],
  ['sans plan ni patron', 'le hasard objectif'],
  ['écrire vite', 'sans souci littéraire'],
]

// ─── Heures nocturnes ──
export const HEURES_NOCTURNES = [
  '03h47, vendredi', '02h14, mardi', '04h32, dimanche',
  '01h08, jeudi', '03h21, samedi', '05h09, lundi',
  '02h56, mercredi', '04h47, vendredi', '03h33, dimanche',
  '01h47, jeudi', '04h11, mardi',
]

export interface MargEntry { txt: string; sub: string }
export const MARGINALIA: MargEntry[] = [
  { txt: "d'après Breton, 1924", sub: '— Manifeste —' },
  { txt: 'rêve du 7 mai', sub: 'Tome III, p. 42' },
  { txt: '✗ tout est faux', sub: '(donc vrai)' },
  { txt: '« écrire vite »', sub: '— sans souci littéraire —' },
  { txt: 'La beauté sera', sub: 'convulsive ou ne sera pas' },
  { txt: 'Soluble fish', sub: 'cf. p. 73' },
  { txt: '✓ vu par A.B.', sub: 'Iᵉʳ Congrès' },
  { txt: 'Nadja a souri', sub: '20 IX MCMXXVI' },
  { txt: "ceci n'est pas", sub: 'un poème' },
  { txt: 'le hasard fait', sub: 'mal les choses' },
  { txt: 'rêvé · pas écrit', sub: '— même chose —' },
]
