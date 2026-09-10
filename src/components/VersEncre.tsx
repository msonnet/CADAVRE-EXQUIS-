import React from 'react'
import { motion } from 'framer-motion'

/**
 * Un vers qui s'écrit.
 *
 * Le fondu est le vocabulaire du chargement. Ici le vers est découvert par un
 * masque qui court de gauche à droite, mot après mot, à la vitesse d'une main :
 * il ne paraît pas, il s'écrit.
 *
 * ── Pourquoi par MOT et jamais par lettre ────────────────────────────────
 *
 * Par lettre, un poème d'atelier de trente-sept vers ferait près de mille
 * nœuds animés — un vieil iPhone n'y survit pas. Par mot, on est à cent
 * quatre-vingts, et le geste reste celui de l'écriture. Le mot est aussi
 * l'unité qui résiste au retour à la ligne : un masque unique par vers
 * découvrirait les deux rangées d'un vers replié en même temps, ce qui ne
 * ressemble à rien.
 *
 * Seuls `clip-path` et `opacity` sont animés : le compositeur les prend en
 * charge, la mise en page n'est jamais recalculée.
 */

interface Props {
  texte: string
  /** Instant du premier mot, en secondes. */
  debut: number
  /** Temps que met l'encre à traverser tout le vers, en secondes. */
  duree: number
  /** Le vers est déjà écrit — mouvement réduit, ou dévoilement sauté. */
  immediat?: boolean
  /** Rendu devant le premier mot : la lettrine. */
  avant?: React.ReactNode
  style?: React.CSSProperties
}

/** La durée du masque sur un mot pris seul. */
const MOT_MIN = 0.13
const MOT_MAX = 0.28
/** Les masques se chevauchent : sans quoi on lit une machine à écrire. */
const CHEVAUCHEMENT = 1.9

export default function VersEncre({ texte, debut, duree, immediat, avant, style }: Props) {
  // On garde les espaces dans le découpage — ils ne s'animent pas, mais ils
  // portent le retour à la ligne.
  const jetons = texte.length ? texte.split(/(\s+)/) : []
  const nMots = jetons.filter(j => j.trim().length > 0).length
  const parMot = nMots > 0 ? duree / nMots : 0
  const dureeMot = Math.min(MOT_MAX, Math.max(MOT_MIN, parMot * CHEVAUCHEMENT))

  let rang = -1

  return (
    <span style={{ display: 'block', minHeight: '1.65em', ...style }}>
      {avant}
      {jetons.length === 0 ? ' ' : jetons.map((jeton, i) => {
        if (!jeton.trim()) return <React.Fragment key={i}>{jeton}</React.Fragment>
        rang++
        const delai = debut + rang * parMot
        return (
          <motion.span
            key={i}
            style={{ display: 'inline-block', willChange: 'clip-path' }}
            initial={immediat ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
            animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
            transition={immediat ? { duration: 0, delay: 0 } : {
              delay: delai,
              duration: dureeMot,
              ease: [0.32, 0.7, 0.28, 1],
              // L'opacité rattrape le masque à mi-course : le mot n'apparaît
              // pas d'un bloc au moment où le masque le libère.
              opacity: { delay: delai, duration: dureeMot * 0.45 },
            }}
          >
            {jeton}
          </motion.span>
        )
      })}
    </span>
  )
}
