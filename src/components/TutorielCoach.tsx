import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TutorielCoachProps {
  visible: boolean
  etape: number
  total: number
  titre: string
  corps: React.ReactNode
  cible?: string
  onCompris?: () => void
  onPasser: () => void
  accent: string
  encre: string
  bg: string
  position?: 'bottom' | 'top'
}

export default function TutorielCoach({
  visible, etape, total, titre, corps, cible, onCompris, onPasser,
  accent, encre, bg, position = 'bottom',
}: TutorielCoachProps) {
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }
  const isTop = position === 'top'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={etape}
          role="dialog"
          aria-label={`Guide tutoriel étape ${etape + 1}`}
          aria-live="polite"
          style={{
            position: 'fixed',
            left: 0, right: 0,
            ...(isTop
              ? { top: 0, borderBottom: `2px solid ${accent}`, paddingTop: 'max(20px, env(safe-area-inset-top))', paddingBottom: 16, paddingLeft: 20, paddingRight: 20, boxShadow: `0 12px 48px ${encre}20` }
              : { bottom: 0, borderTop: `2px solid ${accent}`, padding: '16px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', boxShadow: `0 -12px 48px ${encre}20` }),
            zIndex: 500,
            background: bg,
          }}
          initial={{ y: isTop ? -140 : 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: isTop ? -140 : 140, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ ...mono, fontSize: 11, color: accent, opacity: 0.8, letterSpacing: '0.22em' }}>
              ✦ GUIDE · {etape + 1}&thinsp;/&thinsp;{total}
            </div>
            <button
              onClick={onPasser}
              style={{ ...mono, fontSize: 11, color: encre, opacity: 0.38, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              PASSER
            </button>
          </div>

          {/* Title */}
          <div
            className="font-fraunces font-black"
            style={{ fontSize: 'clamp(1.2rem, 5.5vw, 1.55rem)', color: encre, lineHeight: 1.1, marginBottom: 8 }}
          >
            {titre}
          </div>

          {/* Body */}
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 16, lineHeight: 1.6,
            color: encre, opacity: 0.88,
            marginBottom: (cible || onCompris) ? 14 : 0,
          }}>
            {corps}
          </div>

          {/* Target action */}
          {cible && (
            <div style={{
              ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.14em',
              marginBottom: onCompris ? 12 : 0,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <motion.span
                style={{ display: 'inline-block' }}
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              >→</motion.span>
              {cible}
            </div>
          )}

          {/* Manual advance */}
          {onCompris && (
            <button
              onClick={onCompris}
              style={{
                width: '100%', background: accent, color: bg,
                ...mono, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.18em',
                padding: '0.85em 1.2em', border: 'none', cursor: 'pointer', borderRadius: 3,
              }}
            >
              Compris →
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
