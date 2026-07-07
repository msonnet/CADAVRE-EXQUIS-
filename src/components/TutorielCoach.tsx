import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mono } from '../lib/typo'

export interface TutorielCoachProps {
  visible: boolean
  etape: number
  total: number
  titre: string
  corps: React.ReactNode
  /** Libellé de l'action attendue dans la page (le vrai bouton porte le halo .tut-cible). */
  cible?: string
  /** Avance manuelle. Seul → bouton primaire. Avec cible → lien discret « Plus tard ». */
  onCompris?: () => void
  labelCompris?: string
  onPasser: () => void
  accent: string
  encre: string
  bg: string
  position?: 'bottom' | 'top'
}

/** Rangée de points de progression — remplie, courante (pulsante), à venir. */
function ProgressDots({ etape, total, accent, encre }: { etape: number; total: number; accent: string; encre: string }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        i === etape ? (
          <motion.span
            key={i}
            style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block' }}
            animate={{ scale: [1, 1.45, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <span
            key={i}
            style={{
              width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
              background: i < etape ? accent : `${encre}28`,
            }}
          />
        )
      ))}
    </div>
  )
}

export default function TutorielCoach({
  visible, etape, total, titre, corps, cible, onCompris, labelCompris, onPasser,
  accent, encre, bg, position = 'bottom',
}: TutorielCoachProps) {
  const isTop = position === 'top'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={etape}
          role="dialog"
          aria-label={`Guide tutoriel étape ${etape + 1} sur ${total}`}
          aria-live="polite"
          style={{
            position: 'fixed',
            left: 0, right: 0,
            ...(isTop
              ? { top: 0, borderBottom: `2px solid ${accent}`, paddingTop: 'max(18px, env(safe-area-inset-top))', paddingBottom: 16, paddingLeft: 20, paddingRight: 20, boxShadow: `0 12px 48px ${encre}20` }
              : { bottom: 0, borderTop: `2px solid ${accent}`, padding: '14px 20px', paddingBottom: 'max(18px, env(safe-area-inset-bottom))', boxShadow: `0 -12px 48px ${encre}20` }),
            zIndex: 500,
            background: bg,
          }}
          initial={{ y: isTop ? -160 : 160, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: isTop ? -160 : 160, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        >
          {/* Header : progression + passer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...mono, fontSize: 11, color: accent, opacity: 0.85, letterSpacing: '0.24em', fontWeight: 700 }}>
                GUIDE
              </span>
              <ProgressDots etape={etape} total={total} accent={accent} encre={encre} />
            </div>
            <button
              onClick={onPasser}
              style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0 12px 16px', minHeight: 44, marginTop: -12, marginBottom: -6 }}
            >
              PASSER
            </button>
          </div>

          {/* Titre */}
          <div
            className="font-fraunces font-black"
            style={{ fontSize: 'clamp(1.15rem, 5vw, 1.45rem)', color: encre, lineHeight: 1.1, marginBottom: 6 }}
          >
            {titre}
          </div>

          {/* Corps — une idée, deux lignes max */}
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 17, lineHeight: 1.5,
            color: encre, opacity: 0.88,
            marginBottom: (cible || onCompris) ? 12 : 0,
          }}>
            {corps}
          </div>

          {/* Action attendue dans la page — flèche pulsante vers la cible */}
          {cible && (
            <div style={{
              ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.14em',
              display: 'flex', alignItems: 'center', gap: 7,
              marginBottom: onCompris ? 10 : 0,
            }}>
              <motion.span
                style={{ display: 'inline-block' }}
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              >→</motion.span>
              {cible}
            </div>
          )}

          {/* Avance manuelle : primaire sans cible, lien discret avec cible */}
          {onCompris && (
            cible ? (
              <button
                onClick={onCompris}
                style={{
                  ...mono, fontSize: 12, color: encre, opacity: 0.55,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 16px 10px 0', minHeight: 44,
                  textDecoration: 'underline', textUnderlineOffset: 3,
                  letterSpacing: '0.14em',
                }}
              >
                {labelCompris ?? 'PLUS TARD →'}
              </button>
            ) : (
              <button
                onClick={onCompris}
                style={{
                  width: '100%', background: accent, color: bg,
                  ...mono, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.18em',
                  padding: '0.85em 1.2em', border: 'none', cursor: 'pointer', borderRadius: 3,
                }}
              >
                {labelCompris ?? 'Compris →'}
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Panneau de célébration — fin du guide. La page appelle onFin après ~2,4 s. */
export function TutorielFete({ visible, accent, encre, bg }: { visible: boolean; accent: string; encre: string; bg: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 500,
            background: bg, borderTop: `2px solid ${accent}`,
            padding: '22px 20px', paddingBottom: 'max(26px, env(safe-area-inset-bottom))',
            boxShadow: `0 -12px 48px ${encre}20`,
            textAlign: 'center',
          }}
          initial={{ y: 160, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 160, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <motion.div
            style={{ fontSize: 26, color: accent, marginBottom: 8 }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.35, 1] }}
            transition={{ duration: 0.6, ease: [0.22, 1.4, 0.36, 1] }}
            aria-hidden
          >
            ✦
          </motion.div>
          <div
            className="font-fraunces font-black"
            style={{ fontSize: 'clamp(1.3rem, 6vw, 1.7rem)', color: encre, lineHeight: 1.1, marginBottom: 5 }}
          >
            Guide terminé.
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 17, color: encre, opacity: 0.8 }}>
            Le jeu est à toi — bonne écriture.
          </p>
          <div style={{ ...mono, fontSize: 10, color: accent, opacity: 0.7, marginTop: 10, letterSpacing: '0.24em' }}>
            ✦ ✦ ✦
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
