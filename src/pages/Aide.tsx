import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'

const STRUCTURES = [
  { romain: 'I',   label: 'Phrase courte',  detail: '3 cases · sujet, verbe, complément', exemple: "L'ombre / glisse / dans la nuit froide" },
  { romain: 'II',  label: 'Phrase étoffée', detail: '7 cases · la canonique de Breton', exemple: 'Un beau soleil caressera lentement une mer endormie' },
  { romain: 'III', label: 'Vers libre',     detail: '4 à 12 vers · sans contrainte fixe' },
]

const VISIBILITE = [
  { label: 'AVEUGLE',        detail: 'Aucun contexte — tu écris dans le vide total. La forme la plus surréaliste.' },
  { label: 'DERNIER MOT',    detail: 'Un seul mot de la case précédente est visible. Un fil ténu, juste assez pour raccrocher quelque chose.' },
  { label: 'DERNIÈRE CASE',  detail: 'La case précédente entière est visible. Le poème sera plus cohérent, mais moins surprenant.' },
]

const MODES = [
  { label: 'STANDARD',    detail: 'Aucune contrainte de temps. Tu prends le temps qu\'il faut.' },
  { label: 'HYPNOTIQUE',  detail: '30 secondes par case. À 0, le fragment est soumis automatiquement — ou une voix intérieure complète à ta place.' },
]

export default function Aide() {
  const navigate = useNavigate()
  const seance = useReve()

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: 'monospace', letterSpacing: '0.18em' }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate(-1)}
            style={{ ...mono, fontSize: 9, color: encre, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← RETOUR
          </button>
          <span style={{ ...mono, fontSize: 9, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — RÈGLES —
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 20 }}
        >
          <div
            className="font-bodoni font-black italic leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            Comment <em style={{ color: accent }}>jouer.</em>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontSize: 14, color: encre,
            lineHeight: 1.65, marginBottom: 10,
          }}>
            Le cadavre exquis est un jeu surréaliste inventé à Paris dans les années 1920. Chaque participant écrit un fragment sans voir ce que l'autre a écrit. Le poème révélé à la fin est toujours une surprise.
          </p>
          <p style={{ ...mono, fontSize: 8, color: encre, opacity: 0.4, lineHeight: 1.7, letterSpacing: '0.16em' }}>
            TU JOUES AVEC UNE DES 40 VOIX ANONYMES.
            TU NE SAURAS JAMAIS LAQUELLE.
          </p>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 20 }} />

        {/* ── STRUCTURES ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — STRUCTURES —
          </div>
          {STRUCTURES.map((s, i) => (
            <div
              key={s.romain}
              style={{
                display: 'flex', gap: 14, paddingBottom: 12,
                borderBottom: `0.5px solid ${encre}10`, marginBottom: 12,
              }}
            >
              <span style={{ ...mono, fontSize: 10, color: accent, fontWeight: 700, minWidth: 22 }}>{s.romain}.</span>
              <div>
                <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 13, color: encre, marginBottom: 2 }}>
                  {s.label}
                </div>
                <div style={{ ...mono, fontSize: 8, color: encre, opacity: 0.45, marginBottom: s.exemple ? 4 : 0 }}>
                  {s.detail}
                </div>
                {s.exemple && (
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic', fontSize: 12, color: encre, opacity: 0.5,
                  }}>
                    « {s.exemple} »
                  </div>
                )}
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── VISIBILITÉ ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — VISIBILITÉ —
          </div>
          {VISIBILITE.map((v) => (
            <div
              key={v.label}
              style={{
                paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10,
              }}
            >
              <div style={{ ...mono, fontSize: 9, color: encre, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic', fontSize: 13, color: encre, opacity: 0.6,
              }}>{v.detail}</div>
            </div>
          ))}
        </motion.div>

        {/* ── MODES ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — MODES —
          </div>
          {MODES.map((m) => (
            <div
              key={m.label}
              style={{
                paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10,
              }}
            >
              <div style={{ ...mono, fontSize: 9, color: encre, fontWeight: 700, marginBottom: 3 }}>{m.label}</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic', fontSize: 13, color: encre, opacity: 0.6,
              }}>{m.detail}</div>
            </div>
          ))}
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={() => navigate('/config')}
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: accent, color: '#e8d4b8',
              ...mono, fontSize: 11, textTransform: 'uppercase',
              padding: '1em', border: 'none', cursor: 'pointer', gap: 2,
            }}
          >
            <span>Commencer la séance</span>
            <span aria-hidden style={{ fontSize: 14, opacity: 0.85 }}>→</span>
          </button>
        </motion.div>

      </div>
    </PageTransition>
  )
}
