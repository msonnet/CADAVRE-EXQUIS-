import { useRef, useState } from 'react'
import { useReve } from '../reve'

/**
 * TeteCollage — bouton « tête d'animal » du menu, gravure monochrome
 * générée par IA (scripts/generer-tetes.mjs) et détourée par luminance,
 * même pipeline que les calques de SceneDecor — fini le SVG dessiné à la
 * main qui rendait mal sur les boutons. Les couleurs suivent l'ambiance du
 * rêve en cours via le même filtre invert() que SceneDecor/Decor.tsx.
 *
 * Le mot du mode est posé dans le creux anatomique de la bête (mandibules,
 * ailes, gueule). Au clic :
 *  - fourmi / tigre : deux gravures alignées pixel à pixel (ouverte → fermée,
 *    obtenues par inpainting ciblé sur la seule zone des mandibules/gueule,
 *    le reste de l'image est strictement identique) — l'une se substitue à
 *    l'autre par à-coups.
 *  - papillon : une seule gravure (ailes ouvertes) ; aucun inpainting ne peut
 *    replier des ailes sans déplacer des pixels sur tout le cadre, donc la
 *    fermeture est un pliage CSS (clip-path + rotate/scaleX) sur cette même
 *    image, jamais redessinée — donc jamais désalignée.
 * Le mouvement reste par à-coups (steps), pas en fondu.
 */

export type Espece = 'fourmi' | 'papillon' | 'tigre'

type Props = {
  espece: Espece
  label: string
  onActivate: () => void
}

const DARK_AMBIANCES = new Set(['minuit', 'encre', 'argile'])

const BORD_DECHIRE =
  'polygon(1% 5%,7% 1%,17% 4%,29% 0%,44% 3%,59% 0%,74% 4%,87% 1%,99% 6%,' +
  '96% 19%,100% 33%,95% 47%,99% 62%,94% 77%,98% 91%,87% 99%,74% 95%,' +
  '59% 100%,44% 96%,29% 100%,17% 95%,5% 99%,2% 87%,6% 71%,1% 57%,5% 41%,0% 27%,3% 13%)'

const ROTATE: Record<Espece, number> = { fourmi: -1.3, papillon: 1, tigre: 0.8 }
const LABEL_BOX: Record<Espece, { left: string; top: string; width: string; height: string }> = {
  fourmi:   { left: '21%', top: '63%', width: '58%', height: '21%' },
  papillon: { left: '24%', top: '44%', width: '52%', height: '20%' },
  tigre:    { left: '22%', top: '58%', width: '56%', height: '22%' },
}
// durée totale avant d'activer le mode — pilote un minuteur unique, indépendant
// du timing propre à chaque animation visuelle (crossfade ou pliage d'ailes)
const DUREE_FERMETURE = 0.42

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

  const labelBox = LABEL_BOX[espece]

  return (
    <button
      onClick={handle}
      aria-label={label}
      style={{
        position: 'relative', width: '100%', padding: 0, border: 'none',
        background: 'none', cursor: 'pointer', display: 'block', lineHeight: 0,
        transform: `rotate(${ROTATE[espece]}deg)`,
      }}
    >
      {/* minuteur unique : déclenche onActivate une fois la fermeture jouée,
          quelle que soit la durée propre à l'animation visuelle de l'espèce */}
      <div aria-hidden style={{
        position: 'absolute', width: 0, height: 0,
        animation: closing ? `${uid}-tick ${DUREE_FERMETURE}s steps(1,end) forwards` : undefined,
      }} onAnimationEnd={closing ? onEnd : undefined} />
      <style>{`@keyframes ${uid}-tick { to { opacity: 0; } }`}</style>

      {/* doublure — papier de fond qui dépasse, légèrement décalé */}
      <div aria-hidden style={{
        position: 'absolute', inset: '-3%', background: 'var(--reve-ink)', opacity: 0.18,
        clipPath: BORD_DECHIRE, transform: 'rotate(2.4deg)',
      }} />

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1',
        clipPath: BORD_DECHIRE, overflow: 'hidden',
        background: 'var(--reve-bg)',
        boxShadow: '0 3px 1px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          filter: isDark ? 'invert(1) brightness(0.88)' : undefined,
        }}>
          <RasterArt espece={espece} uid={uid} closing={closing} />
        </div>

        {/* grain + vignette papier */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px var(--reve-ink), inset 0 0 18px rgba(0,0,0,0.18)',
          opacity: 0.5,
        }} />

        {/* ── scrap de papier déchiré + le mot, logé dans le creux anatomique ── */}
        <div aria-hidden style={{
          position: 'absolute', ...labelBox,
          opacity: closing ? 0 : 1,
          transition: closing ? 'opacity 0.1s steps(1,end) 0.18s' : undefined,
        }}>
          <svg viewBox="0 0 200 50" width="100%" height="100%" preserveAspectRatio="none"
               style={{ position: 'absolute', inset: 0, transform: 'rotate(-1.2deg)' }}>
            <path d="M3,8 L22,3 L48,9 L78,2 L110,8 L146,2 L176,9 L197,5
                     L194,42 L162,47 L128,40 L92,47 L60,40 L28,47 L5,41 Z"
              fill="var(--reve-bg)" stroke="var(--reve-ink)" strokeWidth="1" opacity="0.95" />
          </svg>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Raleway', sans-serif", fontWeight: 700, lineHeight: 1.05,
            fontSize: 'clamp(8px, 2.4vw, 12px)', letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--reve-ink)', textAlign: 'center',
            transform: 'rotate(-1.2deg)', padding: '0 6%',
          }}>
            {label}
          </span>
        </div>
      </div>
    </button>
  )
}

function masquer(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

/**
 * fourmi / tigre : deux gravures alignées pixel à pixel, l'une se substitue
 * à l'autre par à-coups (steps) — jamais de fondu, jamais de désalignement
 * puisque seule la zone anatomique masquée diffère entre les deux fichiers.
 */
function EtatsAlignes({ espece, closing }: { espece: Espece; closing: boolean }) {
  const base = `/tetes/${espece}`
  const commun: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  }
  return (
    <>
      <img src={`${base}/ouvert.webp`} alt="" onError={masquer} draggable={false} style={{
        ...commun, opacity: closing ? 0 : 1,
        transition: closing ? 'opacity 0.06s steps(1,end) 0.15s' : undefined,
      }} />
      <img src={`${base}/ferme.webp`} alt="" onError={masquer} draggable={false} style={{
        ...commun, opacity: closing ? 1 : 0,
        transition: closing ? 'opacity 0.06s steps(1,end) 0.15s' : undefined,
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
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
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
