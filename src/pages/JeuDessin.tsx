import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReve } from '../reve'
import type { ConfigDessin, BandeDessin } from '../types'

type Tool = 'pen' | 'brush' | 'marker' | 'crayon' | 'eraser'

// Taille réelle en px par niveau (0-4)
const SIZES = [2, 5, 10, 18, 30]

// Palette 30 couleurs : 3 rangées × 10
const PALETTE: string[] = [
  // Neutres
  '#000000', '#1a1a1a', '#444444', '#777777', '#aaaaaa', '#cccccc', '#e8e8e8', '#f5f5f5', '#ffffff', '#f0e4cc',
  // Chauds
  '#7B0000', '#C62828', '#EF5350', '#E64A19', '#F57C00', '#FFA000', '#FFD600', '#AFB42B', '#558B2F', '#2E7D32',
  // Froids & profonds
  '#002FA7', '#1565C0', '#0288D1', '#006064', '#00695C', '#6A1B9A', '#AD1457', '#4A148C', '#37474F', '#4E342E',
]

const TOOLBAR_H = 152

export default function JeuDessin() {
  const navigate = useNavigate()
  const seance = useReve()

  const [config] = useState<ConfigDessin>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('config-dessin') ?? '')
    } catch {
      return { nbBandes: 3, visibilite: 'raccord' }
    }
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
  const [canvasReady, setCanvasReady] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const raccordTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevBande = bandes[bandes.length - 1] ?? null

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: 'monospace', letterSpacing: '0.18em' }

  // Initialiser le canvas à chaque nouvelle bande
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = window.innerWidth
    const h = window.innerHeight - TOOLBAR_H
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    const snap = ctx.getImageData(0, 0, w, h)
    setUndoStack([snap])
    setRedoStack([])
    setCanvasReady(true)
  }, [bandeIdx])

  // Afficher le raccord de la bande précédente
  useEffect(() => {
    if (bandeIdx === 0 || config.visibilite === 'aveugle' || !prevBande) return
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

  function getCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function saveSnapshot() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setUndoStack(prev => [...prev.slice(-24), snap])
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

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    canvasRef.current!.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPos.current = getCoords(e)
    saveSnapshot()
    draw(e)
    dismissRaccord()
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    draw(e)
  }

  function onPointerUp() {
    isDrawing.current = false
    lastPos.current = null
  }

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const pos = getCoords(e)
    const prev = lastPos.current ?? pos
    const size = SIZES[sizeIdx]

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = size * 2.2
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'marker') {
      ctx.strokeStyle = color
      ctx.lineWidth = size * 2
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'brush') {
      ctx.strokeStyle = color
      ctx.lineWidth = size * 1.6
      ctx.globalAlpha = 0.82
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.quadraticCurveTo(
        (prev.x + pos.x) / 2,
        (prev.y + pos.y) / 2,
        pos.x, pos.y,
      )
      ctx.stroke()
    } else if (tool === 'crayon') {
      // Crayon : texture granuleuse avec plusieurs traits décalés
      ctx.globalAlpha = 0.35
      const n = 5
      for (let i = 0; i < n; i++) {
        const ox = (Math.random() - 0.5) * size * 0.9
        const oy = (Math.random() - 0.5) * size * 0.9
        ctx.strokeStyle = color
        ctx.lineWidth = 0.8 + Math.random() * size * 0.4
        ctx.beginPath()
        ctx.moveTo(prev.x + ox, prev.y + oy)
        ctx.lineTo(pos.x + ox, pos.y + oy)
        ctx.stroke()
      }
    } else {
      // pen — trait fin et précis
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

  function validerBande() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const bande: BandeDessin = {
      joueurIdx: bandeIdx,
      imageDataUrl: dataUrl,
      width: canvas.width,
      height: canvas.height,
      ts: Date.now(),
    }
    const nouvellesBandes = [...bandes, bande]
    setBandes(nouvellesBandes)

    if (bandeIdx + 1 >= config.nbBandes) {
      sessionStorage.setItem('dessin-bandes', JSON.stringify(nouvellesBandes))
      navigate('/fin-dessin')
    } else {
      setBandeIdx(idx => idx + 1)
      setCanvasReady(false)
    }
  }

  const joueurNum = bandeIdx + 1
  const TOOL_LABELS: Record<Tool, string> = {
    pen: '✒ PEN',
    brush: '⌬ BRUSH',
    marker: '▮ MARK.',
    crayon: '╱ CRAY.',
    eraser: '◻ EFF.',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', flexDirection: 'column', touchAction: 'none' }}>

      {/* ── CANVAS ── */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />

        {/* Raccord — bord inférieur de la bande précédente */}
        {showRaccord && prevBande && canvasReady && (
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 56,
              overflow: 'hidden',
              opacity: raccordOpacity,
              transition: 'opacity 0.7s ease',
              pointerEvents: 'none',
              zIndex: 5,
              borderBottom: `1.5px dashed ${accent}`,
            }}
          >
            <img
              src={prevBande.imageDataUrl}
              alt=""
              style={{
                position: 'absolute',
                left: 0,
                width: prevBande.width,
                height: prevBande.height,
                top: -(prevBande.height - 56),
              }}
            />
            <div style={{
              position: 'absolute', bottom: 4, right: 8,
              ...mono, fontSize: 7, color: accent,
              background: 'rgba(255,255,255,0.85)', padding: '2px 5px',
            }}>
              RACCORD
            </div>
          </div>
        )}

        {/* Indicateur joueur + bande */}
        <div style={{
          position: 'absolute', top: showRaccord ? 62 : 10, right: 10,
          transition: 'top 0.4s',
          ...mono, fontSize: 8, color: encre,
          background: 'rgba(255,255,255,0.82)', padding: '4px 8px',
          border: `0.5px solid ${encre}20`,
          pointerEvents: 'none',
        }}>
          JOUEUR {joueurNum} · {bandeIdx + 1}/{config.nbBandes}
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{
        height: TOOLBAR_H,
        background: '#faf8f4',
        borderTop: `1px solid ${encre}15`,
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 10px 10px',
        gap: 6,
        flexShrink: 0,
      }}>

        {/* Rangée 1 : outils + tailles + undo/redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Outils */}
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {(['pen', 'brush', 'marker', 'crayon', 'eraser'] as Tool[]).map(t => (
              <button
                key={t}
                onClick={() => setTool(t)}
                aria-pressed={tool === t}
                style={{
                  flex: 1, padding: '5px 0',
                  border: `0.5px solid ${tool === t ? accent : `${encre}20`}`,
                  borderBottom: `2px solid ${tool === t ? accent : 'transparent'}`,
                  background: tool === t ? `${accent}10` : 'transparent',
                  cursor: 'pointer',
                  ...mono, fontSize: 7,
                  color: tool === t ? accent : `${encre}70`,
                  transition: 'all 0.12s',
                  lineHeight: 1.2,
                }}
              >
                {TOOL_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Séparateur */}
          <div style={{ width: 1, height: 24, background: `${encre}15`, margin: '0 4px', flexShrink: 0 }} />

          {/* Tailles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {SIZES.map((sz, i) => (
              <button
                key={i}
                onClick={() => setSizeIdx(i)}
                aria-pressed={sizeIdx === i}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `0.5px solid ${sizeIdx === i ? accent : `${encre}20`}`,
                  background: sizeIdx === i ? `${accent}15` : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  width: Math.min(sz * 0.7 + 2, 16),
                  height: Math.min(sz * 0.7 + 2, 16),
                  borderRadius: '50%',
                  background: sizeIdx === i ? accent : encre,
                  opacity: sizeIdx === i ? 1 : 0.4,
                }} />
              </button>
            ))}
          </div>

          {/* Séparateur */}
          <div style={{ width: 1, height: 24, background: `${encre}15`, margin: '0 4px', flexShrink: 0 }} />

          {/* Undo / Redo */}
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            <button
              onClick={undo}
              disabled={undoStack.length <= 1}
              aria-label="Annuler"
              style={{
                width: 30, height: 30,
                border: `0.5px solid ${encre}20`,
                background: 'transparent', cursor: undoStack.length > 1 ? 'pointer' : 'default',
                ...mono, fontSize: 12,
                color: undoStack.length > 1 ? encre : `${encre}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ↩
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              aria-label="Rétablir"
              style={{
                width: 30, height: 30,
                border: `0.5px solid ${encre}20`,
                background: 'transparent', cursor: redoStack.length > 0 ? 'pointer' : 'default',
                ...mono, fontSize: 12,
                color: redoStack.length > 0 ? encre : `${encre}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ↪
            </button>
          </div>
        </div>

        {/* Rangée 2 : palette de couleurs (3 × 10) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2 }}>
          {PALETTE.map((col) => (
            <button
              key={col}
              onClick={() => { setColor(col); if (tool === 'eraser') setTool('pen') }}
              aria-label={col}
              style={{
                height: 16,
                background: col,
                border: color === col
                  ? `2px solid ${accent}`
                  : col === '#ffffff' || col === '#f5f5f5' || col === '#f0e4cc' || col === '#e8e8e8'
                    ? `1px solid ${encre}30`
                    : '2px solid transparent',
                cursor: 'pointer',
                borderRadius: 1,
                transition: 'transform 0.1s',
              }}
            />
          ))}
        </div>

        {/* Rangée 3 : couleur active + valider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Aperçu couleur + outil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 22, height: 22,
              background: tool === 'eraser' ? '#fff' : color,
              border: `1px solid ${encre}30`,
              borderRadius: 2,
              flexShrink: 0,
            }} />
            <span style={{ ...mono, fontSize: 7, color: `${encre}50` }}>
              {tool === 'eraser' ? 'GOMME' : color.toUpperCase()}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Bouton valider */}
          <button
            onClick={validerBande}
            style={{
              ...mono, fontSize: 9,
              background: accent, color: '#e8d4b8',
              border: 'none', cursor: 'pointer',
              padding: '8px 18px',
              transition: 'opacity 0.15s',
            }}
          >
            {bandeIdx + 1 < config.nbBandes
              ? `VALIDER · JOUEUR ${joueurNum + 1} →`
              : 'RÉVÉLER LE CADAVRE →'}
          </button>
        </div>
      </div>
    </div>
  )
}
