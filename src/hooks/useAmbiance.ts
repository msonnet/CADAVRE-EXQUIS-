import { useState, useCallback } from 'react'
import { sonsActifs, reglerSons } from '../audio/papier'

/**
 * L'ambiance sonore reste coupée — silence total, sur demande. Mais le
 * bouton son de l'écran de jeu et du studio ne coupait RIEN : il basculait
 * un état que personne ne lisait. Il règle désormais les effets sonores,
 * pour de vrai, et le choix se retrouve d'un écran à l'autre.
 */
export function useAmbiance() {
  const [muted, setMuted] = useState(() => !sonsActifs())
  const start = useCallback(() => {}, [])
  const stop = useCallback(() => {}, [])
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      reglerSons(!next)
      return next
    })
  }, [])
  return { start, stop, toggleMute, muted }
}
