import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { useSound } from '../hooks/useSound'

const lienVariantes = {
  cache: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.6 + i * 0.15, duration: 0.5 },
  }),
}

export default function Accueil() {
  const navigate = useNavigate()
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

  return (
    <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh text-center safe-top safe-bottom">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0 }}
      >
        <h1 className="titre-principal">
          Cadavre Exquis
        </h1>
      </motion.div>

      <motion.p
        className="sous-titre mt-4 px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        Jeu surréaliste pour une voix humaine<br />
        et quarante inconnus
      </motion.p>

      <SeparateurOr className="w-24" />

      <nav className="flex flex-col items-center gap-6">
        {liens.map(({ to, label }, i) => (
          <motion.div
            key={to}
            custom={i}
            variants={lienVariantes}
            initial="cache"
            animate="visible"
          >
            <button onClick={() => naviguer(to)} className="lien-texte text-lg tracking-widest">
              {label}
            </button>
          </motion.div>
        ))}
      </nav>

      <motion.div
        className="absolute bottom-8 left-0 right-0 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1.2, duration: 1.0 }}
      >
        <svg width="60" height="12" viewBox="0 0 60 12" fill="none" aria-hidden="true">
          <path d="M0 6 Q15 1 30 6 Q45 11 60 6" stroke="#B8956A" strokeWidth="0.8" fill="none" />
        </svg>
      </motion.div>
    </PageTransition>
  )
}
