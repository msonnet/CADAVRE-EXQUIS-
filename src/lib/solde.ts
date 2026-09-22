import type { ActePayant } from './acces'
import { tr } from '../i18n'

/**
 * Le libellé du solde de l'encrier — lot 13 de l'audit du 10 septembre,
 * étendu au flacon et à la ration le 22 septembre.
 *
 * Séparé du composant pour une seule raison : il se mesure. Un compte qui
 * ment est exactement la faute que le lot 9 vient de corriger ailleurs, et
 * celui-ci s'écrit sous le bouton qui déclenche la dépense.
 *
 * Le ton est celui de la revue : petites capitales, pas de point
 * d'exclamation, pas d'emoji.
 *
 * ── Trois réserves, un seul nombre ────────────────────────────────────────
 *
 * Le joueur a désormais jusqu'à trois provisions pour un même acte —
 * l'essai offert, le flacon acheté, la ration de la semaine. Les énumérer
 * sous un bouton serait illisible, et personne n'a besoin de savoir dans
 * quel ordre on y puise avant d'appuyer : ce qu'il veut savoir, c'est
 * COMBIEN DE FOIS ENCORE. On additionne donc, et on ne dit qu'un nombre.
 *
 * Une exception, et elle est la seule qui apprenne quelque chose : quand il
 * ne reste QUE la ration, on nomme la semaine. C'est le moment où le joueur
 * découvre que la chose revient — et c'est la seule occasion de le lui dire
 * sans lui faire un cours.
 */

/** La case de la réserve que chaque acte entame. */
const CASE: Record<ActePayant, 'images' | 'parties' | 'lectures'> = {
  image_pro: 'images',
  partie_ia: 'parties',
  lecture_dessin: 'lectures',
}

export function caseDEssai(acte: ActePayant): 'images' | 'parties' | 'lectures' {
  return CASE[acte]
}

/** Ce dont dispose le joueur pour un acte donné, source par source. */
export interface Reserve {
  essai: number
  /** Illustrations achetées. Nul pour les autres actes. */
  flacon: number
  /** Rendue chaque lundi. Nulle pour les actes qui n'en ont pas. */
  ration: number
}

export function resteTotal(r: Reserve): number {
  return r.essai + r.flacon + r.ration
}

/** N'a-t-il plus que sa ration de la semaine ? */
function surLaSeuleRation(r: Reserve): boolean {
  return r.ration > 0 && r.essai === 0 && r.flacon === 0
}

/**
 * Ce qui s'écrit sous le bouton.
 *
 * À zéro on n'annonce pas l'abonnement : le mur le fait, et il le fait
 * mieux. On annonce seulement que le prochain appui ne passera pas, ce qui
 * est tout ce que le joueur a besoin de savoir AVANT d'appuyer.
 */
export function libelleSolde(acte: ActePayant, r: Reserve): string {
  const reste = resteTotal(r)
  if (reste <= 0) return tr('ENCRIER À SEC', 'INKWELL DRY')

  if (surLaSeuleRation(r)) {
    const s = reste > 1 ? 'S' : ''
    return acte === 'partie_ia'
      ? tr(`ENCRIER · ${reste} PARTIE${s} CETTE SEMAINE`, `INKWELL · ${reste} GAME${s} THIS WEEK`)
      : tr(`ENCRIER · ${reste} CETTE SEMAINE`, `INKWELL · ${reste} THIS WEEK`)
  }

  const s = reste > 1 ? 'S' : ''
  switch (acte) {
    case 'image_pro':
      return tr(`ENCRIER · ${reste} ILLUSTRATION${s}`, `INKWELL · ${reste} ILLUSTRATION${s}`)
    case 'partie_ia':
      return tr(`ENCRIER · ${reste} PARTIE${s} AVEC LES VOIX`, `INKWELL · ${reste} GAME${s} WITH THE VOICES`)
    case 'lecture_dessin':
      return tr(`ENCRIER · ${reste} LECTURE${s} DE DESSIN`, `INKWELL · ${reste} DRAWING READING${s}`)
  }
}
