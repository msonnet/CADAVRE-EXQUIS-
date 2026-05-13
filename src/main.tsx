import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// immediate: true → enregistrement avant l'événement 'load', utile sur iOS
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload()
  },
  onOfflineReady() {},
})

// iOS PWA : le SW ne vérifie pas les mises à jour quand l'app revient au premier plan.
// On force la vérification à chaque retour de l'arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateSW()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
