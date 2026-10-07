import { useRef, useState } from 'react'
import { tr } from '../../i18n'
import { suivreDeuxDoigts, angleAffiche, type Regle } from '../../lib/trait/regle'

/**
 * La règle posée sur la feuille : un doigt la déplace, deux la tournent.
 * Pendant qu'on la tourne, son angle s'affiche en son milieu et s'aimante aux
 * multiples de 15°. Elle capte ses propres doigts : un trait ne commence
 * jamais SUR elle, seulement le long de ses bords.
 */

interface Props { regle: Regle; onChange: (r: Regle) => void }

export default function RegleVisible({ regle, onChange }: Props) {
  const doigts = useRef(new Map<number, { x: number; y: number }>())
  const [tourne, setTourne] = useState(false)
  const { cx, cy, angle, longueur: L, epaisseur: E } = regle

  const bouger = (e: React.PointerEvent) => {
    const avant = doigts.current.get(e.pointerId); if (!avant) return
    e.stopPropagation()
    const ancien = [...doigts.current.values()] as { x: number; y: number }[]
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const nouveau = [...doigts.current.values()] as { x: number; y: number }[]
    if (nouveau.length >= 2) {
      const r = suivreDeuxDoigts(regle, [ancien[0], ancien[1]], [nouveau[0], nouveau[1]])
      onChange({ ...r, angle: r.angle })
      setTourne(true)
    } else {
      onChange({ ...regle, cx: cx + e.clientX - avant.x, cy: cy + e.clientY - avant.y })
    }
  }
  const lacher = (e: React.PointerEvent) => {
    doigts.current.delete(e.pointerId)
    if (doigts.current.size < 2 && tourne) {
      // Au lâcher, l'angle se pose sur la valeur affichée.
      onChange({ ...regle, angle: angleAffiche(regle.angle).angle })
      setTourne(false)
    }
  }

  const graduations = Array.from({ length: Math.floor(L / 8) + 1 }, (_, i) => i)
  const { degres } = angleAffiche(angle)
  return (
    <div
      role="img" aria-label={tr(`Règle, ${degres} degrés`, `Ruler, ${degres} degrees`)}
      onPointerDown={e => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }) }}
      onPointerMove={bouger} onPointerUp={lacher} onPointerCancel={lacher}
      style={{
        position: 'absolute', left: cx - L / 2, top: cy - E / 2, width: L, height: E, zIndex: 12,
        transform: `rotate(${angle}rad)`, transformOrigin: '50% 50%', touchAction: 'none', cursor: 'grab',
        background: 'linear-gradient(rgba(255,253,248,0.86), rgba(246,241,231,0.8))',
        border: '1px solid rgba(120,104,82,0.35)', borderRadius: 6,
        boxShadow: '0 8px 22px rgba(40,28,16,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
        backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)',
      }}
    >
      <svg width={L} height={E} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {graduations.map(i => {
          const x = i * 8, l = i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6
          return (
            <g key={i} stroke="#6d6250" strokeWidth={0.8} opacity={0.75}>
              <line x1={x} x2={x} y1={0} y2={l} /><line x1={x} x2={x} y1={E} y2={E - l} />
            </g>
          )
        })}
      </svg>
      <span style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none',
        fontFamily: "'Raleway', sans-serif", fontSize: 13, fontWeight: 700, color: '#4b4236', letterSpacing: '0.04em',
        opacity: tourne ? 1 : 0.55, transition: 'opacity 0.2s',
      }}>{degres}°</span>
    </div>
  )
}
