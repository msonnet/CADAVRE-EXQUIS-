/**
 * Papier.tsx — socle partagé de la direction artistique « collage de papier » :
 * tout élément (carte, étiquette) a l'air d'un vrai bout de papier découpé ou
 * arraché à la main et collé sur la page, légèrement pivoté, avec son grain et
 * son ombre propres.
 *
 * Le papier n'est plus une teinte unique : chaque ambiance du Rêve a son propre
 * bout de papier (teinte + encre assortie). Utilise `usePapier()` pour récupérer
 * celui de la séance courante, et passe `papierBg` à <PapierCard>.
 */
import { useReve } from '../reve'
import type { AmbianceKey } from '../reve/pools'

// Papier crème historique — sert de repli quand aucune séance n'est active.
export const PAPIER = '#f6ead0'
export const ENCRE_PAPIER = '#241a10'

// Un papier par ambiance — teinte + encre assortie, lisible quel que soit l'accent.
export const PAPIERS_AMBIANCE: Record<AmbianceKey, { bg: string; encre: string }> = {
  minuit: { bg: '#d6d2f5', encre: '#1a1535' }, // lavande vive — papier à lettres mauve
  encre:  { bg: '#f2c8a8', encre: '#2a1208' }, // terre de rose — chaud, saturé
  argile: { bg: '#ecc24e', encre: '#200a04' }, // ambre vif — kraft doré
  lin:    { bg: '#f6ead0', encre: '#241a10' }, // crème — ancre neutre chaude
  aube:   { bg: '#c6e6da', encre: '#0c2428' }, // menthe vive — bleu-vert froid
}

/**
 * Le papier de la séance courante (teinte + encre). Repli sur le vergé crème
 * historique hors d'un ReveProvider.
 */
export function usePapier(): { bg: string; encre: string } {
  const seance = useReve()
  const key = seance?.ambiance.id
  return key ? PAPIERS_AMBIANCE[key] : { bg: PAPIER, encre: ENCRE_PAPIER }
}

export function makePapierTexture(bg: string, _variant = 0): React.CSSProperties {
  return { backgroundColor: bg }
}

export const PAPIER_TEXTURE: React.CSSProperties = makePapierTexture(PAPIER)

// Bords arrachés à la main, MAIS uniquement en haut et en bas : les côtés
// gauche et droit restent parfaitement droits (x = 0 % et x = 100 %), comme une
// feuille coupée net sur les flancs et déchirée seulement aux extrémités.
// Le haut et le bas gardent une amplitude forte, chaque bord son propre rythme.
export const DECHIRE_1 = 'polygon(' +
  // haut, de gauche à droite (premier et dernier points calés sur les flancs)
  '0% 5%, 9% 1%, 18% 7%, 27% 2%, 36% 6%, 45% 0%, 55% 5%, 64% 1%, 73% 7%, 82% 2%, 91% 6%, 100% 3%, ' +
  // côté droit : droit
  '100% 95%, ' +
  // bas, de droite à gauche ; côté gauche : retour droit vers 0% 5%
  '91% 99%, 82% 95%, 73% 100%, 64% 96%, 55% 100%, 45% 95%, 36% 100%, 27% 96%, 18% 100%, 9% 95%, 0% 98%' +
  ')'
export const DECHIRE_2 = 'polygon(' +
  '0% 3%, 8% 6%, 16% 0%, 25% 5%, 33% 1%, 42% 7%, 50% 2%, 59% 6%, 67% 0%, 76% 5%, 84% 1%, 92% 7%, 100% 4%, ' +
  '100% 96%, ' +
  '92% 100%, 84% 96%, 75% 100%, 66% 95%, 58% 100%, 49% 96%, 40% 100%, 31% 95%, 22% 100%, 13% 96%, 4% 100%, 0% 95%' +
  ')'
// 3 — Déchirure sauvage : grandes dents irrégulières et très marquées
export const DECHIRE_3 = 'polygon(' +
  '0% 8%, 6% 0%, 15% 10%, 21% 2%, 30% 12%, 38% 1%, 48% 9%, 57% 0%, 68% 11%, 77% 3%, 86% 13%, 93% 2%, 100% 7%, ' +
  '100% 93%, ' +
  '94% 100%, 83% 90%, 74% 99%, 63% 92%, 52% 100%, 41% 91%, 32% 98%, 22% 90%, 11% 99%, 4% 91%, 0% 97%' +
  ')'
// 4 — Ondulations larges : découpe très douce, presque découpée aux ciseaux
export const DECHIRE_4 = 'polygon(' +
  '0% 3%, 10% 1%, 20% 4%, 30% 1%, 40% 4%, 50% 1%, 60% 4%, 70% 1%, 80% 4%, 90% 1%, 100% 3%, ' +
  '100% 97%, ' +
  '90% 100%, 80% 97%, 70% 100%, 60% 97%, 50% 100%, 40% 97%, 30% 100%, 20% 97%, 10% 100%, 0% 97%' +
  ')'
// 5 — Seul le haut est arraché, bas parfaitement droit (note collée)
export const DECHIRE_5 = 'polygon(' +
  '0% 5%, 9% 0%, 19% 6%, 28% 1%, 37% 7%, 46% 0%, 56% 6%, 65% 1%, 74% 8%, 83% 1%, 92% 6%, 100% 3%, ' +
  '100% 100%, ' +
  '0% 100%' +
  ')'
// 6 — Asymétrique : haut très accidenté, bas discret
export const DECHIRE_6 = 'polygon(' +
  '0% 6%, 7% 0%, 14% 8%, 22% 1%, 31% 9%, 40% 2%, 49% 11%, 58% 1%, 67% 7%, 76% 0%, 85% 8%, 92% 1%, 100% 5%, ' +
  '100% 97%, ' +
  '91% 100%, 80% 97%, 69% 100%, 58% 98%, 45% 100%, 34% 97%, 22% 100%, 11% 97%, 0% 99%' +
  ')'

export type Bord = 'net' | 'dechire1' | 'dechire2' | 'dechire3' | 'dechire4' | 'dechire5' | 'dechire6'

const BORD_STYLE: Record<Bord, React.CSSProperties> = {
  net:      { borderRadius: 4 },
  dechire1: { clipPath: DECHIRE_1 },
  dechire2: { clipPath: DECHIRE_2 },
  dechire3: { clipPath: DECHIRE_3 },
  dechire4: { clipPath: DECHIRE_4 },
  dechire5: { clipPath: DECHIRE_5 },
  dechire6: { clipPath: DECHIRE_6 },
}

export function bordAleatoire(_n: number): Bord {
  return 'net'
}

type PapierCardProps = {
  rotation?: number
  bord?: Bord
  bordure?: string
  /** Override de la couleur de fond — utilise makePapierTexture() */
  papierBg?: string
  /** Variante de lustre 0–3 (diagonal doux, kraft, vélin, journal) */
  textureVariant?: number
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  'aria-hidden'?: boolean
}

export function PapierCard({
  rotation = 0, bord = 'net', bordure = 'rgba(0,0,0,0.18)', papierBg, textureVariant = 0, children, className, style, ...rest
}: PapierCardProps) {
  const texture = papierBg ? makePapierTexture(papierBg, textureVariant) : makePapierTexture(PAPIER, textureVariant)
  return (
    <div
      className={className}
      {...rest}
      style={{
        ...texture,
        border: `1px solid ${bordure}`,
        boxShadow: '0 3px 11px rgba(0,0,0,0.3)',
        transform: `rotate(${rotation}deg)`,
        ...BORD_STYLE[bord],
        ...style,
      }}
    >
      {children}
    </div>
  )
}

type EtiquetteProps = {
  children: React.ReactNode
  bg: string
  color: string
  rotation?: number
  style?: React.CSSProperties
}

export function Etiquette({ children, bg, color, rotation = 0, style }: EtiquetteProps) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: "'Raleway', sans-serif", fontWeight: 800, lineHeight: 1.1,
      fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      color, background: bg, padding: '4px 11px', borderRadius: 2,
      transform: `rotate(${rotation}deg)`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
      ...style,
    }}>
      {children}
    </span>
  )
}

/**
 * Section — intitulé de rubrique = étiquette d'accent collée (même grammaire de
 * collage que l'accueil et la config solo), à la place des anciens « — TITRE — »
 * en filet typographique. Partagé par toutes les pages refondues.
 */
export function Section({ children, accent, color, style }: {
  children: React.ReactNode; accent: string; color: string; style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <Etiquette bg={accent} color={color} rotation={-1.4} style={{ fontSize: 11, letterSpacing: '0.14em' }}>
        {children}
      </Etiquette>
    </div>
  )
}
