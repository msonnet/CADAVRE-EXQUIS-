import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'

export default function Reglages() {
  const navigate = useNavigate()
  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button onClick={() => navigate('/')} className="nav-discrete mb-8 flex items-center gap-2 hover:text-encre transition-colors">← Accueil</button>
      <h2 className="font-garamond italic text-2xl text-encre mb-1">Réglages</h2>
      <p className="sous-titre mb-6">Préférences de l'application</p>
      <SeparateurOr />
      <div className="flex flex-col gap-6 py-4">
        <div className="flex flex-col gap-1"><span className="consigne-grammaticale">Audio ambiant</span><span className="font-lora text-gris text-sm">Configuré à l'Étape 7</span></div>
        <div className="flex flex-col gap-1"><span className="consigne-grammaticale">Voix de lecture</span><span className="font-lora text-gris text-sm">Configuré à l'Étape 7</span></div>
        <div className="flex flex-col gap-1"><span className="consigne-grammaticale">Validation grammaticale</span><span className="font-lora text-gris text-sm">Configuré à l'Étape 9</span></div>
        <div className="flex flex-col gap-1"><span className="consigne-grammaticale">Export JSON</span><span className="font-lora text-gris text-sm">Disponible à l'Étape 9</span></div>
      </div>
      <SeparateurOr />
      <p className="font-lora text-gris text-xs text-center opacity-60 mt-4">Cadavre Exquis v1.0 — Phase 1<br />Aucun tracking. Aucun compte. Tout reste local.</p>
    </PageTransition>
  )
}
