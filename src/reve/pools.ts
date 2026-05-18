// ════════════════════════════════════════════════
// POOLS pour le système Rêve · Q v3
// Tout est domaine public ou stylistique — commerce-safe
// ════════════════════════════════════════════════

export type ColorKey = 'rouge' | 'cinabre' | 'ocre' | 'bleu' | 'pourpre'

export interface ColorSchema {
  name: string
  bg: string
  encre: string
  hex: string  // accent
}

export const COLOR_SCHEMAS: Record<ColorKey, ColorSchema> = {
  rouge:   { name: 'rouge sang',  bg: '#e6d4b8', encre: '#0f0805', hex: '#b22c20' },
  cinabre: { name: 'cinabre',     bg: '#e8dcc0', encre: '#0f0805', hex: '#c54820' },
  ocre:    { name: 'ocre brûlée', bg: '#e4d2b0', encre: '#1a0f08', hex: '#a85a20' },
  bleu:    { name: 'bleu prusse', bg: '#e6d8bc', encre: '#0f0805', hex: '#1d3a8c' },
  pourpre: { name: 'pourpre',     bg: '#e8d6bc', encre: '#0a0805', hex: '#7a2858' },
}

export const COLOR_POOL: ColorKey[] = ['rouge', 'cinabre', 'ocre', 'bleu', 'pourpre']

// ─── CITATIONS — auteurs en domaine public en France ──
export interface Citation { t: string; a: string }
export const CITATIONS: Citation[] = [
  { t: '« Une voix humaine, quarante inconnus, un seul poème. »', a: "— d'après le Iᵉʳ Manifeste, Breton, 1924" },
  { t: '« La beauté sera convulsive ou ne sera pas. »', a: '— A. Breton, Nadja, 1928' },
  { t: '« Je rêve donc je suis. »', a: "— d'après R. Desnos, 1923" },
  { t: '« Lâchez tout. Partez sur les routes. »', a: '— A. Breton, 1924' },
  { t: '« Le poète n\'invente pas, il écoute. »', a: "— d'après J. Cocteau, 1922" },
  { t: '« L\'imagination est ce qui tend à devenir réel. »', a: '— A. Breton, 1937' },
  { t: '« Sous le pont Mirabeau coule un autre poème. »', a: "— d'après G. Apollinaire" },
]

// ─── ÉTIQUETTES TYPEWRITER ──
export const ETIQ_POOL: Array<[string, string]> = [
  ['jeu de plume', 'à plusieurs mains'],
  ['écrit en sommeil', 'lu au matin'],
  ['sept voix anonymes', 'une seule phrase'],
  ['ceci n\'est pas', 'un poème'],
  ['rêvé · pas écrit', 'même chose'],
  ['une voix humaine', 'quarante inconnus'],
  ['sans plan ni patron', 'le hasard objectif'],
  ['écrire vite', 'sans souci littéraire'],
]

// ─── HEURES NOCTURNES IMPROBABLES ──
export const HEURES_NOCTURNES = [
  '03h47, vendredi', '02h14, mardi', '04h32, dimanche',
  '01h08, jeudi', '03h21, samedi', '05h09, lundi',
  '02h56, mercredi', '04h47, vendredi', '03h33, dimanche',
  '01h47, jeudi', '04h11, mardi',
]

// ─── ANNOTATIONS MANUSCRITES (marginalia, optionnelles) ──
export interface MargEntry { txt: string; sub: string }
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
  { txt: "le hasard fait", sub: "mal les choses" },
  { txt: "rêvé · pas écrit", sub: "— même chose —" },
]

// ─── COMBINAISONS DE RAYURES OPTIQUES ──
export type StripePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
export interface StripeSpec { pos: StripePosition; size: number; height: number }
export const STRIPE_COMBOS: StripeSpec[][] = [
  [{ pos: 'top-right', size: 36, height: 42 }, { pos: 'bottom-left', size: 28, height: 28 }],
  [{ pos: 'top-left', size: 32, height: 38 }, { pos: 'bottom-right', size: 30, height: 26 }],
  [{ pos: 'top-right', size: 30, height: 36 }],
  [{ pos: 'bottom-left', size: 36, height: 32 }, { pos: 'top-right', size: 26, height: 28 }],
]
