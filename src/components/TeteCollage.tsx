import { useRef, useState } from 'react'
import { useReve } from '../reve'
import { Etiquette } from './Papier'

/**
 * TeteCollage — bouton « tête d'animal » du menu : une gravure monochrome
 * générée par IA (scripts/generer-tetes.mjs) et détourée par luminance, posée
 * sur un vrai carton de papier crème (PapierCard, cf. Papier.tsx), légèrement
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

// Les 3 espèces « historiques » ont une animation d'activation propre
// (trompe / ailes / gueule, ci-dessous). Les 9 chimères supplémentaires sont
// mono-état : leur activation est un léger salut CSS générique (SingleRaster).
export type Espece =
  | 'elephant' | 'papillon' | 'tigre'
  | 'racine' | 'meduse' | 'cerf-lune' | 'poisson-oiseau' | 'escargot-maison'
  | 'dame-fleur' | 'hibou-horloge' | 'renard-automne' | 'baleine-ciel'

type Props = {
  espece: Espece
  label: string
  onActivate: () => void
}

// durée totale avant d'activer le mode — pilote un minuteur unique, indépendant
// du timing propre à chaque animation visuelle (crossfade ou pliage d'ailes).
// Laisse l'état fermé visible un instant avant la navigation, sinon le
// changement passe inaperçu (flash trop bref).
const DUREE_FERMETURE = 0.55

// Léger angle distinct par espèce — fait « collé à la main » plutôt
// qu'aligné au cordeau, sans jamais assez pencher pour empiéter sur le
// voisin (vérifié à l'écran le plus étroit visé, 360px).
const ROTATION: Record<Espece, number> = {
  elephant: -2.5, papillon: 2.2, tigre: -1.6,
  racine: 1.8, meduse: -2.2, 'cerf-lune': 1.4, 'poisson-oiseau': -1.9,
  'escargot-maison': 2.4, 'dame-fleur': -1.5, 'hibou-horloge': 1.6,
  'renard-automne': -2.3, 'baleine-ciel': 2.0,
}

let _uid = 0

export default function TeteCollage({ espece, label, onActivate }: Props) {
  const s = useReve()
  const [closing, setClosing] = useState(false)
  const fired = useRef(false)
  const uid = useRef(`tc${_uid++}`).current
  const accent = s?.accent.hex ?? '#b22c20'
  const surAccent = s?.ambiance.buttonText ?? '#fff'
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
        background: 'none', cursor: 'pointer', display: 'block',
      }}
    >
      {/* minuteur unique : déclenche onActivate une fois la fermeture jouée,
          quelle que soit la durée propre à l'animation visuelle de l'espèce */}
      <div aria-hidden style={{
        position: 'absolute', width: 0, height: 0,
        animation: closing ? `${uid}-tick ${DUREE_FERMETURE}s steps(1,end) forwards` : undefined,
      }} onAnimationEnd={closing ? onEnd : undefined} />
      <style>{`@keyframes ${uid}-tick { to { opacity: 0; } }`}</style>

      {/* cadre carré : la bête EST elle-même un fragment de papier découpé —
          marge crème et bord déchiré sont cuits dans l'image (decouperPapier,
          cf. _gravure.mjs), donc plus de carton rectangulaire derrière. Juste
          une ombre portée qui épouse la silhouette (drop-shadow suit l'alpha,
          pas un rectangle) et une légère rotation « collé à la main ». */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1', lineHeight: 0,
        transform: `rotate(${rotation}deg)`,
        filter: 'drop-shadow(0 3px 7px rgba(0,0,0,0.34))',
      }}>
        <RasterArt espece={espece} uid={uid} closing={closing} />
      </div>

      {/* légende — étiquette collée DANS le collage : un bandeau de papier
          d'accent agrafé en travers du bas de la découpe (chevauche le bord
          inférieur ~ d'un cheveu), pas posé en dessous. Centré, contre-pivoté,
          ombre marquée pour bien lire « par-dessus » la bête. */}
      <Etiquette
        bg={accent}
        color={surAccent}
        style={{
          position: 'absolute', left: '50%', bottom: '4%', zIndex: 5,
          transform: `translateX(-50%) rotate(${-rotation * 0.9}deg)`,
          fontSize: 'clamp(9.5px, 2.7vw, 12.5px)', padding: '4px 9px',
          boxShadow: '0 3px 9px rgba(0,0,0,0.4)',
        }}
      >
        {label}
      </Etiquette>
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

/**
 * Chimères-collages mono-état (les 9 ajoutées) : une seule image, jamais de
 * second raster ni d'inpainting. Comme l'éléphant (trompe) et le papillon
 * (ailes), l'activation au clic est une vraie ANIMATION anatomique en CSS sur
 * cette même image (clip-path + transform), jamais redessinée — un mouvement
 * propre à chaque bête plutôt qu'un effet uniforme :
 *  · furl    — deux moitiés se replient vers le centre (ailes/nageoires/feuillage) ;
 *  · pulse   — le corps se contracte verticalement (pulsation de méduse) ;
 *  · nod     — la tête s'incline en avant (révérence) ;
 *  · retract — la partie haute se rétracte vers le bas (bois/antennes/arbre) ;
 *  · dive    — l'ensemble plonge en pivotant (baleine).
 */
type Mouvement = 'furl' | 'pulse' | 'nod' | 'retract' | 'dive'

const MOUVEMENT: Partial<Record<Espece, Mouvement>> = {
  racine: 'retract', meduse: 'pulse', 'cerf-lune': 'nod',
  'poisson-oiseau': 'furl', 'escargot-maison': 'retract', 'dame-fleur': 'furl',
  'hibou-horloge': 'nod', 'renard-automne': 'furl', 'baleine-ciel': 'dive',
}

// Mouvements « pleine image » (un seul raster transformé) : keyframes + origine.
const ANIM_SOLO: Record<Exclude<Mouvement, 'furl'>, { dur: number; origin: string; frames: string }> = {
  pulse:   { dur: 0.5,  origin: '50% 16%', frames: '0%{transform:scaleY(1) scaleX(1)}45%{transform:scaleY(.82) scaleX(1.06)}100%{transform:scaleY(.7) scaleX(1.1)}' },
  nod:     { dur: 0.5,  origin: '50% 92%', frames: '0%{transform:rotate(0deg)}100%{transform:rotate(7deg) translateY(4%)}' },
  retract: { dur: 0.5,  origin: '50% 100%', frames: '0%{transform:scaleY(1)}100%{transform:scaleY(.8) translateY(-2%)}' },
  dive:    { dur: 0.55, origin: '50% 50%', frames: '0%{transform:rotate(0deg) translateY(0) scale(1)}100%{transform:rotate(-10deg) translateY(8%) scale(.9)}' },
}

const imgPlein: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
}

function MotionRaster({ espece, uid, closing }: { espece: Espece; uid: string; closing: boolean }) {
  const src = `/tetes/${espece}/ouvert.webp`
  const mvt = MOUVEMENT[espece] ?? 'nod'

  // furl : deux moitiés gauche/droite repliées vers le centre, comme les ailes
  // du papillon — l'image n'est jamais redessinée, juste découpée en deux et
  // pivotée/rétractée. Pas d'effet de couture car les deux moitiés partagent
  // la même source alignée pixel à pixel.
  if (mvt === 'furl') {
    return (
      <>
        <img src={src} alt="" onError={masquer} draggable={false} style={{
          ...imgPlein, clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)', transformOrigin: '100% 45%',
          animation: closing ? `${uid}-furlL 0.42s steps(3,end) forwards` : undefined,
        }} />
        <img src={src} alt="" onError={masquer} draggable={false} style={{
          ...imgPlein, clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)', transformOrigin: '0% 45%',
          animation: closing ? `${uid}-furlR 0.42s steps(3,end) forwards` : undefined,
        }} />
        <style>{`
          @keyframes ${uid}-furlL { 0% { transform: rotate(0deg) scaleX(1); } 100% { transform: rotate(3deg) scaleX(0.32); } }
          @keyframes ${uid}-furlR { 0% { transform: rotate(0deg) scaleX(1); } 100% { transform: rotate(-3deg) scaleX(0.32); } }
        `}</style>
      </>
    )
  }

  const a = ANIM_SOLO[mvt]
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, transformOrigin: a.origin,
        animation: closing ? `${uid}-${mvt} ${a.dur}s ease-in-out forwards` : undefined,
      }} />
      <style>{`@keyframes ${uid}-${mvt} { ${a.frames} }`}</style>
    </>
  )
}

function RasterArt({ espece, uid, closing }: { espece: Espece; uid: string; closing: boolean }) {
  if (espece === 'papillon') return <AilesPliantes uid={uid} closing={closing} />
  if (espece === 'elephant') return <TrompeLevee uid={uid} closing={closing} />
  if (espece === 'tigre') return <EtatsAlignes espece={espece} closing={closing} />
  return <MotionRaster espece={espece} uid={uid} closing={closing} />
}
