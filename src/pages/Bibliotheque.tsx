import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'

export default function Bibliotheque() {
  const navigate = useNavigate()
  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button onClick={() => navigate('/')} className="nav-discrete mb-8 flex items-center gap-2 hover:text-encre transition-colors">← Accueil</button>
      <h2 className="font-garamond italic text-2xl text-encre mb-1">Mes poèmes</h2>
      <p className="sous-titre mb-6">Ta bibliothèque personnelle</p>
      <SeparateurOr />
      <div className="flex flex-col items-center justify-center py-20">
        <p className="vers-jeu text-center opacity-40">Aucun poème pour l'instant.</p>
        <p className="font-lora text-gris text-sm mt-4 text-center">La bibliothèque sera pleinement opérationnelle à l'Étape 5.</p>
      </div>
    </PageTransition>
  )
}
