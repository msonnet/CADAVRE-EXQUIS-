import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { inject as injectAnalytics } from '@vercel/analytics'
import App from './App'
import './index.css'

injectAnalytics()

// Journalise les erreurs non gérées sans jamais détruire la page —
// un hoquet bénin (ex : session audio iOS interrompue) ne doit pas
// effacer l'application. Les erreurs de rendu fatales passent par
// l'ErrorBoundary de App.tsx.
window.addEventListener('error', (e) => {
  console.error('Erreur JS non gérée :', e.message, `${e.filename}:${e.lineno}`, e.error?.stack ?? '')
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('Promesse rejetée non gérée :', e.reason)
  e.preventDefault()
})

// Mise à jour non intrusive : on ne recharge JAMAIS en pleine partie.
// Quand une nouvelle version est prête, on la mémorise et on l'applique
// silencieusement lorsque l'utilisateur quitte l'onglet (page masquée),
// pour qu'il retrouve la version à jour au prochain retour.
let nouvelleVersionPrete = false
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    nouvelleVersionPrete = true
  },
  onOfflineReady() {},
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && nouvelleVersionPrete) {
    nouvelleVersionPrete = false
    updateSW(true)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
