import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoemes, sauvegarderIllustration } from '../db'
import type { Poeme } from '../types'
import { useTTS } from '../hooks/useTTS'
import { useSound } from '../hooks/useSound'
import { genererIllustration } from '../api/illustration'

export default function FinDePartie() {
  const navigate = useNavigate()
  const location = useLocation()
  const [poeme, setPoeme] = useState<Poeme | null>(
    (location.state as { poeme?: Poeme } | null)?.poeme ?? null
  )
  const [casesVisibles, setCasesVisibles] = useState(false)
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null)
  const [generatingIllustration, setGeneratingIllustration] = useState(false)
  const { parler, arreter, parlant } = useTTS()
  const { jouer } = useSound()

  useEffect(() => {
    jouer('revelation')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!poeme) {
      chargerPoemes()
        .then(ps => { if (ps.length > 0) setPoeme(ps[0]) })
        .catch(console.error)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Génération automatique de l'illustration après la révélation
  useEffect(() => {
    if (!poeme) return
    if (poeme.illustration) {
      setIllustrationUrl(poeme.illustration.url)
      return
    }

    const structure = getStructure(poeme.structureId)
    const texte = reconstruirePoeme(poeme.cases, structure)

    setGeneratingIllustration(true)
    genererIllustration(texte)
      .then(url => {
        if (url) {
          setIllustrationUrl(url)
          const illustration = { url, promptUtilise: texte, dateGeneration: Date.now() }
          sauvegarderIllustration(poeme.id, illustration).catch(console.error)
        }
      })
      .finally(() => setGeneratingIllustration(false))
  }, [poeme?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Illustration */}
      {(illustrationUrl || generatingIllustration) && (
        <motion.div
          className="my-8 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {generatingIllustration && !illustrationUrl && (
            <div className="flex flex-col items-center gap-3 py-8">
              <motion.span
                className="text-or text-2xl"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                ✦
              </motion.span>
              <p className="nav-discrete">Une image prend forme…</p>
            </div>
          )}

          {illustrationUrl && (
            <motion.div
              className="w-full max-w-xs"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.0 }}
            >
              <img
                src={illustrationUrl}
                alt="Illustration surréaliste du poème"
                className="w-full rounded-sm border border-or/20 opacity-90"
                style={{ filter: 'sepia(0.15) contrast(0.95)' }}
              />
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <button
          onClick={() => setCasesVisibles(v => !v)}
          className="nav-discrete mt-2 w-full text-center hover:text-encre transition-colors"
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
