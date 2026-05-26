import React, { useState, useMemo, useCallback, createContext, useContext } from 'react'
import { mulberry32, pickOne, pickN, filtrerMemoire, incrementerMemoire } from './prng'
import { COLLAGES, type CollageDef, Hatches } from './collages'
import {
  COLOR_POOL, COLOR_SCHEMAS, type ColorKey, type ColorSchema,
  CITATIONS, ETIQ_POOL, HEURES_NOCTURNES, STRIPE_COMBOS,
  MARGINALIA, type StripeSpec, type Citation, type MargEntry,
} from './pools'

// ════════════════════════════════════════════════
// SÉANCE — composition unique par seed
// ════════════════════════════════════════════════

export interface SeanceReve {
  seed: number
  colorKey: ColorKey
  colorSchema: ColorSchema
  /** Symbole principal pour l'écran (1er du tirage). */
  symbole: CollageDef
  symbolSide: 'left' | 'right'
  /** Pour les écrans qui veulent placer 2-3 collages secondaires. */
  collages: CollageDef[]
  citation: Citation
  etiqs: [string, string]
  margs: MargEntry[]
  stripes: StripeSpec[]
  heure: string
  titreRotation: number
  subRotation: number
  titreAccentVertical: boolean
  /** Lettre du titre qui sera déréglée (0..13). */
  idxBiais: number
  angleBiais: number
  retirer: () => void
}

const ReveCtx = createContext<SeanceReve | null>(null)

function getStorageKey(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `cadavre-seed-${today}`
}

function composerSeance(seed: number): SeanceReve {
  const rng = mulberry32(seed)
  const colorKey = pickOne(rng, COLOR_POOL)
  const colorSchema = COLOR_SCHEMAS[colorKey]

  // 6 collages — le premier est le "symbole" principal
  const pool = filtrerMemoire(COLLAGES)
  const collages = pickN(rng, pool.length >= 6 ? pool : COLLAGES, 6)
  collages.forEach(c => incrementerMemoire(c.id))
  const symbole = collages[0]
  const symbolSide = rng() > 0.5 ? 'right' : 'left'

  const citation = pickOne(rng, CITATIONS)
  const etiqs = pickOne(rng, ETIQ_POOL)
  const margs = pickN(rng, MARGINALIA, 4)
  const stripes = pickOne(rng, STRIPE_COMBOS)
  const heure = pickOne(rng, HEURES_NOCTURNES)
  const titreRotation = rng() * 2 - 1
  const subRotation = rng() * 3 - 1.5
  const titreAccentVertical = rng() > 0.5
  const idxBiais = Math.floor(rng() * 14)
  const angleBiais = rng() * 12 - 6

  return {
    seed, colorKey, colorSchema, symbole, symbolSide, collages,
    citation, etiqs, margs, stripes, heure,
    titreRotation, subRotation, titreAccentVertical,
    idxBiais, angleBiais,
    retirer: () => {},
  }
}

export function ReveProvider({ children }: { children: React.ReactNode }) {
  const [seed, setSeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 42
    const key = getStorageKey()
    const saved = localStorage.getItem(key)
    if (saved) return parseInt(saved)
    const fresh = Math.floor(Math.random() * 100000)
    localStorage.setItem(key, String(fresh))
    return fresh
  })
  const retirer = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 100000)
    localStorage.setItem(getStorageKey(), String(newSeed))
    setSeed(newSeed)
  }, [])
  const seance = useMemo<SeanceReve>(() => {
    const s = composerSeance(seed)
    s.retirer = retirer
    return s
  }, [seed, retirer])
  return (
    <ReveCtx.Provider value={seance}>
      <Hatches />
      {children}
    </ReveCtx.Provider>
  )
}

export function useReve(): SeanceReve | null {
  return useContext(ReveCtx)
}

// ════════════════════════════════════════════════
// ZONES PAR ÉCRAN — chaque écran a SES zones protégées
// Les composants Décor respectent ces zones automatiquement
// ════════════════════════════════════════════════

export type Variant = 'accueil' | 'config' | 'jeu' | 'jeu-ia' | 'fin' | 'fin-image' | 'biblio' | 'aide' | 'detail' | 'config-dessin' | 'jeu-dessin' | 'fin-dessin'

interface InkBlotDef {
  pos: { top?: string; bottom?: string; left?: string; right?: string }
  size: number
  delay: number
}

interface VariantZones {
  symbol: { top?: string; bottom?: string; left?: string; right?: string; sizeMul: number } | null
  etiqs: React.CSSProperties[]
  stripesMax: number
  inkBlots: InkBlotDef[]
  verticalTitle: { side: 'left' | 'right' } | null
  citation: boolean
  signature: boolean
}

const ZONES: Record<Variant, VariantZones> = {
  accueil: {
    symbol: { top: '13%', sizeMul: 0.9 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { top: '34%', right: '-3%' }, size: 92, delay: 0.9 },
      { pos: { top: '63%', right: '5%' }, size: 46, delay: 1.5 },
    ],
    verticalTitle: { side: 'right' },
    citation: true,
    signature: true,
  },
  config: {
    symbol: { top: '12%', right: '4%', sizeMul: 0.6 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', left: '0' }, size: 78, delay: 1.1 },
      { pos: { bottom: '0', right: '0' }, size: 38, delay: 1.85 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  jeu: {
    symbol: { bottom: '14%', right: '4%', sizeMul: 0.5 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [],
    verticalTitle: null,
    citation: false,
    signature: false,
  },
  'jeu-ia': {
    symbol: { top: '18%', sizeMul: 1.1 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [],
    verticalTitle: null,
    citation: false,
    signature: false,
  },
  fin: {
    symbol: { top: '12%', right: '5%', sizeMul: 0.55 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', right: '0' }, size: 72, delay: 1.2 },
      { pos: { top: '4%', left: '0' }, size: 36, delay: 2.0 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  'fin-image': {
    symbol: null,
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', left: '0' }, size: 60, delay: 1.3 },
      { pos: { bottom: '0', right: '0' }, size: 38, delay: 1.9 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  biblio: {
    symbol: { top: '12%', right: '4%', sizeMul: 0.5 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', right: '-2%' }, size: 68, delay: 1.0 },
      { pos: { bottom: '0', left: '-1%' }, size: 40, delay: 1.75 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  aide: {
    symbol: null,
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', right: '-2%' }, size: 60, delay: 1.0 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  detail: {
    symbol: null,
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', right: '0' }, size: 62, delay: 1.0 },
      { pos: { bottom: '0', left: '0' }, size: 34, delay: 1.8 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  'config-dessin': {
    symbol: { top: '12%', right: '4%', sizeMul: 0.6 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', left: '0' }, size: 68, delay: 1.1 },
      { pos: { bottom: '0', right: '0' }, size: 36, delay: 1.85 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  'jeu-dessin': {
    symbol: null,
    etiqs: [],
    stripesMax: 0,
    inkBlots: [],
    verticalTitle: null,
    citation: false,
    signature: false,
  },
  'fin-dessin': {
    symbol: { top: '12%', right: '5%', sizeMul: 0.55 },
    etiqs: [],
    stripesMax: 0,
    inkBlots: [
      { pos: { bottom: '0', right: '0' }, size: 72, delay: 1.2 },
      { pos: { top: '4%', left: '0' }, size: 36, delay: 2.0 },
    ],
    verticalTitle: null,
    citation: false,
    signature: true,
  },
}

// ════════════════════════════════════════════════
// DECOR — composant central
// ════════════════════════════════════════════════

interface DecorProps {
  variant: Variant
  hideCitation?: boolean
  hideSignature?: boolean
}

export function Decor({ variant, hideCitation, hideSignature }: DecorProps) {
  const seance = useReve()
  if (!seance) return null
  const zones = ZONES[variant]
  const c = seance.colorSchema

  let symbolPos = zones.symbol
  if (variant === 'accueil' && symbolPos) {
    // Symbol always on right so CADAVRE can own the left
    symbolPos = { ...symbolPos, right: '4%' } as VariantZones['symbol']
  }
  if (variant === 'jeu-ia' && symbolPos) {
    symbolPos = { ...symbolPos, left: '50%' } as VariantZones['symbol']
  }

  return (
    <>
      {seance.stripes.slice(0, zones.stripesMax).map((s, i) => (
        <Stripes key={i} pos={s.pos} size={s.size} height={s.height} color={c.encre} />
      ))}

      {zones.inkBlots.map((def, i) => (
        <InkBlot key={i} def={def} seed={seance.seed} idx={i} />
      ))}

      {zones.verticalTitle && (
        <VerticalAccent
          side="left"
          color={c.hex}
          rotation={seance.titreRotation}
        />
      )}

      {symbolPos && (
        <SymboleAvecCartel
          symbole={seance.symbole}
          color={c.encre}
          pos={symbolPos}
          variant={variant}
        />
      )}

      {zones.etiqs.map((style, i) => (
        <Etiquette key={i} style={{ ...style, position: 'absolute' as const }} delay={0.9 + i * 0.2}>
          {seance.etiqs[i % 2]}
        </Etiquette>
      ))}

      {zones.citation && !hideCitation && (
        <CitationManifeste citation={seance.citation} color={c.encre} accent={c.hex} />
      )}

      {zones.signature && !hideSignature && (
        <SignatureReve seance={seance} />
      )}
    </>
  )
}

// ─── Composants internes ──

const KLEIN_BLUE = '#002FA7'

const BLOB_SHAPES = [
  '63% 37% 54% 46% / 55% 48% 52% 45%',
  '45% 55% 37% 63% / 40% 60% 48% 52%',
  '55% 45% 65% 35% / 62% 38% 42% 58%',
  '35% 65% 48% 52% / 45% 55% 65% 35%',
  '68% 32% 42% 58% / 52% 48% 38% 62%',
  '72% 28% 55% 45% / 45% 55% 62% 38%',
  '40% 60% 73% 27% / 60% 40% 30% 70%',
  '58% 42% 35% 65% / 38% 62% 70% 30%',
  '80% 20% 60% 40% / 55% 45% 28% 72%',
  '25% 75% 45% 55% / 70% 30% 55% 45%',
]

function InkBlot({ def, seed, idx }: { def: InkBlotDef; seed: number; idx: number }) {
  const shapeIdx = (seed * (idx + 3)) % BLOB_SHAPES.length
  const sizeVar = 0.80 + ((seed * 7 + idx * 13) % 30) / 100
  const w = Math.round(def.size * sizeVar)
  const h = Math.round(w * (0.60 + (seed % 5) * 0.08))
  const rot = ((seed + idx * 17) % 40) - 20
  // Outer opacity is fixed; inner div animates 0→1 via fadeInQ so result = 0 → targetOpacity
  const targetOpacity = 0.10 + ((seed + idx * 11) % 6) * 0.015

  // Satellite 1 — medium droplet nearby
  const s1w = Math.round(w * (0.22 + ((seed * 3 + idx) % 12) / 100))
  const s1h = Math.round(s1w * (0.65 + (seed % 3) * 0.1))
  const s1x = Math.round(w * 0.55 + ((seed * 11) % Math.max(1, w / 5)))
  const s1y = Math.round(-h * 0.22 - ((seed * 5) % Math.max(1, h / 6)))

  // Satellite 2 — small isolated droplet
  const s2w = Math.round(w * (0.10 + ((seed * 9 + idx) % 8) / 100))
  const s2h = Math.round(s2w * (0.75 + (seed % 4) * 0.07))
  const s2x = Math.round(-w * 0.14 - ((seed * 7) % Math.max(1, w / 7)))
  const s2y = Math.round(h * 0.62 + ((seed * 11) % Math.max(1, h / 8)))

  return (
    <div style={{
      position: 'absolute', ...def.pos,
      opacity: targetOpacity,
      pointerEvents: 'none', zIndex: 1,
      willChange: 'opacity',
    }}>
      {/* Corps principal */}
      <div style={{
        position: 'relative',
        width: w, height: h,
        borderRadius: BLOB_SHAPES[shapeIdx],
        background: KLEIN_BLUE,
        transform: `rotate(${rot}deg) translateZ(0)`,
        filter: `blur(${Math.max(5, w / 10)}px)`,
        animation: `fadeInQ 2.4s ease-out ${def.delay}s both`,
      }} />
      {/* Satellite 1 */}
      <div style={{
        position: 'absolute', left: s1x, top: s1y,
        width: s1w, height: s1h,
        borderRadius: BLOB_SHAPES[(shapeIdx + 2) % BLOB_SHAPES.length],
        background: KLEIN_BLUE,
        transform: 'translateZ(0)',
        filter: `blur(${Math.max(3, s1w / 8)}px)`,
        animation: `fadeInQ 2.4s ease-out ${def.delay + 0.18}s both`,
      }} />
      {/* Satellite 2 */}
      <div style={{
        position: 'absolute', left: s2x, top: s2y,
        width: s2w, height: s2h,
        borderRadius: BLOB_SHAPES[(shapeIdx + 4) % BLOB_SHAPES.length],
        background: KLEIN_BLUE,
        transform: 'translateZ(0)',
        filter: `blur(${Math.max(2, s2w / 6)}px)`,
        animation: `fadeInQ 2.4s ease-out ${def.delay + 0.32}s both`,
      }} />
    </div>
  )
}

function Stripes({ pos, size, height, color }: { pos: StripeSpec['pos']; size: number; height: number; color: string }) {
  const positions = {
    'top-right':    { top: 0, right: 0, clipPath: 'polygon(20% 0, 100% 0, 100% 70%, 60% 100%, 0 75%)', angle: 135 },
    'bottom-left':  { bottom: 0, left: 0, clipPath: 'polygon(0 30%, 80% 60%, 100% 100%, 0 100%)', angle: 45 },
    'top-left':     { top: 0, left: 0, clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 80%)', angle: 135 },
    'bottom-right': { bottom: 0, right: 0, clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 30% 100%)', angle: 45 },
  }[pos]
  return (
    <div style={{
      position: 'absolute', ...positions,
      width: `${size}%`, height: `${height}%`,
      background: `repeating-linear-gradient(${positions.angle}deg, ${color} 0px, ${color} 1px, transparent 1px, transparent 6px)`,
      opacity: 0.72, pointerEvents: 'none', zIndex: 1,
      animation: 'stripesIn 1.4s cubic-bezier(0.34, 1.2, 0.64, 1) 0.4s both',
    }} />
  )
}

function VerticalAccent({ side, color, rotation }: { side: 'left' | 'right'; color: string; rotation: number }) {
  return (
    <div style={{
      position: 'absolute', top: '7%',
      [side]: 0,
      writingMode: 'vertical-rl',
      fontFamily: "'Bodoni Moda', serif",
      fontWeight: 900,
      fontSize: 'clamp(5.5rem, 26vw, 10rem)',
      lineHeight: 0.82, letterSpacing: '-0.04em',
      color, textTransform: 'uppercase',
      transform: rotation ? `rotate(${rotation}deg)` : undefined,
      zIndex: 3, pointerEvents: 'none',
      animation: 'inkBloomQ 1.2s 0.2s both',
    } as React.CSSProperties}>CADAVRE</div>
  )
}

function SymboleAvecCartel({
  symbole, color, pos, variant,
}: {
  symbole: CollageDef
  color: string
  pos: NonNullable<VariantZones['symbol']>
  variant: Variant
}) {
  const Draw = symbole.draw
  const size = symbole.w * pos.sizeMul
  const isCentered = variant === 'jeu-ia'
  return (
    <div style={{
      position: 'absolute',
      top: pos.top, bottom: pos.bottom,
      left: pos.left, right: pos.right,
      transform: isCentered ? 'translateX(-50%)' : undefined,
      zIndex: 3, opacity: 0, pointerEvents: 'none',
      animation: 'symbolDrop 1.1s cubic-bezier(0.34, 1.2, 0.64, 1) 0.5s both',
    }}>
      <Draw w={size} />
      {(variant === 'accueil' || variant === 'fin') && (
        <div style={{
          marginTop: 6,
          background: 'rgba(240, 228, 204, 0.92)',
          border: `0.5px solid ${color}`,
          padding: '3px 7px 4px',
          fontFamily: 'monospace',
          color,
          transform: 'rotate(-2deg)',
          maxWidth: 130, lineHeight: 1.25,
          boxShadow: '1px 1px 0 rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontSize: 8.5, letterSpacing: '0.12em', fontWeight: 700 }}>{symbole.label.toUpperCase()}</div>
          <div style={{ fontSize: 7.5, opacity: 0.75, marginTop: 1 }}>{symbole.ref}</div>
        </div>
      )}
    </div>
  )
}

function Etiquette({ children, style, delay }: { children: React.ReactNode; style: React.CSSProperties; delay: number }) {
  return (
    <div style={{
      ...style,
      background: '#f0e4cc', padding: '4px 10px 5px',
      fontFamily: 'monospace', fontSize: 11, lineHeight: 1.3,
      color: '#0f0805',
      boxShadow: '1px 2px 0 rgba(0,0,0,0.18)',
      zIndex: 6, opacity: 0,
      animation: `etiqDrop 0.7s ease-out ${delay}s both`,
      pointerEvents: 'none',
    }}>{children}</div>
  )
}

function CitationManifeste({ citation, color, accent }: { citation: Citation; color: string; accent: string }) {
  return (
    <div style={{
      position: 'absolute', bottom: '20%', left: '5%', right: '5%',
      fontFamily: 'monospace', fontSize: 9.5, lineHeight: 1.5,
      color, opacity: 0,
      animation: 'fadeInQ 0.8s 1.3s both',
      zIndex: 4, pointerEvents: 'none',
    }}>
      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, lineHeight: 1.5, opacity: 0.95 }}>
        {citation.t}
      </span>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, marginTop: 6 }}>
        {citation.a}
      </div>
    </div>
  )
}

function SignatureReve({ seance }: { seance: SeanceReve }) {
  return (
    <div style={{
      position: 'absolute', bottom: 4, right: 10,
      fontFamily: "'Caveat', cursive",
      color: seance.colorSchema.hex, fontSize: 10, opacity: 0.55,
      pointerEvents: 'none', zIndex: 6,
      animation: 'fadeInQ 0.8s 1.8s both',
    }}>
      rêvé à {seance.heure}
    </div>
  )
}

// ════════════════════════════════════════════════
// HeaderKeywords — bandeau pipe-séparé
// ════════════════════════════════════════════════
const KEYWORDS_POOL = [
  'rêve', 'inconscient', 'sept voix', 'fragment',
  'plume', 'anonyme', 'automatique', 'collage',
  'soluble', 'cadavre', 'syntaxe', 'mémoire',
]

export function HeaderKeywords({ count = 8 }: { count?: number }) {
  const seance = useReve()
  if (!seance) return null
  const rng = mulberry32(seance.seed + 999)
  const words = pickN(rng, KEYWORDS_POOL, count)
  const half = Math.ceil(count / 2)
  return (
    <div style={{ position: 'absolute', top: '3%', left: '5%', right: '5%', zIndex: 3, pointerEvents: 'none' }}>
      <div style={{
        fontSize: 8.5,
        fontFamily: "'IM Fell English', serif",
        color: seance.colorSchema.hex,
        lineHeight: 1.55, letterSpacing: '0.04em',
      }}>
        {words.slice(0, half).join(' | ')}<br />
        {words.slice(half).join(' | ')}
      </div>
      <hr style={{ border: 'none', borderTop: `1.3px solid ${seance.colorSchema.hex}`, marginTop: 6 }} />
    </div>
  )
}
