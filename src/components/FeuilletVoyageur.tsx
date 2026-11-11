import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { feuilletA, VOYAGE, type Rect } from '../lib/voyage'
import { mono } from '../lib/typo'

interface Props {
  /** La ligne touchée, à l'écran. */
  de: Rect
  /** Le retrait du texte dans la ligne (la vignette de l'illustration le décale). */
  retrait?: number
  titre: string
  meta: string
  /** `performance.now()` au toucher. */
  depart: number
  /** ms — jusqu'où il joue ; arrivé là, `onFin`. */
  jusqua: number
  /** La place de la feuille à l'écran ; `null` tant qu'elle n'y est pas. */
  vers?: () => Rect | null
  /** La feuille, recopiée dans le feuillet quand elle y apparaît. */
  feuille?: () => HTMLElement | null
  /** À chaque image, l'instant du voyage : la page règle ce qui l'entoure. */
  onInstant?: (t: number) => void
  onFin?: () => void
  papier: string
  grain?: string
  sombre: boolean
  encre: string
}

const OMBRE_CLAIR = '0 2px 3px rgba(60,40,10,0.14), 0 14px 22px -6px rgba(60,40,10,0.22)'
const OMBRE_SOMBRE = '0 0 0 0.5px rgba(255,240,210,0.18), 0 16px 24px -4px rgba(0,0,0,0.6)'

/**
 * Le feuillet qui voyage du recueil à la page du poème (`lib/voyage.ts`).
 *
 * Posé au-dessus de tout (un portail : un parent qui bouge ne l'emporte pas),
 * il ne reçoit aucun appui et le lecteur d'écran l'ignore — ce n'est qu'une
 * image du mouvement ; la page, dessous, est la vraie. Un appui pendant le
 * voyage le termine.
 */
export default function FeuilletVoyageur(props: Props) {
  const racine = useRef<HTMLDivElement>(null)
  const fond = useRef<HTMLDivElement>(null)
  const ligne = useRef<HTMLDivElement>(null)
  const tete = useRef<HTMLDivElement>(null)
  const rappels = useRef(props)
  rappels.current = props

  useEffect(() => {
    let raf = 0, recopiee = false, abrege = false
    const image = () => {
      raf = 0
      const r = rappels.current
      const t = abrege ? r.jusqua : Math.min(r.jusqua, performance.now() - r.depart)
      const vers = r.vers?.() ?? null
      const f = feuilletA(t, r.de, vers)
      const el = racine.current
      if (el) {
        // Arrivé, la vraie feuille prend sa place.
        el.style.display = vers && t >= VOYAGE.arrivee ? 'none' : 'block'
        el.style.width = `${f.w.toFixed(2)}px`
        el.style.height = `${f.h.toFixed(2)}px`
        el.style.transform = `translate3d(${f.x.toFixed(2)}px,${f.y.toFixed(2)}px,0) scale(${f.echelle.toFixed(4)})`
      }
      if (fond.current) fond.current.style.opacity = String(f.papier)
      if (ligne.current) ligne.current.style.opacity = String(f.ligne)
      if (tete.current) {
        tete.current.style.opacity = String(f.feuille)
        // La feuille entière, déjà dépliée, recopiée à sa largeur finale : le
        // feuillet la découvre en grandissant.
        if (!recopiee && vers && f.feuille > 0) {
          const source = r.feuille?.()
          if (source) {
            const copie = source.cloneNode(true) as HTMLElement
            copie.removeAttribute('id')
            copie.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
            copie.style.visibility = 'visible'
            copie.style.width = `${vers.w}px`
            tete.current.replaceChildren(copie)
            recopiee = true
          }
        }
      }
      r.onInstant?.(t)
      if (t >= r.jusqua) { r.onFin?.(); return }
      raf = requestAnimationFrame(image)
    }
    // Un appui pendant le mouvement le termine.
    const abreger = () => { abrege = true; if (!raf) image() }
    window.addEventListener('pointerdown', abreger, { capture: true })
    image()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', abreger, { capture: true })
    }
  }, [])

  const { retrait = 12, titre, meta, papier, grain, sombre, encre } = props
  const couche: React.CSSProperties = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }
  return createPortal(
    <div
      ref={racine}
      aria-hidden
      style={{ position: 'fixed', left: 0, top: 0, zIndex: 300, pointerEvents: 'none', transformOrigin: '50% 50%', willChange: 'transform' }}
    >
      <div ref={fond} style={{
        ...couche, borderRadius: 3, opacity: 0,
        backgroundColor: papier, backgroundImage: grain, backgroundSize: '200px 200px',
        boxShadow: sombre ? OMBRE_SOMBRE : OMBRE_CLAIR,
      }} />
      <div style={{ ...couche, borderRadius: 3, overflow: 'hidden' }}>
        <div ref={ligne} style={{ position: 'absolute', left: retrait, right: 12, top: 0, paddingTop: 13 }}>
          <p style={{
            fontFamily: "'Playfair Display', serif", color: encre, fontSize: 17, lineHeight: 1.35, margin: '0 0 4px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            {titre}
          </p>
          <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.75, margin: 0 }}>{meta}</p>
        </div>
        <div ref={tete} style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }} />
      </div>
    </div>,
    document.body,
  )
}
