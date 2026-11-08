import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { PLIURE, PLIURE_RESTE } from './Papier'
import { reliefDuPli } from '../lib/papier'

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
  /**
   * Le volet est une face de papier opaque, et non un calque transparent :
   * voir `VoletDePapier`. Absent, le volet reste celui d'avant — le salon et
   * le poème du jour n'ont pas encore de feuille.
   */
  papier?: VoletPapier
  /** Le rang du volet dans la feuille : il décide du creux ou de l'arête. */
  rang?: number
}

export interface VoletPapier {
  /** La couleur du papier (`papierDeLaFeuille`). */
  couleur: string
  sombre: boolean
  /** La teinte de l'ombre d'un volet encore debout. */
  ombre: string
  /** Le grain, une `url(…)`, ou rien. */
  grain?: string
  /**
   * La marge intérieure de la feuille, en pixels. Le volet la déborde : un
   * pli traverse la feuille d'un bord à l'autre, pas seulement le texte.
   */
  bord: number
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

// La pliure en haut de chaque volet (`PLIURE`, `PLIURE_RESTE`) vit dans
// `Papier.tsx` : le feuillet en cours et le rabat la posent aussi.

export default function Depli({ children, delai, duree, immediat, pli, papier, rang = 0 }: Props) {
  if (papier) return <VoletDePapier delai={delai} duree={duree} immediat={immediat} papier={papier} rang={rang}>{children}</VoletDePapier>
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

/**
 * Le volet de papier : la feuille qui s'allonge.
 *
 * Planche témoin du 8 novembre, validée par l'auteur. Trois différences avec
 * le volet transparent :
 *
 *   — il est OPAQUE. Une face de papier, qui prend l'ombre quand elle est
 *     debout et la rend en se couchant. Le volet transparent, presque debout
 *     et à opacité nulle, se lisait comme une barre grise ;
 *   — la feuille S'ALLONGE. La hauteur de mise en page suit la projection du
 *     volet, sa hauteur × cos θ : la feuille arrive courte, en paquet, et
 *     grandit d'un volet à chaque pli. Rien n'est posé sous elle pendant le
 *     dévoilement (la page fait attendre ses actions), donc rien ne saute ;
 *   — le mot est DÉJÀ écrit dessus. L'auteur : « le mot met trop de temps à
 *     apparaître quand le papier se déplie ». Les fragments d'un cadavre
 *     exquis sont écrits avant d'être pliés ; c'est le pli qui les montre.
 *
 * Une fois à plat, la hauteur rend la main (`auto`) : les coutures, posées
 * sous les vers après le dévoilement, allongent le volet comme avant.
 */
function VoletDePapier({ children, delai, duree, immediat, papier, rang }: {
  children: ReactNode
  delai: number
  duree: number
  immediat?: boolean
  papier: VoletPapier
  rang: number
}) {
  const k = useMotionValue(immediat ? 1 : 0)
  const corps = useRef<HTMLDivElement>(null)
  const hauteur = useRef(0)
  // La hauteur à plat, relue à chaque rendu : la correction d'accord peut
  // changer un vers pendant le dévoilement.
  useLayoutEffect(() => { hauteur.current = corps.current?.offsetHeight ?? 0 })

  useEffect(() => {
    if (immediat) { k.set(1); return }
    const a = animate(k, 1, { delay: delai, duration: duree, ease: [0.16, 0.84, 0.24, 1] })
    return () => a.stop()
  }, [immediat]) // eslint-disable-line react-hooks/exhaustive-deps

  const angle = (v: number) => -92 * (1 - v)
  const projection = (v: number) => Math.max(0, Math.cos(angle(v) * Math.PI / 180))
  const rotateX = useTransform(k, angle)
  const height = useTransform(k, v => (v >= 1 ? 'auto' : `${(hauteur.current * projection(v)).toFixed(2)}px`))
  // Un volet pas encore parti est transparent, et non `hidden` : la copie du
  // vers pour le lecteur d'écran (`VersEncre`) doit être là dès le lever du
  // rideau, comme avant. `visibility: hidden` la retirait de l'arbre.
  const opacity = useTransform(k, v => (v <= 0 ? 0 : 1))
  // Un volet presque debout ne prend pas la lumière ; elle revient à plat.
  const ombre = useTransform(k, v => 0.4 * (1 - projection(v)))

  return (
    <motion.div style={{ perspective: 1400, perspectiveOrigin: '50% 0%', height }}>
      <motion.div
        ref={corps}
        data-volet-papier={rang}
        style={{
          position: 'relative',
          rotateX, opacity,
          transformOrigin: 'top center',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
          marginLeft: -papier.bord, marginRight: -papier.bord,
          paddingLeft: papier.bord, paddingRight: papier.bord,
          backgroundColor: papier.couleur,
          backgroundImage: papier.grain,
          backgroundSize: '200px 200px',
        }}
      >
        {/* Le pli au repos : un creux, puis une arête, sous le texte. */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: reliefDuPli(rang, papier.sombre) }} />
        <div style={{ position: 'relative' }}>{children}</div>
        <div aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          pointerEvents: 'none', background: PLIURE, opacity: 0.42,
        }} />
        <motion.div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: papier.ombre, opacity: ombre,
        }} />
      </motion.div>
    </motion.div>
  )
}
