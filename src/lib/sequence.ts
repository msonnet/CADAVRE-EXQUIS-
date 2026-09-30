/**
 * L'ordre des mains dans une partie jouée sur un téléphone.
 *
 * Sorti de `Jeu.tsx` pour être mesuré : c'est lui qui décide ce que la
 * partie Découverte montre d'une voix, et donc ce qu'un joueur tout neuf
 * comprend du jeu.
 *
 * Aucune importation : se mesure seul.
 */

export type Participant = { type: 'humain'; num: number } | { type: 'ia' }

/**
 * Construit la séquence de participants qui se répète sur toute la partie.
 * H et IA sont entrelacés autant que possible : H1, IA, H2, IA, H3…
 * En solo, premierJoueur détermine si H ou IA ouvre.
 */
export function buildSequence(
  joueursHumains: number,
  voixIA: number,
  premierJoueur: 'humain' | 'ia'
): Participant[] {
  const nb = Math.max(1, joueursHumains)
  const H: Participant[] = Array.from({ length: nb }, (_, i) => ({ type: 'humain' as const, num: i + 1 }))
  const I: Participant[] = Array.from({ length: voixIA }, () => ({ type: 'ia' as const }))

  if (I.length === 0) return H

  // Entrelacement : le tableau le plus court s'intercale dans le plus long
  const first  = nb >= I.length ? H : I
  const second = nb >= I.length ? I : H
  const seq: Participant[] = []
  for (let i = 0; i < first.length; i++) {
    seq.push(first[i])
    if (i < second.length) seq.push(second[i])
  }

  // Rotation : garantir que le bon type ouvre la séquence.
  // Uniquement en solo — en multijoueur elle inverserait l'ordre des joueurs
  // (Joueur 2 avant Joueur 1) et casserait l'entrelacement.
  if (nb === 1) {
    if (premierJoueur === 'humain' && seq[0].type !== 'humain') {
      const idx = seq.findIndex(p => p.type === 'humain')
      if (idx > 0) return [...seq.slice(idx), ...seq.slice(0, idx)]
    } else if (premierJoueur === 'ia' && seq[0].type !== 'ia') {
      const idx = seq.findIndex(p => p.type === 'ia')
      if (idx > 0) return [...seq.slice(idx), ...seq.slice(0, idx)]
    }
  }

  return seq
}
