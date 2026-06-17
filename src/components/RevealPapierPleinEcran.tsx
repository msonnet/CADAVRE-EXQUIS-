import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAPIER_TEXTURE, ENCRE_PAPIER } from './Papier'

/**
 * Révélation en 3 plis séquentiels.
 *
 * Le papier est centré verticalement et dimensionné au contenu : les 3 sections
 * ont une hauteur déterminée par leurs vers (min 56 px), jamais une fraction
 * fixe du viewport. L'arrière-plan adopte la couleur ambiante de la séance.
 *
 * Navigation : seul un tap/clic (à tout moment) appelle onTermine.
 */

const FOLD_DURATION = 1.6
const FOLD_DELAYS = [0.35, 2.3, 4.25] as const

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

  // Vers non vides répartis en 3 sections sensiblement égales
  const vers = lignes.filter(l => l.trim() !== '')
  const n = Math.max(vers.length, 1)
  const cut1 = Math.ceil(n / 3)
  const cut2 = Math.ceil((n * 2) / 3)
  const sections = [
    vers.slice(0, cut1),
    vers.slice(cut1, cut2),
    vers.slice(cut2),
  ]
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
        background: bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        padding: '48px 0',
        userSelect: 'none',
      }}
    >
      {/* Le papier — dimensionné au contenu, pleine largeur */}
      <div style={{
        width: '100%',
        boxShadow: '0 10px 48px rgba(0,0,0,0.45)',
      }}>
        {sections.map((sectionVers, idx) => (
          <div
            key={idx}
            style={{
              // grid : l'axe du bloc est déterminé par les vers,
              // le rabat s'étire pour couvrir exactement la même hauteur
              display: 'grid',
              gridTemplateAreas: '"stack"',
              perspective: '1200px',
              perspectiveOrigin: 'center bottom',
              // trait de pliure entre les sections
              borderBottom: idx < 2 ? '1px solid rgba(0,0,0,0.11)' : 'none',
            }}
          >
            {/* Papier de base — détermine la hauteur de la cellule grid */}
            <div style={{
              gridArea: 'stack',
              ...PAPIER_TEXTURE,
              padding: '16px 28px 14px',
              minHeight: 56,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
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
                    fontSize: 'clamp(1.1rem, 4.5vw, 1.45rem)',
                    lineHeight: 1.72,
                    color: ENCRE_PAPIER,
                    margin: '0 0 1px',
                  }}>
                    {l}
                  </p>
                ))}
              </motion.div>
            </div>

            {/* Le rabat — s'étire sur la même hauteur grâce au grid (align: stretch par défaut) */}
            <motion.div
              style={{
                gridArea: 'stack',
                position: 'relative', // contexte pour le gradient de pliure
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
              {/* Ombre de pliure le long du bas du rabat */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
                background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))',
              }} />
            </motion.div>
          </div>
        ))}
      </div>

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
