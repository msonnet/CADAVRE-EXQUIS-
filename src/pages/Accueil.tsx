import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, HeaderKeywords, useReve } from '../reve'
import { useSound } from '../hooks/useSound'

const lienVariantes = {
  cache: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.6 + i * 0.15, duration: 0.5 },
  }),
}

export default function Accueil() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()

  const liens = [
    { to: '/config', label: 'Nouvelle partie' },
    { to: '/bibliotheque', label: 'Mes poèmes' },
    { to: '/aide', label: 'Comment jouer' },
    { to: '/reglages', label: 'Réglages' },
  ]

  function naviguer(to: string) {
    jouer('clic')
    navigate(to)
  }

  const accentColor = seance?.colorSchema.hex ?? '#a8332a'
  const idxBiais = seance?.idxBiais ?? -1
  const angleBiais = seance?.angleBiais ?? 0
  const letters1 = 'Cadavre'
  const letters2 = 'Exquis'

  return (
    <PageTransition className="page-carnet relative flex flex-col items-center justify-center min-h-dvh text-center safe-top safe-bottom overflow-hidden">

      <HeaderKeywords />
      <Decor variant="accueil" />

      {/* Titre */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0 }}
        className="relative z-10 mt-8"
      >
        <h1 className="font-bodoni italic font-black text-encre leading-none" style={{ fontSize: 'clamp(2.5rem, 9vw, 4rem)' }}>
          {[...letters1].map((l, i) => (
            <span key={i} style={{
              display: 'inline-block',
              transform: i === idxBiais ? `rotate(${angleBiais}deg) translateY(${angleBiais > 0 ? 2 : -2}px)` : 'none',
              transformOrigin: 'center bottom',
            }}>{l}</span>
          ))}
        </h1>
        <h1 className="font-bodoni italic font-black leading-none -mt-1" style={{ fontSize: 'clamp(2.7rem, 9.5vw, 4.4rem)', color: accentColor }}>
          {[...letters2].map((l, i) => (
            <span key={i} style={{
              display: 'inline-block',
              transform: (i + 8) === idxBiais ? `rotate(${angleBiais}deg) translateY(${angleBiais > 0 ? 2 : -2}px)` : 'none',
              transformOrigin: 'center bottom',
            }}>{l}</span>
          ))}
        </h1>
      </motion.div>

      <hr className="w-20 mt-5 mx-auto" style={{ border: 'none', borderTop: `1px solid ${accentColor}` }} />

      <nav className="flex flex-col items-center gap-5 mt-8 relative z-10">
        {liens.map(({ to, label }, i) => (
          <motion.div
            key={to}
            custom={i}
            variants={lienVariantes}
            initial="cache"
            animate="visible"
          >
            <button onClick={() => naviguer(to)} className="lien-texte text-lg tracking-wide">
              {label}
            </button>
          </motion.div>
        ))}
      </nav>

      <button
        onClick={() => seance?.retirer()}
        className="absolute bottom-6 left-6 nav-discrete transition-colors hover:opacity-100"
        style={{ color: accentColor, opacity: 0.65, zIndex: 7 }}
        title="Re-tirer un rêve"
      >
        ✦ re-rêver
      </button>
    </PageTransition>
  )
}
