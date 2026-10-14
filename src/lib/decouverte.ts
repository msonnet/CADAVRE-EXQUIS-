import type { ConfigPartie } from '../types'

/**
 * La partie Découverte — la première qu'un joueur voit.
 *
 * La plus courte possible (phrase courte, trois fragments) : le joueur écrit
 * le PREMIER et le DERNIER, une voix écrit celui du milieu à l'aveugle, puis
 * la révélation. Faire vivre un cadavre exquis entier en trente secondes,
 * sans une seule décision de configuration — c'est la révélation qui fait
 * comprendre le jeu.
 *
 * ── Deux réglages successifs ──────────────────────────────────────────────
 *
 * Le 30 septembre, deux voix sur trois cases : le joueur n'écrivait que le
 * premier fragment et regardait les machines finir. L'auteur, le 14 octobre :
 * « il faut faire l'inverse ». Un premier contact où la machine joue deux
 * fois et le joueur une seule apprend que le jeu se joue sans lui. Le jeu est
 * une affaire de mains ; la voix y est l'inconnu qu'on n'a pas vu écrire, et
 * une seule suffit à le faire sentir. Le joueur encadre donc la voix : il
 * ouvre, il ferme sans savoir ce qu'elle a mis entre les deux.
 */
export const CONFIG_DECOUVERTE: ConfigPartie = {
  structureId: 'phrase-simple',
  visibilite: 'aveugle',
  premierJoueur: 'humain',
  mode: 'standard',
  joueursHumains: 1,
  voixIA: 1,
}
