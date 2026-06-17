import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAPIER_TEXTURE, ENCRE_PAPIER } from './Papier'

/**
 * Écran plein écran de révélation — le papier est divisé en 3 zones
 * horizontales, chacune couverte d'un rabat de papier crème qui se déplie
 * séquentiellement. Dès qu'un rabat s'ouvre, les vers de cette section
 * apparaissent en fondu. Une fois les 3 plis déroulés, un indicateur pulse
 * pour inviter l'utilisateur à taper.
 *
 * Navigation : seul un tap/clic sur l'écran appelle onTermine (pas
 * d'avance automatique).
 */

const FOLD_DURATION = 1.6
const FOLD_DELAYS = [0.35, 2.3, 4.25] as const

export default function RevealPapierPleinEcran({
  lignes,
  accent,
  encre,
  btnText,
  onTermine,
}: {
  lignes: string[]
  accent: string
  encre: string
  btnText: string
  onTermine: () => void
}) {
  const [ready, setReady] = useState(false)
  const cbRef = useRef(onTermine)
  cbRef.current = onTermine

  // Répartir les vers non vides en 3 sections sensiblement égales
  const vers = lignes.filter(l => l.trim() !== '')
  const n = Math.max(vers.length, 1)
  const cut1 = Math.ceil(n / 3)
  const cut2 = Math.ceil((n * 2) / 3)
  const sections = [
    vers.slice(0, cut1),
    vers.slice(cut1, cut2),
    vers.slice(cut2),
  ]
  // Délai d'apparition du texte : environ 78 % de la durée du pli écoulée
  const textDelays = FOLD_DELAYS.map(d => d + FOLD_DURATION * 0.78)

  const mono = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

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
        ...PAPIER_TEXTURE, // comble les éventuels sous-pixels entre sections
        userSelect: 'none',
      }}
    >
      {/* Plis */}
      {sections.map((sectionVers, idx) => {
        const pct = 100 / 3
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: 0, right: 0,
              top: idx === 0 ? 0 : `${idx * pct}%`,
              bottom: idx === 2 ? 0 : undefined,
              height: idx < 2 ? `${pct}%` : undefined,
              perspective: '1200px',
              perspectiveOrigin: 'center bottom',
            }}
          >
            {/* Papier de base — contient les vers */}
            <div style={{
              position: 'absolute', inset: 0,
              ...PAPIER_TEXTURE,
              padding: '10px 24px 8px',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: textDelays[idx], duration: 0.65, ease: 'easeOut' }}
              >
                {sectionVers.map((vers, i) => (
                  <p key={i} style={{
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.05rem, 4.2vw, 1.4rem)',
                    lineHeight: 1.7,
                    color: ENCRE_PAPIER,
                    margin: '0 0 1px',
                  }}>
                    {vers || ' '}
                  </p>
                ))}
              </motion.div>
            </div>

            {/* Ombre portée par le rabat de la section précédente */}
            {idx > 0 && (
              <motion.div
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 40,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.26), transparent)',
                  pointerEvents: 'none', zIndex: 3,
                }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: FOLD_DURATION * 0.65, delay: FOLD_DELAYS[idx - 1], ease: 'easeOut' }}
              />
            )}

            {/* Le rabat — se déplie depuis la pliure centrale (bas de la zone) */}
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
              transition={{ duration: FOLD_DURATION, delay: FOLD_DELAYS[idx], ease: [0.33, 0, 0.2, 1] }}
              onAnimationComplete={idx === 2 ? () => setReady(true) : undefined}
            >
              {/* Gradient de pliure en bas du rabat */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
                background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))',
              }} />
            </motion.div>
          </div>
        )
      })}

      {/* Lignes de pliure visibles entre les sections */}
      {[1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${i * (100 / 3)}%`,
          height: 1,
          background: 'rgba(0,0,0,0.11)',
          zIndex: 10, pointerEvents: 'none',
        }} />
      ))}

      {/* Indicateur « toucher pour continuer » — apparaît après le 3e pli */}
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
