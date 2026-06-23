import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TutorielCoachProps {
  visible: boolean
  etape: number
  total?: number
  titre: string
  corps: React.ReactNode
  cible?: string
  onCompris?: () => void
  onPasser: () => void
  accent: string
  encre: string
  bg: string
}

export default function TutorielCoach({ visible, etape, total = 9, titre, corps, cible, onCompris, onPasser, accent, encre, bg }: TutorielCoachProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="coach"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 500,
            background: bg,
            borderTop: `2px solid ${accent}`,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 14,
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{
              fontFamily: "'Raleway', monospace",
              fontSize: 11,
              letterSpacing: '0.12em',
              color: accent,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              ✦ GUIDE · {etape + 1} / {total}
            </span>
            <button
              onClick={onPasser}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Raleway', monospace",
                fontSize: 10,
                letterSpacing: '0.1em',
                color: encre,
                opacity: 0.45,
                textTransform: 'uppercase',
                padding: '2px 0',
              }}
            >
              PASSER LE TUTORIEL
            </button>
          </div>

          {/* Title */}
          <div style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontSize: '1.45rem',
            color: encre,
            marginBottom: 8,
            lineHeight: 1.2,
          }}>
            {titre}
          </div>

          {/* Body */}
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17,
            lineHeight: 1.6,
            color: encre,
            opacity: 0.88,
            marginBottom: cible || onCompris ? 14 : 0,
          }}>
            {corps}
          </div>

          {/* Cible */}
          {cible && (
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              style={{
                fontFamily: "'Raleway', monospace",
                fontSize: 13,
                letterSpacing: '0.08em',
                color: accent,
                fontWeight: 700,
                marginBottom: onCompris ? 12 : 0,
              }}
            >
              → {cible}
            </motion.div>
          )}

          {/* Compris button */}
          {onCompris && (
            <button
              onClick={onCompris}
              style={{
                width: '100%',
                padding: '14px 0',
                background: accent,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: "'Raleway', monospace",
                fontSize: 13,
                letterSpacing: '0.12em',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: bg,
                marginTop: 4,
              }}
            >
              COMPRIS
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
