import { useState, useCallback } from 'react'

const KEY_ACTIF = 'tutoriel-actif'
const KEY_ETAPE = 'tutoriel-etape'
export const TUTORIEL_TOTAL = 9

// Step indices — used across pages to coordinate
export const T_JEU_1       = 0  // First human fragment (Jeu.tsx)
export const T_JEU_IA      = 1  // IA turn (Jeu.tsx)
export const T_JEU_2       = 2  // Second human fragment (Jeu.tsx)
export const T_FIN_REVEL   = 3  // Revelation (FinDePartie.tsx)
export const T_FIN_IMAGE   = 4  // Generate image (FinDePartie.tsx)
export const T_FIN_SHARE   = 5  // Share (FinDePartie.tsx)
export const T_FIN_RECUEIL = 6  // Seal to library (FinDePartie.tsx)
export const T_BIBLIO      = 7  // Biblioteca step (Bibliotheque.tsx)
export const T_DETAIL      = 8  // Publish to gallery (PoemeDetail.tsx)

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
