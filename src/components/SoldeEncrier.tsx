import { useEffect, useState } from 'react'
import { mono } from '../lib/typo'
import { libelleSolde, caseDEssai, resteTotal, type Reserve } from '../lib/solde'
import { lireAcces, identiteOuverte, ESSAI_OFFERT, RATION_HEBDO, type ActePayant } from '../lib/acces'

/**
 * Le solde de l'encrier, au point de choix — lot 13 de l'audit du
 * 10 septembre.
 *
 * La réserve d'essai n'était lisible que dans les Réglages, écran qu'un
 * joueur n'ouvre pas avant de jouer. Il découvrait donc la limite AU MOMENT
 * DU REFUS, ce qui fait passer un modèle annoncé pour un piège. Elle se lit
 * maintenant là où la dépense se décide : sous « Ouvrir la séance », sous
 * le lancement d'une partie avec les voix, dans le panneau IMAGE.
 *
 * ── Trois silences, et ils comptent ───────────────────────────────────────
 *
 * · L'ABONNÉ ne voit rien. Il n'y a rien à compter, et « illimité » écrit
 *   sous un bouton n'est pas une information, c'est du bruit.
 *
 * · LE REGISTRE MUET ne montre rien non plus. Le principe tenu dans tout le
 *   projet est que la comptabilité injoignable laisse passer ; afficher un
 *   chiffre qu'on n'a pas reçu reviendrait à l'inventer, et il serait faux
 *   exactement pour celui qui a déjà consommé sa réserve.
 *
 * · AUCUNE IDENTITÉ ENCORE : la réserve est intacte par définition, on
 *   l'annonce telle quelle. Lire un solde ne doit ni ouvrir une identité ni
 *   entamer l'essai — ce sont les actes payants qui le font, au moment où
 *   ils le réclament.
 */

export interface SoldeEncrierProps {
  acte: ActePayant
  encre: string
  accent: string
  /** Un compteur qu'on incrémente pour faire relire le solde après un acte. */
  relire?: number
  style?: React.CSSProperties
}

export default function SoldeEncrier({ acte, encre, accent, relire = 0, style }: SoldeEncrierProps) {
  const [reserve, setReserve] = useState<Reserve | null>(null)

  useEffect(() => {
    let vivant = true
    ;(async () => {
      const cle = caseDEssai(acte)
      if (!(await identiteOuverte())) {
        // Aucune identité : la réserve est intacte par définition, et la
        // ration de la première semaine est pleine puisqu'elle n'a jamais
        // été entamée. On l'annonce sans rien ouvrir.
        if (vivant) setReserve({ essai: ESSAI_OFFERT[cle], flacon: 0, ration: RATION_HEBDO[cle] })
        return
      }
      const etat = await lireAcces()
      if (!vivant) return
      // Registre muet ou abonnement en cours : on se tait, dans les deux cas.
      if (!etat || etat.abonne) { setReserve(null); return }
      setReserve({
        essai: etat.essai[cle],
        flacon: cle === 'images' ? (etat.flacon?.images ?? 0) : 0,
        ration: cle === 'parties' ? (etat.ration?.parties ?? 0) : 0,
      })
    })()
    return () => { vivant = false }
  }, [acte, relire])

  if (reserve === null) return null

  const epuise = resteTotal(reserve) <= 0
  return (
    <div
      style={{
        ...mono, fontSize: 11, letterSpacing: '0.16em', textAlign: 'center',
        color: epuise ? accent : encre,
        opacity: epuise ? 0.85 : 0.45,
        ...style,
      }}
    >
      {libelleSolde(acte, reserve)}
    </div>
  )
}
