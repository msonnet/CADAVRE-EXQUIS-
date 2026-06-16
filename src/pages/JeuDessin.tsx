import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useReve } from '../reve'
import { useAmbiance } from '../hooks/useAmbiance'
import { useSound } from '../hooks/useSound'
import { Etiquette } from '../components/Papier'
import type { ConfigDessin, BandeDessin } from '../types'

type Tool = 'pencil' | 'pen' | 'marker' | 'brush' | 'crayon' | 'airbrush' | 'eraser'
const TOOL_ORDER: Tool[] = ['pencil', 'pen', 'marker', 'brush', 'crayon', 'airbrush', 'eraser']
const SIZES = [1.5, 4, 9, 17, 28]

// Fonds de papier — texture procédurale dessinée au démarrage de chaque bande
type Paper = 'lisse' | 'kraft' | 'parchemin' | 'ardoise'
const PAPERS: { id: Paper; nom: string; bg: string; grain: string; ink: string }[] = [
  { id: 'lisse',      nom: 'Lisse',      bg: '#fdf8f2', grain: '#00000000', ink: '#1a1410' },
  { id: 'kraft',      nom: 'Kraft',      bg: '#cdb48c', grain: '#5a4326',   ink: '#2c1d0e' },
  { id: 'parchemin',  nom: 'Parchemin',  bg: '#f3e7cb', grain: '#b89a63',   ink: '#3a2a14' },
  { id: 'ardoise',    nom: 'Ardoise',    bg: '#2f3438', grain: '#0d0f11',   ink: '#e8e4dc' },
]

const PALETTE = [
  '#000000', '#1a1a1a', '#444444', '#777777', '#aaaaaa', '#cccccc', '#e8e8e8', '#ffffff',
  '#7B0000', '#C62828', '#EF5350', '#E65100', '#FB8C00', '#F9A825', '#558B2F', '#1B5E20',
  '#002FA7', '#1565C0', '#0288D1', '#006064', '#004D40', '#6A1B9A', '#AD1457', '#880E4F',
  '#4E342E', '#795548', '#546E7A', '#37474F', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5',
]

// ── Icônes d'outils (illustrations originales) ───
// `tint` = teinte d'encre du corps de l'outil ; `nib` = couleur active appliquée à la pointe.
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
  // Craie / pastel — bâtonnet court et épais
  return (
    <svg width="22" height="40" viewBox="0 0 22 40" fill="none">
      <rect x="6" y="8" width="10" height="26" rx="2.5" fill={nib} />
      <rect x="6" y="8" width="3.2" height="26" rx="2.5" fill="#ffffff" opacity="0.22" />
      <rect x="6" y="8" width="10" height="4" rx="2.5" fill={tint} opacity="0.35" />
      <rect x="6" y="31" width="10" height="3" rx="1.5" fill="#000000" opacity="0.12" />
    </svg>
  )
}

function IconAirbrush({ tint, nib }: { tint: string; nib: string }) {
  // Aérographe — corps fuselé + nuage de gouttelettes projetées
  return (
    <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
      <rect x="6" y="3" width="7" height="16" rx="3" fill={tint} />
      <rect x="8" y="5" width="2" height="10" rx="1" fill="#ffffff" opacity="0.22" />
      <path d="M6 19 L13 19 L11.5 25 L7.5 25 Z" fill={tint} opacity="0.8" />
      <circle cx="9.5" cy="29" r="1.3" fill={nib} opacity="0.9" />
      <circle cx="13" cy="32" r="0.9" fill={nib} opacity="0.7" />
      <circle cx="7" cy="33" r="0.8" fill={nib} opacity="0.6" />
      <circle cx="11" cy="35.5" r="1" fill={nib} opacity="0.55" />
      <circle cx="15" cy="29" r="0.7" fill={nib} opacity="0.5" />
      <circle cx="5.5" cy="29.5" r="0.6" fill={nib} opacity="0.45" />
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

function IconPipette({ tint, nib }: { tint: string; nib: string }) {
  // Compte-gouttes / pipette
  return (
    <svg width="22" height="40" viewBox="0 0 22 40" fill="none">
      <rect x="11" y="3" width="5" height="7" rx="2.5" transform="rotate(45 13.5 6.5)" fill={tint} />
      <path d="M12 11 L17 16 L9 24 L6 24 L6 21 Z" fill={tint} />
      <path d="M6 24 L6 21 L9 24 Z" fill={nib} />
      <path d="M4.5 27 Q6 24 7.5 27 Q7.5 29.5 6 29.5 Q4.5 29.5 4.5 27 Z" fill={nib} />
    </svg>
  )
}

const TOOL_ICONS = { pencil: IconPencil, pen: IconPen, marker: IconMarker, brush: IconBrush, crayon: IconCrayon, airbrush: IconAirbrush, eraser: IconEraser }
const TOOL_NAMES: Record<Tool, string> = { pencil: 'Crayon', pen: 'Stylo', marker: 'Feutre', brush: 'Pinceau', crayon: 'Craie', airbrush: 'Aéro', eraser: 'Gomme' }

const TOOLBAR_H = 218
const RACCORD_H = 80
// Encre fixe de la barre d'outils — toujours lisible sur son fond beige fixe (#f0e9df),
// indépendamment de l'ambiance (où `encre` peut devenir clair).
const TB_INK = '#1a1208'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// Peint le fond de la bande : couleur unie + grain procédural propre au papier choisi.
// Déterministe par bande (la graine vient de bandeIdx) pour que le raccord reste cohérent.
function peindreFond(ctx: CanvasRenderingContext2D, w: number, h: number, p: { bg: string; grain: string }) {
  ctx.save()
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, w, h)
  if (p.grain && !p.grain.endsWith('00')) {
    const g = hexToRgb(p.grain)
    // Mouchetures fines réparties sur toute la surface — densité proportionnelle à l'aire
    const n = Math.floor((w * h) / 1400)
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const a = 0.015 + Math.random() * 0.05
      ctx.fillStyle = `rgba(${g.r},${g.g},${g.b},${a})`
      ctx.beginPath()
      ctx.arc(x, y, Math.random() * 1.1 + 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function findLowestDrawnFraction(ctx: CanvasRenderingContext2D, w: number, h: number, bgRef?: { r: number; g: number; b: number }): number {
  const data = ctx.getImageData(0, 0, w, h).data
  // Référence de fond : par défaut le beige clair historique (#fdf8f2 ≈ 253/248/242).
  const ref = bgRef ?? { r: 253, g: 248, b: 242 }
  // Seuil de distance : ignore le grain du papier (faible écart) mais capte les vrais traits.
  const SEUIL = 38
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const d = Math.abs(data[i] - ref.r) + Math.abs(data[i + 1] - ref.g) + Math.abs(data[i + 2] - ref.b)
      if (d > SEUIL) return y / h
    }
  }
  return 0
}

export default function JeuDessin() {
  const navigate = useNavigate()
  const seance = useReve()
  const { start: startAmbiance, stop: stopAmbiance, toggleMute, muted } = useAmbiance()
  const { jouer } = useSound()

  const [config] = useState<ConfigDessin>(() => {
    try { return JSON.parse(sessionStorage.getItem('config-dessin') ?? '') }
    catch { return { nbBandes: 3, joueurs: 2, visibilite: 'raccord' } }
  })

  const [bandes, setBandes] = useState<BandeDessin[]>([])
  const [bandeIdx, setBandeIdx] = useState(0)
  const [tool, setTool] = useState<Tool>('pencil')
  const [sizeIdx, setSizeIdx] = useState(1)
  const [color, setColor] = useState('#1a1410')
  const [opacity, setOpacity] = useState(1) // 0.1 → 1, réglable
  // Papier choisi pour toute la partie (fixé à la première bande pour garder l'unité visuelle)
  const [paper, setPaper] = useState<Paper>('lisse')
  const paperDef = PAPERS.find(p => p.id === paper) ?? PAPERS[0]
  const CANVAS_BG_ACTUEL = paperDef.bg
  // Pipette : capture une fois la couleur puis revient à l'outil précédent
  const [pipetteActive, setPipetteActive] = useState(false)
  const toolAvantPipette = useRef<Tool>('pencil')
  // Couleurs récemment employées (les plus récentes d'abord, max 8)
  const [recentColors, setRecentColors] = useState<string[]>([])
  // Curseur fantôme (aperçu de taille/position sous le doigt avant de poser)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  // Force re-render when the undo/redo stacks change (kept in refs to avoid re-renders during drawing)
  const [, setHistoryTick] = useState(0)
  const bumpHistory = useCallback(() => setHistoryTick(t => t + 1), [])
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
  // Point médian du segment précédent — sommet de contrôle pour le lissage Bézier quadratique
  const lastMid = useRef<{ x: number; y: number } | null>(null)
  const velocityRef = useRef(0)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)

  // Historique d'annulation : snapshots ImageData empilés à chaque pointerup (max 20)
  const undoStackRef = useRef<ImageData[]>([])
  const redoStackRef = useRef<ImageData[]>([])
  const UNDO_MAX = 20

  const joueurActuel = (bandeIdx % config.joueurs) + 1
  const c = seance?.colorSchema
  const accent = c?.second ?? '#1d3a8c'
  const encre = c?.encre ?? '#0f0805'
  const bg = c?.bg ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#fff'
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

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
    peindreFond(ctx, canvas.width, canvas.height, paperDef)

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
        // Fade-out progressif du raccord : opaque en haut, fondu vers la couleur du fond en bas
        // (effet d'un pli papier — la trace s'efface là où le joueur prendra le relais)
        const fb = hexToRgb(paperDef.bg)
        const grad = ctx.createLinearGradient(0, 0, 0, RACCORD_H_phys)
        grad.addColorStop(0, `rgba(${fb.r}, ${fb.g}, ${fb.b}, 0)`)
        grad.addColorStop(0.7, `rgba(${fb.r}, ${fb.g}, ${fb.b}, 0)`)
        grad.addColorStop(1, `rgba(${fb.r}, ${fb.g}, ${fb.b}, 1)`)
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, RACCORD_H_phys)
        ctx.restore()
        // Reset historique pour la nouvelle bande : on garde l'état initial (avec le raccord) comme baseline
        undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
        redoStackRef.current = []
        bumpHistory()
        setZoom(1); setPanX(0); setPanY(0)
        zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0
        setCanvasReady(true)
      }
      img.src = prev.imageDataUrl
    } else {
      // Reset historique pour la nouvelle bande : baseline = canvas vide
      undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
      redoStackRef.current = []
      bumpHistory()
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

  // Empile un snapshot de l'état actuel du canvas (appelé après chaque trait complet)
  function saveSnapshot() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStackRef.current.push(snap)
    // Limite la taille de la pile à UNDO_MAX entrées
    if (undoStackRef.current.length > UNDO_MAX) {
      undoStackRef.current.splice(0, undoStackRef.current.length - UNDO_MAX)
    }
    // Tout nouvel acte de dessin invalide la pile redo
    redoStackRef.current = []
    bumpHistory()
  }

  // Annule le dernier trait : retire le snapshot du sommet et restaure le précédent
  const undo = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    if (undoStackRef.current.length <= 1) return
    const ctx = canvas.getContext('2d')!
    const popped = undoStackRef.current.pop()!
    redoStackRef.current.push(popped)
    if (redoStackRef.current.length > UNDO_MAX) {
      redoStackRef.current.splice(0, redoStackRef.current.length - UNDO_MAX)
    }
    const previous = undoStackRef.current[undoStackRef.current.length - 1]
    ctx.putImageData(previous, 0, 0)
    bumpHistory()
  }, [bumpHistory])

  // Rétablit le dernier trait annulé
  const redo = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    if (redoStackRef.current.length === 0) return
    const ctx = canvas.getContext('2d')!
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    if (undoStackRef.current.length > UNDO_MAX) {
      undoStackRef.current.splice(0, undoStackRef.current.length - UNDO_MAX)
    }
    ctx.putImageData(next, 0, 0)
    bumpHistory()
  }, [bumpHistory])

  // Raccourcis clavier : Ctrl+Z / Cmd+Z annule, Ctrl+Shift+Z / Cmd+Shift+Z rétablit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const draw = useCallback((clientX: number, clientY: number, pressure = 0) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const pos = getCanvasCoords(clientX, clientY)
    const prev = lastPos.current ?? pos
    const size = SIZES[sizeIdx] * dpr
    // Facteur de pression du stylet (Apple Pencil / stylus). Les souris/doigts renvoient
    // souvent 0 ou 0.5 sans capteur → on neutralise (pf = 1) dans ce cas.
    const pf = pressure > 0 && pressure !== 0.5 ? 0.35 + pressure * 1.0 : 1

    const dx = pos.x - prev.x
    const dy = pos.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    // Point médian courant : avec le médian précédent, il définit une courbe quadratique
    // dont le point de contrôle est `prev` → tracé lissé même sur gestes rapides.
    const mid = { x: (prev.x + pos.x) / 2, y: (prev.y + pos.y) / 2 }
    const from = lastMid.current ?? prev
    const traceLisse = () => {
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y)
      ctx.stroke()
    }

    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const op = opacity // multiplicateur d'opacité réglable (0.1 → 1)

    if (tool === 'eraser') {
      ctx.strokeStyle = CANVAS_BG_ACTUEL; ctx.lineWidth = size * 2.8; ctx.globalAlpha = 1
      traceLisse()

    } else if (tool === 'pen') {
      // Stylo : largeur dynamique selon la vitesse (lent = épais, rapide = fin) et la pression
      velocityRef.current = velocityRef.current * 0.55 + dist * 0.45
      const dynamicW = size * pf * Math.max(0.35, 1.0 - velocityRef.current * 0.018)
      ctx.strokeStyle = color; ctx.lineWidth = dynamicW; ctx.globalAlpha = op
      traceLisse()

    } else if (tool === 'pencil') {
      const baseW = Math.max(size * 0.55 * pf, 0.8 * dpr)
      ctx.strokeStyle = color; ctx.lineWidth = baseW; ctx.globalAlpha = 0.5 * op
      traceLisse()
      // Grain graphite : particules infimes, imperceptibles individuellement
      const grains = Math.ceil(Math.max(dist, 3))
      for (let g = 0; g < grains; g++) {
        const t = g / grains
        const gx = prev.x + dx * t + (Math.random() - 0.5) * baseW * 1.4
        const gy = prev.y + dy * t + (Math.random() - 0.5) * baseW * 1.4
        ctx.fillStyle = color
        ctx.globalAlpha = (0.02 + Math.random() * 0.05) * op
        ctx.beginPath()
        ctx.arc(gx, gy, Math.random() * 0.22 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }

    } else if (tool === 'brush') {
      // Pinceau : poils multiples, étalés perpendiculairement au trait
      const angle = Math.atan2(dy, dx) + Math.PI / 2
      const numBristles = 12
      const spread = size * 0.9 * pf
      for (let b = 0; b < numBristles; b++) {
        const t = b / (numBristles - 1) - 0.5
        const ox = Math.cos(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        const oy = Math.sin(angle) * t * spread + (Math.random() - 0.5) * size * 0.08
        ctx.strokeStyle = color
        ctx.lineWidth = (0.35 + Math.random() * 0.9) * dpr
        ctx.globalAlpha = (0.22 + Math.random() * 0.52) * op
        ctx.beginPath()
        ctx.moveTo(prev.x + ox, prev.y + oy)
        ctx.lineTo(pos.x + ox, pos.y + oy)
        ctx.stroke()
      }

    } else if (tool === 'marker') {
      // Feutre : large, opacité faible qui s'accumule. lineCap round (pas square) car la
      // courbe bezier se referme proprement — square créait des artefacts aux jointures.
      ctx.strokeStyle = color; ctx.lineWidth = size * 2.6; ctx.lineCap = 'round'
      ctx.globalAlpha = 0.35 * op
      traceLisse()

    } else if (tool === 'crayon') {
      // Craie : texture granuleuse, particules aléatoires le long du trait
      const numGrains = Math.ceil(Math.max(dist * 0.9, 5) * 1.8)
      for (let g = 0; g < numGrains; g++) {
        const t = Math.random()
        const gx = prev.x + dx * t + (Math.random() - 0.5) * size * 1.1
        const gy = prev.y + dy * t + (Math.random() - 0.5) * size * 1.1
        ctx.fillStyle = color
        ctx.globalAlpha = (0.04 + Math.random() * 0.20) * op
        ctx.beginPath()
        ctx.arc(gx, gy, Math.random() * 1.4 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }

    } else if (tool === 'airbrush') {
      // Aérographe professionnel — technique des tampons à gradient radial (Procreate / PS).
      // Chaque dab est un disque rempli d'un gradient opacity : max au centre → 0 en bordure.
      // Plusieurs dabs espacés ≤ 20 % du rayon garantissent une couverture continue quelle
      // que soit la vitesse du geste, et le build-up s'accumule naturellement en repassant.
      const rgb = hexToRgb(color)
      const radius = size * 3.5 * pf
      const spacing = Math.max(radius * 0.18, 1)
      const steps = Math.max(1, Math.ceil(dist / spacing))
      const peak = 0.09 * op
      for (let s = 0; s <= steps; s++) {
        const cx = prev.x + dx * (s / steps)
        const cy = prev.y + dy * (s / steps)
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        grad.addColorStop(0,    `rgba(${rgb.r},${rgb.g},${rgb.b},${peak})`)
        grad.addColorStop(0.25, `rgba(${rgb.r},${rgb.g},${rgb.b},${peak * 0.75})`)
        grad.addColorStop(0.6,  `rgba(${rgb.r},${rgb.g},${rgb.b},${peak * 0.25})`)
        grad.addColorStop(1,    `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
        ctx.globalAlpha = 1  // Le gradient porte lui-même l'opacité
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
    lastPos.current = pos
    lastMid.current = mid
  }, [tool, sizeIdx, color, opacity, CANVAS_BG_ACTUEL])

  // Compte-gouttes : lit la couleur du pixel sous le doigt et l'adopte
  function echantillonnerCouleur(clientX: number, clientY: number): string | null {
    const canvas = canvasRef.current; if (!canvas) return null
    const ctx = canvas.getContext('2d')!
    const { x, y } = getCanvasCoords(clientX, clientY)
    const px = ctx.getImageData(Math.max(0, Math.min(canvas.width - 1, Math.round(x))),
                                Math.max(0, Math.min(canvas.height - 1, Math.round(y))), 1, 1).data
    return '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  // Mémorise une couleur posée (les plus récentes en tête, max 8, sans doublon)
  function ajouterCouleurRecente(col: string) {
    setRecentColors(prev => [col, ...prev.filter(c => c.toLowerCase() !== col.toLowerCase())].slice(0, 8))
  }

  function onPointerDown(e: React.PointerEvent) {
    // Pipette : on échantillonne et on ressort immédiatement sans tracer
    if (pipetteActive) {
      const col = echantillonnerCouleur(e.clientX, e.clientY)
      if (col) { setColor(col); ajouterCouleurRecente(col) }
      setPipetteActive(false)
      setTool(toolAvantPipette.current === 'eraser' ? 'pen' : toolAvantPipette.current)
      return
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      if (panMode) {
        isDrawing.current = false
      } else {
        isDrawing.current = true
        velocityRef.current = 0
        lastPos.current = getCanvasCoords(e.clientX, e.clientY)
        lastMid.current = null
        draw(e.clientX, e.clientY, e.pressure)
        if (tool !== 'eraser') ajouterCouleurRecente(color)
      }
    } else {
      isDrawing.current = false; lastPos.current = null; lastMid.current = null
      lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    // Curseur fantôme uniquement au survol (souris/stylet sans appui) : éviter un
    // re-render à chaque point pendant le tracé, qui nuirait à la fluidité.
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
        const actualScale = newZoom / zoomRef.current
        // Anchor zoom to the pinch midpoint in container-relative coordinates
        const rect = containerRef.current!.getBoundingClientRect()
        const newPanX = (mid.x - rect.left) - (lastPinchMid.current.x - rect.left - panXRef.current) * actualScale
        const newPanY = (mid.y - rect.top) - (lastPinchMid.current.y - rect.top - panYRef.current) * actualScale
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
      // Coalesced events : rejoue tous les points sub-frame que le navigateur a regroupés,
      // comblant les « trous » des gestes rapides pour un tracé continu et précis.
      const native = e.nativeEvent as PointerEvent
      const events = typeof native.getCoalescedEvents === 'function'
        ? native.getCoalescedEvents()
        : []
      if (events.length > 0) {
        for (const ev of events) draw(ev.clientX, ev.clientY, ev.pressure)
      } else {
        draw(e.clientX, e.clientY, e.pressure)
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasDrawing = isDrawing.current && pointersRef.current.size === 1
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      // Trait terminé : on capture l'état du canvas pour permettre l'annulation
      if (wasDrawing) saveSnapshot()
      isDrawing.current = false; lastPos.current = null; lastMid.current = null
      lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  function validerBande() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const lowestDrawnFraction = findLowestDrawnFraction(ctx, canvas.width, canvas.height, hexToRgb(paperDef.bg))
    const dpr = window.devicePixelRatio || 1
    const bande: BandeDessin = {
      joueurIdx: bandeIdx, joueurNumero: joueurActuel,
      imageDataUrl: canvas.toDataURL('image/png'),
      width: canvas.width, height: canvas.height,
      lowestDrawnFraction, dpr, ts: Date.now(),
    }
    const nouvellesBandes = [...bandes, bande]
    setBandes(nouvellesBandes)
    jouer('soumettre')
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

  // Choix du papier (uniquement à la 1re bande, avant de dessiner) : repeint le fond,
  // réinitialise l'historique sur cette base et adopte l'encre par défaut du papier.
  function changerPapier(p: Paper) {
    setPaper(p)
    const def = PAPERS.find(x => x.id === p) ?? PAPERS[0]
    setColor(def.ink)
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    peindreFond(ctx, canvas.width, canvas.height, def)
    undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
    redoStackRef.current = []
    bumpHistory()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ position: 'fixed', inset: 0, background: CANVAS_BG_ACTUEL, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* ── CANVAS ── */}
      <div
        ref={containerRef}
        style={{ position: 'relative', flex: 1, overflow: 'hidden', background: CANVAS_BG_ACTUEL, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={(e) => { setGhost(null); onPointerUp(e) }}
        onPointerCancel={onPointerUp}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '100%', height: '100%',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: pipetteActive ? 'copy' : panMode ? (isDrawing.current ? 'grabbing' : 'grab') : (tool === 'eraser' ? 'cell' : 'crosshair') }} />
        </div>

        {/* Curseur fantôme — aperçu de la taille/forme de l'outil sous le pointeur */}
        {ghost && !panMode && !pipetteActive && !showIntro && !showTransition && !showColorPanel && (() => {
          const factor = tool === 'eraser' ? 2.8 : tool === 'marker' ? 2.6 : tool === 'airbrush' ? 4.4 : tool === 'crayon' ? 2.2 : tool === 'brush' ? 1.8 : 1
          const diam = Math.max(6, SIZES[sizeIdx] * factor * zoom)
          return (
            <div style={{
              position: 'fixed', left: ghost.x, top: ghost.y,
              width: diam, height: diam, marginLeft: -diam / 2, marginTop: -diam / 2,
              borderRadius: '50%',
              border: `1px solid ${tool === 'eraser' ? `${paperDef.ink}66` : `${color}aa`}`,
              background: tool === 'eraser' ? 'transparent' : `${color}14`,
              pointerEvents: 'none', zIndex: 15,
            }} />
          )
        })()}

        {/* Ligne guide raccord */}
        {bandeIdx > 0 && config.visibilite === 'raccord' && canvasReady && (
          <div style={{
            position: 'absolute', top: RACCORD_H, left: 0, right: 0,
            height: 1,
            background: `linear-gradient(to right, transparent, ${accent}55 15%, ${accent}55 85%, transparent)`,
            pointerEvents: 'none', zIndex: 5,
          }}>
            <span style={{ position: 'absolute', right: 8, top: -12, ...mono, fontSize: 13, color: accent, background: `${CANVAS_BG_ACTUEL}ee`, padding: '1px 6px' }}>
              ← RACCORD
            </span>
          </div>
        )}

        {/* Badge joueur — couleurs liées au papier pour rester lisible sur tout fond */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          ...mono, fontSize: 13, color: paperDef.ink,
          background: `${paperDef.bg}ee`, padding: '4px 10px',
          border: `0.5px solid ${paperDef.ink}30`, borderRadius: 3, pointerEvents: 'none',
        }}>
          JOUEUR {joueurActuel} · {bandeIdx + 1}/{config.nbBandes}
        </div>

        {/* Reset zoom */}
        {zoom > 1.05 && (
          <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0 }} style={{
            position: 'absolute', top: 10, right: 10,
            ...mono, fontSize: 13, color: paperDef.ink,
            background: `${paperDef.bg}ee`, border: `0.5px solid ${paperDef.ink}30`,
            borderRadius: 3,
            padding: '4px 10px', cursor: 'pointer', zIndex: 10,
          }}>
            ↺ {Math.round(zoom * 100)}%
          </button>
        )}
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{
        height: `calc(${TOOLBAR_H}px + max(0px, env(safe-area-inset-bottom) - 10px))`,
        flexShrink: 0, zIndex: 20,
        background: '#f0e9df',
        boxShadow: '0 -2px 20px rgba(15,8,5,0.10)',
        borderRadius: '18px 18px 0 0',
        padding: `12px 16px max(10px, env(safe-area-inset-bottom))`,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* Rangée outils — défilement horizontal fluide */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              flex: 1, minWidth: 0,
              overflowX: 'auto', overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {TOOL_ORDER.map(t => {
              const active = tool === t
              const Icon = TOOL_ICONS[t]
              // Fixed dark ink for toolbar (always readable on the fixed beige #f0e9df background)
              const TOOLBAR_INK = '#1a1208'
              const nib = t === 'eraser' ? '#f3a9b8' : color
              const tint = TOOLBAR_INK
              return (
                <button
                  key={t}
                  onClick={() => setTool(t)}
                  aria-pressed={active}
                  title={TOOL_NAMES[t]}
                  style={{
                    flex: '0 0 auto', width: 52, height: 62,
                    paddingTop: 6, paddingBottom: 4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                    background: active ? '#ffffff' : 'transparent',
                    border: 'none', borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'background 0.15s, opacity 0.15s',
                    opacity: active ? 1 : 0.42,
                  }}
                >
                  <Icon tint={tint} nib={nib} />
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, letterSpacing: '0.04em', color: active ? accent : TOOLBAR_INK }}>
                    {TOOL_NAMES[t].toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Séparateur */}
          <div style={{ width: 1, height: 38, background: `${TB_INK}12`, flexShrink: 0 }} />

          {/* Bouton couleur */}
          <button
            onClick={() => setShowColorPanel(true)}
            aria-label="Choisir une couleur"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: tool === 'eraser' ? '#f0ede8' : color,
              border: `2px solid ${tool === 'eraser' ? `${TB_INK}20` : (color === '#ffffff' ? `${TB_INK}30` : 'transparent')}`,
              boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s, transform 0.1s',
            }}
          />
        </div>

        {/* Rangée opacité */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: 13, color: `${TB_INK}80`, flexShrink: 0, width: 76, whiteSpace: 'nowrap' }}>OPACITÉ</span>
          <input
            type="range" min={10} max={100} step={5}
            value={Math.round(opacity * 100)}
            onChange={e => setOpacity(Number(e.target.value) / 100)}
            aria-label="Opacité du trait"
            disabled={tool === 'eraser'}
            style={{ flex: 1, accentColor: accent, cursor: tool === 'eraser' ? 'default' : 'pointer', opacity: tool === 'eraser' ? 0.35 : 1 }}
          />
          <span style={{ ...mono, fontSize: 13, color: TB_INK, opacity: 0.7, width: 34, textAlign: 'right' }}>
            {Math.round(opacity * 100)}%
          </span>
        </div>

        {/* Rangée tailles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ ...mono, fontSize: 13, color: `${TB_INK}80`, flexShrink: 0, width: 76, whiteSpace: 'nowrap' }}>TAILLE</span>
          <div style={{ display: 'flex', flex: 1, gap: 4, alignItems: 'center' }}>
            {SIZES.map((sz, i) => (
              <button
                key={i}
                onClick={() => setSizeIdx(i)}
                aria-pressed={sizeIdx === i}
                style={{
                  flex: 1, height: 34,
                  background: sizeIdx === i ? '#f5f0ea' : 'transparent',
                  border: 'none', borderRadius: 3,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
              >
                <div style={{
                  width: Math.min(sz * 0.7 + 3, 22),
                  height: Math.min(sz * 0.7 + 3, 22),
                  borderRadius: '50%',
                  background: sizeIdx === i ? (tool === 'eraser' ? TB_INK : color) : `${TB_INK}80`,
                  transition: 'background 0.15s',
                }} />
              </button>
            ))}
          </div>
          {/* Undo / redo */}
          {(() => {
            const canUndo = undoStackRef.current.length > 1
            const canRedo = redoStackRef.current.length > 0
            return (
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Annuler"
                  title="Annuler (Ctrl+Z)"
                  style={{
                    width: 34, height: 34, borderRadius: 3, border: 'none',
                    background: canUndo ? `${accent}18` : 'transparent',
                    color: canUndo ? accent : TB_INK,
                    opacity: canUndo ? 1 : 0.35,
                    fontSize: 18,
                    cursor: canUndo ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ↩
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Rétablir"
                  title="Rétablir (Ctrl+Shift+Z)"
                  style={{
                    width: 34, height: 34, borderRadius: 3, border: 'none',
                    background: canRedo ? `${accent}18` : 'transparent',
                    color: canRedo ? accent : TB_INK,
                    opacity: canRedo ? 1 : 0.35,
                    fontSize: 18,
                    cursor: canRedo ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ↪
                </button>
              </div>
            )
          })()}
        </div>

        {/* Rangée action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Son */}
          <button onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Activer le son' : 'Couper le son'}
            style={{
              width: 36, height: 36, borderRadius: 3, border: 'none',
              background: '#c8bfb0',
              fontSize: 17, cursor: 'pointer',
              color: muted ? '#888070' : '#1a1208',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {muted ? '♪' : '♫'}
          </button>
          {/* Mode navigation / zoom */}
          <button
            onClick={() => setPanMode(p => !p)}
            aria-pressed={panMode}
            aria-label={panMode ? 'Retour au dessin' : 'Naviguer / zoomer'}
            title={panMode ? 'Retour au dessin' : 'Naviguer / Zoomer'}
            style={{
              width: 36, height: 36, borderRadius: 3, border: 'none',
              background: panMode ? accent : '#c8bfb0',
              color: panMode ? '#fff' : '#1a1208',
              fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ✥
          </button>
          {/* Compte-gouttes */}
          <button
            onClick={() => {
              if (pipetteActive) { setPipetteActive(false); return }
              toolAvantPipette.current = tool
              setPipetteActive(true)
            }}
            aria-pressed={pipetteActive}
            aria-label="Compte-gouttes"
            title="Prélever une couleur sur le canvas"
            style={{
              width: 36, height: 36, borderRadius: 3, border: 'none',
              background: pipetteActive ? accent : '#c8bfb0',
              color: pipetteActive ? '#fff' : '#1a1208',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M13.5 1.5 C14.5 2.5 14.5 4 13.5 5L8 10.5L5.5 11.5L6.5 9L12 3.5 C13 2.5 12.5 0.5 13.5 1.5Z"
                fill="currentColor" fillOpacity="0.9" />
              <circle cx="4" cy="13" r="2" fill="currentColor" fillOpacity="0.75"/>
            </svg>
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={validerBande} style={{
            ...mono, fontSize: 17,
            background: encre, color: bg,
            border: 'none', cursor: 'pointer',
            padding: '10px 24px', borderRadius: 3,
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
                <div style={{ width: 32, height: 32, borderRadius: 3, background: color, border: `1px solid ${TB_INK}20`, flexShrink: 0 }} />
                <span style={{ ...mono, fontSize: 13, color: TB_INK, flex: 1, opacity: 0.85 }}>COULEUR PERSONNALISÉE</span>
                <input
                  type="color"
                  value={color}
                  onChange={e => { setColor(e.target.value); if (tool === 'eraser') setTool('pen') }}
                  style={{ width: 36, height: 36, padding: 3, border: `1px solid ${TB_INK}20`, borderRadius: 3, cursor: 'pointer' }}
                />
              </div>

              {/* Couleurs récentes */}
              {recentColors.length > 0 && (
                <>
                  <span style={{ ...mono, fontSize: 13, color: `${TB_INK}55`, display: 'block', marginBottom: 6 }}>RÉCENTES</span>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
                    {recentColors.map(col => (
                      <button
                        key={col}
                        onClick={() => { setColor(col); if (tool === 'eraser') setTool('pen'); setShowColorPanel(false) }}
                        style={{
                          width: 32, height: 32, borderRadius: 3, flex: '0 0 auto',
                          background: col,
                          border: color.toLowerCase() === col.toLowerCase() ? `2.5px solid ${accent}` : `1px solid ${TB_INK}22`,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Grille 4×8 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: 14 }}>
                {PALETTE.map(col => (
                  <button
                    key={col}
                    onClick={() => { setColor(col); if (tool === 'eraser') setTool('pen'); setShowColorPanel(false) }}
                    style={{
                      height: 32, borderRadius: 3,
                      background: col,
                      border: color === col
                        ? `2.5px solid ${accent}`
                        : ['#ffffff', '#e8e8e8', '#f0e4cc', '#FFF9C4', '#FCE4EC', '#F3E5F5'].includes(col)
                          ? `1px solid ${TB_INK}22`
                          : '2.5px solid transparent',
                      cursor: 'pointer',
                      transition: 'transform 0.08s',
                    }}
                  />
                ))}
              </div>

              <button onClick={() => setShowColorPanel(false)} style={{
                width: '100%', padding: '12px',
                ...mono, fontSize: 13, background: '#f5f0ea', color: TB_INK,
                border: 'none', borderRadius: 3, cursor: 'pointer',
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
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <Etiquette bg={accent} color={btnText} rotation={-1.4} style={{ fontSize: 11, letterSpacing: '0.14em' }}>
                  BANDE 1/{config.nbBandes}
                </Etiquette>
              </div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 'clamp(2.6rem, 12vw, 4.5rem)', color: bg, lineHeight: 1.1 }}>
                Joueur 1.
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: bg, opacity: 0.8, marginTop: 12 }}>
                Dessine la première bande.
              </div>
            </motion.div>

            {/* Choix du papier — n'apparaît qu'au tout début de la partie */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <Etiquette bg={accent} color={btnText} rotation={-1.4} style={{ fontSize: 11, letterSpacing: '0.14em' }}>
                PAPIER
              </Etiquette>
              <div style={{ display: 'flex', gap: 10 }}>
                {PAPERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => changerPapier(p.id)}
                    aria-pressed={paper === p.id}
                    title={p.nom}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <span style={{
                      width: 40, height: 40, borderRadius: 3, background: p.bg,
                      border: paper === p.id ? `2.5px solid ${accent}` : `1px solid rgba(255,255,255,0.25)`,
                      boxShadow: paper === p.id ? `0 0 0 3px ${accent}33` : 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                    }} />
                    <span style={{ ...mono, fontSize: 13, color: bg, opacity: paper === p.id ? 0.95 : 0.55, letterSpacing: '0.1em' }}>
                      {p.nom.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
              style={{ ...mono, fontSize: 13, color: bg, opacity: 0.75, letterSpacing: '0.2em' }}>
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
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <Etiquette bg={accent} color={btnText} rotation={-1.4} style={{ fontSize: 11, letterSpacing: '0.14em' }}>
                  BANDE {bandeIdx + 2}/{config.nbBandes}
                </Etiquette>
              </div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 'clamp(2.6rem, 12vw, 4.5rem)', color: bg, lineHeight: 1.1 }}>
                Joueur {nextPlayerNum}.
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: bg, opacity: 0.8, marginTop: 12 }}>
                Passe l'écran. Ne regarde pas.
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
              style={{ ...mono, fontSize: 13, color: bg, opacity: 0.75, letterSpacing: '0.2em' }}>
              TOUCHER POUR COMMENCER
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
