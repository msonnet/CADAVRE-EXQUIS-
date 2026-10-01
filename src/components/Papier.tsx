import type { CSSProperties, ReactNode } from 'react'
import { tranchesDuFeuillet } from '../lib/pli'
import type { Visibilite } from '../types'

/**
 * Le papier du jeu — les pièces dont sont faits le feuillet plié, le
 * feuillet en cours et la bande qu'on rabat.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * Le geste central — écrire sans voir, sur une feuille pliée — se jouait sur
 * un formulaire : une étiquette grammaticale en Bodoni de 2,4 rem, l'écho des
 * autres mains en citation de 17 px, une boîte à cadre d'accent arrondie. Le
 * projet avait pourtant déjà dessiné tout ce qu'il fallait (`FeuilletPlie`,
 * `Depli`), mais seulement pour la fin. Le pli n'apparaissait qu'au
 * dévoilement, jamais pendant le jeu.
 *
 * Ces pièces sont celles de `FeuilletPlie`, sorties de lui pour être posées
 * ailleurs : le cadavre écrit les emploie, le salon en ligne les emploiera.
 * Mêmes règles, et aucune autre — tranches d'un pixel, surface dérivée de
 * l'encre, ombre noire et très faible, aucune texture. Le piège d'un écran
 * « en papier », c'est le décor de papier : un grain, des ombres lourdes, un
 * bord déchiré. Une feuille se reconnaît à ses plis, pas à son grain.
 */

/**
 * La surface du papier : une teinte d'encre à peine posée.
 *
 * Dérivée de l'ENCRE et non d'une couleur fixe : sur les ambiances claires
 * elle assombrit d'un rien, sur les sombres — où l'encre est une crème —
 * elle éclaircit. Dans les deux cas la feuille se détache de son fond.
 */
export const surfacePapier = (encre: string) => `${encre}09`

/**
 * La pliure : un creux et une arête, un pixel chacun.
 *
 * Deux traits plutôt qu'un, parce qu'un seul trait noir disparaît sur les
 * ambiances sombres. `Depli` la pose en haut de chaque volet ; le feuillet en
 * cours la pose entre la lèvre du dernier pli et la bande qu'on écrit.
 */
export const PLIURE = 'linear-gradient(to bottom, rgba(0,0,0,0.26) 0 1px, rgba(255,255,255,0.34) 1px 2px)'
/** Ce qu'il reste de la pliure une fois le volet à plat. */
export const PLIURE_RESTE = 0.4

/**
 * L'ombre qu'un pli porte sur ce qui est dessous : serrée contre la pliure,
 * et très faible — la feuille est POSÉE, pas dressée.
 */
export const OMBRE_PLI = 'linear-gradient(to bottom, rgba(0,0,0,0.055), rgba(0,0,0,0) 70%)'

/**
 * Les tranches des épaisseurs pliées.
 *
 * `dessous` : celles d'un feuillet fermé, empilées sous la face du dessus —
 * la plus proche est la plus large et la plus marquée.
 *
 * `dessus` : celles d'un feuillet en cours, dont les bandes déjà écrites ont
 * été rabattues vers le haut. La plus récente touche la lèvre ; les plus
 * anciennes sont au loin, plus courtes et plus pâles. C'est la même pile,
 * vue de l'autre côté du pli.
 */
export function Tranches({ n, encre, sens = 'dessous' }: { n: number; encre: string; sens?: 'dessous' | 'dessus' }) {
  if (n <= 0) return null
  return (
    <div
      aria-hidden
      data-tranches={n}
      style={{
        position: 'relative', pointerEvents: 'none',
        display: 'flex', flexDirection: sens === 'dessus' ? 'column-reverse' : 'column',
      }}
    >
      {tranchesDuFeuillet(n).map((t, i) => (
        <div
          key={i}
          style={{
            height: 1,
            margin: sens === 'dessus' ? `0 ${t.retrait}px 2px` : `2px ${t.retrait}px 0`,
            background: encre,
            // Chaque épaisseur plus loin est plus pâle : ce dégradé fait la
            // profondeur à lui seul, sans une seule ombre portée.
            opacity: t.opacite,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  )
}

/**
 * La face d'un feuillet fermé, et ses tranches dessous.
 *
 * C'est le dessin de `FeuilletPlie` sans le bouton : l'écran de passage le
 * montre sans qu'on puisse le toucher — on passe le téléphone, on n'ouvre
 * rien.
 */
export function FaceFermee({ tranches, accent, encre, children, style }: {
  tranches: number
  accent: string
  encre: string
  children?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div data-feuillet-ferme={tranches} style={style}>
      <div style={{
        position: 'relative',
        background: surfacePapier(encre),
        // Un trait plein plutôt qu'une ombre portée : sur les ambiances
        // sombres une ombre ne se voit pas, un bord se voit toujours. Le
        // bord HAUT prend l'accent : c'est le seul bord d'une feuille pliée
        // qui ne soit pas un pli, et il mérite d'être nommé.
        border: `0.5px solid ${encre}22`,
        borderTop: `1.5px solid ${accent}55`,
        borderRadius: 2,
        padding: '18px 14px 16px',
      }}>
        {/* L'ombre du premier pli, serrée sous le bord bas de la face. */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 10,
          background: OMBRE_PLI, transform: 'scaleY(-1)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>{children}</div>
      </div>
      <Tranches n={tranches} encre={encre} />
    </div>
  )
}

/**
 * Le feuillet en cours : les bandes déjà rabattues au-dessus, la lèvre du
 * dernier pli, et la bande ouverte où la main écrit.
 *
 * `plis` vaut le nombre de cases déjà scellées — une tranche chacune. La
 * feuille s'épaissit donc acte après acte, sous les yeux, ce que rien ne
 * montrait : on ne savait pas, en écrivant le quatrième fragment, qu'on
 * écrivait sous trois plis.
 *
 * `levre` est ce que le dernier pli laisse dépasser. En aveugle il ne laisse
 * rien, et la lèvre n'est pas dessinée : le pli sans mot.
 */
export function Feuillet({ plis, encre, levre, children, style }: {
  plis: number
  encre: string
  levre?: ReactNode
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div data-feuillet={plis} style={{ position: 'relative', ...style }}>
      <Tranches n={plis} encre={encre} sens="dessus" />
      {plis > 0 && levre && (
        <div
          data-levre
          style={{
            background: surfacePapier(encre),
            border: `0.5px solid ${encre}22`,
            borderBottom: 'none',
            borderRadius: '2px 2px 0 0',
            padding: '10px 14px 12px',
          }}
        >
          {levre}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * La bande ouverte : la case où la main écrit.
 *
 * Une bande de papier libre, et non plus une boîte à cadre d'accent. Son
 * bord haut dit où l'on est dans la feuille : au premier acte c'est le haut
 * de la feuille, filet d'accent comme la face de `FeuilletPlie` ; ensuite
 * c'est une PLIURE — on écrit sous ce qui a été rabattu.
 */
export function Bande({ encre, accent, sousUnPli, children }: {
  encre: string
  accent: string
  sousUnPli: boolean
  children: ReactNode
}) {
  return (
    <div style={{
      position: 'relative',
      background: surfacePapier(encre),
      border: `0.5px solid ${encre}22`,
      borderTop: sousUnPli ? 'none' : `1.5px solid ${accent}55`,
      borderRadius: sousUnPli ? '0 0 2px 2px' : 2,
      padding: '14px 14px 12px',
    }}>
      {sousUnPli && (
        <>
          {/* L'ombre que le pli porte sur la bande, puis la pliure. */}
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 10,
            background: OMBRE_PLI, pointerEvents: 'none',
          }} />
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: PLIURE, opacity: 0.7, pointerEvents: 'none',
          }} />
        </>
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

/**
 * Ce que le pli laisse voir, composé.
 *
 * Le dernier mot est en vedette, en Bodoni d'accent — comme l'écho du poème
 * du jour, qui l'avait déjà fait. C'était une citation de 17 px sous un
 * libellé plus gros qu'elle : la seule trace des autres mains était la
 * chose la plus petite de l'écran.
 *
 * La case entière, elle, peut faire six mots : le même corps la ferait
 * déborder d'un écran de 320. Elle descend d'un cran et s'équilibre.
 */
export function EchoDuPli({ texte, visibilite, accent, id }: {
  texte: string
  visibilite: Visibilite
  accent: string
  id?: string
}) {
  const mot = visibilite === 'dernier-mot'
  return (
    <div
      id={id}
      data-echo
      className="font-fraunces font-black"
      style={{
        fontSize: mot ? 'clamp(2.2rem, 10vw, 3.2rem)' : 'clamp(1.45rem, 6.2vw, 2rem)',
        lineHeight: mot ? 1 : 1.12,
        color: accent,
        letterSpacing: '-0.01em',
        overflowWrap: 'anywhere',
        textWrap: 'balance',
      }}
    >
      {texte}
    </div>
  )
}
