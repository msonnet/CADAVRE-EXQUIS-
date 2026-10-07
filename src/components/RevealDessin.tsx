import React, { useEffect, useMemo, useRef, useState } from 'react'
import { tr } from '../i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { partition, fraction, finDuBalayage, couturesRegulieres } from '../lib/devoilementDessin'
import { mono } from '../lib/typo'

interface Props {
  imageUrl: string
  /** La lecture surréaliste — `null` tant qu'elle n'est pas arrivée. */
  texte: string | null
  /** La lecture est-elle encore attendue ? Faux : elle n'aura pas lieu. */
  lectureAttendue: boolean
  /** Où tombent les coutures, en fractions de la hauteur du dessin. */
  coutures?: number[]
  nbBandes: number
  accent: string
  encre: string
  bg: string
  onTermine: () => void
}

const mouvementReduit = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Révélation plein écran du cadavre dessiné.
 *
 * ── Ce qui a changé ───────────────────────────────────────────────────────
 *
 * 1. Le dessin est ENTIER à l'écran. `objectFit: cover` le rognait : un
 *    dessin à quatre bandes est deux fois plus haut qu'un écran, et l'on
 *    perdait la tête ou les pieds — exactement ce qu'on venait découvrir.
 *    Il est désormais contenu, jamais coupé.
 * 2. Le balayage s'arrête sur les VRAIES coutures (`devoilementDessin.ts`)
 *    au lieu de trois tiers fixes.
 * 3. On n'attend plus la lecture. L'écran s'ouvrait après la réponse du
 *    modèle — jusqu'à vingt secondes devant « Le cadavre se reconstitue… »
 *    pour un dessin déjà assemblé. Le dessin se découvre tout de suite ; la
 *    lecture arrive quand elle arrive.
 * 4. La lecture ne recouvre plus le bas du dessin. Une fois découvert, le
 *    dessin remonte et se resserre ; la lecture prend la place libérée.
 */
export default function RevealDessin({
  imageUrl, texte, lectureAttendue, coutures, nbBandes, accent, encre, bg, onTermine,
}: Props) {
  const reduit = useMemo(mouvementReduit, [])
  const segs = useMemo(
    () => partition(coutures?.length ? coutures : couturesRegulieres(nbBandes)),
    [coutures, nbBandes],
  )
  const clipRef = useRef<HTMLImageElement>(null)
  const scanRef = useRef<HTMLDivElement>(null)
  const [decouvert, setDecouvert] = useState(reduit)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    if (reduit) {
      if (clipRef.current) clipRef.current.style.clipPath = 'none'
      const t = setTimeout(() => setHint(true), 1500)
      return () => clearTimeout(t)
    }
    const t0 = performance.now()
    const fin = finDuBalayage(segs)
    let raf = 0
    const tick = () => {
      const t = performance.now() - t0
      const { frac, balaye } = fraction(segs, t)
      if (clipRef.current) clipRef.current.style.clipPath = `inset(0 0 ${(1 - frac) * 100}% 0)`
      const img = clipRef.current
      if (scanRef.current && img) {
        scanRef.current.style.left = `${img.offsetLeft - 6}px`
        scanRef.current.style.width = `${img.offsetWidth + 12}px`
        scanRef.current.style.top = `${img.offsetTop + frac * img.offsetHeight}px`
        scanRef.current.style.opacity = balaye && frac < 1 ? '1' : '0'
      }
      if (t < fin + 50) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const t1 = setTimeout(() => setDecouvert(true), fin + 250)
    const t2 = setTimeout(() => setHint(true), fin + 2200)
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2) }
  }, [segs, reduit])

  // La place de la lecture ne se réserve que si elle viendra.
  const avecLecture = decouvert && (!!texte || lectureAttendue)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
      onClick={() => { if (decouvert) onTermine() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: bg, overflow: 'hidden',
        cursor: decouvert ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'var(--sa-top)', paddingBottom: 'var(--sa-bottom)',
      }}
    >
      {/* Le dessin, entier : il occupe l'écran, puis cède le bas à la lecture. */}
      <motion.div
        initial={false}
        animate={{ flexBasis: avecLecture ? '62%' : '100%' }}
        transition={{ duration: reduit ? 0 : 0.9, ease: [0.16, 0.84, 0.24, 1] }}
        style={{
          flexGrow: 0, flexShrink: 0, minHeight: 0, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '12px 12px 0',
        }}
      >
        <img
          ref={clipRef}
          src={imageUrl}
          alt={tr('Cadavre exquis dessiné', 'Drawn exquisite corpse')}
          style={{
            display: 'block', maxWidth: '100%', maxHeight: '100%',
            width: 'auto', height: 'auto', objectFit: 'contain',
            clipPath: reduit ? 'none' : 'inset(0 0 100% 0)',
            boxShadow: `0 1px 0 ${encre}14`,
          }}
        />
        {/* Ligne de balayage — elle court sur le dessin, pas sur l'écran :
            sa position se lit sur l'image elle-même, à chaque image. */}
        <div
          ref={scanRef}
          aria-hidden
          style={{
            position: 'absolute', left: 0, width: 0, top: 0, height: 2,
            background: accent, opacity: 0,
            boxShadow: `0 0 24px ${accent}66`,
            pointerEvents: 'none',
          }}
        />
      </motion.div>

      {/* La lecture, dans la place libérée. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '28px 28px 36px', textAlign: 'center' }}>
        <AnimatePresence mode="wait">
          {decouvert && texte ? (
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
              <div style={{
                fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                fontSize: 'clamp(1.05rem, 4.6vw, 1.35rem)', lineHeight: 1.55,
                color: encre, opacity: 0.92,
                display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              } as React.CSSProperties}>
                {tr('«', '“')} {texte.replace(/\n+/g, ' ').trim()} {tr('»', '”')}
              </div>
            </motion.div>
          ) : decouvert && lectureAttendue ? (
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
      </div>

      {/* Invitation à poursuivre */}
      {hint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 'calc(12px + var(--sa-bottom))',
            textAlign: 'center', ...mono, fontSize: 11,
            letterSpacing: '0.3em', color: encre, pointerEvents: 'none',
          }}
        >
          {tr('TOUCHER POUR CONTINUER', 'TAP TO CONTINUE')}
        </motion.div>
      )}
    </motion.div>
  )
}
