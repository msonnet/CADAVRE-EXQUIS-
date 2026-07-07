import { useState, useEffect } from 'react'

/**
 * Détecte l'ouverture du clavier virtuel via visualViewport.
 * iOS ne réduit pas 100dvh quand le clavier s'ouvre : un layout qui pousse
 * son CTA en bas de page le retrouve masqué. Quand ce hook renvoie true,
 * la page replie ses espaceurs pour remonter le bouton au-dessus du clavier.
 */
export function useClavierOuvert(): boolean {
  const [ouvert, setOuvert] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const mesurer = () => {
      // 120px de marge : les barres d'outils iOS ne comptent pas comme clavier
      setOuvert(window.innerHeight - vv.height > 120)
    }
    vv.addEventListener('resize', mesurer)
    mesurer()
    return () => vv.removeEventListener('resize', mesurer)
  }, [])

  return ouvert
}
