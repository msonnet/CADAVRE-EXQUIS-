import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAPIER_TEXTURE, ENCRE_PAPIER } from './Papier'

/**
 * Révélation typographique pure — le papier est statique, les vers tombent
 * un par un (y -8 → 0, opacity 0 → 1) avec une pause entre les groupes.
 *
 * 1–4  lignes → 1 groupe  (police ~2.2 rem)
 * 5–12 lignes → 2 groupes (police ~1.7 rem)
 * 13+  lignes → 3 groupes (police ~1.4 rem)
 *
 * Navigation : seul un tap/clic appelle onTermine.
 */

const LINE_STAGGER  = 0.22   // délai entre deux vers consécutifs (s)
const SECTION_GAP   = 0.55   // pause supplémentaire entre les groupes (s)
const LINE_DURATION = 0.55   // durée d'apparition d'un vers (s)
const INITIAL_DELAY = 0.4    // délai avant le premier vers (s)

export default function RevealPapierPleinEcran({
  lignes,
  onTermine,
}: {
  lignes: string[]
  onTermine: () => void
}) {
  const [ready, setReady] = useState(false)
  const cbRef = useRef(onTermine)
  cbRef.current = onTermine

  // Fige les lignes au montage — texteCorrige peut arriver en retard
  const frozenRef = useRef(lignes)
  const vers = frozenRef.current.filter(l => l.trim() !== '')

  const numGroups = vers.length <= 4 ? 1 : vers.length <= 12 ? 2 : 3

  // Répartition des vers entre les groupes
  let groups: string[][]
  if (numGroups === 1) {
    groups = [vers]
  } else if (numGroups === 2) {
    const mid = Math.ceil(vers.length / 2)
    groups = [vers.slice(0, mid), vers.slice(mid)]
  } else {
    const cut1 = Math.ceil(vers.length / 3)
    const cut2 = Math.ceil(vers.length * 2 / 3)
    groups = [vers.slice(0, cut1), vers.slice(cut1, cut2), vers.slice(cut2)]
  }

  // Délai de début de chaque groupe
  const groupStarts: number[] = [INITIAL_DELAY]
  for (let i = 1; i < groups.length; i++) {
    const prev = groupStarts[i - 1]
    groupStarts.push(prev + groups[i - 1].length * LINE_STAGGER + SECTION_GAP)
  }

  // Tous les vers à plat avec leur délai calculé
  const allLines = groups.flatMap((gVers, gIdx) =>
    gVers.map((l, lIdx) => ({
      text: l,
      delay: groupStarts[gIdx] + lIdx * LINE_STAGGER,
      stanzaBreak: lIdx === 0 && gIdx > 0,
    }))
  )

  // L'indicateur apparaît après que le dernier vers est stabilisé
  const readyAfter = useRef(
    allLines.length > 0
      ? allLines[allLines.length - 1].delay + LINE_DURATION + 0.3
      : 1.0
  )
  useEffect(() => {
    const t = setTimeout(() => setReady(true), readyAfter.current * 1000)
    return () => clearTimeout(t)
  }, [])

  const fontSize =
    numGroups === 1 ? 'clamp(1.6rem, 7.5vw, 2.2rem)'
    : numGroups === 2 ? 'clamp(1.25rem, 5.5vw, 1.7rem)'
    : 'clamp(1.05rem, 4.5vw, 1.4rem)'

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
        ...PAPIER_TEXTURE,
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Zone de texte centrée verticalement */}
      <div style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 36px',
      }}>
        {allLines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: line.delay, duration: LINE_DURATION, ease: [0.22, 0.88, 0.32, 1] }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              fontSize,
              lineHeight: 1.72,
              color: ENCRE_PAPIER,
              margin: 0,
              marginTop: line.stanzaBreak ? '1.5em' : 0,
              marginBottom: '2px',
            }}
          >
            {line.text}
          </motion.p>
        ))}
      </div>

      {/* Indicateur — apparaît une fois tous les vers posés */}
      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              position: 'fixed',
              bottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
              left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              pointerEvents: 'none',
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
