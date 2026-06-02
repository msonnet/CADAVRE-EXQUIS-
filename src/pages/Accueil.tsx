import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Onboarding from '../components/Onboarding'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

export default function Accueil() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [])

  function nav(to: string) {
    jouer('clic')
    navigate(to)
  }

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const second = c?.second ?? '#1d3a8c'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const num = String(((seance?.seed ?? 0) % 999) + 1).padStart(3, '0')
  const annee = toRomain(new Date().getFullYear())
  const idxBiais = seance?.idxBiais ?? -1
  const angleBiais = seance?.angleBiais ?? 0
  const letters = 'Exquis.'

  const bg = c?.bg ?? '#0f0805'
  const ui: React.CSSProperties = { fontFamily: "'Raleway', sans-serif" }

  const cadavreSide = seance?.symbolSide === 'right' ? 'left' : 'right'
  const exquisStyle: React.CSSProperties = cadavreSide === 'right'
    ? { paddingRight: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-end', textAlign: 'right' }
    : { paddingLeft: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-start', textAlign: 'left' }

  return (
    <PageTransition className="page-carnet relative flex flex-col h-dvh overflow-hidden safe-top safe-bottom">

      <Decor variant="accueil" hideCitation />
      <Onboarding />

      {/* ── HEADER ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          ...ui, fontSize: 13, letterSpacing: '0.1em',
          color: encre, opacity: 0.7, whiteSpace: 'nowrap',
        }}>
          N° {num} · {annee}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <button
            onClick={() => seance?.retirer()}
            title="Re-tirer un rêve"
            style={{
              ...ui, fontSize: 13, color: accent, opacity: 0.9,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >✦</button>
          <span style={{
            ...ui, fontSize: 13, letterSpacing: '0.1em',
            color: accent, fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            {colorLabel}
          </span>
        </div>
      </div>

      <hr style={{
        border: 'none', borderTop: `1.2px solid ${accent}`,
        marginTop: 6, opacity: 0.45, position: 'relative', zIndex: 10,
      }} />

      {/* ── ZONE CENTRALE ── */}
      <div className="relative flex flex-col flex-1 justify-end" style={{ zIndex: 10 }}>
        <motion.div
          className="mb-3"
          style={exquisStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.3 }}
        >
          <div
            className="font-bodoni font-black leading-tight"
            style={{ fontSize: 'clamp(3.8rem, 16vw, 6.5rem)', color: accent }}
          >
            {[...letters].map((l, i) => (
              <span key={i} style={{
                display: 'inline-block',
                transform: i === (idxBiais % letters.length)
                  ? `rotate(${angleBiais}deg) translateY(${angleBiais > 0 ? 2 : -2}px)`
                  : 'none',
                transformOrigin: 'center bottom',
              }}>{l}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── CITATION ── */}
      {seance?.citation && (
        <motion.div
          style={{ position: 'relative', zIndex: 10, marginBottom: 14 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.7 }}
        >
          <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.18, marginBottom: 10 }} />
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: 17, lineHeight: 1.5,
            color: encre, display: 'block', fontStyle: 'italic',
          }}>
            {seance.citation.t}
          </span>
          <div style={{
            ...ui, fontSize: 13, letterSpacing: '0.1em', fontWeight: 700,
            textTransform: 'uppercase', color: accent, marginTop: 5,
          }}>
            {seance.citation.a}
          </div>
        </motion.div>
      )}

      {/* ── CTA ── */}
      <motion.div
        style={{ position: 'relative', zIndex: 10, marginBottom: 10 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => nav('/config')}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: encre, color: bg,
              ...ui, fontSize: 17, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.7em 0.5em', border: 'none', cursor: 'pointer', gap: 3,
              borderRadius: 12,
            }}
          >
            <span>Cadavre Écrit</span>
            <span aria-hidden style={{ fontSize: 17, opacity: 0.85 }}>✒</span>
          </button>
          <button
            onClick={() => nav('/config-dessin')}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: second, color: bg,
              ...ui, fontSize: 17, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.7em 0.5em', border: 'none', cursor: 'pointer', gap: 3,
              borderRadius: 12,
            }}
          >
            <span>Cadavre Dessiné</span>
            <span aria-hidden style={{ fontSize: 17, opacity: 0.85 }}>✎</span>
          </button>
        </div>
        <button
          onClick={() => nav('/online')}
          style={{
            width: '100%', marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: `${encre}0d`, color: encre,
            ...ui, fontSize: 17, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.55em 1em', border: `0.5px solid ${encre}30`, cursor: 'pointer',
            borderRadius: 12,
          }}
        >
          <span>Mode en ligne</span>
          <span aria-hidden style={{ fontSize: 17, opacity: 0.75 }}>⊕</span>
        </button>
      </motion.div>

      {/* ── FOOTER ── */}
      <motion.div
        style={{
          position: 'relative', zIndex: 10,
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '4px 0', paddingBottom: 4,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9, duration: 0.4 }}
      >
        {[
          { label: 'Recueil', path: '/bibliotheque' },
          { label: 'Galerie',  path: '/galerie',    align: 'right' },
          { label: 'Règles',   path: '/aide' },
          { label: 'Réglages', path: '/reglages',   align: 'right' },
        ].map(({ label, path, align }) => (
          <button
            key={path}
            onClick={() => nav(path)}
            style={{
              ...ui, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: encre, opacity: 0.65,
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: (align as 'right') ?? 'left',
              padding: '2px 0',
            }}
          >
            {label}
          </button>
        ))}
      </motion.div>

    </PageTransition>
  )
}
