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
  minuit: { bg: '#d6d2f5', encre: '#1a1535' }, // lavande vive — papier à lettres mauve
  encre:  { bg: '#f2c8a8', encre: '#2a1208' }, // terre de rose — chaud, saturé
  argile: { bg: '#ecc24e', encre: '#200a04' }, // ambre vif — kraft doré
  lin:    { bg: '#f6ead0', encre: '#241a10' }, // crème — ancre neutre chaude
  aube:   { bg: '#c6e6da', encre: '#0c2428' }, // menthe vive — bleu-vert froid
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

// Bords arrachés à la main : amplitude forte (jusqu'à ~8%), pas irrégulier,
// chaque côté son propre rythme — volontairement asymétrique et brutal pour
// fuir le polygone « propre » fait à l'ordinateur.
export const DECHIRE_1 = 'polygon(' +
  '2% 5%, 9% 1%, 14% 7%, 23% 2%, 31% 6%, 39% 0%, 48% 5%, 57% 1%, 65% 8%, 74% 2%, 83% 6%, 92% 1%, 99% 4%, ' +
  '97% 12%, 100% 21%, 94% 29%, 99% 39%, 95% 48%, 100% 57%, 93% 66%, 98% 75%, 95% 84%, 100% 93%, ' +
  '94% 99%, 86% 95%, 77% 100%, 68% 96%, 59% 100%, 50% 95%, 41% 100%, 32% 96%, 23% 100%, 14% 95%, 6% 99%, ' +
  '1% 93%, 5% 84%, 0% 75%, 4% 66%, 1% 57%, 5% 48%, 0% 39%, 4% 29%, 1% 21%, 5% 12%' +
  ')'
export const DECHIRE_2 = 'polygon(' +
  '0% 3%, 8% 6%, 12% 0%, 21% 5%, 27% 1%, 36% 8%, 44% 2%, 53% 6%, 61% 0%, 70% 5%, 78% 1%, 88% 7%, 95% 2%, 100% 6%, ' +
  '96% 14%, 100% 24%, 92% 33%, 98% 43%, 91% 52%, 100% 61%, 94% 71%, 97% 80%, 90% 89%, 100% 97%, ' +
  '92% 100%, 83% 96%, 74% 100%, 64% 95%, 55% 100%, 45% 96%, 36% 100%, 27% 95%, 18% 100%, 9% 96%, 2% 100%, ' +
  '6% 91%, 0% 81%, 5% 72%, 1% 62%, 6% 53%, 0% 43%, 5% 34%, 1% 24%, 6% 15%, 0% 6%' +
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
