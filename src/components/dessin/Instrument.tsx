import { useId } from 'react'
import type { OutilId } from '../../lib/trait/outils'

/**
 * Un instrument de la trousse, dessiné en volume — le niveau de Freeform,
 * l'habit du jeu : fût d'ivoire, viroles de laiton, acier poli. La partie qui
 * porte la COULEUR (mine, pointe, touffe, bague) prend celle de l'outil, si
 * bien qu'on voit d'un regard ce que chaque instrument va tracer.
 *
 * Le dessin fait 44 × 120 ; la trousse n'en montre que le haut, le reste
 * plonge sous son bord — comme des crayons debout dans un pot.
 */

interface Props { id: OutilId; couleur: string; chiffre: number }

export const LARGEUR_INSTRUMENT = 44
export const HAUTEUR_INSTRUMENT = 120

export default function Instrument({ id, couleur, chiffre }: Props) {
  const u = useId().replace(/:/g, '')
  const g = (n: string) => `url(#${n}${u})`
  const ivoire = g('iv'), laiton = g('la'), acier = g('ac'), bois = g('bo'), modele = g('mo')

  // Le modelé d'un cylindre : un reflet, deux ombres. Posé SUR une teinte unie,
  // il la rend ronde sans changer sa couleur.
  const teinte = (d: string) => (<><path d={d} fill={couleur} /><path d={d} fill={modele} /></>)
  const chiffreGrave = (y: number) => (
    <text x={22} y={y} textAnchor="middle" fontFamily="Raleway, sans-serif" fontWeight={600} fontSize={9} letterSpacing={0.4} fill="#7d7568">{chiffre}</text>
  )
  const fut = (y: number) => <rect x={9} y={y} width={26} height={HAUTEUR_INSTRUMENT - y} fill={ivoire} />
  const bague = (y: number, h = 3.2) => <rect x={9} y={y} width={26} height={h} fill={couleur} opacity={0.92} />

  let corps: JSX.Element
  switch (id) {
    case 'crayon':
      corps = (<>
        {fut(50)}
        {/* Le bois taillé, la peinture festonnée là où la lame l'a quittée. */}
        <path d="M9 50 L19.2 18 L24.8 18 L35 50 Z" fill={bois} />
        <path d="M9 50 Q11.2 46 13.4 50 Q15.6 46 17.8 50 Q20 46 22.2 50 Q24.4 46 26.6 50 Q28.8 46 31 50 Q33 46 35 50 Z" fill={ivoire} />
        {teinte('M19.2 18 L22 6 L24.8 18 Z')}
        {bague(94)}
        {chiffreGrave(112)}
      </>)
      break
    case 'stylo':
      corps = (<>
        {fut(48)}
        <path d="M13 48 L13 36 Q13 33 16 33 L28 33 Q31 33 31 36 L31 48 Z" fill={ivoire} />
        <rect x={20.6} y={13} width={2.8} height={20} fill={acier} />
        {teinte('M20.9 13 L21.3 6 L22.7 6 L23.1 13 Z')}
        <rect x={13} y={42} width={18} height={1.6} fill="#2a2520" opacity={0.85} />
        {bague(70, 2)}
        {chiffreGrave(112)}
      </>)
      break
    case 'plume':
      corps = (<>
        {fut(58)}
        <path d="M11 58 L13 48 L31 48 L33 58 Z" fill={ivoire} />
        <rect x={12.6} y={45.5} width={18.8} height={3} fill={laiton} />
        <path d="M13.5 46 C13.5 31 18 18 22 4 C26 18 30.5 31 30.5 46 Z" fill={acier} />
        <path d="M22 7 L22 30" stroke="#3c3c3c" strokeWidth={0.8} />
        <circle cx={22} cy={31} r={1.8} fill="#3c3c3c" />
        <path d="M16 40 Q22 36 28 40" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.8} fill="none" />
        {teinte('M20.6 8.5 L22 3.6 L23.4 8.5 Z')}
        <rect x={9} y={98} width={26} height={3.4} fill="#1d1a16" />
        {chiffreGrave(115)}
      </>)
      break
    case 'feutre':
      corps = (<>
        <path d={`M8 52 Q8 47 13 47 L31 47 Q36 47 36 52 L36 ${HAUTEUR_INSTRUMENT} L8 ${HAUTEUR_INSTRUMENT} Z`} fill={ivoire} />
        <path d="M13 47 L13 36 L31 36 L31 47 Z" fill={ivoire} />
        {/* La pointe biseautée, comme un surligneur. */}
        {teinte('M15 36 L15 17 Q15 15 17 14.3 L29 10 L29 36 Z')}
        <rect x={8} y={84} width={28} height={11} fill={couleur} opacity={0.9} />
        <rect x={8} y={84} width={28} height={11} fill={modele} />
        {chiffreGrave(110)}
      </>)
      break
    case 'aquarelle':
      corps = (<>
        <path d={`M15 66 L13.5 ${HAUTEUR_INSTRUMENT} L30.5 ${HAUTEUR_INSTRUMENT} L29 66 Z`} fill={ivoire} />
        <path d="M14 40 L30 40 L29 66 L15 66 Z" fill={laiton} />
        <path d="M14.3 48 L29.7 48 M14.6 56 L29.4 56" stroke="#6e4f1a" strokeOpacity={0.5} strokeWidth={0.7} />
        {/* La touffe, gorgée de couleur, avec le reflet de l'eau. */}
        {teinte('M15 40 C13.4 27 17.5 13 22 2.5 C26.5 13 30.6 27 29 40 Z')}
        <path d="M19.5 34 C19 25 20.5 16 22 9" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <rect x={14} y={90} width={16} height={3} fill={couleur} opacity={0.9} />
        {chiffreGrave(112)}
      </>)
      break
    case 'craie':
      corps = (<>
        {teinte('M13.5 36 L19.8 9.5 Q22 6.5 24.2 9.5 L30.5 36 Z')}
        {teinte('M13 34 L31 34 L31 50 L13 50 Z')}
        {/* L'étui de papier, deux bandes de la couleur. */}
        <rect x={12.4} y={48} width={19.2} height={HAUTEUR_INSTRUMENT - 48} fill={ivoire} />
        <rect x={12.4} y={78} width={19.2} height={6} fill={couleur} opacity={0.92} />
        <rect x={12.4} y={78} width={19.2} height={6} fill={modele} />
        {chiffreGrave(108)}
      </>)
      break
    case 'aero':
      corps = (<>
        {fut(60)}
        <path d="M14 60 L19.6 16 L24.4 16 L30 60 Z" fill={acier} />
        <rect x={21.2} y={8} width={1.6} height={8} fill="#5d5d5d" />
        {/* Le godet de peinture, en verre, à mi-hauteur. */}
        <ellipse cx={22} cy={45} rx={11} ry={6.5} fill={couleur} />
        <ellipse cx={22} cy={45} rx={11} ry={6.5} fill={modele} />
        <ellipse cx={19} cy={43} rx={4} ry={1.6} fill="#ffffff" opacity={0.55} />
        {bague(96)}
        {chiffreGrave(113)}
      </>)
      break
    case 'gomme':
      corps = (<>
        {fut(52)}
        <path d="M9 52 L9 22 Q9 16 15 16 L29 16 Q35 16 35 22 L35 52 Z" fill={g('ro')} />
        <rect x={9} y={50} width={26} height={2.5} fill="#000" opacity={0.08} />
        {chiffreGrave(112)}
      </>)
      break
  }

  return (
    <svg width={LARGEUR_INSTRUMENT} height={HAUTEUR_INSTRUMENT} viewBox={`0 0 ${LARGEUR_INSTRUMENT} ${HAUTEUR_INSTRUMENT}`} aria-hidden focusable="false" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`iv${u}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#d6ccba" /><stop offset="0.16" stopColor="#efe9dd" /><stop offset="0.4" stopColor="#fffdf8" />
          <stop offset="0.72" stopColor="#ece5d7" /><stop offset="1" stopColor="#c9bfac" />
        </linearGradient>
        <linearGradient id={`la${u}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7a5a1f" /><stop offset="0.3" stopColor="#dcbd6e" /><stop offset="0.48" stopColor="#f6e6ab" />
          <stop offset="0.75" stopColor="#b08a3b" /><stop offset="1" stopColor="#6c4e19" />
        </linearGradient>
        <linearGradient id={`ac${u}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#6a6a6a" /><stop offset="0.35" stopColor="#e6e6e6" /><stop offset="0.52" stopColor="#ffffff" />
          <stop offset="0.8" stopColor="#999999" /><stop offset="1" stopColor="#575757" />
        </linearGradient>
        <linearGradient id={`bo${u}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#b2834f" /><stop offset="0.42" stopColor="#efd0a4" /><stop offset="1" stopColor="#a47544" />
        </linearGradient>
        <linearGradient id={`ro${u}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#c98a87" /><stop offset="0.4" stopColor="#efb3ae" /><stop offset="1" stopColor="#bf7f7b" />
        </linearGradient>
        <linearGradient id={`mo${u}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.3} /><stop offset="0.3" stopColor="#fff" stopOpacity={0.12} />
          <stop offset="0.42" stopColor="#fff" stopOpacity={0.38} /><stop offset="0.62" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.32} />
        </linearGradient>
      </defs>
      {corps}
    </svg>
  )
}
