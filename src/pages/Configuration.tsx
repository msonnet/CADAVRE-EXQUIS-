import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { useSound } from '../hooks/useSound'
import { Decor, useReve } from '../reve'
import type { ConfigPartie, StructureId, Visibilite } from '../types'

const STRUCTURES: { id: StructureId; romain: string; label: string; description: string; detail: string }[] = [
  { id: 'phrase-simple',  romain: 'I',   label: 'Phrase courte',  description: '3 cases · sujet, verbe, complément', detail: 'La forme la plus directe — une phrase surréaliste en trois fragments.' },
  { id: 'phrase-etoffee', romain: 'II',  label: 'Phrase étoffée', description: '7 cases · la canonique de Breton',  detail: 'La structure originale inventée en 1925 : article + adjectif + nom + verbe + article + adjectif + nom.' },
  { id: 'vers-libre',     romain: 'III', label: 'Vers libre',     description: '4 à 12 vers · sans contrainte',     detail: 'Chaque joueur écrit un vers entier. Le poème s\'assemble sans règle grammaticale.' },
]

const VISIBILITE_DESC: Record<string, string> = {
  aveugle:        'Chaque joueur écrit sans voir ce que les autres ont produit.',
  'dernier-mot':  'Le dernier mot de la case précédente est visible — un seul indice.',
  'derniere-case':'La case entière précédente est révélée avant d\'écrire.',
}

const CONFIG_PAR_DEFAUT: ConfigPartie = {
  structureId: 'phrase-etoffee',
  visibilite: 'aveugle',
  premierJoueur: 'ia',
  mode: 'standard',
  joueursHumains: 1,
  voixIA: 1,
}

export default function Configuration() {
  const navigate = useNavigate()
  const { jouer } = useSound()
  const seance = useReve()
  const [config, setConfig] = useState<ConfigPartie>(CONFIG_PAR_DEFAUT)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  function demarrer() {
    jouer('demarrage')
    sessionStorage.setItem('config-partie', JSON.stringify(config))
    navigate('/jeu')
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="config" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 15, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← SORTIR
          </button>
          <span style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── SECTION LABEL ── */}
        <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
          — PRÉPARATIFS —
        </div>

        {/* ── TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div
            className="font-bodoni font-black leading-tight mb-1"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            Choisir la{' '}
            <span style={{ color: accent }}>structure.</span>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
            color: encre, opacity: 0.75, marginBottom: 20,
          }}>
            La structure détermine la forme du cadavre exquis.
          </p>
        </motion.div>

        {/* ── STRUCTURE CARDS ── */}
        <div className="flex flex-col gap-2 mb-8">
          {STRUCTURES.map((s, i) => {
            const active = config.structureId === s.id
            return (
              <motion.button
                key={s.id}
                onClick={() => setConfig(prev => ({ ...prev, structureId: s.id }))}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 14px',
                  background: active ? `${accent}12` : 'transparent',
                  border: `0.5px solid ${active ? accent : `${encre}20`}`,
                  borderLeft: `3px solid ${active ? accent : 'transparent'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, minWidth: 26, paddingTop: 2 }}>
                  {s.romain}.
                </span>
                <div>
                  <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 17, color: encre, marginBottom: 3 }}>
                    {s.label}
                  </div>
                  <div style={{ ...mono, fontSize: 14, color: encre, opacity: 0.60, marginBottom: active ? 5 : 0 }}>{s.description}</div>
                  {active && (
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: encre, opacity: 0.80, lineHeight: 1.55 }}>
                      {s.detail}
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* ── VISIBILITÉ ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
            — VISIBILITÉ —
          </div>
          <div className="flex gap-2 mb-2">
            {(['aveugle', 'dernier-mot', 'derniere-case'] as Visibilite[]).map(v => {
              const active = config.visibilite === v
              return (
                <button
                  key={v}
                  onClick={() => setConfig(c => ({ ...c, visibilite: v }))}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 15,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {v === 'aveugle' ? 'AVEUGLE' : v === 'dernier-mot' ? 'UN MOT' : 'UNE CASE'}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: encre, opacity: 0.80, lineHeight: 1.55 }}>
            {VISIBILITE_DESC[config.visibilite]}
          </div>
        </div>

        {/* ── JOUEURS ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
            — JOUEURS —
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(n => {
              const active = config.joueursHumains === n
              return (
                <button
                  key={n}
                  onClick={() => setConfig(c => ({ ...c, joueursHumains: n }))}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 15,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── VOIX IA ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
            — VOIX IA —
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map(n => {
              const active = config.voixIA === n
              return (
                <button
                  key={n}
                  onClick={() => setConfig(c => ({ ...c, voixIA: n }))}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 15,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n === 0 ? '—' : n}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── PREMIER JOUEUR ── */}
        {config.voixIA > 0 && config.joueursHumains === 1 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
              — OUVRE LA SÉANCE —
            </div>
            <div className="flex gap-2">
              {(['ia', 'humain'] as const).map(p => {
                const active = config.premierJoueur === p
                return (
                  <button
                    key={p}
                    onClick={() => setConfig(c => ({ ...c, premierJoueur: p }))}
                    style={{
                      flex: 1, padding: '8px 4px',
                      border: `0.5px solid ${active ? accent : `${encre}20`}`,
                      borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                      background: 'transparent', cursor: 'pointer',
                      ...mono, fontSize: 15,
                      color: active ? accent : `${encre}80`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {p === 'ia' ? 'VOIX IA' : 'JOUEUR'}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MODE ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
            — MODE —
          </div>
          <div className="flex gap-2">
            {(['standard', 'hypnotique'] as const).map(m => {
              const active = config.mode === m
              return (
                <button
                  key={m}
                  onClick={() => setConfig(c => ({ ...c, mode: m }))}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 15,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'standard' ? 'STANDARD' : 'HYPNOTIQUE'}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* ── CTA ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={demarrer}
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: accent, color: btnText,
              ...mono, fontSize: 15,
              textTransform: 'uppercase',
              padding: '1.15em 1em',
              border: 'none', cursor: 'pointer',
              gap: 2,
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
