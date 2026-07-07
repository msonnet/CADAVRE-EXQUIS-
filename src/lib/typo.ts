import type React from 'react'

/**
 * Styles typographiques partagés du carnet.
 *
 * `mono` — le style « label » : Raleway espacé, employé pour la navigation,
 * les étiquettes, les boutons et les métadonnées. Source unique : toute
 * dérive de letterSpacing ou de famille se corrige ici, pas dans 27 fichiers.
 */
export const mono: React.CSSProperties = {
  fontFamily: "'Raleway', sans-serif",
  letterSpacing: '0.18em',
}
