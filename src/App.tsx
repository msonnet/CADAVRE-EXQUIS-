import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Accueil from './pages/Accueil'
import Configuration from './pages/Configuration'
import Jeu from './pages/Jeu'
import FinDePartie from './pages/FinDePartie'
import Bibliotheque from './pages/Bibliotheque'
import PoemeDetail from './pages/PoemeDetail'
import Reglages from './pages/Reglages'
import Aide from './pages/Aide'

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/config" element={<Configuration />} />
          <Route path="/jeu" element={<Jeu />} />
          <Route path="/fin" element={<FinDePartie />} />
          <Route path="/bibliotheque" element={<Bibliotheque />} />
          <Route path="/bibliotheque/:id" element={<PoemeDetail />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="/aide" element={<Aide />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}
