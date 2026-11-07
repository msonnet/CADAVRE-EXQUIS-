/**
 * Une animation Lottie, aux couleurs de la séance.
 *
 * Cahier des charges : `docs/chantier-effectcraft.md`. Les calculs (couleurs
 * repères, segments, image de pose) vivent dans `src/lib/animation.ts`, où
 * les mesures les lisent ; ce fichier ne fait que les mettre à l'écran.
 *
 * ── Ce qui ne coûte rien à l'accueil ──────────────────────────────────────
 *
 * Le lecteur est `lottie_light` — rendu SVG, sans expressions, 46 Ko
 * compressés — et il n'est importé qu'au PREMIER affichage d'une animation.
 * Le JSON de chaque animation n'est téléchargé qu'une fois, puis partagé par
 * toutes les instances (le service worker le précache pour le hors-ligne).
 *
 * ── Jamais un trou ────────────────────────────────────────────────────────
 *
 * Tant que le lecteur et le fichier ne sont pas là — ou s'ils n'arrivent
 * jamais : réseau coupé, fichier absent —, c'est le `repli` qui s'affiche,
 * l'étoile d'aujourd'hui par défaut. Une attente reste toujours signalée.
 *
 * ── Mouvement réduit ──────────────────────────────────────────────────────
 *
 * L'animation s'arrête sur son repère `pose` : une image fixe, qui dit la
 * même chose sans bouger. Une animation qui devait finir (`onFin`) montre sa
 * pose un instant, puis rend la main.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { AnimationItem, LottiePlayer } from 'lottie-web'
import { useReve } from '../reve'
import {
  recolorer, segmentAJouer, imagePose, proportions,
  type CouleursSeance,
} from '../lib/animation'

/** Sous mouvement réduit, le temps qu'une animation à fin reste posée. */
export const POSE_REDUITE_MS = 300

/* ── Les chargements, partagés par toutes les instances ─────────────────── */

let lecteur: Promise<LottiePlayer> | null = null

function chargerLecteur(): Promise<LottiePlayer> {
  if (!lecteur) {
    lecteur = import('lottie-web/build/player/lottie_light').then(m => m.default)
    // Un échec ne se met pas en cache : la prochaine animation réessaiera.
    lecteur.catch(() => { lecteur = null })
  }
  return lecteur
}

const fichiers = new Map<string, Promise<unknown>>()

function chargerDonnees(nom: string): Promise<unknown> {
  let p = fichiers.get(nom)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}animations/${nom}.json`).then(r => {
      if (!r.ok) throw new Error(`animation « ${nom} » : ${r.status}`)
      return r.json()
    })
    p.catch(() => { fichiers.delete(nom) })
    fichiers.set(nom, p)
  }
  return p
}

const mouvementReduit = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ── Le composant ───────────────────────────────────────────────────────── */

export interface PropsAnimation {
  /** Le fichier de `public/animations/`, sans `.json`. */
  nom: string
  /** Rejouer sans fin le repère `boucle` (ou le `segment` donné). */
  boucle?: boolean
  /** Un repère de composition à jouer (`noeud`, `remplir`…) plutôt que le tout. */
  segment?: string
  /** La hauteur, en pixels. */
  taille: number
  /**
   * La largeur, en pixels. À donner quand on la connaît (couture : 3 × la
   * hauteur) : sinon elle se déduit du fichier une fois chargé, et la place
   * change d'un coup quand le repli cède.
   */
  largeur?: number
  /** Appelé quand l'animation (non bouclée) est allée au bout. */
  onFin?: () => void
  /** Ce qui s'affiche pendant le chargement ou en cas d'échec. */
  repli?: ReactNode
  /**
   * Le nom donné au lecteur d'écran quand l'animation est seule
   * (« Chargement… »). Sans étiquette, elle est masquée : un texte voisin dit
   * déjà ce qui se passe.
   */
  etiquette?: string
  /** Remplacer une couleur de la séance (un bouton : encre = texte du bouton). */
  couleurs?: Partial<CouleursSeance>
  /** Garder les couleurs du fichier — l'Œil de l'ouverture, qui est la marque. */
  couleursPropres?: boolean
  className?: string
  style?: CSSProperties
}

type Etat = 'chargement' | 'pret' | 'echec'

export default function Animation({
  nom, boucle = false, segment, taille, largeur, onFin, repli, etiquette,
  couleurs, couleursPropres = false, className, style,
}: PropsAnimation) {
  const seance = useReve()
  const scene = useRef<HTMLSpanElement>(null)
  const [etat, setEtat] = useState<Etat>('chargement')
  const [ratio, setRatio] = useState<number | null>(null)
  const [reduit] = useState(mouvementReduit)

  // `onFin` change à chaque rendu du parent : le relire au moment voulu,
  // sans relancer l'animation pour autant.
  const finRef = useRef(onFin)
  finRef.current = onFin

  const c = seance?.colorSchema
  const teintes: CouleursSeance = {
    accent: couleurs?.accent ?? c?.hex ?? '#b22c20',
    encre: couleurs?.encre ?? c?.encre ?? '#e8d4b8',
    papier: couleurs?.papier ?? c?.bg ?? '#0f0805',
  }
  const cleTeintes = `${teintes.accent}|${teintes.encre}|${teintes.papier}`

  useEffect(() => {
    let annule = false
    let anim: AnimationItem | null = null
    // Vrai entre le départ du segment et sa fin : seule une animation qui
    // joue se met en pause quand la page se cache, et reprend ensuite.
    let enMarche = false
    let minuteur: ReturnType<typeof setTimeout> | undefined
    setEtat('chargement')

    const surVisibilite = () => {
      if (!anim || !enMarche) return
      if (document.hidden) anim.pause()
      else anim.play()
    }

    Promise.all([chargerLecteur(), chargerDonnees(nom)]).then(([lottie, brut]) => {
      const hote = scene.current
      if (annule || !hote) return
      const donnees = couleursPropres ? structuredClone(brut) : recolorer(brut, teintes)
      const seg = segmentAJouer(donnees, { segment, boucle })
      const item = lottie.loadAnimation({
        container: hote,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData: donnees,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      })
      anim = item

      const demarrer = () => {
        if (annule) return
        setRatio(proportions(donnees))
        setEtat('pret')
        if (reduit) {
          item.goToAndStop(imagePose(donnees, seg), true)
          if (!boucle) minuteur = setTimeout(() => finRef.current?.(), POSE_REDUITE_MS)
          return
        }
        item.loop = boucle
        if (!boucle) item.addEventListener('complete', () => { enMarche = false; finRef.current?.() })
        enMarche = true
        item.playSegments([seg.debut, seg.fin], true)
        if (document.hidden) item.pause()
      }

      item.addEventListener('data_failed', () => { if (!annule) setEtat('echec') })
      // Avec des données déjà en main, `lottie` finit souvent de monter la
      // scène PENDANT `loadAnimation` : l'événement est déjà passé.
      if (item.isLoaded) demarrer()
      else item.addEventListener('DOMLoaded', demarrer)
    }).catch(() => { if (!annule) setEtat('echec') })

    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      annule = true
      clearTimeout(minuteur)
      document.removeEventListener('visibilitychange', surVisibilite)
      anim?.destroy()
    }
    // `teintes` est résumé par `cleTeintes` : un nouvel objet à chaque rendu
    // ne doit pas relancer l'animation, une nouvelle ambiance si.
  }, [nom, segment, boucle, reduit, couleursPropres, cleTeintes])

  const l = largeur ?? (ratio ? Math.round(taille * ratio) : undefined)
  const accessible = etiquette
    ? { role: 'img' as const, 'aria-label': etiquette }
    : { 'aria-hidden': true as const }

  return (
    <span
      {...accessible}
      data-animation={nom}
      data-etat={etat}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: taille, width: l, minWidth: l ? undefined : taille,
        lineHeight: 1, flexShrink: 0,
        ...style,
      }}
    >
      {etat !== 'pret' && (repli ?? (
        <span style={{ fontSize: Math.round(taille * 0.75), color: teintes.accent, userSelect: 'none' }}>✦</span>
      ))}
      <span
        ref={scene}
        style={{
          position: 'absolute', inset: 0,
          visibility: etat === 'pret' ? 'visible' : 'hidden',
        }}
      />
    </span>
  )
}
