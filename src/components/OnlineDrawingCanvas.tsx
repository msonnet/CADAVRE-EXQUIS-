import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Tool = 'pencil' | 'pen' | 'marker' | 'brush' | 'crayon' | 'eraser'
const TOOL_ORDER: Tool[] = ['pencil', 'pen', 'marker', 'brush', 'crayon', 'eraser']
const SIZES = [1.5, 4, 9, 17, 28]
const TOOLBAR_H = 218
const RACCORD_H = 80
const CANVAS_BG = '#fdf8f2'

const PALETTE = [
  '#000000', '#1a1a1a', '#444444', '#777777', '#aaaaaa', '#cccccc', '#e8e8e8', '#ffffff',
  '#7B0000', '#C62828', '#EF5350', '#E65100', '#FB8C00', '#F9A825', '#558B2F', '#1B5E20',
  '#002FA7', '#1565C0', '#0288D1', '#006064', '#004D40', '#6A1B9A', '#AD1457', '#880E4F',
  '#4E342E', '#795548', '#546E7A', '#37474F', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5',
]

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
const TOOL_NAMES: Record<Tool, string> = { pencil: 'Crayon', pen: 'Stylo', marker: 'Feutre', brush: 'Pinceau', crayon: 'Craie', eraser: 'Gomme' }

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
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  const [tool, setTool] = useState<Tool>('pencil')
  const [sizeIdx, setSizeIdx] = useState(1)
  const [color, setColor] = useState('#1a1410')
  const [opacity, setOpacity] = useState(1)
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
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const velocityRef = useRef(0)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)
  const undoStackRef = useRef<ImageData[]>([])
  const redoStackRef = useRef<ImageData[]>([])
  const UNDO_MAX = 20

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

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cssW = containerRef.current?.offsetWidth ?? Math.min(window.innerWidth, 500)
    const cssH = containerRef.current?.offsetHeight ?? (window.innerHeight - TOOLBAR_H)
    canvas.width = cssW * dpr; canvas.height = cssH * dpr
    canvas.style.width = `${cssW}px`; canvas.style.height = `${cssH}px`
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = CANVAS_BG; ctx.fillRect(0, 0, canvas.width, canvas.height)

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
        const grad = ctx.createLinearGradient(0, 0, 0, RACCORD_H_phys)
        grad.addColorStop(0, 'rgba(253,248,242,0)')
        grad.addColorStop(0.7, 'rgba(253,248,242,0)')
        grad.addColorStop(1, 'rgba(253,248,242,1)')
        ctx.save(); ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, RACCORD_H_phys); ctx.restore()
        init()
      }
      img.onerror = init
      img.src = raccordDataUrl
    } else { init() }
  }, [raccordDataUrl, bumpHistory])

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

  const draw = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const pos = getCanvasCoords(clientX, clientY)
    const prev = lastPos.current ?? pos
    const size = SIZES[sizeIdx] * dpr
    const dx = pos.x - prev.x; const dy = pos.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const op = opacity

    if (tool === 'eraser') {
      ctx.strokeStyle = CANVAS_BG; ctx.lineWidth = size * 2.8; ctx.globalAlpha = 1
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    } else if (tool === 'pen') {
      velocityRef.current = velocityRef.current * 0.55 + dist * 0.45
      const w = size * Math.max(0.35, 1.0 - velocityRef.current * 0.018)
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = op
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    } else if (tool === 'pencil') {
      const baseW = Math.max(size * 0.55, 0.8 * dpr)
      ctx.strokeStyle = color; ctx.lineWidth = baseW; ctx.globalAlpha = 0.5 * op
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
      const grains = Math.ceil(Math.max(dist, 3))
      for (let g = 0; g < grains; g++) {
        const t = g / grains
        ctx.fillStyle = color; ctx.globalAlpha = (0.05 + Math.random() * 0.12) * op
        ctx.beginPath(); ctx.arc(prev.x + dx * t + (Math.random() - 0.5) * baseW * 1.4, prev.y + dy * t + (Math.random() - 0.5) * baseW * 1.4, Math.random() * 0.7 * dpr, 0, Math.PI * 2); ctx.fill()
      }
    } else if (tool === 'brush') {
      const angle = Math.atan2(dy, dx) + Math.PI / 2
      for (let b = 0; b < 12; b++) {
        const t = b / 11 - 0.5; const spread = size * 0.9
        const ox = Math.cos(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        const oy = Math.sin(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        ctx.strokeStyle = color; ctx.lineWidth = (0.35 + Math.random() * 0.9) * dpr; ctx.globalAlpha = (0.22 + Math.random() * 0.52) * op
        ctx.beginPath(); ctx.moveTo(prev.x + ox, prev.y + oy); ctx.lineTo(pos.x + ox, pos.y + oy); ctx.stroke()
      }
    } else if (tool === 'marker') {
      ctx.strokeStyle = color; ctx.lineWidth = size * 2.6; ctx.lineCap = 'square'; ctx.globalAlpha = 0.35 * op
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    } else if (tool === 'crayon') {
      const ng = Math.ceil(Math.max(dist * 0.9, 5) * 1.8)
      for (let g = 0; g < ng; g++) {
        const t = Math.random()
        ctx.fillStyle = color; ctx.globalAlpha = (0.04 + Math.random() * 0.20) * op
        ctx.beginPath(); ctx.arc(prev.x + dx * t + (Math.random() - 0.5) * size * 1.1, prev.y + dy * t + (Math.random() - 0.5) * size * 1.1, Math.random() * 1.4 * dpr, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore(); lastPos.current = pos
  }, [tool, sizeIdx, color, opacity])

  function onPointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      if (panMode) { isDrawing.current = false }
      else { isDrawing.current = true; velocityRef.current = 0; lastPos.current = getCanvasCoords(e.clientX, e.clientY); draw(e.clientX, e.clientY) }
    } else { isDrawing.current = false; lastPos.current = null; lastPinchDist.current = null; lastPinchMid.current = null }
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
        const as = newZoom / zoomRef.current
        const newPanX = mid.x - (mid.x - panXRef.current) * as + (mid.x - lastPinchMid.current.x)
        const newPanY = mid.y - (mid.y - panYRef.current) * as + (mid.y - lastPinchMid.current.y)
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
    } else if (isDrawing.current) { draw(e.clientX, e.clientY) }
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasDrawing = isDrawing.current && pointersRef.current.size === 1
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      if (wasDrawing) saveSnapshot()
      isDrawing.current = false; lastPos.current = null; lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  async function handleSubmit() {
    const canvas = canvasRef.current; if (!canvas || busy) return
    setBusy(true)
    const json = JSON.stringify({
      imageDataUrl: canvas.toDataURL('image/jpeg', 0.75),
      lowestDrawnFraction: 0.9,
      width: canvas.width,
      height: canvas.height,
      dpr: window.devicePixelRatio || 1,
    })
    await onSubmit(json)
    setBusy(false)
  }

  const canUndo = undoStackRef.current.length > 1
  const canRedo = redoStackRef.current.length > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      style={{ position: 'fixed', inset: 0, background: CANVAS_BG, display: 'flex', flexDirection: 'column' }}>

      {/* Canvas */}
      <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden', background: CANVAS_BG, touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp} onPointerCancel={onPointerUp}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin: 'center center', width: '100%', height: '100%' }}>
          <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: panMode ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair' }} />
        </div>

        {/* Raccord guide */}
        {raccordDataUrl && canvasReady && (
          <div style={{ position: 'absolute', top: RACCORD_H, left: 0, right: 0, height: 1, background: `linear-gradient(to right,transparent,${accent}55 15%,${accent}55 85%,transparent)`, pointerEvents: 'none', zIndex: 5 }}>
            <span style={{ position: 'absolute', right: 8, top: -12, fontFamily: "'Raleway',sans-serif", letterSpacing: '0.18em', fontSize: 13, color: accent, background: `${CANVAS_BG}ee`, padding: '1px 6px' }}>← RACCORD</span>
          </div>
        )}

        {/* Badge */}
        <div style={{ position: 'absolute', top: 10, left: 10, fontFamily: "'Raleway',sans-serif", letterSpacing: '0.18em', fontSize: 13, color: encre, background: 'rgba(255,255,255,0.88)', padding: '4px 10px', border: `0.5px solid ${encre}15`, pointerEvents: 'none' }}>
          BANDE {bandeNum}/{totalBandes}
        </div>

        {zoom > 1.05 && (
          <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0 }}
            style={{ position: 'absolute', top: 10, right: 10, fontFamily: "'Raleway',sans-serif", letterSpacing: '0.18em', fontSize: 13, color: encre, background: 'rgba(255,255,255,0.9)', border: `0.5px solid ${encre}20`, padding: '4px 10px', cursor: 'pointer', zIndex: 10 }}>
            ↺ {Math.round(zoom * 100)}%
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ height: TOOLBAR_H, flexShrink: 0, zIndex: 20, background: '#f0e9df', boxShadow: '0 -2px 20px rgba(15,8,5,0.10)', borderRadius: '18px 18px 0 0', padding: '12px 16px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            {TOOL_ORDER.map(t => {
              const active = tool === t; const Icon = TOOL_ICONS[t]; const INK = '#1a1208'
              return (
                <button key={t} onClick={() => setTool(t)} aria-pressed={active} title={TOOL_NAMES[t]}
                  style={{ flex: '0 0 auto', width: 52, height: 62, paddingTop: 6, paddingBottom: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: active ? '#ffffff' : 'transparent', border: 'none', borderRadius: 12, cursor: 'pointer', opacity: active ? 1 : 0.42 }}>
                  <Icon tint={INK} nib={t === 'eraser' ? '#f3a9b8' : color} />
                  <span style={{ ...mono, fontSize: 13, color: active ? accent : INK, letterSpacing: '0.08em' }}>{TOOL_NAMES[t].toUpperCase()}</span>
                </button>
              )
            })}
          </div>
          <div style={{ width: 1, height: 38, background: `${encre}12`, flexShrink: 0 }} />
          <button onClick={() => setShowColorPanel(true)} aria-label="Choisir une couleur"
            style={{ width: 44, height: 44, borderRadius: '50%', background: tool === 'eraser' ? '#f0ede8' : color, border: `2px solid ${tool === 'eraser' ? `${encre}20` : color === '#ffffff' ? `${encre}30` : 'transparent'}`, boxShadow: '0 1px 6px rgba(0,0,0,0.18)', cursor: 'pointer', flexShrink: 0 }} />
        </div>

        {/* Opacity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: 13, color: `${encre}45`, flexShrink: 0, width: 44 }}>OPACITÉ</span>
          <input type="range" min={10} max={100} step={5} value={Math.round(opacity * 100)} onChange={e => setOpacity(Number(e.target.value) / 100)} disabled={tool === 'eraser'}
            style={{ flex: 1, accentColor: accent, opacity: tool === 'eraser' ? 0.35 : 1 }} />
          <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, width: 34, textAlign: 'right' }}>{Math.round(opacity * 100)}%</span>
        </div>

        {/* Sizes + undo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ ...mono, fontSize: 13, color: `${encre}45`, flexShrink: 0, width: 32 }}>TAILLE</span>
          <div style={{ display: 'flex', flex: 1, gap: 4, alignItems: 'center' }}>
            {SIZES.map((sz, i) => (
              <button key={i} onClick={() => setSizeIdx(i)} aria-pressed={sizeIdx === i}
                style={{ flex: 1, height: 34, background: sizeIdx === i ? '#f5f0ea' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: Math.min(sz * 0.7 + 3, 22), height: Math.min(sz * 0.7 + 3, 22), borderRadius: '50%', background: sizeIdx === i ? (tool === 'eraser' ? encre : color) : `${encre}55` }} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {([{ fn: undo, can: canUndo, icon: '↩', label: 'Annuler' }, { fn: redo, can: canRedo, icon: '↪', label: 'Rétablir' }] as const).map(({ fn, can, icon, label }) => (
              <button key={label} onClick={fn} disabled={!can} aria-label={label}
                style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: can ? `${accent}18` : 'transparent', color: can ? accent : encre, opacity: can ? 1 : 0.35, fontSize: 18, cursor: can ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPanMode(p => !p)} aria-pressed={panMode}
            style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: panMode ? `${accent}18` : 'transparent', color: panMode ? accent : `${encre}45`, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: panMode ? `1.5px solid ${accent}40` : 'none' }}>✥</button>
          <div style={{ flex: 1 }} />
          <button onClick={handleSubmit} disabled={busy}
            style={{ ...mono, fontSize: 17, background: encre, color: bg, border: 'none', cursor: busy ? 'wait' : 'pointer', padding: '10px 24px', borderRadius: 10, letterSpacing: '0.16em', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'ENVOI…' : 'VALIDER →'}
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
                <span style={{ ...mono, fontSize: 13, color: encre, flex: 1, opacity: 0.85 }}>COULEUR PERSONNALISÉE</span>
                <input type="color" value={color} onChange={e => { setColor(e.target.value); if (tool === 'eraser') setTool('pen') }}
                  style={{ width: 36, height: 36, padding: 3, border: `1px solid ${encre}20`, borderRadius: 8, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5, marginBottom: 14 }}>
                {PALETTE.map(col => (
                  <button key={col} onClick={() => { setColor(col); if (tool === 'eraser') setTool('pen'); setShowColorPanel(false) }}
                    style={{ height: 32, borderRadius: 6, background: col, border: color === col ? `2.5px solid ${accent}` : ['#ffffff','#e8e8e8','#f0e4cc','#FFF9C4','#FCE4EC','#F3E5F5'].includes(col) ? `1px solid ${encre}22` : '2.5px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <button onClick={() => setShowColorPanel(false)} style={{ width: '100%', padding: '12px', ...mono, fontSize: 13, background: '#f5f0ea', color: encre, border: 'none', borderRadius: 10, cursor: 'pointer' }}>FERMER</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
