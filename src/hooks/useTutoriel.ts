import { useState, useCallback, useRef } from 'react'

const KEY_ACTIF = 'tutoriel-actif'
const KEY_ETAPE = 'tutoriel-etape'
export const TUTORIEL_TOTAL = 9

export const T_JEU_1       = 0
export const T_JEU_IA      = 1
export const T_JEU_2       = 2
export const T_FIN_REVEL   = 3
export const T_FIN_IMAGE   = 4
export const T_FIN_SHARE   = 5
export const T_FIN_RECUEIL = 6
export const T_BIBLIO      = 7
export const T_DETAIL      = 8
// État transitoire après la dernière étape : panneau de célébration,
// auto-fermé par la page qui le rend (PoemeDetail).
export const T_FETE        = TUTORIEL_TOTAL

export function activerTutoriel() {
  sessionStorage.setItem(KEY_ACTIF, '1')
  sessionStorage.setItem(KEY_ETAPE, '0')
}

export function useTutoriel() {
  const [etape, setEtapeState] = useState<number>(() => {
    if (sessionStorage.getItem(KEY_ACTIF) !== '1') return -1
    const v = sessionStorage.getItem(KEY_ETAPE)
    return v !== null ? parseInt(v) : 0
  })

  // Ref toujours à jour — permet à avancer() d'écrire sessionStorage
  // de façon SYNCHRONE avant toute navigation, sans dépendre du state updater.
  const etapeRef = useRef(etape)
  etapeRef.current = etape

  const actif = etape >= 0 && etape < TUTORIEL_TOTAL
  const fete = etape === T_FETE

  const avancer = useCallback(() => {
    const next = etapeRef.current + 1
    if (next >= TUTORIEL_TOTAL) {
      // Fin du parcours : on nettoie le storage tout de suite (la fête ne
      // survit pas à une navigation) mais on garde l'état local pour la célébration.
      sessionStorage.removeItem(KEY_ACTIF)
      sessionStorage.removeItem(KEY_ETAPE)
      setEtapeState(T_FETE)
    } else {
      // Écriture immédiate : garantit que la page suivante lit la bonne valeur
      sessionStorage.setItem(KEY_ETAPE, String(next))
      setEtapeState(next)
    }
  }, [])

  const terminer = useCallback(() => {
    sessionStorage.removeItem(KEY_ACTIF)
    sessionStorage.removeItem(KEY_ETAPE)
    setEtapeState(-1)
  }, [])

  return { etape, actif, fete, avancer, terminer }
}
