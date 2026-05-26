import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { chargerDessin, supprimerDessin, mettreAJourTitreDessin } from '../db'
import { partagerDessinAvecTexte, partagerImage } from '../utils/partager'
import type { DessinCadavre } from '../types'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function DessinDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const seance = useReve()

  const [dessin, setDessin] = useState<DessinCadavre | null>(null)
  const [chargement, setChargement] = useState(true)
  const [pleinEcran, setPleinEcran] = useState(false)
  const [editTitre, setEditTitre] = useState(false)
  const [titreDraft, setTitreDraft] = useState('')
  const [confirmSuppr, setConfirmSuppr] = useState(false)

  const c = seance?.colorSchema
  const accent = c?.second ?? '#1d3a8c'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  useEffect(() => {
    if (!id) return
    chargerDessin(id)
      .then(d => { setDessin(d ?? null); setTitreDraft(d?.titre ?? '') })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [id])

  async function sauvegarderTitre() {
    if (!dessin || !id) return
    const t = titreDraft.trim() || null
    await mettreAJourTitreDessin(id, t ?? '')
    setDessin(prev => prev ? { ...prev, titre: t } : prev)
    setEditTitre(false)
  }

  async function supprimer() {
    if (!id) return
    await supprimerDessin(id)
    navigate('/bibliotheque', { replace: true })
  }

  async function partager() {
    if (!dessin) return
    const nom = dessin.titre ?? 'cadavre-dessiné'
    if (dessin.texteVision) {
      await partagerDessinAvecTexte(dessin.imageDataUrl, dessin.texteVision, nom, accent)
    } else {
      await partagerImage(dessin.imageDataUrl, nom)
    }
  }

  if (chargement) {
    return (
      <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
        <div className="flex justify-center py-24">
          <motion.span style={{ fontSize: 20, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>✦</motion.span>
        </div>
      </PageTransition>
    )
  }

  if (!dessin) {
    return (
      <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
        <div style={{ position: 'relative', zIndex: 10 }}>
          <button onClick={() => navigate(-1)} style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}>← RETOUR</button>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: encre, opacity: 0.75, marginTop: 40, textAlign: 'center' }}>
            Dessin introuvable.
          </p>
        </div>
      </PageTransition>
    )
  }

  const titre = dessin.titre ?? (dessin.texteVision ? dessin.texteVision.split('\n')[0].slice(0, 40) : 'Sans titre')

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="detail" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/bibliotheque')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← RECUEIL
          </button>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — CADAVRE DESSINÉ —
        </div>

        {/* ── TITRE ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 16 }}>
          {editTitre ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus
                value={titreDraft}
                onChange={e => setTitreDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sauvegarderTitre(); if (e.key === 'Escape') setEditTitre(false) }}
                className="champ-carnet flex-1"
                style={{ borderLeftColor: accent, fontSize: 15 }}
                placeholder="Titre du dessin…"
              />
              <button onClick={sauvegarderTitre} style={{ ...mono, fontSize: 13, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>OK</button>
              <button onClick={() => setEditTitre(false)} style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setTitreDraft(dessin.titre ?? ''); setEditTitre(true) }}
              style={{ background: 'none', border: 'none', cursor: 'text', textAlign: 'left', padding: 0 }}
            >
              <div className="font-bodoni font-black italic leading-tight" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.2rem)', color: encre }}>
                {titre}
              </div>
            </button>
          )}
          <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.7, marginTop: 6 }}>
            {dessin.nbBandes} BANDES · {formatDate(dessin.dateCreation).toUpperCase()}
          </p>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 16 }} />

        {/* ── IMAGE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 20 }}
        >
          <button
            onClick={() => setPleinEcran(true)}
            style={{ display: 'block', width: '100%', border: 'none', padding: 0, cursor: 'zoom-in', background: 'transparent' }}
          >
            <img
              src={dessin.imageDataUrl}
              alt={titre}
              style={{ width: '100%', display: 'block', border: `0.5px solid ${encre}15` }}
            />
          </button>
          <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.9, marginTop: 6, textAlign: 'right' }}>
            TOUCHER POUR AGRANDIR
          </div>
        </motion.div>

        {/* ── TEXTE VISION ── */}
        {dessin.texteVision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ marginBottom: 24 }}
          >
            <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
              — VISION —
            </div>
            <div style={{
              borderLeft: `1.5px solid ${accent}`,
              paddingLeft: 14,
            }}>
              {dessin.texteVision.split('\n').filter(Boolean).map((ligne, i) => (
                <p key={i} style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic', fontSize: 15, color: encre,
                  lineHeight: 1.65, marginBottom: 6,
                }}>
                  {ligne}
                </p>
              ))}
            </div>
          </motion.div>
        )}

        <div style={{ flex: 1 }} />

        {/* ── PARTAGER ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <button
            onClick={partager}
            style={{
              width: '100%', padding: '0.85em',
              background: 'transparent', color: encre,
              ...mono, fontSize: 13, textTransform: 'uppercase',
              border: `0.5px solid ${encre}25`, cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            ↗ Partager ce dessin
          </button>
        </motion.div>

        {/* ── SUPPRIMER ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {confirmSuppr ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={supprimer}
                style={{
                  flex: 1, padding: '0.9em',
                  background: '#7B0000', color: '#e8d4b8',
                  ...mono, fontSize: 13, textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Confirmer la suppression
              </button>
              <button
                onClick={() => setConfirmSuppr(false)}
                style={{
                  padding: '0.9em 1.2em',
                  background: 'transparent', color: encre,
                  ...mono, fontSize: 13,
                  border: `0.5px solid ${encre}30`, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmSuppr(true)}
              style={{
                width: '100%', padding: '0.75em',
                background: 'transparent', color: encre,
                ...mono, fontSize: 13, textTransform: 'uppercase', opacity: 0.7,
                border: `0.5px solid ${encre}20`, cursor: 'pointer',
              }}
            >
              Supprimer ce dessin
            </button>
          )}
        </motion.div>

      </div>

      {/* ── PLEIN ÉCRAN ── */}
      <AnimatePresence>
        {pleinEcran && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPleinEcran(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <img
              src={dessin.imageDataUrl}
              alt={titre}
              style={{ maxWidth: '95vw', maxHeight: '95dvh', objectFit: 'contain' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
