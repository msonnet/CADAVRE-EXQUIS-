import { useEffect, useMemo, useRef, useState } from 'react'
import { tr } from '../i18n'
import { motion } from 'framer-motion'
import { vibrer } from '../utils/haptics'
import { mono } from '../lib/typo'

export interface FragmentConvergent {
  texte: string
  auteur?: string | null
}

interface Props {
  fragments: FragmentConvergent[]
  voixCount: number
  accent: string
  encre: string
  bg: string
  /**
   * Ce qui s'écrit au-dessus du titre. Par défaut « N VOIX » — mais à
   * l'atelier une case est un VERS et non une voix, et l'écran annonçait
   * « 37 VOIX » pour une table de trente-six.
   */
  libelle?: string
  /** Appelé une fois la convergence + le battement terminés : le parent dévoile alors le poème. */
  onTermine: () => void
  /** Optionnel : son de révélation joué au climax. */
  jouerClimax?: () => void
}

/**
 * Combien de fragments convergent, et combien de bandes se posent.
 *
 * Sans plafond, un poème d'atelier de trente-sept vers fabriquait trente-sept
 * divs animés en absolu et autant de bandes : de quoi faire tomber la
 * cadence sur un vieux téléphone, pour une différence que personne ne voit.
 * On échantillonne au lieu de tout montrer.
 */
const FRAGMENTS_MAX = 16
const BANDES_MAX = 12

/** Prend n éléments répartis régulièrement dans la liste, premier et dernier compris. */
function echantillonner<T>(liste: T[], n: number): T[] {
  if (liste.length <= n) return liste
  const pas = (liste.length - 1) / (n - 1)
  return Array.from({ length: n }, (_, i) => liste[Math.round(i * pas)])
}

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Phases de la séquence (ms)
const T_CONVERGENCE = reduced ? 600 : 3700
const T_BATTEMENT = reduced ? 250 : 650
const T_FLASH = reduced ? 200 : 480

/**
 * Mise en scène de la reconstitution : chaque fragration vient d'un bord de l'écran,
 * dérive vers le centre en s'effaçant — le cadavre se rassemble — puis un battement
 * de tension et un flash de lumière passent la main au dévoilement du poème.
 */
export default function RevealAssemblageTexte({
  fragments: tousLesFragments, voixCount, accent, encre, bg, libelle, onTermine, jouerClimax,
}: Props) {
  const [phase, setPhase] = useState<'convergence' | 'battement' | 'flash'>('convergence')
  const fragments = useMemo(() => echantillonner(tousLesFragments, FRAGMENTS_MAX), [tousLesFragments])
  const nBandes = Math.min(Math.max(voixCount, 2), BANDES_MAX)
  const dim = useRef({ w: 0, h: 0 })
  if (dim.current.w === 0 && typeof window !== 'undefined') {
    dim.current = { w: window.innerWidth, h: window.innerHeight }
  }

  // Position de départ de chaque fragment : réparti en cercle autour du centre, hors écran.
  const departs = useMemo(() => {
    const { w, h } = dim.current
    const rayon = Math.max(w, h) * 0.62
    return fragments.map((_, i) => {
      const angle = (i / Math.max(fragments.length, 1)) * Math.PI * 2 + (i % 2 ? 0.5 : -0.5)
      // Léger éparpillement d'arrivée pour un empilement organique au centre
      const finX = Math.cos(angle) * 18 + (i % 3 - 1) * 14
      const finY = Math.sin(angle) * 14 + (i % 2 ? 10 : -10)
      return {
        x0: Math.cos(angle) * rayon,
        y0: Math.sin(angle) * rayon,
        x1: finX,
        y1: finY,
        rot: (i % 2 ? 1 : -1) * (3 + (i % 4) * 1.5),
      }
    })
  }, [fragments])

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('battement')
      vibrer('battement')
      jouerClimax?.()
    }, T_CONVERGENCE)
    const t2 = setTimeout(() => {
      setPhase('flash')
      vibrer('devoilement')
    }, T_CONVERGENCE + T_BATTEMENT)
    const t3 = setTimeout(() => {
      onTermine()
    }, T_CONVERGENCE + T_BATTEMENT + T_FLASH)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      // Un rideau qu'on ne peut pas écarter se fait détester à la deuxième
      // partie. Un appui n'importe où passe directement au poème.
      onClick={onTermine}
      role="button"
      tabIndex={0}
      aria-label={tr('Passer la révélation', 'Skip the reveal')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onTermine() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 250, background: bg, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 28px', cursor: 'pointer',
      }}
    >
      {/* Bandes horizontales — texture des voix qui se superposent */}
      {Array.from({ length: nBandes }).map((_, i) => (
        <motion.div
          key={`bande-${i}`}
          initial={{ x: i % 2 === 0 ? '-110%' : '110%' }}
          animate={{ x: 0 }}
          transition={{ delay: i * 0.16, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: 'absolute', left: 0, right: 0,
            height: `${100 / nBandes}%`, top: `${(i * 100) / nBandes}%`,
            background: accent, opacity: 0.08, pointerEvents: 'none',
          }}
        />
      ))}

      {/* Fragments qui convergent vers le centre */}
      {phase === 'convergence' && fragments.map((f, i) => {
        const d = departs[i]
        return (
          <motion.div
            key={`frag-${i}`}
            initial={{ x: d.x0, y: d.y0, opacity: 0, rotate: d.rot, scale: 1.04 }}
            animate={{ x: d.x1, y: d.y1, opacity: [0, 0.5, 0], rotate: d.rot * 0.3, scale: 0.92 }}
            transition={{
              delay: i * 0.09,
              // Les fragments les plus tardifs traversent plus vite — mais
              // jamais en un temps négatif. Sous `prefers-reduced-motion`, la
              // convergence tombe à 600 ms : au treizième fragment le calcul
              // passait sous zéro et l'API Web Animations refusait la durée.
              // La page de fin plantait alors entièrement, ce qui ne se voyait
              // pas — personne ne l'avait ouverte avec le réglage actif.
              duration: Math.max(0.15, (T_CONVERGENCE / 1000) - i * 0.05),
              ease: [0.33, 0, 0.2, 1],
            }}
            style={{
              position: 'absolute',
              maxWidth: '70vw',
              fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
              fontSize: 'clamp(1.1rem, 5vw, 1.6rem)', color: encre,
              pointerEvents: 'none', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {f.texte}
            {f.auteur && (
              <span style={{ ...mono, fontStyle: 'normal', fontSize: 11, color: accent, opacity: 0.7, marginLeft: 8 }}>
                · {f.auteur}
              </span>
            )}
          </motion.div>
        )
      })}

      {/* Cœur du dispositif : le titre + l'étoile pulsée */}
      <motion.div
        style={{ position: 'relative', zIndex: 2 }}
        animate={{ scale: phase === 'battement' ? 1.06 : 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.28em', marginBottom: 18, opacity: 0.8 }}>
          — {libelle ?? `${voixCount} ${tr('VOIX', 'VOICES')}`} —
        </div>
        <div style={{
          fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(2rem, 9vw, 3.4rem)', color: encre, lineHeight: 1.0, letterSpacing: '-0.01em',
        }}>
          {tr('Le cadavre', 'The cadavre')}
        </div>
        <div style={{
          fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(2rem, 9vw, 3.4rem)', color: accent, lineHeight: 1.0, letterSpacing: '-0.01em',
        }}>
          {tr('se reconstitue', 'is taking shape')}
          <motion.span
            animate={{ opacity: phase === 'convergence' ? [1, 0, 1] : 1 }}
            transition={{ duration: 1.1, repeat: phase === 'convergence' ? Infinity : 0, ease: 'easeInOut' }}
          >…</motion.span>
        </div>
        <motion.div
          style={{ fontSize: 20, color: accent, marginTop: 16 }}
          animate={{
            opacity: phase === 'convergence' ? [0.4, 1, 0.4] : 1,
            scale: phase === 'battement' ? [1, 1.8, 1.3] : 1,
          }}
          transition={{
            duration: phase === 'convergence' ? 1.6 : 0.6,
            repeat: phase === 'convergence' ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          ✦
        </motion.div>
      </motion.div>

      {/* Flash de dévoilement — lumière qui s'ouvre depuis le centre */}
      {phase === 'flash' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.9, 0], scale: 3 }}
          transition={{ duration: T_FLASH / 1000, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '60vmax', height: '60vmax', marginLeft: '-30vmax', marginTop: '-30vmax',
            borderRadius: '50%', pointerEvents: 'none',
            background: `radial-gradient(circle, ${bg} 0%, ${accent}40 40%, transparent 70%)`,
          }}
        />
      )}
    </motion.div>
  )
}
