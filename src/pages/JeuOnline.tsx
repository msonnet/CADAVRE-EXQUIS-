import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase } from '../lib/supabase'
import { getStructure, nombreCasesEffectif } from '../structures'

type Room = { code: string; host_id: string | null; mode: string; structure_id: string; nb_joueurs: number; status: string; turn_seconds: number | null; started_at: string | null; nb_cases: number | null }
type RoomPlayer = { id: string; player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null; joined_at: string | null }
type Contribution = { case_index: number; texte: string; player_id: string }
type BandeData = { imageDataUrl: string; lowestDrawnFraction: number; width: number; height: number; dpr: number }
type Tool = 'pencil' | 'pen' | 'marker' | 'brush' | 'crayon' | 'eraser'

const TYPE_LABEL: Record<string, string> = {
  'nom': 'NOM SEUL · SANS ARTICLE',
  'verbe': 'UN SEUL MOT · CONJUGUÉ',
  'adjectif': 'UN SEUL MOT',
  'adverbe': '1 À 2 MOTS',
  'groupe-nominal': 'GROUPE NOMINAL',
  'groupe-verbal': 'GROUPE VERBAL',
  'proposition': 'PROPOSITION',
  'libre': 'VERS LIBRE',
  'article-adj': 'ARTICLE + ADJECTIF · 2 MOTS',
}

const TOOL_ORDER: Tool[] = ['pencil', 'pen', 'marker', 'brush', 'crayon', 'eraser']
const TOOL_NAMES: Record<Tool, string> = { pencil: 'Crayon', pen: 'Stylo', marker: 'Feutre', brush: 'Pinceau', crayon: 'Craie', eraser: 'Gomme' }
const DRAW_SIZES_FULL = [1.5, 4, 9, 17, 28]
const DRAW_PALETTE = [
  '#000000', '#1a1a1a', '#444444', '#777777', '#aaaaaa', '#cccccc', '#e8e8e8', '#ffffff',
  '#7B0000', '#C62828', '#EF5350', '#E65100', '#FB8C00', '#F9A825', '#558B2F', '#1B5E20',
  '#002FA7', '#1565C0', '#0288D1', '#006064', '#004D40', '#6A1B9A', '#AD1457', '#880E4F',
  '#4E342E', '#795548', '#546E7A', '#37474F', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5',
]
const RACCORD_H = 80
const CANVAS_BG = '#fdf8f2'
const UNDO_MAX = 20
const TOOLBAR_H = 218

function IconPencil({ tint, nib }: { tint: string; nib: string }) {
  return (
    <svg width="22" height="40" viewBox="0 0 22 40" fill="none">
      <rect x="7" y="3" width="8" height="24" rx="1.5" fill={tint} />
      <rect x="9.4" y="3" width="3.2" height="24" fill={tint} opacity="0.55" />
      <path d="M7 27 L15 27 L11.6 36 Z" fill="#e8c79a" />
      <path d="M9.6 33 L11 36 L13.4 33 Z" fill={nib} />
      <rect x="7" y="3" width="8" height="3" rx="1.5" fill={tint} opacity="0.6" />
    </svg>
  )
}

function IconPen({ tint, nib }: { tint: string; nib: string }) {
  return (
    <svg width="22" height="40" viewBox="0 0 22 40" fill="none">
      <rect x="7.5" y="2" width="7" height="22" rx="3.5" fill={tint} />
      <rect x="11" y="4" width="2.4" height="16" rx="1.2" fill="#ffffff" opacity="0.22" />
      <path d="M7.5 23 L14.5 23 L11 35 Z" fill={tint} />
      <path d="M10.2 31.5 L11 35 L11.8 31.5 Z" fill={nib} />
      <circle cx="11" cy="36.4" r="1.1" fill={nib} />
    </svg>
  )
}

function IconMarker({ tint, nib }: { tint: string; nib: string }) {
  return (
    <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="4" fill={tint} />
      <rect x="6.5" y="6" width="11" height="2.4" rx="1.2" fill="#ffffff" opacity="0.2" />
      <rect x="7" y="21" width="10" height="6" rx="1.5" fill={tint} opacity="0.8" />
      <path d="M7 27 L17 27 L14.5 36 L9.5 36 Z" fill={nib} />
    </svg>
  )
}

function IconBrush({ tint, nib }: { tint: string; nib: string }) {
  return (
    <svg width="22" height="40" viewBox="0 0 22 40" fill="none">
      <rect x="9" y="2" width="4" height="16" rx="2" fill={tint} />
      <rect x="7.5" y="17" width="7" height="5" rx="1" fill="#b8b0a4" />
      <rect x="7.5" y="17.5" width="7" height="1.6" fill="#ffffff" opacity="0.3" />
      <path d="M8 22 Q11 21 14 22 L12.4 34 Q11 37 9.6 34 Z" fill={nib} />
    </svg>
  )
}

function IconCrayon({ tint, nib }: { tint: string; nib: string }) {
  return (
    <svg width="22" height="40" viewBox="0 0 22 40" fill="none">
      <rect x="6" y="8" width="10" height="26" rx="2.5" fill={nib} />
      <rect x="6" y="8" width="3.2" height="26" rx="2.5" fill="#ffffff" opacity="0.22" />
      <rect x="6" y="8" width="10" height="4" rx="2.5" fill={tint} opacity="0.35" />
      <rect x="6" y="31" width="10" height="3" rx="1.5" fill="#000000" opacity="0.12" />
    </svg>
  )
}

function IconEraser({ tint }: { tint: string; nib: string }) {
  return (
    <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
      <g transform="rotate(-18 14 22)">
        <rect x="7" y="12" width="14" height="20" rx="3" fill="#f3a9b8" />
        <rect x="7" y="12" width="14" height="8" rx="3" fill={tint} opacity="0.85" />
        <rect x="7" y="19.5" width="14" height="1.8" fill={tint} opacity="0.3" />
      </g>
    </svg>
  )
}

const TOOL_ICONS = { pencil: IconPencil, pen: IconPen, marker: IconMarker, brush: IconBrush, crayon: IconCrayon, eraser: IconEraser }

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

function OnlineDrawingCanvas({ onSubmit, accent, encre, raccordPrev }: {
  onSubmit: (jsonData: string) => Promise<void>
  accent: string
  encre: string
  raccordPrev: BandeData | null
}) {
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const velocityRef = useRef(0)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)
  const undoStackRef = useRef<ImageData[]>([])
  const redoStackRef = useRef<ImageData[]>([])
  const [, setHistoryTick] = useState(0)
  const bumpHistory = useCallback(() => setHistoryTick(t => t + 1), [])

  const [tool, setTool] = useState<Tool>('pencil')
  const [sizeIdx, setSizeIdx] = useState(1)
  const [color, setColor] = useState('#1a1410')
  const [opacity, setOpacity] = useState(1)
  const [panMode, setPanMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const zoomRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [busy, setBusy] = useState(false)
  const raccordInitRef = useRef(false)

  // Prevent iOS swipe-back on the canvas area
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

  // Initialize canvas once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || raccordInitRef.current) return
    raccordInitRef.current = true
    const dpr = window.devicePixelRatio || 1
    const cssW = container.offsetWidth
    const cssH = container.offsetHeight
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const initHistory = () => {
      undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
      redoStackRef.current = []
      bumpHistory()
    }

    if (raccordPrev) {
      const prevDpr = raccordPrev.dpr ?? 1
      const RACCORD_H_phys = RACCORD_H * dpr
      const MARGE_phys = 24 * prevDpr
      const cropH_prev = Math.min(
        Math.ceil(raccordPrev.lowestDrawnFraction * raccordPrev.height) + MARGE_phys,
        raccordPrev.height,
      )
      const srcY = Math.max(0, cropH_prev - RACCORD_H * prevDpr)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, srcY, raccordPrev.width, RACCORD_H * prevDpr, 0, 0, canvas.width, RACCORD_H_phys)
        const grad = ctx.createLinearGradient(0, 0, 0, RACCORD_H_phys)
        grad.addColorStop(0, 'rgba(253,248,242,0)')
        grad.addColorStop(0.7, 'rgba(253,248,242,0)')
        grad.addColorStop(1, 'rgba(253,248,242,1)')
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, RACCORD_H_phys)
        ctx.restore()
        initHistory()
      }
      img.src = raccordPrev.imageDataUrl
    } else {
      initHistory()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function getCanvasCoords(clientX: number, clientY: number) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function saveSnapshot() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStackRef.current.push(snap)
    if (undoStackRef.current.length > UNDO_MAX) undoStackRef.current.splice(0, undoStackRef.current.length - UNDO_MAX)
    redoStackRef.current = []
    bumpHistory()
  }

  const undo = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas || undoStackRef.current.length <= 1) return
    const ctx = canvas.getContext('2d')!
    const popped = undoStackRef.current.pop()!
    redoStackRef.current.push(popped)
    if (redoStackRef.current.length > UNDO_MAX) redoStackRef.current.splice(0, redoStackRef.current.length - UNDO_MAX)
    ctx.putImageData(undoStackRef.current[undoStackRef.current.length - 1], 0, 0)
    bumpHistory()
  }, [bumpHistory])

  const redo = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas || redoStackRef.current.length === 0) return
    const ctx = canvas.getContext('2d')!
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    if (undoStackRef.current.length > UNDO_MAX) undoStackRef.current.splice(0, undoStackRef.current.length - UNDO_MAX)
    ctx.putImageData(next, 0, 0)
    bumpHistory()
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

  const draw = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const pos = getCanvasCoords(clientX, clientY)
    const prev = lastPos.current ?? pos
    const size = DRAW_SIZES_FULL[sizeIdx] * dpr
    const dx = pos.x - prev.x, dy = pos.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const op = opacity

    if (tool === 'eraser') {
      ctx.strokeStyle = CANVAS_BG; ctx.lineWidth = size * 2.8; ctx.globalAlpha = 1
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    } else if (tool === 'pen') {
      velocityRef.current = velocityRef.current * 0.55 + dist * 0.45
      const dynamicW = size * Math.max(0.35, 1.0 - velocityRef.current * 0.018)
      ctx.strokeStyle = color; ctx.lineWidth = dynamicW; ctx.globalAlpha = op
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    } else if (tool === 'pencil') {
      const baseW = Math.max(size * 0.55, 0.8 * dpr)
      ctx.strokeStyle = color; ctx.lineWidth = baseW; ctx.globalAlpha = 0.5 * op
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
      const grains = Math.ceil(Math.max(dist, 3))
      for (let g = 0; g < grains; g++) {
        const t = g / grains
        const gx = prev.x + dx * t + (Math.random() - 0.5) * baseW * 1.4
        const gy = prev.y + dy * t + (Math.random() - 0.5) * baseW * 1.4
        ctx.fillStyle = color; ctx.globalAlpha = (0.05 + Math.random() * 0.12) * op
        ctx.beginPath(); ctx.arc(gx, gy, Math.random() * 0.7 * dpr, 0, Math.PI * 2); ctx.fill()
      }
    } else if (tool === 'brush') {
      const angle = Math.atan2(dy, dx) + Math.PI / 2
      for (let b = 0; b < 12; b++) {
        const t = b / 11 - 0.5
        const spread = size * 0.9
        const ox = Math.cos(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        const oy = Math.sin(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        ctx.strokeStyle = color; ctx.lineWidth = (0.35 + Math.random() * 0.9) * dpr
        ctx.globalAlpha = (0.22 + Math.random() * 0.52) * op
        ctx.beginPath(); ctx.moveTo(prev.x + ox, prev.y + oy); ctx.lineTo(pos.x + ox, pos.y + oy); ctx.stroke()
      }
    } else if (tool === 'marker') {
      ctx.strokeStyle = color; ctx.lineWidth = size * 2.6; ctx.lineCap = 'square'
      ctx.globalAlpha = 0.35 * op
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    } else if (tool === 'crayon') {
      const numGrains = Math.ceil(Math.max(dist * 0.9, 5) * 1.8)
      for (let g = 0; g < numGrains; g++) {
        const t = Math.random()
        const gx = prev.x + dx * t + (Math.random() - 0.5) * size * 1.1
        const gy = prev.y + dy * t + (Math.random() - 0.5) * size * 1.1
        ctx.fillStyle = color; ctx.globalAlpha = (0.04 + Math.random() * 0.20) * op
        ctx.beginPath(); ctx.arc(gx, gy, Math.random() * 1.4 * dpr, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
    lastPos.current = pos
  }, [tool, sizeIdx, color, opacity])

  function onPointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      if (panMode) { isDrawing.current = false }
      else {
        isDrawing.current = true; velocityRef.current = 0
        lastPos.current = getCanvasCoords(e.clientX, e.clientY)
        draw(e.clientX, e.clientY)
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
    const wasDrawing = isDrawing.current && pointersRef.current.size === 1
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      if (wasDrawing) saveSnapshot()
      isDrawing.current = false; lastPos.current = null
      lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  async function valider() {
    const canvas = canvasRef.current; if (!canvas || busy) return
    setBusy(true)
    const ctx = canvas.getContext('2d')!
    const lowestDrawnFraction = findLowestDrawnFraction(ctx, canvas.width, canvas.height)
    const dpr = window.devicePixelRatio || 1
    const data: BandeData = {
      imageDataUrl: canvas.toDataURL('image/png'),
      lowestDrawnFraction,
      width: canvas.width,
      height: canvas.height,
      dpr,
    }
    await onSubmit(JSON.stringify(data))
    setBusy(false)
  }

  const canUndo = undoStackRef.current.length > 1
  const canRedo = redoStackRef.current.length > 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: CANVAS_BG, display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      {/* Canvas area */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: CANVAS_BG, touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onPointerCancel={onPointerUp}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin: 'center center', width: '100%', height: '100%' }}>
          <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: panMode ? 'grab' : (tool === 'eraser' ? 'cell' : 'crosshair') }} />
        </div>

        {raccordPrev && (
          <div style={{ position: 'absolute', top: RACCORD_H, left: 0, right: 0, height: 1, background: `linear-gradient(to right,transparent,${accent}55 15%,${accent}55 85%,transparent)`, pointerEvents: 'none', zIndex: 5 }}>
            <span style={{ position: 'absolute', right: 8, top: -12, ...mono, fontSize: 7, color: accent, background: `${CANVAS_BG}ee`, padding: '1px 6px' }}>← RACCORD</span>
          </div>
        )}

        {zoom > 1.05 && (
          <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0 }}
            style={{ position: 'absolute', top: 10, right: 10, ...mono, fontSize: 12, color: '#1a1208', background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(15,8,5,0.2)', padding: '4px 10px', cursor: 'pointer', zIndex: 10 }}>
            ↺ {Math.round(zoom * 100)}%
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ height: TOOLBAR_H, flexShrink: 0, zIndex: 20, background: '#f0e9df', boxShadow: '0 -2px 20px rgba(15,8,5,0.10)', borderRadius: '18px 18px 0 0', padding: '12px 16px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Tools row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            {TOOL_ORDER.map(t => {
              const active = tool === t
              const Icon = TOOL_ICONS[t]
              const TOOLBAR_INK = '#1a1208'
              const nib = t === 'eraser' ? '#f3a9b8' : color
              return (
                <button key={t} onClick={() => setTool(t)} aria-pressed={active} title={TOOL_NAMES[t]}
                  style={{ flex: '0 0 auto', width: 52, height: 62, paddingTop: 6, paddingBottom: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: active ? '#ffffff' : 'transparent', border: 'none', borderRadius: 12, cursor: 'pointer', opacity: active ? 1 : 0.42 }}>
                  <Icon tint={TOOLBAR_INK} nib={nib} />
                  <span style={{ ...mono, fontSize: 7, color: active ? accent : TOOLBAR_INK, letterSpacing: '0.08em' }}>{TOOL_NAMES[t].toUpperCase()}</span>
                </button>
              )
            })}
          </div>
          <div style={{ width: 1, height: 38, background: 'rgba(15,8,5,0.12)', flexShrink: 0 }} />
          <button onClick={() => setShowColorPanel(true)} aria-label="Choisir une couleur"
            style={{ width: 44, height: 44, borderRadius: '50%', background: tool === 'eraser' ? '#f0ede8' : color, border: `2px solid ${tool === 'eraser' ? 'rgba(15,8,5,0.2)' : (color === '#ffffff' ? 'rgba(15,8,5,0.3)' : 'transparent')}`, boxShadow: '0 1px 6px rgba(0,0,0,0.18)', cursor: 'pointer', flexShrink: 0 }} />
        </div>

        {/* Opacity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: 7, color: `${encre}45`, flexShrink: 0, width: 44 }}>OPACITÉ</span>
          <input type="range" min={10} max={100} step={5} value={Math.round(opacity * 100)} onChange={e => setOpacity(Number(e.target.value) / 100)} aria-label="Opacité du trait" disabled={tool === 'eraser'} style={{ flex: 1, accentColor: accent, cursor: tool === 'eraser' ? 'default' : 'pointer', opacity: tool === 'eraser' ? 0.35 : 1 }} />
          <span style={{ ...mono, fontSize: 10, color: encre, opacity: 0.7, width: 34, textAlign: 'right' }}>{Math.round(opacity * 100)}%</span>
        </div>

        {/* Sizes + undo/redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ ...mono, fontSize: 7, color: `${encre}45`, flexShrink: 0, width: 32 }}>TAILLE</span>
          <div style={{ display: 'flex', flex: 1, gap: 4, alignItems: 'center' }}>
            {DRAW_SIZES_FULL.map((sz, i) => (
              <button key={i} onClick={() => setSizeIdx(i)} aria-pressed={sizeIdx === i}
                style={{ flex: 1, height: 34, background: sizeIdx === i ? '#f5f0ea' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: Math.min(sz * 0.7 + 3, 22), height: Math.min(sz * 0.7 + 3, 22), borderRadius: '50%', background: sizeIdx === i ? (tool === 'eraser' ? encre : color) : `${encre}55` }} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            <button onClick={undo} disabled={!canUndo} aria-label="Annuler" title="Ctrl+Z"
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: canUndo ? `${accent}18` : 'transparent', color: canUndo ? accent : encre, opacity: canUndo ? 1 : 0.35, fontSize: 18, cursor: canUndo ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↩</button>
            <button onClick={redo} disabled={!canRedo} aria-label="Rétablir" title="Ctrl+Shift+Z"
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: canRedo ? `${accent}18` : 'transparent', color: canRedo ? accent : encre, opacity: canRedo ? 1 : 0.35, fontSize: 18, cursor: canRedo ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↪</button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPanMode(p => !p)} aria-pressed={panMode} aria-label={panMode ? 'Retour au dessin' : 'Naviguer'}
            style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: panMode ? `${accent}18` : 'transparent', color: panMode ? accent : `${encre}45`, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: panMode ? `1.5px solid ${accent}40` : 'none' }}>✥</button>
          <div style={{ flex: 1 }} />
          <button onClick={valider} disabled={busy}
            style={{ ...mono, fontSize: 13, background: busy ? `${accent}80` : accent, color: '#0f0805', border: 'none', cursor: busy ? 'wait' : 'pointer', padding: '10px 24px', borderRadius: 10, letterSpacing: '0.16em' }}>
            {busy ? 'ENVOI…' : 'SOUMETTRE →'}
          </button>
        </div>
      </div>

      {/* Color panel */}
      <AnimatePresence>
        {showColorPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowColorPanel(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.2)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 400 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#ffffff', borderRadius: '20px 20px 0 0', padding: '0 16px 24px', boxShadow: '0 -4px 32px rgba(0,0,0,0.16)' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#ddd', margin: '12px auto 16px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: color, border: `1px solid ${encre}20`, flexShrink: 0 }} />
                <span style={{ ...mono, fontSize: 12, color: encre, flex: 1, opacity: 0.85 }}>COULEUR PERSONNALISÉE</span>
                <input type="color" value={color} onChange={e => { setColor(e.target.value); if (tool === 'eraser') setTool('pen') }}
                  style={{ width: 36, height: 36, padding: 3, border: `1px solid ${encre}20`, borderRadius: 8, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: 14 }}>
                {DRAW_PALETTE.map(col => (
                  <button key={col} onClick={() => { setColor(col); if (tool === 'eraser') setTool('pen'); setShowColorPanel(false) }}
                    style={{ height: 32, borderRadius: 6, background: col, border: color === col ? `2.5px solid ${accent}` : ['#ffffff', '#e8e8e8', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5'].includes(col) ? `1px solid ${encre}22` : '2.5px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <button onClick={() => setShowColorPanel(false)}
                style={{ width: '100%', padding: '12px', ...mono, fontSize: 13, background: '#f5f0ea', color: encre, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                FERMER
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

async function callClaude(consigne: string, type: string, eviter?: string[]): Promise<string> {
  try {
    const r = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consigne, type, eviter }),
    })
    if (!r.ok) return ''
    const { texte } = await r.json()
    return texte ?? ''
  } catch { return '' }
}

export default function JeuOnline() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const bg = c?.bg ?? '#fdf8f2'
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const { user, profile, loading: authLoading } = useAuth()
  const { jouer } = useSound()
  const prevContribCountRef = useRef(0)
  const contribInitializedRef = useRef(false)

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [myPlayer, setMyPlayer] = useState<RoomPlayer | null>(null)
  const [myContrib, setMyContrib] = useState<string | null>(null)

  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [reconnectTick, setReconnectTick] = useState(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [tick, setTick] = useState(0)
  const autoSubmittedRef = useRef(false)
  const turnStartedAtRef = useRef<number>(Date.now())
  const inputRef = useRef<string>('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showLastWord, setShowLastWord] = useState(false)

  const isSpectator = !!room && !!user && !!players.length && !myPlayer

  // ── Stable player ordering ──────────────────────────────────────────────────
  // Derive turn order from joined_at. The host assigns order_index in Salon but RLS
  // only allows each player to update their own row, so other rows stay null.
  // Using joined_at (a fixed server timestamp) gives identical ordering on every client.
  const orderedPlayers = [...players].sort((a, b) => {
    const ao = a.order_index, bo = b.order_index
    if (ao != null && bo != null && ao !== bo) return ao - bo
    const aj = a.joined_at ?? '', bj = b.joined_at ?? ''
    if (aj !== bj) return aj < bj ? -1 : 1
    return a.player_id < b.player_id ? -1 : 1
  })
  const myIndex = user ? orderedPlayers.findIndex(p => p.player_id === user.id) : -1
  const myEffectiveIndex = myIndex >= 0 ? myIndex : null

  // ── Turn state (round-robin) ────────────────────────────────────────────────
  const structure = room ? getStructure(room.structure_id) : null
  const nbTotal = !room ? 0
    : room.mode === 'dessin'
      ? (room.nb_cases ?? players.length)
      : (room.nb_cases ?? (structure ? nombreCasesEffectif(structure) : 0))
  const currentCase = contributions.length
  const whoseTurnIdx = orderedPlayers.length > 0 ? currentCase % orderedPlayers.length : 0
  const currentTurnPlayer = orderedPlayers[whoseTurnIdx] ?? null

  // Écrit: my turn = round-robin reaches my position
  const isMyTurnEcrit = room?.mode === 'ecrit' && !submitted
    && myEffectiveIndex !== null && orderedPlayers.length > 0
    && myEffectiveIndex === whoseTurnIdx && currentCase < nbTotal

  // Dessin: turn-based — one player at a time, in order, each draws exactly once
  const isMyTurnDessin = room?.mode === 'dessin' && !submitted
    && myEffectiveIndex !== null && orderedPlayers.length > 0
    && myEffectiveIndex === whoseTurnIdx && currentCase < nbTotal

  const caseDef = isMyTurnEcrit && structure && currentCase < structure.cases.length
    ? structure.cases[currentCase]
    : null

  // Show last word of previous fragment (écrit only, skip JSON/image data)
  const prevFragment = contributions.find(c => c.case_index === currentCase - 1)
  const prevLastWord = prevFragment
    && !prevFragment.texte.startsWith('data:')
    && !prevFragment.texte.startsWith('{')
    ? prevFragment.texte.trim().split(/\s+/).pop() ?? ''
    : ''

  // Raccord for dessin: previous band's BandeData
  const raccordForDessin: BandeData | null = (() => {
    if (!room || room.mode !== 'dessin' || currentCase === 0) return null
    const prev = contributions[currentCase - 1]
    if (!prev?.texte) return null
    try { return JSON.parse(prev.texte) as BandeData } catch { return null }
  })()

  const loadGame = useCallback(async () => {
    if (!code || !user) return
    const { data: r } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (!r) { navigate('/online'); return }
    if (r.status === 'finished') { navigate(`/fin-online/${code}`); return }
    setRoom(r)

    const { data: ps } = await supabase.from('room_players').select('*').eq('room_code', code).order('joined_at')
    const pList = (ps ?? []) as RoomPlayer[]
    setPlayers(pList)
    const me = pList.find(p => p.player_id === user.id)
    setMyPlayer(me ?? null)

    const { data: cs } = await supabase.from('contributions')
      .select('case_index,texte,player_id').eq('room_code', code).order('case_index')
    const cList = (cs ?? []) as Contribution[]
    setContributions(cList)

    const ordered = [...pList].sort((a, b) => {
      const ao = a.order_index, bo = b.order_index
      if (ao != null && bo != null && ao !== bo) return ao - bo
      const aj = a.joined_at ?? '', bj = b.joined_at ?? ''
      if (aj !== bj) return aj < bj ? -1 : 1
      return a.player_id < b.player_id ? -1 : 1
    })
    const myIdx2 = ordered.findIndex(p => p.player_id === user.id)

    if (r.mode === 'dessin') {
      const mine = cList.find(c => c.player_id === user.id)
      if (mine) { setMyContrib(mine.texte); setSubmitted(true) }
    } else {
      if (myIdx2 >= 0 && pList.length > 0) {
        const roundStart = Math.floor(cList.length / pList.length) * pList.length
        const myExpectedCase = roundStart + myIdx2
        const alreadySubmitted = cList.some(c => c.case_index === myExpectedCase && c.player_id === user.id)
        if (alreadySubmitted) {
          setSubmitted(true)
          const myContribForCase = cList.find(c => c.case_index === myExpectedCase && c.player_id === user.id)
          if (myContribForCase) setMyContrib(myContribForCase.texte)
        } else {
          const mine = cList.filter(c => c.player_id === user.id)
          if (mine.length > 0) setMyContrib(mine[mine.length - 1].texte)
        }
      }
    }
  }, [code, user, navigate])

  useEffect(() => {
    if (!authLoading && !user) { navigate('/online'); return }
    if (!authLoading && user) loadGame()
  }, [authLoading, user, loadGame])

  useEffect(() => {
    if (!code) return
    setConnectionStatus('connecting')
    const channel = supabase.channel(`jeu-online-${code}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `room_code=eq.${code}` },
        (payload) => {
          const newC = payload.new as Contribution
          setContributions(prev => {
            if (prev.find(c => c.case_index === newC.case_index)) return prev
            return [...prev, newC].sort((a, b) => a.case_index - b.case_index)
          })
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          const r = payload.new as Room
          if (r.status === 'finished') navigate(`/fin-online/${code}`)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setConnectionStatus('connected'); loadGame() }
        else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') setConnectionStatus('disconnected')
      })
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [code, navigate, loadGame, reconnectTick])

  useEffect(() => {
    if (connectionStatus !== 'disconnected') return
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionStatus('connecting')
      setReconnectTick(t => t + 1)
    }, 1500)
    return () => {
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null }
    }
  }, [connectionStatus])

  // Polling fallback: re-sync every 3s in case a Realtime event was missed
  useEffect(() => {
    if (!code || !user) return
    const id = setInterval(async () => {
      const { data: cs } = await supabase.from('contributions')
        .select('case_index,texte,player_id').eq('room_code', code).order('case_index')
      if (cs) setContributions(cs as Contribution[])
      const { data: r } = await supabase.from('rooms').select('status,nb_cases').eq('code', code).single()
      if (r?.status === 'finished') navigate(`/fin-online/${code}`)
      if (r?.nb_cases != null) setRoom(prev => prev ? { ...prev, nb_cases: r.nb_cases } : prev)
    }, 3000)
    return () => clearInterval(id)
  }, [code, user, navigate])

  // Game complete → reveal. Every client navigates locally to avoid dependency on realtime.
  useEffect(() => {
    if (!room || !players.length || !nbTotal) return
    if (contributions.length >= nbTotal) {
      if (room.host_id === user?.id && room.status === 'playing') {
        supabase.from('rooms').update({ status: 'finished' }).eq('code', code ?? '')
      }
      navigate(`/fin-online/${code}`)
    }
  }, [contributions.length, players.length, room, code, user, nbTotal, navigate])

  useEffect(() => { setShowLastWord(false) }, [currentCase])

  // Écrit: reset "submitted" when the round-robin returns to my position
  useEffect(() => {
    if (!submitted || !room || room.mode !== 'ecrit') return
    if (!orderedPlayers.length || myEffectiveIndex === null || !nbTotal) return
    const currCase = contributions.length
    if (currCase >= nbTotal) return
    if (myEffectiveIndex === currCase % orderedPlayers.length) {
      setSubmitted(false)
      setInput('')
      autoSubmittedRef.current = false
    }
  }, [contributions.length, submitted, orderedPlayers.length, myEffectiveIndex, room, nbTotal])

  const mergeContribution = useCallback((c: Contribution) => {
    setContributions(prev =>
      prev.find(x => x.case_index === c.case_index)
        ? prev
        : [...prev, c].sort((a, b) => a.case_index - b.case_index)
    )
  }, [])

  async function handleIa() {
    if (!caseDef) return
    setIaLoading(true)
    // Anti-répétition : mots déjà soumis dans la partie (on ignore les bandes dessin)
    const eviter = contributions
      .filter(c => !c.texte.startsWith('data:') && !c.texte.startsWith('{'))
      .flatMap(c => c.texte.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? [])
      .filter(m => m.length > 2)
    const texte = await callClaude(caseDef.consigne, caseDef.type, eviter)
    if (texte) setInput(texte)
    setIaLoading(false)
    jouer('ia')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !user || !code || !isMyTurnEcrit) return
    setSubmitting(true)
    setSubmitError(null)
    const { error } = await supabase.from('contributions').insert({
      room_code: code, player_id: user.id, case_index: currentCase, texte: input.trim(),
    })
    if (!error) {
      mergeContribution({ case_index: currentCase, texte: input.trim(), player_id: user.id })
      setMyContrib(input.trim())
      setSubmitted(true)
      jouer('soumettre')
    } else {
      setSubmitError('Erreur lors de l\'envoi. Réessayez.')
    }
    setSubmitting(false)
  }

  async function handleDrawingSubmit(jsonData: string) {
    if (!user || !code) return
    if (contributions.some(c => c.case_index === currentCase && c.player_id === user.id)) return
    const { error } = await supabase.from('contributions').insert({
      room_code: code, player_id: user.id, case_index: currentCase, texte: jsonData,
    })
    if (!error) {
      mergeContribution({ case_index: currentCase, texte: jsonData, player_id: user.id })
      setMyContrib(jsonData)
      setSubmitted(true)
      jouer('soumettre')
    }
  }

  useEffect(() => {
    const prev = prevContribCountRef.current
    const now = contributions.length
    prevContribCountRef.current = now
    if (!contribInitializedRef.current) { contribInitializedRef.current = true; return }
    if (now > prev && !submitted) {
      jouer('clic')
      if ('vibrate' in navigator) navigator.vibrate(180)
    }
  }, [contributions.length, submitted, jouer])

  useEffect(() => {
    if (!room?.turn_seconds) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [room?.turn_seconds])

  useEffect(() => { turnStartedAtRef.current = Date.now() }, [contributions.length])

  useEffect(() => { inputRef.current = input }, [input])

  const secondsLeft = (() => {
    if (!room?.turn_seconds) return null
    const elapsed = Math.floor((Date.now() - turnStartedAtRef.current) / 1000)
    return Math.max(0, room.turn_seconds - elapsed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })()
  void tick

  useEffect(() => {
    if (isSpectator) return
    if (secondsLeft === null || secondsLeft > 0) return
    if (submitted || autoSubmittedRef.current) return
    if (!(isMyTurnEcrit || isMyTurnDessin)) return
    if (!user || !code) return
    autoSubmittedRef.current = true
    const textToSubmit = inputRef.current.trim() || '…'
    ;(async () => {
      try {
        const { error } = await supabase.from('contributions').insert({
          room_code: code, player_id: user.id, case_index: currentCase, texte: textToSubmit,
        })
        if (!error) {
          mergeContribution({ case_index: currentCase, texte: textToSubmit, player_id: user.id })
          setMyContrib(textToSubmit)
          setSubmitted(true)
          try { jouer('soumettre') } catch {}
        } else { autoSubmittedRef.current = false }
      } catch (e) {
        autoSubmittedRef.current = false
        console.error('Auto-submit erreur:', e)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, submitted, isSpectator, user, code, jouer, isMyTurnEcrit, isMyTurnDessin, currentCase, mergeContribution])

  if (authLoading || !room || (!myPlayer && !isSpectator)) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        {connectionStatus !== 'connected' && (
          <div style={{ position: 'fixed', top: 'max(8px, env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 4, background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)', color: '#fff', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.16em', fontSize: 11, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
            {connectionStatus === 'disconnected' ? '⚠ HORS LIGNE — RECONNEXION…' : '⟳ RECONNEXION…'}
          </div>
        )}
        <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>CHARGEMENT…</span>
      </PageTransition>
    )
  }

  const submitted_count = contributions.length

  // Helper to render the thumbnail of my drawing submission
  const myDrawingPreview = (() => {
    if (!myContrib || room.mode !== 'dessin') return null
    try {
      const d = JSON.parse(myContrib) as BandeData
      return <img src={d.imageDataUrl} alt="votre bande" style={{ width: '100%', maxWidth: 280, borderRadius: 2, border: `1px solid ${accent}30` }} />
    } catch {
      if (myContrib.startsWith('data:')) return <img src={myContrib} alt="votre bande" style={{ width: '100%', maxWidth: 280, borderRadius: 2, border: `1px solid ${accent}30` }} />
      return null
    }
  })()

  const connectionBanner = connectionStatus !== 'connected' && (
    <div style={{ position: 'fixed', top: 'max(8px, env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 4, background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)', color: '#fff', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.16em', fontSize: 11, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
      {connectionStatus === 'disconnected' ? '⚠ HORS LIGNE — RECONNEXION…' : '⟳ RECONNEXION…'}
    </div>
  )

  if (isSpectator) {
    return (
      <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
        <Decor variant="aide" />
        {connectionBanner}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85 }}>{code}</span>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{submitted_count}/{nbTotal} SOUMIS</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 16, marginBottom: 16 }}>👁 SPECTATEUR</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {orderedPlayers.map((p, idx) => {
            const isTheirTurn = idx === whoseTurnIdx && currentCase < nbTotal
            const hasDone = contributions.some(c => c.player_id === p.player_id)
            return (
              <div key={p.player_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', border: `2px solid ${isTheirTurn ? accent : hasDone ? `${accent}50` : `${encre}20`}`, opacity: hasDone || isTheirTurn ? 1 : 0.5, boxShadow: isTheirTurn ? `0 0 8px ${accent}60` : 'none' }}>
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 16, color: accent }}>{p.pseudo[0]?.toUpperCase()}</span></div>}
                </div>
                <span style={{ ...mono, fontSize: 11, color: isTheirTurn ? accent : hasDone ? `${accent}80` : `${encre}50` }}>{isTheirTurn ? '✎' : hasDone ? '✓' : '…'}</span>
              </div>
            )
          })}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {currentTurnPlayer && currentCase < nbTotal && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: encre, opacity: 0.8, textAlign: 'center' }}>
              En attente de <strong>{currentTurnPlayer.pseudo}</strong>…
            </p>
          )}
          <motion.span style={{ fontSize: 22, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
        </div>
      </PageTransition>
    )
  }

  return (
    <>
      <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
        <Decor variant="aide" />
        {connectionBanner}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85 }}>{code}</span>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{submitted_count}/{nbTotal} SOUMIS</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* Player avatars with turn indicator */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {orderedPlayers.map((p, idx) => {
            const isTheirTurn = idx === whoseTurnIdx && currentCase < nbTotal
            const isMe = p.player_id === user?.id
            const hasDone = contributions.some(c => c.player_id === p.player_id)
            return (
              <div key={p.player_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', border: `2px solid ${isTheirTurn ? accent : hasDone ? `${accent}50` : `${encre}20`}`, opacity: hasDone || isTheirTurn ? 1 : 0.5, boxShadow: isTheirTurn ? `0 0 8px ${accent}60` : 'none' }}>
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 16, color: accent }}>{p.pseudo[0]?.toUpperCase()}</span></div>}
                </div>
                <span style={{ ...mono, fontSize: 11, color: isTheirTurn ? accent : `${encre}50` }}>
                  {isMe ? (isTheirTurn ? '✎ VOUS' : submitted ? '✓' : '…') : isTheirTurn ? '✎' : hasDone ? '✓' : '…'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Timer bar */}
        {secondsLeft !== null && room.turn_seconds && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 2, background: `${encre}15`, borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((secondsLeft / room.turn_seconds) * 100)}%`, background: secondsLeft < 30 ? '#b22c20' : accent, transition: 'width 1s linear' }} />
            </div>
            {secondsLeft < 60 && <div style={{ ...mono, fontSize: 12, color: secondsLeft < 30 ? '#b22c20' : accent, marginTop: 4, textAlign: 'right' }}>{secondsLeft}s</div>}
          </div>
        )}

        {/* Main content — dessin drawing is handled by the fixed overlay below */}
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>✓ CONTRIBUTION REÇUE</div>
              {room.mode === 'dessin' ? (
                myDrawingPreview
              ) : myContrib ? (
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: encre, padding: '16px 0', borderTop: `0.5px solid ${encre}20`, borderBottom: `0.5px solid ${encre}20` }}>
                  « {myContrib} »
                </div>
              ) : null}
              {room.mode === 'ecrit' && currentCase < nbTotal ? (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.75, lineHeight: 1.6 }}>
                  C'est au tour de <strong>{currentTurnPlayer?.pseudo ?? '…'}</strong>. Votre tour reviendra ensuite.
                </p>
              ) : (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.75, lineHeight: 1.6 }}>
                  En attente des autres joueurs… La révélation aura lieu lorsque tout le monde aura soumis.
                </p>
              )}
              <motion.span style={{ fontSize: 22, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
            </motion.div>
          ) : isMyTurnEcrit && caseDef ? (
            <motion.div key={`form-${currentCase}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>VOTRE CASE · {currentCase + 1}/{nbTotal}</div>
              <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.75, marginBottom: 4 }}>{TYPE_LABEL[caseDef.type] ?? caseDef.type.toUpperCase()}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: encre, marginBottom: 16, lineHeight: 1.5 }}>
                Écrivez <strong>{caseDef.consigne}</strong>
              </div>

              {currentCase > 0 && prevLastWord && (
                <div style={{ marginBottom: 18 }}>
                  {showLastWord ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ ...mono, fontSize: 11, color: encre, opacity: 0.55 }}>DERNIER MOT&nbsp;:</span>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: accent, fontStyle: 'italic' }}>…{prevLastWord}</span>
                      <button type="button" onClick={() => setShowLastWord(false)} style={{ ...mono, fontSize: 11, color: encre, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>masquer</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowLastWord(true)} style={{ ...mono, fontSize: 12, color: accent, background: 'transparent', border: `0.5px solid ${accent}50`, padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.16em' }}>👁 VOIR LE DERNIER MOT</button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={caseDef.consigne} aria-label={caseDef.consigne} autoFocus
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: encre, background: 'rgba(255,253,247,0.5)', border: 'none', borderLeft: `2px solid ${encre}`, padding: '12px 16px', outline: 'none', caretColor: accent, width: '100%' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={handleIa} disabled={iaLoading}
                    style={{ flex: 1, ...mono, fontSize: 13, padding: '0.7em', background: 'transparent', color: encre, border: `0.5px solid ${encre}30`, cursor: iaLoading ? 'wait' : 'pointer', opacity: iaLoading ? 0.5 : 0.8 }}>
                    {iaLoading ? '…' : '✦ IA'}
                  </button>
                  <button type="submit" disabled={!input.trim() || submitting}
                    style={{ flex: 3, background: input.trim() ? accent : 'transparent', color: input.trim() ? bg : `${encre}40`, ...mono, fontSize: 13, textTransform: 'uppercase', padding: '0.7em 1.5em', border: input.trim() ? 'none' : `1px solid ${encre}30`, cursor: input.trim() && !submitting ? 'pointer' : 'not-allowed' }}>
                    {submitting ? 'ENVOI…' : 'SOUMETTRE →'}
                  </button>
                </div>
                {submitError && <div style={{ ...mono, fontSize: 12, color: '#b22c20', marginTop: 6 }}>{submitError}</div>}
              </form>
            </motion.div>
          ) : (
            <motion.div key="notmyturn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
              {currentTurnPlayer && currentCase < nbTotal ? (
                <>
                  <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, letterSpacing: '0.22em' }}>— EN ATTENTE —</div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: encre, lineHeight: 1.6 }}>C'est le tour de <strong>{currentTurnPlayer.pseudo}</strong>…</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: encre, opacity: 0.55 }}>
                    {room.mode === 'dessin' ? `Bande ${currentCase + 1} sur ${nbTotal}` : `Case ${currentCase + 1} sur ${nbTotal}`}
                  </p>
                </>
              ) : (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: encre, opacity: 0.75 }}>En attente de la partie…</p>
              )}
              <motion.span style={{ fontSize: 22, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </PageTransition>

      {/* Full-screen drawing overlay — rendered outside PageTransition to cover everything */}
      {isMyTurnDessin && (
        <OnlineDrawingCanvas
          onSubmit={handleDrawingSubmit}
          accent={accent}
          encre={encre}
          raccordPrev={raccordForDessin}
        />
      )}
    </>
  )
}
