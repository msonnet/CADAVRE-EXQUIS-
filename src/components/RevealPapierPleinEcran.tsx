import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAPIER_TEXTURE, ENCRE_PAPIER } from './Papier'

/**
 * Révélation plein écran à 1, 2 ou 3 plis selon la longueur du poème :
 *   1–4  lignes  →  1 pli  (1 section × 100 vh)
 *   5–12 lignes  →  2 plis (2 sections × 50 vh)
 *   13 + lignes  →  3 plis (3 sections × 33 vh)
 *
 * Chaque section occupe une fraction égale du viewport ; le texte est centré
 * verticalement. La taille de police grandit quand il y a moins de plis
 * (plus d'espace disponible par ligne).
 *
 * Navigation : seul un tap/clic appelle onTermine (pas d'avance automatique).
 */

const FOLD_DURATION = 1.6
const ALL_FOLD_DELAYS = [0.35, 2.3, 4.25] as const

export default function RevealPapierPleinEcran({
  lignes,
  accent,
  encre,
  btnText,
  bg,
  onTermine,
}: {
  lignes: string[]
  accent: string
  encre: string
  btnText: string
  bg: string
  onTermine: () => void
}) {
  const [ready, setReady] = useState(false)
  const cbRef = useRef(onTermine)
  cbRef.current = onTermine

  const vers = lignes.filter(l => l.trim() !== '')

  // Nombre de plis selon la longueur du texte
  const numFolds = vers.length <= 4 ? 1 : vers.length <= 12 ? 2 : 3

  // Répartition des vers entre les sections
  let sections: string[][]
  if (numFolds === 1) {
    sections = [vers]
  } else if (numFolds === 2) {
    const mid = Math.ceil(vers.length / 2)
    sections = [vers.slice(0, mid), vers.slice(mid)]
  } else {
    const cut1 = Math.ceil(vers.length / 3)
    const cut2 = Math.ceil(vers.length * 2 / 3)
    sections = [vers.slice(0, cut1), vers.slice(cut1, cut2), vers.slice(cut2)]
  }

  const foldDelays = Array.from(ALL_FOLD_DELAYS).slice(0, numFolds)
  const textDelays = foldDelays.map(d => d + FOLD_DURATION * 0.78)

  // Police plus grande quand l'espace disponible est plus grand
  const fontSize =
    numFolds === 1 ? 'clamp(1.55rem, 7vw, 2.1rem)'
    : numFolds === 2 ? 'clamp(1.2rem, 5vw, 1.6rem)'
    : 'clamp(1.0rem, 4.2vw, 1.35rem)'

  const mono = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }
  const pct = 100 / numFolds

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Révélation du poème — toucher pour continuer"
      onClick={() => cbRef.current()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') cbRef.current() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        cursor: 'pointer',
        ...PAPIER_TEXTURE, // fond pour les éventuels sous-pixels entre sections
        userSelect: 'none',
      }}
    >
      {sections.map((sectionVers, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: `${idx * pct}%`,
            // Dernière section : bottom: 0 pour absorber les arrondis flottants
            ...(idx === numFolds - 1 ? { bottom: 0 } : { height: `${pct}%` }),
            perspective: '1200px',
            perspectiveOrigin: 'center bottom',
            borderBottom: idx < numFolds - 1 ? '1px solid rgba(0,0,0,0.12)' : 'none',
          }}
        >
          {/* Papier de base — texte centré verticalement dans la section */}
          <div style={{
            position: 'absolute', inset: 0,
            ...PAPIER_TEXTURE,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 32px',
            overflow: 'hidden',
          }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: textDelays[idx], duration: 0.65, ease: 'easeOut' }}
            >
              {sectionVers.map((l, i) => (
                <p key={i} style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic',
                  fontSize,
                  lineHeight: 1.72,
                  color: ENCRE_PAPIER,
                  margin: '0 0 2px',
                }}>
                  {l}
                </p>
              ))}
            </motion.div>
          </div>

          {/* Ombre portée par le rabat de la section précédente */}
          {idx > 0 && (
            <motion.div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 48,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.26), transparent)',
                pointerEvents: 'none', zIndex: 3,
              }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: FOLD_DURATION * 0.65, delay: foldDelays[idx - 1], ease: 'easeOut' }}
            />
          )}

          {/* Le rabat — couvre la section et se déplie depuis la pliure (bas) */}
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              ...PAPIER_TEXTURE,
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              boxShadow: '0 6px 22px rgba(0,0,0,0.32)',
              zIndex: 2,
            }}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -108 }}
            transition={{ duration: FOLD_DURATION, delay: foldDelays[idx], ease: [0.33, 0, 0.2, 1] }}
            onAnimationComplete={idx === sections.length - 1 ? () => setReady(true) : undefined}
          >
            {/* Gradient de pliure en bas du rabat */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
              background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))',
            }} />
          </motion.div>
        </div>
      ))}

      {/* Indicateur « toucher pour continuer » — apparaît après le dernier pli */}
      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              position: 'absolute',
              bottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
              left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              pointerEvents: 'none', zIndex: 20,
            }}
          >
            <motion.span
              animate={{ opacity: [0.3, 0.85, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ ...mono, fontSize: 13, color: ENCRE_PAPIER }}
            >
              — TOUCHER POUR CONTINUER —
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
