import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'

export default function FinDePartie() {
  const navigate = useNavigate()
  return (
    <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
      <h2 className="font-garamond italic text-2xl text-encre mb-4">Fin de partie</h2>
      <p className="vers-jeu text-center opacity-60">Le poème sera révélé ici à l'Étape 4.</p>
      <button onClick={() => navigate('/')} className="nav-discrete mt-12 hover:text-encre transition-colors">← Accueil</button>
    </PageTransition>
  )
}
