/**
 * La consigne de déterminant, telle qu'elle part dans le prompt.
 *
 * Le client choisit la STRATÉGIE — c'est lui qui connaît l'idiolecte de la
 * voix et l'histoire des ouvertures du poème (`src/lib/determinants.ts`). Le
 * serveur, lui, la met en mots : la clé reçue est validée contre cette table
 * et rien d'autre ne passe. Une phrase toute faite venue du client entrerait
 * telle quelle dans le prompt système ; une clé ne peut rien injecter.
 *
 * Pourquoi la stratégie et non le déterminant lui-même : les voix inventent un
 * vocabulaire sans bornes — « paraison », « mordançage », « remige ». Deviner
 * le genre pour poser l'article donnerait « un remige ». Le modèle, lui, sait.
 */

/** Ouverture qui n'est pas un groupe nominal du tout. */
export const HORS_GN = 'HORS_GN'

const CONSIGNES_FR: Record<string, string> = {
  defini:       "Ce groupe nominal commence par l'article défini : « le », « la » ou « l' ».",
  indefini:     "Ce groupe nominal commence par l'article indéfini : « un » ou « une ».",
  partitif:     "Ce groupe nominal commence par un partitif : « du », « de la » ou « de l' ».",
  demonstratif: "Ce groupe nominal commence par un démonstratif : « ce », « cet » ou « cette ».",
  poss_1s:      "Ce groupe nominal commence par un possessif de première personne : « mon » ou « ma ».",
  poss_2s:      "Ce groupe nominal commence par un possessif de deuxième personne : « ton » ou « ta ».",
  poss_3s:      "Ce groupe nominal commence par un possessif de troisième personne : « son » ou « sa ».",
  poss_2p:      "Ce groupe nominal commence par « votre ».",
  juridique:    "Ce groupe nominal commence par « ledit » ou « ladite », comme dans un acte.",
  quantifieur:  "Ce groupe nominal commence par un quantifieur au singulier : « chaque », « tout », « toute » ou « quelque ».",
  negatif:      "Ce groupe nominal commence par « nul », « nulle », « aucun » ou « aucune ».",
  zero:         "Ce groupe nominal n'a AUCUN déterminant : le nom nu, sans article.",
  [HORS_GN]:    "Ce vers ne commence PAS par un groupe nominal : ouvre-le par une conjonction, un adverbe, un gérondif, un infinitif ou une préposition.",
}

const CONSIGNES_EN: Record<string, string> = {
  defini:       'This noun phrase starts with the definite article "the".',
  indefini:     'This noun phrase starts with the indefinite article "a" or "an".',
  partitif:     'This noun phrase starts with "some" or "a bit of".',
  demonstratif: 'This noun phrase starts with a demonstrative: "this" or "that".',
  poss_1s:      'This noun phrase starts with the possessive "my".',
  poss_2s:      'This noun phrase starts with the possessive "your".',
  poss_3s:      'This noun phrase starts with the possessive "its", "his" or "her".',
  poss_2p:      'This noun phrase starts with the possessive "your".',
  juridique:    'This noun phrase starts with "the said", as in a legal deed.',
  quantifieur:  'This noun phrase starts with a singular quantifier: "each", "every", "all of" or "some".',
  negatif:      'This noun phrase starts with "no" (as in "no window") or "not a".',
  zero:         'This noun phrase has NO determiner at all: the bare noun, no article.',
  [HORS_GN]:    'This line does NOT start with a noun phrase: open it with a conjunction, an adverb, an -ing clause, an infinitive or a preposition.',
}

/**
 * La phrase à coudre à la contrainte, ou '' si la clé n'est pas connue.
 * Un client qui n'envoie rien — ou n'importe quoi — laisse le prompt intact.
 */
export function consigneDeterminant(cle: unknown, langue: 'fr' | 'en' = 'fr'): string {
  if (typeof cle !== 'string') return ''
  const table = langue === 'en' ? CONSIGNES_EN : CONSIGNES_FR
  return table[cle] ?? ''
}

/** Les types de case sur lesquels une stratégie de déterminant a un sens. */
export const TYPES_A_DETERMINANT = new Set(['groupe-nominal', 'groupe-nominal-riche'])

/** Familles de déterminants — plusieurs stratégies rendent la même ouverture. */
export const FAMILLE: Record<string, string> = {
  defini: 'DEF', juridique: 'DEF',
  indefini: 'IND',
  partitif: 'PART',
  demonstratif: 'DEM',
  poss_1s: 'POSS', poss_2s: 'POSS', poss_3s: 'POSS', poss_2p: 'POSS',
  quantifieur: 'QUANT', negatif: 'QUANT',
  zero: 'ZERO',
}

// L'élision passe avant le reste : après « l' », `\b` ne tient pas devant une
// voyelle accentuée, et « l'écume » se lirait comme un nom nu.
const OUVERTURES: [RegExp, string][] = [
  [/^(du|de\s+la)\b/i, 'PART'],
  [/^de\s+l['’]/i, 'PART'],
  [/^l['’]/i, 'DEF'],
  [/^(le|la|les|ledit|ladite|the|said)\b/i, 'DEF'],
  [/^(un|une|des|a|an)\b/i, 'IND'],
  [/^some\b/i, 'PART'],
  [/^(ce|cet|cette|ces|this|that|these)\b/i, 'DEM'],
  [/^(mon|ma|mes|ton|ta|tes|son|sa|ses|votre|vos|my|your|his|her|its)\b/i, 'POSS'],
  [/^(chaque|tout|toute|quelque|maint|nul|nulle|aucun|aucune|each|every|no|all)\b/i, 'QUANT'],
]

/**
 * La famille du déterminant qui ouvre un texte — 'ZERO' s'il n'y en a pas.
 * Sert à choisir dans la réserve locale quand l'appel au modèle a échoué :
 * une panne ne doit pas ramener les douze « le » d'affilée par la porte de
 * derrière.
 */
export function familleOuvrante(texte: string): string {
  const brut = String(texte).trim()
  for (const [re, f] of OUVERTURES) if (re.test(brut)) return f
  return 'ZERO'
}

/**
 * Les têtes de groupe nominal que la table des articles ne connaissait pas.
 *
 * Le validateur de sortie n'acceptait qu'un article : « chaque fêlure »,
 * « nulle issue », « ledit bordereau », « de la suie » étaient rejetés et
 * repartaient en réserve. Autrement dit, six des douze stratégies ne pouvaient
 * pas aboutir — elles auraient ramené par la réserve la monotonie qu'on
 * chasse.
 */
export const TETES_LARGES_FR = new Set([
  'chaque', 'tout', 'toute', 'quelque', 'maint', 'mainte',
  'nul', 'nulle', 'aucun', 'aucune',
  'ledit', 'ladite', 'lesdits', 'lesdites',
  'de',   // « de la suie », « de l'ambre »
])

export const TETES_LARGES_EN = new Set([
  'all', 'said', 'not', 'much', 'many', 'both', 'either', 'neither',
])
