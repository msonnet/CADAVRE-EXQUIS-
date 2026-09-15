import type { ActePayant } from './acces'
import { tr } from '../i18n'

/**
 * Le libellé du solde d'essai — lot 13 de l'audit du 10 septembre.
 *
 * Séparé du composant pour une seule raison : il se mesure. Un compte qui
 * ment est exactement la faute que le lot 9 vient de corriger ailleurs, et
 * celui-ci s'écrit sous le bouton qui déclenche la dépense.
 *
 * Le ton est celui de la revue : petites capitales, pas de point
 * d'exclamation, pas d'emoji. « ESSAI » et non « GRATUIT » — le jeu est
 * gratuit ET entier, seule la réserve des trois actes facturés est comptée.
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

/**
 * Ce qui s'écrit sous le bouton.
 *
 * À zéro on n'annonce pas l'abonnement : le mur le fait, et il le fait mieux.
 * On annonce seulement que le prochain appui ne passera pas, ce qui est tout
 * ce que le joueur a besoin de savoir AVANT d'appuyer.
 */
export function libelleSolde(acte: ActePayant, reste: number): string {
  if (reste <= 0) return tr('ESSAI ÉPUISÉ', 'TRIAL USED UP')
  const s = reste > 1 ? 'S' : ''
  switch (acte) {
    case 'image_pro':
      return tr(`ESSAI · ${reste} ILLUSTRATION${s}`, `TRIAL · ${reste} ILLUSTRATION${s}`)
    case 'partie_ia':
      return tr(`ESSAI · ${reste} PARTIE${s} AVEC LES VOIX`, `TRIAL · ${reste} GAME${s} WITH THE VOICES`)
    case 'lecture_dessin':
      return tr(`ESSAI · ${reste} LECTURE${s} DE DESSIN`, `TRIAL · ${reste} DRAWING READING${s}`)
  }
}
