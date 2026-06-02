// ════════════════════════════════════════════════
// REVE · POOLS — Cadavre Exquis
//
// 5 ambiances (background + accents compatibles) qui se succèdent à
// chaque rêve. Chaque accent est testé pour le contraste sur son fond.
// Tout est domaine public en France (Breton, Desnos, Apollinaire, Cocteau).
// ════════════════════════════════════════════════

export interface Ambiance {
  id: AmbianceKey
  name: string
  bg: string
  ink: string
  inkSoft: string
  inkFaint: string
  rule: string
  halo?: string
  accents: Accent[]
  buttonText: string
}

export interface Accent {
  name: string
  hex: string
  hover: string
}

export type AmbianceKey = 'minuit' | 'encre' | 'argile' | 'lin' | 'aube'

export const AMBIANCES: Record<AmbianceKey, Ambiance> = {

  // ── SOMBRES ──

  // Cobalt-indigo profond · accent saumon chaud — tension visuelle maximale
  minuit: {
    id: 'minuit',
    name: 'Minuit profond',
    bg: '#141640',
    ink: '#f0e4cc',
    inkSoft: '#cec0a4',
    inkFaint: '#9e9078',
    rule: 'rgba(240, 228, 204, 0.16)',
    halo: 'radial-gradient(ellipse at 28% 18%, rgba(120, 90, 220, 0.20), transparent 48%), radial-gradient(ellipse at 72% 82%, rgba(240, 104, 64, 0.14), transparent 48%)',
    buttonText: '#141640',
    accents: [
      { name: 'saumon',  hex: '#f06840', hover: '#f88458' },
      { name: 'cobalt',  hex: '#8aaef8', hover: '#a4c6ff' },
      { name: 'or',      hex: '#d4a838', hover: '#e8bc4c' },
      { name: 'crème',   hex: '#f0e4cc', hover: '#faf0dc' },
    ],
  },

  // Noir absolu · rouge sang — choc graphique maximal
  encre: {
    id: 'encre',
    name: 'Encre profonde',
    bg: '#080604',
    ink: '#ede0c8',
    inkSoft: '#c4b098',
    inkFaint: '#8c786a',
    rule: 'rgba(237, 224, 200, 0.14)',
    halo: 'radial-gradient(ellipse at 50% 28%, rgba(220, 28, 16, 0.16), transparent 58%)',
    buttonText: '#080604',
    accents: [
      { name: 'rouge vif', hex: '#e82010', hover: '#f43020' },
      { name: 'or',        hex: '#d4a838', hover: '#e8bc4c' },
      { name: 'ocre',      hex: '#e8a050', hover: '#f4b464' },
      { name: 'crème',     hex: '#ede0c8', hover: '#f8ecd8' },
    ],
  },

  // Brun très sombre · or brûlé
  argile: {
    id: 'argile',
    name: 'Argile cuite',
    bg: '#1c1208',
    ink: '#eedcc0',
    inkSoft: '#ceba98',
    inkFaint: '#a89070',
    rule: 'rgba(238, 220, 192, 0.16)',
    halo: 'radial-gradient(ellipse at 20% 30%, rgba(212, 152, 72, 0.14), transparent 50%)',
    buttonText: '#1c1208',
    accents: [
      { name: 'or brûlé',    hex: '#d4a040', hover: '#e8b454' },
      { name: 'rouge brique', hex: '#e05a38', hover: '#f07050' },
      { name: 'crème',        hex: '#eedcc0', hover: '#f8e8d0' },
      { name: 'vert sauge',   hex: '#8aaa78', hover: '#9ec08c' },
    ],
  },

  // ── CLAIRS ──

  // Blanc chaud + rouge primaire + cobalt — palette libellule (ref. graphique)
  lin: {
    id: 'lin',
    name: 'Lin écru',
    bg: '#f2ede2',
    ink: '#0c0a06',
    inkSoft: '#2c2820',
    inkFaint: '#5a5040',
    rule: 'rgba(12, 10, 6, 0.13)',
    halo: 'radial-gradient(ellipse at 70% 78%, rgba(20, 40, 160, 0.05), transparent 55%)',
    buttonText: '#f2ede2',
    accents: [
      { name: 'rouge sang',  hex: '#c01c14', hover: '#d42c22' },
      { name: 'bleu cobalt', hex: '#1428a0', hover: '#2038b8' },
      { name: 'vert sapin',  hex: '#1a4a1e', hover: '#245e28' },
      { name: 'pourpre',     hex: '#701448', hover: '#8a1c60' },
    ],
  },

  // Blanc froid + indigo saturé — contraste maximal sur clair
  aube: {
    id: 'aube',
    name: 'Aube froide',
    bg: '#e4e8f0',
    ink: '#080c18',
    inkSoft: '#2c3048',
    inkFaint: '#4c5068',
    rule: 'rgba(8, 12, 24, 0.13)',
    halo: 'radial-gradient(ellipse at 20% 28%, rgba(100, 20, 80, 0.06), transparent 55%)',
    buttonText: '#e4e8f0',
    accents: [
      { name: 'bleu nuit',   hex: '#1428a0', hover: '#1c38c0' },
      { name: 'rouge vif',   hex: '#cc1c14', hover: '#e02c20' },
      { name: 'pourpre',     hex: '#681448', hover: '#801c60' },
      { name: 'vert encre',  hex: '#144830', hover: '#1c6040' },
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

// ─── Type legacy (compat) ───────────────────────────────────
export interface ColorSchema {
  name: string; bg: string; encre: string; hex: string; second: string
}
