import { libelleReserve } from '../lib/attribution'

/**
 * L'étiquette d'un fragment de réserve, dans les coutures.
 *
 * Elle ne vivait qu'en fin de partie : au recueil, le même fragment signait
 * « voix » sans rien dire de plus, et le joueur qui relisait son poème ne
 * savait plus qu'une conserve avait parlé. Un seul dessin pour les deux
 * écrans, pour qu'ils ne dérivent pas.
 */
export default function EtiquetteReserve({ voixNom, accent }: { voixNom?: string; accent: string }) {
  return (
    <span style={{
      fontSize: 11,
      letterSpacing: '0.2em',
      border: `1px solid ${accent}55`,
      color: accent,
      opacity: 0.55,
      padding: '1px 5px',
      borderRadius: 3,
      marginLeft: 7,
      fontFamily: "'Raleway', sans-serif",
      verticalAlign: 'middle',
      // Nommée, l'étiquette s'allonge : elle passe à la ligne d'un bloc au
      // lieu de se couper en deux.
      display: 'inline-block',
    }}>
      {libelleReserve(voixNom)}
    </span>
  )
}
