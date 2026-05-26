import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ReveProvider } from './reve'
import SplashScreen from './components/SplashScreen'
import Accueil from './pages/Accueil'
import Configuration from './pages/Configuration'
import ConfigurationDessin from './pages/ConfigurationDessin'
import Jeu from './pages/Jeu'
import JeuDessin from './pages/JeuDessin'
import FinDePartie from './pages/FinDePartie'
import FinDessin from './pages/FinDessin'
import Bibliotheque from './pages/Bibliotheque'
import PoemeDetail from './pages/PoemeDetail'
import DessinDetail from './pages/DessinDetail'
import Reglages from './pages/Reglages'
import Aide from './pages/Aide'
import Online from './pages/Online'
import Profil from './pages/Profil'
import Salon from './pages/Salon'
import JeuOnline from './pages/JeuOnline'
import FinOnline from './pages/FinOnline'

export default function App() {
  return (
    <ReveProvider>
      <SplashScreen />
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/config" element={<Configuration />} />
            <Route path="/config-dessin" element={<ConfigurationDessin />} />
            <Route path="/jeu" element={<Jeu />} />
            <Route path="/jeu-dessin" element={<JeuDessin />} />
            <Route path="/fin" element={<FinDePartie />} />
            <Route path="/fin-dessin" element={<FinDessin />} />
            <Route path="/bibliotheque" element={<Bibliotheque />} />
            <Route path="/bibliotheque/dessin/:id" element={<DessinDetail />} />
            <Route path="/bibliotheque/:id" element={<PoemeDetail />} />
            <Route path="/reglages" element={<Reglages />} />
            <Route path="/aide" element={<Aide />} />
            <Route path="/online" element={<Online />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/salon/:code" element={<Salon />} />
            <Route path="/jeu-online/:code" element={<JeuOnline />} />
            <Route path="/fin-online/:code" element={<FinOnline />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </ReveProvider>
  )
}
