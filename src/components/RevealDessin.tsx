import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { REVEAL_DESSIN, fracRevealDessin } from '../utils/partager'
import { mono } from '../lib/typo'

interface Props {
  imageUrl: string
  texte: string | null
  accent: string
  encre: string
  bg: string
  onTermine: () => void
}

// Révélation plein écran du cadavre dessiné — la même partition que la vidéo partagée :
// le dessin couvre toute la page, révélé bande par bande avec la ligne de balayage,
// puis la lecture surréaliste apparaît en surimpression dans un léger fondu.
export default function RevealDessin({ imageUrl, texte, accent, encre, bg, onTermine }: Props) {
  const clipRef = useRef<HTMLDivElement>(null)
  const scanRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const lectRef = useRef<HTMLDivElement>(null)
  const [pretAFermer, setPretAFermer] = useState(false)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const t = performance.now() - t0
      const { frac, scanActif } = fracRevealDessin(t)
      if (clipRef.current) clipRef.current.style.clipPath = `inset(0 0 ${(1 - frac) * 100}% 0)`
      if (scanRef.current) {
        scanRef.current.style.top = `${frac * 100}%`
        scanRef.current.style.opacity = scanActif && frac < 1 ? '1' : '0'
      }
      if (flashRef.current) {
        const p = (t - REVEAL_DESSIN.flashT) / REVEAL_DESSIN.flashDur
        flashRef.current.style.opacity = p >= 0 && p <= 1 ? String(Math.sin(p * Math.PI) * 0.85) : '0'
      }
      if (lectRef.current) {
        lectRef.current.style.opacity = String(Math.max(0, Math.min(1, (t - REVEAL_DESSIN.lectT) / REVEAL_DESSIN.lectDur)))
      }
      if (t < REVEAL_DESSIN.total + 1500) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const t1 = setTimeout(() => setPretAFermer(true), REVEAL_DESSIN.lectT)
    const t2 = setTimeout(() => setHint(true), 5500)
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
      onClick={() => { if (pretAFermer) onTermine() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: bg, overflow: 'hidden',
        cursor: pretAFermer ? 'pointer' : 'default',
      }}
    >
      {/* Dessin plein écran, révélé bande par bande */}
      <div ref={clipRef} style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 0 100% 0)' }}>
        <img
          src={imageUrl}
          alt="Cadavre exquis dessiné"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Ligne de balayage */}
      <div
        ref={scanRef}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 2,
          background: accent, opacity: 0,
          boxShadow: `0 0 24px ${accent}66`,
          pointerEvents: 'none',
        }}
      />

      {/* Flash de révélation */}
      <div
        ref={flashRef}
        style={{
          position: 'absolute', inset: 0, opacity: 0,
          background: `radial-gradient(circle at 50% 50%, ${bg} 0%, ${accent}59 40%, transparent 75%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Lecture surréaliste — surimpression sur voile papier */}
      {texte && (
        <div
          ref={lectRef}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0,
            padding: '130px 28px 56px',
            background: `linear-gradient(to bottom, transparent, ${bg}b8 40%, ${bg}f2 100%)`,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 14 }}>
            — LECTURE —
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
            fontSize: 'clamp(1.05rem, 4.6vw, 1.35rem)', lineHeight: 1.55,
            color: encre, opacity: 0.92,
            display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            « {texte.replace(/\n+/g, ' ').trim()} »
          </div>
        </div>
      )}

      {/* Invitation à poursuivre */}
      {hint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 16,
            textAlign: 'center', ...mono, fontSize: 11,
            letterSpacing: '0.3em', color: encre, pointerEvents: 'none',
          }}
        >
          TOUCHER POUR CONTINUER
        </motion.div>
      )}
    </motion.div>
  )
}
