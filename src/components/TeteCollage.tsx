import { useRef, useState } from 'react'

/**
 * TeteCollage — bouton « tête d'animal » dessinée à l'encre, dans le même
 * style que les collages surréalistes déjà présents dans le jeu
 * (src/reve/collages.tsx) : trait noir + hachures, sur une carte de papier
 * déchiré. Les couleurs suivent l'ambiance du rêve en cours
 * (var(--reve-ink) / var(--reve-bg)) au lieu d'un sépia figé.
 *
 * Le mot du mode est posé dans le creux anatomique de la bête (mandibules,
 * ailes, gueule). Au clic, ce n'est pas un volet de papier qui vient
 * recouvrir un visuel séparé : la bouche/les ailes ELLES-MÊMES pivotent
 * pour se refermer, dessinées dans le même système de coordonnées que le
 * reste de la créature — donc toujours alignées, jamais de collage raté.
 * Le mouvement reste par à-coups (steps), pas en fondu.
 */

export type Espece = 'fourmi' | 'papillon' | 'tigre'

type Props = {
  espece: Espece
  label: string
  onActivate: () => void
}

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

let _uid = 0

export default function TeteCollage({ espece, label, onActivate }: Props) {
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

  const Art = ART[espece]
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
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }}>
          <Art uid={uid} closing={closing} onEnd={onEnd} />
        </svg>

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

type ArtProps = { uid: string; closing: boolean; onEnd: (e: React.AnimationEvent) => void }

const STROKE = 1.6

function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <pattern id={`${uid}-h45`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="var(--reve-ink)" strokeWidth="0.5" />
      </pattern>
      <pattern id={`${uid}-h30`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <line x1="0" y1="0" x2="0" y2="2.6" stroke="var(--reve-ink)" strokeWidth="0.4" />
      </pattern>
    </defs>
  )
}

// ════════════════════════════════════════════════
// FOURMI — mandibules qui se referment sur le mot
// ════════════════════════════════════════════════
function FourmiArt({ uid, closing, onEnd }: ArtProps) {
  return (
    <>
      <Defs uid={uid} />
      {/* tête */}
      <path d="M50,8 C68,8 80,22 80,40 C80,54 70,61 50,61 C30,61 20,54 20,40 C20,22 32,8 50,8 Z"
        fill={`url(#${uid}-h45)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
      {/* antennes */}
      <path d="M40,12 C32,2 22,-2 16,2" stroke="var(--reve-ink)" strokeWidth="1.3" fill="none" />
      <circle cx="16" cy="2" r="2" fill="var(--reve-ink)" />
      <path d="M60,12 C68,2 78,-2 84,2" stroke="var(--reve-ink)" strokeWidth="1.3" fill="none" />
      <circle cx="84" cy="2" r="2" fill="var(--reve-ink)" />
      {/* yeux */}
      <circle cx="33" cy="30" r="10" fill="var(--reve-ink)" />
      <circle cx="30" cy="26" r="2.4" fill="var(--reve-bg)" />
      <circle cx="67" cy="30" r="10" fill="var(--reve-ink)" />
      <circle cx="64" cy="26" r="2.4" fill="var(--reve-bg)" />

      {/* mandibules — pivotent autour de leur attache sur la tête */}
      <g className={closing ? `${uid}-mandL` : ''} onAnimationEnd={onEnd} style={{ transformOrigin: '42px 56px' }}>
        <path d="M42,56 C30,60 17,70 14,85 C12,94 19,98 28,93 C36,88 41,76 43,64 Z"
          fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} strokeLinejoin="round" />
      </g>
      <g className={closing ? `${uid}-mandR` : ''} style={{ transformOrigin: '58px 56px' }}>
        <path d="M58,56 C70,60 83,70 86,85 C88,94 81,98 72,93 C64,88 59,76 57,64 Z"
          fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} strokeLinejoin="round" />
      </g>

      <style>{`
        @keyframes ${uid}-mL { 0% { transform: rotate(0deg); } 100% { transform: rotate(-50deg); } }
        @keyframes ${uid}-mR { 0% { transform: rotate(0deg); } 100% { transform: rotate(50deg); } }
        .${uid}-mandL { animation: ${uid}-mL 0.36s steps(3,end) forwards; }
        .${uid}-mandR { animation: ${uid}-mR 0.36s steps(3,end) forwards; }
      `}</style>
    </>
  )
}

// ════════════════════════════════════════════════
// PAPILLON — ailes qui se replient verticalement sur le mot
// ════════════════════════════════════════════════
function PapillonArt({ uid, closing, onEnd }: ArtProps) {
  return (
    <>
      <Defs uid={uid} />
      {/* corps + tête */}
      <line x1="50" y1="18" x2="50" y2="78" stroke="var(--reve-ink)" strokeWidth="2.2" />
      <circle cx="50" cy="15" r="4" fill="var(--reve-ink)" />
      <path d="M47,11 L40,2" stroke="var(--reve-ink)" strokeWidth="1.1" fill="none" />
      <path d="M53,11 L60,2" stroke="var(--reve-ink)" strokeWidth="1.1" fill="none" />
      {[28, 38, 48, 58, 68].map(y => (
        <line key={y} x1="47" y1={y} x2="53" y2={y} stroke="var(--reve-ink)" strokeWidth="1" />
      ))}

      {/* ailes — pivotent autour de la ligne du corps (x=50) */}
      <g className={closing ? `${uid}-wingL` : ''} onAnimationEnd={onEnd} style={{ transformOrigin: '50px 40px' }}>
        <path d="M50,30 C30,14 8,18 4,34 C1,46 14,54 30,50 C42,47 50,40 50,30 Z"
          fill={`url(#${uid}-h45)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
        <path d="M50,48 C34,52 16,64 14,78 C13,86 24,88 36,78 C46,70 50,58 50,48 Z"
          fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
      </g>
      <g className={closing ? `${uid}-wingR` : ''} style={{ transformOrigin: '50px 40px' }}>
        <path d="M50,30 C70,14 92,18 96,34 C99,46 86,54 70,50 C58,47 50,40 50,30 Z"
          fill={`url(#${uid}-h45)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
        <path d="M50,48 C66,52 84,64 86,78 C87,86 76,88 64,78 C54,70 50,58 50,48 Z"
          fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
      </g>

      <style>{`
        @keyframes ${uid}-wL { 0% { transform: rotate(0deg) scaleX(1); } 100% { transform: rotate(4deg) scaleX(0.32); } }
        @keyframes ${uid}-wR { 0% { transform: rotate(0deg) scaleX(1); } 100% { transform: rotate(-4deg) scaleX(0.32); } }
        .${uid}-wingL { animation: ${uid}-wL 0.36s steps(3,end) forwards; }
        .${uid}-wingR { animation: ${uid}-wR 0.36s steps(3,end) forwards; }
      `}</style>
    </>
  )
}

// ════════════════════════════════════════════════
// TIGRE — gueule qui se referme sur le mot
// ════════════════════════════════════════════════
function TigreArt({ uid, closing, onEnd }: ArtProps) {
  return (
    <>
      <Defs uid={uid} />
      {/* oreilles */}
      <path d="M22,20 L8,2 L34,14 Z" fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
      <path d="M78,20 L92,2 L66,14 Z" fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
      {/* tête */}
      <path d="M50,10 C72,10 85,28 85,46 C85,68 70,82 50,82 C30,82 15,68 15,46 C15,28 28,10 50,10 Z"
        fill={`url(#${uid}-h45)`} stroke="var(--reve-ink)" strokeWidth={STROKE} />
      {/* rayures */}
      {[[20, 36, 30, 30], [22, 46, 33, 42], [78, 36, 68, 30], [76, 46, 65, 42]].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--reve-ink)" strokeWidth="1.1" />
      ))}
      {/* yeux — grand ouverts */}
      <path d="M27,37 Q35,28 43,37 Q35,44 27,37 Z" fill="var(--reve-ink)" />
      <path d="M57,37 Q65,28 73,37 Q65,44 57,37 Z" fill="var(--reve-ink)" />
      {/* truffe */}
      <path d="M45,50 L55,50 L50,56 Z" fill="var(--reve-ink)" />

      {/* mâchoires — pivotent autour de l'attache au museau */}
      <g className={closing ? `${uid}-jawU` : ''} onAnimationEnd={onEnd} style={{ transformOrigin: '50px 58px' }}>
        <path d="M30,58 C30,56 35,54 50,54 C65,54 70,56 70,58 L68,64 L60,60 L52,65 L44,60 L36,64 Z"
          fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} strokeLinejoin="round" />
      </g>
      <g className={closing ? `${uid}-jawD` : ''} style={{ transformOrigin: '50px 80px' }}>
        <path d="M32,80 C32,78 38,76 50,76 C62,76 68,78 68,80 L66,73 L58,77 L50,72 L42,77 L34,73 Z"
          fill={`url(#${uid}-h30)`} stroke="var(--reve-ink)" strokeWidth={STROKE} strokeLinejoin="round" />
      </g>

      <style>{`
        @keyframes ${uid}-jU { 0% { transform: rotate(0deg) translateY(0); } 100% { transform: rotate(-2deg) translateY(7px); } }
        @keyframes ${uid}-jD { 0% { transform: rotate(0deg) translateY(0); } 100% { transform: rotate(2deg) translateY(-7px); } }
        .${uid}-jawU { animation: ${uid}-jU 0.36s steps(3,end) forwards; }
        .${uid}-jawD { animation: ${uid}-jD 0.36s steps(3,end) forwards; }
      `}</style>
    </>
  )
}

const ART: Record<Espece, React.FC<ArtProps>> = {
  fourmi: FourmiArt,
  papillon: PapillonArt,
  tigre: TigreArt,
}
