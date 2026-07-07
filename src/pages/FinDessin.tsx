import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import RevealDessin from '../components/RevealDessin'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { sauvegarderDessin } from '../db'
import { partagerStory, partagerVideoStory } from '../utils/partager'
import { fetchAvecTimeout } from '../utils/fetchAvecTimeout'
import { vibrer } from '../utils/haptics'
import type { BandeDessin, DessinCadavre } from '../types'

const RACCORD_H = 80
const CANVAS_BG = '#fdf8f2'

async function assemblerDessin(bandes: BandeDessin[]): Promise<string> {
  if (bandes.length === 0) return ''
  const w = bandes[0].width
  const dpr = bandes[0].dpr ?? 1
  const RACCORD_H_phys = RACCORD_H * dpr

  // Calculer la hauteur utile de chaque bande (contenu dessiné + marge)
  const MARGE_phys = 24 * dpr
  const lowestYs = bandes.map(b => Math.min(
    Math.ceil(b.lowestDrawnFraction * b.height) + MARGE_phys,
    b.height,
  ))
  // S'assurer que la bande 0 vaut au moins RACCORD_H pour que les suivantes aient quelque chose à chevaucher
  lowestYs[0] = Math.max(lowestYs[0], RACCORD_H_phys + MARGE_phys)

  // Hauteur totale : bande 0 pleine + chaque bande suivante moins le recouvrement RACCORD_H
  const totalH = lowestYs[0] + lowestYs.slice(1).reduce((s, y) => s + Math.max(y - RACCORD_H_phys, MARGE_phys), 0)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = totalH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, w, totalH)

  let assembledY = 0
  for (let i = 0; i < bandes.length; i++) {
    const bande = bandes[i]
    const cropH = lowestYs[i]
    await new Promise<void>(res => {
      const img = new Image()
      img.onload = () => {
        const drawY = i === 0 ? 0 : assembledY - RACCORD_H_phys
        // Dessiner les cropH premiers pixels de la bande à la position drawY
        ctx.drawImage(img, 0, 0, bande.width, cropH, 0, drawY, w, cropH)
        assembledY = i === 0 ? cropH : drawY + cropH
        res()
      }
      img.src = bande.imageDataUrl
    })
  }

  return canvas.toDataURL('image/png')
}

async function interpreterDessin(imageDataUrl: string): Promise<string> {
  const base64 = imageDataUrl.split(',')[1]
  if (!base64) return ''
  try {
    const res = await fetchAvecTimeout('/api/interpreter-dessin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    }, 20_000)
    if (!res.ok) return ''
    const data = await res.json()
    return data.texte ?? ''
  } catch {
    return ''
  }
}

type Phase = 'assemblage' | 'vision' | 'revele' | 'sauvegarde'

export default function FinDessin() {
  const navigate = useNavigate()
  const seance = useReve()
  const [phase, setPhase] = useState<Phase>('assemblage')
  const [imageAssemblee, setImageAssemblee] = useState<string>('')
  const [texteVision, setTexteVision] = useState<string>('')
  const [pleinEcran, setPleinEcran] = useState(false)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [partageEnCours, setPartageEnCours] = useState(false)
  const [nbBandes, setNbBandes] = useState(0)
  const [erreurVision, setErreurVision] = useState(false)
  const [revealJoue, setRevealJoue] = useState(false)
  const escListener = useRef<((e: KeyboardEvent) => void) | null>(null)
  const { jouer } = useSound()
  const revelationPlayedRef = useRef(false)

  const c = seance?.colorSchema
  const accent = c?.second ?? '#1d3a8c'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  useEffect(() => {
    let cancelled = false
    async function run() {
      const raw = sessionStorage.getItem('dessin-bandes')
      if (!raw) { navigate('/config-dessin'); return }
      let bandes: BandeDessin[]
      try {
        bandes = JSON.parse(raw)
        if (!Array.isArray(bandes) || bandes.length === 0) throw new Error('bandes vides')
      } catch {
        navigate('/config-dessin')
        return
      }
      setNbBandes(bandes.length)

      setPhase('assemblage')
      const img = await assemblerDessin(bandes)
      if (cancelled) return
      setImageAssemblee(img)

      setPhase('vision')
      const texte = await interpreterDessin(img)
      if (cancelled) return
      if (!texte) setErreurVision(true)
      setTexteVision(texte)
      setPhase('revele')
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Escape pour fermer plein écran
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPleinEcran(false) }
    escListener.current = handler
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Jouer le son de révélation la première fois que le dessin assemblé apparaît
  useEffect(() => {
    if (phase === 'revele' && !revelationPlayedRef.current) {
      revelationPlayedRef.current = true
      jouer('revelation')
      vibrer('devoilement')
    }
  }, [phase, jouer])

  async function reessayerVision() {
    if (!imageAssemblee) return
    setErreurVision(false)
    const texte = await interpreterDessin(imageAssemblee)
    if (texte) setTexteVision(texte)
    else setErreurVision(true)
  }

  async function partager() {
    if (!imageAssemblee || partageEnCours) return
    setPartageEnCours(true)
    const opts = {
      type: 'dessin' as const,
      titre: '',
      texte: texteVision,
      imageDataUrl: imageAssemblee,
      accent, bg, ink: encre,
      date: Date.now(),
      seed: texteVision || 'dessin',
    }
    try {
      const ok = await partagerVideoStory(opts, 'cadavre-dessiné')
      if (!ok) await partagerStory(opts, 'cadavre-dessiné')
    } finally {
      setPartageEnCours(false)
    }
  }

  async function sauvegarder() {
    if (!imageAssemblee) return
    const id = `dessin-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const dessin: DessinCadavre = {
      id,
      titre: null,
      nbBandes,
      imageDataUrl: imageAssemblee,
      texteVision: texteVision || undefined,
      dateCreation: Date.now(),
      dateModification: Date.now(),
    }
    await sauvegarderDessin(dessin)
    setSauvegarde(true)
    setPhase('sauvegarde')
    setTimeout(() => navigate('/'), 1800)
  }

  const phaseLabel = {
    assemblage: 'Assemblage du dessin…',
    vision: 'Le cadavre se reconstitue…',
    revele: '',
    sauvegarde: 'Sauvegardé.',
  }[phase]

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="fin-dessin" />

      {/* ── RÉVÉLATION PLEIN ÉCRAN — la même animation que la vidéo partagée ── */}
      <AnimatePresence>
        {(phase === 'revele' || phase === 'sauvegarde') && imageAssemblee && !revealJoue && (
          <RevealDessin
            imageUrl={imageAssemblee}
            texte={texteVision || null}
            accent={accent}
            encre={encre}
            bg={bg}
            onTermine={() => setRevealJoue(true)}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ACCUEIL
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — RÉVÉLATION —
        </div>

        {/* ── TITRE ── */}
        <div className="font-fraunces font-black leading-tight" style={{ fontSize: 'clamp(1.7rem, 7vw, 2.4rem)', color: encre, marginBottom: 20 }}>
          Le cadavre <span style={{ color: accent }}>dessiné.</span>
        </div>

        {/* ── PHASES DE CHARGEMENT ── */}
        {phase !== 'revele' && phase !== 'sauvegarde' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flex: 1, justifyContent: 'center', textAlign: 'center' }}
          >
            <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.28em', marginBottom: 20, opacity: 0.8 }}>
                — {nbBandes} BANDE{nbBandes > 1 ? 'S' : ''} —
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 'clamp(1.5rem, 7vw, 2.2rem)', color: encre, lineHeight: 1.3 }}>
                Le cadavre
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 'clamp(1.5rem, 7vw, 2.2rem)', color: encre, lineHeight: 1.3, marginBottom: 20 }}>
                se reconstitue<motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}>…</motion.span>
              </div>
              <motion.div
                style={{ fontSize: 18, color: accent }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                ✦
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── RÉVÉLÉ ── */}
        {(phase === 'revele' || phase === 'sauvegarde') && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Dessin assemblé */}
            {imageAssemblee && (
              <div>
                <button
                  onClick={() => setPleinEcran(true)}
                  aria-label="Agrandir le dessin en plein écran"
                  style={{
                    display: 'block', width: '100%',
                    padding: 0, border: `0.5px solid ${encre}20`,
                    background: 'none', cursor: 'zoom-in', borderRadius: 3,
                  }}
                >
                  <motion.img
                    src={imageAssemblee}
                    alt="Cadavre exquis dessiné"
                    initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0.5 }}
                    animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
                    transition={{ duration: 2, ease: [0.3, 0, 0.2, 1] }}
                    style={{ display: 'block', width: '100%', maxHeight: '45vh', objectFit: 'contain' }}
                  />
                </button>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => setPleinEcran(true)}
                    style={{ ...mono, fontSize: 13, color: `${encre}50`, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    ↗ AGRANDIR
                  </button>
                </div>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12 }} />

            {/* Texte Vision */}
            {texteVision ? (
              <div>
                <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
                  — LECTURE SURRÉALISTE —
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 18, lineHeight: 1.7,
                  color: encre,
                  whiteSpace: 'pre-line',
                }}>
                  {texteVision}
                </div>
              </div>
            ) : erreurVision ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.8 }}>
                  La lecture surréaliste n'a pas pu avoir lieu.
                </div>
                <button
                  onClick={reessayerVision}
                  style={{
                    alignSelf: 'flex-start',
                    ...mono, fontSize: 13,
                    background: 'transparent', color: accent,
                    border: `0.5px solid ${accent}50`,
                    borderRadius: 3,
                    padding: '7px 14px', cursor: 'pointer',
                  }}
                >
                  ↺ RÉESSAYER
                </button>
              </div>
            ) : (
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75 }}>
                (lecture indisponible)
              </div>
            )}

            <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.10 }} />

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={sauvegarder}
                disabled={sauvegarde}
                style={{
                  width: '100%',
                  ...mono, fontSize: 17,
                  background: sauvegarde ? `${accent}20` : accent,
                  color: sauvegarde ? accent : btnText,
                  border: `0.5px solid ${accent}`,
                  borderRadius: 3,
                  padding: '10px 8px',
                  cursor: sauvegarde ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {sauvegarde ? '✓ SAUVEGARDÉ' : '↓ SAUVEGARDER'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={partager}
                  disabled={partageEnCours}
                  style={{
                    flex: 1,
                    ...mono, fontSize: 13,
                    background: 'transparent',
                    color: partageEnCours ? accent : `${encre}70`,
                    border: `0.5px solid ${partageEnCours ? accent : `${encre}25`}`,
                    borderRadius: 3,
                    padding: '10px 8px',
                    cursor: partageEnCours ? 'default' : 'pointer',
                  }}
                >
                  {partageEnCours ? '✦ COMPOSITION…' : '↗ PARTAGER'}
                </button>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    flex: 1,
                    ...mono, fontSize: 13,
                    background: 'transparent',
                    color: `${encre}70`,
                    border: `0.5px solid ${encre}25`,
                    borderRadius: 3,
                    padding: '10px 8px',
                    cursor: 'pointer',
                  }}
                >
                  ← ACCUEIL
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div style={{ flex: 1 }} />
      </div>

      {/* ── PLEIN ÉCRAN ── */}
      <AnimatePresence>
        {pleinEcran && imageAssemblee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setPleinEcran(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Dessin en plein écran"
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(15,8,5,0.94)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <img
              src={imageAssemblee}
              alt="Cadavre exquis dessiné — plein écran"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setPleinEcran(false)}
              aria-label="Fermer le plein écran"
              style={{
                position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: 'max(16px, env(safe-area-inset-right))',
                background: 'none', border: `0.5px solid rgba(232,212,184,0.4)`,
                borderRadius: 3,
                color: '#e8d4b8',
                ...mono, fontSize: 13, padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              ✕ FERMER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </PageTransition>
  )
}
