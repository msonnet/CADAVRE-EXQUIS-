/**
 * Le pli à l'écriture : ce que la bande rabattue laisse voir, et le temps
 * qu'elle met à se rabattre.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * « Sceller » est le verbe du jeu, et aucun mouvement ne l'accomplissait. Le
 * champ s'écrasait verticalement — `scaleY: 0`, `brightness(0.7)`, 400 ms sur
 * une courbe qui accélère — puis l'écran était coupé : on voyait le fragment
 * se déformer, pas se cacher. Et rien ne disait ce que la visibilité choisie
 * transmettait à la main suivante. Le pli n'existait qu'à la toute fin, au
 * dévoilement ; pendant la partie, on écrivait sur un formulaire.
 *
 * Ce module ne dessine rien, et c'est voulu : il ne porte que ce qui se
 * MESURE — le reste du pli, sa durée, sa courbe, les épaisseurs. `Papier.tsx`
 * et `Rabat.tsx` le dessinent ; `JeuOnline` les posera à son tour.
 */

import type { Visibilite } from '../types'

/**
 * Ce que le pli laisse dépasser d'une bande scellée.
 *
 * C'est UNE fonction pour trois lecteurs, et c'est tout son intérêt : le
 * rabat qui l'affiche sur la tranche, l'écran suivant qui l'affiche sur la
 * lèvre du pli, et la voix qui le reçoit comme contexte. Ce mot resté
 * visible est exactement celui que lira le tour suivant — une copie de la
 * règle par lecteur finirait par en montrer un autre.
 *
 * Aveugle : rien, le pli cache tout. Dernier mot : le dernier mot, tel
 * qu'écrit. Dernière case : la case entière.
 */
export function resteDuPli(texte: string | undefined | null, visibilite: Visibilite): string | null {
  const t = (texte ?? '').trim()
  if (!t) return null
  if (visibilite === 'dernier-mot') {
    const mots = t.split(/\s+/).filter(Boolean)
    return mots[mots.length - 1] ?? null
  }
  if (visibilite === 'derniere-case') return t
  return null
}

/**
 * La durée du rabat, en secondes.
 *
 * Le geste revient à CHAQUE tour : à cinq fragments par partie, une seconde
 * de rabat ferait cinq secondes subies. L'écrasement qu'il remplace durait
 * 0,4 s ; le rabat ne dure pas plus — rien ne doit arriver plus tard
 * qu'avant. Un appui l'abrège, et le mouvement réduit le supprime.
 */
export const DUREE_RABAT = 0.4

/**
 * La courbe du rabat : celle du dépli, retournée — mais pas à la lettre.
 *
 * Le dépli part vite et se pose lentement (`COURBE_DEPLI`). Un volet qu'on
 * rabat fait l'inverse : il quitte la table lentement, puis tombe.
 *
 * Premier jet : le dépli rembobiné exactement, (1 − x2, 1 − y2, 1 − x1,
 * 1 − y1) = (0,76 ; 0 ; 0,84 ; 0,16). Mesuré : 16 % de l'angle parcouru à
 * 70 % du temps. Sur 0,4 s, la bande restait immobile 280 ms puis
 * claquait — ce qui ne se lit pas comme du poids, mais comme une latence :
 * l'appui sur SCELLER semblait ne rien faire. La lente arrivée du dépli
 * dure une seconde et se savoure ; son reflet exact, en 0,4 s, est un temps
 * mort. On garde le sens (lent puis vite) et on ôte le temps mort : 4 % de
 * l'angle dès 80 ms, la moitié vers 70 %, la chute à la fin.
 */
export const COURBE_DEPLI = [0.16, 0.84, 0.24, 1] as const
export const COURBE_RABAT = [0.4, 0, 0.7, 0.4] as [number, number, number, number]

/** Une courbe de Bézier CSS : la part de chemin parcourue au temps t. */
export function avancement(courbe: readonly [number, number, number, number], t: number): number {
  const [x1, y1, x2, y2] = courbe
  const coord = (a: number, b: number, s: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3
  let bas = 0
  let haut = 1
  for (let i = 0; i < 50; i++) {
    const s = (bas + haut) / 2
    if (coord(x1, x2, s) < t) bas = s
    else haut = s
  }
  return coord(y1, y2, (bas + haut) / 2)
}

/** L'angle où la bande s'arrête : le même que celui d'où le dépli part. */
export const ANGLE_RABAT = -92

/**
 * Les épaisseurs d'une feuille pliée vues de face : une par bande rabattue.
 *
 * Le nombre n'est pas décoratif — trois cases scellées, trois tranches. Une
 * feuille qui montre deux épaisseurs après trois tours se dénoncerait comme
 * un décor, exactement comme `FeuilletPlie` le dit de ses volets.
 *
 * La géométrie est celle de `FeuilletPlie` : trois pixels de retrait par
 * épaisseur, chacune plus pâle que la précédente. Au-delà de huit le retrait
 * passe à deux pixels — une partie en vers libre va jusqu'à douze cases, et
 * à trois pixels la dernière tranche aurait perdu soixante-dix pixels sur un
 * écran de 320 : on ne verrait plus une feuille, on verrait un entonnoir.
 */
export interface Tranche { retrait: number; opacite: number }

export function tranchesDuFeuillet(n: number): Tranche[] {
  const k = Math.max(0, Math.floor(n))
  const pas = k > 8 ? 2 : 3
  return Array.from({ length: k }, (_, i) => ({
    retrait: pas + i * pas,
    opacite: 0.16 * (1 - i / (k + 1)),
  }))
}
