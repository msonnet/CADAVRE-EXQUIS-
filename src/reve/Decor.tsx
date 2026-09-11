import React, { useState, useMemo, useCallback, createContext, useContext, useEffect, useLayoutEffect, useRef } from 'react'
import { tr } from '../i18n'
import { mulberry32, pickOne, pickN } from './prng'
import { COLLAGES, type CollageDef, Hatches } from './collages'
import {
  AMBIANCE_POOL, AMBIANCES, type AmbianceKey, type Ambiance, type Accent,
  CITATIONS, ETIQ_POOL, HEURES_NOCTURNES, MARGINALIA,
  type Citation, type MargEntry, type ColorSchema,
} from './pools'
import { garantirContraste } from './contraste'

// ════════════════════════════════════════════════
// SÉANCE — composition unique par seed
// ════════════════════════════════════════════════

export interface SeanceReve {
  seed: number
  ambiance: Ambiance
  accent: Accent
  accent2: Accent
  symbole: CollageDef
  symbolSide: 'left' | 'right'
  collages: CollageDef[]
  citation: Citation
  etiqs: [string, string]
  margs: MargEntry[]
  heure: string
  titreRotation: number
  idxBiais: number
  angleBiais: number
  retirer: () => void
  /** Compat ancienne API — seance.colorSchema.hex / .bg / .encre / .second */
  colorSchema: ColorSchema
}

const ReveCtx = createContext<SeanceReve | null>(null)

function composerSeance(seed: number): SeanceReve {
  const rng = mulberry32(seed)
  const ambianceKey = pickOne(rng, AMBIANCE_POOL) as AmbianceKey
  const ambianceBrute = AMBIANCES[ambianceKey]

  // Deux accents distincts pour les boutons et variantes
  const accentIdx = Math.floor(rng() * ambianceBrute.accents.length)
  const accentBrut = ambianceBrute.accents[accentIdx]
  const accent2Brut = ambianceBrute.accents[(accentIdx + 1) % ambianceBrute.accents.length]

  // Plancher de contraste : quel que soit le tirage, l'encre tient 4.5:1
  // sur le fond (corps de texte), les accents et l'encre douce 4.5/3.2,
  // et le texte des boutons 4.5:1 sur l'accent qui leur sert de fond.
  const bg = ambianceBrute.bg
  const ambiance: Ambiance = {
    ...ambianceBrute,
    ink: garantirContraste(ambianceBrute.ink, bg, 4.5),
    inkSoft: garantirContraste(ambianceBrute.inkSoft, bg, 3.2),
    buttonText: garantirContraste(ambianceBrute.buttonText, accentBrut.hex, 4.5),
  }
  const accent: Accent = {
    ...accentBrut,
    hex: garantirContraste(accentBrut.hex, bg, 4.5),
    hover: garantirContraste(accentBrut.hover, bg, 4.5),
  }
  const accent2: Accent = { ...accent2Brut, hex: garantirContraste(accent2Brut.hex, bg, 4.5) }

  const collages = pickN(rng, COLLAGES, Math.min(6, COLLAGES.length))
  const symbole = collages[0]
  const symbolSide = rng() > 0.5 ? 'right' : 'left'
  const citation = pickOne(rng, CITATIONS)
  const etiqs = pickOne(rng, ETIQ_POOL)
  const margs = pickN(rng, MARGINALIA, 4)
  const heure = pickOne(rng, HEURES_NOCTURNES)
  const titreRotation = rng() * 2 - 1
  const idxBiais = Math.floor(rng() * 14)
  const angleBiais = rng() * 12 - 6

  return {
    seed, ambiance, accent, accent2, symbole, symbolSide, collages,
    citation, etiqs, margs, heure,
    titreRotation, idxBiais, angleBiais,
    retirer: () => {},
    colorSchema: {
      name: ambiance.name,
      hex: accent.hex,
      bg: ambiance.bg,
      encre: ambiance.ink,
      second: accent2.hex,
    },
  }
}

export function ReveProvider({ children }: { children: React.ReactNode }) {
  const [seed, setSeed] = useState<number>(
    () => Math.floor(Math.random() * 100000)
  )

  const retirer = useCallback(() => {
    setSeed(Math.floor(Math.random() * 100000))
  }, [])

  const seance = useMemo<SeanceReve>(() => {
    const s = composerSeance(seed)
    s.retirer = retirer
    return s
  }, [seed, retirer])

  // Écrit les variables CSS sur :root pour que toutes les pages s'adaptent
  useEffect(() => {
    if (typeof document === 'undefined') return
    const r = document.documentElement
    const a = seance.ambiance
    const acc = seance.accent
    r.style.setProperty('--reve-bg', a.bg)
    r.style.setProperty('--reve-ink', a.ink)
    r.style.setProperty('--reve-ink-soft', a.inkSoft)
    r.style.setProperty('--reve-ink-faint', a.inkFaint)
    r.style.setProperty('--reve-rule', a.rule)
    r.style.setProperty('--reve-accent', acc.hex)
    r.style.setProperty('--reve-accent-hover', acc.hover)
    r.style.setProperty('--reve-accent-2', seance.accent2.hex)
    r.style.setProperty('--reve-button-text', a.buttonText)
    r.style.setProperty('--reve-halo', a.halo ?? 'none')
    r.style.setProperty('--reve-papier', a.bg)
    r.style.setProperty('--reve-encre', a.ink)
  }, [seance])

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
// ZONES PAR ÉCRAN
// ════════════════════════════════════════════════

export type Variant =
  | 'accueil'
  | 'config'
  | 'jeu'
  | 'jeu-ia'
  | 'jeu-dessin'
  | 'multi'
  | 'fin'
  | 'fin-image'
  | 'biblio'
  | 'detail'
  | 'aide'
  | 'atelier'
  | 'config-dessin'
  | 'fin-dessin'

interface VariantZones {
  symbol: { top?: string; bottom?: string; left?: string; right?: string; sizeMul: number } | null
  etiqs: React.CSSProperties[]
  stripesMax: number
  citation: boolean
  signature: boolean
  verticalTitle?: { side: 'left' | 'right' } | null
}

const ZONES: Record<Variant, VariantZones> = {
  accueil: {
    symbol: { top: '13%', sizeMul: 0.9 },
    etiqs: [],
    stripesMax: 0,
    citation: true,
    signature: true,
    verticalTitle: { side: 'right' },
  },
  config: {
    symbol: { top: '12%', right: '4%', sizeMul: 0.6 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  atelier: {
    // En bas à droite : le haut de la page Atelier est un paragraphe
    // pleine largeur, le symbole en haut chevauchait le texte.
    symbol: { bottom: '17%', right: '5%', sizeMul: 0.5 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  'config-dessin': {
    symbol: { top: '12%', right: '4%', sizeMul: 0.6 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  jeu: {
    symbol: { bottom: '14%', right: '4%', sizeMul: 0.5 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: false,
  },
  'jeu-ia': {
    symbol: { top: '20%', sizeMul: 0.7 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: false,
  },
  'jeu-dessin': {
    symbol: { bottom: '10%', right: '4%', sizeMul: 0.45 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: false,
  },
  multi: {
    symbol: { top: '14%', sizeMul: 0.65 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  fin: {
    symbol: { top: '12%', right: '5%', sizeMul: 0.55 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  'fin-dessin': {
    symbol: { top: '12%', right: '5%', sizeMul: 0.55 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  'fin-image': {
    symbol: null,
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  biblio: {
    symbol: { bottom: '18%', right: '4%', sizeMul: 0.38 },
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  aide: {
    symbol: null,
    etiqs: [],
    stripesMax: 0,
    citation: false,
    signature: true,
  },
  detail: {
    // À droite, comme « fin » : à gauche il chevauchait le titre et
    // « TAP POUR NOMMER » (texte aligné à gauche sur cette page).
    symbol: { top: '12%', right: '5%', sizeMul: 0.45 },
    etiqs: [],
    stripesMax: 0,
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
  const s = useReve()
  if (!s) return null
  const zones = ZONES[variant]

  let symbolPos = zones.symbol
  if (variant === 'accueil' && symbolPos) {
    symbolPos = { ...symbolPos, [s.symbolSide]: '4%' } as VariantZones['symbol']
  }
  if ((variant === 'jeu-ia' || variant === 'multi') && symbolPos) {
    symbolPos = { ...symbolPos, left: '50%' } as VariantZones['symbol']
  }

  return (
    <>
      {zones.verticalTitle && (
        <VerticalAccent
          side={s.symbolSide === 'right' ? 'left' : 'right'}
          rotation={s.titreRotation}
        />
      )}

      {symbolPos && (
        <SymboleAvecCartel
          symbole={s.symbole}
          pos={symbolPos}
          variant={variant}
        />
      )}

      {zones.etiqs.map((style, i) => (
        <Etiquette key={i} style={{ ...style, position: 'absolute' as const }} delay={0.9 + i * 0.2}>
          {s.etiqs[i % 2]}
        </Etiquette>
      ))}

      {zones.citation && !hideCitation && <CitationManifeste />}
      {zones.signature && !hideSignature && <SignatureReve />}
    </>
  )
}

// ─── Sous-composants ──

function VerticalAccent({ side, rotation }: { side: 'left' | 'right'; rotation: number }) {
  return (
    <div style={{
      position: 'absolute', top: '7%',
      [side]: 0,
      writingMode: 'vertical-rl',
      fontFamily: "'Fraunces', 'Bodoni Moda', serif",
      fontWeight: 900, fontStyle: 'italic',
      fontSize: 'clamp(3.5rem, 17vw, 6.5rem)',
      lineHeight: 0.88, letterSpacing: '-0.03em',
      color: 'var(--reve-ink)',
      textTransform: 'uppercase',
      transform: rotation ? `rotate(${rotation}deg)` : undefined,
      zIndex: 2, pointerEvents: 'none',
      animation: 'inkBloomQ 1.2s 0.2s both',
    } as React.CSSProperties}>CADAVRE</div>
  )
}

const DARK_AMBIANCES = new Set(['minuit', 'encre', 'argile'])

/**
 * La vignette cède la place.
 *
 * ── Ce que la mesure a dit ────────────────────────────────────────────────
 *
 * Le collage d'ambiance est posé en absolu, à une place tirée au sort, sans
 * rien savoir de ce qu'il y a dessous. Relevé sur iPhone 14 Pro émulé : il
 * recouvre la carte « I. Phrase courte » des préparatifs, et le champ de
 * saisie du vers à l'Atelier. Deux écrans, pas les cinq du rapport — mais
 * l'un des deux est le champ où l'on écrit.
 *
 * Il porte déjà `pointer-events: none` : la gêne est visuelle, pas
 * fonctionnelle, et c'est bien pour ça que `pointer-events` ne suffisait pas.
 *
 * ── Ce qu'on ne voulait pas faire ─────────────────────────────────────────
 *
 * Lui réserver une bande d'en-tête réglait le problème et tuait l'essentiel :
 * c'est le placement libre qui fait qu'aucun écran ne ressemble au précédent.
 * On lui garde donc sa liberté et on lui retire seulement le droit de mordre.
 *
 * ── Comment ───────────────────────────────────────────────────────────────
 *
 * Après la mise en page, on mesure ce que la vignette recouvre. Si elle mord
 * sur un élément interactif, on essaie quelques places voisines et on retient
 * celle qui recouvre le moins. Le décalage est un `translate`, donc il ne
 * déplace rien d'autre et ne déclenche aucun recalcul de mise en page.
 */

/**
 * Les décalages tentés, en anneaux autour de la place d'origine.
 *
 * Premier jet : onze décalages fixes. Ça marchait sur les deux écrans
 * mesurés et échouait sur d'autres tirages d'ambiance — la place de départ
 * étant elle-même aléatoire, un jeu fixe de onze positions ne couvre rien.
 *
 * On cherche donc en spirale : le plus près d'abord, et on s'arrête au
 * premier emplacement libre. La vignette reste ainsi le plus près possible
 * de là où le sort l'avait posée.
 */
const ECARTS: [number, number][] = (() => {
  const out: [number, number][] = [[0, 0]]
  for (let r = 40; r <= 360; r += 40) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      out.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)])
    }
  }
  return out
})()

function useEcarterDuTexte(ref: React.RefObject<HTMLDivElement | null>) {
  const [ecart, setEcart] = useState<[number, number]>([0, 0])

  useLayoutEffect(() => {
    const noeud = ref.current
    if (!noeud) return

    const replacer = () => {
      // ── Mesurer la place D'ORIGINE, transition gelée ──
      //
      // Effacer le décalage ne suffit pas : l'élément porte une transition de
      // 450 ms, donc l'effacer lance une animation et `getBoundingClientRect`
      // rend une position en cours de route. Toutes les mesures après la
      // première étaient ainsi fausses, et la vignette restait sur un
      // recouvrement qu'elle croyait minimal.
      const transitionAvant = noeud.style.transition
      const decalageAvant = noeud.style.translate
      noeud.style.transition = 'none'
      noeud.style.translate = ''
      void noeud.offsetWidth                       // force le recalcul
      const base = noeud.getBoundingClientRect()
      noeud.style.translate = decalageAvant
      void noeud.offsetWidth
      noeud.style.transition = transitionAvant
      if (base.width === 0) return

      const obstacles = [...document.querySelectorAll(
        'button, a[href], input, textarea, [role="button"]',
      )]
        .map(e => e.getBoundingClientRect())
        .filter(r => r.width > 0 && r.height > 0)

      const recouvrement = ([dx, dy]: [number, number]) => {
        const l = base.left + dx, t = base.top + dy
        const r = l + base.width, b = t + base.height
        // Hors de l'écran : pire que tout, on ne veut pas la perdre.
        if (l < 0 || t < 0 || r > window.innerWidth || b > window.innerHeight) return Infinity
        return obstacles.reduce((somme, o) => {
          const w = Math.min(r, o.right) - Math.max(l, o.left)
          const h = Math.min(b, o.bottom) - Math.max(t, o.top)
          return somme + (w > 0 && h > 0 ? w * h : 0)
        }, 0)
      }

      const surPlace = recouvrement([0, 0])
      if (surPlace === 0) { setEcart([0, 0]); return }

      let meilleur: [number, number] = [0, 0]
      let score = surPlace
      for (const e of ECARTS) {
        const v = recouvrement(e)
        if (v < score) { score = v; meilleur = e }
        if (score === 0) break
      }
      setEcart(meilleur)
    }

    // ── Mesurer une fois ne suffit pas ──
    //
    // Le décor se monte avant le contenu : au premier relevé, la carte ou le
    // champ de saisie n'existent pas encore. Et à l'Atelier le champ est
    // remonté à chaque tour — une vignette placée au premier vers se
    // retrouverait sous le onzième.
    //
    // On observe donc les ajouts et retraits de nœuds. Seul `childList` est
    // écouté : notre propre écriture est un changement d'ATTRIBUT, elle ne
    // peut donc pas se rappeler elle-même en boucle.
    let attente: number | undefined
    const bientot = () => {
      window.clearTimeout(attente)
      attente = window.setTimeout(replacer, 160)
    }

    const t = requestAnimationFrame(() => requestAnimationFrame(replacer))
    const oeil = new MutationObserver(bientot)
    oeil.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', bientot)
    return () => {
      cancelAnimationFrame(t)
      window.clearTimeout(attente)
      oeil.disconnect()
      window.removeEventListener('resize', bientot)
    }
  }, [ref])

  return ecart
}


function SymboleAvecCartel({
  symbole, pos, variant,
}: {
  symbole: CollageDef
  pos: NonNullable<VariantZones['symbol']>
  variant: Variant
}) {
  const s = useReve()
  const boite = useRef<HTMLDivElement>(null)
  const [dx, dy] = useEcarterDuTexte(boite)
  const Draw = symbole.draw
  const size = symbole.w * pos.sizeMul
  const isCentered = variant === 'jeu-ia' || variant === 'multi'
  const showCartel = variant === 'accueil'
  const isDark = DARK_AMBIANCES.has(s?.ambiance.id ?? '')
  return (
    // Outer: position + centering + responsive CSS scale (not touched by inner animation)
    <div
      ref={boite}
      className={variant === 'accueil' ? 'decor-symbol-accueil' : undefined}
      style={{
        position: 'absolute',
        top: pos.top, bottom: pos.bottom,
        left: pos.left, right: pos.right,
        transform: isCentered ? 'translateX(-50%)' : undefined,
        // `translate` et non `transform` : le second porte déjà le centrage.
        translate: dx || dy ? `${dx}px ${dy}px` : undefined,
        transition: 'translate 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: 3, pointerEvents: 'none',
      }}
    >
      {/* Inner: drop animation runs here, separate so CSS scale above isn't overridden */}
      <div style={{
        opacity: 0,
        animation: 'symbolDrop 1.1s cubic-bezier(0.34, 1.2, 0.64, 1) 0.5s both',
      }}>
        <div style={{ filter: isDark ? 'invert(1) brightness(0.88)' : undefined }}>
          <Draw w={size} />
        </div>
        {showCartel && (
          <div style={{
            marginTop: 6,
            background: 'var(--reve-bg)',
            border: '0.5px solid var(--reve-ink)',
            padding: '4px 8px 5px',
            fontFamily: "'Raleway', sans-serif",
            color: 'var(--reve-ink)',
            transform: 'rotate(-2deg)',
            maxWidth: 150, lineHeight: 1.25,
            boxShadow: '1px 1px 0 rgba(0,0,0,0.12)',
            opacity: 0.85, overflow: 'hidden',
          }}>
            <div style={{ fontSize: 13, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase' }}>{symbole.label}</div>
            <div style={{ fontSize: 12, fontStyle: 'italic', opacity: 0.7, marginTop: 1 }}>{symbole.ref}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Etiquette({ children, style, delay }: { children: React.ReactNode; style: React.CSSProperties; delay: number }) {
  return (
    <div style={{
      ...style,
      background: 'rgba(128,128,128,0.12)',
      padding: '6px 12px 7px',
      fontFamily: "'Raleway', sans-serif",
      fontSize: 17, lineHeight: 1.3,
      color: 'var(--reve-ink)',
      boxShadow: '1px 2px 0 rgba(0,0,0,0.18)',
      zIndex: 6, opacity: 0,
      animation: `etiqDrop 0.7s ease-out ${delay}s both`,
      pointerEvents: 'none',
    }}>{children}</div>
  )
}

function CitationManifeste() {
  const s = useReve()!
  return (
    <div style={{
      position: 'absolute', bottom: '20%', left: '5%', right: '5%',
      opacity: 0, animation: 'fadeInQ 0.8s 1.3s both',
      zIndex: 4, pointerEvents: 'none',
    }}>
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic', fontWeight: 500,
        fontSize: 18, lineHeight: 1.55,
        color: 'var(--reve-ink)',
        display: 'block',
      }}>{s.citation.t}</span>
      <div style={{
        fontSize: 17, fontWeight: 600,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        fontFamily: "'Raleway', sans-serif",
        color: 'var(--reve-accent-2)', marginTop: 8,
      }}>{s.citation.a}</div>
    </div>
  )
}

function SignatureReve() {
  const s = useReve()!
  return (
    <div style={{
      position: 'absolute', bottom: 6, right: 12,
      fontFamily: "'Raleway', sans-serif",
      fontWeight: 500,
      color: 'var(--reve-accent-2)',
      fontSize: 17, opacity: 0.75,
      pointerEvents: 'none', zIndex: 6,
      animation: 'fadeInQ 0.8s 1.8s both',
    }}>{tr('rêvé à', 'dreamt at')} {s.heure}</div>
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
  const s = useReve()
  if (!s) return null
  const rng = mulberry32(s.seed + 999)
  const words = pickN(rng, KEYWORDS_POOL, count)
  const half = Math.ceil(count / 2)
  return (
    <div style={{ position: 'absolute', top: '3%', left: '5%', right: '5%', zIndex: 3, pointerEvents: 'none' }}>
      <div style={{
        fontSize: 17,
        fontFamily: "'Raleway', sans-serif",
        fontWeight: 500,
        color: 'var(--reve-accent)',
        lineHeight: 1.55, letterSpacing: '0.04em',
      }}>
        {words.slice(0, half).join(' | ')}<br />
        {words.slice(half).join(' | ')}
      </div>
      <hr style={{ border: 'none', borderTop: '1.3px solid var(--reve-accent)', marginTop: 6 }} />
    </div>
  )
}
