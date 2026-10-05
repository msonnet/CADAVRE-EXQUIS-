import React from 'react'
import type { MainCase } from '../types'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import LienVoix from './LienVoix'

/**
 * Le détail d'un vers d'atelier : quelle main a rempli quelle case.
 *
 * Les coutures ne disaient que le nombre de voix et leurs noms en bloc — on
 * savait qu'un vers venait de trois voix, jamais laquelle avait écrit quoi.
 * Sur un recueil composé avec l'Atelier, c'est l'appareil critique qui manque.
 *
 * La mention RÉSERVE est la plus importante des trois : quand l'appel à Claude
 * échoue, un mot en conserve prend la place d'une voix, et rien ne le
 * distinguait. Publier un vers en croyant qu'une voix l'a signé était possible.
 */
export default function MainsDuVers({ mains, accent, encre, liens, main }: {
  mains: MainCase[]
  accent: string
  encre: string
  /** Le nom de la main humaine. Absent, c'est « toi » — le recueil parle à
   *  son auteur ; la galerie, lue par un inconnu, nomme celui qui publie. */
  main?: string
  /** Le nom de chaque voix mène à sa fiche. Au recueil seulement : la fin
   *  de partie est encore le moment du dévoilement, on ne l'ouvre pas sur
   *  un détour. */
  liens?: boolean
}) {
  if (!mains.length) return null
  // Avec les liens, chaque ligne a la hauteur d'une cible (44 px) : le nom
  // y tient sa zone d'appui sans mordre sur la ligne voisine (voir
  // `LienVoix`). Les lignes sans lien — « toi », RÉSERVE — prennent la même
  // hauteur, pour que la liste se lise d'un seul pas.
  const ligne: React.CSSProperties = liens ? { minHeight: 44, display: 'flex', alignItems: 'center' } : {}
  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: liens ? 0 : 3 }}>
      {mains.map((m, i) => (
        <div key={i} style={{ ...mono, fontSize: 11, lineHeight: 1.5, color: encre, opacity: 0.75, ...ligne }}>
          <span>
          <span style={{ color: accent, opacity: 0.75, letterSpacing: '0.1em' }}>{m.role}</span>
          <span style={{ opacity: 0.35, margin: '0 6px' }}>·</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13 }}>{m.texte}</span>
          <span style={{ opacity: 0.35, margin: '0 6px' }}>—</span>
          {m.reserve ? (
            <span style={{ color: accent, letterSpacing: '0.14em' }}>{tr('RÉSERVE', 'RESERVE')}</span>
          ) : m.voixNom ? (
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontStyle: 'italic' }}>
              {liens ? <LienVoix nom={m.voixNom} /> : m.voixNom}
            </span>
          ) : (
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontStyle: 'italic' }}>{main ?? tr('toi', 'you')}</span>
          )}
          </span>
        </div>
      ))}
    </div>
  )
}
