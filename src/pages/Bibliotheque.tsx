import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { chargerPoemes, chargerDessins } from '../db'
import { Decor, useReve } from '../reve'
import type { Poeme, DessinCadavre } from '../types'

const NOMS_STRUCTURES: Record<string, string> = {
  'phrase-simple':    'Phrase courte',
  'phrase-etoffee':   'Phrase étoffée',
  'vers-libre':       'Vers libre',
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function extraitPoeme(poeme: Poeme): string {
  const premier = poeme.cases[0]?.texte ?? ''
  return premier.length > 60 ? premier.slice(0, 57) + '…' : premier
}

function normaliser(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function Bibliotheque() {
  const navigate = useNavigate()
  const seance = useReve()
  const [poemes, setPoemes] = useState<Poeme[]>([])
  const [dessins, setDessins] = useState<DessinCadavre[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: 'monospace', letterSpacing: '0.18em' }

  useEffect(() => {
    Promise.all([chargerPoemes(), chargerDessins()])
      .then(([p, d]) => { setPoemes(p); setDessins(d) })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [])

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

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
        <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — LE RECUEIL —
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="font-bodoni font-black italic leading-tight mb-1"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            Mes <em style={{ color: accent }}>poèmes.</em>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontSize: 13, color: encre, opacity: 0.55, marginBottom: 18,
          }}>
            Ta bibliothèque personnelle
          </p>
        </motion.div>

        {/* ── RECHERCHE ── */}
        {!chargement && poemes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <input
              type="search"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher…"
              className="champ-carnet w-full"
              style={{ borderLeftColor: accent, fontSize: 13 }}
            />
          </div>
        )}

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 4 }} />

        {/* ── CHARGEMENT ── */}
        {chargement && (
          <div className="flex justify-center py-16">
            <motion.span
              style={{ fontSize: 20, color: accent }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >✦</motion.span>
          </div>
        )}

        {/* ── VIDE ── */}
        {!chargement && poemes.length === 0 && (
          <motion.div
            className="flex flex-col items-center py-14"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontSize: 15, color: encre, opacity: 0.4, textAlign: 'center',
            }}>
              Aucun poème pour l'instant.
            </p>
            <motion.button
              onClick={() => navigate('/config')}
              whileTap={{ scale: 0.98 }}
              style={{
                marginTop: 28, background: accent, color: '#e8d4b8',
                ...mono, fontSize: 11, textTransform: 'uppercase',
                padding: '0.9em 1.6em', border: 'none', cursor: 'pointer',
              }}
            >
              Première partie →
            </motion.button>
          </motion.div>
        )}

        {/* ── LISTE ── */}
        {!chargement && poemes.length > 0 && (() => {
          const termes = normaliser(recherche).split(/\s+/).filter(Boolean)
          const poemesFiltres = termes.length
            ? poemes.filter(p => {
                const hay = normaliser([p.titre ?? '', ...p.cases.map(c => c.texte), NOMS_STRUCTURES[p.structureId] ?? ''].join(' '))
                return termes.every(t => hay.includes(t))
              })
            : poemes

          return (
            <AnimatePresence>
              <div>
                {termes.length > 0 && (
                  <p style={{ ...mono, fontSize: 7.5, color: encre, opacity: 0.4, marginBottom: 8 }}>
                    {poemesFiltres.length} RÉSULTAT{poemesFiltres.length !== 1 ? 'S' : ''}
                  </p>
                )}
                {poemesFiltres.length === 0 && (
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic', fontSize: 15, color: encre, opacity: 0.4,
                    textAlign: 'center', padding: '40px 0',
                  }}>
                    Aucun poème trouvé.
                  </p>
                )}
                {poemesFiltres.map((poeme, i) => (
                  <motion.button
                    key={poeme.id}
                    onClick={() => navigate(`/bibliotheque/${poeme.id}`)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '13px 0 13px 12px',
                      borderBottom: `0.5px solid ${encre}12`,
                      borderLeft: `2px solid transparent`,
                      background: 'transparent', cursor: 'pointer',
                      transition: 'border-left-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderLeftColor = accent)}
                    onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'transparent')}
                  >
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: 'italic', color: encre, fontSize: 16,
                      lineHeight: 1.3, marginBottom: 3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {poeme.titre ?? extraitPoeme(poeme) ?? 'Sans titre'}
                    </p>
                    <p style={{ ...mono, fontSize: 7.5, color: encre, opacity: 0.4 }}>
                      {(NOMS_STRUCTURES[poeme.structureId] ?? poeme.structureId).toUpperCase()}
                      {' · '}{poeme.cases.length} voix
                      {' · '}{formatDate(poeme.dateCreation).toUpperCase()}
                    </p>
                  </motion.button>
                ))}
              </div>
            </AnimatePresence>
          )
        })()}

        {/* ── DESSINS ── */}
        {!chargement && dessins.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 16 }}
          >
            <div style={{ ...mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12, marginTop: 8 }}>
              — CADAVRES DESSINÉS —
            </div>
            {dessins.map((dessin, i) => (
              <motion.button
                key={dessin.id}
                onClick={() => navigate(`/bibliotheque/dessin/${dessin.id}`)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0 10px 12px', width: '100%', textAlign: 'left',
                  borderBottom: `0.5px solid ${encre}12`,
                  borderLeft: `2px solid transparent`,
                  background: 'transparent', cursor: 'pointer',
                  transition: 'border-left-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderLeftColor = accent)}
                onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'transparent')}
              >
                {/* Miniature */}
                <div style={{ width: 44, height: 56, flexShrink: 0, border: `0.5px solid ${encre}20`, overflow: 'hidden', background: '#fff' }}>
                  <img
                    src={dessin.imageDataUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  />
                </div>
                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: encre, fontSize: 15, lineHeight: 1.3, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dessin.titre ?? (dessin.texteVision ? dessin.texteVision.split('\n')[0].slice(0, 40) : 'Sans titre')}
                  </p>
                  <p style={{ ...mono, fontSize: 7.5, color: encre, opacity: 0.4 }}>
                    {dessin.nbBandes} BANDES · {formatDate(dessin.dateCreation).toUpperCase()}
                  </p>
                  {dessin.texteVision && (
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 11.5, color: encre, opacity: 0.55, marginTop: 3, lineHeight: 1.4 }}>
                      {dessin.texteVision.split('\n')[0]}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        <div style={{ flex: 1 }} />

        {/* ── CTA ── */}
        {!chargement && (
          <motion.div
            className="mt-6 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
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
              <span>Nouvelle partie</span>
              <span aria-hidden style={{ fontSize: 14, opacity: 0.85 }}>→</span>
            </button>
          </motion.div>
        )}

      </div>
    </PageTransition>
  )
}
