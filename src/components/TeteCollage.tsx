import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
// mono-état : chacune a son propre mouvement anatomique (blink/gape/beat/turn/sway…)
// via MotionRaster — jamais un second raster, tout en CSS sur l'image existante.
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
// Laisse l'animation se jouer entièrement avant la navigation, sinon le
// mouvement passe inaperçu (flash trop bref).
const DUREE_FERMETURE = 0.55

// Certaines chimères ont une animation plus longue (œil qui se ferme lentement,
// ondulation de la méduse, bulles qui montent jusqu'en haut de l'écran) : on
// retarde la navigation d'autant pour qu'on la voie jouer en entier.
const DUREE: Partial<Record<Espece, number>> = {
  racine: 1.0, meduse: 1.15, 'cerf-lune': 1.0, 'poisson-oiseau': 1.45,
  'escargot-maison': 1.1, 'dame-fleur': 0.95, 'hibou-horloge': 1.2,
  'renard-automne': 0.95, 'baleine-ciel': 1.15,
}

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
  const duree = DUREE[espece] ?? DUREE_FERMETURE
  const carreRef = useRef<HTMLDivElement>(null)

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
        animation: closing ? `${uid}-tick ${duree}s steps(1,end) forwards` : undefined,
      }} onAnimationEnd={closing ? onEnd : undefined} />
      <style>{`@keyframes ${uid}-tick { to { opacity: 0; } }`}</style>

      {/* cadre carré : la bête EST elle-même un fragment de papier découpé —
          marge crème et bord déchiré sont cuits dans l'image (decouperPapier,
          cf. _gravure.mjs), donc plus de carton rectangulaire derrière. Juste
          une ombre portée qui épouse la silhouette (drop-shadow suit l'alpha,
          pas un rectangle) et une légère rotation « collé à la main ». */}
      <div ref={carreRef} style={{
        position: 'relative', width: '100%', aspectRatio: '1', lineHeight: 0,
        transform: `rotate(${rotation}deg)`,
        filter: 'drop-shadow(0 3px 7px rgba(0,0,0,0.34))',
      }}>
        <RasterArt espece={espece} uid={uid} closing={closing} carreRef={carreRef} />
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
 * cette même image — chaque calque isole une région par clip-path puis la
 * transforme ; les régions fixes restent sur un calque non animé pour qu'aucun
 * « fantôme » ne double la partie qui bouge. Deux bêtes ajoutent en plus des
 * fragments collage animés (bulles du poisson en portail plein écran, jet de
 * la baleine, aiguilles du hibou) dessinés en SVG façon gravure.
 *
 * Toutes les coordonnées (en % du cadre) sont relevées à l'œil sur chaque
 * image générée — d'où un composant dédié par bête plutôt qu'un type générique.
 */
type BeteProps = { uid: string; closing: boolean; carreRef?: React.RefObject<HTMLDivElement | null> }

const imgPlein: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
}

// racine — l'ŒIL HUMAIN se ferme lentement : au-dessus de l'œil il n'y a que
// des branches sur fond clair (pas de peau pleine), donc un calque-image ne
// pourrait pas l'occulter. On dessine une vraie PAUPIÈRE — une forme couleur
// papier crème, bord bas souligné comme une frange de cils, qui descend depuis
// le haut de l'œil jusqu'à le recouvrir. Seul l'œil est animé.
function Racine({ uid, closing }: BeteProps) {
  const src = '/tetes/racine/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={imgPlein} />
      {/* fenêtre de l'œil (x 41–57 %, y 33,5–45 %), forme en amande, overflow caché */}
      <div style={{
        position: 'absolute', left: '41%', top: '33.5%', width: '16%', height: '11.5%',
        overflow: 'hidden', borderRadius: '48% 48% 44% 44%',
      }}>
        {/* la paupière : crème papier, frange de cils en bas ; part au-dessus
            (cachée) et descend pour fermer l'œil, puis reste fermée */}
        <div style={{
          position: 'absolute', inset: '-2% 0 0 0',
          background: 'linear-gradient(#efe6cf 60%, #d8c9a6)',
          borderBottom: '1.5px solid #2c2016', borderRadius: '0 0 46% 46%',
          transform: 'translateY(-106%)',
          animation: closing ? `${uid}-paupiere 1s ease-in-out forwards` : undefined,
        }} />
      </div>
      <style>{`@keyframes ${uid}-paupiere{0%{transform:translateY(-106%)}65%{transform:translateY(0)}100%{transform:translateY(0)}}`}</style>
    </>
  )
}

// méduse — l'ombrelle se gonfle/dégonfle (respiration) et les tentacules
// ondulent. Deux calques jointifs (haut/bas) qui pavent l'image sans
// recouvrement : aucun fantôme.
function Meduse({ uid, closing }: BeteProps) {
  const src = '/tetes/meduse/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(0 0 64% 0)', transformOrigin: '50% 18%',
        animation: closing ? `${uid}-ombrelle 1.1s ease-in-out forwards` : undefined,
      }} />
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(36% 0 0 0)', transformOrigin: '50% 36%',
        animation: closing ? `${uid}-tentacules 1.1s ease-in-out forwards` : undefined,
      }} />
      <style>{`
        @keyframes ${uid}-ombrelle{0%{transform:scale(1)}25%{transform:scale(1.06,1.05)}55%{transform:scale(.95,.97)}80%{transform:scale(1.03,1.02)}100%{transform:scale(1)}}
        @keyframes ${uid}-tentacules{0%{transform:skewX(0) translateX(0)}20%{transform:skewX(4deg) translateX(1.5%)}45%{transform:skewX(-3.5deg) translateX(-1.5%)}70%{transform:skewX(2.5deg) translateX(1%)}100%{transform:skewX(0) translateX(0)}}
      `}</style>
    </>
  )
}

// cerf-lune — la tête se balance de gauche à droite (pivot à la base du cou) ;
// les bois et le croissant suivent naturellement le mouvement.
function CerfLune({ uid, closing }: BeteProps) {
  const src = '/tetes/cerf-lune/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, transformOrigin: '50% 80%',
        animation: closing ? `${uid}-tete 1s ease-in-out forwards` : undefined,
      }} />
      <style>{`@keyframes ${uid}-tete{0%{transform:rotate(0)}20%{transform:rotate(5deg)}45%{transform:rotate(-5deg)}70%{transform:rotate(3deg)}88%{transform:rotate(-2deg)}100%{transform:rotate(0)}}`}</style>
    </>
  )
}

// bulle de collage : un petit disque de papier crème gravé (cercles
// concentriques fins + reflet) — garde le grain « gravure découpée ».
function BulleCollage() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ display: 'block', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
      <circle cx="20" cy="20" r="18" fill="#f3ead6" stroke="#241c14" strokeWidth="1.4" />
      <path d="M9 22 A12 12 0 0 1 18 9" fill="none" stroke="#241c14" strokeWidth="0.8" opacity="0.5" />
      <path d="M12 27 A15 15 0 0 1 24 11" fill="none" stroke="#241c14" strokeWidth="0.5" opacity="0.35" />
      <circle cx="14" cy="13" r="3.2" fill="#fff" opacity="0.7" />
    </svg>
  )
}

// 3 bulles d'air qui sortent de la bouche du poisson et montent en désordre
// jusqu'en HAUT de l'accueil — d'où le portail plein écran (position: fixed,
// ancré sur la position réelle de la bouche mesurée au clic).
function Bulles({ carreRef, uid }: { carreRef: React.RefObject<HTMLDivElement | null>; uid: string }) {
  const [o, setO] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const el = carreRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setO({ x: r.left + r.width * 0.5, y: r.top + r.height * 0.7 })
  }, [carreRef])
  if (!o) return null
  const bulles = [
    { dx: -30, size: 20, dur: 1.1, delay: 0 },
    { dx: 34, size: 28, dur: 1.25, delay: 0.13 },
    { dx: -12, size: 16, dur: 1.15, delay: 0.26 },
  ]
  return createPortal(
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {bulles.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: o.x, top: o.y, width: b.size, height: b.size,
          marginLeft: -b.size / 2, marginTop: -b.size / 2,
          animation: `${uid}-bulle${i} ${b.dur}s ease-in ${b.delay}s forwards`,
        }}>
          <BulleCollage />
        </div>
      ))}
      <style>{bulles.map((b, i) => `@keyframes ${uid}-bulle${i}{`
        + `0%{transform:translate(0,0) scale(.4);opacity:0}`
        + `12%{opacity:1}`
        + `45%{transform:translate(${b.dx * 0.7}px,${-o.y * 0.45}px) scale(1)}`
        + `75%{transform:translate(${-b.dx * 0.6}px,${-o.y * 0.8}px) scale(1.05);opacity:1}`
        + `100%{transform:translate(${b.dx * 0.4}px,${-o.y - 16}px) scale(1.1);opacity:0}}`).join('')}</style>
    </div>,
    document.body,
  )
}

// poisson-oiseau — ouvre la bouche (le museau bas s'étire vers le bas) puis
// laisse échapper 3 bulles d'air qui montent jusqu'en haut de l'écran.
function PoissonOiseau({ uid, closing, carreRef }: BeteProps) {
  const src = '/tetes/poisson-oiseau/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={imgPlein} />
      {/* bouche : x 42–58 %, y 62–76 % ; s'étire vers le bas (origine en haut) */}
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(62% 42% 24% 42%)', transformOrigin: '50% 62%',
        animation: closing ? `${uid}-bouche 0.5s ease-out forwards` : undefined,
      }} />
      {closing && carreRef && <Bulles carreRef={carreRef} uid={uid} />}
      <style>{`@keyframes ${uid}-bouche{0%{transform:scaleY(1)}45%{transform:scaleY(1.55)}100%{transform:scaleY(1.42)}}`}</style>
    </>
  )
}

// escargot-maison — il remue ses antennes : les deux tiges (coin haut-gauche)
// oscillent autour de leur base, ce qui fait balancer les clochettes
// suspendues. Sa coquille/maison se remue légèrement. Le corps reste fixe (un
// calque qui exclut le coin haut-gauche pour ne pas dédoubler les antennes).
function EscargotMaison({ uid, closing }: BeteProps) {
  const src = '/tetes/escargot-maison/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'polygon(50% 0,100% 0,100% 100%,0 100%,0 46%,50% 46%)',
      }} />
      {/* antennes + clochettes : x 0–50 %, y 0–46 % ; pivot près de la tête */}
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(0 50% 54% 0)', transformOrigin: '34% 46%',
        animation: closing ? `${uid}-antennes 1.05s ease-in-out forwards` : undefined,
      }} />
      {/* coquille/maison : x 46–86 %, y 28–80 % ; léger frémissement */}
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(28% 14% 20% 46%)', transformOrigin: '66% 80%',
        animation: closing ? `${uid}-coquille 1.05s ease-in-out forwards` : undefined,
      }} />
      <style>{`
        @keyframes ${uid}-antennes{0%{transform:rotate(0)}22%{transform:rotate(-6deg)}48%{transform:rotate(5deg)}72%{transform:rotate(-3deg)}100%{transform:rotate(0)}}
        @keyframes ${uid}-coquille{0%{transform:rotate(0) scale(1)}30%{transform:rotate(2deg) scale(1.012)}65%{transform:rotate(-1.4deg) scale(1.006)}100%{transform:rotate(0) scale(1)}}
      `}</style>
    </>
  )
}

// dame-fleur — elle tend les lèvres en baiser, lentement et sensuellement :
// la bouche se pince (scaleX) et s'avance (scaleY + échelle), puis garde la
// moue. Seule la zone des lèvres est animée, par-dessus le visage figé.
function DameFleur({ uid, closing }: BeteProps) {
  const src = '/tetes/dame-fleur/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={imgPlein} />
      {/* lèvres + pourtour : x 40–60 %, y 54–68 % */}
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(54% 40% 32% 40%)', transformOrigin: '50% 61%',
        animation: closing ? `${uid}-baiser 0.95s ease-in-out forwards` : undefined,
      }} />
      <style>{`@keyframes ${uid}-baiser{0%{transform:scaleX(1) scaleY(1)}45%{transform:scaleX(.74) scaleY(1.22) scale(1.05)}72%{transform:scaleX(.72) scaleY(1.24) scale(1.06)}100%{transform:scaleX(.8) scaleY(1.16) scale(1.03)}}`}</style>
    </>
  )
}

// aiguille d'horloge tournant DE LA DROITE VERS LA GAUCHE (sens anti-horaire,
// rotation négative). Superposée au centre d'un cadran, en aiguille gravée.
function Aiguille({ uid, closing, cx, cy, len, w, dur, tour }: {
  uid: string; closing: boolean; cx: number; cy: number; len: number; w: number; dur: number; tour: number
}) {
  const name = `${uid}-aig-${Math.round(cx)}-${Math.round(cy)}-${Math.round(len)}`
  return (
    <div aria-hidden style={{
      position: 'absolute', left: `${cx}%`, top: `${cy}%`, width: `${len}%`, height: 0,
      transformOrigin: '0% 50%', transform: 'rotate(-90deg)',
      animation: closing ? `${name} ${dur}s linear forwards` : undefined,
    }}>
      <div style={{ position: 'absolute', left: 0, top: -w / 2, height: w, width: '100%', background: '#241c14', borderRadius: w }} />
      <style>{`@keyframes ${name}{from{transform:rotate(-90deg)}to{transform:rotate(${-90 - tour}deg)}}`}</style>
    </div>
  )
}

// hibou-horloge — il remue ses branches comme s'il allait s'envoler (les
// rameaux latéraux battent telles des ailes) et les aiguilles de ses deux
// cadrans (montre de front + horloge de poitrine) tournent à l'envers.
function HibouHorloge({ uid, closing }: BeteProps) {
  const src = '/tetes/hibou-horloge/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={{ ...imgPlein, clipPath: 'inset(0 30% 0 30%)' }} />
      {/* branches gauche (x 0–30 %) et droite (x 70–100 %) : battent comme des ailes */}
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(0 70% 0 0)', transformOrigin: '30% 42%',
        animation: closing ? `${uid}-aileG 1.1s ease-in-out forwards` : undefined,
      }} />
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(0 0 0 70%)', transformOrigin: '70% 42%',
        animation: closing ? `${uid}-aileD 1.1s ease-in-out forwards` : undefined,
      }} />
      <Aiguille uid={uid} closing={closing} cx={51} cy={29} len={6} w={1.4} dur={1.15} tour={300} />
      <Aiguille uid={uid} closing={closing} cx={50} cy={59} len={10} w={1.8} dur={1.15} tour={300} />
      <Aiguille uid={uid} closing={closing} cx={50} cy={59} len={6.5} w={2.4} dur={1.15} tour={150} />
      <style>{`
        @keyframes ${uid}-aileG{0%{transform:rotate(0)}25%{transform:rotate(8deg)}50%{transform:rotate(1deg)}75%{transform:rotate(6deg)}100%{transform:rotate(0)}}
        @keyframes ${uid}-aileD{0%{transform:rotate(0)}25%{transform:rotate(-8deg)}50%{transform:rotate(-1deg)}75%{transform:rotate(-6deg)}100%{transform:rotate(0)}}
      `}</style>
    </>
  )
}

// renard-automne — ses moustaches vibrent (museau) et son oreille droite (côté
// droit de l'image) se plie vers l'avant. Calque de fond qui exclut le coin
// haut-droit (l'oreille) pour qu'elle ne se dédouble pas en se pliant.
function RenardAutomne({ uid, closing }: BeteProps) {
  const src = '/tetes/renard-automne/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'polygon(0 0,58% 0,58% 36%,100% 36%,100% 100%,0 100%)',
      }} />
      {/* oreille droite : x 58–86 %, y 4–36 % ; se plie vers l'avant depuis sa base */}
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(4% 14% 64% 58%)', transformOrigin: '66% 36%',
        animation: closing ? `${uid}-oreille 0.75s ease-in-out forwards` : undefined,
      }} />
      {/* moustaches : x 26–76 %, y 58–80 % ; vibration rapide */}
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, clipPath: 'inset(58% 24% 20% 26%)', transformOrigin: '50% 64%',
        animation: closing ? `${uid}-moustaches 0.6s linear forwards` : undefined,
      }} />
      <style>{`
        @keyframes ${uid}-oreille{0%{transform:rotate(0) scaleY(1)}55%{transform:rotate(24deg) scaleY(.9)}100%{transform:rotate(22deg) scaleY(.9)}}
        @keyframes ${uid}-moustaches{0%,100%{transform:rotate(0) translateX(0)}12%{transform:rotate(1.3deg) translateX(.6%)}28%{transform:rotate(-1.3deg) translateX(-.6%)}44%{transform:rotate(1deg) translateX(.4%)}60%{transform:rotate(-.9deg) translateX(-.4%)}78%{transform:rotate(.5deg)}}
      `}</style>
    </>
  )
}

// jet d'eau de collage qui jaillit du dos de la baleine (évent), comme un vrai
// souffle : une gerbe de traits gravés montant en éventail + gouttelettes de
// papier, qui grandit puis se dissipe en bruine.
function Souffle({ uid }: { uid: string }) {
  // gerbe d'eau en PAPIER CRÈME (remplie, contour sombre) pour rester lisible
  // aussi bien sur fond clair que sur le corps sombre de la baleine.
  return (
    <div aria-hidden style={{
      position: 'absolute', left: '9%', top: '5%', width: '34%', height: '32%',
      transformOrigin: '50% 100%', animation: `${uid}-jet 1.1s ease-out forwards`,
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
        {/* plume centrale + deux jets latéraux, en papier découpé crème */}
        <path d="M50 100 C 41 72, 38 48, 47 10 C 50 4, 52 6, 53 14 C 58 46, 59 74, 50 100 Z"
          fill="#f1e8d2" stroke="#2c2016" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M48 96 C 36 76, 28 56, 27 28 C 27 22, 31 23, 33 30 C 40 56, 47 76, 48 96 Z"
          fill="#ece2c9" stroke="#2c2016" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M52 96 C 64 76, 72 56, 73 28 C 73 22, 69 23, 67 30 C 60 56, 53 76, 52 96 Z"
          fill="#ece2c9" stroke="#2c2016" strokeWidth="1.2" strokeLinejoin="round" />
        {/* gouttelettes qui se détachent en haut */}
        <circle cx="30" cy="20" r="4.2" fill="#f1e8d2" stroke="#2c2016" strokeWidth="1.3" />
        <circle cx="50" cy="8" r="5.2" fill="#f1e8d2" stroke="#2c2016" strokeWidth="1.3" />
        <circle cx="70" cy="20" r="3.6" fill="#f1e8d2" stroke="#2c2016" strokeWidth="1.3" />
      </svg>
      <style>{`@keyframes ${uid}-jet{0%{transform:scaleY(.08) scaleX(.5);opacity:0}22%{opacity:1}55%{transform:scaleY(1) scaleX(1);opacity:1}100%{transform:scaleY(1.08) scaleX(1.15);opacity:0}}`}</style>
    </div>
  )
}

// baleine-ciel — de l'eau (collage) jaillit de son dos comme le souffle d'une
// vraie baleine ; le corps fait un léger soulèvement pendant le souffle.
function BaleineCiel({ uid, closing }: BeteProps) {
  const src = '/tetes/baleine-ciel/ouvert.webp'
  return (
    <>
      <img src={src} alt="" onError={masquer} draggable={false} style={{
        ...imgPlein, transformOrigin: '50% 55%',
        animation: closing ? `${uid}-corps 1.1s ease-in-out forwards` : undefined,
      }} />
      {closing && <Souffle uid={uid} />}
      <style>{`@keyframes ${uid}-corps{0%{transform:translateY(0)}35%{transform:translateY(-1.6%)}100%{transform:translateY(0)}}`}</style>
    </>
  )
}

function RasterArt({ espece, uid, closing, carreRef }: BeteProps & { espece: Espece }) {
  switch (espece) {
    case 'papillon': return <AilesPliantes uid={uid} closing={closing} />
    case 'elephant': return <TrompeLevee uid={uid} closing={closing} />
    case 'tigre': return <EtatsAlignes espece={espece} closing={closing} />
    case 'racine': return <Racine uid={uid} closing={closing} />
    case 'meduse': return <Meduse uid={uid} closing={closing} />
    case 'cerf-lune': return <CerfLune uid={uid} closing={closing} />
    case 'poisson-oiseau': return <PoissonOiseau uid={uid} closing={closing} carreRef={carreRef} />
    case 'escargot-maison': return <EscargotMaison uid={uid} closing={closing} />
    case 'dame-fleur': return <DameFleur uid={uid} closing={closing} />
    case 'hibou-horloge': return <HibouHorloge uid={uid} closing={closing} />
    case 'renard-automne': return <RenardAutomne uid={uid} closing={closing} />
    case 'baleine-ciel': return <BaleineCiel uid={uid} closing={closing} />
    default: return null
  }
}
