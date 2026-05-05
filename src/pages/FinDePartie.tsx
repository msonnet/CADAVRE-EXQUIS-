import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoemes } from '../db'
import type { Poeme } from '../types'
import { useTTS } from '../hooks/useTTS'

export default function FinDePartie() {
  const navigate = useNavigate()
  const location = useLocation()
  const [poeme, setPoeme] = useState<Poeme | null>(
    (location.state as { poeme?: Poeme } | null)?.poeme ?? null
  )
  const [casesVisibles, setCasesVisibles] = useState(false)
  const { parler, arreter, parlant } = useTTS()

  useEffect(() => {
    if (!poeme) {
      chargerPoemes()
        .then(ps => { if (ps.length > 0) setPoeme(ps[0]) })
        .catch(console.error)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!poeme) {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        <p className="vers-jeu text-center opacity-60">Aucun poème en cours.</p>
        <button onClick={() => navigate('/config')} className="btn-primaire mt-8">
          Nouvelle partie
        </button>
      </PageTransition>
    )
  }

  const structure = getStructure(poeme.structureId)
  const texte = reconstruirePoeme(poeme.cases, structure)
  const lignes = texte.split('\n')

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <motion.p
        className="nav-discrete text-center mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Le cadavre exquis a parlé
      </motion.p>

      <SeparateurOr />

      <motion.div
        className="my-8 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 1 }}
      >
        {lignes.map((ligne, i) => (
          <p key={i} className="vers-jeu leading-relaxed">
            {ligne || ' '}
          </p>
        ))}
      </motion.div>

      <motion.div
        className="flex justify-center mt-2 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        <button
          onClick={() => parlant ? arreter() : parler(texte)}
          className="nav-discrete hover:text-encre transition-colors"
        >
          {parlant ? '◾ Arrêter' : '▶ Écouter'}
        </button>
      </motion.div>

      <SeparateurOr />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <button
          onClick={() => setCasesVisibles(v => !v)}
          className="nav-discrete mt-6 w-full text-center hover:text-encre transition-colors"
        >
          {casesVisibles ? '↑ Masquer les cases' : '↓ Voir case par case'}
        </button>

        {casesVisibles && (
          <motion.div
            className="mt-4 space-y-4"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {poeme.cases.map((c, i) => {
              const iaNum = poeme.cases.slice(0, i).filter(x => x.auteur === 'ia').length + 1
              return (
              <div key={i} className="border-l-2 border-or/30 pl-4 py-1">
                <p className="nav-discrete mb-1">
                  {c.fonction}
                  <span className="mx-2 opacity-40">—</span>
                  <span className="italic">
                    {c.auteur === 'ia' ? `voix ${iaNum}` : 'toi'}
                  </span>
                </p>
                <p className="font-cormorant italic text-encre text-lg leading-snug">
                  {c.texte}
                </p>
              </div>
              )
            })}
          </motion.div>
        )}

        <div className="flex flex-col items-center gap-4 mt-10">
          <motion.div whileTap={{ scale: 0.97 }}>
            <button onClick={() => navigate('/config')} className="btn-primaire">
              Nouvelle partie
            </button>
          </motion.div>
          <button
            onClick={() => navigate('/bibliotheque')}
            className="nav-discrete hover:text-encre transition-colors"
          >
            Ma bibliothèque →
          </button>
        </div>
      </motion.div>
    </PageTransition>
  )
}
