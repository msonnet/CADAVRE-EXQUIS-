import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { tr } from '../../i18n'
import { OUTILS, type OutilId } from '../../lib/trait/outils'
import { dessinerTrait, verser, type PointTrait } from '../../lib/trait/rendu'
import type { ReglageOutil } from '../../hooks/useStudio'
import { nomOutil } from './Trousse'

/**
 * Les réglages d'un instrument — ouverts par un second toucher. L'aperçu est
 * tracé par le VRAI moteur : ce qu'on voit ici est exactement ce que l'outil
 * posera sur la feuille, à cette épaisseur et à cette opacité.
 */

interface Props {
  id: OutilId
  reglage: ReglageOutil
  fond: string
  papierClair: boolean
  onChange: (r: Partial<ReglageOutil>) => void
  onFermer: () => void
}

// Une vague : lente au départ, rapide au milieu — elle montre l'effet de la vitesse.
const VAGUE: PointTrait[] = Array.from({ length: 70 }, (_, i) => {
  const t = i / 69, x = 18 + t * 244
  return { x, y: 46 + Math.sin(t * Math.PI * 2) * 20 * (0.6 + 0.4 * t), p: 0.5 }
})

export default function ReglagesOutil({ id, reglage, fond, papierClair, onChange, onFermer }: Props) {
  const apercu = useRef<HTMLCanvasElement>(null)
  const o = OUTILS[id]

  useEffect(() => {
    const c = apercu.current; if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = 280 * dpr; c.height = 92 * dpr
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.fillStyle = fond; ctx.fillRect(0, 0, c.width, c.height)
    const couche = document.createElement('canvas'); couche.width = c.width; couche.height = c.height
    const cc = couche.getContext('2d'); if (!cc) return
    const pts = VAGUE.map(p => ({ x: p.x * dpr, y: p.y * dpr, p: p.p }))
    if (o.sansCouleur) {
      // La gomme se montre en effaçant un aplat.
      ctx.fillStyle = '#9b9183'; ctx.fillRect(10 * dpr, 30 * dpr, 260 * dpr, 32 * dpr)
    }
    dessinerTrait(cc, id, reglage, reglage.couleur, pts, { dpr, fond, pressionReelle: false, fini: true })
    verser(ctx, couche, id, reglage, papierClair)
  }, [id, reglage, fond, papierClair, o.sansCouleur])

  const pourcent = Math.round(reglage.opacite * 100)
  return (
    <>
      <motion.div onClick={onFermer} exit={{ pointerEvents: 'none' }} style={{ position: 'fixed', inset: 0, zIndex: 40 }} aria-hidden />
      <motion.div
        role="dialog" aria-label={tr(`Réglages — ${nomOutil(id)}`, `Settings — ${nomOutil(id)}`)}
        initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, pointerEvents: 'none' }}
        transition={{ duration: 0.18 }}
        style={{
          position: 'absolute', left: 12, right: 12, bottom: 'calc(100% + 12px)', zIndex: 41, margin: '0 auto', maxWidth: 320,
          background: '#fdfbf7', borderRadius: 22, padding: '14px 18px 16px',
          boxShadow: '0 16px 40px rgba(40,28,16,0.22), 0 2px 8px rgba(40,28,16,0.1)',
          fontFamily: "'Raleway', sans-serif", color: '#2a241d',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.24em' }}>{nomOutil(id).toUpperCase()}</span>
          <button type="button" onClick={onFermer} style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: '#6d6558', cursor: 'pointer', padding: '6px 2px' }}>
            {tr('OK', 'DONE')}
          </button>
        </div>
        <canvas ref={apercu} aria-hidden style={{ width: 280, maxWidth: '100%', height: 92, display: 'block', margin: '0 auto 10px', borderRadius: 10, boxShadow: 'inset 0 0 0 1px rgba(40,28,16,0.08)' }} />
        <Curseur
          libelle={tr('ÉPAISSEUR', 'WIDTH')} valeur={`${reglage.taille.toFixed(reglage.taille < 10 ? 1 : 0)} px`}
          min={o.taille.min} max={o.taille.max} pas={0.25} v={reglage.taille}
          onChange={v => onChange({ taille: v })}
        />
        {!o.sansCouleur && (
          <Curseur
            libelle={tr('OPACITÉ', 'OPACITY')} valeur={`${pourcent} %`}
            min={10} max={100} pas={1} v={pourcent}
            onChange={v => onChange({ opacite: v / 100 })}
          />
        )}
      </motion.div>
    </>
  )
}

function Curseur({ libelle, valeur, min, max, pas, v, onChange }: { libelle: string; valeur: string; min: number; max: number; pas: number; v: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'block', marginTop: 8 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: '#6d6558' }}>
        <span>{libelle}</span><span style={{ letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>{valeur}</span>
      </span>
      <input
        type="range" min={min} max={max} step={pas} value={v}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 32, accentColor: '#2a241d', cursor: 'pointer' }}
      />
    </label>
  )
}
