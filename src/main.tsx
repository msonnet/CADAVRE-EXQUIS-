import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Attrape toute erreur JS non gérée et l'affiche dans la page
window.addEventListener('error', (e) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;font-size:13px;color:#b22c20;white-space:pre-wrap;background:#f5ede0">ERREUR JS:\n${e.message}\n\n${e.filename}:${e.lineno}\n\n${e.error?.stack ?? ''}</pre>`
})
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;font-size:13px;color:#b22c20;white-space:pre-wrap;background:#f5ede0">PROMESSE REJETÉE:\n${e.reason}</pre>`
})

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload()
  },
  onOfflineReady() {},
})

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
