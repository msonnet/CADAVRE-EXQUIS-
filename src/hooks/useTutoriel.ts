import { useState, useCallback } from 'react'

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

  const actif = etape >= 0

  const avancer = useCallback(() => {
    setEtapeState(prev => {
      const next = prev + 1
      if (next >= TUTORIEL_TOTAL) {
        sessionStorage.removeItem(KEY_ACTIF)
        sessionStorage.removeItem(KEY_ETAPE)
        return -1
      }
      sessionStorage.setItem(KEY_ETAPE, String(next))
      return next
    })
  }, [])

  const terminer = useCallback(() => {
    sessionStorage.removeItem(KEY_ACTIF)
    sessionStorage.removeItem(KEY_ETAPE)
    setEtapeState(-1)
  }, [])

  return { etape, actif, avancer, terminer }
}
