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

// Froissé du papier — texture pré-cuite (public/textures/papier-froisse.webp).
// C'est une carte de plis TRANSPARENTE (ombres sombres dans les creux + reflets
// blancs sur les crêtes + grain fin) posée par-dessus la couleur de l'ambiance.
// On la cuit en raster plutôt que de la calculer en filtre SVG au runtime parce
// que (1) WebKit iOS rend mal — voire pas du tout — les filtres SVG en
// background-image, et (2) background-blend-mode aplatit silencieusement une
// couche issue d'un filtre SVG sous Chromium. Un WebP transparent superposé
// (sans blend-mode) est fiable partout.
const FROISSE = 'url(/textures/papier-froisse.webp)'

export function makePapierTexture(bg: string): React.CSSProperties {
  return {
    backgroundColor: bg,
    backgroundImage:
      // léger lustre diagonal de la feuille (par-dessus, semi-transparent)
      'linear-gradient(118deg, rgba(255,255,255,0.06) 0%, transparent 26%, transparent 72%, ' +
      `rgba(0,0,0,0.05) 100%), ${FROISSE}`,
    backgroundSize: 'cover, cover',
    backgroundPosition: 'center, center',
  }
}

export const PAPIER_TEXTURE: React.CSSProperties = makePapierTexture(PAPIER)

// Bords arrachés à la main, MAIS uniquement en haut et en bas : les côtés
// gauche et droit restent parfaitement droits (x = 0 % et x = 100 %), comme une
// feuille coupée net sur les flancs et déchirée seulement aux extrémités.
// Le haut et le bas gardent une amplitude forte, chaque bord son propre rythme.
export const DECHIRE_1 = 'polygon(' +
  // haut, de gauche à droite (premier et dernier points calés sur les flancs)
  '0% 5%, 9% 1%, 18% 7%, 27% 2%, 36% 6%, 45% 0%, 55% 5%, 64% 1%, 73% 7%, 82% 2%, 91% 6%, 100% 3%, ' +
  // côté droit : droit
  '100% 95%, ' +
  // bas, de droite à gauche ; côté gauche : retour droit vers 0% 5%
  '91% 99%, 82% 95%, 73% 100%, 64% 96%, 55% 100%, 45% 95%, 36% 100%, 27% 96%, 18% 100%, 9% 95%, 0% 98%' +
  ')'
export const DECHIRE_2 = 'polygon(' +
  '0% 3%, 8% 6%, 16% 0%, 25% 5%, 33% 1%, 42% 7%, 50% 2%, 59% 6%, 67% 0%, 76% 5%, 84% 1%, 92% 7%, 100% 4%, ' +
  '100% 96%, ' +
  '92% 100%, 84% 96%, 75% 100%, 66% 95%, 58% 100%, 49% 96%, 40% 100%, 31% 95%, 22% 100%, 13% 96%, 4% 100%, 0% 95%' +
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

/**
 * Section — intitulé de rubrique = étiquette d'accent collée (même grammaire de
 * collage que l'accueil et la config solo), à la place des anciens « — TITRE — »
 * en filet typographique. Partagé par toutes les pages refondues.
 */
export function Section({ children, accent, color, style }: {
  children: React.ReactNode; accent: string; color: string; style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <Etiquette bg={accent} color={color} rotation={-1.4} style={{ fontSize: 11, letterSpacing: '0.14em' }}>
        {children}
      </Etiquette>
    </div>
  )
}
