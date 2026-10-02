import { useEffect, useState } from 'react'
import { idDansLaRecolte, recolter, retirerDeLaRecolte } from '../db'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import type { Case } from '../types'

/**
 * Le bouton qui garde un vers.
 *
 * Il vit dans les coutures, à côté de chaque ligne, parce que c'est là qu'on
 * relit vers par vers — et que c'est en relisant qu'on sait lequel on garde.
 *
 * Il n'ouvre pas de dialogue, ne demande pas de confirmation, ne félicite
 * personne : on garde, on regarde le suivant. Un deuxième appui retire. Le
 * geste doit coûter moins cher que la décision.
 *
 * `compact` : la forme qui se range dans une ligne de couture déjà écrite en
 * petites capitales — celles du poème du jour, où le cadre ferait d'un vers
 * sur deux un formulaire.
 */
export default function BoutonRecolte({
  texte, accent, encre, poemeId, poemeTitre, datePoeme, signature, nbVoix, auteur, compact = false,
}: {
  texte: string
  accent: string
  encre: string
  poemeId?: string
  poemeTitre?: string | null
  datePoeme?: number
  signature?: string
  nbVoix?: number
  /** Gardé avec le vers : un feuillet relié au carnet doit savoir s'il porte une voix. */
  auteur?: Case['auteur']
  compact?: boolean
}) {
  const [id, setId] = useState<string | undefined>(undefined)
  const [pret, setPret] = useState(false)

  useEffect(() => {
    let annule = false
    idDansLaRecolte(texte)
      .then(v => { if (!annule) { setId(v); setPret(true) } })
      .catch(() => { if (!annule) setPret(true) })
    return () => { annule = true }
  }, [texte])

  async function basculer() {
    if (!pret) return
    try {
      if (id) {
        await retirerDeLaRecolte(id)
        setId(undefined)
      } else {
        const v = await recolter({ texte, poemeId, poemeTitre, datePoeme, signature, nbVoix, auteur })
        setId(v.id)
      }
    } catch { /* le carnet est indisponible — le vers reste lisible, c'est l'essentiel */ }
  }

  const garde = Boolean(id)
  return (
    <button
      // Garder un vers n'est jamais aussi un geste sur ce qui l'entoure : au
      // poème du jour, toucher la feuille démonte les coutures, et le vers
      // qu'on venait de garder disparaissait avec son bouton.
      onClick={e => { e.stopPropagation(); basculer() }}
      aria-pressed={garde}
      aria-label={garde
        ? tr('Retirer ce vers du carnet', 'Remove this line from the notebook')
        : tr('Garder ce vers dans le carnet', 'Keep this line in the notebook')}
      style={compact ? {
        ...mono, fontSize: 10, letterSpacing: '0.1em',
        color: garde ? accent : encre, opacity: garde ? 0.9 : 0.4,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        transition: 'opacity .15s, color .15s',
      } : {
        ...mono,
        fontSize: 11,
        letterSpacing: '0.18em',
        // Le vers gardé se voit sans crier : l'encre passe à l'accent, le
        // cadre se ferme. Pas de couleur de succès, pas d'icône verte.
        color: garde ? accent : encre,
        opacity: garde ? 0.9 : 0.35,
        background: 'none',
        border: `1px solid ${garde ? accent : encre}${garde ? '66' : '22'}`,
        borderRadius: 3,
        cursor: 'pointer',
        padding: '3px 8px',
        marginTop: 6,
        minHeight: 30,
        transition: 'opacity .15s, color .15s, border-color .15s',
      }}
    >
      {garde ? tr('◆ GARDÉ', '◆ KEPT') : tr('◇ GARDER', '◇ KEEP')}
    </button>
  )
}
