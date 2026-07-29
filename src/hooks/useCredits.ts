import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/apiBase'

/**
 * Solde de crédits d'illustration.
 *
 * Le solde vit sur le serveur — ce hook ne fait que le lire et le refléter.
 * Aucune écriture locale : un solde en localStorage s'éditerait en dix
 * secondes, et chaque image coûte de l'argent réel.
 *
 * Le mode solo n'exigeait jusqu'ici aucun compte. On ouvre donc une identité
 * anonyme (sans e-mail, sans mot de passe, sans pseudo) au premier besoin de
 * crédits : c'est un porte-monnaie attaché à l'appareil, pas un compte.
 */
export interface EtatCredits {
  solde: number | null       // null tant que le solde n'a pas été lu
  allocationMensuelle: number
  chargement: boolean
  erreur: boolean
}

/** Ouvre une session anonyme si aucune n'existe. Renvoie le jeton, ou null. */
export async function jetonOuIdentiteAnonyme(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session.access_token
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.session) return null
  return data.session.access_token
}

export function useCredits() {
  const [etat, setEtat] = useState<EtatCredits>({
    solde: null, allocationMensuelle: 3, chargement: false, erreur: false,
  })

  const rafraichir = useCallback(async () => {
    setEtat(e => ({ ...e, chargement: true, erreur: false }))
    try {
      const jeton = await jetonOuIdentiteAnonyme()
      if (!jeton) { setEtat(e => ({ ...e, chargement: false, erreur: true })); return }
      const r = await fetch(api('/api/credits'), { headers: { Authorization: `Bearer ${jeton}` } })
      if (!r.ok) { setEtat(e => ({ ...e, chargement: false, erreur: true })); return }
      const { solde, allocationMensuelle } = await r.json()
      setEtat({
        solde: typeof solde === 'number' ? solde : 0,
        allocationMensuelle: allocationMensuelle ?? 3,
        chargement: false, erreur: false,
      })
    } catch {
      setEtat(e => ({ ...e, chargement: false, erreur: true }))
    }
  }, [])

  useEffect(() => { rafraichir() }, [rafraichir])

  /** Reflète localement un solde renvoyé par une génération, sans re-requête. */
  const poser = useCallback((solde: number) => {
    setEtat(e => ({ ...e, solde }))
  }, [])

  return { ...etat, rafraichir, poser }
}
