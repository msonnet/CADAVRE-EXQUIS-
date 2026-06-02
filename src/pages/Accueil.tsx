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
  const mono: React.CSSProperties = { fontFamily: "'Inter', sans-serif", letterSpacing: '0.18em' }

  // CADAVRE vertical est du côté opposé au symbole
  // "Exquis." se cale contre lui, du même côté, avec un padding pour ne pas se chevaucher
  const cadavreSide = seance?.symbolSide === 'right' ? 'left' : 'right'
  const exquisStyle: React.CSSProperties = cadavreSide === 'right'
    ? { paddingRight: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-end', textAlign: 'right' }
    : { paddingLeft: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-start', textAlign: 'left' }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">

      {/* DÉCOR — stripes, symbole, étiquettes, signature (pas la citation) */}
      <Decor variant="accueil" hideCitation />

      {/* ONBOARDING — overlay 3 slides au premier lancement */}
      <Onboarding />

      {/* ── HEADER ── */}
      <div className="relative flex justify-between items-baseline" style={{ zIndex: 10 }}>
        <span style={{ ...mono, fontSize: 15, color: encre, opacity: 0.85 }}>
          N° {num} · {annee}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <button
            onClick={() => seance?.retirer()}
            title="Re-tirer un rêve"
            style={{ ...mono, fontSize: 14, color: accent, opacity: 0.9, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          >
            ✦
          </button>
          <span style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700 }}>
            {colorLabel}
          </span>
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45, position: 'relative', zIndex: 10 }} />

      {/* ── ZONE CENTRALE — CADAVRE (Decor, absolu) + Exquis. (flux) ── */}
      <div className="relative flex flex-col flex-1 justify-end" style={{ minHeight: '50vh', zIndex: 10 }}>
        <motion.div
          className="mb-8"
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

      {/* ── CITATION inline ── */}
      {seance?.citation && (
        <motion.div
          className="relative mb-5"
          style={{ zIndex: 10 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.7 }}
        >
          <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.18, marginBottom: '0.75rem' }} />
          <span style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 18, lineHeight: 1.55,
            color: encre, display: 'block',
          }}>
            {seance.citation.t}
          </span>
          <div style={{ ...mono, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: accent, marginTop: 5 }}>
            {seance.citation.a}
          </div>
        </motion.div>
      )}

      {/* ── CTA ── */}
      <motion.div
        className="relative mb-3"
        style={{ zIndex: 10 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => nav('/config')}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: encre, color: bg,
              ...mono, fontSize: 15, textTransform: 'uppercase',
              padding: '1em 0.5em', border: 'none', cursor: 'pointer', gap: 2,
              borderRadius: 12,
            }}
          >
            <span>Cadavre Écrit</span>
            <span aria-hidden style={{ fontSize: 15, opacity: 0.85 }}>✒</span>
          </button>
          <button
            onClick={() => nav('/config-dessin')}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: second, color: bg,
              ...mono, fontSize: 15, textTransform: 'uppercase',
              padding: '1em 0.5em', border: 'none', cursor: 'pointer', gap: 2,
              borderRadius: 12,
            }}
          >
            <span>Cadavre Dessiné</span>
            <span aria-hidden style={{ fontSize: 15, opacity: 0.85 }}>✎</span>
          </button>
        </div>
        <button
          onClick={() => nav('/online')}
          style={{
            width: '100%', marginTop: 8,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: `${encre}0d`, color: encre,
            ...mono, fontSize: 15, textTransform: 'uppercase',
            padding: '0.8em 1em', border: `0.5px solid ${encre}30`, cursor: 'pointer', gap: 2,
            borderRadius: 12,
          }}
        >
          <span>Mode en ligne</span>
          <span aria-hidden style={{ fontSize: 15, opacity: 0.75 }}>⊕</span>
        </button>
      </motion.div>

      {/* ── FOOTER ── */}
      <motion.div
        className="relative flex justify-between items-center pb-1"
        style={{ zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9, duration: 0.4 }}
      >
        <button
          onClick={() => nav('/bibliotheque')}
          style={{ ...mono, fontSize: 15, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          — RECUEIL —
        </button>
        <button
          onClick={() => nav('/galerie')}
          style={{ ...mono, fontSize: 15, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          — GALERIE —
        </button>
        <button
          onClick={() => nav('/aide')}
          style={{ ...mono, fontSize: 15, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          — RÈGLES —
        </button>
        <button
          onClick={() => nav('/reglages')}
          style={{ ...mono, fontSize: 15, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          — RÉGLAGES —
        </button>
      </motion.div>

    </PageTransition>
  )
}
