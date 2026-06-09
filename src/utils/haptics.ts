// Haptique légère, dégradation silencieuse là où non supporté (iOS Safari ignore vibrate).
// Au build natif, on pourra brancher @capacitor/haptics ici sans changer les appels.

type Motif = 'tick' | 'battement' | 'devoilement'

const MOTIFS: Record<Motif, number | number[]> = {
  tick: 12,
  battement: [0, 30, 90, 30],
  devoilement: [0, 18, 50, 18, 50, 120],
}

export function vibrer(motif: Motif): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(MOTIFS[motif])
    }
  } catch {
    /* non bloquant */
  }
}
