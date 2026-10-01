import { useEffect, useState } from 'react'
import type { LienPublication } from '../types'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import { dateSignature, libelleEchos, type Echos } from '../lib/galerie'
import { lireEchos } from '../lib/echos'

/**
 * Ce que devient le bouton PUBLIER une fois le feuillet publié.
 *
 * Le bouton redevenait actif deux secondes après « ✓ PUBLIÉ » : rien n'était
 * gardé, le même poème pouvait partir trois fois en galerie, et son auteur
 * ne savait jamais s'il avait été lu. Le feuillet dit maintenant QUAND il a
 * été publié, et ce que la publication a reçu — en petites capitales, la
 * voix d'un « courrier des lecteurs », sans pastille ni compteur rouge.
 *
 * Trois silences, comme le solde de l'encrier : sans identifiant (la base
 * n'a pas rendu la ligne), registre muet, ou rien reçu encore — dans ce
 * dernier cas on le dit en mots, parce que c'est une réponse.
 *
 * Si la base a répondu et que la publication n'y est plus — retirée par son
 * auteur ou par la modération —, `onRetiree` détache le feuillet, et le
 * bouton revient : on peut republier ce qui n'est plus publié.
 */
export default function MentionPublication({ lien, onRetiree, accent, encre }: {
  lien: LienPublication
  onRetiree: () => void
  accent: string
  encre: string
}) {
  const [echos, setEchos] = useState<Echos | null>(null)
  const id = lien.id

  useEffect(() => {
    if (!id) return
    let annule = false
    lireEchos([id]).then(r => {
      if (annule || !r) return
      if (r.absents.has(id)) { onRetiree(); return }
      setEchos(r.echos[id] ?? null)
    })
    return () => { annule = true }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const ligne = echos ? libelleEchos(echos) : ''
  return (
    <div
      data-publication
      style={{
        padding: '0.85em', textAlign: 'center',
        border: `0.5px solid ${encre}25`, borderRadius: 3,
      }}
    >
      <div style={{ ...mono, fontSize: 13, letterSpacing: '0.16em', color: accent }}>
        ✓ {tr('PUBLIÉ EN GALERIE LE', 'PUBLISHED TO THE GALLERY ON')} {dateSignature(lien.date)}
      </div>
      {echos && (
        <div data-echos style={{ ...mono, fontSize: 11, letterSpacing: '0.16em', color: encre, opacity: 0.65, marginTop: 4 }}>
          {ligne || tr('PAS ENCORE LU', 'NOT READ YET')}
        </div>
      )}
    </div>
  )
}
