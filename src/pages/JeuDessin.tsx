import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useReve } from '../reve'
import { useAmbiance } from '../hooks/useAmbiance'
import type { ConfigDessin, BandeDessin } from '../types'

type Tool = 'pen' | 'brush' | 'marker' | 'crayon' | 'eraser'
const SIZES = [1.5, 4, 9, 17, 28]

// Palette 32 couleurs : 4 rangées × 8
const PALETTE = [
  '#000000', '#222222', '#555555', '#888888', '#aaaaaa', '#cccccc', '#eeeeee', '#ffffff',
  '#7B0000', '#C62828', '#EF5350', '#E65100', '#FB8C00', '#F9A825', '#558B2F', '#1B5E20',
  '#002FA7', '#1565C0', '#0288D1', '#006064', '#004D40', '#6A1B9A', '#AD1457', '#880E4F',
  '#4E342E', '#795548', '#546E7A', '#37474F', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5',
]

const TOOL_ICONS: Record<Tool, string> = {
  pen: '✒',
  brush: '⌬',
  marker: '▮',
  crayon: '✏',
  eraser: '◻',
}
const TOOL_LABELS: Record<Tool, string> = {
  pen: 'Stylo',
  brush: 'Pinceau',
  marker: 'Marqueur',
  crayon: 'Crayon',
  eraser: 'Gomme',
}

const TOOLBAR_H = 200

function findLowestDrawnFraction(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h).data
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i] < 248 || data[i + 1] < 248 || data[i + 2] < 248) return y / h
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
  const [showRaccord, setShowRaccord] = useState(false)
  const [raccordOpacity, setRaccordOpacity] = useState(1)
  const [raccordImgStyle, setRaccordImgStyle] = useState({ top: 0, height: 60 })
  const [canvasReady, setCanvasReady] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [nextPlayerNum, setNextPlayerNum] = useState(2)
  const [pendingBandes, setPendingBandes] = useState<BandeDessin[]>([])

  // Zoom/pan
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const raccordTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)

  const joueurActuel = (bandeIdx % config.joueurs) + 1

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: 'monospace', letterSpacing: '0.18em' }

  // Prévenir swipe-back iOS pendant le dessin
  useEffect(() => {
    const prevent = (e: TouchEvent) => { e.preventDefault() }
    const opts: AddEventListenerOptions = { passive: false }
    document.addEventListener('touchstart', prevent, opts)
    document.addEventListener('touchmove', prevent, opts)
    return () => {
      document.removeEventListener('touchstart', prevent, opts)
      document.removeEventListener('touchmove', prevent, opts)
    }
  }, [])

  // Ambiance sonore
  useEffect(() => {
    startAmbiance()
    return () => stopAmbiance()
  }, [])

  // Initialiser le canvas à chaque nouvelle bande
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = window.innerWidth
    const h = window.innerHeight - TOOLBAR_H
    canvas.width = w
    canvas.height = h
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    setUndoStack([ctx.getImageData(0, 0, w, h)])
    setRedoStack([])
    setZoom(1); setPanX(0); setPanY(0)
    setCanvasReady(true)
  }, [bandeIdx])

  // Raccord depuis la bande précédente (calculé sur le contenu réel)
  useEffect(() => {
    if (bandeIdx === 0 || config.visibilite === 'aveugle' || bandes.length === 0) return
    const prev = bandes[bandes.length - 1]
    const WINDOW_PX = 60
    // Centre le raccord sur la dernière marque réelle
    const centerY = prev.lowestDrawnFraction * prev.height
    const displayH = Math.min(WINDOW_PX, prev.height)
    const imgTop = -(centerY - displayH / 2)
    setRaccordImgStyle({ top: imgTop, height: prev.height })
    setRaccordOpacity(1)
    setShowRaccord(true)
    raccordTimer.current = setTimeout(() => {
      setRaccordOpacity(0)
      setTimeout(() => setShowRaccord(false), 700)
    }, 6000)
    return () => { if (raccordTimer.current) clearTimeout(raccordTimer.current) }
  }, [bandeIdx])

  function dismissRaccord() {
    if (!showRaccord) return
    if (raccordTimer.current) clearTimeout(raccordTimer.current)
    setRaccordOpacity(0)
    setTimeout(() => setShowRaccord(false), 500)
  }

  function getCanvasCoords(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current!.height / rect.height),
    }
  }

  function saveSnapshot() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setUndoStack(prev => [...prev.slice(-29), snap])
    setRedoStack([])
  }

  function undo() {
    const canvas = canvasRef.current
    if (!canvas || undoStack.length <= 1) return
    const ctx = canvas.getContext('2d')!
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setRedoStack(prev => [...prev, current])
    const prev = undoStack[undoStack.length - 2]
    setUndoStack(s => s.slice(0, -1))
    ctx.putImageData(prev, 0, 0)
  }

  function redo() {
    const canvas = canvasRef.current
    if (!canvas || redoStack.length === 0) return
    const ctx = canvas.getContext('2d')!
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const next = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, current])
    setRedoStack(s => s.slice(0, -1))
    ctx.putImageData(next, 0, 0)
  }

  const draw = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const pos = getCanvasCoords(clientX, clientY)
    const prev = lastPos.current ?? pos
    const size = SIZES[sizeIdx]

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = size * 2.5
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'marker') {
      ctx.strokeStyle = color
      ctx.lineWidth = size * 2.2
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'brush') {
      ctx.strokeStyle = color
      ctx.lineWidth = size * 1.8
      ctx.globalAlpha = 0.80
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.quadraticCurveTo((prev.x + pos.x) / 2, (prev.y + pos.y) / 2, pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'crayon') {
      ctx.globalAlpha = 0.32
      for (let i = 0; i < 6; i++) {
        const ox = (Math.random() - 0.5) * size
        const oy = (Math.random() - 0.5) * size
        ctx.strokeStyle = color
        ctx.lineWidth = 0.5 + Math.random() * size * 0.45
        ctx.beginPath()
        ctx.moveTo(prev.x + ox, prev.y + oy)
        ctx.lineTo(pos.x + ox, pos.y + oy)
        ctx.stroke()
      }
    } else {
      ctx.strokeStyle = color
      ctx.lineWidth = size
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }

    ctx.restore()
    lastPos.current = pos
  }, [tool, sizeIdx, color])

  function onPointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      isDrawing.current = true
      lastPos.current = getCanvasCoords(e.clientX, e.clientY)
      saveSnapshot()
      draw(e.clientX, e.clientY)
      dismissRaccord()
    } else {
      isDrawing.current = false
      lastPos.current = null
      lastPinchDist.current = null
      lastPinchMid.current = null
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointersRef.current.values()]

    if (pts.length >= 2) {
      isDrawing.current = false
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }

      if (lastPinchDist.current !== null) {
        const delta = dist / lastPinchDist.current
        setZoom(z => Math.max(1, Math.min(6, z * delta)))
      }
      if (lastPinchMid.current !== null) {
        setPanX(x => x + mid.x - lastPinchMid.current!.x)
        setPanY(y => y + mid.y - lastPinchMid.current!.y)
      }
      lastPinchDist.current = dist
      lastPinchMid.current = mid
    } else if (isDrawing.current) {
      draw(e.clientX, e.clientY)
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      isDrawing.current = false
      lastPos.current = null
      lastPinchDist.current = null
      lastPinchMid.current = null
    }
  }

  function resetZoom() {
    setZoom(1); setPanX(0); setPanY(0)
  }

  function validerBande() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const lowestDrawnFraction = findLowestDrawnFraction(ctx, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    const bande: BandeDessin = {
      joueurIdx: bandeIdx,
      joueurNumero: joueurActuel,
      imageDataUrl: dataUrl,
      width: canvas.width,
      height: canvas.height,
      lowestDrawnFraction,
      ts: Date.now(),
    }
    const nouvellesBandes = [...bandes, bande]
    setBandes(nouvellesBandes)

    if (bandeIdx + 1 >= config.nbBandes) {
      sessionStorage.setItem('dessin-bandes', JSON.stringify(nouvellesBandes))
      navigate('/fin-dessin')
    } else {
      const prochain = ((bandeIdx + 1) % config.joueurs) + 1
      setNextPlayerNum(prochain)
      setPendingBandes(nouvellesBandes)
      setShowTransition(true)
    }
  }

  function demarrerProchainJoueur() {
    setShowTransition(false)
    setBandes(pendingBandes)
    setBandeIdx(idx => idx + 1)
    setCanvasReady(false)
  }

  const prevBande = bandes[bandes.length - 1] ?? null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', flexDirection: 'column', touchAction: 'none', overscrollBehavior: 'none' }}
    >
      {/* ── CANVAS AREA ── */}
      <div
        ref={containerRef}
        style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#ffffff' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Canvas avec transform zoom/pan */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'center center',
          width: '100%', height: '100%',
        }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          />
        </div>

        {/* Raccord bande précédente */}
        {showRaccord && prevBande && canvasReady && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 60, overflow: 'hidden',
            opacity: raccordOpacity,
            transition: 'opacity 0.7s ease',
            pointerEvents: 'none', zIndex: 5,
            borderBottom: `1.5px dashed ${accent}`,
          }}>
            <img
              src={prevBande.imageDataUrl}
              alt=""
              style={{
                position: 'absolute',
                left: 0, width: prevBande.width,
                height: raccordImgStyle.height,
                top: raccordImgStyle.top,
                maxWidth: '100%',
              }}
            />
            <div style={{
              position: 'absolute', bottom: 4, right: 8,
              ...mono, fontSize: 7, color: accent,
              background: 'rgba(255,255,255,0.88)', padding: '2px 6px',
            }}>
              RACCORD
            </div>
          </div>
        )}

        {/* Indicateur joueur + bande */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          ...mono, fontSize: 8, color: encre,
          background: 'rgba(255,255,255,0.85)', padding: '4px 9px',
          border: `0.5px solid ${encre}18`, pointerEvents: 'none',
        }}>
          JOUEUR {joueurActuel} · BANDE {bandeIdx + 1}/{config.nbBandes}
        </div>

        {/* Bouton reset zoom (si zoomé) */}
        {zoom > 1.05 && (
          <button
            onClick={resetZoom}
            style={{
              position: 'absolute', top: 10, right: 10,
              ...mono, fontSize: 8, color: encre,
              background: 'rgba(255,255,255,0.85)',
              border: `0.5px solid ${encre}20`, padding: '4px 9px',
              cursor: 'pointer', zIndex: 10,
            }}
          >
            ↺ {Math.round(zoom * 100)}%
          </button>
        )}
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{
        height: TOOLBAR_H, background: '#f9f6f1',
        borderTop: `1px solid ${encre}12`,
        display: 'flex', flexDirection: 'column',
        padding: '8px 10px 10px', gap: 6, flexShrink: 0,
        zIndex: 20,
      }}>

        {/* Rangée 1 : outils + undo/redo + muet */}
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {(['pen', 'brush', 'marker', 'crayon', 'eraser'] as Tool[]).map(t => (
              <button
                key={t}
                onClick={() => setTool(t)}
                aria-pressed={tool === t}
                title={TOOL_LABELS[t]}
                style={{
                  flex: 1, padding: '6px 2px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  border: `0.5px solid ${tool === t ? accent : `${encre}18`}`,
                  borderBottom: `2px solid ${tool === t ? accent : 'transparent'}`,
                  background: tool === t ? `${accent}0E` : 'transparent',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1, color: tool === t ? accent : `${encre}80` }}>
                  {TOOL_ICONS[t]}
                </span>
                <span style={{ ...mono, fontSize: 6.5, color: tool === t ? accent : `${encre}55` }}>
                  {TOOL_LABELS[t].slice(0, 4).toUpperCase()}
                </span>
              </button>
            ))}
          </div>
          <div style={{ width: 1, background: `${encre}12`, margin: '0 3px', flexShrink: 0 }} />
          <button onClick={undo} disabled={undoStack.length <= 1} aria-label="Annuler"
            style={{ width: 32, height: 38, border: `0.5px solid ${encre}18`, background: 'transparent', cursor: undoStack.length > 1 ? 'pointer' : 'default', color: undoStack.length > 1 ? encre : `${encre}25`, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↩
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} aria-label="Rétablir"
            style={{ width: 32, height: 38, border: `0.5px solid ${encre}18`, background: 'transparent', cursor: redoStack.length > 0 ? 'pointer' : 'default', color: redoStack.length > 0 ? encre : `${encre}25`, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↪
          </button>
        </div>

        {/* Rangée 2 : tailles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...mono, fontSize: 7, color: `${encre}50`, flexShrink: 0 }}>TAILLE</span>
          <div style={{ display: 'flex', flex: 1, gap: 4, alignItems: 'center' }}>
            {SIZES.map((sz, i) => (
              <button
                key={i}
                onClick={() => setSizeIdx(i)}
                aria-pressed={sizeIdx === i}
                style={{
                  flex: 1, height: 32,
                  border: `0.5px solid ${sizeIdx === i ? accent : `${encre}18`}`,
                  borderBottom: `2px solid ${sizeIdx === i ? accent : 'transparent'}`,
                  background: sizeIdx === i ? `${accent}0E` : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  width: Math.min(sz * 0.65 + 3, 20),
                  height: Math.min(sz * 0.65 + 3, 20),
                  borderRadius: '50%',
                  background: sizeIdx === i ? accent : `${encre}60`,
                }} />
              </button>
            ))}
          </div>
          {/* Couleur personnalisée */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            <input
              type="color"
              value={color === '#ffffff' || tool === 'eraser' ? '#000000' : color}
              onChange={e => { setColor(e.target.value); if (tool === 'eraser') setTool('pen') }}
              title="Couleur personnalisée"
              style={{ width: 32, height: 32, padding: 2, border: `1px solid ${encre}30`, cursor: 'pointer', borderRadius: 2, background: 'transparent' }}
            />
          </div>
        </div>

        {/* Rangée 3 : palette */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
          {PALETTE.map((col) => (
            <button
              key={col}
              onClick={() => { setColor(col); if (tool === 'eraser') setTool('pen') }}
              aria-label={col}
              aria-pressed={color === col && tool !== 'eraser'}
              style={{
                height: 20,
                background: col,
                border: color === col && tool !== 'eraser'
                  ? `2.5px solid ${accent}`
                  : ['#ffffff', '#eeeeee', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5'].includes(col)
                    ? `1px solid ${encre}25`
                    : '2.5px solid transparent',
                cursor: 'pointer', borderRadius: 2,
              }}
            />
          ))}
        </div>

        {/* Rangée 4 : aperçu + valider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24,
              background: tool === 'eraser' ? '#fff' : color,
              border: `1px solid ${encre}30`, borderRadius: 3, flexShrink: 0,
            }} />
            <span style={{ ...mono, fontSize: 7, color: `${encre}45` }}>
              {tool === 'eraser' ? 'GOMME' : TOOL_LABELS[tool].toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
            style={{ ...mono, fontSize: 9, color: `${encre}50`, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}
          >
            {muted ? '♪' : '♫'}
          </button>
          <button
            onClick={validerBande}
            style={{
              ...mono, fontSize: 9,
              background: encre, color: '#e8d4b8',
              border: 'none', cursor: 'pointer',
              padding: '9px 16px', flexShrink: 0,
            }}
          >
            {bandeIdx + 1 < config.nbBandes ? `VALIDER →` : 'RÉVÉLER →'}
          </button>
        </div>
      </div>

      {/* ── TRANSITION JOUEUR ── */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onClick={demarrerProchainJoueur}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: encre,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ ...mono, fontSize: 9, color: `${accent}`, letterSpacing: '0.28em', marginBottom: 16, opacity: 0.7 }}>
                — BANDE {bandeIdx + 2}/{config.nbBandes} —
              </div>
              <div style={{
                fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontStyle: 'italic',
                fontSize: 'clamp(2.6rem, 12vw, 4.5rem)',
                color: '#e8d4b8', lineHeight: 1.1,
              }}>
                Joueur {nextPlayerNum}.
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic', fontSize: 14,
                color: '#e8d4b8', opacity: 0.55, marginTop: 12,
              }}>
                Passez l'écran. Ne regardez pas.
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              style={{ ...mono, fontSize: 9, color: '#e8d4b8', opacity: 0.4, letterSpacing: '0.2em' }}
            >
              TOUCHER POUR COMMENCER
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
