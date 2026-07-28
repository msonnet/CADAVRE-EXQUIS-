import React, { Component, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ReveProvider } from './reve'
import { tr } from './i18n'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }

  // La trace part en console : retirer le détail technique de l'écran ne doit
  // pas le faire disparaître du débogage (TestFlight, Xcode, console web).
  componentDidCatch(error: Error, info: unknown) {
    console.error('[Cadavre Exquis] erreur non rattrapée', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: 'var(--reve-bg, #15110d)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 18, padding: '32px 28px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, color: 'var(--reve-accent, #b22c20)' }} aria-hidden>✦</div>
          <div style={{
            fontFamily: "'Bodoni Moda', serif", fontWeight: 900,
            fontSize: 'clamp(1.5rem, 7vw, 2rem)', lineHeight: 1.15,
            color: 'var(--reve-ink, #e8d4b8)',
          }}>
            {tr("Le carnet s'est déchiré.", 'The notebook tore.')}
          </div>
          <p style={{
            fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 17,
            color: 'var(--reve-ink, #e8d4b8)', opacity: 0.8, maxWidth: 320, lineHeight: 1.5,
          }}>
            {tr('Une page a manqué. Tes poèmes sont intacts.', 'A page went missing. Your poems are safe.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 6, padding: '0.9em 2em', cursor: 'pointer', border: 'none', borderRadius: 3,
              background: 'var(--reve-accent, #b22c20)', color: 'var(--reve-bg, #15110d)',
              fontFamily: "'Raleway', sans-serif", fontSize: 13,
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}
          >
            {tr('Rouvrir le carnet', 'Reopen the notebook')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import SplashScreen from './components/SplashScreen'
import AndroidBackHandler from './components/AndroidBackHandler'
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
        <AndroidBackHandler />
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
