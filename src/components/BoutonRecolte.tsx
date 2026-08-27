import { useEffect, useState } from 'react'
import { idDansLaRecolte, recolter, retirerDeLaRecolte } from '../db'
import { mono } from '../lib/typo'
import { tr } from '../i18n'

/**
 * Le bouton qui garde un vers.
 *
 * Il vit dans les coutures, à côté de chaque ligne, parce que c'est là qu'on
 * relit vers par vers — et que c'est en relisant qu'on sait lequel on garde.
 *
 * Il n'ouvre pas de dialogue, ne demande pas de confirmation, ne félicite
 * personne : on garde, on regarde le suivant. Un deuxième appui retire. Le
 * geste doit coûter moins cher que la décision.
 */
export default function BoutonRecolte({
  texte, accent, encre, poemeId, poemeTitre, datePoeme, signature, nbVoix,
}: {
  texte: string
  accent: string
  encre: string
  poemeId?: string
  poemeTitre?: string | null
  datePoeme?: number
  signature?: string
  nbVoix?: number
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
        const v = await recolter({ texte, poemeId, poemeTitre, datePoeme, signature, nbVoix })
        setId(v.id)
      }
    } catch { /* le carnet est indisponible — le vers reste lisible, c'est l'essentiel */ }
  }

  const garde = Boolean(id)
  return (
    <button
      onClick={basculer}
      aria-pressed={garde}
      aria-label={garde
        ? tr('Retirer ce vers du carnet', 'Remove this line from the notebook')
        : tr('Garder ce vers dans le carnet', 'Keep this line in the notebook')}
      style={{
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
