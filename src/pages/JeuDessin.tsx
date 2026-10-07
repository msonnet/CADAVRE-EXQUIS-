import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useReve, garantirContraste } from '../reve'
import { useAmbiance } from '../hooks/useAmbiance'
import { useSound } from '../hooks/useSound'
import type { ConfigDessin, BandeDessin } from '../types'
import { nomDeMain, corpsDuNom } from '../lib/table'
import { mono } from '../lib/typo'
import { zoneVivante } from '../lib/a11y'
import { tr, langueActuelle } from '../i18n'
import { partieDuCorps, partieNue } from '../lib/corps'
import MiniCoach from '../components/MiniCoach'
import { sauvegarderBandesDessin } from '../db'
import { useStudio } from '../hooks/useStudio'
import { OUTILS, type OutilId } from '../lib/trait/outils'
import Trousse from '../components/dessin/Trousse'
import ReglagesOutil from '../components/dessin/ReglagesOutil'
import Nuancier from '../components/dessin/Nuancier'
import RegleVisible from '../components/dessin/RegleVisible'


// Fonds de papier — texture procédurale dessinée au démarrage de chaque bande
type Paper = 'lisse' | 'kraft' | 'parchemin' | 'ardoise'
const PAPERS: { id: Paper; nom: string; bg: string; grain: string; ink: string }[] = [
  { id: 'lisse',      nom: tr('Lisse', 'Smooth'),        bg: '#fdf8f2', grain: '#00000000', ink: '#1a1410' },
  { id: 'kraft',      nom: tr('Kraft', 'Kraft'),         bg: '#cdb48c', grain: '#5a4326',   ink: '#2c1d0e' },
  { id: 'parchemin',  nom: tr('Parchemin', 'Parchment'), bg: '#f3e7cb', grain: '#b89a63',   ink: '#3a2a14' },
  { id: 'ardoise',    nom: tr('Ardoise', 'Slate'),       bg: '#2f3438', grain: '#0d0f11',   ink: '#e8e4dc' },
]


// La trousse (92) et la rangée des gestes (44), plus leurs marges.
const TOOLBAR_H = 178
const RACCORD_H = 80

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function melangerHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${c(A.r, B.r)}${c(A.g, B.g)}${c(A.b, B.b)}`
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

  // Reprise après refresh/kill : les bandes déjà validées sont rechargées et
  // la partie redémarre sur l'écran de passage du joueur suivant.
  const [brouillonDessin] = useState<{ bandes: BandeDessin[]; paper: Paper } | null>(() => {
    try {
      const raw = sessionStorage.getItem('dessin-brouillon')
      const b = raw ? JSON.parse(raw) : null
      return b?.bandes?.length ? b : null
    } catch { return null }
  })

  const [bandes, setBandes] = useState<BandeDessin[]>([])
  const [bandeIdx, setBandeIdx] = useState(() => brouillonDessin ? brouillonDessin.bandes.length - 1 : 0)
  // Papier choisi pour toute la partie (fixé à la première bande pour garder l'unité visuelle)
  const [paper, setPaper] = useState<Paper>(() => brouillonDessin?.paper ?? 'lisse')
  const paperDef = PAPERS.find(p => p.id === paper) ?? PAPERS[0]
  const CANVAS_BG_ACTUEL = paperDef.bg
  // Barre d'outils thémée par le papier choisi : son encre garantit la
  // lisibilité, l'accent de la séance est ramené au contraste minimal.
  const TB_INK = paperDef.ink
  const TB_BG = melangerHex(paperDef.bg, paperDef.ink, 0.06)
  const TB_BTN = `${TB_INK}22`
  // Pipette : capture une fois la couleur puis revient à l'outil précédent
  const [pipetteActive, setPipetteActive] = useState(false)
  // Couleurs récemment employées (les plus récentes d'abord, max 8)
  const [recentColors, setRecentColors] = useState<string[]>([])
  // Curseur fantôme (aperçu de taille/position sous le doigt avant de poser)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  // Force re-render when the undo/redo stacks change (kept in refs to avoid re-renders during drawing)
  const [, setHistoryTick] = useState(0)
  const bumpHistory = useCallback(() => setHistoryTick(t => t + 1), [])
  const [panMode, setPanMode] = useState(false)
  const [showTransition, setShowTransition] = useState(() => !!brouillonDessin)
  const rideauOuvert = useRef(!!brouillonDessin)
  const [showIntro, setShowIntro] = useState(() => !brouillonDessin)
  const [nextPlayerNum, setNextPlayerNum] = useState(() =>
    brouillonDessin ? (brouillonDessin.bandes.length % config.joueurs) + 1 : 2
  )
  const [pendingBandes, setPendingBandes] = useState<BandeDessin[]>(() => brouillonDessin?.bandes ?? [])
  const [confirmExit, setConfirmExit] = useState(false)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [erreurEnregistrement, setErreurEnregistrement] = useState(false)

  // Zoom/pan
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const zoomRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // La couche du trait en cours, posée sur la feuille : il y vit tant que le
  // doigt est posé, et y est versé d'un bloc au lever (`useStudio`).
  const coucheRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)

  // Historique d'annulation : snapshots ImageData empilés à chaque pointerup (max 20)
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
  // Une forme redressée se nomme un instant, puis s'efface.
  const [formeVue, setFormeVue] = useState<string | null>(null)
  useEffect(() => {
    if (!studio.redresse) return
    setFormeVue(studio.redresse)
    const t = setTimeout(() => setFormeVue(null), 1100)
    return () => clearTimeout(t)
  }, [studio.redresse])

  const joueurActuel = (bandeIdx % config.joueurs) + 1
  // Le prénom quand les préparatifs l'ont donné, le numéro sinon — comme au
  // cadavre écrit. Le trait d'union ASCII n'a pas de dessin dans la Bodoni
  // auto-hébergée : on pose le typographique.
  const appel = (num: number) =>
    (nomDeMain(config.noms, num) ?? `${tr('Joueur', 'Player')} ${num}`).replace(/-/g, '\u2010')
  const corpsAppel = (num: number) => {
    const n = nomDeMain(config.noms, num)
    return n ? corpsDuNom(n) : 'clamp(2.6rem, 12vw, 4.5rem)'
  }
  const c = seance?.colorSchema
  const accent = c?.second ?? '#1d3a8c'
  // Accent de la séance ramené au contraste minimal sur la barre papier
  const TB_ACCENT = garantirContraste(accent, TB_BG, 3.0)
  const encre = c?.encre ?? '#0f0805'
  const bg = c?.bg ?? '#0f0805'

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
    const couche = coucheRef.current
    if (couche) { couche.width = canvas.width; couche.height = canvas.height; couche.style.width = `${cssW}px`; couche.style.height = `${cssH}px` }
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
      if (col) {
        // La gomme n'a pas de couleur : la pipette rend la main au crayon.
        const cible = OUTILS[studio.outil].sansCouleur ? 'crayon' : studio.outil
        studio.setOutil(cible); studio.changerReglage(cible, { couleur: col }); ajouterCouleurRecente(col)
      }
      setPipetteActive(false)
      return
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      if (panMode) {
        isDrawing.current = false
      } else {
        isDrawing.current = true
        studio.debut(e.clientX, e.clientY, e.pressure, e.pointerType)
      }
    } else {
      // Un second doigt : c'était un pincement, pas un trait. Le début de
      // trait du premier doigt est retiré, il n'a jamais eu lieu.
      if (isDrawing.current) studio.fin(true)
      isDrawing.current = false
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
      studio.suite(events.length > 0 ? events : [e])
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasDrawing = isDrawing.current && pointersRef.current.size === 1
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      // Trait terminé : on capture l'état du canvas pour permettre l'annulation
      if (wasDrawing) studio.fin()
      isDrawing.current = false
      lastPinchDist.current = null; lastPinchMid.current = null
    }
  }

  async function validerBande() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const lowestDrawnFraction = findLowestDrawnFraction(ctx, canvas.width, canvas.height, hexToRgb(paperDef.bg))
    const dpr = window.devicePixelRatio || 1
    const bande: BandeDessin = {
      joueurIdx: bandeIdx, joueurNumero: joueurActuel,
      // Le prénom voyage avec la bande : l'écran de fin la nomme.
      ...(nomDeMain(config.noms, joueurActuel) ? { nom: nomDeMain(config.noms, joueurActuel) } : {}),
      imageDataUrl: canvas.toDataURL('image/png'),
      width: canvas.width, height: canvas.height,
      lowestDrawnFraction, dpr, ts: Date.now(),
    }
    const nouvellesBandes = [...bandes, bande]
    setBandes(nouvellesBandes)
    jouer('soumettre')
    if (bandeIdx + 1 >= config.nbBandes) {
      // Le dessin complet part en base locale : sessionStorage ne tenait pas
      // quelques bandes plein écran à la résolution de l'appareil, et un quota
      // dépassé ici coûtait toute la partie. Le brouillon de reprise n'est
      // effacé qu'une fois l'écriture confirmée.
      try {
        await sauvegarderBandesDessin(nouvellesBandes, paper)
      } catch (e) {
        console.error('[dessin] enregistrement du dessin impossible', e)
        setErreurEnregistrement(true)
        return
      }
      sessionStorage.removeItem('dessin-brouillon')
      navigate('/fin-dessin')
    } else {
      // Sauvegarde de reprise : un refresh ou un kill de l'app en pleine
      // partie ne coûte plus que la bande en cours, pas tout le dessin.
      try { sessionStorage.setItem('dessin-brouillon', JSON.stringify({ bandes: nouvellesBandes, paper })) }
      catch { /* quota dépassé : la reprise sera partielle, la partie continue */ }
      setNextPlayerNum(((bandeIdx + 1) % config.joueurs) + 1)
      setPendingBandes(nouvellesBandes)
      rideauOuvert.current = true
      setShowTransition(true)
    }
  }

  // Le rideau reste touchable pendant son fondu de sortie (0,5 s) : un
  // joueur qui le touche puis pose aussitôt le crayon le relevait une
  // SECONDE fois. L'indice sautait une bande — la bande de Léa disparaissait
  // du dessin et la suivante revenait à Nadja. Vu en mesurant les noms de
  // l'écran de fin : « TÊTE — Nadja, CORPS — Nadja », deux bandes sur trois.
  function demarrerProchainJoueur() {
    if (!rideauOuvert.current) return
    rideauOuvert.current = false
    setShowTransition(false); setBandes(pendingBandes)
    setBandeIdx(idx => idx + 1); setCanvasReady(false)
  }

  // Choix du papier (uniquement à la 1re bande, avant de dessiner) : repeint le fond,
  // réinitialise l'historique sur cette base et adopte l'encre par défaut du papier.
  function changerPapier(p: Paper) {
    setPaper(p)
    const def = PAPERS.find(x => x.id === p) ?? PAPERS[0]
    studio.encrerTout(def.ink)
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
      // Glisser le doigt ou le stylet ne doit jamais sélectionner le texte de l'écran.
      style={{ position: 'fixed', inset: 0, background: CANVAS_BG_ACTUEL, display: 'flex', flexDirection: 'column', paddingTop: 'var(--sa-top)', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* ── MINI-GUIDE (première partie dessinée uniquement) ── */}
      <MiniCoach
        cle="coach-dessin"
        actif={!showIntro && !showTransition && bandeIdx === 0 && canvasReady}
        accent={TB_ACCENT} encre={TB_INK} bg={CANVAS_BG_ACTUEL}
        etapes={[
          { titre: tr('Une bande à la fois.', 'One band at a time.'),
            corps: tr('Tu dessines ta portion du corps — les autres bandes resteront invisibles jusqu’à la fin. Les outils vivent en bas.', 'You draw your slice of the body — the other bands stay hidden until the end. The tools live at the bottom.') },
          { titre: tr('Le raccord.', 'The join.'),
            corps: tr('À la bande suivante, un fin liseré prolongera tes derniers traits — juste assez pour coudre les corps.', 'On the next band, a thin strip will carry your last strokes over — just enough to stitch the bodies together.') },
          { titre: tr('Valider, c’est sceller.', 'Done means sealed.'),
            corps: tr('Une bande validée ne se rouvre pas. À la dernière, le monstre entier se révèle.', 'A finished band can’t be reopened. On the last one, the whole monster is revealed.') },
        ]}
      />

      {/* ── ÉCHEC D'ENREGISTREMENT — la partie reste ouverte, on peut réessayer ── */}
      {erreurEnregistrement && (
        <div role="alert" style={{
          position: 'fixed', top: 'max(10px, var(--sa-top))', left: 12, right: 12, zIndex: 60,
          background: TB_BG, border: `1px solid ${TB_ACCENT}`, borderRadius: 3,
          padding: '10px 14px', ...mono, fontSize: 13, color: TB_INK,
        }}>
          {tr("Le dessin n'a pas pu être enregistré. Touche VALIDER à nouveau.",
              'The drawing could not be saved. Tap DONE again.')}
        </div>
      )}

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
          <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', cursor: pipetteActive ? 'copy' : panMode ? (isDrawing.current ? 'grabbing' : 'grab') : (OUTILS[studio.outil].sansCouleur ? 'cell' : 'crosshair') }} />
          <canvas ref={coucheRef} aria-hidden style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
        </div>

        {/* Curseur fantôme — la taille exacte de l'instrument sous le pointeur */}
        {ghost && !panMode && !pipetteActive && !showIntro && !showTransition && !showColorPanel && (() => {
          const sans = OUTILS[studio.outil].sansCouleur
          const diam = Math.max(6, studio.reglage.taille * zoom)
          return (
            <div style={{
              position: 'fixed', left: ghost.x, top: ghost.y,
              width: diam, height: diam, marginLeft: -diam / 2, marginTop: -diam / 2,
              borderRadius: '50%',
              border: `1px solid ${sans ? `${encre}66` : `${studio.reglage.couleur}aa`}`,
              background: sans ? 'transparent' : `${studio.reglage.couleur}14`,
              pointerEvents: 'none', zIndex: 15,
            }} />
          )
        })()}

        {/* La règle, quand on l'a sortie de la trousse */}
        {studio.regle && <RegleVisible regle={studio.regle} onChange={studio.setRegle} />}

        {/* La forme redressée se nomme un instant */}
        <div {...zoneVivante} style={{
          position: 'absolute', top: 54, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 11,
          ...mono, fontSize: 12, letterSpacing: '0.26em', color: TB_INK, opacity: formeVue ? 0.8 : 0, transition: 'opacity 0.25s',
        }}>
          {formeVue && `— ${({ droite: tr('DROITE', 'LINE'), ellipse: tr('ELLIPSE', 'ELLIPSE'), rectangle: tr('RECTANGLE', 'RECTANGLE'), triangle: tr('TRIANGLE', 'TRIANGLE') } as Record<string, string>)[formeVue]} —`}
        </div>

        {/* Ligne guide raccord */}
        {bandeIdx > 0 && config.visibilite === 'raccord' && canvasReady && (
          <div style={{
            position: 'absolute', top: RACCORD_H, left: 0, right: 0,
            height: 1,
            background: `linear-gradient(to right, transparent, ${accent}55 15%, ${accent}55 85%, transparent)`,
            pointerEvents: 'none', zIndex: 5,
          }}>
            <span style={{ position: 'absolute', right: 8, top: -12, ...mono, fontSize: 13, color: TB_ACCENT, background: `${CANVAS_BG_ACTUEL}ee`, padding: '1px 6px' }}>
              ← {tr('RACCORD', 'JOIN')}
            </span>
          </div>
        )}

        {/* Badge joueur — couleurs du papier : lisible sur ardoise comme sur lisse */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          ...mono, fontSize: 13, color: TB_INK,
          background: `${paperDef.bg}e0`, padding: '4px 10px',
          border: `0.5px solid ${TB_INK}25`, borderRadius: 3, pointerEvents: 'none',
        }}>
          {appel(joueurActuel).toUpperCase()} · {bandeIdx + 1}/{config.nbBandes}
          {partieNue(bandeIdx, config.nbBandes, langueActuelle()) && <> · {partieNue(bandeIdx, config.nbBandes, langueActuelle())!.toUpperCase()}</>}
        </div>

        {/* Quitter la partie — seule sortie sans passer par le geste OS */}
        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          {!confirmExit ? (
            <button
              onClick={() => setConfirmExit(true)}
              aria-label={tr('Abandonner le dessin', 'Abandon the drawing')}
              style={{
                ...mono, fontSize: 13, color: TB_INK,
                background: `${paperDef.bg}e0`, border: `0.5px solid ${TB_INK}25`,
                borderRadius: 3, padding: '10px 12px', minHeight: 40, cursor: 'pointer',
              }}
            >✕</button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: `${paperDef.bg}f2`, border: `0.5px solid ${TB_INK}30`, borderRadius: 3, padding: '4px 8px' }}>
              <span style={{ ...mono, fontSize: 12, color: TB_INK, opacity: 0.85 }}>{tr('ABANDONNER ?', 'ABANDON?')}</span>
              <button
                onClick={() => { sessionStorage.removeItem('dessin-brouillon'); navigate('/') }}
                style={{ ...mono, fontSize: 13, color: TB_ACCENT, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px' }}
              >{tr('OUI', 'YES')}</button>
              <button
                onClick={() => setConfirmExit(false)}
                style={{ ...mono, fontSize: 13, color: TB_INK, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px' }}
              >{tr('NON', 'NO')}</button>
            </div>
          )}
        </div>

        {/* Reset zoom */}
        {zoom > 1.05 && (
          <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0 }} style={{
            position: 'absolute', top: 10, right: 56,
            ...mono, fontSize: 13, color: TB_INK,
            background: `${paperDef.bg}e0`, border: `0.5px solid ${TB_INK}25`,
            borderRadius: 3,
            padding: '4px 10px', cursor: 'pointer', zIndex: 10,
          }}>
            ↺ {Math.round(zoom * 100)}%
          </button>
        )}
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{
        height: `calc(${TOOLBAR_H}px + max(0px, var(--sa-bottom) - 10px))`,
        flexShrink: 0, zIndex: 20,
        background: TB_BG,
        boxShadow: '0 -2px 20px rgba(15,8,5,0.10)',
        borderRadius: '18px 18px 0 0',
        padding: `12px 16px max(10px, var(--sa-bottom))`,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* La trousse ; le second toucher sur l'instrument levé ouvre ses réglages */}
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

        {/* Rangée action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Son */}
          <button onClick={toggleMute} aria-pressed={muted} aria-label={muted ? tr('Activer le son', 'Unmute sound') : tr('Couper le son', 'Mute sound')}
            style={{
              width: 44, height: 44, borderRadius: 3, border: 'none',
              background: TB_BTN,
              fontSize: 17, cursor: 'pointer',
              color: muted ? `${TB_INK}88` : TB_INK,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {muted ? '♪' : '♫'}
          </button>
          {/* Mode navigation / zoom */}
          <button
            onClick={() => setPanMode(p => !p)}
            aria-pressed={panMode}
            aria-label={panMode ? tr('Retour au dessin', 'Back to drawing') : tr('Naviguer / zoomer', 'Pan / zoom')}
            title={panMode ? tr('Retour au dessin', 'Back to drawing') : tr('Naviguer / Zoomer', 'Pan / Zoom')}
            style={{
              width: 44, height: 44, borderRadius: 3, border: 'none',
              background: panMode ? TB_ACCENT : TB_BTN,
              color: panMode ? '#fff' : TB_INK,
              fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ✥
          </button>
          {(() => {
            const canUndo = undoStackRef.current.length > 1
            const canRedo = redoStackRef.current.length > 0
            const geste = (actif: boolean) => ({
              width: 44, height: 44, borderRadius: 3, border: 'none',
              background: actif ? `${TB_ACCENT}20` : 'transparent',
              color: actif ? TB_ACCENT : TB_INK, opacity: actif ? 1 : 0.35,
              fontSize: 18, cursor: actif ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            } as const)
            return (<>
              <button onClick={undo} disabled={!canUndo} aria-label={tr('Annuler', 'Undo')} title={tr('Annuler (Ctrl+Z)', 'Undo (Ctrl+Z)')} style={geste(canUndo)}>↩</button>
              <button onClick={redo} disabled={!canRedo} aria-label={tr('Rétablir', 'Redo')} title={tr('Rétablir (Ctrl+Shift+Z)', 'Redo (Ctrl+Shift+Z)')} style={geste(canRedo)}>↪</button>
            </>)
          })()}
          <div style={{ flex: 1 }} />
          <button onClick={() => { setErreurEnregistrement(false); void validerBande() }} style={{
            ...mono, fontSize: 17,
            background: TB_INK, color: TB_BG,
            border: 'none', cursor: 'pointer',
            padding: '10px 18px', borderRadius: 3,
            letterSpacing: '0.16em', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {bandeIdx + 1 < config.nbBandes ? tr('VALIDER →', 'DONE →') : tr('RÉVÉLER →', 'REVEAL →')}
          </button>
        </div>
      </div>

      {/* ── NUANCIER ── */}
      <AnimatePresence>
        {showColorPanel && (
          <Nuancier
            couleur={studio.reglage.couleur} recentes={recentColors}
            onChoisir={c => studio.changerReglage(studio.outil, { couleur: c })}
            onPipette={() => { setShowColorPanel(false); setPipetteActive(true) }}
            onFermer={() => setShowColorPanel(false)}
          />
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
              <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.28em', marginBottom: 16, opacity: 0.8 }}>
                {tr('— BANDE', '— BAND')} 1/{config.nbBandes} · {(partieNue(0, config.nbBandes, langueActuelle()) ?? '').toUpperCase()} —
              </div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: corpsAppel(1), color: bg, lineHeight: 1.1, overflowWrap: 'anywhere', padding: '0 16px' }}>
                {appel(1)}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: bg, opacity: 0.8, marginTop: 12 }}>
                {partieDuCorps(0, config.nbBandes, langueActuelle())
                  ? tr(`Dessine ${partieDuCorps(0, config.nbBandes, 'fr')}.`, `Draw ${partieDuCorps(0, config.nbBandes, 'en')}.`)
                  : tr('Dessine la première bande.', 'Draw the first band.')}
              </div>
            </motion.div>

            {/* Choix du papier — n'apparaît qu'au tout début de la partie */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <span style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.24em', opacity: 0.8 }}>{tr('— PAPIER —', '— PAPER —')}</span>
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
              {tr('TOUCHER POUR COMMENCER', 'TAP TO BEGIN')}
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
              <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.28em', marginBottom: 16, opacity: 0.8 }}>
                {tr('— BANDE', '— BAND')} {bandeIdx + 2}/{config.nbBandes} · {(partieNue(bandeIdx + 1, config.nbBandes, langueActuelle()) ?? '').toUpperCase()} —
              </div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: corpsAppel(nextPlayerNum), color: bg, lineHeight: 1.1, overflowWrap: 'anywhere', padding: '0 16px' }}>
                {appel(nextPlayerNum)}.
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: bg, opacity: 0.8, marginTop: 12 }}>
                {tr("Passe l'écran. Ne regarde pas.", "Pass the screen. Don't look.")}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
              style={{ ...mono, fontSize: 13, color: bg, opacity: 0.75, letterSpacing: '0.2em' }}>
              {tr('TOUCHER POUR COMMENCER', 'TAP TO BEGIN')}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
