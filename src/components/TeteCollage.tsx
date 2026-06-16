import { useRef, useState } from 'react'

/**
 * TeteCollage — bouton « tête d'animal gravée » façon collage surréaliste.
 *
 * Approche HYBRIDE :
 *  · fond = gravure générée (FLUX, style « gravure »/Ernst) — voir
 *    scripts/generer-tetes.mjs. Si l'image manque, repli papier sépia.
 *  · le nom du mode est posé sur un cartouche de papier déchiré.
 *  · au clic, un RABAT de papier découpé claque sur le cartouche — pas en
 *    fondu, mais par à-coups (steps) comme du papier collé image par image —
 *    puis on navigue.
 *
 * Le claquement est volontairement découplé de l'anatomie de la bête : il
 * marche pour une fourmi, un papillon, un tigre ou un éléphant indifféremment.
 */

type Props = {
  src?: string
  label: string
  accent: string
  /** couleur d'encre du cartouche (sépia par défaut) */
  onActivate: () => void
}

const PAPIER = '#e9dcc0'
const PAPIER_OMBRE = '#d8c7a3'
const TRAIT = '#2c1e10'

let _uid = 0

export default function TeteCollage({ src, label, accent, onActivate }: Props) {
  const [closing, setClosing] = useState(false)
  const [broken, setBroken] = useState(false)
  const fired = useRef(false)
  const uid = useRef(`tc${_uid++}`).current

  function handle() {
    if (closing) return
    setClosing(true)
  }
  function onEnd(e: React.AnimationEvent) {
    if (e.animationName !== `${uid}-slam`) return
    if (fired.current) return
    fired.current = true
    onActivate()
  }

  return (
    <button
      onClick={handle}
      aria-label={label}
      style={{
        position: 'relative', width: '100%', aspectRatio: '16 / 7',
        padding: 0, border: 'none', background: PAPIER, cursor: 'pointer',
        overflow: 'hidden', display: 'block', lineHeight: 0,
        boxShadow: '0 2px 0 rgba(0,0,0,0.18), 0 6px 14px rgba(0,0,0,0.22)',
      }}
    >
      {/* ── fond gravure (ou repli sépia) ── */}
      {src && !broken ? (
        <img
          src={src} alt="" aria-hidden onError={() => setBroken(true)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'sepia(0.35) contrast(1.06)',
          }}
        />
      ) : (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(120% 140% at 30% 20%, ${PAPIER} 0%, ${PAPIER_OMBRE} 100%)`,
        }}>
          <svg viewBox="0 0 100 44" width="100%" height="100%" preserveAspectRatio="none" style={{ opacity: 0.5 }}>
            <defs>
              <pattern id={`${uid}-h`} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
                <line x1="0" y1="0" x2="0" y2="3.2" stroke={TRAIT} strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100" height="44" fill={`url(#${uid}-h)`} />
          </svg>
        </div>
      )}

      {/* grain + vignette papier */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: `inset 0 0 0 1px ${TRAIT}55, inset 0 0 24px rgba(40,25,10,0.28)`,
      }} />

      {/* ── cartouche déchiré + nom du mode ── */}
      <div aria-hidden style={{
        position: 'absolute', left: '6%', right: '6%', bottom: '12%',
        height: '34%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* le papier du cartouche, bords déchirés */}
          <svg viewBox="0 0 200 40" width="100%" height="100%" preserveAspectRatio="none"
               style={{ position: 'absolute', inset: 0 }}>
            <path d="M2,6 L18,3 L40,7 L70,2 L104,6 L140,3 L172,7 L198,4
                     L196,34 L168,38 L132,33 L96,38 L62,33 L34,38 L6,34 Z"
              fill={PAPIER} stroke={`${TRAIT}66`} strokeWidth="0.8" />
          </svg>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Raleway', sans-serif", fontWeight: 700,
            fontSize: 'clamp(11px, 3.4vw, 15px)', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: accent, textAlign: 'center',
          }}>
            {label}
          </span>
        </div>
      </div>

      {/* ── rabat de papier découpé qui claque sur le cartouche ── */}
      <div
        aria-hidden
        className={closing ? `${uid}-flap` : ''}
        onAnimationEnd={onEnd}
        style={{
          position: 'absolute', left: '6%', right: '6%', bottom: '12%', height: '34%',
          transformOrigin: 'center bottom',
          transform: 'translateY(-118%) rotate(-2deg)',
          opacity: 0,
          willChange: 'transform',
        }}
      >
        <svg viewBox="0 0 200 40" width="100%" height="100%" preserveAspectRatio="none">
          <path d="M3,4 L30,8 L66,3 L102,8 L138,3 L174,8 L197,5
                   L195,33 L160,38 L120,34 L84,38 L48,34 L14,38 L5,33 Z"
            fill={PAPIER_OMBRE} stroke={`${TRAIT}88`} strokeWidth="1" />
        </svg>
      </div>

      <style>{`
        @keyframes ${uid}-slam {
          0%   { transform: translateY(-118%) rotate(-2deg); opacity: 0; }
          1%   { opacity: 1; }
          40%  { transform: translateY(-40%)  rotate(1.5deg); opacity: 1; }
          70%  { transform: translateY(6%)    rotate(-1deg);  opacity: 1; }
          100% { transform: translateY(0)     rotate(0deg);   opacity: 1; }
        }
        .${uid}-flap { animation: ${uid}-slam 0.30s steps(1,end) forwards; }
      `}</style>
    </button>
  )
}
