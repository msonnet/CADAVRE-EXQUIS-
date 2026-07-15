import React, { useState } from 'react'
import TutorielCoach from './TutorielCoach'
import { tr } from '../i18n'

export interface EtapeMiniCoach {
  titre: string
  corps: React.ReactNode
}

/**
 * Mini-guide de première fois — 2 à 4 bulles séquentielles, puis plus jamais.
 * Le grand tutoriel couvre le cadavre écrit ; les autres modes (dessin, en
 * ligne, atelier) reçoivent ce format court : juste ce qu'il faut pour ne pas
 * prendre le protocole du jeu pour un bug.
 */
export default function MiniCoach({
  cle, etapes, accent, encre, bg, position = 'top', actif = true,
}: {
  /** Clé localStorage — le guide ne se montre qu'une fois par appareil. */
  cle: string
  etapes: EtapeMiniCoach[]
  accent: string
  encre: string
  bg: string
  position?: 'top' | 'bottom'
  /** La page peut retarder l'apparition (intro plein écran, chargement…). */
  actif?: boolean
}) {
  const [etape, setEtape] = useState(0)
  const [visible, setVisible] = useState<boolean>(() => {
    try { return localStorage.getItem(cle) !== '1' } catch { return false }
  })

  function fermer() {
    try { localStorage.setItem(cle, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  function suivant() {
    if (etape + 1 >= etapes.length) fermer()
    else setEtape(e => e + 1)
  }

  if (!actif || !visible || !etapes[etape]) return null

  const derniere = etape + 1 >= etapes.length
  return (
    <TutorielCoach
      visible
      etape={etape}
      total={etapes.length}
      titre={etapes[etape].titre}
      corps={etapes[etape].corps}
      onCompris={suivant}
      labelCompris={derniere ? tr('C’est parti →', 'Let’s go →') : undefined}
      onPasser={fermer}
      accent={accent}
      encre={encre}
      bg={bg}
      position={position}
    />
  )
}
