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

export type Variant = 'accueil' | 'config' | 'jeu' | 'jeu-ia' | 'fin' | 'fin-image' | 'biblio' | 'detail'

// Pour Jeu : SANCTUAIRE — décor mini en pied de page seulement
// Pour fin-image : variant à utiliser quand une image générée occupe le centre

interface VariantZones {
  /** Position du symbole principal (au sein de cette variante).
   *  Si null, on n'affiche pas de symbole principal. */
  symbol: { top?: string; bottom?: string; left?: string; right?: string; sizeMul: number } | null
  /** Position des étiquettes typewriter (jusqu'à 2). */
  etiqs: React.CSSProperties[]
  /** Combien de bandes optiques afficher (max). */
  stripesMax: number
  /** Position du titre vertical (CADAVRE). null = pas de titre. */
  verticalTitle: { side: 'left' | 'right' } | null
  /** Citation en bas ? */
  citation: boolean
  /** Signature « rêvé à... » ? */
  signature: boolean
}

const ZONES: Record<Variant, VariantZones> = {
  accueil: {
    symbol: { top: '13%', sizeMul: 0.9 },  // côté déterminé par seed
    etiqs: [
      { top: '62%', left: '30%', transform: 'rotate(-3deg)' },
      { top: '66%', left: '36%', transform: 'rotate(2deg)' },
    ],
    stripesMax: 2,
    verticalTitle: { side: 'right' }, // s'inverse selon seance.symbolSide
    citation: true,
    signature: true,
  },
  config: {
    symbol: { top: '12%', right: '4%', sizeMul: 0.6 },
    etiqs: [{ bottom: '32%', left: '8%', transform: 'rotate(-3deg)' }],
    stripesMax: 1,
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  jeu: {
    // SANCTUAIRE : seul un mini-symbole en pied de page
    symbol: { bottom: '14%', right: '4%', sizeMul: 0.5 },
    etiqs: [],
    stripesMax: 0,
    verticalTitle: null,
    citation: false,
    signature: false,
  },
  'jeu-ia': {
    // Le cadavre songe : symbole un peu plus grand au centre
    symbol: { top: '20%', sizeMul: 0.7 }, // centré horizontalement par le composant
    etiqs: [],
    stripesMax: 1,
    verticalTitle: null,
    citation: false,
    signature: false,
  },
  fin: {
    symbol: { top: '12%', right: '5%', sizeMul: 0.55 },
    etiqs: [{ bottom: '24%', left: '6%', transform: 'rotate(-2deg)' }],
    stripesMax: 1,
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  'fin-image': {
    // Quand une image générée occupe le centre : décor mini en marges seulement
    symbol: null,
    etiqs: [],
    stripesMax: 1,
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  biblio: {
    symbol: { top: '12%', right: '4%', sizeMul: 0.5 },
    etiqs: [{ bottom: '20%', left: '6%', transform: 'rotate(-3deg)' }],
    stripesMax: 1,
    verticalTitle: null,
    citation: false,
    signature: true,
  },
  detail: {
    symbol: { top: '14%', left: '4%', sizeMul: 0.5 },
    etiqs: [],
    stripesMax: 1,
    verticalTitle: null,
    citation: false,
    signature: true,
  },
}

// ════════════════════════════════════════════════
// SAFE ZONES — délimite les zones interactives PROTÉGÉES
// Les composants ci-dessous ne peuvent JAMAIS empiéter dessus
// ════════════════════════════════════════════════
// Le développeur indique au composant <Decor> quel variant, et le composant
// utilise les ZONES définies ci-dessus pour placer ses éléments en marges.
// Les zones centrales (formulaire, image, vers du poème, CTA principal) sont
// laissées libres : le décor ne s'y aventure jamais.

// ════════════════════════════════════════════════
// DECOR — composant central
// Place : symbole + cartel · étiquettes · rayures · citation · signature
// Tout est animé : symbolDrop · inkBloom · stripesIn · etiqDrop · fadeIn
// ════════════════════════════════════════════════

interface DecorProps {
  variant: Variant
  /** Cacher la citation, même si la variante la prévoit. */
  hideCitation?: boolean
  /** Cacher la signature, même si la variante la prévoit. */
  hideSignature?: boolean
}

export function Decor({ variant, hideCitation, hideSignature }: DecorProps) {
  const seance = useReve()
  if (!seance) return null
  const zones = ZONES[variant]
  const c = seance.colorSchema

  // Pour l'accueil, le symbole va du côté opposé au titre vertical
  let symbolPos = zones.symbol
  if (variant === 'accueil' && symbolPos) {
    symbolPos = { ...symbolPos, [seance.symbolSide]: '4%' } as VariantZones['symbol']
  }
  if (variant === 'jeu-ia' && symbolPos) {
    symbolPos = { ...symbolPos, left: '50%' } as VariantZones['symbol']
  }

  return (
    <>
      {/* Rayures optiques */}
      {seance.stripes.slice(0, zones.stripesMax).map((s, i) => (
        <Stripes key={i} pos={s.pos} size={s.size} height={s.height} color={c.encre} />
      ))}

      {/* Titre vertical (Accueil seulement) */}
      {zones.verticalTitle && (
        <VerticalAccent
          side={seance.symbolSide === 'right' ? 'left' : 'right'}
          color={seance.titreAccentVertical ? c.hex : c.encre}
          rotation={seance.titreRotation}
        />
      )}

      {/* Symbole + cartel */}
      {symbolPos && (
        <SymboleAvecCartel
          symbole={seance.symbole}
          color={c.encre}
          pos={symbolPos}
          variant={variant}
        />
      )}

      {/* Étiquettes typewriter */}
      {zones.etiqs.map((style, i) => (
        <Etiquette key={i} style={{ ...style, position: 'absolute' as const }} delay={0.9 + i * 0.2}>
          {seance.etiqs[i % 2]}
        </Etiquette>
      ))}

      {/* Citation manifeste */}
      {zones.citation && !hideCitation && (
        <CitationManifeste citation={seance.citation} color={c.encre} accent={c.hex} />
      )}

      {/* Signature « rêvé à... » */}
      {zones.signature && !hideSignature && (
        <SignatureReve seance={seance} />
      )}
    </>
  )
}

// ─── Composants internes ──

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
      position: 'absolute', top: '9%',
      [side]: '3%',
      writingMode: 'vertical-rl',
      fontFamily: "'Bodoni Moda', serif",
      fontWeight: 900,
      fontSize: 'clamp(4.8rem, 17vw, 6.4rem)',
      lineHeight: 0.82, letterSpacing: '-0.03em',
      color, textTransform: 'uppercase',
      transform: `rotate(${rotation}deg)`,
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
      {/* Cartel d'identification (uniquement sur accueil/fin) */}
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
          <div style={{ fontSize: 7.5, fontStyle: 'italic', opacity: 0.75, marginTop: 1 }}>{symbole.ref}</div>
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
      <em style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, lineHeight: 1.5, opacity: 0.95 }}>
        {citation.t}
      </em>
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
// HeaderKeywords (Accueil et autres) — bandeau pipe-séparé
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
