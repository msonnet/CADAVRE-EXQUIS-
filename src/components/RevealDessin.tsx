import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { tr } from '../i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { bornes, couturesRegulieres } from '../lib/devoilementDessin'
import { REGLAGES_DESSIN as D, lenteurDe, perspectiveDe, echelleEnsemble } from '../lib/paquet'
import { papierDuDessin } from '../lib/papier'
import { mono } from '../lib/typo'
import { garantirContraste } from '../reve'
import FeuillePliee from './FeuillePliee'

interface Props {
  imageUrl: string
  /** La lecture surréaliste — `null` tant qu'elle n'est pas arrivée. */
  texte: string | null
  /** La lecture est-elle encore attendue ? Faux : elle n'aura pas lieu. */
  lectureAttendue: boolean
  /** Où tombent les coutures, en fractions de la hauteur du dessin. */
  coutures?: number[]
  nbBandes: number
  /** Le nom de chaque main, dans le coin de sa bande : « TÊTE — NADJA ». */
  mains?: string[]
  /** Le bas de la feuille : « CADAVRE DESSINÉ · 2 MAINS · 11 NOVEMBRE 2026 ». */
  pied: string
  accent: string
  encre: string
  bg: string
  onTermine: () => void
  /** Un pli s'est posé sur la table — la vibration. */
  onPliPose?: () => void
}

const mouvementReduit = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * La couleur du papier sur lequel on a dessiné, lue sur le dessin même : une
 * bande de pixels tout en bas, la marge que l'assemblage laisse sous le
 * dernier trait. La médiane, pour qu'un trait qui la traverse ne compte pas.
 */
function couleurDuPapier(img: HTMLImageElement): string {
  try {
    const l = img.naturalWidth, h = img.naturalHeight
    const c = document.createElement('canvas')
    c.width = 64; c.height = 4
    const g = c.getContext('2d')
    if (!g || !l || !h) return '#fdf8f2'
    g.drawImage(img, 0, Math.max(0, h - 6), l, 4, 0, 0, 64, 4)
    const px = g.getImageData(0, 0, 64, 4).data
    const canal = (k: number) => {
      const v: number[] = []
      for (let i = k; i < px.length; i += 4) v.push(px[i])
      v.sort((a, b) => a - b)
      return v[v.length >> 1]
    }
    return '#' + [0, 1, 2].map(k => canal(k).toString(16).padStart(2, '0')).join('')
  } catch {
    return '#fdf8f2'
  }
}

/**
 * Révélation plein écran du cadavre dessiné — le dessin arrive PLIÉ.
 *
 * Plan « moderne », points 1 et 4, maquette validée par l'auteur le
 * 11 novembre (`scripts/temoins/dessin-3d/maquette.html`) : le geste du
 * poème (`FeuillePliee`, `lib/paquet.ts`), sur le dessin. On ne voit d'abord
 * que le dos du papier ; tiré vers soi, chaque pli se dresse et retombe sous
 * son poids en découvrant la bande d'une main, son nom déjà écrit dans le
 * coin. Le BAS de la feuille replie les jambes : trois mains, trois plis,
 * trois découvertes. La feuille prend toute la largeur et la vue la suit ;
 * une fois tout ouvert, elle reste un instant sur les jambes, puis recule
 * sur le dessin entier, et la lecture arrive dessous. Aucun son.
 *
 * Ce qui tient de l'ancienne révélation : le dessin entier n'est jamais
 * rogné une fois découvert ; on n'attend pas la lecture pour le montrer ;
 * elle arrive quand elle arrive, entière, et prend la place que le dessin lui
 * cède. Un appui à côté du paquet, ou pendant que les plis tombent, ou une
 * touche, pose le dessin entier d'un coup ; mouvement réduit, rien à
 * déplier.
 */
export default function RevealDessin({
  imageUrl, texte, lectureAttendue, coutures, nbBandes, mains, pied, accent, encre, bg, onTermine, onPliPose,
}: Props) {
  const reduit = useMemo(mouvementReduit, [])
  const zone = useRef<HTMLDivElement>(null)
  const boite = useRef<HTMLDivElement>(null)
  const [image, setImage] = useState<{ l: number; h: number; papier: string } | null>(null)
  const [vue, setVue] = useState<{ W: number; VH: number; haut: number } | null>(null)
  // Posé d'avance (mouvement réduit) ou abrégé : pas de paquet.
  const [pose, setPose] = useState(reduit)
  // Tous les plis sont ouverts ; puis la vue a reculé sur le dessin entier.
  const [ouvert, setOuvert] = useState(reduit)
  const [ensemble, setEnsemble] = useState(reduit)
  const [hint, setHint] = useState(false)
  // L'appui qui abrège ne doit pas, dans la foulée, quitter la révélation.
  const abregeA = useRef(0)
  const instant = useRef(reduit)

  // L'image : sa taille, et la couleur de son papier.
  useEffect(() => {
    let vivant = true
    const img = new Image()
    img.onload = () => { if (vivant) setImage({ l: img.naturalWidth, h: img.naturalHeight, papier: couleurDuPapier(img) }) }
    img.src = imageUrl
    return () => { vivant = false }
  }, [imageUrl])

  // L'écran : la feuille prend toute la largeur, jusqu'à 460 px.
  useLayoutEffect(() => {
    const mesurer = () => {
      const z = zone.current
      if (!z) return
      const cs = getComputedStyle(z)
      const pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0
      setVue({ W: Math.floor(Math.min(z.clientWidth - 32, D.largeurMax)), VH: z.clientHeight - pt - pb, haut: pt })
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [])

  // Les bandes, à la hauteur où elles se montrent : les coutures de l'assemblage.
  const geo = useMemo(() => {
    if (!image || !vue || !image.l) return null
    const b = bornes(coutures?.length ? coutures : couturesRegulieres(nbBandes))
    const H = vue.W * image.h / image.l
    const hs = b.slice(1).map((f, i) => (f - b[i]) * H)
    const moyenne = H / hs.length
    // Le bas de la feuille est une marge : assez pour sa ligne, pas plus.
    const hPied = Math.round(Math.max(64, moyenne * 0.22))
    return { b, H, hs, hPied, total: H + hPied, lenteur: lenteurDe(moyenne), perspective: perspectiveDe(vue.W) }
  }, [image, vue, coutures, nbBandes])

  const papier = useMemo(() => papierDuDessin(image?.papier ?? '#fdf8f2', bg), [image, bg])
  const avecLecture = !!texte || lectureAttendue
  const echelle = geo && vue ? echelleEnsemble(vue.VH, geo.total, avecLecture) : 1

  // Ouvert : on regarde les jambes un instant, puis la vue recule sur le dessin entier.
  useEffect(() => {
    const el = boite.current
    if (!ouvert || ensemble || !el || !geo) return
    const t1 = window.setTimeout(() => {
      el.style.transition = `transform ${D.recul}ms cubic-bezier(0.45, 0, 0.2, 1)`
      el.style.transform = `translate3d(0px,0px,0px) scale(${echelle.toFixed(4)})`
    }, D.attenteJambes)
    const t2 = window.setTimeout(() => setEnsemble(true), D.attenteJambes + D.recul)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [ouvert, ensemble, geo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Le dessin entier, à sa place : d'emblée si l'on a abrégé, en douceur si
  // la lecture change la place qu'il lui faut.
  useEffect(() => {
    const el = boite.current
    if (!ensemble || !el) return
    el.style.transition = instant.current ? 'none' : 'transform 0.9s cubic-bezier(0.16, 0.84, 0.24, 1)'
    el.style.transform = `translate3d(0px,0px,0px) scale(${echelle.toFixed(4)})`
    instant.current = false
  }, [ensemble, echelle])

  useEffect(() => {
    if (!ensemble) return
    const t = window.setTimeout(() => setHint(true), reduit ? 1500 : 2000)
    return () => clearTimeout(t)
  }, [ensemble, reduit])

  const abreger = () => {
    abregeA.current = performance.now()
    instant.current = true
    setPose(true); setOuvert(true); setEnsemble(true)
  }

  // Le nom des mains est écrit SUR le papier : l'accent de l'ambiance, ramené
  // au contraste du papier (un accent de nuit, pâle, s'y lisait à peine).
  const encreMain = garantirContraste(accent, papier.couleur, 4.5)
  const encrePied = papier.sombre ? 'rgba(232,228,220,0.72)' : '#5a5040'
  const filetPied = papier.sombre ? 'rgba(232,228,220,0.2)' : 'rgba(58,44,24,0.2)'

  const bandes = geo ? [
    ...geo.hs.map((h, i) => (
      <div key={i} style={{ position: 'relative', height: h, overflow: 'hidden' }}>
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          style={{ position: 'absolute', left: 0, top: -geo.b[i] * geo.H, width: '100%', maxWidth: 'none', height: geo.H, display: 'block' }}
        />
        {mains?.[i] && (
          <span style={{
            position: 'absolute', left: 10, top: 10, zIndex: 3,
            ...mono, fontSize: 10, letterSpacing: '0.16em', color: encreMain,
            background: `${papier.couleur}e0`, padding: '3px 6px', borderRadius: 2, whiteSpace: 'nowrap',
          }}>
            {mains[i]}
          </span>
        )}
      </div>
    )),
    <div key="pied" style={{ height: geo.hPied }}>
      <div style={{ margin: '0 14px', paddingTop: 12, borderTop: `0.5px solid ${filetPied}`, ...mono, fontSize: 11, color: encrePied }}>
        {pied}
      </div>
    </div>,
  ] : []

  const etiquette = tr('Cadavre exquis dessiné', 'Drawn exquisite corpse') + (mains?.length ? ` — ${mains.join(', ')}` : '')
  const hautLecture = geo && vue ? vue.haut + geo.total * echelle + 26 : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
      onClick={() => {
        if (performance.now() - abregeA.current < 450) return
        if (ensemble) onTermine()
        // Pendant que la vue recule : le dessin entier, tout de suite.
        else if (ouvert) { instant.current = true; setEnsemble(true) }
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: bg, overflow: 'hidden',
        cursor: ensemble ? 'pointer' : 'default',
      }}
    >
      <div
        ref={zone}
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 'calc(14px + var(--sa-top))', paddingBottom: 'var(--sa-bottom)',
        }}
      >
        {geo && vue && (
          <div
            ref={boite}
            role="img"
            aria-label={etiquette}
            style={{ width: vue.W, flexShrink: 0, transformOrigin: '50% 0', willChange: 'transform' }}
          >
            <FeuillePliee
              key={pose ? 'pose' : 'paquet'}
              bandes={bandes}
              papier={papier}
              bord={0}
              encre={encre}
              pose={pose}
              dessin={{ lenteur: geo.lenteur, perspective: geo.perspective, hauteurVue: vue.VH, boite }}
              onOuvert={() => setOuvert(true)}
              onSauter={abreger}
              onPliPose={onPliPose}
              invite={tr('— TIRER POUR DÉPLIER —', '— PULL TO UNFOLD —')}
            />
          </div>
        )}
      </div>

      {/* La lecture, sous le dessin entier ; puis l'invitation à poursuivre. */}
      <div style={{
        position: 'absolute', left: 28, right: 28, top: hautLecture,
        bottom: 'calc(12px + var(--sa-bottom))', overflowY: 'auto', textAlign: 'center',
        pointerEvents: ensemble ? 'auto' : 'none',
        transition: reduit ? undefined : 'top 0.9s cubic-bezier(0.16, 0.84, 0.24, 1)',
      }}>
        <AnimatePresence mode="wait">
          {ensemble && texte ? (
            <motion.div
              key="lecture"
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduit ? 0 : 0.7 }}
            >
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 12 }}>
                {tr('— LECTURE —', '— READING —')}
              </div>
              {/* Entière, jamais coupée : quatre lignes au plus tronquaient
                  une lecture de trois vers sur « qu'ils… ». Le corps baisse
                  d'un cran quand elle est longue, et la place défile en dernier
                  recours plutôt que de rogner le texte. */}
              <div style={{
                fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                fontSize: texte.length > 110 ? 'clamp(0.95rem, 4.1vw, 1.2rem)' : 'clamp(1.05rem, 4.6vw, 1.35rem)',
                lineHeight: 1.5,
                color: encre, opacity: 0.92,
              }}>
                {tr('«', '“')} {texte.replace(/\n+/g, ' ').trim()} {tr('»', '”')}
              </div>
            </motion.div>
          ) : ensemble && lectureAttendue ? (
            <motion.div
              key="attente"
              initial={{ opacity: 0 }}
              animate={{ opacity: reduit ? 0.6 : [0.3, 0.7, 0.3] }}
              // La sortie a sa propre durée. Elle héritait de la pulsation
              // (`repeat: Infinity`) : sous `mode="wait"`, une sortie qui ne
              // finit jamais retient la suivante, et la lecture arrivée après
              // l'attente — le cas ordinaire, le modèle met plusieurs
              // secondes — ne s'affichait jamais sur la révélation.
              exit={{ opacity: 0, transition: { duration: reduit ? 0 : 0.25 } }}
              transition={reduit ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ ...mono, fontSize: 12, letterSpacing: '0.24em', color: encre }}
            >
              {tr('— LA LECTURE SE FAIT —', '— THE READING IS UNDER WAY —')}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Sous la lecture, jamais dessus : à une hauteur fixe, il la
            chevauchait sur un petit écran. */}
        {hint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ marginTop: 34, ...mono, fontSize: 11, letterSpacing: '0.3em', color: encre, pointerEvents: 'none' }}
          >
            {tr('TOUCHER POUR CONTINUER', 'TAP TO CONTINUE')}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
