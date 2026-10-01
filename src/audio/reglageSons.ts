/**
 * Les sons, coupés ou non.
 *
 * Un bouton son, sur l'écran de jeu et au studio, basculait un état que
 * personne ne lisait : il ne coupait rien. Ce réglage-ci est lu par
 * `useSound` avant chaque son, et une ligne SONS des Réglages le porte.
 *
 * Les sons de papier synthétisés (pli, feuille, plume) ont été retirés à la
 * demande de l'auteur : ils sonnaient mal. Le jeu garde ses sons d'origine.
 */

const CLE_SONS = 'cadavre-sons'

/** Les sons sont-ils actifs ? Oui par défaut. */
export function sonsActifs(): boolean {
  try { return localStorage.getItem(CLE_SONS) !== 'off' } catch { return true }
}

export function reglerSons(actifs: boolean): void {
  try { localStorage.setItem(CLE_SONS, actifs ? 'on' : 'off') } catch { /* ignore */ }
}
