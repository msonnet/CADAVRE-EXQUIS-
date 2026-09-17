/**
 * Le poème du jour — une chaîne, une main, un vers.
 *
 * ── Ce que c'est ──────────────────────────────────────────────────────────
 *
 * UN seul poème par jour et par langue. Chaque main qui passe y ajoute un
 * vers, à la suite, en ne voyant que le DERNIER MOT du vers précédent. À
 * minuit la chaîne se scelle et se dévoile : tu apprends alors de quoi tu
 * faisais partie, et entre quelles mains le hasard t'a mis.
 *
 * Une main, un vers, un jour. C'est la règle entière.
 *
 * ── Pourquoi la chaîne et non des poèmes parallèles ───────────────────────
 *
 * Premier modèle : des poèmes de taille fixe, quatre sièges chacun. Défaut
 * de fond — en fixant la taille, on faisait du NOMBRE de poèmes la variable
 * d'ajustement. À deux cents joueurs cela donnait trente-trois parties
 * privées le même jour, et « LE poème du jour » devenait un mensonge.
 *
 * On inverse : le poème n'a pas de taille, il grandit avec la foule. Sa
 * longueur EST le nombre de gens venus. Un joueur, cinq vers ; deux cents
 * joueurs, deux cents vers. C'est aussi ce qui donne des rendements
 * croissants — le poème à deux cents mains ne pouvait pas exister à six.
 *
 * ── Pourquoi l'écho et non l'aveuglement total ────────────────────────────
 *
 * Voir le vers entier qui précède, c'est du renga : chacun répond, le texte
 * converge, il devient sage. Breton pliait le papier pour empêcher
 * exactement cela. Mais l'aveuglement TOTAL sur deux cents vers donne un
 * texte qui se disloque, sans rien à quoi se tenir.
 *
 * L'écho — le dernier mot seulement — est le régime que le jeu nomme déjà
 * (`visibilite: 'dernier-mot'`) : assez pour accrocher, pas assez pour
 * diriger.
 *
 * ── Ce que les voix font, et c'est peu ────────────────────────────────────
 *
 * Elles ne comblent plus des sièges toute la journée : elles garantissent un
 * PLANCHER, et seulement au scellement. Moins de cinq mains sont venues ? on
 * complète à cinq. Au-delà, aucune voix n'intervient. Quatre appels par jour
 * au maximum, zéro dès qu'il y a cinq joueurs — l'encrier n'est plus
 * concerné.
 *
 * ── Ce module ne fait que décider ─────────────────────────────────────────
 *
 * Aucune entrée-sortie, aucune date implicite. C'est ce qui le rend
 * mesurable, et c'est là que toutes les règles du rendez-vous sont écrites
 * plutôt que dispersées dans des requêtes qu'on ne peut pas éprouver.
 */

export interface Vers {
  rang: number
  /** L'identité qui l'a écrit ; null quand c'est une voix. */
  main: string | null
  voix?: boolean
  voixNom?: string
  texte: string
  pose?: number
}

export interface Chaine {
  jour: string
  amorce: string
  vers: Vers[]
  /** Quand elle a été scellée. Absente tant que la journée court. */
  scelle?: number
}

/**
 * La longueur minimale d'un poème du jour.
 *
 * C'est le seul endroit où les voix interviennent, et seulement au
 * scellement : en dessous de cinq vers un poème n'a pas eu le temps de
 * devenir un poème. Au-dessus, on n'ajoute rien — la longueur doit rester la
 * mesure de la journée.
 */
export const PLANCHER_VERS = 5

/**
 * Ce qu'on accepte comme vers.
 *
 * Neuf mots au plus : c'est la borne que `GardeMetrique` tient déjà à
 * l'Atelier — « zéro vers de dix mots ou plus ». Elle n'est pas une
 * politesse. Une main qui écrirait trois phrases écrirait le poème des
 * autres à leur place, et la chaîne cesserait d'être un cadavre exquis.
 */
export const MOTS_MAX = 9
export const CARACTERES_MAX = 100

export type RefusVers = 'vide' | 'trop-long' | 'trop-de-mots' | 'plusieurs-lignes' | 'deja-ecrit'

/**
 * Le dernier mot d'un texte, ponctuation ôtée — c'est tout ce qu'on voit.
 *
 * On REMONTE jusqu'au premier morceau qui contient une lettre : « une valise »
 * fermé d'un guillemet rendait sinon un écho vide, et la main suivante se
 * retrouvait sans rien à quoi répondre. Un vers qui finit sur un guillemet,
 * un tiret ou des points de suspension n'est pas rare.
 */
export function dernierMot(texte: string): string {
  const mots = texte.trim().split(/\s+/).filter(Boolean)
  for (let i = mots.length - 1; i >= 0; i--) {
    const mot = mots[i].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    if (mot) return mot
  }
  return ''
}

/**
 * L'écho que verra la prochaine main.
 *
 * Le dernier mot du dernier vers — ou celui de l'amorce quand la chaîne est
 * encore vide. La première main n'est donc pas plus démunie que les autres :
 * elle aussi répond à un mot, simplement il vient du calendrier.
 */
export function echoDe(c: Chaine): string {
  const dernier = c.vers.length ? c.vers[c.vers.length - 1].texte : c.amorce
  return dernierMot(dernier)
}

/** Une main n'écrit qu'un vers par jour : c'est ce qui fait que la longueur
 *  du poème compte les gens, et non les bavards. */
export function aDejaEcrit(c: Chaine, main: string): boolean {
  return c.vers.some(v => v.main === main)
}

/** Le rang du prochain vers. */
export function rangSuivant(c: Chaine): number {
  return c.vers.length + 1
}

/** Le rang du vers de cette main — ce que la révélation lui montre d'abord. */
export function rangDe(c: Chaine, main: string): number | null {
  return c.vers.find(v => v.main === main)?.rang ?? null
}

/** Combien de mains humaines. Annoncé tel quel, jamais fardé. */
export function mainsHumaines(c: Chaine): number {
  return c.vers.filter(v => !v.voix).length
}

/** Ce vers est-il recevable ? Le motif du refus, ou null. */
export function refusDuVers(texte: string): RefusVers | null {
  const t = texte.trim()
  if (!t) return 'vide'
  if (/[\r\n]/.test(t)) return 'plusieurs-lignes'
  if (t.length > CARACTERES_MAX) return 'trop-long'
  if (t.split(/\s+/).filter(Boolean).length > MOTS_MAX) return 'trop-de-mots'
  return null
}

/**
 * Cette main peut-elle écrire maintenant ?
 *
 * Une chaîne scellée ne se rouvre pas : le poème d'hier appartient à hier.
 */
export function peutEcrire(c: Chaine, main: string): RefusVers | 'scelle' | null {
  if (c.scelle) return 'scelle'
  if (aDejaEcrit(c, main)) return 'deja-ecrit'
  return null
}

/**
 * Les rangs que des voix doivent écrire pour sceller la journée.
 *
 * Appelé UNIQUEMENT au scellement, jamais en cours de route : pendant la
 * journée, la chaîne fait exactement la longueur des mains qui sont venues.
 * C'est ce qui rend vraie la phrase « le poème est la mesure du jour ».
 */
export function versDuScellement(c: Chaine, plancher = PLANCHER_VERS): number[] {
  const manque = plancher - c.vers.length
  if (manque <= 0) return []
  return Array.from({ length: manque }, (_, i) => c.vers.length + 1 + i)
}

/**
 * Le voisinage d'une main dans le poème scellé.
 *
 * La révélation ne commence pas au premier vers : elle commence par le TIEN,
 * avec les deux inconnus entre lesquels le hasard t'a mis. Sur deux cents
 * vers, ouvrir au début reviendrait à cacher la seule chose qu'on vient
 * chercher.
 */
export function voisinage(c: Chaine, main: string, rayon = 1): Vers[] {
  const rang = rangDe(c, main)
  if (rang === null) return c.vers.slice(0, rayon * 2 + 1)
  const i = rang - 1
  return c.vers.slice(Math.max(0, i - rayon), Math.min(c.vers.length, i + rayon + 1))
}
