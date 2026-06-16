/**
 * Papier.tsx — socle partagé de la direction artistique « collage de papier » :
 * tout élément (carte, étiquette) a l'air d'un vrai bout de papier découpé ou
 * arraché à la main et collé sur la page, légèrement pivoté, avec son grain et
 * son ombre propres. Extrait de TeteCollage.tsx/Accueil.tsx pour être réutilisé
 * par le reste du jeu sans dupliquer ces styles page après page.
 */

// Carton de papier crème — toujours la même teinte, quelle que soit
// l'ambiance : c'est un vrai bout de papier collé, pas une couleur de thème.
export const PAPIER = '#f6ead0'

// Encre sombre fixe pour le texte posé sur PAPIER — toujours lisible, quelle
// que soit l'ambiance, puisque le papier est lui-même fixe.
export const ENCRE_PAPIER = '#241a10'

// Grain de papier — bruit fractal léger, encodé une fois en SVG/base64 et
// posé en multiply sur l'aplat PAPIER : un vrai bout de papier découpé n'est
// jamais parfaitement lisse. `stitchTiles` évite toute couture visible quand
// le motif se répète en arrière-plan.
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>`
const GRAIN = `url("data:image/svg+xml;base64,${btoa(GRAIN_SVG)}")`

// Carte de papier texturée : grain + deux bandes de pli/ombre croisées en
// diagonale (froissé), posées en multiply sur l'aplat PAPIER — base de tous
// les cartons de cette direction artistique.
export const PAPIER_TEXTURE: React.CSSProperties = {
  backgroundColor: PAPIER,
  backgroundImage:
    'linear-gradient(118deg, rgba(0,0,0,0.08) 0%, transparent 16%, transparent 46%, ' +
    'rgba(0,0,0,0.06) 50%, transparent 78%, rgba(0,0,0,0.09) 100%), ' +
    'linear-gradient(34deg, transparent 0%, rgba(0,0,0,0.06) 20%, transparent 38%, ' +
    `transparent 58%, rgba(0,0,0,0.08) 74%, transparent 90%), ${GRAIN}`,
  backgroundBlendMode: 'multiply, multiply, multiply',
  backgroundSize: 'cover, cover, 180px 180px',
}

// Bords déchirés : deux découpes irrégulières (silhouette de papier arraché à
// la main, pas un rectangle net) — à réserver à certains cartons seulement,
// d'autres restent à bord droit (borderRadius), pour varier comme un vrai
// collage de fragments découpés/arrachés au fil du temps.
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
  /** rotation légère, fait « collé à la main » plutôt qu'aligné au cordeau */
  rotation?: number
  /** net = bord droit (borderRadius) ; dechire1/2 = silhouette arrachée */
  bord?: Bord
  /** couleur de la fine bordure — typiquement seance.ambiance.rule */
  bordure?: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  'aria-hidden'?: boolean
}

/**
 * Un bout de papier crème texturé (grain + plis), légèrement pivoté, posé
 * comme un fragment de collage. Sert aussi bien de fond décoratif (derrière
 * une gravure, en aria-hidden, position absolute fournie par l'appelant) que
 * de conteneur de contenu réel (titre, citation...).
 */
export function PapierCard({
  rotation = 0, bord = 'net', bordure = 'rgba(0,0,0,0.18)', children, className, style, ...rest
}: PapierCardProps) {
  return (
    <div
      className={className}
      {...rest}
      style={{
        ...PAPIER_TEXTURE,
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

/**
 * Étiquette collée façon poster découpé : un aplat de couleur plein avec son
 * propre pivot et son ombre — le nom d'un mode, une légende, un lien de menu.
 * Visuel seul (span) : si l'étiquette doit être cliquable, l'appelant la pose
 * dans son propre <button> (évite les boutons imbriqués quand l'étiquette
 * vit déjà à l'intérieur d'une carte cliquable, cf. TeteCollage).
 */
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
