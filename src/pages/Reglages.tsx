import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { chargerPoemes } from '../db'
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
  const [sonActif, setSonActif] = useState(() => localStorage.getItem('ambiance-muted') !== 'true')
  const [validation, setValidation] = useState<NiveauValidation>(
    () => (localStorage.getItem('validation-niveau') as NiveauValidation) ?? 'souple'
  )
  const [fontScale, setFontScale] = useState<number>(
    () => parseFloat(localStorage.getItem('font-scale') ?? '1')
  )
  const [exportOk, setExportOk] = useState(false)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  function toggleSon() {
    const next = !sonActif
    setSonActif(next)
    localStorage.setItem('ambiance-muted', String(!next))
  }

  function changerValidation(niveau: NiveauValidation) {
    setValidation(niveau)
    localStorage.setItem('validation-niveau', niveau)
  }

  function changerTaille(scale: number) {
    setFontScale(scale)
    localStorage.setItem('font-scale', String(scale))
    document.documentElement.style.setProperty('--font-scale', String(scale))
  }

  async function exporterPoemes() {
    const poemes = await chargerPoemes()
    const json = JSON.stringify(poemes, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cadavre-exquis-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setExportOk(true)
    setTimeout(() => setExportOk(false), 2500)
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="config" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 15, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ACCUEIL
          </button>
          <span style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
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

        {/* ── TAILLE DU TEXTE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
              — TAILLE DU TEXTE —
            </div>
            <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.55 }}>
              {Math.round(fontScale * 100)} %
            </div>
          </div>

          {/* Aperçu */}
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: `calc(1.15rem * ${fontScale})`,
            color: encre,
            lineHeight: 1.4,
            opacity: 0.75,
            marginBottom: 14,
            minHeight: '2.2em',
            transition: 'font-size 0.15s ease',
          }}>
            Le cadavre exquis boira le vin nouveau.
          </div>

          {/* Jauge */}
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min={75}
              max={150}
              step={5}
              value={Math.round(fontScale * 100)}
              onChange={e => changerTaille(parseInt(e.target.value) / 100)}
              aria-label="Taille du texte"
              style={{
                width: '100%',
                appearance: 'none',
                WebkitAppearance: 'none',
                height: 2,
                background: `linear-gradient(to right, ${accent} ${((fontScale - 0.75) / 0.75) * 100}%, ${encre}22 0%)`,
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                borderRadius: 2,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ ...mono, fontSize: 11, color: encre, opacity: 0.4 }}>A</span>
            <span style={{ ...mono, fontSize: 17, color: encre, opacity: 0.4 }}>A</span>
          </div>
        </motion.div>

        {/* ── SON ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — SON —
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ ...mono, fontSize: 15, color: encre, marginBottom: 3 }}>AUDIO AMBIANT</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: encre, opacity: 0.8 }}>
                Drone atmosphérique pendant le jeu
              </div>
            </div>
            <button
              onClick={toggleSon}
              style={{
                width: 44, height: 24, borderRadius: 12, flexShrink: 0, marginLeft: 12,
                background: sonActif ? accent : `${encre}20`,
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.25s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: sonActif ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: sonActif ? btnText : encre,
                transition: 'left 0.25s',
              }} />
            </button>
          </div>
        </motion.div>

        {/* ── VALIDATION ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
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
                    ...mono, fontSize: 14,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n.label.toUpperCase()}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: encre, opacity: 0.8 }}>
            {NIVEAUX.find(n => n.id === validation)?.desc}
          </div>
        </motion.div>

        {/* ── DONNÉES ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — DONNÉES —
          </div>
          <div className="flex justify-between items-center" style={{ paddingBottom: 12, borderBottom: `0.5px solid ${encre}10` }}>
            <div>
              <div style={{ ...mono, fontSize: 15, color: encre, marginBottom: 3 }}>EXPORTER MES POÈMES</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: encre, opacity: 0.8 }}>
                Télécharge tous les poèmes en JSON
              </div>
            </div>
            <button
              onClick={exporterPoemes}
              style={{
                ...mono, fontSize: 14,
                color: exportOk ? accent : encre,
                background: 'none',
                border: `0.5px solid ${exportOk ? accent : `${encre}30`}`,
                padding: '7px 12px', cursor: 'pointer', flexShrink: 0, marginLeft: 12,
                transition: 'all 0.2s',
              }}
            >
              {exportOk ? '✓ EXPORTÉ' : '↓ JSON'}
            </button>
          </div>
        </motion.div>

        {/* ── AMBIANCE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — AMBIANCE —
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: encre, opacity: 0.8, marginBottom: 12 }}>
            Chaque jour, une ambiance est tirée au sort. Vous pouvez en tirer une nouvelle maintenant.
          </div>
          <button
            onClick={() => seance?.retirer()}
            style={{
              ...mono, fontSize: 14,
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
        <div style={{ ...mono, fontSize: 14, color: encre, opacity: 0.9, textAlign: 'center', paddingBottom: 8, lineHeight: 1.6 }}>
          CADAVRE EXQUIS · v1.0<br />
          AUCUN TRACKING · AUCUN COMPTE · TOUT RESTE LOCAL
        </div>

      </div>
    </PageTransition>
  )
}
