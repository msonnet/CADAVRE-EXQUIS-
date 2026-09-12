/**
 * Ce que l'interface doit dire à qui ne la voit pas.
 *
 * ── Ce que la mesure a dit ────────────────────────────────────────────────
 *
 * Relevé le 12 septembre sur six écrans : **zéro** groupe sémantique dans
 * toute l'application — pas un `radiogroup`, pas un `fieldset`. Les
 * sélecteurs de structure, de visibilité, de mode, de papier, de validation
 * sont des suites de `<button>` dont l'un est teinté. À l'œil on voit
 * lequel est choisi ; au lecteur d'écran on entend sept boutons sans
 * rapport entre eux, et rien ne dit lequel est actif.
 *
 * Cinq boutons n'avaient même aucun nom — les tailles de trait du studio de
 * dessin, qui ne contiennent qu'un rond de couleur.
 *
 * ── Pourquoi ici et pas dans chaque fichier ───────────────────────────────
 *
 * Le motif est le même sept fois : un conteneur, des options, une seule
 * active. Recopié sept fois il dériverait, comme les trois boutons de
 * partage l'avaient fait. Une source, sept emplois.
 *
 * `role="radio"` plutôt qu'`aria-pressed` : un bouton pressé est un
 * interrupteur indépendant, une radio appartient à un groupe où l'on ne
 * choisit qu'une chose. C'est exactement ce que font ces sélecteurs, et la
 * différence s'entend — le lecteur annonce « 2 sur 3 » au lieu de « activé ».
 */

/** Les attributs du conteneur d'un choix exclusif. */
export function groupeRadio(libelle: string) {
  return { role: 'radiogroup' as const, 'aria-label': libelle }
}

/** Les attributs d'une option dans un tel groupe. */
export function optionRadio(actif: boolean, libelle?: string) {
  return {
    role: 'radio' as const,
    'aria-checked': actif,
    ...(libelle ? { 'aria-label': libelle } : {}),
  }
}

/**
 * Les attributs d'une zone qui change toute seule.
 *
 * « LES VOIX ÉCRIVENT », le compteur de vers, l'illustration en cours : rien
 * n'annonçait que la main était revenue au joueur. `polite` et non
 * `assertive` — on ne coupe pas la parole à un lecteur au milieu d'un vers.
 */
export const zoneVivante = { role: 'status' as const, 'aria-live': 'polite' as const }
