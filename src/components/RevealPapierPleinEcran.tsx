import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PAPIER_TEXTURE } from './Papier'

/**
 * Plein écran de papier crème qui se déplie lentement, révélant le contenu
 * rendu en-dessous. Le rabat supérieur pivote depuis la pliure centrale
 * (rotateX 0 → -108°) ; la moitié inférieure reste plate puis s'efface,
 * dévoilant le fond de page.
 *
 * onTermine est appelé une fois la pliure ET le fondu terminés.
 */
export default function RevealPapierPleinEcran({
  onTermine,
  duration = 2.8,
  delay = 0.3,
}: {
  onTermine: () => void
  duration?: number
  delay?: number
}) {
  const [topDone, setTopDone] = useState(false)
  const cbRef = useRef(onTermine)
  useEffect(() => { cbRef.current = onTermine })

  useEffect(() => {
    if (!topDone) return
    const t = setTimeout(() => cbRef.current(), 480)
    return () => clearTimeout(t)
  }, [topDone])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        perspective: '2200px',
        pointerEvents: 'none',
      }}
    >
      {/* Le rabat — moitié haute qui se déplie depuis la pliure centrale */}
      <motion.div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '50%',
          ...PAPIER_TEXTURE,
          transformOrigin: 'center bottom',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.38)',
        }}
        initial={{ rotateX: 0 }}
        animate={{ rotateX: -108 }}
        transition={{ duration, delay, ease: [0.33, 0, 0.2, 1] }}
        onAnimationComplete={() => setTopDone(true)}
      >
        {/* Ombre de pliure le long du bord bas du rabat */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.22))',
        }} />
      </motion.div>

      {/* Ombre portée du rabat sur la moitié basse — s'estompe au fil du dépli */}
      <motion.div
        style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: '42%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.28), transparent)',
          pointerEvents: 'none',
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: duration * 0.6, delay, ease: 'easeOut' }}
      />

      {/* La base — moitié basse, reste plate jusqu'au passage du rabat, puis s'efface */}
      <motion.div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%',
          ...PAPIER_TEXTURE,
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: topDone ? 0 : 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
    </div>
  )
}
