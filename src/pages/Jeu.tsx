import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'

export default function Jeu() {
  const navigate = useNavigate()
  return (
    <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
      <p className="vers-jeu text-center opacity-60">La boucle de jeu sera construite à l'Étape 4.</p>
      <p className="font-cormorant italic text-gris mt-4 text-sm text-center">Les voix sont silencieuses pour l'instant.</p>
      <button onClick={() => navigate('/')} className="nav-discrete mt-12 hover:text-encre transition-colors">← Retour</button>
    </PageTransition>
  )
}
