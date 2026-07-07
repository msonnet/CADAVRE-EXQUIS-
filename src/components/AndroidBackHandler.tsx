import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * Bouton retour matériel Android (Capacitor).
 * Sans ce listener, le retour ferme brutalement l'app quelle que soit la page.
 * — à l'accueil : quitte l'app (comportement attendu)
 * — ailleurs : remonte l'historique (les parties en cours sont protégées
 *   par leurs brouillons : brouillon-actuel, dessin-brouillon)
 * Sur le web et iOS ce composant ne fait rien.
 */
export default function AndroidBackHandler() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (location.pathname === '/') {
        CapApp.exitApp()
      } else if (canGoBack) {
        navigate(-1)
      } else {
        navigate('/')
      }
    })
    return () => { sub.then(h => h.remove()).catch(() => {}) }
  }, [location.pathname, navigate])

  return null
}
