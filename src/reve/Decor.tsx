import React, { useState, useMemo, useCallback, createContext, useContext } from 'react'
import { mulberry32, pickN, pickOne, filtrerMemoire, incrementerMemoire } from './prng'
import { COLLAGES, type CollageDef, Hatches } from './collages'
import { MARGINALIA, DERLG, MOTS_TROUVES, TXT_TAMPONS, TXT_ERRATA, type DereglementId, type MargEntry } from './pools'

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
  rng: () => number
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

  return {
    seed, collages, margs, derlg,
    motTrouve, txtTampon, txtErrata,
    angleBiais, idxBiais, rng,
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

interface DecorProps {
  variant?: 'accueil' | 'config' | 'jeu' | 'fin' | 'biblio' | 'detail'
  collageIndex?: number
  hideLabel?: boolean
  hideMarginalia?: boolean
  hideDereglement?: boolean
}

const ZONES_COLLAGE: Record<string, { top?: number; bottom?: number; left?: number; right?: number; rotation: number }> = {
  accueil:  { top: 76,  right: -10, rotation: -7 },
  config:   { top: 90,  right: -12, rotation: -5 },
  jeu:      { top: 70,  right: -8,  rotation: 5 },
  fin:      { top: 70,  right: -12, rotation: -8 },
  biblio:   { top: 100, right: -10, rotation: 6 },
  detail:   { top: 80,  right: -12, rotation: -6 },
}

const COLLAGE_INDEX_DEFAULT: Record<string, number> = {
  accueil: 0, config: 1, jeu: 2, fin: 3, biblio: 4, detail: 5,
}

const ZONES_MARG: Record<string, React.CSSProperties> = {
  accueil:  { top: 280, left: 20, transform: 'rotate(-4deg)' },
  config:   { bottom: 220, left: 20, transform: 'rotate(-3deg)' },
  jeu:      { bottom: 280, right: 14, transform: 'rotate(3deg)', textAlign: 'right' },
  fin:      { top: 230, left: 16, transform: 'rotate(-4deg)' },
  biblio:   { bottom: 130, right: 18, transform: 'rotate(2deg)', textAlign: 'right' },
  detail:   { top: 240, right: 20, transform: 'rotate(3deg)', textAlign: 'right' },
}

const MARG_INDEX: Record<string, number> = {
  accueil: 0, config: 1, jeu: 2, fin: 3, biblio: 0, detail: 1,
}

export function Decor({
  variant = 'accueil',
  collageIndex,
  hideLabel = false,
  hideMarginalia = false,
  hideDereglement = false,
}: DecorProps) {
  const seance = useReve()
  if (!seance) return null

  const ci = (collageIndex ?? COLLAGE_INDEX_DEFAULT[variant]) % seance.collages.length
  const collage = seance.collages[ci]
  const zone = ZONES_COLLAGE[variant]
  const margIdx = MARG_INDEX[variant] % seance.margs.length
  const marg = seance.margs[margIdx]
  const margStyle = ZONES_MARG[variant]

  return (
    <>
      <CollageRendu collage={collage} zone={zone} hideLabel={hideLabel} />

      {!hideMarginalia && marg && (
        <Marginalia marg={marg} style={margStyle} animDelay={1.0} />
      )}

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

function CollageRendu({
  collage,
  zone,
  hideLabel,
}: {
  collage: CollageDef
  zone: { top?: number; bottom?: number; left?: number; right?: number; rotation: number }
  hideLabel: boolean
}) {
  const Draw = collage.draw
  return (
    <div style={{
      position: 'absolute',
      top: zone.top, bottom: zone.bottom, left: zone.left, right: zone.right,
      pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      opacity: 0,
      animation: 'collageDrop 1.1s cubic-bezier(0.34, 1.2, 0.64, 1) 0.3s forwards',
      zIndex: 1,
    }}>
      <div style={{
        transform: `rotate(${zone.rotation}deg)`,
        transformOrigin: 'top center',
        filter: 'drop-shadow(2px 3px 0 rgba(26, 20, 16, 0.12))',
      }}>
        <Draw w={collage.w * 0.88} />
      </div>
      {!hideLabel && (
        <div style={{ marginTop: 4, marginLeft: 8 }}>
          <div style={{
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
            <div style={{ fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 1 }}>
              {collage.label}
            </div>
            <div style={{ fontSize: 7.5, fontStyle: 'italic', color: '#3a302a' }}>
              {collage.ref}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Marginalia({ marg, style, animDelay }: { marg: MargEntry; style: React.CSSProperties; animDelay: number }) {
  return (
    <div style={{
      position: 'absolute',
      fontFamily: "'Caveat', cursive",
      color: '#a8332a',
      fontSize: 17,
      lineHeight: 1.1,
      pointerEvents: 'none',
      opacity: 0,
      animation: `inkBloom 0.9s ease-out ${animDelay}s forwards`,
      zIndex: 1,
      ...style,
    }}>
      {marg.txt}
      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1 }}>{marg.sub}</div>
    </div>
  )
}

function Dereglement({
  id,
  variant,
  motTrouve,
  txtTampon,
  txtErrata,
}: {
  id: DereglementId
  variant: string
  motTrouve: string
  txtTampon: string
  txtErrata: string
}) {
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
        <svg style={{ ...base, top: 380, right: 24 }} width="38" height="38" viewBox="0 0 60 60">
          <path d="M20,8 Q35,5 42,15 Q52,22 50,35 Q55,48 42,52 Q28,58 18,50 Q5,45 8,30 Q5,18 20,8 Z" fill="#1a1410" opacity="0.85" />
          <circle cx="48" cy="20" r="2" fill="#1a1410" opacity="0.6" />
          <circle cx="10" cy="48" r="1.5" fill="#1a1410" opacity="0.5" />
        </svg>
      )
    case 'errata':
      return (
        <div style={{
          ...base, bottom: 170, left: 26,
          background: '#f4ecd6',
          border: '0.5px solid #1a1410',
          padding: '4px 14px',
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: 12,
          color: '#1a1410',
          transform: 'rotate(-2.5deg)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}>{txtErrata}</div>
      )
    case 'tampon':
      return (
        <div style={{
          ...base, top: 460, left: 30,
          border: '2.5px solid #a8332a',
          padding: '6px 18px 4px',
          fontFamily: "'IM Fell English', serif",
          fontWeight: 700, fontSize: 14,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#a8332a',
          transform: 'rotate(-8deg)',
          background: 'transparent',
          opacity: 0.85,
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
          ...base, top: 50, right: 78,
          transform: 'rotate(3deg)',
          fontFamily: "'Caveat', cursive",
          color: '#a8332a',
          fontSize: 17,
        }}>Tome I ½</div>
      )
    default:
      return null
  }
}

export function SignatureReve() {
  const s = useReve()
  if (!s) return null
  return (
    <div style={{
      position: 'absolute',
      bottom: 6, right: 12,
      fontFamily: "'Caveat', cursive",
      color: '#a8332a',
      fontSize: 11,
      opacity: 0.5,
      pointerEvents: 'none',
    }}>
      rêve № {s.seed}
    </div>
  )
}
