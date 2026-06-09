import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { vibrer } from '../utils/haptics'

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
  /** Appelé une fois la convergence + le battement terminés : le parent dévoile alors le poème. */
  onTermine: () => void
  /** Optionnel : son de révélation joué au climax. */
  jouerClimax?: () => void
}

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Phases de la séquence (ms)
const T_CONVERGENCE = reduced ? 600 : 2200
const T_BATTEMENT = reduced ? 250 : 650
const T_FLASH = reduced ? 200 : 480

/**
 * Mise en scène de la reconstitution : chaque fragration vient d'un bord de l'écran,
 * dérive vers le centre en s'effaçant — le cadavre se rassemble — puis un battement
 * de tension et un flash de lumière passent la main au dévoilement du poème.
 */
export default function RevealAssemblageTexte({
  fragments, voixCount, accent, encre, bg, onTermine, jouerClimax,
}: Props) {
  const [phase, setPhase] = useState<'convergence' | 'battement' | 'flash'>('convergence')
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

  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 250, background: bg, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 28px',
      }}
    >
      {/* Bandes horizontales — texture des voix qui se superposent */}
      {Array.from({ length: voixCount }).map((_, i) => (
        <motion.div
          key={`bande-${i}`}
          initial={{ x: i % 2 === 0 ? '-110%' : '110%' }}
          animate={{ x: 0 }}
          transition={{ delay: i * 0.16, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: 'absolute', left: 0, right: 0,
            height: `${100 / voixCount}%`, top: `${(i * 100) / voixCount}%`,
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
              duration: (T_CONVERGENCE / 1000) - i * 0.05,
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
          — {voixCount} VOIX —
        </div>
        <div style={{
          fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(2rem, 9vw, 3.4rem)', color: encre, lineHeight: 1.0, letterSpacing: '-0.01em',
        }}>
          Le cadavre
        </div>
        <div style={{
          fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(2rem, 9vw, 3.4rem)', color: accent, lineHeight: 1.0, letterSpacing: '-0.01em',
        }}>
          se reconstitue
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
