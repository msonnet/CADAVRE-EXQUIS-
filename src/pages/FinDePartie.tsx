import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoemes, sauvegarderIllustration } from '../db'
import type { Poeme } from '../types'
import { useTTS } from '../hooks/useTTS'
import { useSound } from '../hooks/useSound'
import { genererIllustration } from '../api/illustration'
import { Decor } from '../reve'

const STYLES = [
  { id: 'aquarelle',     label: 'Aquarelle' },
  { id: 'fusain',        label: 'Fusain' },
  { id: 'huile',         label: "Peinture à l'huile" },
  { id: 'encre',         label: 'Encre de Chine' },
  { id: 'gravure',       label: 'Gravure' },
  { id: 'hyperrealisme', label: 'Hyperréalisme' },
  { id: 'libre',         label: 'Libre' },
]

export default function FinDePartie() {
  const navigate = useNavigate()
  const location = useLocation()
  const [poeme, setPoeme] = useState<Poeme | null>(
    (location.state as { poeme?: Poeme } | null)?.poeme ?? null
  )
  const [casesVisibles, setCasesVisibles] = useState(false)
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null)
  const [styleChoisi, setStyleChoisi] = useState<string | null>(null)
  const [promptLibre, setPromptLibre] = useState('')
  const [generatingIllustration, setGeneratingIllustration] = useState(false)
  const [erreurIllustration, setErreurIllustration] = useState<string | null>(null)
  const [changerMedium, setChangerMedium] = useState(false)
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

  useEffect(() => {
    if (poeme?.illustration) {
      setIllustrationUrl(poeme.illustration.url)
      setStyleChoisi(poeme.illustration.style)
    }
  }, [poeme?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function choisirStyle(style: string) {
    if (!poeme || generatingIllustration) return
    setStyleChoisi(style)
    setErreurIllustration(null)
    setChangerMedium(false)
    setGeneratingIllustration(true)

    const structure = getStructure(poeme.structureId)
    const texte = reconstruirePoeme(poeme.cases, structure)
    const pl = promptLibre.trim() || undefined

    genererIllustration(texte, style, pl)
      .then(url => {
        if (url) {
          setIllustrationUrl(url)
          const illustration = { url, style, promptLibre: pl, promptUtilise: texte, dateGeneration: Date.now() }
          sauvegarderIllustration(poeme.id, illustration).catch(console.error)
        } else {
          setErreurIllustration('Illustration indisponible — vérifiez votre connexion')
          setStyleChoisi(null)
        }
      })
      .finally(() => setGeneratingIllustration(false))
  }

  function relancer() {
    if (styleChoisi) choisirStyle(styleChoisi)
  }

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

  const labelStyle = STYLES.find(s => s.id === styleChoisi)?.label

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <Decor variant="fin" />
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

      {/* ── Zone illustration ── */}

      {/* Image générée — visible même pendant régénération, atténuée */}
      {illustrationUrl && (
        <motion.div
          className="my-6 flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={illustrationUrl}
            alt="Illustration du poème"
            className="w-full max-w-xs rounded-sm border border-or/20 transition-opacity duration-500"
            style={{ filter: 'contrast(0.97)', opacity: generatingIllustration ? 0.4 : 1 }}
          />
          {labelStyle && !generatingIllustration && (
            <p className="nav-discrete opacity-50">{labelStyle}</p>
          )}
        </motion.div>
      )}

      {/* Spinner pendant génération */}
      <AnimatePresence>
        {generatingIllustration && (
          <motion.div
            key="spinner"
            className="flex flex-col items-center gap-2 my-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="text-or text-2xl"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              ✦
            </motion.span>
            <p className="nav-discrete">
              {labelStyle} en cours…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contrôles post-génération */}
      {illustrationUrl && !generatingIllustration && (
        <motion.div
          className="flex justify-center gap-6 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={relancer}
            className="nav-discrete hover:text-encre transition-colors"
          >
            ↺ Relancer
          </button>
          <button
            onClick={() => setChangerMedium(v => !v)}
            className="nav-discrete hover:text-encre transition-colors"
          >
            {changerMedium ? '↑ Fermer' : '⊞ Changer'}
          </button>
        </motion.div>
      )}

      {/* Sélecteur — affiché si pas encore d'image OU si le joueur veut changer */}
      <AnimatePresence>
        {(!illustrationUrl || changerMedium) && !generatingIllustration && (
          <motion.div
            key="picker"
            className="my-4"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ delay: illustrationUrl ? 0 : 1.3, duration: 0.25 }}
          >
            {!illustrationUrl && (
              <p className="nav-discrete text-center mb-4">Illustrer ce poème</p>
            )}

            <div className="mb-5">
              <input
                type="text"
                value={promptLibre}
                onChange={e => setPromptLibre(e.target.value)}
                placeholder="Direction artistique libre… (ex. : sombre et organique, couleurs acides)"
                className="champ-carnet w-full text-sm"
              />
            </div>

            {erreurIllustration && (
              <p className="nav-discrete text-center opacity-50 mb-3 italic">{erreurIllustration}</p>
            )}
            <div className="flex flex-col gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => choisirStyle(s.id)}
                  className={`nav-discrete py-3 border transition-all ${
                    styleChoisi === s.id && illustrationUrl
                      ? 'border-or/60 text-encre'
                      : 'border-gris-clair/30 text-encre hover:border-or/60 hover:text-encre'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SeparateurOr />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
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
              const iaNum = c.voixSlot ?? poeme.cases.slice(0, i).filter(x => x.auteur === 'ia').length + 1
              return (
              <div key={i} className="border-l-2 border-or/30 pl-4 py-1">
                <p className="nav-discrete mb-1">
                  {c.fonction}
                  <span className="mx-2 opacity-40">—</span>
                  <span className="italic">
                    {c.auteur === 'ia' ? `voix ${iaNum}` : c.joueurNumero ? `joueur ${c.joueurNumero}` : 'toi'}
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
