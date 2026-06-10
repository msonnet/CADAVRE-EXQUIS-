import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import type { NiveauValidation } from '../utils/validation'

const NIVEAUX: { id: NiveauValidation; label: string; desc: string }[] = [
  { id: 'stricte',    label: 'Stricte',    desc: 'Avertit si le fragment ne correspond pas à la consigne.' },
  { id: 'souple',     label: 'Souple',     desc: 'Accepte tout texte non vide.' },
  { id: 'desactivee', label: 'Libre',      desc: 'Aucune vérification grammaticale.' },
]

export default function Reglages() {
  const navigate = useNavigate()
  const seance = useReve()
  const [validation, setValidation] = useState<NiveauValidation>(
    () => (localStorage.getItem('validation-niveau') as NiveauValidation) ?? 'souple'
  )
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  function changerValidation(niveau: NiveauValidation) {
    setValidation(niveau)
    localStorage.setItem('validation-niveau', niveau)
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="config" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ACCUEIL
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
          — RÉGLAGES —
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 24 }}
        >
          <div
            className="font-bodoni font-black leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 4 }}
          >
            Préférences <span style={{ color: accent }}>de séance.</span>
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 24 }} />

        {/* ── VALIDATION ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — VALIDATION —
          </div>
          <div className="flex gap-2 mb-3">
            {NIVEAUX.map(n => {
              const active = validation === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => changerValidation(n.id)}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n.label.toUpperCase()}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.8 }}>
            {NIVEAUX.find(n => n.id === validation)?.desc}
          </div>
        </motion.div>

        {/* ── AMBIANCE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — AMBIANCE —
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.8, marginBottom: 12 }}>
            Chaque jour, une ambiance est tirée au sort. Vous pouvez en tirer une nouvelle maintenant.
          </div>
          <button
            onClick={() => seance?.retirer()}
            style={{
              ...mono, fontSize: 13,
              color: encre,
              background: 'transparent',
              border: `0.5px solid ${encre}30`,
              padding: '7px 12px', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ✦ NOUVELLE AMBIANCE
          </button>
          <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.6, marginTop: 8, textTransform: 'uppercase' }}>
            {seance?.ambiance.name}
          </div>
        </motion.div>

        <div style={{ flex: 1 }} />

        {/* ── VERSION ── */}
        <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.9, textAlign: 'center', paddingBottom: 4, lineHeight: 1.6 }}>
          CADAVRE EXQUIS · v1.0<br />
          AUCUN TRACKING · AUCUN COMPTE · TOUT RESTE LOCAL
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <Link
            to="/privacy"
            style={{ ...mono, fontSize: 13, color: accent, opacity: 0.75, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Politique de confidentialité →
          </Link>
        </div>

      </div>
    </PageTransition>
  )
}
