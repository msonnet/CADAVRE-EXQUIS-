/**
 * PapierDeplie.tsx — animation de révélation « papier qui se déplie ».
 *
 * Le carton (children) est rendu une seule fois (interactif, sans duplication),
 * et un rabat de papier crème vierge — calé exactement sur sa moitié haute —
 * est posé par-dessus, plié sur la pliure centrale. Au montage, le rabat se
 * déplie depuis la pliure (rotateX 0 → -180° autour du bord bas du rabat) :
 * il se relève, bascule vers l'arrière et disparaît (backface cachée),
 * découvrant le contenu comme une lettre qu'on déplie.
 *
 * Contrairement à un simple rotateX de toute la carte (un retournement rigide),
 * ici une partie du papier reste plate pendant que l'autre s'ouvre : c'est la
 * pliure qui fait lire le geste comme un « dépli ».
 */
import React from 'react'
import { motion } from 'framer-motion'
import { PAPIER_TEXTURE } from './Papier'

export default function PapierDeplie({
  children,
  bordure = 'rgba(0,0,0,0.18)',
  duration = 1.5,
  delay = 0.2,
  ease = [0.33, 0, 0.2, 1],
  className,
  style,
}: {
  children: React.ReactNode
  /** couleur de la fine bordure du rabat — à accorder à celle de la carte */
  bordure?: string
  duration?: number
  delay?: number
  ease?: number[] | string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={className} style={{ ...style, position: 'relative', perspective: '1500px' }}>
      {children}

      {/* Rabat vierge : moitié haute de la carte, plié sur la pliure centrale,
          puis déplié vers le haut et l'arrière jusqu'à passer la verticale et
          disparaître (backface cachée). On s'arrête à -105° : tout le mouvement
          utile (de plié à pliure dépassée) occupe alors toute la durée. */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '50%',
          ...PAPIER_TEXTURE,
          border: `1px solid ${bordure}`,
          borderRadius: '4px 4px 0 0',
          transformOrigin: 'center bottom',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          pointerEvents: 'none',
          // ombre portée du rabat + ligne de pliure plus sombre en bas
          boxShadow: '0 4px 14px rgba(0,0,0,0.32)',
        }}
        initial={{ rotateX: 0 }}
        animate={{ rotateX: -105 }}
        transition={{ duration, delay, ease: ease as any }}
      >
        {/* trait de pliure le long du bord bas du rabat */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 14,
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.16))',
          }}
        />
      </motion.div>

      {/* Ombre douce que le rabat projette sur la moitié basse, et qui
          s'estompe à mesure qu'il s'ouvre. */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: '40%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.22), transparent)',
          pointerEvents: 'none',
          borderRadius: 4,
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: duration * 0.7, delay, ease: 'easeOut' }}
      />
    </div>
  )
}
