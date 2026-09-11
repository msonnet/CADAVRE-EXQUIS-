import type React from 'react'

/**
 * Ce qu'on demande au clavier logiciel, selon ce qu'on écrit.
 *
 * ── Ce que la mesure a dit ────────────────────────────────────────────────
 *
 * Les champs de saisie n'avaient AUCUN attribut de contrôle du clavier —
 * relevé sur le champ de vers de l'atelier, et identique partout :
 *
 *     autocapitalize: null   autocorrect: null
 *     enterkeyhint: null     inputmode: null     spellcheck: true
 *
 * Sur iOS, l'absence d'`autocapitalize` vaut `sentences` : chaque saisie
 * commence par une majuscule. Or dans un cadavre exquis, un fragment est
 * presque toujours un MILIEU de vers. On obtient « Vacille », « Calcaire »,
 * « La cire durcit » plantés au milieu d'une phrase — et la galerie de
 * production le montre, les capitalisations y sont incohérentes d'une pièce
 * à l'autre.
 *
 * ── Deux régimes, parce qu'il y a deux gestes ────────────────────────────
 *
 * Un FRAGMENT se coud au milieu d'une phrase que son auteur ne verra jamais :
 * pas de majuscule, pas de correction automatique — le lexique du jeu est
 * volontairement étrange et l'autocorrection le rabote.
 *
 * Un VERS ENTIER est une phrase à lui seul : la majuscule initiale est juste,
 * et la touche de retour envoie.
 *
 * `spellcheck` reste actif dans les deux cas : souligner une faute est utile,
 * la corriger sans demander ne l'est pas.
 *
 * `inputmode` n'est pas posé : le défaut `text` est exactement ce qu'il faut
 * pour de la prose, et le forcer n'apporterait rien.
 *
 * ── Ne pas toucher à la taille ────────────────────────────────────────────
 *
 * Les champs sont à 20 px. En dessous de 16, iOS zoome automatiquement à la
 * mise au point et le feuillet part de travers. C'est mesuré et voulu.
 */

/** Un morceau de vers, cousu au milieu d'une phrase. */
export const CLAVIER_FRAGMENT: React.HTMLAttributes<HTMLElement> & {
  autoCapitalize: string; autoCorrect: string
} = {
  autoCapitalize: 'none',
  autoCorrect: 'off',
  enterKeyHint: 'done',
  spellCheck: true,
}

/** Un vers entier — une phrase, donc une majuscule. */
export const CLAVIER_VERS: React.HTMLAttributes<HTMLElement> & {
  autoCapitalize: string; autoCorrect: string
} = {
  autoCapitalize: 'sentences',
  autoCorrect: 'off',
  enterKeyHint: 'send',
  spellCheck: true,
}
