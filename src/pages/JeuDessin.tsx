import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useReve } from '../reve'
import { useAmbiance } from '../hooks/useAmbiance'
import type { ConfigDessin, BandeDessin } from '../types'

type Tool = 'pen' | 'brush' | 'marker' | 'crayon' | 'eraser'
const SIZES = [1.5, 4, 9, 17, 28]

const PALETTE = [
  '#000000', '#1a1a1a', '#444444', '#777777', '#aaaaaa', '#cccccc', '#e8e8e8', '#ffffff',
  '#7B0000', '#C62828', '#EF5350', '#E65100', '#FB8C00', '#F9A825', '#558B2F', '#1B5E20',
  '#002FA7', '#1565C0', '#0288D1', '#006064', '#004D40', '#6A1B9A', '#AD1457', '#880E4F',
  '#4E342E', '#795548', '#546E7A', '#37474F', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5',
]

// ── SVG tool icons ──────────────────────────────
function IconPen({ color }: { color: string }) {
  return (
    <svg width="16" height="40" viewBox="0 0 16 40" fill="none">
      <rect x="5" y="1" width="6" height="26" rx="3" fill={color}/>
      <path d="M5 26 L11 26 L8 37" fill={color}/>
      <circle cx="8" cy="38.5" r="1.2" fill={color} opacity="0.45"/>
      <rect x="10" y="3.5" width="2.5" height="18" rx="1.2" fill={color} opacity="0.3"/>
    </svg>
  )
}

function IconBrush({ color }: { color: string }) {
  return (
    <svg width="16" height="40" viewBox="0 0 16 40" fill="none">
      <rect x="6.5" y="0" width="3" height="20" rx="1.5" fill={color}/>
      <rect x="4.5" y="18" width="7" height="4" rx="1" fill={color} opacity="0.65"/>
      <ellipse cx="8" cy="31.5" rx="5" ry="7.5" fill={color} opacity="0.85"/>
      <path d="M6 37.5 Q8 40 10 37.5 L10.5 35.5 Q8 37 5.5 35.5 Z" fill={color}/>
    </svg>
  )
}

function IconMarker({ color }: { color: string }) {
  return (
    <svg width="20" height="40" viewBox="0 0 20 40" fill="none">
      <rect x="4" y="1" width="12" height="22" rx="5" fill={color}/>
      <rect x="5.5" y="21" width="9" height="8" rx="2" fill={color} opacity="0.8"/>
      <rect x="7" y="29" width="6" height="8" rx="2" fill={color}/>
      <rect x="3.5" y="7" width="13" height="2.5" rx="1.2" fill="white" opacity="0.18"/>
    </svg>
  )
}

function IconCrayon({ color }: { color: string }) {
  return (
    <svg width="16" height="40" viewBox="0 0 16 40" fill="none">
      <rect x="4" y="0" width="8" height="4" rx="2" fill={color} opacity="0.4"/>
      <rect x="4" y="4" width="8" height="24" rx="1" fill={color}/>
      <path d="M4 27.5 L8 38 L12 27.5 Z" fill={color} opacity="0.8"/>
      <line x1="4" y1="27.5" x2="12" y2="27.5" stroke={color} opacity="0.3" strokeWidth="0.5"/>
    </svg>
  )
}

function IconEraser({ color }: { color: string }) {
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
      <rect x="1" y="3" width="26" height="16" rx="4" fill={color} opacity="0.85"/>
      <rect x="1" y="3" width="26" height="8" rx="4" fill="white" opacity="0.14"/>
      <rect x="1" y="12" width="26" height="3" fill={color} opacity="0.45"/>
    </svg>
  )
}

const TOOL_ICONS = { pen: IconPen, brush: IconBrush, marker: IconMarker, crayon: IconCrayon, eraser: IconEraser }
const TOOL_NAMES: Record<Tool, string> = { pen: 'Stylo', brush: 'Pinceau', marker: 'Feutre', crayon: 'Craie', eraser: 'Gomme' }

const TOOLBAR_H = 164
const RACCORD_H = 80
const CANVAS_BG = '#fdf8f2'

function findLowestDrawnFraction(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h).data
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) return y / h
    }
  }
  return 0
}

export default function JeuDessin() {
  const navigate = useNavigate()
  const seance = useReve()
  const { start: startAmbiance, stop: stopAmbiance, toggleMute, muted } = useAmbiance()

  const [config] = useState<ConfigDessin>(() => {
    try { return JSON.parse(sessionStorage.getItem('config-dessin') ?? '') }
    catch { return { nbBandes: 3, joueurs: 2, visibilite: 'raccord' } }
  })

  const [bandes, setBandes] = useState<BandeDessin[]>([])
  const [bandeIdx, setBandeIdx] = useState(0)
  const [tool, setTool] = useState<Tool>('pen')
  const [sizeIdx, setSizeIdx] = useState(1)
  const [color, setColor] = useState('#000000')
  const [undoStack, setUndoStack] = useState<ImageData[]>([])
  const [redoStack, setRedoStack] = useState<ImageData[]>([])
  const [canvasReady, setCanvasReady] = useState(false)
  const [panMode, setPanMode] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [nextPlayerNum, setNextPlayerNum] = useState(2)
  const [pendingBandes, setPendingBandes] = useState<BandeDessin[]>([])
  const [showColorPanel, setShowColorPanel] = useState(false)

  // Zoom/pan
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const zoomRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const velocityRef = useRef(0)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)

  const joueurActuel = (bandeIdx % config.joueurs) + 1
  const c = seance?.colorSchema
  const accent = c?.second ?? '#1d3a8c'
  const encre = c?.encre ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: 'monospace', letterSpacing: '0.18em' }

  // Prévenir swipe-back iOS — uniquement sur la zone canvas
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (containerRef.current?.contains(e.target as Node)) e.preventDefault()
    }
    const opts: AddEventListenerOptions = { passive: false }
    document.addEventListener('touchstart', prevent, opts)
    document.addEventListener('touchmove', prevent, opts)
    return () => {
      document.removeEventListener('touchstart', prevent, opts as EventListenerOptions)
      document.removeEventListener('touchmove', prevent, opts as EventListenerOptions)
    }
  }, [])

  // Ambiance
  useEffect(() => { startAmbiance(); return () => stopAmbiance() }, [])

  // Wake lock — empêcher la mise en veille pendant le dessin
  const wakeLockRef = useRef<{ release(): Promise<void> } | null>(null)
  useEffect(() => {
    let released = false
    async function requestLock() {
      try {
        if ('wakeLock' in navigator) {
          const nav = navigator as unknown as { wakeLock: { request(t: string): Promise<{ release(): Promise<void> }> } }
          wakeLockRef.current = await nav.wakeLock.request('screen')
        }
      } catch { /* not supported */ }
    }
    requestLock()
    const onVisible = () => { if (!released && document.visibilityState === 'visible') requestLock() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  // Initialiser canvas — pré-dessine le raccord si mode raccord
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cssW = containerRef.current?.offsetWidth ?? Math.min(window.innerWidth, 500)
    const cssH = containerRef.current?.offsetHeight ?? (window.innerHeight - TOOLBAR_H)
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (bandeIdx > 0 && config.visibilite === 'raccord' && bandes.length > 0) {
      const prev = bandes[bandes.length - 1]
      const MARGE = 24
      const prevDpr = prev.dpr ?? 1
      const RACCORD_H_phys = RACCORD_H * dpr
      const MARGE_phys = MARGE * prevDpr
      const cropH_prev = Math.min(
        Math.ceil(prev.lowestDrawnFraction * prev.height) + MARGE_phys,
        prev.height,
      )
      const srcY = Math.max(0, cropH_prev - RACCORD_H * prevDpr)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, srcY, prev.width, RACCORD_H * prevDpr, 0, 0, canvas.width, RACCORD_H_phys)
        setUndoStack([ctx.getImageData(0, 0, canvas.width, canvas.height)])
        setRedoStack([])
        setZoom(1); setPanX(0); setPanY(0)
        zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0
        setCanvasReady(true)
      }
      img.src = prev.imageDataUrl
    } else {
      setUndoStack([ctx.getImageData(0, 0, canvas.width, canvas.height)])
      setRedoStack([])
      setZoom(1); setPanX(0); setPanY(0)
      zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0
      setCanvasReady(true)
    }
  }, [bandeIdx])

  function getCanvasCoords(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current!.height / rect.height),
    }
  }

  function saveSnapshot() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    setUndoStack(prev => [...prev.slice(-29), ctx.getImageData(0, 0, canvas.width, canvas.height)])
    setRedoStack([])
  }

  function undo() {
    const canvas = canvasRef.current; if (!canvas || undoStack.length <= 1) return
    const ctx = canvas.getContext('2d')!
    setRedoStack(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)])
    const prev = undoStack[undoStack.length - 2]
    setUndoStack(s => s.slice(0, -1))
    ctx.putImageData(prev, 0, 0)
  }

  function redo() {
    const canvas = canvasRef.current; if (!canvas || redoStack.length === 0) return
    const ctx = canvas.getContext('2d')!
    const next = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)])
    setRedoStack(s => s.slice(0, -1))
    ctx.putImageData(next, 0, 0)
  }

  const draw = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const pos = getCanvasCoords(clientX, clientY)
    const prev = lastPos.current ?? pos
    const size = SIZES[sizeIdx] * dpr

    const dx = pos.x - prev.x
    const dy = pos.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'

    if (tool === 'eraser') {
      ctx.strokeStyle = CANVAS_BG; ctx.lineWidth = size * 2.8; ctx.globalAlpha = 1
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()

    } else if (tool === 'pen') {
      // Stylo : largeur dynamique selon la vitesse (lent = épais, rapide = fin)
      velocityRef.current = velocityRef.current * 0.55 + dist * 0.45
      const dynamicW = size * Math.max(0.35, 1.0 - velocityRef.current * 0.018)
      ctx.strokeStyle = color; ctx.lineWidth = dynamicW; ctx.globalAlpha = 1
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()

    } else if (tool === 'brush') {
      // Pinceau : poils multiples, étalés perpendiculairement au trait
      const angle = Math.atan2(dy, dx) + Math.PI / 2
      const numBristles = 12
      for (let b = 0; b < numBristles; b++) {
        const t = b / (numBristles - 1) - 0.5
        const spread = size * 0.9
        const ox = Math.cos(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        const oy = Math.sin(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        ctx.strokeStyle = color
        ctx.lineWidth = (0.35 + Math.random() * 0.9) * dpr
        ctx.globalAlpha = 0.22 + Math.random() * 0.52
        ctx.beginPath()
        ctx.moveTo(prev.x + ox, prev.y + oy)
        ctx.lineTo(pos.x + ox, pos.y + oy)
        ctx.stroke()
      }

    } else if (tool === 'marker') {
      // Feutre : pointe plate (lineCap square), opacité faible qui s'accumule
      ctx.strokeStyle = color; ctx.lineWidth = size * 2.6; ctx.lineCap = 'square'
      ctx.globalAlpha = 0.35
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()

    } else if (tool === 'crayon') {
      // Craie : texture granuleuse, particules aléatoires le long du trait
      const numGrains = Math.ceil(Math.max(dist * 0.9, 5) * 1.8)
      for (let g = 0; g < numGrains; g++) {
        const t = Math.random()
        const gx = prev.x + dx * t + (Math.random() - 0.5) * size * 1.1
        const gy = prev.y + dy * t + (Math.random() - 0.5) * size * 1.1
        ctx.fillStyle = color
        ctx.globalAlpha = 0.04 + Math.random() * 0.20
        ctx.beginPath()
        ctx.arc(gx, gy, Math.random() * 1.4 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
    lastPos.current = pos
  }, [tool, sizeIdx, color])

  function onPointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      if (panMode) {
        isDrawing.current = false
      } else {
        isDrawing.current = true
        velocityRef.current = 0
        lastPos.current = getCanvasCoords(e.clientX, e.clientY)
        saveSnapshot(); draw(e.clientX, e.clientY)
      }
    } else {
      isDrawing.current = false; lastPos.current = null
      lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  function onPointerMove(e: React.PointerEvent) {
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
        const actualScale = newZoom / zoomRef.current
        const newPanX = mid.x - (mid.x - panXRef.current) * actualScale + (mid.x - lastPinchMid.current.x)
        const newPanY = mid.y - (mid.y - panYRef.current) * actualScale + (mid.y - lastPinchMid.current.y)
        zoomRef.current = newZoom; panXRef.current = newPanX; panYRef.current = newPanY
        setZoom(newZoom); setPanX(newPanX); setPanY(newPanY)
      } else if (lastPinchMid.current !== null) {
        panXRef.current += mid.x - lastPinchMid.current.x
        panYRef.current += mid.y - lastPinchMid.current.y
        setPanX(panXRef.current); setPanY(panYRef.current)
      }
      lastPinchDist.current = dist; lastPinchMid.current = mid
    } else if (panMode && prevPt) {
      panXRef.current += e.clientX - prevPt.x
      panYRef.current += e.clientY - prevPt.y
      setPanX(panXRef.current); setPanY(panYRef.current)
    } else if (isDrawing.current) {
      draw(e.clientX, e.clientY)
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      isDrawing.current = false; lastPos.current = null
      lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  function validerBande() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const lowestDrawnFraction = findLowestDrawnFraction(ctx, canvas.width, canvas.height)
    const dpr = window.devicePixelRatio || 1
    const bande: BandeDessin = {
      joueurIdx: bandeIdx, joueurNumero: joueurActuel,
      imageDataUrl: canvas.toDataURL('image/png'),
      width: canvas.width, height: canvas.height,
      lowestDrawnFraction, dpr, ts: Date.now(),
    }
    const nouvellesBandes = [...bandes, bande]
    setBandes(nouvellesBandes)
    if (bandeIdx + 1 >= config.nbBandes) {
      sessionStorage.setItem('dessin-bandes', JSON.stringify(nouvellesBandes))
      navigate('/fin-dessin')
    } else {
      setNextPlayerNum(((bandeIdx + 1) % config.joueurs) + 1)
      setPendingBandes(nouvellesBandes)
      setShowTransition(true)
    }
  }

  function demarrerProchainJoueur() {
    setShowTransition(false); setBandes(pendingBandes)
    setBandeIdx(idx => idx + 1); setCanvasReady(false)
  }

  const prevBande = bandes[bandes.length - 1] ?? null
  const ToolIcon = TOOL_ICONS[tool]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ position: 'fixed', inset: 0, background: CANVAS_BG, display: 'flex', flexDirection: 'column' }}
    >
      {/* ── CANVAS ── */}
      <div
        ref={containerRef}
        style={{ position: 'relative', flex: 1, overflow: 'hidden', background: CANVAS_BG, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'center center',
          width: '100%', height: '100%',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: panMode ? (isDrawing.current ? 'grabbing' : 'grab') : (tool === 'eraser' ? 'cell' : 'crosshair') }} />
        </div>

        {/* Ligne guide raccord */}
        {bandeIdx > 0 && config.visibilite === 'raccord' && canvasReady && (
          <div style={{
            position: 'absolute', top: RACCORD_H, left: 0, right: 0,
            height: 1,
            background: `linear-gradient(to right, transparent, ${accent}55 15%, ${accent}55 85%, transparent)`,
            pointerEvents: 'none', zIndex: 5,
          }}>
            <span style={{ position: 'absolute', right: 8, top: -12, ...mono, fontSize: 7, color: accent, background: `${CANVAS_BG}ee`, padding: '1px 6px' }}>
              ← RACCORD
            </span>
          </div>
        )}

        {/* Badge joueur */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          ...mono, fontSize: 8, color: encre,
          background: 'rgba(255,255,255,0.88)', padding: '4px 10px',
          border: `0.5px solid ${encre}15`, pointerEvents: 'none',
        }}>
          JOUEUR {joueurActuel} · {bandeIdx + 1}/{config.nbBandes}
        </div>

        {/* Reset zoom */}
        {zoom > 1.05 && (
          <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0 }} style={{
            position: 'absolute', top: 10, right: 10,
            ...mono, fontSize: 8, color: encre,
            background: 'rgba(255,255,255,0.9)', border: `0.5px solid ${encre}20`,
            padding: '4px 10px', cursor: 'pointer', zIndex: 10,
          }}>
            ↺ {Math.round(zoom * 100)}%
          </button>
        )}
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{
        height: TOOLBAR_H, flexShrink: 0, zIndex: 20,
        background: '#ffffff',
        boxShadow: '0 -2px 20px rgba(15,8,5,0.09)',
        borderRadius: '18px 18px 0 0',
        padding: '12px 16px 10px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* Rangée outils */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(['pen', 'brush', 'marker', 'crayon', 'eraser'] as Tool[]).map(t => {
            const active = tool === t
            const Icon = TOOL_ICONS[t]
            return (
              <button
                key={t}
                onClick={() => setTool(t)}
                aria-pressed={active}
                title={TOOL_NAMES[t]}
                style={{
                  flex: 1, height: 58, paddingTop: 6, paddingBottom: 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                  background: active ? '#f5f0ea' : 'transparent',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <Icon color={active ? (tool === 'eraser' ? encre : color) : `${encre}55`} />
                {/* Bande de couleur comme Freeform */}
                <div style={{
                  width: '60%', height: 3, borderRadius: 2,
                  background: active && tool !== 'eraser' ? color : `${encre}18`,
                  transition: 'background 0.15s',
                }} />
              </button>
            )
          })}

          {/* Séparateur */}
          <div style={{ width: 1, height: 36, background: `${encre}12`, margin: '0 2px', flexShrink: 0 }} />

          {/* Bouton couleur */}
          <button
            onClick={() => setShowColorPanel(true)}
            aria-label="Choisir une couleur"
            style={{
              width: 44, height: 44,
              borderRadius: '50%',
              background: tool === 'eraser' ? '#f0ede8' : color,
              border: `2px solid ${tool === 'eraser' ? `${encre}20` : color === '#ffffff' || color === '#eeeeee' ? `${encre}30` : 'transparent'}`,
              boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s, transform 0.1s',
            }}
          />
        </div>

        {/* Rangée tailles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ ...mono, fontSize: 7, color: `${encre}45`, flexShrink: 0, width: 32 }}>TAILLE</span>
          <div style={{ display: 'flex', flex: 1, gap: 4, alignItems: 'center' }}>
            {SIZES.map((sz, i) => (
              <button
                key={i}
                onClick={() => setSizeIdx(i)}
                aria-pressed={sizeIdx === i}
                style={{
                  flex: 1, height: 34,
                  background: sizeIdx === i ? '#f5f0ea' : 'transparent',
                  border: 'none', borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
              >
                <div style={{
                  width: Math.min(sz * 0.7 + 3, 22),
                  height: Math.min(sz * 0.7 + 3, 22),
                  borderRadius: '50%',
                  background: sizeIdx === i ? (tool === 'eraser' ? encre : color) : `${encre}55`,
                  transition: 'background 0.15s',
                }} />
              </button>
            ))}
          </div>
          {/* Undo / redo */}
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            <button onClick={undo} disabled={undoStack.length <= 1} aria-label="Annuler"
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: undoStack.length > 1 ? '#f5f0ea' : 'transparent', color: undoStack.length > 1 ? encre : `${encre}28`, fontSize: 18, cursor: undoStack.length > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ↩
            </button>
            <button onClick={redo} disabled={redoStack.length === 0} aria-label="Rétablir"
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: redoStack.length > 0 ? '#f5f0ea' : 'transparent', color: redoStack.length > 0 ? encre : `${encre}28`, fontSize: 18, cursor: redoStack.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ↪
            </button>
          </div>
        </div>

        {/* Rangée action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Son' : 'Muet'}
            style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: `${encre}50` }}>
            {muted ? '♪' : '♫'}
          </button>
          {/* Mode navigation */}
          <button
            onClick={() => setPanMode(p => !p)}
            aria-pressed={panMode}
            aria-label={panMode ? 'Retour au dessin' : 'Naviguer'}
            title={panMode ? 'Retour au dessin' : 'Naviguer / Zoomer'}
            style={{
              width: 34, height: 34, borderRadius: 8, border: 'none',
              background: panMode ? `${accent}18` : 'transparent',
              color: panMode ? accent : `${encre}45`,
              fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: panMode ? `1.5px solid ${accent}40` : 'none',
            }}>
            ✥
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={validerBande} style={{
            ...mono, fontSize: 10,
            background: encre, color: '#e8d4b8',
            border: 'none', cursor: 'pointer',
            padding: '10px 24px', borderRadius: 10,
            letterSpacing: '0.16em',
          }}>
            {bandeIdx + 1 < config.nbBandes ? 'VALIDER →' : 'RÉVÉLER →'}
          </button>
        </div>
      </div>

      {/* ── PANNEAU COULEUR ── */}
      <AnimatePresence>
        {showColorPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowColorPanel(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.2)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 400 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                background: '#ffffff', borderRadius: '20px 20px 0 0',
                padding: '0 16px 24px',
                boxShadow: '0 -4px 32px rgba(0,0,0,0.16)',
              }}
            >
              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#ddd', margin: '12px auto 16px' }} />

              {/* Sélecteur natif + couleur custom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: color, border: `1px solid ${encre}20`, flexShrink: 0 }} />
                <span style={{ ...mono, fontSize: 8, color: encre, flex: 1, opacity: 0.6 }}>COULEUR PERSONNALISÉE</span>
                <input
                  type="color"
                  value={color}
                  onChange={e => { setColor(e.target.value); if (tool === 'eraser') setTool('pen') }}
                  style={{ width: 36, height: 36, padding: 3, border: `1px solid ${encre}20`, borderRadius: 8, cursor: 'pointer' }}
                />
              </div>

              {/* Grille 4×8 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: 14 }}>
                {PALETTE.map(col => (
                  <button
                    key={col}
                    onClick={() => { setColor(col); if (tool === 'eraser') setTool('pen'); setShowColorPanel(false) }}
                    style={{
                      height: 32, borderRadius: 6,
                      background: col,
                      border: color === col
                        ? `2.5px solid ${accent}`
                        : ['#ffffff', '#e8e8e8', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5'].includes(col)
                          ? `1px solid ${encre}22`
                          : '2.5px solid transparent',
                      cursor: 'pointer',
                      transition: 'transform 0.08s',
                    }}
                  />
                ))}
              </div>

              <button onClick={() => setShowColorPanel(false)} style={{
                width: '100%', padding: '12px',
                ...mono, fontSize: 9, background: '#f5f0ea', color: encre,
                border: 'none', borderRadius: 10, cursor: 'pointer',
              }}>
                FERMER
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── INTRO JOUEUR 1 ── */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setShowIntro(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100, background: encre,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ ...mono, fontSize: 9, color: accent, letterSpacing: '0.28em', marginBottom: 16, opacity: 0.8 }}>
                — BANDE 1/{config.nbBandes} —
              </div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(2.6rem, 12vw, 4.5rem)', color: '#e8d4b8', lineHeight: 1.1 }}>
                Joueur 1.
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: '#e8d4b8', opacity: 0.5, marginTop: 12 }}>
                Dessine la première bande.
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
              style={{ ...mono, fontSize: 9, color: '#e8d4b8', opacity: 0.38, letterSpacing: '0.2em' }}>
              TOUCHER POUR COMMENCER
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRANSITION JOUEUR ── */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={demarrerProchainJoueur}
            style={{
              position: 'fixed', inset: 0, zIndex: 100, background: encre,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ ...mono, fontSize: 9, color: accent, letterSpacing: '0.28em', marginBottom: 16, opacity: 0.8 }}>
                — BANDE {bandeIdx + 2}/{config.nbBandes} —
              </div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(2.6rem, 12vw, 4.5rem)', color: '#e8d4b8', lineHeight: 1.1 }}>
                Joueur {nextPlayerNum}.
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: '#e8d4b8', opacity: 0.5, marginTop: 12 }}>
                Passez l'écran. Ne regardez pas.
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
              style={{ ...mono, fontSize: 9, color: '#e8d4b8', opacity: 0.38, letterSpacing: '0.2em' }}>
              TOUCHER POUR COMMENCER
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
