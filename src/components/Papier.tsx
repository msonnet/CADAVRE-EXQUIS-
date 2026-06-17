/**
 * Papier.tsx — socle partagé de la direction artistique « collage de papier » :
 * tout élément (carte, étiquette) a l'air d'un vrai bout de papier découpé ou
 * arraché à la main et collé sur la page, légèrement pivoté, avec son grain et
 * son ombre propres.
 *
 * Le papier n'est plus une teinte unique : chaque ambiance du Rêve a son propre
 * bout de papier (teinte + encre assortie). Utilise `usePapier()` pour récupérer
 * celui de la séance courante, et passe `papierBg` à <PapierCard>.
 */
import { useReve } from '../reve'
import type { AmbianceKey } from '../reve/pools'

// Papier crème historique — sert de repli quand aucune séance n'est active.
export const PAPIER = '#f6ead0'
export const ENCRE_PAPIER = '#241a10'

// Un papier par ambiance — teinte + encre assortie, lisible quel que soit l'accent.
export const PAPIERS_AMBIANCE: Record<AmbianceKey, { bg: string; encre: string }> = {
  minuit: { bg: '#ddd5f2', encre: '#1a1535' }, // lavande — papier à lettres mauve
  encre:  { bg: '#ccc4ad', encre: '#1a1208' }, // gazette — bistre chaud
  argile: { bg: '#e8c260', encre: '#200a04' }, // kraft — ambré saturé
  lin:    { bg: '#f6ead0', encre: '#241a10' }, // vergé crème — référence neutre
  aube:   { bg: '#ccd9ea', encre: '#0c1428' }, // pelure — bleu acier
}

/**
 * Le papier de la séance courante (teinte + encre). Repli sur le vergé crème
 * historique hors d'un ReveProvider.
 */
export function usePapier(): { bg: string; encre: string } {
  const seance = useReve()
  const key = seance?.ambiance.id
  return key ? PAPIERS_AMBIANCE[key] : { bg: PAPIER, encre: ENCRE_PAPIER }
}

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>`
const GRAIN = `url("data:image/svg+xml;base64,${btoa(GRAIN_SVG)}")`

export function makePapierTexture(bg: string): React.CSSProperties {
  return {
    backgroundColor: bg,
    backgroundImage:
      'linear-gradient(118deg, rgba(0,0,0,0.08) 0%, transparent 16%, transparent 46%, ' +
      'rgba(0,0,0,0.06) 50%, transparent 78%, rgba(0,0,0,0.09) 100%), ' +
      'linear-gradient(34deg, transparent 0%, rgba(0,0,0,0.06) 20%, transparent 38%, ' +
      `transparent 58%, rgba(0,0,0,0.08) 74%, transparent 90%), ${GRAIN}`,
    backgroundBlendMode: 'multiply, multiply, multiply',
    backgroundSize: 'cover, cover, 180px 180px',
  }
}

export const PAPIER_TEXTURE: React.CSSProperties = makePapierTexture(PAPIER)

export const DECHIRE_1 = 'polygon(' +
  '0% 3%, 12% 0%, 28% 4%, 45% 1%, 62% 3%, 78% 0%, 100% 2%, ' +
  '97% 15%, 100% 30%, 96% 48%, 100% 65%, 97% 82%, 100% 97%, ' +
  '85% 100%, 68% 97%, 52% 100%, 35% 98%, 18% 100%, 0% 96%, ' +
  '3% 80%, 0% 62%, 4% 45%, 0% 28%, 3% 12%' +
  ')'
export const DECHIRE_2 = 'polygon(' +
  '0% 0%, 15% 4%, 32% 0%, 50% 3%, 68% 0%, 85% 4%, 100% 0%, ' +
  '100% 18%, 96% 35%, 100% 52%, 97% 70%, 100% 88%, 100% 100%, ' +
  '88% 97%, 70% 100%, 52% 96%, 35% 100%, 18% 97%, 0% 100%, ' +
  '3% 85%, 0% 68%, 4% 50%, 0% 32%, 3% 15%' +
  ')'

export type Bord = 'net' | 'dechire1' | 'dechire2'

const BORD_STYLE: Record<Bord, React.CSSProperties> = {
  net: { borderRadius: 4 },
  dechire1: { clipPath: DECHIRE_1 },
  dechire2: { clipPath: DECHIRE_2 },
}

type PapierCardProps = {
  rotation?: number
  bord?: Bord
  bordure?: string
  /** Override de la couleur de fond — utilise makePapierTexture() */
  papierBg?: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  'aria-hidden'?: boolean
}

export function PapierCard({
  rotation = 0, bord = 'net', bordure = 'rgba(0,0,0,0.18)', papierBg, children, className, style, ...rest
}: PapierCardProps) {
  const texture = papierBg ? makePapierTexture(papierBg) : PAPIER_TEXTURE
  return (
    <div
      className={className}
      {...rest}
      style={{
        ...texture,
        border: `1px solid ${bordure}`,
        boxShadow: '0 3px 11px rgba(0,0,0,0.3)',
        transform: `rotate(${rotation}deg)`,
        ...BORD_STYLE[bord],
        ...style,
      }}
    >
      {children}
    </div>
  )
}

type EtiquetteProps = {
  children: React.ReactNode
  bg: string
  color: string
  rotation?: number
  style?: React.CSSProperties
}

export function Etiquette({ children, bg, color, rotation = 0, style }: EtiquetteProps) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: "'Raleway', sans-serif", fontWeight: 800, lineHeight: 1.1,
      fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      color, background: bg, padding: '4px 11px', borderRadius: 2,
      transform: `rotate(${rotation}deg)`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
      ...style,
    }}>
      {children}
    </span>
  )
}
