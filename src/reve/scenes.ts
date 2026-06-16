/**
 * scenes.ts — manifest des décors illustrés en calques (image IA + parallaxe),
 * complément de collages.tsx (qui reste pour les petites icônes/cartels SVG).
 *
 * Chaque calque est un PNG/WebP/AVIF généré par scripts/generer-decor.mjs,
 * détouré sur fond papier (#ede2c8, même teinte que collages.tsx) puis exporté
 * en alpha. Toujours en encre monochrome : un seul jeu d'images sert aux 5
 * ambiances grâce au filtre invert() déjà utilisé sur les symboles (Decor.tsx).
 *
 * Tant qu'un calque n'a pas été généré (pas de FAL_KEY en local), SceneDecor
 * masque silencieusement l'image manquante — l'écran retombe sur le fond
 * plat actuel, rien ne casse.
 */

export interface SceneLayer {
  /** nom de fichier sans extension, dans public/scenes/<scene>/ */
  src: string
  /** amplitude de la parallaxe (0 = fixe, 1 = suit pleinement le mouvement) */
  depth: number
  /** mode de fusion CSS — 'screen' pour les calques de lumière */
  blend?: 'normal' | 'screen' | 'multiply'
  opacity?: number
  /** applique le même filtre invert(1) que les symboles en ambiance sombre */
  invertOnDark?: boolean
  /** dérive lente en boucle (atmosphère), indépendante de la parallaxe pointeur */
  driftS?: number
}

export interface SceneDef {
  id: string
  layers: SceneLayer[]
}

export const SCENES: Record<string, SceneDef> = {
  accueil: {
    id: 'accueil',
    layers: [
      { src: 'bg',        depth: 0.015, invertOnDark: true },
      { src: 'decor',     depth: 0.05,  invertOnDark: true, driftS: 26 },
      { src: 'particules', depth: 0.09, invertOnDark: true, opacity: 0.5, driftS: 18 },
      { src: 'light',     depth: 0,     blend: 'screen', opacity: 0.4, driftS: 14 },
    ],
  },
}
