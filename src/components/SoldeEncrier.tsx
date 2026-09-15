import { useEffect, useState } from 'react'
import { mono } from '../lib/typo'
import { libelleSolde, caseDEssai } from '../lib/solde'
import { lireAcces, identiteOuverte, ESSAI_OFFERT, type ActePayant } from '../lib/acces'

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
  const [reste, setReste] = useState<number | null>(null)

  useEffect(() => {
    let vivant = true
    ;(async () => {
      if (!(await identiteOuverte())) {
        if (vivant) setReste(ESSAI_OFFERT[caseDEssai(acte)])
        return
      }
      const etat = await lireAcces()
      if (!vivant) return
      // Registre muet ou abonnement en cours : on se tait, dans les deux cas.
      if (!etat || etat.abonne) { setReste(null); return }
      setReste(etat.essai[caseDEssai(acte)])
    })()
    return () => { vivant = false }
  }, [acte, relire])

  if (reste === null) return null

  const epuise = reste <= 0
  return (
    <div
      style={{
        ...mono, fontSize: 11, letterSpacing: '0.16em', textAlign: 'center',
        color: epuise ? accent : encre,
        opacity: epuise ? 0.85 : 0.45,
        ...style,
      }}
    >
      {libelleSolde(acte, reste)}
    </div>
  )
}
