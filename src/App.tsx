import React, { Component, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ReveProvider } from './reve'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error
      return (
        <div style={{ padding: 32, fontFamily: "'Raleway', sans-serif", fontSize: 17, color: '#b22c20' }}>
          <div style={{ marginBottom: 12, fontWeight: 700 }}>ERREUR APPLICATION</div>
          <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.8 }}>{e.message}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
            RECHARGER
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import SplashScreen from './components/SplashScreen'
const Accueil = React.lazy(() => import('./pages/Accueil'))
const Decouverte = React.lazy(() => import('./pages/Decouverte'))
const Configuration = React.lazy(() => import('./pages/Configuration'))
const ConfigurationDessin = React.lazy(() => import('./pages/ConfigurationDessin'))
const Jeu = React.lazy(() => import('./pages/Jeu'))
const JeuDessin = React.lazy(() => import('./pages/JeuDessin'))
const Atelier = React.lazy(() => import('./pages/Atelier'))
const JeuAtelier = React.lazy(() => import('./pages/JeuAtelier'))
const FinDePartie = React.lazy(() => import('./pages/FinDePartie'))
const FinDessin = React.lazy(() => import('./pages/FinDessin'))
const Bibliotheque = React.lazy(() => import('./pages/Bibliotheque'))
const Galerie = React.lazy(() => import('./pages/Galerie'))
const ProfilPublic = React.lazy(() => import('./pages/ProfilPublic'))
const PoemeDetail = React.lazy(() => import('./pages/PoemeDetail'))
const DessinDetail = React.lazy(() => import('./pages/DessinDetail'))
const Reglages = React.lazy(() => import('./pages/Reglages'))
const Aide = React.lazy(() => import('./pages/Aide'))
const Online = React.lazy(() => import('./pages/Online'))
const Profil = React.lazy(() => import('./pages/Profil'))
const Salon = React.lazy(() => import('./pages/Salon'))
const JeuOnline = React.lazy(() => import('./pages/JeuOnline'))
const FinOnline = React.lazy(() => import('./pages/FinOnline'))
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'))
const PoemeDuJour = React.lazy(() => import('./pages/PoemeDuJour'))
const Privacy = React.lazy(() => import('./pages/Privacy'))

const PageFallback = () => (
  <div style={{
    minHeight: '100dvh',
    background: 'var(--reve-bg, #15110d)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <span style={{
      fontSize: 18,
      color: 'var(--reve-accent, #b22c20)',
      fontFamily: "'Raleway', sans-serif",
      letterSpacing: '0.18em',
      opacity: 0.7,
    }}>✦</span>
  </div>
)

export default function App() {
  return (
    <ErrorBoundary>
    <ReveProvider>
      <SplashScreen />
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Accueil />} />
              <Route path="/decouverte" element={<Decouverte />} />
              <Route path="/config" element={<Configuration />} />
              <Route path="/config-dessin" element={<ConfigurationDessin />} />
              <Route path="/jeu" element={<Jeu />} />
              <Route path="/jeu-dessin" element={<JeuDessin />} />
              <Route path="/atelier" element={<Atelier />} />
              <Route path="/jeu-atelier" element={<JeuAtelier />} />
              <Route path="/fin" element={<FinDePartie />} />
              <Route path="/fin-dessin" element={<FinDessin />} />
              <Route path="/bibliotheque" element={<Bibliotheque />} />
              <Route path="/galerie" element={<Galerie />} />
              <Route path="/u/:pseudo" element={<ProfilPublic />} />
              <Route path="/bibliotheque/dessin/:id" element={<DessinDetail />} />
              <Route path="/bibliotheque/:id" element={<PoemeDetail />} />
              <Route path="/reglages" element={<Reglages />} />
              <Route path="/aide" element={<Aide />} />
              <Route path="/online" element={<Online />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/salon/:code" element={<Salon />} />
              <Route path="/jeu-online/:code" element={<JeuOnline />} />
              <Route path="/fin-online/:code" element={<FinOnline />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/poeme-du-jour" element={<PoemeDuJour />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </BrowserRouter>
    </ReveProvider>
    </ErrorBoundary>
  )
}
