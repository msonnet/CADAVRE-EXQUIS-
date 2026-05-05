import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { chargerPoemes } from '../db'
import type { Poeme } from '../types'

const NOMS_STRUCTURES: Record<string, string> = {
  'phrase-simple': 'Phrase simple',
  'phrase-etoffee': 'Phrase étoffée',
  'conditionnelle': 'Conditionnelle',
  'comparative': 'Comparative',
  'enumerative': 'Énumérative',
  'question-reponse': 'Question / Réponse',
  'vers-libre': 'Vers libre',
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function extraitPoeme(poeme: Poeme): string {
  const premier = poeme.cases[0]?.texte ?? ''
  return premier.length > 60 ? premier.slice(0, 57) + '…' : premier
}

export default function Bibliotheque() {
  const navigate = useNavigate()
  const [poemes, setPoemes] = useState<Poeme[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    chargerPoemes()
      .then(setPoemes)
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [])

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button
        onClick={() => navigate('/')}
        className="nav-discrete mb-8 hover:text-encre transition-colors"
      >
        ← Accueil
      </button>

      <h2 className="font-garamond italic text-2xl text-encre mb-1">Mes poèmes</h2>
      <p className="sous-titre mb-6">Ta bibliothèque personnelle</p>

      <SeparateurOr />

      {chargement && (
        <div className="flex justify-center py-20">
          <motion.span
            className="text-or text-2xl"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ✦
          </motion.span>
        </div>
      )}

      {!chargement && poemes.length === 0 && (
        <motion.div
          className="flex flex-col items-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="vers-jeu text-center opacity-40">Aucun poème pour l’instant.</p>
          <button
            onClick={() => navigate('/config')}
            className="btn-primaire mt-8"
          >
            Première partie
          </button>
        </motion.div>
      )}

      {!chargement && poemes.length > 0 && (
        <AnimatePresence>
          <motion.div
            className="mt-4 flex flex-col gap-px"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {poemes.map((poeme, i) => (
              <motion.button
                key={poeme.id}
                onClick={() => navigate(`/bibliotheque/${poeme.id}`)}
                className="text-left w-full py-5 border-b border-gris-clair/20 hover:bg-or/5 transition-colors group"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-cormorant italic text-encre text-lg leading-snug truncate">
                      {poeme.titre ?? extraitPoeme(poeme) ?? 'Sans titre'}
                    </p>
                    <p className="nav-discrete mt-1">
                      {NOMS_STRUCTURES[poeme.structureId] ?? poeme.structureId}
                      <span className="mx-2 opacity-40">·</span>
                      {poeme.cases.length} case{poeme.cases.length > 1 ? 's' : ''}
                      <span className="mx-2 opacity-40">·</span>
                      {formatDate(poeme.dateCreation)}
                    </p>
                  </div>
                  <span className="nav-discrete opacity-0 group-hover:opacity-60 transition-opacity mt-1 shrink-0">
                    →
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {!chargement && poemes.length > 0 && (
        <motion.div
          className="flex justify-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button onClick={() => navigate('/config')} className="btn-primaire">
            Nouvelle partie
          </button>
        </motion.div>
      )}
    </PageTransition>
  )
}
