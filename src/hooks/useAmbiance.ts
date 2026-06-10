import { useState, useCallback } from 'react'

// Ambiance sonore désactivée (silence total sur demande utilisateur).
// L'interface reste intacte pour compatibilité avec les pages existantes.
export function useAmbiance() {
  const [muted, setMuted] = useState(true)
  const start = useCallback(() => {}, [])
  const stop = useCallback(() => {}, [])
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      localStorage.setItem('ambiance-muted', String(next))
      return next
    })
  }, [])
  return { start, stop, toggleMute, muted }
}
