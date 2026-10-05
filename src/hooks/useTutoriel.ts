import { useState, useCallback, useRef } from 'react'

const KEY_ACTIF = 'tutoriel-actif'
const KEY_ETAPE = 'tutoriel-etape'
export const TUTORIEL_TOTAL = 7

/*
  Le parcours comptait neuf étapes, et la fin de partie en prenait quatre :
  la révélation, puis une visite de l'IMAGE, du PARTAGE et du RECUEIL. Il
  faisait visiter des fonctions — l'image payante comprise — sans jamais
  proposer la seule chose qui fait revenir : rejouer, et surtout rejouer À
  PLUSIEURS, la soirée entre amis sur un même téléphone.

  Les trois visites sont remplacées par un seul panneau, « La suite », qui
  propose deux gestes. L'image et le partage restent sur l'écran, sous les
  yeux : ils se découvrent seuls. Le recueil et la publication viennent
  après, pour qui choisit d'y aller.
*/
export const T_JEU_1       = 0
export const T_JEU_IA      = 1
export const T_JEU_2       = 2
export const T_FIN_REVEL   = 3
export const T_FIN_SUITE   = 4
export const T_BIBLIO      = 5
export const T_DETAIL      = 6
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

  /**
   * Va droit à une étape. Le panneau de la suite mène hors de la fin de
   * partie par trois chemins, et tous doivent retrouver le guide au même
   * point — `avancer` ne sait faire qu'un pas.
   */
  const allerA = useCallback((n: number) => {
    sessionStorage.setItem(KEY_ETAPE, String(n))
    setEtapeState(n)
  }, [])

  const terminer = useCallback(() => {
    sessionStorage.removeItem(KEY_ACTIF)
    sessionStorage.removeItem(KEY_ETAPE)
    setEtapeState(-1)
  }, [])

  return { etape, actif, fete, avancer, allerA, terminer }
}
