import React from 'react'
import type { MainCase } from '../types'
import { mono } from '../lib/typo'
import { tr } from '../i18n'

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
export default function MainsDuVers({ mains, accent, encre }: {
  mains: MainCase[]
  accent: string
  encre: string
}) {
  if (!mains.length) return null
  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {mains.map((m, i) => (
        <div key={i} style={{ ...mono, fontSize: 11, lineHeight: 1.5, color: encre, opacity: 0.75 }}>
          <span style={{ color: accent, opacity: 0.75, letterSpacing: '0.1em' }}>{m.role}</span>
          <span style={{ opacity: 0.35, margin: '0 6px' }}>·</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13 }}>{m.texte}</span>
          <span style={{ opacity: 0.35, margin: '0 6px' }}>—</span>
          {m.reserve ? (
            <span style={{ color: accent, letterSpacing: '0.14em' }}>{tr('RÉSERVE', 'RESERVE')}</span>
          ) : m.voixNom ? (
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontStyle: 'italic' }}>{m.voixNom}</span>
          ) : (
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontStyle: 'italic' }}>{tr('toi', 'you')}</span>
          )}
        </div>
      ))}
    </div>
  )
}
