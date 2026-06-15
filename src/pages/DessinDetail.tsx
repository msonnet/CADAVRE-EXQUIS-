import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { chargerDessin, supprimerDessin, mettreAJourTitreDessin } from '../db'
import { partagerVideoStory, partagerStory, exporterPDF } from '../utils/partager'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase, uploaderImageGalerie } from '../lib/supabase'
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
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [partageEnCours, setPartageEnCours] = useState(false)
  const [partageOk, setPartageOk] = useState(false)
  const { profile } = useAuth()
  const { jouer } = useSound()

  const c = seance?.colorSchema
  const accent = c?.second ?? '#1d3a8c'
  const encre = c?.encre ?? '#0f0805'
  const fond = c?.bg ?? '#faf8f3'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  useEffect(() => {
    if (!id) return
    chargerDessin(id)
      .then(d => { setDessin(d ?? null); setTitreDraft(d?.titre ?? '') })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [id])

  useEffect(() => {
    if (!pleinEcran) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPleinEcran(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pleinEcran])

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

  async function publierDansGalerie() {
    if (!dessin || publishing) return
    setPublishing(true)
    setPublishError(false)
    try {
      const url = await uploaderImageGalerie(dessin.imageDataUrl, 'dessin')
      if (!url) {
        setPublishError(true)
        setTimeout(() => setPublishError(false), 2000)
        return
      }
      const payload = JSON.stringify({
        texteVision: dessin.texteVision,
        nbBandes: dessin.nbBandes,
      })
      const { error } = await supabase.from('gallery').insert({
        type: 'dessin',
        titre: dessin.titre,
        payload,
        image_url: url,
        author_pseudo: profile?.pseudo ?? 'Anonyme',
        author_avatar: profile?.avatar_url ?? null,
      })
      if (error) throw error
      jouer('soumettre')
      setPublished(true)
      setTimeout(() => setPublished(false), 2000)
    } catch (e) {
      console.error('publish error', e)
      setPublishError(true)
      setTimeout(() => setPublishError(false), 2000)
    } finally {
      setPublishing(false)
    }
  }

  async function partager() {
    if (!dessin || partageEnCours) return
    setPartageEnCours(true)
    const opts = {
      type: 'dessin' as const,
      titre: dessin.titre ?? '',
      texte: dessin.texteVision || undefined,
      imageDataUrl: dessin.imageDataUrl,
      accent, bg: fond, ink: encre,
      date: dessin.dateCreation,
      seed: dessin.id,
    }
    try {
      const ok = await partagerVideoStory(opts, 'cadavre-dessiné')
      if (!ok) await partagerStory(opts, 'cadavre-dessiné')
      setPartageOk(true)
      setTimeout(() => setPartageOk(false), 2200)
    } finally {
      setPartageEnCours(false)
    }
  }

  async function exporterDessinPDF() {
    if (!dessin || pdfBusy) return
    setPdfBusy(true)
    try {
      const titreDessin = dessin.titre ?? (dessin.texteVision ? dessin.texteVision.split('\n')[0].slice(0, 40) : 'Sans titre')
      await exporterPDF({
        type: 'dessin',
        titre: titreDessin,
        texte: dessin.texteVision,
        imageDataUrl: dessin.imageDataUrl,
        bg: fond, ink: encre, accent,
        date: dessin.dateCreation,
      })
    } catch (e) {
      console.error('pdf export failed', e)
    } finally {
      setPdfBusy(false)
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
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, marginTop: 40, textAlign: 'center' }}>
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
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
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
                aria-label="Titre du dessin"
                className="champ-carnet flex-1"
                style={{ borderLeftColor: accent, fontSize: 17 }}
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
              <div className="font-fraunces font-black leading-tight" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.2rem)', color: encre }}>
                {titre}
              </div>
            </button>
          )}
          <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, marginTop: 6 }}>
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
          <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.9, marginTop: 6, textAlign: 'right' }}>
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
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
              — VISION —
            </div>
            <div style={{
              borderLeft: `1.5px solid ${accent}`,
              paddingLeft: 14,
            }}>
              {dessin.texteVision.split('\n').filter(Boolean).map((ligne, i) => (
                <p key={i} style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre,
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
            disabled={partageEnCours}
            style={{
              width: '100%', padding: '0.85em',
              background: 'transparent',
              color: partageOk || partageEnCours ? accent : encre,
              ...mono, fontSize: 17, textTransform: 'uppercase',
              border: `0.5px solid ${partageOk || partageEnCours ? accent : `${encre}25`}`,
              borderRadius: 3,
              cursor: partageEnCours ? 'default' : 'pointer',
              opacity: partageEnCours ? 0.9 : 0.75,
            }}
          >
            {partageEnCours ? '✦ COMPOSITION…' : partageOk ? '✓ PARTAGÉ' : '↗ PARTAGER CE DESSIN'}
          </button>
        </motion.div>

        {/* ── PDF ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.46 }}
        >
          <button
            onClick={exporterDessinPDF}
            disabled={pdfBusy}
            aria-label="Exporter ce dessin en PDF"
            style={{
              width: '100%', padding: '0.85em',
              background: 'transparent', color: encre,
              ...mono, fontSize: 17, textTransform: 'uppercase',
              border: `0.5px solid ${encre}25`,
              borderRadius: 3,
              cursor: pdfBusy ? 'wait' : 'pointer',
              opacity: pdfBusy ? 0.55 : 0.7,
            }}
          >
            {pdfBusy ? '↓ Export…' : '↓ Exporter PDF'}
          </button>
        </motion.div>

        {/* ── PUBLIER DANS LA GALERIE ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.47 }}
        >
          <button
            onClick={publierDansGalerie}
            disabled={publishing || published}
            aria-label="Publier ce dessin dans la galerie"
            style={{
              width: '100%', padding: '0.85em',
              background: 'transparent',
              color: publishError ? accent : (published ? accent : encre),
              ...mono, fontSize: 17, textTransform: 'uppercase',
              border: `0.5px solid ${encre}25`,
              borderRadius: 3,
              cursor: publishing ? 'wait' : (published ? 'default' : 'pointer'),
              opacity: publishing ? 0.55 : (published ? 1 : 0.75),
            }}
          >
            {publishError
              ? 'ERREUR'
              : published
                ? '✓ PUBLIÉ'
                : publishing
                  ? '✦ Publication…'
                  : '✦ Publier dans la galerie'}
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
                  ...mono, fontSize: 17, textTransform: 'uppercase',
                  border: 'none', borderRadius: 3, cursor: 'pointer',
                }}
              >
                Confirmer la suppression
              </button>
              <button
                onClick={() => setConfirmSuppr(false)}
                style={{
                  padding: '0.9em 1.2em',
                  background: 'transparent', color: encre,
                  ...mono, fontSize: 17,
                  border: `0.5px solid ${encre}30`, borderRadius: 3, cursor: 'pointer',
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
                ...mono, fontSize: 17, textTransform: 'uppercase', opacity: 0.7,
                border: `0.5px solid ${encre}20`, borderRadius: 3, cursor: 'pointer',
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
            role="dialog"
            aria-modal="true"
            aria-label="Fermer en touchant"
            tabIndex={0}
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
