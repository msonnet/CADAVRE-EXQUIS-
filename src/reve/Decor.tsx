import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react'
import { mulberry32, pickN, pickOne, filtrerMemoire, incrementerMemoire } from './prng'
import { COLLAGES, type CollageDef, Hatches } from './collages'
import {
  MARGINALIA, DERLG, MOTS_TROUVES, TXT_TAMPONS, TXT_ERRATA,
  COLOR_POOL, COLOR_SCHEMAS, KEYWORDS_POOL, type ColorKey, type ColorSchema,
  type DereglementId, type MargEntry,
} from './pools'

// ════════════════════════════════════════════════
// REVE PROVIDER + HOOK
// ════════════════════════════════════════════════

interface SeanceReve {
  seed: number
  collages: CollageDef[]
  margs: MargEntry[]
  derlg: DereglementId
  motTrouve: string
  txtTampon: string
  txtErrata: string
  angleBiais: number
  idxBiais: number
  // ▼ nouveau : palette tirée pour le rêve courant
  colorKey: ColorKey
  colorSchema: ColorSchema
  retirer: () => void
}

const ReveCtx = createContext<SeanceReve | null>(null)

function getStorageKeyDuJour(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `cadavre-seed-${today}`
}

function composerSeance(seed: number): SeanceReve {
  const rng = mulberry32(seed)

  const pool = filtrerMemoire(COLLAGES)
  const collages = pickN(rng, pool, Math.min(6, pool.length))
  collages.forEach(c => incrementerMemoire(c.id))

  const margs = pickN(rng, MARGINALIA, 4)
  const derlg = pickOne(rng, DERLG)
  const motTrouve = pickOne(rng, MOTS_TROUVES)
  const txtTampon = pickOne(rng, TXT_TAMPONS)
  const txtErrata = pickOne(rng, TXT_ERRATA)
  const angleBiais = rng() * 12 - 6
  const idxBiais = Math.floor(rng() * 14)
  const colorKey = pickOne(rng, COLOR_POOL)
  const colorSchema = COLOR_SCHEMAS[colorKey]

  return {
    seed, collages, margs, derlg,
    motTrouve, txtTampon, txtErrata,
    angleBiais, idxBiais,
    colorKey, colorSchema,
    retirer: () => {},
  }
}

export function ReveProvider({ children }: { children: React.ReactNode }) {
  const [seed, setSeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 42
    const key = getStorageKeyDuJour()
    const saved = localStorage.getItem(key)
    if (saved) return parseInt(saved)
    const fresh = Math.floor(Math.random() * 100000)
    localStorage.setItem(key, String(fresh))
    return fresh
  })

  const retirer = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 100000)
    localStorage.setItem(getStorageKeyDuJour(), String(newSeed))
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
// COMPOSANTS DE DÉCOR
// Tous les composants ci-dessous sont POSITIONNÉS ABSOLUMENT
// Ils requièrent un parent en position: relative + overflow: hidden
// ════════════════════════════════════════════════

// ─── Variant configs : où placer collage / marginalia par écran ──
// Toutes les positions sont en POURCENTAGE (adaptatif)

type Variant = 'accueil' | 'config' | 'jeu' | 'fin' | 'biblio' | 'detail'

interface ZoneCollage {
  top?: string; bottom?: string
  left?: string; right?: string
  rotation: number
  size?: number  // multiplicateur de taille (0.55 = sanctuaire, 0.88 = normal)
  withTape?: boolean
}

// 4 zones candidates par variant — le seed en choisit une
const ZONES_COLLAGE: Record<Variant, ZoneCollage[]> = {
  accueil: [
    { top: '12%', left: '4%', rotation: -5, withTape: true },
    { top: '14%', right: '4%', rotation: 6 },
    { bottom: '24%', right: '5%', rotation: -6 },
    { bottom: '22%', left: '5%', rotation: 8, withTape: true },
  ],
  config: [
    { top: '12%', right: '4%', rotation: -6 },
    { top: '14%', left: '4%', rotation: 5 },
    { bottom: '28%', right: '5%', rotation: -8 },
  ],
  jeu: [
    // SANCTUAIRE : très petit, en marge basse
    { bottom: '8%', right: '4%', rotation: -4, size: 0.55 },
    { bottom: '8%', left: '4%', rotation: 5, size: 0.55 },
  ],
  fin: [
    { top: '10%', right: '4%', rotation: -7 },
    { top: '14%', left: '4%', rotation: 6, withTape: true },
    { bottom: '26%', right: '5%', rotation: -9 },
  ],
  biblio: [
    { top: '12%', right: '4%', rotation: 6, size: 0.6 },
    { bottom: '22%', right: '5%', rotation: -8, size: 0.55 },
  ],
  detail: [
    { top: '12%', right: '4%', rotation: -6 },
    { top: '14%', left: '4%', rotation: 7, withTape: true },
  ],
}

const ZONES_MARG: Record<Variant, React.CSSProperties[]> = {
  accueil: [
    { top: '38%', left: '6%', transform: 'rotate(-4deg)' },
    { top: '60%', right: '6%', transform: 'rotate(3deg)', textAlign: 'right' as const },
  ],
  config: [
    { bottom: '35%', left: '8%', transform: 'rotate(-3deg)' },
  ],
  jeu: [],  // sanctuaire — aucune
  fin: [
    { top: '32%', left: '6%', transform: 'rotate(-4deg)' },
  ],
  biblio: [
    { bottom: '20%', left: '8%', transform: 'rotate(-3deg)' },
  ],
  detail: [
    { top: '30%', right: '6%', transform: 'rotate(3deg)', textAlign: 'right' as const },
  ],
}

// ─── Papier déchiré : 4 formes ──
const TORN_CLIPS = [
  'polygon(2% 3%, 14% 0%, 28% 2%, 44% 0%, 58% 3%, 74% 0%, 89% 2%, 100% 5%, 98% 18%, 100% 32%, 99% 47%, 100% 62%, 98% 76%, 100% 90%, 92% 100%, 78% 98%, 60% 100%, 42% 98%, 22% 100%, 6% 96%, 0% 82%, 2% 65%, 0% 48%, 3% 30%, 0% 14%)',
  'polygon(0% 8%, 8% 2%, 22% 5%, 38% 1%, 56% 4%, 72% 0%, 88% 3%, 100% 7%, 98% 22%, 100% 40%, 98% 58%, 100% 76%, 98% 92%, 86% 100%, 68% 98%, 48% 100%, 28% 98%, 10% 100%, 2% 88%, 0% 70%, 3% 50%, 0% 32%, 2% 18%)',
  'polygon(4% 2%, 16% 0%, 35% 4%, 55% 0%, 75% 4%, 92% 0%, 100% 10%, 98% 28%, 100% 48%, 98% 68%, 100% 88%, 88% 100%, 68% 98%, 42% 100%, 18% 98%, 0% 92%, 4% 70%, 0% 45%, 3% 22%)',
  'polygon(3% 5%, 18% 1%, 36% 3%, 58% 0%, 78% 3%, 95% 1%, 100% 12%, 98% 30%, 100% 52%, 98% 72%, 100% 90%, 90% 100%, 72% 98%, 48% 100%, 28% 98%, 8% 100%, 0% 88%, 3% 65%, 0% 42%, 2% 22%)',
]

interface DecorProps {
  variant?: Variant
  collageIndex?: number
  hideMarginalia?: boolean
  hideDereglement?: boolean
  /** Force un collage particulier. Si omis, c'est le 1er du tirage rêve. */
  collageOverride?: CollageDef
}

/** Décor complet pour un écran. Doit être placé dans un parent position:relative + overflow:hidden. */
export function Decor({
  variant = 'accueil',
  collageIndex,
  hideMarginalia = false,
  hideDereglement = false,
  collageOverride,
}: DecorProps) {
  const seance = useReve()
  if (!seance) return null

  const zones = ZONES_COLLAGE[variant]
  const margs = ZONES_MARG[variant]

  // Le seed détermine quelle zone parmi les candidates
  const zoneIdx = (collageIndex ?? Math.floor(seance.seed % zones.length))
  const zone = zones[zoneIdx]
  const collage = collageOverride || seance.collages[zoneIdx % seance.collages.length]

  return (
    <>
      <TornCollage collage={collage} zone={zone} />

      {!hideMarginalia && margs.map((style, i) => (
        <Marginalia
          key={i}
          marg={seance.margs[i % seance.margs.length]}
          style={style}
          animDelay={1.0 + i * 0.3}
        />
      ))}

      {!hideDereglement && (
        <Dereglement
          id={seance.derlg}
          variant={variant}
          motTrouve={seance.motTrouve}
          txtTampon={seance.txtTampon}
          txtErrata={seance.txtErrata}
        />
      )}
    </>
  )
}

// ─── Collage sur papier déchiré, teinté selon la couleur du rêve ──
interface TornCollageProps {
  collage: CollageDef
  zone: ZoneCollage
  /** Override de la teinte. Par défaut, prend la couleur du rêve. */
  colorFilter?: string
}

export function TornCollage({ collage, zone, colorFilter }: TornCollageProps) {
  const seance = useReve()
  if (!seance) return null

  const Draw = collage.draw
  const size = collage.w * (zone.size ?? 0.88)
  const filter = colorFilter ?? seance.colorSchema.filter
  const clipIdx = (seance.seed + collage.id.length) % TORN_CLIPS.length

  return (
    <div style={{
      position: 'absolute',
      top: zone.top, bottom: zone.bottom,
      left: zone.left, right: zone.right,
      transform: `rotate(${zone.rotation}deg)`,
      maxWidth: '40%',
      filter: 'drop-shadow(3px 4px 0 rgba(0,0,0,0.16))',
      animation: 'collageDrop 1.1s cubic-bezier(0.34, 1.2, 0.64, 1) 0.3s both',
      opacity: 0,
      pointerEvents: 'none',
      zIndex: 1,
    }}>
      <div style={{
        background: '#fbf2dc',
        padding: 12,
        clipPath: TORN_CLIPS[clipIdx],
        position: 'relative',
      }}>
        {/* Texture papier */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(ellipse 60px 40px at 20% 80%, rgba(120,80,40,0.08), transparent 70%), radial-gradient(ellipse 50px 35px at 80% 20%, rgba(100,60,30,0.06), transparent 70%)',
          mixBlendMode: 'multiply',
        }} />
        {/* Le collage teinté */}
        <div style={{ filter, opacity: 0.92 }}>
          <Draw w={size} />
        </div>
      </div>
      {/* Étiquette */}
      <div style={{
        marginTop: 4, marginLeft: 6,
        background: 'rgba(237, 226, 200, 0.94)',
        border: '0.5px solid #1a1410',
        padding: '3px 7px 4px',
        fontFamily: "'IM Fell English', serif",
        color: '#1a1410',
        transform: `rotate(${zone.rotation > 0 ? -2.5 : 2.5}deg)`,
        maxWidth: 140,
        lineHeight: 1.25,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 1 }}>{collage.label}</div>
        <div style={{ fontSize: 7.5, fontStyle: 'italic', color: '#3a302a' }}>{collage.ref}</div>
      </div>
      {/* Scotch optionnel */}
      {zone.withTape && (
        <>
          <div style={{ position: 'absolute', top: -8, left: '20%', width: 50, height: 18, background: '#f4ecd6', opacity: 0.75, transform: 'rotate(-8deg)', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.08), 1px 1px 2px rgba(0,0,0,0.15)', backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent 50%)' }} />
        </>
      )}
    </div>
  )
}

// ─── Marginalia manuscrite ──
function Marginalia({ marg, style, animDelay }: { marg: MargEntry; style: React.CSSProperties; animDelay: number }) {
  const seance = useReve()
  const color = seance?.colorSchema.hex ?? '#a8332a'
  return (
    <div style={{
      position: 'absolute',
      fontFamily: "'Caveat', cursive",
      fontWeight: 600,
      color,
      fontSize: 17,
      lineHeight: 1.15,
      pointerEvents: 'none',
      opacity: 0,
      animation: `inkBloom 0.9s ease-out ${animDelay}s forwards`,
      zIndex: 2,
      maxWidth: '42%',
      ...style,
    }}>
      {marg.txt}
      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 1 }}>{marg.sub}</div>
    </div>
  )
}

// ─── Dérèglement ──
function Dereglement({ id, motTrouve, txtTampon, txtErrata }: {
  id: DereglementId; variant: string; motTrouve: string; txtTampon: string; txtErrata: string;
}) {
  const seance = useReve()
  const color = seance?.colorSchema.hex ?? '#a8332a'
  const base: React.CSSProperties = {
    position: 'absolute',
    opacity: 0,
    animation: 'inkBloom 1.1s ease-out 1.5s forwards',
    pointerEvents: 'none',
    zIndex: 1,
  }
  switch (id) {
    case 'pate':
      return (
        <svg style={{ ...base, top: '55%', right: '8%' }} width="38" height="38" viewBox="0 0 60 60">
          <path d="M20,8 Q35,5 42,15 Q52,22 50,35 Q55,48 42,52 Q28,58 18,50 Q5,45 8,30 Q5,18 20,8 Z" fill="#1a1410" opacity="0.85" />
          <circle cx="48" cy="20" r="2" fill="#1a1410" opacity="0.6" />
          <circle cx="10" cy="48" r="1.5" fill="#1a1410" opacity="0.5" />
        </svg>
      )
    case 'errata':
      return (
        <div style={{
          ...base, bottom: '18%', left: '6%',
          background: '#f4ecd6', border: '0.5px solid #1a1410',
          padding: '4px 14px',
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
          fontSize: 12, color: '#1a1410',
          transform: 'rotate(-2.5deg)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}>{txtErrata}</div>
      )
    case 'tampon':
      return (
        <div style={{
          ...base, top: '70%', left: '8%',
          border: `2.5px solid ${color}`,
          padding: '6px 18px 4px',
          fontFamily: "'IM Fell English', serif",
          fontWeight: 700, fontSize: 14,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color, background: 'transparent',
          transform: 'rotate(-8deg)', opacity: 0.85,
        }}>{txtTampon}</div>
      )
    case 'coin':
      return (
        <svg style={{ ...base, top: 0, right: 0 }} width="50" height="50" viewBox="0 0 60 60">
          <path d="M60,0 L60,28 L32,0 Z" fill="#d8c8a8" stroke="#1a1410" strokeWidth="0.6" />
          <path d="M60,28 L32,0" stroke="#1a1410" strokeWidth="0.6" />
        </svg>
      )
    case 'compteur':
      return (
        <div style={{
          ...base, top: '8%', right: '18%',
          transform: 'rotate(3deg)',
          fontFamily: "'Caveat', cursive",
          color, fontSize: 17,
        }}>Tome I ½</div>
      )
    default:
      return null
  }
}

// ════════════════════════════════════════════════
// HEADER PIPE-SÉPARÉ — à placer en haut de l'écran
// ════════════════════════════════════════════════

export function HeaderKeywords({ count = 8 }: { count?: number }) {
  const seance = useReve()
  if (!seance) return null
  const color = seance.colorSchema.hex
  // Tire `count` mots-clés depuis le pool, déterministe par seed
  const rng = mulberry32(seance.seed + 999)
  const words = pickN(rng, KEYWORDS_POOL, count)
  const half = Math.ceil(count / 2)
  return (
    <div style={{ position: 'absolute', top: '4%', left: '5%', right: '5%', zIndex: 3 }}>
      <div style={{
        fontSize: 8.5,
        fontFamily: "'IM Fell English', serif",
        color, lineHeight: 1.55, letterSpacing: '0.04em',
      }}>
        {words.slice(0, half).join(' | ')}<br/>
        {words.slice(half).join(' | ')}
      </div>
      <hr style={{ border: 'none', borderTop: `1.3px solid ${color}`, marginTop: 6 }} />
    </div>
  )
}

// ════════════════════════════════════════════════
// VERTICAL ACCENT — typographie verticale latérale
// ════════════════════════════════════════════════
export function VerticalAccent({ text = 'CADAVRE', side = 'right' }: { text?: string; side?: 'left' | 'right' }) {
  const seance = useReve()
  if (!seance) return null
  const color = seance.colorSchema.hex
  return (
    <div style={{
      position: 'absolute', top: '22%',
      [side]: '4%',
      writingMode: 'vertical-rl',
      fontFamily: "'Bodoni Moda', serif",
      fontWeight: 700, fontSize: 'clamp(1.8rem, 6vw, 2.6rem)',
      color, letterSpacing: '0.42em',
      textTransform: 'uppercase', lineHeight: 1,
      zIndex: 3, pointerEvents: 'none',
    } as React.CSSProperties}>
      {text}
    </div>
  )
}

// ════════════════════════════════════════════════
// SIGNATURE DU RÊVE
// ════════════════════════════════════════════════
export function SignatureReve() {
  const s = useReve()
  if (!s) return null
  const color = s.colorSchema.hex
  return (
    <div style={{
      position: 'absolute',
      bottom: 6, right: 12,
      fontFamily: "'Caveat', cursive",
      color,
      fontSize: 11, opacity: 0.55,
      pointerEvents: 'none', zIndex: 4,
    }}>
      rêve № {s.seed}
    </div>
  )
}
