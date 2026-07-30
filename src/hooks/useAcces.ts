import { useState, useEffect, useCallback } from 'react'
import { lireAcces, type EtatAcces } from '../lib/acces'

export interface AccesHook {
  etat: EtatAcces | null
  chargement: boolean
  rafraichir: () => Promise<void>
}

/** État d'accès du joueur — abonnement en cours et réserve d'essai restante. */
export function useAcces(): AccesHook {
  const [etat, setEtat] = useState<EtatAcces | null>(null)
  const [chargement, setChargement] = useState(true)

  const rafraichir = useCallback(async () => {
    setChargement(true)
    setEtat(await lireAcces())
    setChargement(false)
  }, [])

  useEffect(() => { rafraichir() }, [rafraichir])

  return { etat, chargement, rafraichir }
}
