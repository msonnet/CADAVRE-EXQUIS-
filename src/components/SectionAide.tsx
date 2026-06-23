import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * En-tête de section « — LABEL — » avec une aide repliée derrière un astérisque ✦.
 * Le label reste toujours lisible (on choisit d'instinct) ; l'explication longue
 * n'apparaît qu'au tap sur le ✦, pour qui la veut. Objectif : des écrans qui
 * respirent, sans noyer le joueur sous le texte aux moments de décision.
 */
export default function SectionAide({
  label, aide, accent, encre, style,
}: {
  label: string
  aide?: React.ReactNode
  accent: string
  encre: string
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.22em' }

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>
          — {label} —
        </span>
        {aide && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={open ? 'Masquer l’aide' : 'En savoir plus'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1,
              fontSize: 13, color: open ? accent : `${accent}88`,
              transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s, color 0.2s',
            }}
          >
            ✦
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && aide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 16, lineHeight: 1.5,
              color: encre, opacity: 0.78, paddingBottom: 10,
            }}>
              {aide}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
