import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import type { ConfigDessin } from '../types'

const CONFIG_PAR_DEFAUT: ConfigDessin = {
  nbBandes: 3,
  visibilite: 'raccord',
}

export default function ConfigurationDessin() {
  const navigate = useNavigate()
  const seance = useReve()
  const [config, setConfig] = useState<ConfigDessin>(CONFIG_PAR_DEFAUT)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: 'monospace', letterSpacing: '0.18em' }

  function demarrer() {
    sessionStorage.setItem('config-dessin', JSON.stringify(config))
    sessionStorage.removeItem('dessin-bandes')
    navigate('/jeu-dessin')
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="config-dessin" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 9, color: encre, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ACCUEIL
          </button>
          <span style={{ ...mono, fontSize: 9, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
          — DESSIN —
        </div>

        {/* ── TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginBottom: 24 }}
        >
          <div
            className="font-bodoni font-black italic leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 6 }}
          >
            Cadavre <em style={{ color: accent }}>Dessiné.</em>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: encre, opacity: 0.6 }}>
            Chaque joueur dessine une bande horizontale sans voir le travail des autres.
          </p>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 24 }} />

        {/* ── BANDES & JOUEURS ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 4 }}>
            — BANDES & JOUEURS —
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 12, color: encre, opacity: 0.5, marginBottom: 10 }}>
            Tête · corps · jambes · détail · pied
          </div>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map(n => {
              const active = config.nbBandes === n
              return (
                <button
                  key={n}
                  onClick={() => setConfig(c => ({ ...c, nbBandes: n }))}
                  style={{
                    flex: 1, padding: '10px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 12,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
          <div style={{ ...mono, fontSize: 8, color: encre, opacity: 0.35, marginTop: 8 }}>
            {config.nbBandes} joueur{config.nbBandes > 1 ? 's' : ''} · {config.nbBandes} bande{config.nbBandes > 1 ? 's' : ''}
          </div>
        </motion.div>

        {/* ── VISIBILITÉ ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            — VISIBILITÉ —
          </div>
          <div className="flex gap-2 mb-3">
            {([
              { id: 'aveugle', label: 'AVEUGLE', desc: 'Chaque bande commence dans le vide total.' },
              { id: 'raccord', label: 'RACCORD', desc: 'Un fin raccord du bord précédent guide la jonction.' },
            ] as const).map(v => {
              const active = config.visibilite === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setConfig(c => ({ ...c, visibilite: v.id }))}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 8,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: encre, opacity: 0.5 }}>
            {config.visibilite === 'aveugle'
              ? 'Chaque bande commence dans le vide total.'
              : 'Un fin raccord du bord précédent guide la jonction.'}
          </div>
        </motion.div>

        <div style={{ flex: 1 }} />

        {/* ── NOTE ── */}
        <div style={{ ...mono, fontSize: 7.5, color: encre, opacity: 0.35, marginBottom: 14, lineHeight: 1.6 }}>
          À LA RÉVÉLATION · CLAUDE VISION LIT LE DESSIN<br />
          ET GÉNÈRE UN TEXTE SURRÉALISTE AUTOMATIQUE
        </div>

        {/* ── CTA ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={demarrer}
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: accent, color: '#e8d4b8',
              ...mono, fontSize: 11,
              textTransform: 'uppercase',
              padding: '1.15em 1em',
              border: 'none', cursor: 'pointer',
              gap: 2,
            }}
          >
            <span>Commencer le dessin</span>
            <span aria-hidden style={{ fontSize: 14, opacity: 0.85 }}>→</span>
          </button>
        </motion.div>

      </div>
    </PageTransition>
  )
}
