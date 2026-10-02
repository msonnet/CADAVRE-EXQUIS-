import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PANNEAUX_MAX } from '../lib/rythme'
import { FaceFermee } from './Papier'

/**
 * Le feuillet plié — l'état d'avant le dépli.
 *
 * Le poème du jour scellé s'affichait à plat, tout de suite. On lisait donc
 * la chose la plus attendue du rendez-vous comme on lit une liste : rien ne
 * marquait qu'on ouvrait quelque chose.
 *
 * ── Ce qui fait qu'on y croit ─────────────────────────────────────────────
 *
 * Le nombre de plis N'EST PAS décoratif : il vaut exactement le nombre de
 * volets que `plierEnPanneaux` ouvrira ensuite. Une feuille qui montre trois
 * pliures et s'ouvre en cinq volets se dénonce comme un décor. Ici les
 * charnières sont déjà là où elles se plieront.
 *
 * La pliure est le MÊME dégradé que dans `Depli` — un creux sombre d'un
 * pixel, une arête claire d'un pixel. Deux traits et non un, parce qu'un
 * seul trait noir disparaît sur les trois ambiances sombres. Et l'ombre est
 * noire, jamais teintée : sur minuit, encre et argile, la couleur d'encre
 * est une crème, et un pli teinté s'y ÉCLAIRERAIT au lieu de s'assombrir.
 *
 * ── Ce que le feuillet fermé montre, et ce qu'il tait ─────────────────────
 *
 * Il porte l'amorce et les comptes — de quoi savoir ce qu'on va ouvrir — et
 * jamais un vers. Le poème se découvre en se dépliant ; l'annoncer sur la
 * couverture viderait le geste.
 */

// L'ombre du pli, la surface du papier et les tranches sont dessinées dans
// `Papier.tsx` (`OMBRE_PLI`, `surfacePapier`, `Tranches`, `FaceFermee`) :
// l'écran d'écriture les emploie aussi, et deux copies d'un même papier
// finiraient par différer. Leur histoire y est écrite, en face du code.

const mouvementReduit = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Props {
  /** Combien de vers le poème contient — il décide du nombre de plis. */
  vers: number
  accent: string
  encre: string
  /** Ce qui s'écrit sur la couverture : l'amorce, les comptes, l'invite. */
  children: React.ReactNode
  onOuvrir: () => void
  /** Le nom accessible du bouton — il dit ce qui va se passer. */
  libelle: string
}

export default function FeuilletPlie({ vers, accent, encre, children, onOuvrir, libelle }: Props) {
  const reduit = useMemo(mouvementReduit, [])
  // Le même compte que `plierEnPanneaux` : un volet par vers tant qu'ils
  // sont peu nombreux, jamais plus de cinq — au-delà ce serait un accordéon.
  const plis = Math.max(1, Math.min(vers, PANNEAUX_MAX))

  return (
    <motion.button
      type="button"
      onClick={onOuvrir}
      aria-label={libelle}
      initial={reduit ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 0.84, 0.24, 1] }}
      whileTap={reduit ? undefined : { scale: 0.994 }}
      style={{
        width: '100%', display: 'block', textAlign: 'left',
        cursor: 'pointer', background: 'none', border: 'none', padding: 0,
      }}
    >
      {/* LA FACE DU DESSUS — la seule qu'on lise — et les tranches dessous. */}
      <FaceFermee tranches={plis - 1} accent={accent} encre={encre}>{children}</FaceFermee>
    </motion.button>
  )
}
