import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoeme, supprimerPoeme, mettreAJourTitre } from '../db'
import type { Poeme } from '../types'

export default function PoemeDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [poeme, setPoeme] = useState<Poeme | null>(null)
  const [chargement, setChargement] = useState(true)
  const [casesVisibles, setCasesVisibles] = useState(false)
  const [editionTitre, setEditionTitre] = useState(false)
  const [titreDraft, setTitreDraft] = useState('')
  const [confirmSuppression, setConfirmSuppression] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    chargerPoeme(id)
      .then(p => {
        if (p) {
          setPoeme(p)
          setTitreDraft(p.titre ?? '')
        }
      })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [id])

  useEffect(() => {
    if (editionTitre) inputRef.current?.focus()
  }, [editionTitre])

  async function sauvegarderTitre() {
    if (!poeme || !id) return
    const titre = titreDraft.trim() || null
    await mettreAJourTitre(id, titre ?? '')
    setPoeme(p => p ? { ...p, titre } : p)
    setEditionTitre(false)
  }

  async function supprimer() {
    if (!id) return
    await supprimerPoeme(id)
    navigate('/bibliotheque', { replace: true })
  }

  if (chargement) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <motion.span
          className="text-or text-2xl"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ✦
        </motion.span>
      </PageTransition>
    )
  }

  if (!poeme) {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        <p className="vers-jeu opacity-40">Poème introuvable.</p>
        <button onClick={() => navigate('/bibliotheque')} className="btn-primaire mt-8">
          Mes poèmes
        </button>
      </PageTransition>
    )
  }

  const structure = getStructure(poeme.structureId)
  const texte = reconstruirePoeme(poeme.cases, structure)
  const lignes = texte.split('\n')

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button
        onClick={() => navigate('/bibliotheque')}
        className="nav-discrete mb-8 hover:text-encre transition-colors"
      >
        ← Mes poèmes
      </button>

      <div className="mb-6">
        {editionTitre ? (
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              className="champ-carnet flex-1 text-lg font-cormorant italic"
              value={titreDraft}
              onChange={e => setTitreDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') sauvegarderTitre()
                if (e.key === 'Escape') setEditionTitre(false)
              }}
              placeholder="Titre du poème…"
            />
            <button onClick={sauvegarderTitre} className="nav-discrete hover:text-encre transition-colors">
              ✓
            </button>
            <button onClick={() => setEditionTitre(false)} className="nav-discrete hover:text-encre transition-colors">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditionTitre(true)}
            className="text-left group w-full"
          >
            <p className="font-garamond italic text-2xl text-encre leading-tight">
              {poeme.titre ?? (
                <span className="opacity-40">Sans titre — tap pour nommer</span>
              )}
            </p>
            <p className="nav-discrete mt-1 opacity-0 group-hover:opacity-60 transition-opacity">
              ✎ Renommer
            </p>
          </button>
        )}
      </div>

      <SeparateurOr />

      <motion.div
        className="my-8 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {lignes.map((ligne, i) => (
          <p key={i} className="vers-jeu leading-relaxed">
            {ligne || ' '}
          </p>
        ))}
      </motion.div>

      <SeparateurOr />

      <button
        onClick={() => setCasesVisibles(v => !v)}
        className="nav-discrete mt-6 w-full text-center hover:text-encre transition-colors"
      >
        {casesVisibles ? '↑ Masquer les cases' : '↓ Voir case par case'}
      </button>

      <AnimatePresence>
        {casesVisibles && (
          <motion.div
            className="mt-4 space-y-4"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {poeme.cases.map((c, i) => (
              <div key={i} className="border-l-2 border-or/30 pl-4 py-1">
                <p className="nav-discrete mb-1">
                  {c.fonction}
                  <span className="mx-2 opacity-40">—</span>
                  <span className="italic">
                    {c.auteur === 'ia' ? 'une voix' : 'toi'}
                  </span>
                </p>
                <p className="font-cormorant italic text-encre text-lg leading-snug">
                  {c.texte}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 flex flex-col items-center gap-4">
        <button onClick={() => navigate('/config')} className="btn-primaire">
          Nouvelle partie
        </button>

        <AnimatePresence mode="wait">
          {!confirmSuppression ? (
            <motion.button
              key="suppr"
              onClick={() => setConfirmSuppression(true)}
              className="nav-discrete hover:text-encre transition-colors"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Supprimer ce poème
            </motion.button>
          ) : (
            <motion.div
              key="confirm"
              className="flex gap-6 items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="nav-discrete">Supprimer définitivement ?</span>
              <button
                onClick={supprimer}
                className="nav-discrete text-red-400 hover:text-red-600 transition-colors"
              >
                Oui
              </button>
              <button
                onClick={() => setConfirmSuppression(false)}
                className="nav-discrete hover:text-encre transition-colors"
              >
                Non
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
