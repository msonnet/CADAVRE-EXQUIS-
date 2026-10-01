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

/**
 * L'ombre qu'un pli porte sur le volet d'en dessous.
 *
 * Très faible — la feuille est POSÉE, pas dressée. Dans `Depli` l'ombre
 * monte à 0,3 parce qu'un volet presque debout ne prend pas la lumière ;
 * ici tout est à plat et la même valeur donnerait des bandes grises.
 *
 * Premier jet : 0,10 sur 18 px, et la pliure à 0,55. Le feuillet se lisait
 * comme des BARRES EMPILÉES, un tableau plutôt qu'une feuille — des règles
 * régulières en travers d'un fond transparent. Deux causes, et la seconde
 * comptait plus que la première : l'ombre était trop large (une ombre de
 * pliure est serrée contre la pliure), et surtout la feuille n'avait
 * AUCUNE SURFACE. On ne voyait pas du papier marqué, on voyait des traits
 * dans le vide.
 *
 * (Ces règles vivent désormais dans `Papier.tsx` : l'écran d'écriture les
 * emploie aussi, et deux copies d'un même papier finiraient par différer.)
 */

/**
 * La surface du papier.
 *
 * Une teinte d'encre à peine posée, et c'est ce qui fait la différence
 * entre une feuille et quatre traits. Elle est dérivée de l'ENCRE et non
 * d'une couleur fixe : sur les ambiances claires elle assombrit d'un rien,
 * sur les sombres — où l'encre est une crème — elle éclaircit. Dans les
 * deux cas la feuille se détache de son fond, ce qu'une couleur figée ne
 * ferait que dans un sens. → `surfacePapier`, dans `Papier.tsx`.
 */

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

/**
 * Les tranches des plis, sous la face du dessus.
 *
 * ── L'image qui était fausse ──────────────────────────────────────────────
 *
 * Premier jet : les pliures étalées en travers d'un grand rectangle, une
 * bande par volet. Mais une feuille PLIÉE est courte — c'est ce que plier
 * veut dire. Cinq bandes vides de dix-neuf pixels ne donnaient pas un
 * feuillet, elles donnaient la réglure d'un cahier, et le fond transparent
 * achevait de faire des traits dans le vide.
 *
 * Ce qu'on voit d'un paquet fermé posé sur une table, ce sont les TRANCHES
 * des épaisseurs, empilées sous la face du dessus, chacune un peu plus
 * courte et un peu plus pâle que celle du dessus — la perspective les
 * raccourcit et l'ombre les mange. Trois pixels de retrait par épaisseur
 * suffisent : au-delà on dessine un escalier, en deçà on ne voit qu'un
 * bord épais.
 *
 * Leur nombre reste celui des volets à venir. Une feuille qui montre trois
 * épaisseurs et s'ouvre en cinq se dénonce comme un décor.
 *
 * Elles sont dessinées par `Tranches` (`Papier.tsx`), qui sert aussi au
 * feuillet en cours de l'écran d'écriture.
 */
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
