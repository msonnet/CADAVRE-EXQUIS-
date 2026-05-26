import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import type { ConfigDessin } from '../types'

const CONFIG_PAR_DEFAUT: ConfigDessin = {
  nbBandes: 3,
  joueurs: 2,
  visibilite: 'raccord',
}

// Références historiques au cadavre exquis dessiné
const REFS = [
  { titre: 'Le cadavre exquis boira le vin nouveau', auteurs: 'Breton, Éluard, Morise, Man Ray', annee: '1925' },
  { titre: 'Premier cadavre dessiné collectif', auteurs: 'André Breton et ses amis', annee: '1927' },
  { titre: 'Exquisite Corpse (Drawing)', auteurs: 'Yves Tanguy, Joan Miró, Max Morise, Man Ray', annee: '1928' },
]

export default function ConfigurationDessin() {
  const navigate = useNavigate()
  const seance = useReve()
  const [config, setConfig] = useState<ConfigDessin>(CONFIG_PAR_DEFAUT)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const ref = REFS[(seance?.seed ?? 0) % REFS.length]
  const totalBandes = config.nbBandes
  const joueurs = config.joueurs
  const cycleNote = joueurs < totalBandes
    ? `les ${joueurs} joueurs se partagent ${totalBandes} bandes — certains dessinent deux fois`
    : joueurs === totalBandes
      ? `${joueurs} joueur${joueurs > 1 ? 's' : ''} · ${totalBandes} bande${totalBandes > 1 ? 's' : ''}`
      : `${joueurs} joueurs se partagent ${totalBandes} bandes`

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
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ACCUEIL
          </button>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 22, marginBottom: 8 }}>
          — CADAVRE DESSINÉ —
        </div>

        {/* ── TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginBottom: 20 }}
        >
          <div
            className="font-bodoni font-black italic leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 8vw, 2.5rem)', color: encre, marginBottom: 6 }}
          >
            Préparer le <em style={{ color: accent }}>rituel.</em>
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 20 }} />

        {/* ── BANDES ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ marginBottom: 18 }}>
          <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>
            — FRAGMENTS —
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: encre, opacity: 0.8, marginBottom: 8 }}>
            Nombre de bandes horizontales à dessiner
          </div>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map(n => {
              const active = config.nbBandes === n
              const labels = ['', '', 'tête · corps', 'tête · corps · jambes', 'tête · corps · taille · jambes', 'tête · buste · ventre · hanches · jambes']
              return (
                <button
                  key={n}
                  onClick={() => setConfig(c => ({ ...c, nbBandes: n }))}
                  style={{
                    flex: 1, padding: '10px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: active ? `${accent}08` : 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── JOUEURS ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} style={{ marginBottom: 18 }}>
          <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>
            — JOUEURS —
          </div>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(n => {
              const active = config.joueurs === n
              return (
                <button
                  key={n}
                  onClick={() => setConfig(c => ({ ...c, joueurs: n }))}
                  style={{
                    flex: 1, padding: '10px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: active ? `${accent}08` : 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: encre, opacity: 0.8 }}>
            {cycleNote}
          </div>
        </motion.div>

        {/* ── VISIBILITÉ ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginBottom: 20 }}>
          <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>
            — VISIBILITÉ —
          </div>
          <div className="flex gap-2 mb-2">
            {([
              { id: 'aveugle', label: 'AVEUGLE' },
              { id: 'raccord', label: 'RACCORD' },
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
                    background: active ? `${accent}08` : 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 12,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: encre, opacity: 0.8 }}>
            {config.visibilite === 'aveugle'
              ? 'Chaque bande commence dans l\'obscurité totale.'
              : 'Un raccord révèle la lisière du fragment précédent.'}
          </div>
        </motion.div>

        {/* ── CITATION HISTORIQUE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{
            borderLeft: `1.5px solid ${accent}`,
            paddingLeft: 12,
            marginBottom: 20,
            opacity: 0.65,
          }}
        >
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontSize: 13, lineHeight: 1.5,
            color: encre, marginBottom: 4,
          }}>
            « {ref.titre} »
          </div>
          <div style={{ ...mono, fontSize: 12, color: accent, letterSpacing: '0.14em' }}>
            {ref.auteurs.toUpperCase()} · {ref.annee}
          </div>
        </motion.div>

        <div style={{ flex: 1 }} />

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
              ...mono, fontSize: 13, textTransform: 'uppercase',
              padding: '1.15em 1em', border: 'none', cursor: 'pointer', gap: 2,
            }}
          >
            <span>Commencer le dessin</span>
            <span aria-hidden style={{ fontSize: 14, opacity: 0.85 }}>✎</span>
          </button>
        </motion.div>

      </div>
    </PageTransition>
  )
}
