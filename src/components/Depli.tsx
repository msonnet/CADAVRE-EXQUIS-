import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Un volet de papier qui s'ouvre.
 *
 * Le cadavre exquis est une feuille pliée : c'est son seul geste propre, et il
 * n'était nulle part dans l'application. Les fragments « convergeaient » depuis
 * un cercle — l'effet de particules de n'importe quel site — et le poème
 * arrivait en fondu, ce que fait une page qui charge, pas une chose qui se
 * produit.
 *
 * Ici le volet part à quatre-vingt-douze degrés, charnière en haut, et tombe à
 * plat. Deux détails font la différence entre un pli et une carte qui tourne :
 *
 *   — l'ombre. Un volet presque debout ne prend pas la lumière ; elle revient à
 *     mesure qu'il s'aplatit. Sans ce dégradé qui s'efface, la rotation se lit
 *     comme un effet, pas comme une matière. Elle est NOIRE et non teintée :
 *     premier essai, elle prenait la couleur d'encre de la séance, et sur les
 *     trois ambiances sombres — minuit, encre, argile — cette couleur est une
 *     crème. Le pli s'éclairait au lieu de s'assombrir. Une ombre est un
 *     manque de lumière, elle n'a pas de teinte à emprunter.
 *   — la courbe. `[0.16, 0.84, 0.24, 1]` part vite et arrive lentement : le
 *     papier a de l'élan puis se pose. Une courbe symétrique donne un
 *     mouvement de machine.
 *
 * Le volet garde sa hauteur de mise en page dès le départ, même couché : rien
 * ne bouge sous lui pendant qu'il s'ouvre.
 */

interface Props {
  children: ReactNode
  /** Instant d'ouverture, en secondes depuis le lever du rideau. */
  delai: number
  /** Durée de l'ouverture, en secondes. */
  duree: number
  /** Le volet est déjà à plat — mouvement réduit, ou dévoilement sauté. */
  immediat?: boolean
  /**
   * Marquer la pliure en haut du volet. Faux pour le premier : le bord haut
   * d'une feuille n'est pas un pli.
   */
  pli?: boolean
}

/**
 * L'ombre du pli, au plus fort de la pliure.
 *
 * Elle a d'abord été posée à 0,5 sur les 72 % hauts du volet : sur un volet
 * transparent — c'est le fond de la carte qu'on voit au travers — ça ne
 * donnait pas une ombre mais un rectangle gris plein, à mi-chemin entre le
 * noir et la crème. Une ombre de pliure est serrée contre la pliure ; elle ne
 * couvre pas la moitié de la page.
 */
const OMBRE = 'rgba(0,0,0,0.3)'
/** Sur quelle part de la hauteur du volet l'ombre s'éteint. */
const OMBRE_PORTEE = '42%'

/**
 * La pliure : un creux et une arête, un pixel chacun.
 *
 * Sans elle le dépli ne se voyait pas. Un volet est transparent — c'est le
 * fond de la carte qu'on voit au travers — donc sa rotation n'avait aucune
 * surface pour l'attester : il ne restait que le dégradé d'ombre, qu'on prend
 * pour un fondu. La pliure donne au volet un bord, et surtout elle SUBSISTE :
 * une fois le poème posé, les traits restent, faibles. Le feuillet garde la
 * marque d'avoir été plié, ce qui est exactement l'objet dont il s'agit.
 *
 * Deux traits plutôt qu'un, parce qu'un seul trait noir disparaît sur les
 * ambiances sombres. Un creux sombre au-dessus, une arête claire en dessous :
 * ça se lit sur du papier crème comme sur de l'encre de nuit.
 */
const PLIURE = 'linear-gradient(to bottom, rgba(0,0,0,0.26) 0 1px, rgba(255,255,255,0.34) 1px 2px)'
/** Ce qu'il reste de la pliure une fois le volet à plat. */
const PLIURE_RESTE = 0.4

export default function Depli({ children, delai, duree, immediat, pli }: Props) {
  const transition = immediat
    ? { duration: 0, delay: 0 }
    : { delay: delai, duration: duree, ease: [0.16, 0.84, 0.24, 1] as const }

  return (
    <div style={{ perspective: 1400, perspectiveOrigin: '50% 0%' }}>
      <motion.div
        initial={immediat ? false : { rotateX: -92, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={transition}
        style={{
          position: 'relative',
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        {children}
        <motion.div
          aria-hidden
          initial={immediat ? false : { opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={immediat ? { duration: 0, delay: 0 } : { delay: delai, duration: duree * 0.92, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(to bottom, ${OMBRE} 0%, rgba(0,0,0,0) ${OMBRE_PORTEE})`,
          }}
        />
        {pli && (
          <motion.div
            aria-hidden
            initial={immediat ? false : { opacity: 1, scaleX: 0.86 }}
            animate={{ opacity: PLIURE_RESTE, scaleX: 1 }}
            transition={immediat ? { duration: 0, delay: 0 } : { delay: delai, duration: duree, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              pointerEvents: 'none', background: PLIURE,
            }}
          />
        )}
      </motion.div>
    </div>
  )
}
