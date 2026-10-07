import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'
import { partieNue } from '../lib/corps'
import { useStudio } from '../hooks/useStudio'
import { OUTILS, type OutilId } from '../lib/trait/outils'
import Trousse from './dessin/Trousse'
import ReglagesOutil from './dessin/ReglagesOutil'
import Nuancier from './dessin/Nuancier'
import RegleVisible from './dessin/RegleVisible'

// Le même studio qu'en local : la trousse (92) et la rangée des gestes (44).
const TOOLBAR_H = 178
const RACCORD_H = 80
// Encre fixe de la barre d'outils — toujours lisible sur son fond beige fixe (#f0e9df).
const TB_INK = '#1a1208'

type Paper = 'lisse' | 'kraft' | 'parchemin' | 'ardoise'
const PAPERS: { id: Paper; nom: string; bg: string; grain: string; ink: string }[] = [
  { id: 'lisse',     nom: 'Lisse',     bg: '#fdf8f2', grain: '#00000000', ink: '#1a1410' },
  { id: 'kraft',     nom: 'Kraft',     bg: '#cdb48c', grain: '#5a4326',   ink: '#2c1d0e' },
  { id: 'parchemin', nom: 'Parchemin', bg: '#f3e7cb', grain: '#b89a63',   ink: '#3a2a14' },
  { id: 'ardoise',   nom: 'Ardoise',   bg: '#2f3438', grain: '#0d0f11',   ink: '#e8e4dc' },
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function peindreFond(ctx: CanvasRenderingContext2D, w: number, h: number, p: { bg: string; grain: string }) {
  ctx.save()
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)
  if (p.grain && !p.grain.endsWith('00')) {
    const g = hexToRgb(p.grain)
    const n = Math.floor((w * h) / 1400)
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w; const y = Math.random() * h
      const a = 0.015 + Math.random() * 0.05
      ctx.fillStyle = `rgba(${g.r},${g.g},${g.b},${a})`
      ctx.beginPath(); ctx.arc(x, y, Math.random() * 1.1 + 0.2, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

// ── Icônes d'outils ───────────────────────────────────────────────────────────

interface Props {
  onSubmit: (dataUrl: string) => Promise<void>
  raccordDataUrl: string | null
  bandeNum: number
  totalBandes: number
  accent: string
  encre: string
  bg: string
}

export default function OnlineDrawingCanvas({ onSubmit, raccordDataUrl, bandeNum, totalBandes, accent, encre, bg }: Props) {

  const [paper, setPaper] = useState<Paper>('lisse')
  const paperDef = PAPERS.find(p => p.id === paper) ?? PAPERS[0]
  const CANVAS_BG_ACTUEL = paperDef.bg
  const [pipetteActive, setPipetteActive] = useState(false)
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [, setHistoryTick] = useState(0)
  const bumpHistory = useCallback(() => setHistoryTick(t => t + 1), [])
  const [panMode, setPanMode] = useState(false)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const zoomRef = useRef(1); const panXRef = useRef(0); const panYRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const coucheRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)
  const undoStackRef = useRef<ImageData[]>([])
  const redoStackRef = useRef<ImageData[]>([])
  const UNDO_MAX = 20

  const studio = useStudio({
    canvasRef, coucheRef, conteneurRef: containerRef,
    versCanvas: (x, y) => getCanvasCoords(x, y),
    fond: CANVAS_BG_ACTUEL, papierClair: paper !== 'ardoise', encre: paperDef.ink,
    onTraitPose: () => {
      saveSnapshot()
      if (!OUTILS[studio.outil].sansCouleur) ajouterCouleurRecente(studio.reglage.couleur)
    },
  })
  const [reglagesOuverts, setReglagesOuverts] = useState<OutilId | null>(null)

  // Prevent iOS swipe-back during drawing
  useEffect(() => {
    const prevent = (e: TouchEvent) => { if (containerRef.current?.contains(e.target as Node)) e.preventDefault() }
    const opts: AddEventListenerOptions = { passive: false }
    document.addEventListener('touchstart', prevent, opts)
    document.addEventListener('touchmove', prevent, opts)
    return () => {
      document.removeEventListener('touchstart', prevent, opts as EventListenerOptions)
      document.removeEventListener('touchmove', prevent, opts as EventListenerOptions)
    }
  }, [])

  // Canvas init — draw paper background then overlay raccord if any
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cssW = containerRef.current?.offsetWidth ?? Math.min(window.innerWidth, 500)
    const cssH = containerRef.current?.offsetHeight ?? (window.innerHeight - TOOLBAR_H)
    canvas.width = cssW * dpr; canvas.height = cssH * dpr
    canvas.style.width = `${cssW}px`; canvas.style.height = `${cssH}px`
    const couche = coucheRef.current
    if (couche) { couche.width = canvas.width; couche.height = canvas.height; couche.style.width = `${cssW}px`; couche.style.height = `${cssH}px` }
    const ctx = canvas.getContext('2d')!
    peindreFond(ctx, canvas.width, canvas.height, paperDef)

    const init = () => {
      undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
      redoStackRef.current = []; bumpHistory()
      setZoom(1); setPanX(0); setPanY(0)
      zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0
      setCanvasReady(true)
    }

    if (raccordDataUrl) {
      const img = new Image()
      img.onload = () => {
        const RACCORD_H_phys = RACCORD_H * dpr
        const srcH = Math.min(RACCORD_H * dpr, img.naturalHeight)
        const srcY = img.naturalHeight - srcH
        ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, 0, canvas.width, RACCORD_H_phys)
        const fb = hexToRgb(paperDef.bg)
        const grad = ctx.createLinearGradient(0, 0, 0, RACCORD_H_phys)
        grad.addColorStop(0, `rgba(${fb.r},${fb.g},${fb.b},0)`)
        grad.addColorStop(0.7, `rgba(${fb.r},${fb.g},${fb.b},0)`)
        grad.addColorStop(1, `rgba(${fb.r},${fb.g},${fb.b},1)`)
        ctx.save(); ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, RACCORD_H_phys); ctx.restore()
        init()
      }
      img.onerror = init
      img.src = raccordDataUrl
    } else { init() }
  }, [raccordDataUrl, bumpHistory]) // eslint-disable-line react-hooks/exhaustive-deps

  function getCanvasCoords(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: (clientX - rect.left) * (canvasRef.current!.width / rect.width), y: (clientY - rect.top) * (canvasRef.current!.height / rect.height) }
  }

  function saveSnapshot() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStackRef.current.push(snap)
    if (undoStackRef.current.length > UNDO_MAX) undoStackRef.current.splice(0, undoStackRef.current.length - UNDO_MAX)
    redoStackRef.current = []; bumpHistory()
  }

  const undo = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas || undoStackRef.current.length <= 1) return
    const ctx = canvas.getContext('2d')!
    const popped = undoStackRef.current.pop()!
    redoStackRef.current.push(popped)
    if (redoStackRef.current.length > UNDO_MAX) redoStackRef.current.splice(0, redoStackRef.current.length - UNDO_MAX)
    ctx.putImageData(undoStackRef.current[undoStackRef.current.length - 1], 0, 0); bumpHistory()
  }, [bumpHistory])

  const redo = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas || !redoStackRef.current.length) return
    const ctx = canvas.getContext('2d')!
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    if (undoStackRef.current.length > UNDO_MAX) undoStackRef.current.splice(0, undoStackRef.current.length - UNDO_MAX)
    ctx.putImageData(next, 0, 0); bumpHistory()
  }, [bumpHistory])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey; if (!mod) return
      if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
      else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])


  function echantillonnerCouleur(clientX: number, clientY: number): string | null {
    const canvas = canvasRef.current; if (!canvas) return null
    const ctx = canvas.getContext('2d')!
    const { x, y } = getCanvasCoords(clientX, clientY)
    const px = ctx.getImageData(Math.max(0, Math.min(canvas.width - 1, Math.round(x))), Math.max(0, Math.min(canvas.height - 1, Math.round(y))), 1, 1).data
    return '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  function ajouterCouleurRecente(col: string) {
    setRecentColors(prev => [col, ...prev.filter(c => c.toLowerCase() !== col.toLowerCase())].slice(0, 8))
  }

  function onPointerDown(e: React.PointerEvent) {
    if (pipetteActive) {
      const col = echantillonnerCouleur(e.clientX, e.clientY)
      if (col) {
        const cible = OUTILS[studio.outil].sansCouleur ? 'crayon' : studio.outil
        studio.setOutil(cible); studio.changerReglage(cible, { couleur: col }); ajouterCouleurRecente(col)
      }
      setPipetteActive(false)
      return
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      if (panMode) { isDrawing.current = false }
      else {
        isDrawing.current = true
        studio.debut(e.clientX, e.clientY, e.pressure, e.pointerType)
      }
    } else {
      // Un second doigt : un pincement, pas un trait — le début de trait est retiré.
      if (isDrawing.current) studio.fin(true)
      isDrawing.current = false; lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawing.current && !panMode) setGhost({ x: e.clientX, y: e.clientY })
    const prevPt = pointersRef.current.get(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointersRef.current.values()]
    if (pts.length >= 2) {
      isDrawing.current = false
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      if (lastPinchDist.current !== null && lastPinchMid.current !== null) {
        const scale = dist / lastPinchDist.current
        const newZoom = Math.max(1, Math.min(6, zoomRef.current * scale))
        const as = newZoom / zoomRef.current
        const rect = containerRef.current!.getBoundingClientRect()
        const newPanX = (mid.x - rect.left) - (lastPinchMid.current.x - rect.left - panXRef.current) * as
        const newPanY = (mid.y - rect.top) - (lastPinchMid.current.y - rect.top - panYRef.current) * as
        zoomRef.current = newZoom; panXRef.current = newPanX; panYRef.current = newPanY
        setZoom(newZoom); setPanX(newPanX); setPanY(newPanY)
      } else if (lastPinchMid.current !== null) {
        panXRef.current += mid.x - lastPinchMid.current.x; panYRef.current += mid.y - lastPinchMid.current.y
        setPanX(panXRef.current); setPanY(panYRef.current)
      }
      lastPinchDist.current = dist; lastPinchMid.current = mid
    } else if (panMode && prevPt) {
      panXRef.current += e.clientX - prevPt.x; panYRef.current += e.clientY - prevPt.y
      setPanX(panXRef.current); setPanY(panYRef.current)
    } else if (isDrawing.current) {
      // Coalesced events: replay all sub-frame points the browser batched
      const native = e.nativeEvent as PointerEvent
      const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
      studio.suite(events.length > 0 ? events : [e])
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasDrawing = isDrawing.current && pointersRef.current.size === 1
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      if (wasDrawing) studio.fin()
      isDrawing.current = false
      lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  function changerPapier(p: Paper) {
    setPaper(p)
    const def = PAPERS.find(x => x.id === p) ?? PAPERS[0]
    studio.encrerTout(def.ink)
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    peindreFond(ctx, canvas.width, canvas.height, def)
    undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
    redoStackRef.current = []; bumpHistory()
  }

  async function handleSubmit() {
    const canvas = canvasRef.current; if (!canvas || busy) return
    setBusy(true)
    const json = JSON.stringify({
      imageDataUrl: canvas.toDataURL('image/jpeg', 0.75),
      lowestDrawnFraction: 0.9,
      width: canvas.width, height: canvas.height,
      dpr: window.devicePixelRatio || 1,
    })
    await onSubmit(json)
    setBusy(false)
  }

  const canUndo = undoStackRef.current.length > 1
  const canRedo = redoStackRef.current.length > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      style={{ position: 'fixed', inset: 0, background: CANVAS_BG_ACTUEL, display: 'flex', flexDirection: 'column', paddingTop: 'var(--sa-top)' }}>

      {/* Canvas */}
      <div ref={containerRef}
        style={{ position: 'relative', flex: 1, overflow: 'hidden', background: CANVAS_BG_ACTUEL, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerLeave={e => { setGhost(null); onPointerUp(e) }} onPointerCancel={onPointerUp}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
          <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: pipetteActive ? 'copy' : panMode ? 'grab' : OUTILS[studio.outil].sansCouleur ? 'cell' : 'crosshair' }} />
          <canvas ref={coucheRef} aria-hidden style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
        </div>

        {/* Curseur fantôme — la taille exacte de l'instrument */}
        {ghost && !panMode && !pipetteActive && !showColorPanel && (() => {
          const sans = OUTILS[studio.outil].sansCouleur, c = studio.reglage.couleur
          const diam = Math.max(6, studio.reglage.taille * zoom)
          return (
            <div style={{ position: 'fixed', left: ghost.x, top: ghost.y, width: diam, height: diam, marginLeft: -diam / 2, marginTop: -diam / 2, borderRadius: '50%', border: `1px solid ${sans ? `${paperDef.ink}66` : `${c}aa`}`, background: sans ? 'transparent' : `${c}14`, pointerEvents: 'none', zIndex: 15 }} />
          )
        })()}

        {studio.regle && <RegleVisible regle={studio.regle} onChange={studio.setRegle} />}

        {/* Raccord guide line */}
        {raccordDataUrl && canvasReady && (
          <div style={{ position: 'absolute', top: RACCORD_H, left: 0, right: 0, height: 1, background: `linear-gradient(to right,transparent,${accent}55 15%,${accent}55 85%,transparent)`, pointerEvents: 'none', zIndex: 5 }}>
            <span style={{ position: 'absolute', right: 8, top: -12, ...mono, fontSize: 13, color: accent, background: `${CANVAS_BG_ACTUEL}ee`, padding: '1px 6px' }}>← {tr('RACCORD', 'JOIN')}</span>
          </div>
        )}

        {/* Band badge — couleurs liées au papier pour rester lisible sur tout fond */}
        <div style={{ position: 'absolute', top: 10, left: 10, ...mono, fontSize: 13, color: paperDef.ink, background: `${paperDef.bg}ee`, padding: '4px 10px', border: `0.5px solid ${paperDef.ink}30`, borderRadius: 3, pointerEvents: 'none' }}>
          {tr('BANDE', 'BAND')} {bandeNum}/{totalBandes}
          {partieNue(bandeNum - 1, totalBandes, langueActuelle()) && <> · {partieNue(bandeNum - 1, totalBandes, langueActuelle())!.toUpperCase()}</>}
        </div>

        {zoom > 1.05 && (
          <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0 }}
            style={{ position: 'absolute', top: 10, right: 10, ...mono, fontSize: 13, color: paperDef.ink, background: `${paperDef.bg}ee`, border: `0.5px solid ${paperDef.ink}30`, borderRadius: 3, padding: '4px 10px', cursor: 'pointer', zIndex: 10 }}>
            ↺ {Math.round(zoom * 100)}%
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{
        height: `calc(${TOOLBAR_H}px + max(0px, var(--sa-bottom) - 10px))`,
        flexShrink: 0, zIndex: 20, background: '#f0e9df',
        boxShadow: '0 -2px 20px rgba(15,8,5,0.10)', borderRadius: '18px 18px 0 0',
        padding: `12px 16px max(10px, var(--sa-bottom))`,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ position: 'relative' }}>
          <AnimatePresence>
            {reglagesOuverts && (
              <ReglagesOutil
                key={reglagesOuverts}
                id={reglagesOuverts} reglage={studio.reglages[reglagesOuverts]}
                fond={CANVAS_BG_ACTUEL} papierClair={paper !== 'ardoise'}
                onChange={r => studio.changerReglage(reglagesOuverts, r)}
                onFermer={() => setReglagesOuverts(null)}
              />
            )}
          </AnimatePresence>
          <Trousse
            outil={studio.outil} reglages={studio.reglages}
            onChoisir={id => { studio.setOutil(id); setReglagesOuverts(null) }}
            onRegler={id => setReglagesOuverts(o => (o === id ? null : id))}
            regle={!!studio.regle}
            onRegle={() => {
              const boite = containerRef.current
              const w = boite?.offsetWidth ?? 390, h = boite?.offsetHeight ?? 500
              studio.setRegle(studio.regle ? null : { cx: w / 2, cy: h * 0.55, angle: 0, longueur: Math.min(w * 1.25, 620), epaisseur: 64 })
            }}
            onCouleur={() => { setReglagesOuverts(null); setShowColorPanel(true) }}
          />
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPanMode(p => !p)} aria-pressed={panMode} aria-label={panMode ? tr('Retour au dessin', 'Back to drawing') : tr('Naviguer / zoomer', 'Pan / zoom')}
            style={{ width: 44, height: 44, borderRadius: 3, border: 'none', background: panMode ? accent : '#c8bfb0', color: panMode ? '#fff' : '#1a1208', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✥</button>
          {([{ fn: undo, can: canUndo, icon: '↩', label: tr('Annuler', 'Undo') }, { fn: redo, can: canRedo, icon: '↪', label: tr('Rétablir', 'Redo') }] as const).map(({ fn, can, icon, label }) => (
            <button key={label} onClick={fn} disabled={!can} aria-label={label}
              style={{ width: 44, height: 44, borderRadius: 3, border: 'none', background: can ? `${accent}18` : 'transparent', color: can ? accent : TB_INK, opacity: can ? 1 : 0.35, fontSize: 18, cursor: can ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={handleSubmit} disabled={busy}
            style={{ ...mono, fontSize: 17, background: encre, color: bg, border: 'none', cursor: busy ? 'wait' : 'pointer', padding: '10px 18px', borderRadius: 3, letterSpacing: '0.16em', whiteSpace: 'nowrap', flexShrink: 0, opacity: busy ? 0.6 : 1 }}>
            {busy ? tr('ENVOI…', 'SENDING…') : tr('VALIDER →', 'DONE →')}
          </button>
        </div>
      </div>

      {/* Nuancier — le papier se choisit en tête, comme avant */}
      <AnimatePresence>
        {showColorPanel && (
          <Nuancier
            couleur={studio.reglage.couleur} recentes={recentColors}
            onChoisir={c => studio.changerReglage(studio.outil, { couleur: c })}
            onPipette={() => { setShowColorPanel(false); setPipetteActive(true) }}
            onFermer={() => setShowColorPanel(false)}
            avant={
              <div style={{ marginBottom: 14 }}>
                <span style={{ ...mono, fontSize: 12, color: `${TB_INK}80`, display: 'block', marginBottom: 8 }}>{tr('FOND PAPIER', 'PAPER')}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PAPERS.map(p => (
                    <button key={p.id} type="button" onClick={() => changerPapier(p.id)} aria-pressed={paper === p.id}
                      style={{ flex: 1, height: 40, borderRadius: 10, background: p.bg, border: paper === p.id ? `2.5px solid ${accent}` : `1px solid ${TB_INK}22`, cursor: 'pointer' }}>
                      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, letterSpacing: '0.12em', color: p.ink, fontWeight: paper === p.id ? 700 : 400 }}>{p.nom.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
