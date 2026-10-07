import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { tr, langueActuelle } from '../../i18n'
import { grilleNuancier, ENCRES, versRgb, depuisRgb, lireHex, couleurDuSpectre } from '../../lib/trait/couleurs'

/**
 * Le nuancier — trois façons de choisir, comme dans Freeform : la GRILLE
 * (une teinte par colonne), le SPECTRE (on glisse le doigt), les CURSEURS
 * (rouge, vert, bleu et le code). En tête, les encres du jeu ; en pied, les
 * couleurs récentes et la pipette.
 */

type Onglet = 'grille' | 'spectre' | 'curseurs'

interface Props {
  couleur: string
  recentes: string[]
  onChoisir: (c: string) => void
  onPipette: () => void
  onFermer: () => void
  /** Ce qui précède les onglets — le choix du papier, au salon. */
  avant?: React.ReactNode
}

export default function Nuancier({ couleur, recentes, onChoisir, onPipette, onFermer, avant }: Props) {
  const [onglet, setOnglet] = useState<Onglet>('grille')
  const grille = useMemo(grilleNuancier, [])
  const en = langueActuelle() === 'en'
  const ONGLETS: [Onglet, string][] = [['grille', tr('Grille', 'Grid')], ['spectre', tr('Spectre', 'Spectrum')], ['curseurs', tr('Curseurs', 'Sliders')]]
  const pastille = (c: string, choisie: boolean, libelle?: string, taille = 30) => (
    <button key={c + (libelle ?? '')} type="button" onClick={() => onChoisir(c)} aria-label={libelle ?? c} aria-pressed={choisie}
      style={{ width: taille, height: taille, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: c, flex: '0 0 auto',
        boxShadow: choisie ? '0 0 0 2px #fdfbf7, 0 0 0 4px #2a241d' : 'inset 0 0 0 1px rgba(40,28,16,0.14)' }} />
  )

  return (
    <>
      {/* Le voile se retire SANS attendre la fin de sa sortie : pendant qu'il
          s'efface, il avalait le premier trait qu'on posait juste après. */}
      <motion.div onClick={onFermer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.15 } }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,14,8,0.28)', zIndex: 50 }} aria-hidden />
      <motion.div
        role="dialog" aria-label={tr('Couleurs', 'Colors')}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', pointerEvents: 'none', transition: { duration: 0.18, ease: 'easeIn' } }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 51, margin: '0 auto', maxWidth: 520,
          background: '#fdfbf7', borderRadius: '24px 24px 0 0', padding: '10px 18px calc(16px + var(--sa-bottom))',
          boxShadow: '0 -10px 40px rgba(20,14,8,0.2)', fontFamily: "'Raleway', sans-serif", color: '#2a241d',
        }}
      >
        <div style={{ width: 38, height: 5, borderRadius: 3, background: 'rgba(40,28,16,0.18)', margin: '0 auto 10px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.24em' }}>{tr('COULEURS', 'COLORS')}</span>
          <button type="button" onClick={onFermer} aria-label={tr('Fermer', 'Close')}
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(40,28,16,0.08)', color: '#5d554a', fontSize: 15, cursor: 'pointer' }}>✕</button>
        </div>

        {avant}
        <div role="tablist" aria-label={tr('Façon de choisir', 'How to choose')}
          style={{ display: 'flex', background: 'rgba(40,28,16,0.07)', borderRadius: 10, padding: 3, marginBottom: 14 }}>
          {ONGLETS.map(([o, nom]) => (
            <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => setOnglet(o)}
              style={{ flex: 1, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                background: onglet === o ? '#ffffff' : 'transparent', color: '#2a241d', boxShadow: onglet === o ? '0 1px 4px rgba(40,28,16,0.14)' : 'none' }}>
              {nom}
            </button>
          ))}
        </div>

        <div role="tabpanel" style={{ minHeight: 236 }}>
          {onglet === 'grille' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', borderRadius: 10, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(40,28,16,0.08)' }}>
              {grille.flat().map((c, i) => (
                <button key={i} type="button" onClick={() => onChoisir(c)} aria-label={c} aria-pressed={c === couleur.toLowerCase()}
                  style={{ aspectRatio: '1', border: 'none', padding: 0, cursor: 'pointer', background: c,
                    outline: c === couleur.toLowerCase() ? '3px solid #fdfbf7' : 'none', outlineOffset: -3, position: 'relative', zIndex: c === couleur.toLowerCase() ? 1 : 0 }} />
              ))}
            </div>
          )}
          {onglet === 'spectre' && <Spectre onChoisir={onChoisir} />}
          {onglet === 'curseurs' && <Curseurs couleur={couleur} onChoisir={onChoisir} />}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#6d6558' }}>{tr('ENCRES', 'INKS')}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {ENCRES.map(e => pastille(e.c, e.c === couleur.toLowerCase(), en ? e.nom[1] : e.nom[0]))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: couleur, flex: '0 0 auto', boxShadow: 'inset 0 0 0 1px rgba(40,28,16,0.14)' }} aria-hidden />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 2px' }}>
            {recentes.length
              ? recentes.map(c => pastille(c, c.toLowerCase() === couleur.toLowerCase(), undefined, 28))
              : <span style={{ fontSize: 12, color: '#8b8274', alignSelf: 'center' }}>{tr('Les couleurs posées reviendront ici.', 'Colors you use will appear here.')}</span>}
          </div>
          <button type="button" onClick={onPipette} aria-label={tr('Pipette — prélever une couleur du dessin', 'Eyedropper — pick a color from the drawing')}
            style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'rgba(40,28,16,0.08)', cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M15.6 2.6a2.4 2.4 0 0 1 1.8 4l-1.6 1.6 0.9 0.9-1.3 1.3-0.9-0.9-6.2 6.2-3 0.8 0.8-3 6.2-6.2-0.9-0.9 1.3-1.3 0.9 0.9 1.6-1.6a2.4 2.4 0 0 1 0.4-0.8z" fill="#2a241d" /></svg>
          </button>
        </div>
      </motion.div>
    </>
  )
}

function Spectre({ onChoisir }: { onChoisir: (c: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth * dpr, h = c.clientHeight * dpr
    c.width = w; c.height = h
    const ctx = c.getContext('2d'); if (!ctx) return
    const gx = ctx.createLinearGradient(0, 0, w, 0)
    for (let i = 0; i <= 12; i++) gx.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`)
    ctx.fillStyle = gx; ctx.fillRect(0, 0, w, h)
    const gy = ctx.createLinearGradient(0, 0, 0, h)
    gy.addColorStop(0, 'rgba(255,255,255,1)'); gy.addColorStop(0.5, 'rgba(255,255,255,0)'); gy.addColorStop(0.5, 'rgba(0,0,0,0)'); gy.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = gy; ctx.fillRect(0, 0, w, h)
  }, [])
  const [vise, setVise] = useState<{ x: number; y: number } | null>(null)
  const prendre = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height
    setVise({ x: Math.max(0, Math.min(1, fx)), y: Math.max(0, Math.min(1, fy)) })
    onChoisir(couleurDuSpectre(fx, fy))
  }
  return (
    <div style={{ position: 'relative', touchAction: 'none' }}
      onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); prendre(e) }}
      onPointerMove={e => { if (e.buttons) prendre(e) }}>
      <canvas ref={ref} aria-label={tr('Spectre des couleurs', 'Color spectrum')} role="img" style={{ width: '100%', height: 236, display: 'block', borderRadius: 10, cursor: 'crosshair' }} />
      {vise && <span aria-hidden style={{ position: 'absolute', left: `${vise.x * 100}%`, top: `${vise.y * 100}%`, width: 22, height: 22, margin: '-11px 0 0 -11px', borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />}
    </div>
  )
}

function Curseurs({ couleur, onChoisir }: { couleur: string; onChoisir: (c: string) => void }) {
  const { r, g, b } = versRgb(couleur)
  const [saisie, setSaisie] = useState(couleur.replace('#', '').toUpperCase())
  useEffect(() => { setSaisie(couleur.replace('#', '').toUpperCase()) }, [couleur])
  const canaux: [string, number, (v: number) => string, string][] = [
    [tr('ROUGE', 'RED'), r, v => depuisRgb(v, g, b), `linear-gradient(to right, ${depuisRgb(0, g, b)}, ${depuisRgb(255, g, b)})`],
    [tr('VERT', 'GREEN'), g, v => depuisRgb(r, v, b), `linear-gradient(to right, ${depuisRgb(r, 0, b)}, ${depuisRgb(r, 255, b)})`],
    [tr('BLEU', 'BLUE'), b, v => depuisRgb(r, g, v), `linear-gradient(to right, ${depuisRgb(r, g, 0)}, ${depuisRgb(r, g, 255)})`],
  ]
  return (
    <div>
      {canaux.map(([nom, v, faire, fond]) => (
        <label key={nom} style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: '#6d6558', marginBottom: 6 }}>
            <span>{nom}</span><span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 0 }}>{v}</span>
          </span>
          <input type="range" min={0} max={255} value={v} onChange={e => onChoisir(faire(Number(e.target.value)))} className="curseur-couleur"
            style={{ width: '100%', height: 28, borderRadius: 14, background: fond, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', boxShadow: 'inset 0 0 0 1px rgba(40,28,16,0.12)' }} />
        </label>
      ))}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: '#6d6558' }}>
        {tr('CODE', 'HEX')}
        <span style={{ display: 'flex', alignItems: 'center', background: 'rgba(40,28,16,0.07)', borderRadius: 8, padding: '0 10px', height: 36 }}>
          <span aria-hidden style={{ color: '#8b8274' }}>#</span>
          <input value={saisie} maxLength={7} spellCheck={false} autoCapitalize="characters" autoCorrect="off" inputMode="text"
            onChange={e => { setSaisie(e.target.value); const c = lireHex(e.target.value); if (c) onChoisir(c) }}
            style={{ width: 86, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 16, letterSpacing: '0.08em', color: '#2a241d', outline: 'none' }} />
        </span>
      </label>
    </div>
  )
}
