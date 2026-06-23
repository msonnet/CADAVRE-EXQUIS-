import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { useSound } from '../hooks/useSound'
import { Decor, useReve } from '../reve'
import type { ConfigPartie } from '../types'

const ONBOARDING_KEY = 'cadavre-onboarding-done'

// Partie Découverte : la plus courte possible (phrase courte = 3 fragments),
// le joueur écrit le premier fragment, deux voix IA complètent à l'aveugle, puis
// la révélation. But : faire VIVRE un cadavre exquis complet en ~30 s, sans une
// seule décision de configuration — c'est la révélation qui fait comprendre le jeu.
const CONFIG_DECOUVERTE: ConfigPartie = {
  structureId: 'phrase-simple',
  visibilite: 'aveugle',
  premierJoueur: 'humain',
  mode: 'standard',
  joueursHumains: 1,
  voixIA: 2,
}

export default function Decouverte() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()

  // On marque l'introduction comme vue DÈS l'arrivée : la Découverte ne se
  // relance jamais d'elle-même, même si le joueur l'abandonne en route.
  useEffect(() => {
    try { localStorage.setItem(ONBOARDING_KEY, '1') } catch { /* ignore */ }
  }, [])

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const ui: React.CSSProperties = { fontFamily: "'Raleway', sans-serif" }

  function commencer() {
    jouer('demarrage')
    sessionStorage.setItem('config-partie', JSON.stringify(CONFIG_DECOUVERTE))
    sessionStorage.setItem('decouverte', '1')
    navigate('/jeu')
  }

  function passer() {
    navigate('/', { replace: true })
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="aide" hideSignature />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1 justify-center">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div style={{ ...ui, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 14 }}>
            — BIENVENUE —
          </div>

          <div
            className="font-fraunces font-black"
            style={{ fontSize: 'clamp(2.6rem, 11vw, 3.6rem)', lineHeight: 0.95, letterSpacing: '-0.02em', color: encre, marginBottom: 20 }}
          >
            Le cadavre<br /><span style={{ color: accent }}>exquis.</span>
          </div>

          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 20, lineHeight: 1.55,
            color: encre, opacity: 0.9, marginBottom: 10,
          }}>
            Écris un fragment sans voir les autres. À la fin, vous découvrez
            ensemble la phrase que vous avez faite à plusieurs.
          </p>

          <p style={{
            fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 17, lineHeight: 1.5,
            color: encre, opacity: 0.55,
          }}>
            Par exemple : « Le chat invisible… »
          </p>
        </motion.div>

        <motion.div
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <button onClick={commencer} className="btn-primaire" style={{ width: '100%' }}>
            Écrire le premier mot →
          </button>
          <button
            onClick={passer}
            style={{
              ...ui, display: 'block', margin: '14px auto 0', fontSize: 13,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: encre, opacity: 0.5,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            Explorer d'abord
          </button>
        </motion.div>

      </div>
    </PageTransition>
  )
}
