import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mono } from '../lib/typo'
import { tr } from '../i18n'

/**
 * Mur de crédits — s'ouvre quand le joueur demande une illustration qu'il ne
 * peut pas payer. Deux chemins, jamais un seul : regarder une publicité (le
 * chemin gratuit) ou prendre un forfait (le chemin sans publicité).
 *
 * Le ton reste celui du carnet : pas de compte à rebours, pas de rouge
 * criard, pas de « OFFRE LIMITÉE ». On énonce le prix, on laisse choisir.
 */
export interface MurCreditsProps {
  visible: boolean
  solde: number
  /** Coût de ce que le joueur vient de demander. */
  cout: number
  qualite: 'standard' | 'pro'
  onFermer: () => void
  /** Regarder une publicité récompensée (absent tant que la régie n'est pas branchée). */
  onPublicite?: () => void
  /** Ouvrir la boutique de forfaits (absent tant que les achats ne sont pas branchés). */
  onForfait?: () => void
  /** Retomber sur la qualité standard, quand le joueur a de quoi la payer. */
  onStandard?: () => void
  accent: string
  encre: string
  bg: string
}

export default function MurCredits({
  visible, solde, cout, qualite, onFermer, onPublicite, onForfait, onStandard,
  accent, encre, bg,
}: MurCreditsProps) {
  const manque = Math.max(0, cout - solde)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onFermer}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={tr('Crédits insuffisants', 'Not enough credits')}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: bg,
              borderTop: `1.5px solid ${accent}55`,
              padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
              {tr('— L’ENCRIER EST SEC —', '— THE INKWELL IS DRY —')}
            </div>

            <div
              className="font-fraunces font-black"
              style={{ fontSize: 'clamp(1.4rem, 6vw, 1.8rem)', color: encre, lineHeight: 1.15 }}
            >
              {qualite === 'pro'
                ? tr('Une illustration grand format', 'A large-format illustration')
                : tr('Une illustration', 'An illustration')}
            </div>

            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, lineHeight: 1.5 }}>
              {tr(
                `Elle coûte ${cout} crédit${cout > 1 ? 's' : ''}. Il t’en reste ${solde} — il en manque ${manque}.`,
                `It costs ${cout} credit${cout > 1 ? 's' : ''}. You have ${solde} — ${manque} short.`,
              )}
            </p>

            {/* Chemin gratuit — toujours en premier : la publicité est un choix, pas une contrainte */}
            {onPublicite && (
              <button
                onClick={onPublicite}
                style={{
                  width: '100%', background: accent, color: bg,
                  ...mono, fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '1em', border: 'none', borderRadius: 3, cursor: 'pointer',
                }}
              >
                {tr('Regarder une annonce · +1 crédit', 'Watch an ad · +1 credit')}
              </button>
            )}

            {/* Repli sur la qualité standard quand elle est à portée */}
            {onStandard && qualite === 'pro' && solde >= 1 && (
              <button
                onClick={onStandard}
                style={{
                  width: '100%', background: 'transparent', color: encre,
                  ...mono, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '0.9em', border: `0.5px solid ${encre}40`, borderRadius: 3, cursor: 'pointer',
                }}
              >
                {tr('Version standard · 1 crédit', 'Standard version · 1 credit')}
              </button>
            )}

            {onForfait && (
              <button
                onClick={onForfait}
                style={{
                  width: '100%', background: 'transparent', color: encre,
                  ...mono, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '0.9em', border: `0.5px solid ${encre}40`, borderRadius: 3, cursor: 'pointer',
                }}
              >
                {tr('Prendre un forfait · sans annonce', 'Buy a pack · no ads')}
              </button>
            )}

            <button
              onClick={onFermer}
              style={{
                ...mono, fontSize: 13, color: encre, opacity: 0.6,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0', minHeight: 44,
              }}
            >
              {tr('Plus tard', 'Later')}
            </button>

            <p style={{ ...mono, fontSize: 11, color: encre, opacity: 0.45, lineHeight: 1.5, textAlign: 'center' }}>
              {tr(
                'Le jeu reste entier sans crédits : poèmes, voix, dessins et galerie sont illimités.',
                'The game stays whole without credits: poems, voices, drawings and gallery are unlimited.',
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
