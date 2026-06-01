import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Taille de police persistée
const savedScale = localStorage.getItem('font-scale')
if (savedScale) document.documentElement.style.setProperty('--font-scale', savedScale)

// Attrape toute erreur JS non gérée et l'affiche dans la page
window.addEventListener('error', (e) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;font-size:13px;color:#b22c20;white-space:pre-wrap;background:#f5ede0">ERREUR JS:\n${e.message}\n\n${e.filename}:${e.lineno}\n\n${e.error?.stack ?? ''}</pre>`
})
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;font-size:13px;color:#b22c20;white-space:pre-wrap;background:#f5ede0">PROMESSE REJETÉE:\n${e.reason}</pre>`
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
