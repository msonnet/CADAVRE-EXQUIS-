import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'

export default function PoemeDetail() {
  const navigate = useNavigate()
  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button onClick={() => navigate('/bibliotheque')} className="nav-discrete mb-8 flex items-center gap-2 hover:text-encre transition-colors">← Mes poèmes</button>
      <p className="vers-jeu opacity-40">Détail du poème — Étape 5.</p>
    </PageTransition>
  )
}
