import { useRef, useState } from 'react'

/**
 * TeteCollage — bouton « tête d'animal gravée » façon collage surréaliste,
 * vue de face, le nom du mode glissé dans l'anatomie même de la bête
 * (mandibules, ailes, gueule). Au clic, l'anatomie se referme sur le mot —
 * pas en fondu, mais par à-coups (steps), comme du papier découpé animé
 * image par image — puis on navigue.
 *
 * Les volets anatomiques sont invisibles au repos (l'art déjà gravé montre
 * la bouche/les ailes ouvertes) ; ils n'apparaissent que pendant la
 * fermeture, par sauts francs, et restent fermés à la fin.
 *
 * Le rendu reste volontairement IMPARFAIT : silhouette déchirée, papier de
 * doublure qui dépasse, angle légèrement de travers — esprit collage
 * artisanal, pas carte de visite.
 */

export type Espece = 'fourmi' | 'papillon' | 'tigre' | 'elephant'

type Box = { left: string; top: string; width: string; height: string }
type Flap = {
  box: Box
  origin: string
  rest: string
  mid: string
  closed: string
  shape: string
  fill: string
}
type Cfg = { aspect: string; rotate: number; label: Box; flaps: Flap[] }

const PAPIER = '#e9dcc0'
const PAPIER_OMBRE = '#d3c0a0'
const TRAIT = '#2c1e10'
const TRAIT_SOMBRE = '#1c130a'

// Silhouette déchirée appliquée à la planche elle-même — jamais un rectangle propre.
const BORD_DECHIRE =
  'polygon(1% 5%,7% 1%,17% 4%,29% 0%,44% 3%,59% 0%,74% 4%,87% 1%,99% 6%,' +
  '96% 19%,100% 33%,95% 47%,99% 62%,94% 77%,98% 91%,87% 99%,74% 95%,' +
  '59% 100%,44% 96%,29% 100%,17% 95%,5% 99%,2% 87%,6% 71%,1% 57%,5% 41%,0% 27%,3% 13%)'

// Mâchoire / mandibules — bord denté irrégulier en haut, plein jusqu'en bas (couvre tout le volet).
const MACHOIRE = 'M0,16 C0,6 8,2 18,5 L28,0 L38,7 L50,1 L62,7 L74,0 L84,5 L100,16 L100,100 L0,100 Z'
// Paire d'ailes — deux lobes arrondis qui se rejoignent en pointe au centre.
const AILES = 'M50,36 C46,12 22,2 8,12 C0,24 10,42 32,40 C16,50 6,68 14,84 C22,96 40,86 50,58 C60,86 78,96 86,84 C94,68 84,50 68,40 C90,42 100,24 92,12 C78,2 54,12 50,36 Z'
// Trompe d'éléphant repliée — bord charnu ondulé en haut, plein jusqu'en bas.
const TROMPE = 'M0,18 C0,4 14,0 28,4 C40,8 46,18 50,18 C54,18 60,8 72,4 C86,0 100,4 100,18 L100,100 L0,100 Z'

const CFG: Record<Espece, Cfg> = {
  // Cadavre Écrit — la fourmi, les mandibules remontent de sous la tête et happent le mot.
  fourmi: {
    aspect: '1', rotate: -1.3,
    label: { left: '26%', top: '46%', width: '48%', height: '16%' },
    flaps: [
      { box: { left: '23%', top: '43%', width: '54%', height: '22%' }, origin: '50% 100%',
        rest: 'rotate(58deg)', mid: 'rotate(24deg)', closed: 'rotate(0deg)', shape: MACHOIRE, fill: TRAIT_SOMBRE },
    ],
  },
  // Cadavre Dessiné — la phalène, les ailes se replient par le haut et avalent le mot.
  papillon: {
    aspect: '1', rotate: 1,
    label: { left: '22%', top: '41%', width: '56%', height: '17%' },
    flaps: [
      { box: { left: '19%', top: '37%', width: '62%', height: '24%' }, origin: '50% 0%',
        rest: 'rotate(-58deg)', mid: 'rotate(-22deg)', closed: 'rotate(0deg)', shape: AILES, fill: '#cdb98f' },
    ],
  },
  // Mode en ligne — le tigre, la mâchoire inférieure remonte avaler le mot.
  tigre: {
    aspect: '5 / 4', rotate: 0.8,
    label: { left: '27%', top: '60%', width: '46%', height: '17%' },
    flaps: [
      { box: { left: '24%', top: '44%', width: '52%', height: '22%' }, origin: '50% 0%',
        rest: 'rotate(0deg)', mid: 'rotate(4deg)', closed: 'rotate(8deg)', shape: MACHOIRE, fill: '#e7d9bb' },
      { box: { left: '24%', top: '60%', width: '52%', height: '36%' }, origin: '50% 100%',
        rest: 'rotate(50deg)', mid: 'rotate(20deg)', closed: 'rotate(0deg)', shape: MACHOIRE, fill: '#e7d9bb' },
    ],
  },
  // Atelier — la trompe se replie sur le mot.
  elephant: {
    aspect: '1', rotate: -0.8,
    label: { left: '24%', top: '50%', width: '52%', height: '16%' },
    flaps: [
      { box: { left: '21%', top: '46%', width: '58%', height: '22%' }, origin: '50% 100%',
        rest: 'rotate(56deg)', mid: 'rotate(22deg)', closed: 'rotate(0deg)', shape: TROMPE, fill: TRAIT_SOMBRE },
    ],
  },
}

type Props = {
  espece: Espece
  src?: string
  label: string
  onActivate: () => void
}

let _uid = 0

export default function TeteCollage({ espece, src, label, onActivate }: Props) {
  const [closing, setClosing] = useState(false)
  const [broken, setBroken] = useState(false)
  const fired = useRef(false)
  const uid = useRef(`tc${_uid++}`).current
  const cfg = CFG[espece]

  function handle() {
    if (closing) return
    setClosing(true)
  }
  function onEnd(e: React.AnimationEvent) {
    if (e.animationName !== `${uid}-f0`) return
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
        background: 'none', cursor: 'pointer', display: 'block', lineHeight: 0,
        transform: `rotate(${cfg.rotate}deg)`,
      }}
    >
      {/* doublure — papier de fond qui dépasse, légèrement décalé */}
      <div aria-hidden style={{
        position: 'absolute', inset: '-3%', background: PAPIER_OMBRE,
        clipPath: BORD_DECHIRE, transform: 'rotate(2.4deg)',
      }} />

      <div style={{
        position: 'relative', width: '100%', aspectRatio: cfg.aspect,
        clipPath: BORD_DECHIRE, overflow: 'hidden',
        boxShadow: '0 3px 1px rgba(0,0,0,0.15)',
      }}>
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
            <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" style={{ opacity: 0.5 }}>
              <defs>
                <pattern id={`${uid}-h`} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
                  <line x1="0" y1="0" x2="0" y2="3.2" stroke={TRAIT} strokeWidth="0.4" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill={`url(#${uid}-h)`} />
            </svg>
          </div>
        )}

        {/* grain + vignette papier */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          boxShadow: `inset 0 0 0 1px ${TRAIT}55, inset 0 0 22px rgba(40,25,10,0.3)`,
        }} />

        {/* ── scrap de papier déchiré + le mot, logé dans le creux anatomique ── */}
        <div aria-hidden style={{ position: 'absolute', ...cfg.label }}>
          <svg viewBox="0 0 200 50" width="100%" height="100%" preserveAspectRatio="none"
               style={{ position: 'absolute', inset: 0, transform: 'rotate(-1.2deg)' }}>
            <path d="M3,8 L22,3 L48,9 L78,2 L110,8 L146,2 L176,9 L197,5
                     L194,42 L162,47 L128,40 L92,47 L60,40 L28,47 L5,41 Z"
              fill={PAPIER} stroke={`${TRAIT}66`} strokeWidth="1" />
          </svg>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Raleway', sans-serif", fontWeight: 700,
            fontSize: 'clamp(10px, 3.1vw, 14px)', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: TRAIT, textAlign: 'center',
            transform: 'rotate(-1.2deg)', padding: '0 4%',
          }}>
            {label}
          </span>
        </div>

        {/* ── volets anatomiques (mandibules / ailes / mâchoire) — invisibles au repos ── */}
        {cfg.flaps.map((f, i) => (
          <div key={i} aria-hidden className={closing ? `${uid}-f${i}` : ''}
               onAnimationEnd={i === 0 ? onEnd : undefined}
               style={{
                 position: 'absolute', ...f.box, transformOrigin: f.origin,
                 opacity: closing ? undefined : 0,
                 transform: closing ? undefined : f.rest,
                 willChange: 'transform, opacity',
               }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none"
                 style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }}>
              <path d={f.shape} fill={f.fill} stroke={TRAIT} strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        ))}

        <style>{cfg.flaps.map((f, i) => `
          @keyframes ${uid}-f${i} {
            0%   { opacity: 0; transform: ${f.rest}; }
            ${i === 0 ? '1%' : '12%'}   { opacity: 1; transform: ${f.rest}; }
            ${i === 0 ? '45%' : '55%'}  { transform: ${f.mid}; }
            100% { transform: ${f.closed}; }
          }
          .${uid}-f${i} { animation: ${uid}-f${i} 0.38s steps(1,end) forwards; }
        `).join('\n')}</style>
      </div>
    </button>
  )
}
