import type { ConfigPartie } from '../types'

/**
 * La partie Découverte — la première qu'un joueur voit.
 *
 * La plus courte possible (phrase courte, trois fragments) : le joueur écrit
 * le premier, DEUX voix complètent à l'aveugle, puis la révélation. Faire
 * vivre un cadavre exquis entier en trente secondes, sans une seule décision
 * de configuration — c'est la révélation qui fait comprendre le jeu.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * Le commentaire annonçait deux voix ; la configuration n'en donnait qu'une.
 * Sur trois cases, l'ordre devenait joueur · voix · joueur : le joueur
 * écrivait deux fragments sur trois, et la voix un seul mot — le verbe. La
 * révélation montrait surtout ce qu'on venait d'écrire soi-même, et presque
 * rien de ce que le jeu fait.
 */
export const CONFIG_DECOUVERTE: ConfigPartie = {
  structureId: 'phrase-simple',
  visibilite: 'aveugle',
  premierJoueur: 'humain',
  mode: 'standard',
  joueursHumains: 1,
  voixIA: 2,
}
