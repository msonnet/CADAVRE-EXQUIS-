import React from 'react'

// ════════════════════════════════════════════════
// COLLAGES — 17 gravures inspirées d'œuvres surréalistes
// Chacune est un SVG inline, en hachures noires sur papier
// ════════════════════════════════════════════════

const ENCRE = '#1a1410'
const PAPIER = '#ede2c8'
const ROUGE = '#a8332a'

/** Patterns de hachure — à inclure une seule fois dans l'app via <Hatches /> */
export function Hatches() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <pattern id="h45" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke={ENCRE} strokeWidth="0.45" />
        </pattern>
        <pattern id="h30" patternUnits="userSpaceOnUse" width="2.5" height="2.5" patternTransform="rotate(30)">
          <line x1="0" y1="0" x2="0" y2="2.5" stroke={ENCRE} strokeWidth="0.35" />
        </pattern>
        <pattern id="h-30" patternUnits="userSpaceOnUse" width="2.5" height="2.5" patternTransform="rotate(-30)">
          <line x1="0" y1="0" x2="0" y2="2.5" stroke={ENCRE} strokeWidth="0.35" />
        </pattern>
        <pattern id="h60" patternUnits="userSpaceOnUse" width="2" height="2" patternTransform="rotate(60)">
          <line x1="0" y1="0" x2="0" y2="2" stroke={ENCRE} strokeWidth="0.32" />
        </pattern>
        <pattern id="hcross" patternUnits="userSpaceOnUse" width="3" height="3">
          <line x1="0" y1="0" x2="3" y2="3" stroke={ENCRE} strokeWidth="0.3" />
          <line x1="3" y1="0" x2="0" y2="3" stroke={ENCRE} strokeWidth="0.3" />
        </pattern>
      </defs>
    </svg>
  )
}

type SVGProps = { w?: number }

// 1 · L'Œil tranché — Un Chien Andalou (Buñuel/Dalí, 1929)
const OeilTranche: React.FC<SVGProps> = ({ w = 140 }) => (
  <svg width={w} height={w * 0.65} viewBox="0 0 200 130">
    <path d="M10,65 Q100,5 190,65" stroke={ENCRE} strokeWidth="1.3" fill="none" />
    <path d="M10,65 Q100,115 190,65" stroke={ENCRE} strokeWidth="1.3" fill="none" />
    <circle cx="100" cy="65" r="36" fill="url(#h45)" stroke={ENCRE} strokeWidth="1.2" />
    <circle cx="100" cy="65" r="24" stroke={ENCRE} strokeWidth="0.8" fill="none" />
    <circle cx="100" cy="65" r="12" fill={ENCRE} />
    <circle cx="96" cy="61" r="3" fill={PAPIER} />
    {[15, 35, 55, 75, 95, 115, 135, 155, 175].map(x => (
      <line key={x} x1={x} y1={65 - Math.sqrt(Math.max(0, 8100 - (x - 100) * (x - 100))) * 0.6}
        x2={x} y2={65 - Math.sqrt(Math.max(0, 8100 - (x - 100) * (x - 100))) * 0.6 - 7}
        stroke={ENCRE} strokeWidth="0.6" />
    ))}
    <g transform="rotate(-12 100 65)">
      <rect x="40" y="60" width="120" height="10" fill={PAPIER} stroke={ENCRE} strokeWidth="1.1" />
      <line x1="40" y1="65" x2="160" y2="65" stroke={ENCRE} strokeWidth="0.6" />
      <line x1="50" y1="68" x2="155" y2="68" stroke={ENCRE} strokeWidth="0.4" />
    </g>
  </svg>
)

// 2 · La Pipe — La Trahison des images (Magritte, 1929)
const Pipe: React.FC<SVGProps> = ({ w = 140 }) => (
  <svg width={w} height={w * 0.45} viewBox="0 0 200 90">
    <path d="M15,55 L95,55 Q100,40 115,40 Q140,40 145,55 Q150,75 130,80 L120,82 Q105,82 100,72 L20,72 Q10,72 10,63 Q10,55 15,55 Z"
      fill="url(#h30)" stroke={ENCRE} strokeWidth="1.2" />
    <ellipse cx="128" cy="55" rx="13" ry="6" fill={PAPIER} stroke={ENCRE} strokeWidth="1" />
    <ellipse cx="128" cy="54" rx="9" ry="3" fill={ENCRE} opacity="0.7" />
    <line x1="20" y1="63" x2="100" y2="63" stroke={ENCRE} strokeWidth="0.6" />
  </svg>
)

// 3 · L'Horloge molle — Persistance de la mémoire (Dalí, 1931)
const HorlogeMolle: React.FC<SVGProps> = ({ w = 130 }) => (
  <svg width={w} height={w * 0.95} viewBox="0 0 130 124">
    <path d="M10,40 Q15,30 35,32 Q60,38 80,55 Q100,75 110,95 Q115,108 102,110 Q85,108 70,98 Q50,82 30,75 Q12,66 8,52 Q6,44 10,40 Z"
      fill="url(#h-30)" stroke={ENCRE} strokeWidth="1.2" />
    <text x="38" y="48" fontFamily="Bodoni Moda, serif" fontSize="9" fontWeight="700" fill={ENCRE}>XII</text>
    <text x="82" y="74" fontFamily="Bodoni Moda, serif" fontSize="9" fontWeight="700" fill={ENCRE} transform="rotate(20 82 74)">III</text>
    <text x="70" y="100" fontFamily="Bodoni Moda, serif" fontSize="9" fontWeight="700" fill={ENCRE} transform="rotate(15 70 100)">VI</text>
    <text x="22" y="76" fontFamily="Bodoni Moda, serif" fontSize="9" fontWeight="700" fill={ENCRE} transform="rotate(-15 22 76)">IX</text>
    <line x1="52" y1="62" x2="65" y2="40" stroke={ENCRE} strokeWidth="1.5" />
    <line x1="52" y1="62" x2="75" y2="68" stroke={ENCRE} strokeWidth="1.2" />
    <circle cx="52" cy="62" r="2" fill={ENCRE} />
  </svg>
)

// 4 · L'Oiseau-cage — Magritte / Cornell
const OiseauCage: React.FC<SVGProps> = ({ w = 100 }) => (
  <svg width={w} height={w * 1.4} viewBox="0 0 100 140">
    <rect x="15" y="20" width="70" height="100" fill="none" stroke={ENCRE} strokeWidth="1.2" />
    <path d="M15,20 Q50,5 85,20" stroke={ENCRE} strokeWidth="1.2" fill="none" />
    <circle cx="50" cy="6" r="3" stroke={ENCRE} strokeWidth="1" fill={PAPIER} />
    {[28, 40, 50, 60, 72].map(x => (
      <line key={x} x1={x} y1="20" x2={x} y2="120" stroke={ENCRE} strokeWidth="0.5" />
    ))}
    <line x1="15" y1="70" x2="85" y2="70" stroke={ENCRE} strokeWidth="0.6" />
    <g transform="translate(35, 60)">
      <path d="M0,8 Q5,0 15,2 Q22,4 25,10 L23,16 L8,16 L4,12 Z" fill="url(#h45)" stroke={ENCRE} strokeWidth="1" />
      <line x1="10" y1="16" x2="10" y2="22" stroke={ENCRE} strokeWidth="0.8" />
      <line x1="18" y1="16" x2="18" y2="22" stroke={ENCRE} strokeWidth="0.8" />
      <circle cx="22" cy="5" r="1.5" fill={ENCRE} />
      <path d="M25,7 L30,8 L25,9 Z" fill={ENCRE} />
    </g>
    <line x1="15" y1="120" x2="85" y2="120" stroke={ENCRE} strokeWidth="1.5" />
  </svg>
)

// 5 · La Clef — Une semaine de bonté (Max Ernst, 1934)
const Clef: React.FC<SVGProps> = ({ w = 60 }) => (
  <svg width={w} height={w * 2.2} viewBox="0 0 60 132">
    <circle cx="30" cy="22" r="18" fill="url(#hcross)" stroke={ENCRE} strokeWidth="1.2" />
    <circle cx="30" cy="22" r="9" fill={PAPIER} stroke={ENCRE} strokeWidth="1" />
    <rect x="27" y="38" width="6" height="80" fill={PAPIER} stroke={ENCRE} strokeWidth="1.1" />
    <line x1="29" y1="40" x2="29" y2="118" stroke={ENCRE} strokeWidth="0.4" />
    <line x1="31" y1="40" x2="31" y2="118" stroke={ENCRE} strokeWidth="0.4" />
    <path d="M33,100 L42,100 L42,108 L33,108 Z" fill={PAPIER} stroke={ENCRE} strokeWidth="1.1" />
    <path d="M33,113 L46,113 L46,124 L33,124 Z" fill={PAPIER} stroke={ENCRE} strokeWidth="1.1" />
    <path d="M33,118 L40,118 L40,122 L33,122 Z" fill={ENCRE} />
  </svg>
)

// 6 · Le Chapeau melon — Magritte
const ChapeauMelon: React.FC<SVGProps> = ({ w = 120 }) => (
  <svg width={w} height={w * 0.65} viewBox="0 0 130 84">
    <path d="M30,55 Q30,15 65,15 Q100,15 100,55" fill="url(#h30)" stroke={ENCRE} strokeWidth="1.3" />
    <ellipse cx="65" cy="55" rx="55" ry="8" fill={PAPIER} stroke={ENCRE} strokeWidth="1.2" />
    <line x1="30" y1="55" x2="100" y2="55" stroke={ENCRE} strokeWidth="1.2" />
    <path d="M32,50 L98,50" stroke={ENCRE} strokeWidth="3" />
    <path d="M32,50 L98,50" stroke={PAPIER} strokeWidth="1.5" />
  </svg>
)

// 7 · La Pomme — Le Fils de l'homme (Magritte, 1964)
const Pomme: React.FC<SVGProps> = ({ w = 100 }) => (
  <svg width={w} height={w * 1.05} viewBox="0 0 100 105">
    <path d="M50,18 Q25,18 18,40 Q12,65 28,85 Q40,98 50,98 Q60,98 72,85 Q88,65 82,40 Q75,18 50,18 Q50,12 53,5"
      fill="url(#h45)" stroke={ENCRE} strokeWidth="1.3" />
    <path d="M50,12 Q55,8 60,10" stroke={ENCRE} strokeWidth="1.2" fill="none" />
    <path d="M45,30 Q40,40 42,55" stroke={ENCRE} strokeWidth="0.6" fill="none" />
    <path d="M53,12 Q62,5 68,12 Q62,16 53,15 Z" fill={PAPIER} stroke={ENCRE} strokeWidth="0.9" />
  </svg>
)

// 8 · La Main qui écrit — Bataille / Magritte
const MainAnatomique: React.FC<SVGProps> = ({ w = 110 }) => (
  <svg width={w} height={w * 1.25} viewBox="0 0 100 125">
    <path d="M25,125 Q22,80 30,55 Q22,45 25,30 Q30,25 35,32 L37,55 Q40,30 45,15 Q52,12 54,20 L52,50 Q56,18 62,10 Q70,10 70,18 L66,52 Q72,25 78,22 Q85,25 82,35 L74,60 Q88,55 88,68 Q85,80 75,82 L70,90 Q72,115 65,125 Z"
      fill="url(#h30)" stroke={ENCRE} strokeWidth="1.1" />
    <path d="M40,90 Q55,95 70,88" stroke={ENCRE} strokeWidth="0.6" fill="none" />
    <path d="M38,105 Q55,108 68,100" stroke={ENCRE} strokeWidth="0.6" fill="none" />
  </svg>
)

// 9 · Le Papillon — Carrington / Brauner
const Papillon: React.FC<SVGProps> = ({ w = 130 }) => (
  <svg width={w} height={w * 0.7} viewBox="0 0 130 90">
    <line x1="65" y1="15" x2="65" y2="75" stroke={ENCRE} strokeWidth="2" />
    <circle cx="65" cy="13" r="3" fill={ENCRE} />
    <line x1="63" y1="10" x2="58" y2="3" stroke={ENCRE} strokeWidth="0.8" />
    <line x1="67" y1="10" x2="72" y2="3" stroke={ENCRE} strokeWidth="0.8" />
    <path d="M65,25 Q35,12 15,25 Q5,40 25,48 Q50,48 65,40 Z" fill="url(#h45)" stroke={ENCRE} strokeWidth="1.2" />
    <path d="M65,42 Q40,52 22,70 Q22,80 40,75 Q58,68 65,55 Z" fill="url(#h60)" stroke={ENCRE} strokeWidth="1.2" />
    <path d="M65,25 Q95,12 115,25 Q125,40 105,48 Q80,48 65,40 Z" fill="url(#h-30)" stroke={ENCRE} strokeWidth="1.2" />
    <path d="M65,42 Q90,52 108,70 Q108,80 90,75 Q72,68 65,55 Z" fill="url(#hcross)" stroke={ENCRE} strokeWidth="1.2" />
    <circle cx="35" cy="32" r="4" fill={ENCRE} />
    <circle cx="35" cy="32" r="1.5" fill={PAPIER} />
    <circle cx="95" cy="32" r="4" fill={ENCRE} />
    <circle cx="95" cy="32" r="1.5" fill={PAPIER} />
  </svg>
)

// 10 · L'Œuf philosophal — Brauner
const Oeuf: React.FC<SVGProps> = ({ w = 90 }) => (
  <svg width={w} height={w * 1.25} viewBox="0 0 90 112">
    <ellipse cx="45" cy="62" rx="38" ry="48" fill="url(#h60)" stroke={ENCRE} strokeWidth="1.3" />
    <path d="M20,40 Q35,28 50,30" stroke={ENCRE} strokeWidth="0.5" fill="none" />
  </svg>
)

// 11 · Le Poisson soluble — Breton
const Poisson: React.FC<SVGProps> = ({ w = 140 }) => (
  <svg width={w} height={w * 0.55} viewBox="0 0 140 78">
    <path d="M115,40 Q120,15 100,18 Q70,22 35,38 Q15,42 10,38 Q5,40 8,42 L18,45 Q12,52 8,55 Q15,58 25,55 L35,52 Q70,58 100,62 Q120,65 115,40 Z"
      fill="url(#h30)" stroke={ENCRE} strokeWidth="1.2" />
    <path d="M5,40 L-2,30 L8,40 L-2,55 L5,42 Z" fill={PAPIER} stroke={ENCRE} strokeWidth="1.1" />
    <path d="M60,38 L65,25 L75,38 Z" fill={PAPIER} stroke={ENCRE} strokeWidth="1" />
    <path d="M60,55 L65,68 L75,55 Z" fill={PAPIER} stroke={ENCRE} strokeWidth="1" />
    <circle cx="100" cy="35" r="3" fill={ENCRE} />
    <circle cx="100" cy="35" r="1" fill={PAPIER} />
    <path d="M45,45 Q50,40 55,45" stroke={ENCRE} strokeWidth="0.4" fill="none" />
    <path d="M55,48 Q60,43 65,48" stroke={ENCRE} strokeWidth="0.4" fill="none" />
    <path d="M65,45 Q70,40 75,45" stroke={ENCRE} strokeWidth="0.4" fill="none" />
    <path d="M75,48 Q80,43 85,48" stroke={ENCRE} strokeWidth="0.4" fill="none" />
  </svg>
)

// 12 · La Lune absente — Desnos
const Lune: React.FC<SVGProps> = ({ w = 100 }) => (
  <svg width={w} height={w} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="url(#h45)" stroke={ENCRE} strokeWidth="1.3" />
    <path d="M50,50 Q35,30 50,15" stroke={ENCRE} strokeWidth="0.6" fill="none" />
    <circle cx="40" cy="42" r="3" fill={ENCRE} opacity="0.6" />
    <circle cx="58" cy="55" r="2" fill={ENCRE} opacity="0.6" />
    <circle cx="48" cy="68" r="2.5" fill={ENCRE} opacity="0.6" />
    <circle cx="62" cy="38" r="1.5" fill={ENCRE} opacity="0.5" />
  </svg>
)

// 13 · Mobile — Calder
const Mobile: React.FC<SVGProps> = ({ w = 130 }) => (
  <svg width={w} height={w * 1.1} viewBox="0 0 130 144">
    <circle cx="65" cy="6" r="2" fill={ENCRE} />
    <line x1="65" y1="6" x2="65" y2="22" stroke={ENCRE} strokeWidth="0.8" />
    <line x1="22" y1="22" x2="108" y2="22" stroke={ENCRE} strokeWidth="1" />
    <line x1="22" y1="22" x2="22" y2="50" stroke={ENCRE} strokeWidth="0.7" />
    <line x1="108" y1="22" x2="108" y2="42" stroke={ENCRE} strokeWidth="0.7" />
    <ellipse cx="22" cy="56" rx="14" ry="9" fill={ENCRE} />
    <line x1="92" y1="42" x2="124" y2="42" stroke={ENCRE} strokeWidth="0.9" />
    <line x1="92" y1="42" x2="92" y2="72" stroke={ENCRE} strokeWidth="0.6" />
    <line x1="124" y1="42" x2="124" y2="85" stroke={ENCRE} strokeWidth="0.6" />
    <circle cx="92" cy="80" r="9" fill={ROUGE} stroke={ENCRE} strokeWidth="0.8" />
    <path d="M118,88 L130,88 L124,102 Z" fill="url(#hcross)" stroke={ENCRE} strokeWidth="0.9" />
    <line x1="22" y1="65" x2="22" y2="95" stroke={ENCRE} strokeWidth="0.5" />
    <line x1="8" y1="95" x2="38" y2="95" stroke={ENCRE} strokeWidth="0.8" />
    <line x1="8" y1="95" x2="8" y2="120" stroke={ENCRE} strokeWidth="0.4" />
    <line x1="38" y1="95" x2="38" y2="115" stroke={ENCRE} strokeWidth="0.4" />
    <circle cx="8" cy="128" r="5" fill={PAPIER} stroke={ENCRE} strokeWidth="0.7" />
    <path d="M32,118 L44,118 L38,128 Z" fill={ENCRE} />
  </svg>
)

// 14 · Paysage biomorphique — Tanguy
const PaysageTanguy: React.FC<SVGProps> = ({ w = 140 }) => (
  <svg width={w} height={w * 0.62} viewBox="0 0 140 88">
    <line x1="0" y1="50" x2="140" y2="50" stroke={ENCRE} strokeWidth="0.5" opacity="0.5" />
    <ellipse cx="25" cy="62" rx="14" ry="3" fill={ENCRE} opacity="0.3" />
    <path d="M18,60 Q15,40 22,38 Q30,40 28,55 Q26,62 22,62 Z" fill="url(#h60)" stroke={ENCRE} strokeWidth="0.9" />
    <line x1="22" y1="48" x2="22" y2="40" stroke={ENCRE} strokeWidth="0.6" />
    <ellipse cx="55" cy="65" rx="22" ry="3" fill={ENCRE} opacity="0.25" />
    <path d="M45,62 Q42,35 55,30 Q70,32 68,50 Q66,62 60,64 Z" fill="url(#h45)" stroke={ENCRE} strokeWidth="0.9" />
    <circle cx="60" cy="44" r="1.5" fill={ENCRE} />
    <ellipse cx="100" cy="60" rx="18" ry="3" fill={ENCRE} opacity="0.3" />
    <path d="M85,58 Q90,38 100,36 Q115,40 113,52 Q108,60 100,60 Z" fill="url(#hcross)" stroke={ENCRE} strokeWidth="0.9" />
    <ellipse cx="125" cy="50" rx="8" ry="1.5" fill={ENCRE} opacity="0.4" />
    <path d="M122,49 Q123,42 127,44 Q130,48 128,50 Z" fill={ENCRE} opacity="0.6" />
    <circle cx="115" cy="20" r="3" fill={ENCRE} opacity="0.3" />
  </svg>
)

// 15 · Le Mannequin métaphysique — de Chirico
const Mannequin: React.FC<SVGProps> = ({ w = 80 }) => (
  <svg width={w} height={w * 1.5} viewBox="0 0 80 120">
    <ellipse cx="40" cy="20" rx="11" ry="14" fill="url(#h30)" stroke={ENCRE} strokeWidth="1" />
    <line x1="32" y1="20" x2="48" y2="20" stroke={ENCRE} strokeWidth="0.7" />
    <rect x="36" y="32" width="8" height="6" fill={ENCRE} opacity="0.3" />
    <path d="M22,38 L58,38 L62,90 L18,90 Z" fill="url(#h45)" stroke={ENCRE} strokeWidth="1.1" />
    <rect x="28" y="48" width="24" height="3" fill={PAPIER} stroke={ENCRE} strokeWidth="0.5" />
    {[32, 36, 40, 44, 48].map(x => (
      <line key={x} x1={x} y1="48" x2={x} y2="51" stroke={ENCRE} strokeWidth="0.4" />
    ))}
    <path d="M14,90 L66,90 L70,105 L10,105 Z" fill={PAPIER} stroke={ENCRE} strokeWidth="1" />
    <line x1="10" y1="98" x2="70" y2="98" stroke={ENCRE} strokeWidth="0.5" />
    <ellipse cx="40" cy="115" rx="28" ry="3" fill={ENCRE} opacity="0.4" />
  </svg>
)

// 16 · La Poupée articulée — Bellmer
const Poupee: React.FC<SVGProps> = ({ w = 90 }) => (
  <svg width={w} height={w * 1.35} viewBox="0 0 90 122">
    <circle cx="45" cy="14" r="11" fill="url(#h45)" stroke={ENCRE} strokeWidth="1.1" />
    <circle cx="42" cy="13" r="1.2" fill={ENCRE} />
    <circle cx="48" cy="13" r="1.2" fill={ENCRE} />
    <circle cx="45" cy="26" r="2.5" fill={PAPIER} stroke={ENCRE} strokeWidth="0.7" />
    <line x1="45" y1="25" x2="45" y2="27" stroke={ENCRE} strokeWidth="0.5" />
    <circle cx="45" cy="45" r="14" fill="url(#h60)" stroke={ENCRE} strokeWidth="1.1" />
    <circle cx="45" cy="72" r="15" fill="url(#hcross)" stroke={ENCRE} strokeWidth="1.1" />
    <circle cx="32" cy="42" r="2" fill={PAPIER} stroke={ENCRE} strokeWidth="0.6" />
    <circle cx="58" cy="42" r="2" fill={PAPIER} stroke={ENCRE} strokeWidth="0.6" />
    <path d="M30,44 Q22,55 18,68" stroke={ENCRE} strokeWidth="1.4" fill="none" />
    <path d="M60,44 Q70,55 76,72" stroke={ENCRE} strokeWidth="1.4" fill="none" />
    <circle cx="18" cy="71" r="3.5" fill={PAPIER} stroke={ENCRE} strokeWidth="0.8" />
    <circle cx="76" cy="75" r="3.5" fill={PAPIER} stroke={ENCRE} strokeWidth="0.8" />
    <circle cx="38" cy="88" r="2" fill={PAPIER} stroke={ENCRE} strokeWidth="0.6" />
    <circle cx="52" cy="88" r="2" fill={PAPIER} stroke={ENCRE} strokeWidth="0.6" />
    <path d="M36,90 Q32,100 30,115" stroke={ENCRE} strokeWidth="1.4" fill="none" />
    <path d="M54,90 Q58,100 62,115" stroke={ENCRE} strokeWidth="1.4" fill="none" />
    <ellipse cx="28" cy="117" rx="4" ry="2" fill={ENCRE} />
    <ellipse cx="64" cy="117" rx="4" ry="2" fill={ENCRE} />
  </svg>
)

// 17 · Ticket Merz — Schwitters
const TicketMerz: React.FC<SVGProps> = ({ w = 120 }) => (
  <svg width={w} height={w * 0.85} viewBox="0 0 120 102">
    <path d="M5,10 L100,5 L115,8 L108,55 L112,80 L98,95 L20,92 L8,85 L3,40 Z"
      fill="#e8d8b0" stroke={ENCRE} strokeWidth="0.9" />
    <rect x="12" y="14" width="32" height="22" fill={PAPIER} stroke={ENCRE} strokeWidth="0.8" />
    <text x="28" y="22" textAnchor="middle" fontFamily="IM Fell English" fontSize="5" fill={ENCRE}>POSTES</text>
    <circle cx="28" cy="29" r="5" fill="url(#h45)" stroke={ENCRE} strokeWidth="0.5" />
    <circle cx="68" cy="22" r="11" fill="none" stroke={ENCRE} strokeWidth="0.8" />
    <text x="68" y="25" textAnchor="middle" fontFamily="IM Fell English" fontSize="5" fill={ENCRE}>BERLIN</text>
    <text x="68" y="20" textAnchor="middle" fontFamily="IM Fell English" fontSize="3.5" fill={ENCRE}>1923</text>
    <text x="12" y="50" fontFamily="Bodoni Moda" fontWeight="900" fontStyle="italic" fontSize="11" fill={ENCRE}>MERZ</text>
    <line x1="12" y1="55" x2="80" y2="55" stroke={ENCRE} strokeWidth="0.5" />
    <text x="12" y="64" fontFamily="IM Fell English" fontSize="5" fill={ENCRE}>billet annulé · 14h22</text>
    <text x="12" y="72" fontFamily="IM Fell English" fontSize="5" fill={ENCRE}>1 cl. unique · n° 7</text>
    <text x="80" y="82" fontFamily="Caveat" fontSize="12" fill={ROUGE}>№ 477</text>
    <line x1="15" y1="80" x2="55" y2="78" stroke={ENCRE} strokeWidth="0.4" opacity="0.6" />
  </svg>
)

// ════════════════════════════════════════════════
// CATALOGUE DES COLLAGES — { id, label, ref, draw, w }
// ════════════════════════════════════════════════
export interface CollageDef {
  id: string
  label: string
  ref: string
  draw: React.FC<SVGProps>
  w: number
}

export const COLLAGES: CollageDef[] = [
  { id: 'oeil',       label: "L'Œil tranché",            ref: "Un Chien andalou · Buñuel & Dalí · 1929",    draw: OeilTranche,    w: 140 },
  { id: 'pipe',       label: "Ceci n'est pas une pipe",  ref: "La Trahison des images · Magritte · 1929",  draw: Pipe,           w: 140 },
  { id: 'horloge',    label: "La Mémoire molle",         ref: "Persistance de la mémoire · Dalí · 1931",   draw: HorlogeMolle,   w: 130 },
  { id: 'cage',       label: "L'Affinité élective",      ref: "d'après Magritte & Cornell",                draw: OiseauCage,     w: 100 },
  { id: 'clef',       label: "La Clef",                  ref: "Une semaine de bonté · Max Ernst · 1934",   draw: Clef,           w: 60  },
  { id: 'chapeau',    label: "Le Chapeau melon",         ref: "Golconde · Magritte · 1953",                draw: ChapeauMelon,   w: 120 },
  { id: 'pomme',      label: "La Pomme",                 ref: "Le Fils de l'homme · Magritte · 1964",      draw: Pomme,          w: 100 },
  { id: 'main',       label: "La Main qui écrit",        ref: "d'après Bataille & Magritte",               draw: MainAnatomique, w: 110 },
  { id: 'papillon',   label: "Le Papillon",              ref: "d'après Brauner & Carrington",              draw: Papillon,       w: 130 },
  { id: 'oeuf',       label: "L'Œuf philosophal",        ref: "d'après Brauner · 1947",                    draw: Oeuf,           w: 90  },
  { id: 'poisson',    label: "Le Poisson soluble",       ref: "d'après Breton · 1924",                     draw: Poisson,        w: 140 },
  { id: 'lune',       label: "La Lune absente",          ref: "d'après Desnos · 1923",                     draw: Lune,           w: 100 },
  { id: 'mobile',     label: "Mobile",                   ref: "d'après Calder · 1932",                     draw: Mobile,         w: 130 },
  { id: 'tanguy',     label: "Paysage biomorphique",     ref: "d'après Y. Tanguy · 1929",                  draw: PaysageTanguy,  w: 140 },
  { id: 'mannequin',  label: "Le Mannequin métaphysique", ref: "d'après G. de Chirico · 1917",             draw: Mannequin,      w: 80  },
  { id: 'poupee',     label: "La Poupée articulée",      ref: "d'après H. Bellmer · 1934",                 draw: Poupee,         w: 90  },
  { id: 'merz',       label: "Ticket Merz",              ref: "d'après K. Schwitters · 1923",              draw: TicketMerz,     w: 120 },
]
