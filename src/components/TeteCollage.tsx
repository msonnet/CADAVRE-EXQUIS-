import { useRef, useState } from 'react'
import { useReve } from '../reve'

/**
 * TeteCollage — bouton « tête d'animal » du menu : une gravure monochrome
 * générée par IA (scripts/generer-tetes.mjs) et détourée par luminance, posée
 * sur un vrai carton de papier crème (PAPIER, cf. plus bas), légèrement
 * pivoté, façon planche de musée découpée et collée sur la page — la
 * gravure garde donc toujours sa lecture d'origine (encre sombre sur papier
 * clair) quelle que soit l'ambiance, sans filtre invert() : c'est le papier
 * qui assure le contraste avec le fond, jamais la gravure elle-même.
 *
 * Au clic, la bête s'anime brièvement avant la navigation :
 *  - tigre : deux gravures alignées pixel à pixel (gueule ouverte → fermée,
 *    obtenues par inpainting ciblé sur la seule zone de la gueule, le reste
 *    de l'image est strictement identique) — fondu de l'une à l'autre.
 *  - éléphant / papillon : une seule gravure ; aucun inpainting ne peut lever
 *    une trompe ou replier des ailes sans déplacer des pixels sur une grande
 *    partie du cadre, donc l'animation est un pivot/pliage CSS (clip-path +
 *    rotate/scaleX) sur cette même image, jamais redessinée — donc jamais
 *    désalignée.
 * Le nom du mode est une étiquette collée façon poster découpé (fond
 * d'accent plein, contre-pivotée par rapport à la carte de papier).
 */

export type Espece = 'elephant' | 'papillon' | 'tigre'

type Props = {
  espece: Espece
  label: string
  onActivate: () => void
}

// Carton de papier crème — toujours la même teinte, quelle que soit
// l'ambiance : c'est un vrai bout de papier collé, pas une couleur de thème.
export const PAPIER = '#f6ead0'

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

// Carte de papier texturée : grain + deux bandes de pli/ombre diagonales,
// posées en multiply sur l'aplat PAPIER — réutilisée par tous les cartons de
// cette page (têtes du menu, mais aussi titre/citation côté Accueil.tsx).
export const PAPIER_TEXTURE: React.CSSProperties = {
  backgroundColor: PAPIER,
  backgroundImage:
    'linear-gradient(118deg, rgba(0,0,0,0.08) 0%, transparent 16%, transparent 46%, ' +
    `rgba(0,0,0,0.06) 50%, transparent 78%, rgba(0,0,0,0.09) 100%), ${GRAIN}`,
  backgroundBlendMode: 'multiply, multiply',
  backgroundSize: 'cover, 180px 180px',
}

// durée totale avant d'activer le mode — pilote un minuteur unique, indépendant
// du timing propre à chaque animation visuelle (crossfade ou pliage d'ailes).
// Laisse l'état fermé visible un instant avant la navigation, sinon le
// changement passe inaperçu (flash trop bref).
const DUREE_FERMETURE = 0.55

// Léger angle distinct par espèce — fait « collé à la main » plutôt
// qu'aligné au cordeau, sans jamais assez pencher pour empiéter sur le
// voisin (vérifié à l'écran le plus étroit visé, 360px).
const ROTATION: Record<Espece, number> = { elephant: -2.5, papillon: 2.2, tigre: -1.6 }

let _uid = 0

export default function TeteCollage({ espece, label, onActivate }: Props) {
  const s = useReve()
  const [closing, setClosing] = useState(false)
  const fired = useRef(false)
  const uid = useRef(`tc${_uid++}`).current
  const accent = s?.accent.hex ?? '#b22c20'
  const surAccent = s?.ambiance.buttonText ?? '#fff'
  const bordure = s?.ambiance.rule ?? 'rgba(0,0,0,0.18)'
  const rotation = ROTATION[espece]

  function handle() {
    if (closing) return
    setClosing(true)
  }
  function onEnd() {
    if (fired.current) return
    fired.current = true
    onActivate()
  }

  return (
    <button
      onClick={handle}
      aria-label={label}
      style={{
        position: 'relative', width: '100%', padding: 0, border: 'none',
        background: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}
    >
      {/* minuteur unique : déclenche onActivate une fois la fermeture jouée,
          quelle que soit la durée propre à l'animation visuelle de l'espèce */}
      <div aria-hidden style={{
        position: 'absolute', width: 0, height: 0,
        animation: closing ? `${uid}-tick ${DUREE_FERMETURE}s steps(1,end) forwards` : undefined,
      }} onAnimationEnd={closing ? onEnd : undefined} />
      <style>{`@keyframes ${uid}-tick { to { opacity: 0; } }`}</style>

      {/* cadre carré : papier de fond + bête, dans cet ordre de calque */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
        {/* vrai carton de papier, légèrement pivoté, posé derrière la bête —
            opaque, comme un découpage collé à la main sur la page. */}
        <div aria-hidden style={{
          position: 'absolute', inset: '6%',
          ...PAPIER_TEXTURE,
          border: `1px solid ${bordure}`,
          boxShadow: '0 3px 11px rgba(0,0,0,0.3)',
          transform: `rotate(${rotation}deg)`,
          borderRadius: 4,
        }} />
        {/* tête gravée détourée, posée à même le papier */}
        <div style={{ position: 'absolute', inset: 0, lineHeight: 0 }}>
          <RasterArt espece={espece} uid={uid} closing={closing} />
        </div>
      </div>

      {/* légende — étiquette découpée façon collage, toujours posée devant */}
      <span style={{
        position: 'relative', zIndex: 1,
        fontFamily: "'Raleway', sans-serif", fontWeight: 800, lineHeight: 1.1,
        fontSize: 'clamp(9.5px, 2.7vw, 12.5px)', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: surAccent,
        textAlign: 'center', whiteSpace: 'nowrap',
        background: accent, padding: '4px 9px',
        borderRadius: 2, transform: `rotate(${-rotation * 0.6}deg)`,
        boxShadow: '0 2px 5px rgba(0,0,0,0.22)',
      }}>
        {label}
      </span>
    </button>
  )
}

function masquer(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

/**
 * tigre : deux gravures alignées pixel à pixel, fondu bref de l'une vers
 * l'autre — jamais de désalignement puisque seule la zone anatomique
 * masquée diffère entre les deux fichiers.
 */
function EtatsAlignes({ espece, closing }: { espece: Espece; closing: boolean }) {
  const base = `/tetes/${espece}`
  const commun: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
  }
  return (
    <>
      <img src={`${base}/ouvert.webp`} alt="" onError={masquer} draggable={false} style={{
        ...commun, opacity: closing ? 0 : 1,
        transition: closing ? 'opacity 0.3s ease-out' : undefined,
      }} />
      <img src={`${base}/ferme.webp`} alt="" onError={masquer} draggable={false} style={{
        ...commun, opacity: closing ? 1 : 0,
        transition: closing ? 'opacity 0.3s ease-out' : undefined,
      }} />
    </>
  )
}

/**
 * papillon : une seule gravure, repliée en CSS par moitié (clip-path gauche/
 * droite) pivotant et se rétractant vers la ligne du corps, comme l'ancienne
 * animation SVG des ailes — mais appliqué à l'image réelle, jamais redessinée.
 */
function AilesPliantes({ uid, closing }: { uid: string; closing: boolean }) {
  const commun: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
  }
  return (
    <>
      <img src="/tetes/papillon/ouvert.webp" alt="" onError={masquer} draggable={false} style={{
        ...commun,
        clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
        transformOrigin: '100% 42%',
        animation: closing ? `${uid}-wL 0.36s steps(3,end) forwards` : undefined,
      }} />
      <img src="/tetes/papillon/ouvert.webp" alt="" onError={masquer} draggable={false} style={{
        ...commun,
        clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
        transformOrigin: '0% 42%',
        animation: closing ? `${uid}-wR 0.36s steps(3,end) forwards` : undefined,
      }} />
      <style>{`
        @keyframes ${uid}-wL { 0% { transform: rotate(0deg) scaleX(1); } 100% { transform: rotate(4deg) scaleX(0.3); } }
        @keyframes ${uid}-wR { 0% { transform: rotate(0deg) scaleX(1); } 100% { transform: rotate(-4deg) scaleX(0.3); } }
      `}</style>
    </>
  )
}

// Bande verticale où vit la trompe au repos (mesurée par alpha sur l'image
// générée) : x 42–58 %, à partir de y 71 % jusqu'au bas du cadre — sous cette
// ligne, oreilles et défenses sont déjà retombées, seule la trompe reste.
const TROMPE_X1 = 42, TROMPE_X2 = 58, TROMPE_Y = 71

/**
 * éléphant : une seule gravure (trompe pendante au repos), levée par un pivot
 * CSS au clic — comme les ailes du papillon, jamais un second raster. La
 * bande de la trompe est taillée en encoche dans le bord bas de la couche
 * fixe (tête, oreilles, défenses) pour qu'aucun « fantôme » ne reste visible
 * une fois la trompe pivotée hors de sa position de repos.
 */
function TrompeLevee({ uid, closing }: { uid: string; closing: boolean }) {
  const commun: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
  }
  return (
    <>
      <img src="/tetes/elephant/ouvert.webp" alt="" onError={masquer} draggable={false} style={{
        ...commun,
        clipPath: `polygon(0 0, 100% 0, 100% 100%, ${TROMPE_X2}% 100%, ${TROMPE_X2}% ${TROMPE_Y}%, ` +
          `${TROMPE_X1}% ${TROMPE_Y}%, ${TROMPE_X1}% 100%, 0 100%)`,
      }} />
      <img src="/tetes/elephant/ouvert.webp" alt="" onError={masquer} draggable={false} style={{
        ...commun,
        clipPath: `inset(${TROMPE_Y}% ${100 - TROMPE_X2}% 0 ${TROMPE_X1}%)`,
        transformOrigin: `50% ${TROMPE_Y}%`,
        animation: closing ? `${uid}-trompe 0.4s steps(4,end) forwards` : undefined,
      }} />
      <style>{`@keyframes ${uid}-trompe { to { transform: rotate(180deg); } }`}</style>
    </>
  )
}

function RasterArt({ espece, uid, closing }: { espece: Espece; uid: string; closing: boolean }) {
  if (espece === 'papillon') return <AilesPliantes uid={uid} closing={closing} />
  if (espece === 'elephant') return <TrompeLevee uid={uid} closing={closing} />
  return <EtatsAlignes espece={espece} closing={closing} />
}
