import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'

export default function Reglages() {
  const navigate = useNavigate()
  const [sonActif, setSonActif] = useState(() => localStorage.getItem('ambiance-muted') !== 'true')

  function toggleSon() {
    const next = !sonActif
    setSonActif(next)
    localStorage.setItem('ambiance-muted', String(!next))
  }

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button onClick={() => navigate('/')} className="nav-discrete mb-8 hover:text-encre transition-colors">
        ← Accueil
      </button>

      <h2 className="font-garamond italic text-2xl text-encre mb-1">Réglages</h2>
      <p className="sous-titre mb-6">Préférences de l'application</p>

      <SeparateurOr />

      <div className="flex flex-col gap-8 py-6">
        {/* Audio ambiant */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="consigne-grammaticale">Audio ambiant</span>
            <span className="font-lora text-gris text-sm">
              Drone atmosphérique pendant le jeu
            </span>
          </div>
          <button
            onClick={toggleSon}
            className={`w-12 h-6 rounded-full transition-colors duration-300 relative flex-shrink-0 ${
              sonActif ? 'bg-or/60' : 'bg-gris/30'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-encre transition-transform duration-300 ${
                sonActif ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Voix de lecture */}
        <div className="flex flex-col gap-0.5">
          <span className="consigne-grammaticale">Voix de lecture</span>
          <span className="font-lora text-gris text-sm">
            Bouton ▶ Écouter disponible sur chaque poème terminé
          </span>
        </div>

        {/* À venir */}
        <div className="flex flex-col gap-0.5 opacity-40">
          <span className="consigne-grammaticale">Validation grammaticale</span>
          <span className="font-lora text-gris text-sm">Disponible prochainement</span>
        </div>

        <div className="flex flex-col gap-0.5 opacity-40">
          <span className="consigne-grammaticale">Export JSON</span>
          <span className="font-lora text-gris text-sm">Disponible prochainement</span>
        </div>
      </div>

      <SeparateurOr />

      <p className="font-lora text-gris text-xs text-center opacity-60 mt-4">
        Cadavre Exquis v1.0<br />
        Aucun tracking. Aucun compte. Tout reste local.
      </p>
    </PageTransition>
  )
}
