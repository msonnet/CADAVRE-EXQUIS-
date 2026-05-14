import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, SignatureReve, useReve } from '../reve'
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

  const idxBiais = seance?.idxBiais ?? -1
  const angleBiais = seance?.angleBiais ?? 0
  const letters1 = 'Cadavre'
  const letters2 = 'Exquis'

  return (
    <PageTransition className="page-carnet relative flex flex-col items-center justify-center min-h-dvh text-center safe-top safe-bottom overflow-hidden">

      {/* Décor du rêve */}
      <Decor variant="accueil" />

      {/* En-tête manuscrit (folio) */}
      <div className="absolute top-6 left-6 right-6 flex justify-between">
        <span className="folio">Tome I · Feuillet I</span>
        <span className="folio">— Frontispice —</span>
      </div>
      <hr className="filet-double absolute top-12 left-6 right-6" />

      {/* Petite-cap */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <div className="petite-cap-rouge mb-4">— Almanach —</div>
      </motion.div>

      {/* Titre — avec lettre déréglée */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0 }}
        className="relative z-10"
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
        <h1 className="font-bodoni italic font-black text-rouge leading-none -mt-1" style={{ fontSize: 'clamp(2.7rem, 9.5vw, 4.4rem)' }}>
          {[...letters2].map((l, i) => (
            <span key={i} style={{
              display: 'inline-block',
              transform: (i + 8) === idxBiais ? `rotate(${angleBiais}deg) translateY(${angleBiais > 0 ? 2 : -2}px)` : 'none',
              transformOrigin: 'center bottom',
            }}>{l}</span>
          ))}
        </h1>
      </motion.div>

      <hr className="filet-rouge w-20 mt-5 mx-auto" />

      <motion.p
        className="sous-titre mt-4 px-8 max-w-sm relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <em>« Jeu de plume à plusieurs mains,<br/>pour cerveaux d'urgence et amoureux. »</em>
      </motion.p>
      <div className="petite-cap mt-2 text-[0.55rem]">— d'après le Iᵉʳ manifeste —</div>

      <nav className="flex flex-col items-center gap-5 mt-10 relative z-10">
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

      {/* Re-rêver */}
      <button
        onClick={() => seance?.retirer()}
        className="absolute bottom-6 left-6 nav-discrete hover:text-rouge transition-colors"
        title="Re-tirer un rêve"
      >
        ✦ re-rêver
      </button>

      <SignatureReve />
    </PageTransition>
  )
}
