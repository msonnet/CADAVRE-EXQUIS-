import { langueActuelle } from '../i18n'
import { jourLocal, rangDuJour, tirageEnFile } from './tirage'

/**
 * L'amorce du jour — la tête de la chaîne.
 *
 * Le poème du jour est UNE chaîne : chaque main qui passe ajoute un vers à la
 * suite, en ne voyant que le dernier mot du vers précédent. L'amorce est ce
 * dernier mot pour la toute première main — la graine du jour, donnée par le
 * calendrier et non par quelqu'un.
 *
 * ── Courte, et c'est une règle ────────────────────────────────────────────
 *
 * Trois formes seulement : déterminant + nom, déterminant + nom + adjectif,
 * déterminant + nom + verbe. Jamais plus.
 *
 * Premier jet : des amorces de six mots — « une porte qui donne sur la mer »,
 * « la rouille avance sur les noms ». C'était déjà un vers, il ne restait
 * rien à faire à la première main, et l'écho qu'elle transmettait venait d'un
 * texte que personne n'avait écrit. Une amorce n'est pas un vers : c'est ce
 * à quoi le premier vers répond.
 *
 * ── Les deux langues partagent l'INDEX, jamais le texte ───────────────────
 *
 * Les deux sacs ont la même taille et le même ordre, si bien qu'un joueur
 * français et un joueur anglais reçoivent la même amorce, traduite — et non
 * deux jeux différents le même jour.
 */

/** Trois mots au plus : déterminant + nom, + adjectif, ou + verbe. */
export const MOTS_AMORCE_MAX = 3

/**
 * Combien d'amorces de la veille sont écartées du début du sac suivant.
 *
 * Le sac se vide un tirage par JOUR, alors que la contrainte le vidait un
 * tirage sur trois : au raccord, la même amorce revenait parfois à deux jours
 * d'écart — mesuré, 0,17 % des retours, soit deux fois l'an. Sur la seule
 * chose que la page montre chaque matin, c'est deux fois de trop.
 */
const FENETRE_RACCORD = 4

const FR = [
  // déterminant + nom
  'le cadavre', 'une horloge', 'la cire', 'un couteau', 'le vernis',
  'une paupière', 'le sel', 'un rochet', 'la rouille', 'une lampe',
  'le plâtre', 'un aimant', 'la craie', 'une serrure', 'le givre',
  // déterminant + nom + adjectif
  'un tambour sourd', 'la suie froide', 'une écluse ouverte', 'le cuivre humide',
  'un fanal éteint', 'la paille sèche', 'un escalier noir', 'le mercure lent',
  'une valise vide', 'le lierre patient', 'un miroir fendu', 'la chaux vive',
  // déterminant + nom + verbe
  'une balance penche', 'le charbon respire', 'une aiguille tourne',
  'le drap glisse', 'une porte bat', 'le sable monte', 'un cheval dort',
  'la lampe tremble', 'un train passe', 'le linge sèche', 'une clé tombe',
  'le vent range', 'une ombre attend', 'la neige tient',
]

const EN = [
  'the corpse', 'a clock', 'the wax', 'a knife', 'the varnish',
  'an eyelid', 'the salt', 'a ratchet', 'the rust', 'a lamp',
  'the plaster', 'a magnet', 'the chalk', 'a lock', 'the frost',
  'a muffled drum', 'the cold soot', 'an open floodgate', 'the damp copper',
  'a dead beacon', 'the dry straw', 'a black staircase', 'the slow mercury',
  'an empty suitcase', 'the patient ivy', 'a cracked mirror', 'the quicklime',
  'a scale tilts', 'the coal breathes', 'a needle turns',
  'the sheet slides', 'a door bangs', 'the sand rises', 'a horse sleeps',
  'the lamp trembles', 'a train passes', 'the linen dries', 'a key falls',
  'the wind tidies', 'a shadow waits', 'the snow holds',
]

export interface AmorceDuJour {
  /** AAAA-MM-JJ — la clé du rendez-vous. */
  jour: string
  texte: string
}

/** L'amorce d'un jour donné. Pure : même date, même graine, partout. */
export function amorceDuJour(d = new Date()): AmorceDuJour {
  const jour = jourLocal(d)
  // L'index est tiré sur le sac FRANÇAIS et lu dans la langue active : c'est
  // ce qui garantit que les deux langues jouent la même journée.
  const index = FR.indexOf(tirageEnFile(FR, rangDuJour(jour), 'amorce', FENETRE_RACCORD))
  return { jour, texte: (langueActuelle() === 'en' ? EN : FR)[index] }
}

/** Le sac, pour la mesure. */
export function sacAmorces(langue: 'fr' | 'en' = 'fr'): readonly string[] {
  return langue === 'en' ? EN : FR
}
