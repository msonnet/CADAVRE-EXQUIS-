import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ANGLE_RABAT, COURBE_RABAT, DUREE_RABAT } from '../lib/pli'
import { PLIURE } from './Papier'

/**
 * Le rabat — le geste de « sceller ».
 *
 * La bande qu'on vient d'écrire se replie sur sa charnière haute et ne
 * laisse dépasser que ce que la visibilité transmet : rien en aveugle, le
 * dernier mot en « dernier mot », la case en « dernière case ». C'est le
 * `Depli` de la fin, joué à l'envers — même charnière, même ombre noire,
 * même angle, et sa courbe retournée (`COURBE_RABAT`).
 *
 * Il remplace un écrasement : `scaleY: 0` et `filter: brightness(0.7)`. On
 * voyait le fragment se déformer, pas se cacher — et le filtre obligeait le
 * navigateur à repeindre la case à chaque trame. Ici on n'anime que
 * `transform` et `opacity`, ce que le compositeur sait faire seul.
 *
 * ── Ce qu'il ne doit jamais coûter ────────────────────────────────────────
 *
 * Le geste revient à chaque tour. Il dure donc 0,4 s, autant que
 * l'écrasement qu'il remplace, et pas une trame de plus : rien n'arrive plus
 * tard qu'avant. Un appui n'importe où, ou une touche, l'abrège et passe à
 * la suite tout de suite — on écoute le geste en phase de capture, sans
 * l'arrêter. `prefers-reduced-motion` le supprime : la suite vient au même
 * instant que l'appui sur SCELLER.
 *
 * La suite part à 0,4 s de l'appui, que l'animation ait fini ou non. Deux
 * raisons. L'animation démarre une trame ou deux après l'appui : attendre
 * sa fin exacte ajoutait 50 à 70 ms à chaque tour — mesuré, 471 ms pour
 * l'écran suivant au lieu de 400. Et dans un onglet en arrière-plan les
 * trames sont suspendues : sans horloge à côté, la partie le serait restée
 * avec elles. À cet instant la bande est presque sur la tranche et déjà
 * pâlie ; le fondu de l'écran suivant prend le relais.
 */

const reduitParLeSysteme = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** L'ombre au plus fort du rabat — celle de `Depli`, qui s'y éteignait. */
const OMBRE = 'rgba(0,0,0,0.3)'

interface Props {
  /** La bande à rabattre. */
  children: ReactNode
  /** Vrai dès l'appui sur SCELLER. */
  plie: boolean
  /**
   * Ce qui reste visible sur la tranche une fois la bande rabattue — le
   * dernier mot, ou la case. Absent en aveugle : le pli ne laisse rien.
   */
  reste?: ReactNode
  /**
   * La suite. Appelée UNE fois : bande rabattue, rabat abrégé, ou tout de
   * suite sous mouvement réduit.
   */
  onRabattu: () => void
}

export default function Rabat({ children, plie, reste, onRabattu }: Props) {
  const reduit = useMemo(reduitParLeSysteme, [])
  const suite = useRef(onRabattu)
  suite.current = onRabattu
  const fait = useRef(false)
  const finir = () => {
    if (fait.current) return
    fait.current = true
    suite.current()
  }

  useEffect(() => {
    if (!plie) { fait.current = false; return }
    if (reduit) { finir(); return }
    const abreger = () => finir()
    window.addEventListener('pointerdown', abreger, true)
    window.addEventListener('keydown', abreger, true)
    const filet = setTimeout(finir, DUREE_RABAT * 1000)
    return () => {
      window.removeEventListener('pointerdown', abreger, true)
      window.removeEventListener('keydown', abreger, true)
      clearTimeout(filet)
    }
  }, [plie]) // eslint-disable-line react-hooks/exhaustive-deps

  const anime = plie && !reduit

  return (
    <div style={{ position: 'relative', perspective: 1400, perspectiveOrigin: '50% 0%' }}>
      <motion.div
        data-rabat={plie ? 'plie' : 'ouvert'}
        initial={false}
        animate={anime ? { rotateX: ANGLE_RABAT, opacity: [1, 1, 0] } : { rotateX: 0, opacity: 1 }}
        transition={anime
          ? {
              rotateX: { duration: DUREE_RABAT, ease: COURBE_RABAT },
              // Pleine la première moitié — le temps qu'on la voie partir —
              // puis elle pâlit en se couchant : le mot qui reste ne se pose
              // pas sur une consigne encore lisible.
              opacity: { duration: DUREE_RABAT, times: [0, 0.5, 1], ease: 'linear' },
            }
          : { duration: 0 }}
        onAnimationComplete={() => { if (anime) finir() }}
        style={{
          position: 'relative',
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          willChange: anime ? 'transform' : undefined,
        }}
      >
        {children}
        {/* L'ombre monte à mesure que la bande se dresse : c'est elle qui
            fait d'une rotation une matière, comme au dépli. */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: anime ? 1 : 0 }}
          transition={anime ? { duration: DUREE_RABAT, ease: COURBE_RABAT } : { duration: 0 }}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(to bottom, ${OMBRE} 0%, rgba(0,0,0,0) 42%)`,
          }}
        />
      </motion.div>

      {/* Ce que le pli laisse dépasser, posé sur la charnière. Il ne tourne
          pas avec la bande : il apparaît pendant qu'elle part — c'est
          exactement ce que la main suivante lira. */}
      {anime && (
        <motion.div
          aria-hidden
          data-reste
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // Pas avant que la bande soit à mi-course : posé plus tôt, le mot
          // se superposait à la consigne encore à plat sous lui.
          transition={{ delay: DUREE_RABAT * 0.62, duration: DUREE_RABAT * 0.33, ease: 'easeOut' }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }}
        >
          <div style={{ height: 2, background: PLIURE }} />
          {reste && <div style={{ padding: '8px 14px 0' }}>{reste}</div>}
        </motion.div>
      )}
    </div>
  )
}
