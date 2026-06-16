import { useRef, useState } from 'react'
import { useReve } from '../reve'

/**
 * TeteCollage — bouton « tête d'animal » du menu : une gravure monochrome
 * générée par IA (scripts/generer-tetes.mjs) et détourée par luminance, posée
 * directement sur le fond d'ambiance — sans cadre ni papier découpé (l'effet
 * collage a été retiré, il chargeait l'écran et noyait la bête). Les couleurs
 * suivent l'ambiance du rêve via le même filtre invert() que Decor.tsx.
 *
 * Au clic, la bête « se referme » brièvement avant la navigation :
 *  - fourmi / tigre : deux gravures alignées pixel à pixel (ouverte → fermée,
 *    obtenues par inpainting ciblé sur la seule zone des mandibules/gueule,
 *    le reste de l'image est strictement identique) — fondu de l'une à l'autre.
 *  - papillon : une seule gravure (ailes ouvertes) ; aucun inpainting ne peut
 *    replier des ailes sans déplacer des pixels sur tout le cadre, donc la
 *    fermeture est un pliage CSS (clip-path + rotate/scaleX) sur cette même
 *    image, jamais redessinée — donc jamais désalignée.
 * Le nom du mode est une légende sous la tête, en clair sur le fond.
 */

export type Espece = 'fourmi' | 'papillon' | 'tigre'

type Props = {
  espece: Espece
  label: string
  onActivate: () => void
}

const DARK_AMBIANCES = new Set(['minuit', 'encre', 'argile'])

// durée totale avant d'activer le mode — pilote un minuteur unique, indépendant
// du timing propre à chaque animation visuelle (crossfade ou pliage d'ailes).
// Laisse l'état fermé visible un instant avant la navigation, sinon le
// changement passe inaperçu (flash trop bref).
const DUREE_FERMETURE = 0.55

let _uid = 0

export default function TeteCollage({ espece, label, onActivate }: Props) {
  const s = useReve()
  const isDark = DARK_AMBIANCES.has(s?.ambiance.id ?? '')
  const [closing, setClosing] = useState(false)
  const fired = useRef(false)
  const uid = useRef(`tc${_uid++}`).current

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
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}
    >
      {/* minuteur unique : déclenche onActivate une fois la fermeture jouée,
          quelle que soit la durée propre à l'animation visuelle de l'espèce */}
      <div aria-hidden style={{
        position: 'absolute', width: 0, height: 0,
        animation: closing ? `${uid}-tick ${DUREE_FERMETURE}s steps(1,end) forwards` : undefined,
      }} onAnimationEnd={closing ? onEnd : undefined} />
      <style>{`@keyframes ${uid}-tick { to { opacity: 0; } }`}</style>

      {/* tête gravée détourée, posée à même le fond d'ambiance */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1', lineHeight: 0,
        filter: isDark ? 'invert(1) brightness(0.88)' : undefined,
      }}>
        <RasterArt espece={espece} uid={uid} closing={closing} />
      </div>

      {/* légende — nom du mode, en clair sous la bête */}
      <span style={{
        fontFamily: "'Raleway', sans-serif", fontWeight: 700, lineHeight: 1.1,
        fontSize: 'clamp(10px, 2.9vw, 13px)', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--reve-ink)', opacity: 0.78,
        textAlign: 'center',
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
 * fourmi / tigre : deux gravures alignées pixel à pixel, fondu bref de l'une
 * vers l'autre — jamais de désalignement puisque seule la zone anatomique
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

function RasterArt({ espece, uid, closing }: { espece: Espece; uid: string; closing: boolean }) {
  if (espece === 'papillon') return <AilesPliantes uid={uid} closing={closing} />
  return <EtatsAlignes espece={espece} closing={closing} />
}
