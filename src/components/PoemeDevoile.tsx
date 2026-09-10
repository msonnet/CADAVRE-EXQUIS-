import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Depli from './Depli'
import VersEncre from './VersEncre'
import { partitionDuPoeme, DUREE_DEPLI } from '../lib/rythme'

/**
 * Le dévoilement du poème : le papier s'ouvre, puis l'encre vient dessus.
 *
 * Deux gestes, dans cet ordre, et c'est tout le dispositif. Le feuillet est
 * plié en volets — jusqu'à cinq, un par vers quand le poème est court, ce qui
 * retrouve exactement le pliage d'origine d'un cadavre exquis à trois ou
 * quatre mains. Un volet s'ouvre, les vers qu'il porte s'écrivent, le volet
 * suivant s'ouvre déjà pendant que le précédent finit sa phrase.
 *
 * `rythme.ts` tient la partition : c'est lui qui sait qu'un vers d'un mot doit
 * tomber vite et laisser un silence, et que le poème entier doit passer en
 * huit secondes qu'il en ait trois ou quarante.
 *
 * ── Ce qui se passe si on ne veut pas regarder ────────────────────────────
 *
 * Une belle animation qu'on subit une deuxième fois est pire qu'une animation
 * bancale. Le premier appui n'importe où pose le poème entier d'un coup, sans
 * rien empêcher d'autre — on n'intercepte pas le geste, on l'écoute. Et
 * `prefers-reduced-motion` court-circuite la séquence complète.
 */

interface Props {
  /** Les vers du poème, un par ligne, dans l'ordre. */
  lignes: string[]
  /** La couleur d'accent, celle de la lettrine. */
  accent: string
  /** Tant que c'est faux, rien n'est rendu : le rideau n'est pas levé. */
  actif: boolean
  /** Poser une lettrine sur la première lettre du premier vers. */
  lettrine?: boolean
  /** Appelé quand la lettrine se pose — le son et l'haptique. */
  onLettrine?: () => void
  /** Appelé une fois le dernier mot posé, ou dès que le dévoilement est sauté. */
  onFini?: () => void
  /** Le style typographique des vers. */
  style?: React.CSSProperties
  /** La taille de la lettrine. */
  tailleLettrine?: string
}

const mouvementReduit = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Les guillemets ouvrants ne font pas une lettrine. */
const OUVRANTS = /^[«»"'“”‘’]+/

export default function PoemeDevoile({
  lignes, accent, actif, lettrine, onLettrine, onFini, style,
  tailleLettrine = 'clamp(2.8rem, 10vw, 3.4rem)',
}: Props) {
  const [saute, setSaute] = useState(false)
  const [lettrinePosee, setLettrinePosee] = useState(false)
  const reduit = useMemo(mouvementReduit, [])
  const immediat = saute || reduit

  // Le premier vers cède sa première lettre à la lettrine.
  const ligne0 = (lignes[0]?.trim() ?? '').replace(OUVRANTS, '')
  const capitale = lettrine ? ligne0.charAt(0) : ''
  const affichees = useMemo(
    () => (capitale ? [ligne0.slice(1), ...lignes.slice(1)] : lignes),
    [lignes, capitale, ligne0],
  )

  const partition = useMemo(() => partitionDuPoeme(affichees), [affichees])

  // Le premier appui n'importe où pose le poème. On écoute la phase de
  // capture sans rien empêcher : le bouton qu'on visait s'enfonce quand même.
  useEffect(() => {
    if (!actif || immediat) return
    const sauter = () => setSaute(true)
    const fin = setTimeout(() => onFini?.(), partition.fin + 240)
    window.addEventListener('pointerdown', sauter, { capture: true })
    return () => {
      clearTimeout(fin)
      window.removeEventListener('pointerdown', sauter, { capture: true })
    }
  }, [actif, immediat, partition.fin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (actif && immediat) onFini?.()
  }, [actif, immediat]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!actif) return null

  const dureeDepli = DUREE_DEPLI / 1000

  return (
    <div style={style}>
      {partition.panneaux.map((panneau, p) => (
        <Depli
          key={p}
          delai={panneau.ouverture / 1000}
          duree={dureeDepli}
          immediat={immediat}
          pli={p > 0}
        >
          {panneau.lignes.map(i => {
            const t = partition.vers[i]
            return (
              <VersEncre
                key={i}
                texte={affichees[i] || ''}
                debut={t.debut / 1000}
                duree={t.duree / 1000}
                immediat={immediat}
                avant={i === 0 && capitale ? (
                  <motion.span
                    initial={immediat ? false : { y: -38, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={immediat ? { duration: 0, delay: 0 } : {
                      delay: t.debut / 1000,
                      duration: 0.72,
                      ease: [0.22, 1.4, 0.36, 1],
                    }}
                    onAnimationComplete={() => {
                      if (!lettrinePosee) { setLettrinePosee(true); onLettrine?.() }
                    }}
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Bodoni Moda', serif",
                      fontWeight: 900,
                      fontSize: tailleLettrine,
                      lineHeight: 0.85,
                      color: accent,
                      float: 'left',
                      marginRight: 6,
                      marginTop: 4,
                    }}
                  >
                    {capitale}
                  </motion.span>
                ) : undefined}
              />
            )
          })}
        </Depli>
      ))}
    </div>
  )
}
