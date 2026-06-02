import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase, uploaderImageGalerie } from '../lib/supabase'
import { getStructure, reconstruirePoeme } from '../structures'
import { corrigerAccords } from '../api/corriger'
import { genererIllustration } from '../api/illustration'
import { partagerTexte, partagerImage, partagerDessinAvecTexte, partagerImageDistante } from '../utils/partager'
import { sauvegarderDessin } from '../db'
import type { DessinCadavre } from '../types'

type Room = { code: string; host_id: string | null; mode: string; structure_id: string; nb_joueurs: number; status: string; turn_seconds: number | null }
type RoomPlayer = { player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null }
type Contribution = { case_index: number; texte: string; player_id: string }
type BandeData = { imageDataUrl: string; lowestDrawnFraction: number; width: number; height: number; dpr: number }

const RACCORD_H = 80
const CANVAS_BG = '#fdf8f2'

async function assemblerDessin(bandes: BandeData[]): Promise<string> {
  if (bandes.length === 0) return ''
  const w = bandes[0].width
  const dpr = bandes[0].dpr ?? 1
  const RACCORD_H_phys = RACCORD_H * dpr
  const MARGE_phys = 24 * dpr

  const lowestYs = bandes.map(b => Math.min(
    Math.ceil(b.lowestDrawnFraction * b.height) + MARGE_phys,
    b.height,
  ))
  lowestYs[0] = Math.max(lowestYs[0], RACCORD_H_phys + MARGE_phys)

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
    const res = await fetch('/api/interpreter-dessin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.texte ?? ''
  } catch { return '' }
}

const STYLES = [
  { id: 'aquarelle', label: 'Aquarelle' },
  { id: 'fusain', label: 'Fusain' },
  { id: 'huile', label: 'Huile' },
  { id: 'encre', label: 'Encre' },
  { id: 'collage_surrealiste', label: 'Collage' },
  { id: 'hyperrealisme', label: 'Hyperréalisme' },
  { id: 'libre', label: 'Libre' },
]

export default function FinOnline() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  const { user, profile, loading: authLoading } = useAuth()
  const { jouer } = useSound()
  const revelationPlayedRef = useRef(false)

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])

  // Écrit mode
  const [texteCorrige, setTexteCorrige] = useState<string | null>(null)
  const [texteAssemble, setTexteAssemble] = useState<string>('')
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null)
  const [styleChoisi, setStyleChoisi] = useState<string | null>(null)
  const [generatingIllus, setGeneratingIllus] = useState(false)
  const [erreurIllus, setErreurIllus] = useState<string | null>(null)
  const [showCoutures, setShowCoutures] = useState(false)
  const [pleinEcranIllus, setPleinEcranIllus] = useState(false)

  // Dessin mode
  const [imageAssemblee, setImageAssemblee] = useState<string>('')
  const [texteVision, setTexteVision] = useState<string>('')
  const [loadingDessin, setLoadingDessin] = useState(false)
  const [erreurVision, setErreurVision] = useState(false)
  const [pleinEcranDessin, setPleinEcranDessin] = useState(false)
  const [sauvegardeDessin_, setSauvegardeDessin] = useState(false)

  const [revealReady, setRevealReady] = useState(false)
  const [publishingGallery, setPublishingGallery] = useState(false)
  const [publishedGallery, setPublishedGallery] = useState(false)

  const load = useCallback(async () => {
    if (!code || !user) return
    const { data: r } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (!r) { navigate('/online'); return }
    setRoom(r)

    const { data: ps } = await supabase.from('room_players').select('*').eq('room_code', code).order('order_index')
    setPlayers((ps ?? []) as RoomPlayer[])

    const { data: cs } = await supabase.from('contributions').select('*').eq('room_code', code).order('case_index')
    const cList = (cs ?? []) as Contribution[]
    setContributions(cList)

    if (r.mode === 'ecrit' && cList.length > 0) {
      const structure = getStructure(r.structure_id)
      const caseMap = new Map(cList.map(c => [c.case_index, c.texte]))
      const fakeCases = structure.cases.map((def, i) => ({
        numero: i + 1, fonction: def.fonction, consigne: def.consigne,
        auteur: 'humain' as const, texte: caseMap.get(i) ?? '', ts: Date.now(),
      }))
      const brut = reconstruirePoeme(fakeCases, structure)
      setTexteAssemble(brut)
      let cancelled = false
      const blocs = structure.cases.map((def, i) => ({
        texte: caseMap.get(i) ?? '',
        type: def.type,
      }))
      corrigerAccords(brut, r.structure_id, blocs).then(t => { if (!cancelled) setTexteCorrige(t) })
      return () => { cancelled = true }
    }

    if (r.mode === 'dessin' && cList.length > 0) {
      setLoadingDessin(true)
      const bandes: BandeData[] = cList
        .sort((a, b) => a.case_index - b.case_index)
        .map(c => {
          try { return JSON.parse(c.texte) as BandeData }
          catch { return { imageDataUrl: c.texte, lowestDrawnFraction: 0.9, width: 600, height: 400, dpr: 1 } }
        })
      const img = await assemblerDessin(bandes)
      setImageAssemblee(img)
      const texte = await interpreterDessin(img)
      if (!texte) setErreurVision(true)
      setTexteVision(texte)
      setLoadingDessin(false)
    }
  }, [code, user, navigate])

  useEffect(() => {
    if (!authLoading && !user) { navigate('/online'); return }
    if (!authLoading && user) load()
  }, [authLoading, user, load])

  // Subscribe to "rejouer" broadcast
  useEffect(() => {
    if (!code) return
    const channel = supabase.channel(`fin-online-${code}`)
      .on('broadcast', { event: 'rejouer' }, (payload) => {
        const newCode = payload.payload?.newCode as string | undefined
        if (newCode) navigate(`/salon/${newCode}`)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [code, navigate])

  useEffect(() => {
    if (revelationPlayedRef.current) return
    revelationPlayedRef.current = true
    jouer('revelation')
  }, [jouer])

  useEffect(() => {
    const t = setTimeout(() => setRevealReady(true), 3000)
    return () => clearTimeout(t)
  }, [])

  // Close fullscreen on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPleinEcranDessin(false); setPleinEcranIllus(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function publierDansGalerieEcrit() {
    if (!room || !user || publishingGallery || !texteAssemble) return
    setPublishingGallery(true)
    try {
      const sortedContribs = [...contributions].sort((a, b) => a.case_index - b.case_index)
      const cases = sortedContribs.map(c => ({ texte: c.texte }))
      const payload = JSON.stringify({ cases, structureId: room.structure_id, titre: null })
      const pseudo = profile?.pseudo ?? players.find(p => p.player_id === user.id)?.pseudo ?? 'Anonyme'
      const { error } = await supabase.from('gallery').insert({
        type: 'poeme', titre: null, payload,
        image_url: illustrationUrl ?? null,
        author_pseudo: pseudo, author_avatar: null,
      })
      if (!error) { setPublishedGallery(true); jouer('soumettre') }
    } catch { /* ignore */ }
    setPublishingGallery(false)
  }

  async function publierDansGalerieDessin() {
    if (!room || !user || publishingGallery || !imageAssemblee) return
    setPublishingGallery(true)
    try {
      const url = await uploaderImageGalerie(imageAssemblee, 'dessin-online')
      if (!url) { setPublishingGallery(false); return }
      const payload = JSON.stringify({ texteVision: texteVision || null, nbBandes: contributions.length })
      const pseudo = profile?.pseudo ?? players.find(p => p.player_id === user.id)?.pseudo ?? 'Anonyme'
      const { error } = await supabase.from('gallery').insert({
        type: 'dessin', titre: null, payload, image_url: url,
        author_pseudo: pseudo, author_avatar: null,
      })
      if (!error) { setPublishedGallery(true); jouer('soumettre') }
    } catch { /* ignore */ }
    setPublishingGallery(false)
  }

  async function rejouerEnsemble() {
    if (!room || !user || !code) return
    const newCode = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]).join('')
    const { error } = await supabase.from('rooms').insert({
      code: newCode, host_id: user.id, mode: room.mode, structure_id: room.structure_id,
      nb_joueurs: room.nb_joueurs, turn_seconds: room.turn_seconds, status: 'waiting',
    })
    if (error) { console.error('Erreur rejouer:', error); return }
    for (const p of players) {
      await supabase.from('room_players').insert({
        room_code: newCode, player_id: p.player_id, pseudo: p.pseudo,
        avatar_url: p.avatar_url ?? null, is_ready: false,
      })
    }
    const channel = supabase.channel(`fin-online-${code}`)
    await channel.subscribe()
    await channel.send({ type: 'broadcast', event: 'rejouer', payload: { newCode } })
    supabase.removeChannel(channel)
    navigate(`/salon/${newCode}`)
  }

  async function genererIllus(style: string) {
    if (!texteAssemble) return
    setStyleChoisi(style)
    setGeneratingIllus(true)
    setErreurIllus(null)
    const { url } = await genererIllustration(texteAssemble, style)
    if (url) { setIllustrationUrl(url) }
    else { setErreurIllus('Génération indisponible — réessayez dans un instant'); setStyleChoisi(null) }
    setGeneratingIllus(false)
  }

  async function partagerEcrit() {
    if (illustrationUrl) {
      await partagerImageDistante(illustrationUrl, 'cadavre-exquis', texteCorrige ?? texteAssemble, 'Cadavre Exquis')
    } else {
      await partagerTexte(texteCorrige ?? texteAssemble, 'Cadavre Exquis')
    }
  }

  async function partagerDessin() {
    if (!imageAssemblee) return
    if (texteVision) await partagerDessinAvecTexte(imageAssemblee, texteVision, 'cadavre-dessiné', accent)
    else await partagerImage(imageAssemblee, 'cadavre-dessiné')
  }

  async function sauvegarderDessinLocal() {
    if (!imageAssemblee) return
    const id = `dessin-online-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const dessin: DessinCadavre = {
      id, titre: null, nbBandes: contributions.length,
      imageDataUrl: imageAssemblee, texteVision: texteVision || undefined,
      dateCreation: Date.now(), dateModification: Date.now(),
    }
    await sauvegarderDessin(dessin)
    setSauvegardeDessin(true)
  }

  async function reessayerVision() {
    if (!imageAssemblee) return
    setErreurVision(false)
    const texte = await interpreterDessin(imageAssemblee)
    if (texte) setTexteVision(texte)
    else setErreurVision(true)
  }

  if (authLoading || !room) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>CHARGEMENT…</span>
      </PageTransition>
    )
  }

  const texteAffiche = texteCorrige ?? texteAssemble
  const lignes = texteAffiche.split('\n')
  const ligne0 = (lignes[0]?.trim() ?? '').replace(/^[«»"''"""'']+/, '')
  const lettrine = ligne0.charAt(0) ?? ''
  const resteLigne0 = ligne0.slice(1) ?? ''

  return (
    <>
      {/* ── ÉCRAN D'ASSEMBLAGE ── */}
      <AnimatePresence>
        {!revealReady && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: bg, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: '0 28px' }}
          >
            {Array.from({ length: Math.max(players.length, 2) }).map((_, i) => (
              <motion.div key={i}
                initial={{ x: i % 2 === 0 ? '-110%' : '110%' }} animate={{ x: 0 }}
                transition={{ delay: i * 0.28, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ position: 'absolute', left: 0, right: 0, height: `${100 / Math.max(players.length, 2)}%`, top: `${(i * 100) / Math.max(players.length, 2)}%`, background: accent, opacity: 0.12, pointerEvents: 'none' }} />
            ))}
            <motion.div style={{ position: 'relative', zIndex: 1 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}>
              <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.28em', marginBottom: 20, opacity: 0.8 }}>— {players.length} VOIX —</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 'clamp(1.5rem, 7vw, 2.2rem)', color: encre, lineHeight: 1.3 }}>
                Le cadavre<br />se reconstitue
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}>…</motion.span>
              </div>
            </motion.div>
            <motion.div style={{ position: 'relative', zIndex: 1, fontSize: 18, color: accent }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>✦</motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom relative">
        <Decor variant="fin" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={() => navigate('/online')} style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}>← ACCUEIL</button>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{code}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 12 }}>— RÉVÉLATION —</div>

        {revealReady && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* ── Mode dessin : dessin assemblé ── */}
            {room.mode === 'dessin' && (
              <div style={{ marginBottom: 28 }}>
                {loadingDessin && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
                    <div style={{ width: 32, height: 32, border: `2px solid ${accent}30`, borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ ...mono, fontSize: 13, color: accent }}>Assemblage du dessin…</span>
                  </div>
                )}

                {imageAssemblee && !loadingDessin && (
                  <div style={{ marginBottom: 20 }}>
                    <button onClick={() => setPleinEcranDessin(true)} aria-label="Agrandir en plein écran"
                      style={{ display: 'block', width: '100%', padding: 0, border: `0.5px solid ${encre}20`, background: 'none', cursor: 'zoom-in' }}>
                      <motion.img
                        src={imageAssemblee} alt="Cadavre exquis dessiné"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.8, ease: 'easeInOut' }}
                        style={{ display: 'block', width: '100%', maxHeight: '50vh', objectFit: 'contain' }}
                      />
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button onClick={() => setPleinEcranDessin(true)}
                        style={{ ...mono, fontSize: 13, color: `${encre}50`, background: 'none', border: 'none', cursor: 'pointer' }}>
                        ↗ AGRANDIR
                      </button>
                    </div>
                  </div>
                )}

                {/* Lecture surréaliste */}
                {imageAssemblee && !loadingDessin && (
                  <div style={{ marginBottom: 20 }}>
                    <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 16 }} />
                    {texteVision ? (
                      <>
                        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>— LECTURE SURRÉALISTE —</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, lineHeight: 1.7, color: encre, whiteSpace: 'pre-line', marginBottom: 16 }}>{texteVision}</div>
                      </>
                    ) : erreurVision ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.8 }}>La lecture surréaliste n'a pas pu avoir lieu.</p>
                        <button onClick={reessayerVision} style={{ alignSelf: 'flex-start', ...mono, fontSize: 13, background: 'transparent', color: accent, border: `0.5px solid ${accent}50`, padding: '7px 14px', cursor: 'pointer' }}>↺ RÉESSAYER</button>
                      </div>
                    ) : null}

                    {/* Actions dessin */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={sauvegarderDessinLocal} disabled={sauvegardeDessin_}
                        style={{ flex: 1, ...mono, fontSize: 17, background: sauvegardeDessin_ ? `${accent}20` : accent, color: sauvegardeDessin_ ? accent : btnText, border: `0.5px solid ${accent}`, padding: '10px 8px', cursor: sauvegardeDessin_ ? 'default' : 'pointer' }}>
                        {sauvegardeDessin_ ? '✓ SAUVEGARDÉ' : '↓ MA GALERIE'}
                      </button>
                      <button onClick={publierDansGalerieDessin} disabled={publishingGallery || publishedGallery}
                        style={{ flex: 1, ...mono, fontSize: 17, background: publishedGallery ? `${accent}20` : 'transparent', color: publishedGallery ? accent : `${encre}70`, border: `0.5px solid ${publishedGallery ? accent : encre}25`, padding: '10px 8px', cursor: publishedGallery || publishingGallery ? 'default' : 'pointer' }}>
                        {publishedGallery ? '✓ PUBLIÉ' : publishingGallery ? '…' : '✦ GALERIE COMMUNE'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <button onClick={partagerDessin}
                        style={{ ...mono, fontSize: 13, background: 'transparent', color: `${encre}70`, border: `0.5px solid ${encre}25`, padding: '10px 12px', cursor: 'pointer' }}>
                        ↗ PARTAGER
                      </button>
                      <button onClick={() => setPleinEcranDessin(true)}
                        style={{ ...mono, fontSize: 13, background: 'transparent', color: `${encre}70`, border: `0.5px solid ${encre}25`, padding: '10px 12px', cursor: 'pointer' }}>
                        ⛶ PLEIN ÉCRAN
                      </button>
                    </div>
                  </div>
                )}

                {/* Coutures dessin */}
                <div style={{ marginBottom: 20 }}>
                  <button onClick={() => setShowCoutures(!showCoutures)}
                    style={{ ...mono, fontSize: 13, color: showCoutures ? accent : encre, opacity: showCoutures ? 1 : 0.75, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showCoutures ? '▲' : '▼'} LES COUTURES
                  </button>
                  {showCoutures && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15 }} />
                      {contributions.sort((a, b) => a.case_index - b.case_index).map(c => {
                        const p = players.find(pl => pl.player_id === c.player_id)
                        let preview: React.ReactNode = null
                        try { const d = JSON.parse(c.texte) as BandeData; preview = <img src={d.imageDataUrl} alt={p?.pseudo ?? ''} style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 2 }} /> }
                        catch { if (c.texte.startsWith('data:')) preview = <img src={c.texte} alt={p?.pseudo ?? ''} style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 2 }} /> }
                        return (
                          <div key={c.case_index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 2, overflow: 'hidden', flexShrink: 0, border: `1px solid ${accent}30` }}>
                              {p?.avatar_url ? <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 17, color: accent, fontWeight: 900 }}>{p?.pseudo[0]?.toUpperCase() ?? '?'}</span></div>}
                            </div>
                            <span style={{ ...mono, fontSize: 13, color: accent }}>{p?.pseudo ?? '?'}</span>
                            {preview}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Mode écrit : poème ── */}
            {room.mode !== 'dessin' && (
              <div style={{ marginBottom: 28 }}>
                {lignes.map((ligne, i) => (
                  <motion.p key={i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.7, duration: 0.7, ease: 'easeOut' }}
                    style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 17, lineHeight: 1.65, margin: '0 0 2px' }}>
                    {i === 0 && lettrine ? (
                      <>
                        <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: '3.6rem', lineHeight: 0.85, color: accent, float: 'left', margin: '6px 8px 0 0' }}>{lettrine}</span>
                        {resteLigne0}
                      </>
                    ) : (ligne || ' ')}
                  </motion.p>
                ))}
              </div>
            )}

            {/* Coutures — écrit */}
            {room.mode !== 'dessin' && (
              <div style={{ marginBottom: 20 }}>
                <button onClick={() => setShowCoutures(!showCoutures)}
                  style={{ ...mono, fontSize: 13, color: showCoutures ? accent : encre, opacity: showCoutures ? 1 : 0.75, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showCoutures ? '▲' : '▼'} LES COUTURES
                </button>
                {showCoutures && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15 }} />
                    {contributions.sort((a, b) => a.case_index - b.case_index).map(c => {
                      const p = players.find(pl => pl.player_id === c.player_id)
                      return (
                        <div key={c.case_index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 2, overflow: 'hidden', flexShrink: 0, border: `1px solid ${accent}30` }}>
                            {p?.avatar_url ? <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 17, color: accent, fontWeight: 900 }}>{p?.pseudo[0]?.toUpperCase() ?? '?'}</span></div>}
                          </div>
                          <div>
                            <span style={{ ...mono, fontSize: 13, color: accent }}>{p?.pseudo ?? '?'}</span>
                            <span style={{ color: encre, opacity: 0.35, margin: '0 6px' }}>—</span>
                            <span style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 17 }}>{c.texte}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Illustration — écrit */}
            {room.mode !== 'dessin' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>— ILLUSTRATION —</div>

                {illustrationUrl && (
                  <div style={{ marginBottom: 12 }}>
                    <button onClick={() => setPleinEcranIllus(true)} style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}>
                      <img src={illustrationUrl} alt="illustration" style={{ width: '100%', borderRadius: 2, border: `0.5px solid ${accent}30`, display: 'block' }} />
                    </button>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => setPleinEcranIllus(true)}
                        style={{ ...mono, fontSize: 13, color: `${encre}60`, background: 'none', border: `0.5px solid ${encre}20`, padding: '6px 10px', cursor: 'pointer' }}>
                        ⛶ PLEIN ÉCRAN
                      </button>
                      <button onClick={partagerEcrit}
                        style={{ ...mono, fontSize: 13, color: `${encre}60`, background: 'none', border: `0.5px solid ${encre}20`, padding: '6px 10px', cursor: 'pointer' }}>
                        ↗ PARTAGER
                      </button>
                      <button onClick={publierDansGalerieEcrit} disabled={publishingGallery || publishedGallery}
                        style={{ ...mono, fontSize: 13, color: publishedGallery ? accent : `${encre}60`, background: publishedGallery ? `${accent}15` : 'none', border: `0.5px solid ${publishedGallery ? accent : encre}20`, padding: '6px 10px', cursor: publishedGallery || publishingGallery ? 'default' : 'pointer' }}>
                        {publishedGallery ? '✓ PUBLIÉ' : publishingGallery ? '…' : '✦ GALERIE'}
                      </button>
                    </div>
                  </div>
                )}

                {!illustrationUrl && !generatingIllus && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <button onClick={partagerEcrit}
                      style={{ ...mono, fontSize: 13, color: accent, background: 'transparent', border: `0.5px solid ${accent}50`, padding: '7px 14px', cursor: 'pointer' }}>
                      ↗ PARTAGER LE POÈME
                    </button>
                    <button onClick={publierDansGalerieEcrit} disabled={publishingGallery || publishedGallery}
                      style={{ ...mono, fontSize: 13, color: publishedGallery ? accent : encre, background: publishedGallery ? `${accent}15` : 'transparent', border: `0.5px solid ${publishedGallery ? accent : encre}30`, padding: '7px 14px', cursor: publishedGallery || publishingGallery ? 'default' : 'pointer' }}>
                      {publishedGallery ? '✓ PUBLIÉ' : publishingGallery ? '…' : '✦ GALERIE COMMUNE'}
                    </button>
                  </div>
                )}

                {generatingIllus && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <motion.span style={{ fontSize: 24, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}>✦</motion.span>
                    <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8, marginTop: 8 }}>{styleChoisi?.toUpperCase()} EN COURS…</p>
                  </div>
                )}

                {erreurIllus && <p style={{ ...mono, fontSize: 17, color: '#b22c20', marginBottom: 8 }}>{erreurIllus}</p>}

                {!generatingIllus && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STYLES.map(s => (
                      <button key={s.id} onClick={() => genererIllus(s.id)}
                        style={{ ...mono, fontSize: 13, padding: '6px 12px', background: styleChoisi === s.id && illustrationUrl ? `${accent}20` : 'transparent', color: styleChoisi === s.id && illustrationUrl ? accent : encre, border: `0.5px solid ${styleChoisi === s.id && illustrationUrl ? accent : `${encre}25`}`, cursor: 'pointer' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rejouer ensemble (hôte seulement) */}
            {room.host_id === user?.id && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <button onClick={rejouerEnsemble}
                  style={{ width: '100%', background: 'transparent', color: encre, ...mono, fontSize: 17, textTransform: 'uppercase', padding: '0.85em 1.8em', border: `1px solid ${encre}40`, cursor: 'pointer', marginTop: 8 }}>
                  ↻ REJOUER ENSEMBLE
                </button>
              </motion.div>
            )}

            <button onClick={() => navigate('/online')}
              style={{ width: '100%', background: 'transparent', color: encre, ...mono, fontSize: 17, textTransform: 'uppercase', padding: '0.85em 1.8em', border: `1px solid ${encre}40`, cursor: 'pointer', marginTop: 8 }}>
              NOUVELLE PARTIE
            </button>
          </motion.div>
        )}
      </PageTransition>

      {/* ── PLEIN ÉCRAN DESSIN ── */}
      <AnimatePresence>
        {pleinEcranDessin && imageAssemblee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
            onClick={() => setPleinEcranDessin(false)} role="dialog" aria-modal="true" aria-label="Dessin en plein écran"
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,8,5,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <img src={imageAssemblee} alt="Cadavre exquis — plein écran" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
            <button onClick={() => setPleinEcranDessin(false)} aria-label="Fermer"
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: '0.5px solid rgba(232,212,184,0.4)', color: '#e8d4b8', ...mono, fontSize: 13, padding: '6px 12px', cursor: 'pointer' }}>
              ✕ FERMER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PLEIN ÉCRAN ILLUSTRATION ── */}
      <AnimatePresence>
        {pleinEcranIllus && illustrationUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
            onClick={() => setPleinEcranIllus(false)} role="dialog" aria-modal="true" aria-label="Illustration en plein écran"
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,8,5,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <img src={illustrationUrl} alt="Illustration — plein écran" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
            <button onClick={() => setPleinEcranIllus(false)} aria-label="Fermer"
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: '0.5px solid rgba(232,212,184,0.4)', color: '#e8d4b8', ...mono, fontSize: 13, padding: '6px 12px', cursor: 'pointer' }}>
              ✕ FERMER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
