import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import {
  achatsDisponibles, lireOffres, souscrire, restaurer,
  lireFlacons, acheterFlacon, type Offre, type OffreFlacon,
} from '../lib/achats'
import { lireAcces, type ActePayant, type MotifRefus } from '../lib/acces'

/**
 * Le mur — s'ouvre quand un joueur demande un acte payant qu'il n'a plus.
 *
 * DEUX portes depuis le 22 septembre, et c'était le manque : l'abonnement
 * seul obligeait à s'engager pour une seule illustration. Le flacon —
 * quelques images achetées une fois, sans reconduction — attrape celui qui
 * ne s'abonnera jamais mais paierait trois euros pour illustrer LE poème
 * qu'il aime. C'est une population bien plus large que celle des abonnés.
 *
 * Le flacon ne paraît que pour les IMAGES : il n'a de sens que si le pack
 * se vide, et à 0,020 $ la partie avec les voix un pack honnête durerait
 * des mois. Les voix restent donc l'abonnement, et rien d'autre.
 *
 * Pas de compte à rebours, pas de rouge criard, pas d'« OFFRE LIMITÉE ».
 * On énonce ce qui est épuisé, ce que chaque porte ouvre, le prix — et on
 * laisse choisir.
 *
 * La mention du prix, de la durée, des conditions et de la restauration
 * n'est pas décorative : Apple l'exige (3.1.2) avant tout achat.
 */

const EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

/**
 * Pourquoi le mur est ouvert.
 *
 * Les deux premiers sont des REFUS — le joueur a demandé quelque chose et
 * ne l'a pas eu. Le troisième n'en est pas un : il vient des Réglages, où
 * l'on peut remplir son encrier sans rien s'être vu refuser.
 *
 * `MotifRefus` n'est pas élargi pour autant : ce type dit « pourquoi on a
 * dit non », et une visite volontaire n'est pas un non.
 */
export type MotifMur = MotifRefus | 'visite'

export interface MurAbonnementProps {
  visible: boolean
  acte: ActePayant
  motif: MotifMur
  /** Plafond journalier atteint, quand c'est lui qui a fermé la porte. */
  plafond?: number
  onFermer: () => void
  /** Appelé quand l'abonnement vient d'être ouvert : l'appelant relit son état. */
  onEncrierRempli: () => void
  accent: string
  encre: string
  bg: string
}

export default function MurAbonnement({
  visible, acte, motif, plafond, onFermer, onEncrierRempli, accent, encre, bg,
}: MurAbonnementProps) {
  const [offres, setOffres] = useState<Offre[]>([])
  const [flacons, setFlacons] = useState<OffreFlacon[]>([])
  const [enCours, setEnCours] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Le flacon ne vaut que pour les images, et n'a rien à dire quand c'est le
  // plafond de l'abonné qui a fermé la porte : en acheter n'y changerait
  // rien, elles reviennent demain.
  const flaconPossible = acte === 'image_pro' && motif !== 'plafond_jour'

  useEffect(() => {
    if (!visible) return
    setMessage(null)
    lireOffres().then(setOffres)
    if (flaconPossible) lireFlacons().then(setFlacons)
  }, [visible, flaconPossible])

  const titre = motif === 'plafond_jour'
    ? tr('L’encrier se remplit à minuit', 'The inkwell refills at midnight')
    : motif === 'visite'
      ? tr('Remplir l’encrier', 'Fill the inkwell')
      : tr('L’encrier est sec', 'The inkwell is dry')

  const corps = motif === 'plafond_jour'
    ? tr(
        `Tu as tiré ${plafond ?? 2} grands formats aujourd’hui — c’est le maximum quotidien. Ils reviennent demain, et tout le reste du jeu t’attend d’ici là.`,
        `You’ve drawn ${plafond ?? 2} large formats today — that’s the daily maximum. They come back tomorrow, and the rest of the game is waiting until then.`,
      )
    : motif === 'visite'
      ? tr(
          'Deux façons de remplir, et aucune n’est obligatoire : un flacon d’illustrations, acheté une fois et qui ne s’évapore pas, ou l’abonnement pour qui écrit souvent.',
          'Two ways to fill it, and neither is required: a flask of illustrations, bought once and which does not evaporate, or the subscription for those who write often.',
        )
    : acte === 'image_pro'
      ? tr('Tes illustrations d’essai sont épuisées.', 'Your trial illustrations are used up.')
      : acte === 'partie_ia'
        ? tr('Tes parties d’essai avec les voix de l’IA sont épuisées.', 'Your trial games with the AI voices are used up.')
        : tr('Tes lectures d’essai sont épuisées.', 'Your trial readings are used up.')

  async function acheter(offre: Offre) {
    setEnCours(offre.id)
    setMessage(null)
    const r = await souscrire(offre)
    setEnCours(null)
    if (r === 'ok') { onEncrierRempli(); return }
    if (r === 'annule') return
    setMessage(r === 'indisponible'
      ? tr('Les achats ne sont pas disponibles ici.', 'Purchases aren’t available here.')
      : tr('L’achat n’a pas abouti.', 'The purchase didn’t go through.'))
  }

  /**
   * Attend que le webhook ait crédité le flacon.
   *
   * L'achat rend la main dès qu'Apple a pris l'argent ; les images, elles,
   * sont écrites par le rappel serveur de RevenueCat, qui arrive une
   * poignée de secondes plus tard. Rejouer l'illustration tout de suite la
   * ferait refuser, et le mur se rouvrirait sur un joueur qui vient de
   * payer — la pire séquence possible.
   *
   * On relit donc jusqu'à voir le crédit, une dizaine de secondes au plus.
   * Au-delà on rend la main quand même : le crédit est acquis en base, il
   * arrivera, et mieux vaut un message que l'on comprend qu'une attente
   * sans fin.
   */
  async function attendreLeCredit(avant: number): Promise<boolean> {
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 900))
      const etat = await lireAcces()
      if (etat && (etat.flacon?.images ?? 0) > avant) return true
    }
    return false
  }

  async function remplir(f: OffreFlacon) {
    setEnCours(f.id)
    setMessage(null)
    const avant = (await lireAcces())?.flacon?.images ?? 0
    const r = await acheterFlacon(f)
    if (r === 'annule') { setEnCours(null); return }
    if (r !== 'ok') {
      setEnCours(null)
      setMessage(r === 'indisponible'
        ? tr('Les achats ne sont pas disponibles ici.', 'Purchases aren’t available here.')
        : tr('L’achat n’a pas abouti.', 'The purchase didn’t go through.'))
      return
    }
    setMessage(tr('L’encre arrive…', 'The ink is on its way…'))
    const credite = await attendreLeCredit(avant)
    setEnCours(null)
    if (credite) { onEncrierRempli(); return }
    setMessage(tr(
      'Ton achat est enregistré. L’encre apparaîtra d’ici quelques instants.',
      'Your purchase is recorded. The ink will appear in a moment.',
    ))
  }

  async function rendreSonDu() {
    setEnCours('restaurer')
    const ok = await restaurer()
    setEnCours(null)
    if (ok) { onEncrierRempli(); return }
    setMessage(tr('Aucun abonnement à restaurer.', 'No subscription to restore.'))
  }

  const bouton = (fond: string, couleur: string) => ({
    width: '100%', background: fond, color: couleur,
    ...mono, fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    padding: '1em', border: fond === 'transparent' ? `0.5px solid ${encre}40` : 'none',
    borderRadius: 3, cursor: 'pointer', minHeight: 44,
  })

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onFermer}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end',
          }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={titre}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: bg, borderTop: `1.5px solid ${accent}55`,
              padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
              display: 'flex', flexDirection: 'column', gap: 14,
              maxHeight: '92dvh', overflowY: 'auto',
            }}
          >
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
              {tr('— L’ENCRIER —', '— THE INKWELL —')}
            </div>

            <div
              className="font-fraunces font-black"
              style={{ fontSize: 'clamp(1.4rem, 6vw, 1.8rem)', color: encre, lineHeight: 1.15 }}
            >
              {titre}
            </div>

            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, lineHeight: 1.5 }}>
              {corps}
            </p>

            {motif !== 'plafond_jour' && (
              <ul style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8, lineHeight: 1.9, listStyle: 'none', padding: 0, margin: 0 }}>
                <li>{tr('· Voix de l’IA illimitées', '· Unlimited AI voices')}</li>
                <li>{tr('· Lectures de dessins illimitées', '· Unlimited drawing readings')}</li>
                <li>{tr('· 2 illustrations grand format par jour', '· 2 large-format illustrations a day')}</li>
              </ul>
            )}

            {motif !== 'plafond_jour' && (
              achatsDisponibles() ? (
                offres.length ? offres.map(o => (
                  <button
                    key={o.id}
                    onClick={() => acheter(o)}
                    disabled={enCours !== null}
                    style={{ ...bouton(accent, bg), opacity: enCours !== null ? 0.5 : 1 }}
                  >
                    {enCours === o.id
                      ? tr('En cours…', 'In progress…')
                      : o.periode === 'an'
                        ? `${o.prix} · ${tr('par an', 'per year')}`
                        : `${o.prix} · ${tr('par mois', 'per month')}`}
                  </button>
                )) : (
                  <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.6 }}>
                    {tr('Chargement des offres…', 'Loading offers…')}
                  </p>
                )
              ) : (
                <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.6, lineHeight: 1.6 }}>
                  {/*
                    Le repli du web nommait le seul abonnement. Depuis que le
                    flacon existe, taire l'un des deux revient à annoncer
                    dans les Règles une chose dont on ne dit jamais où elle
                    se trouve.
                  */}
                  {flaconPossible
                    ? tr(
                        'Les flacons et l’abonnement s’ouvrent depuis l’application iPhone ou Android.',
                        'Flasks and the subscription open from the iPhone or Android app.',
                      )
                    : tr(
                        'L’abonnement s’ouvre depuis l’application iPhone ou Android.',
                        'The subscription opens from the iPhone or Android app.',
                      )}
                </p>
              )
            )}

            {/*
              La seconde porte. Elle vient APRÈS l'abonnement et non avant :
              l'abonnement est la meilleure affaire pour qui reviendra, et
              c'est la première chose qu'on propose. Le flacon est là pour
              celui qui a déjà décidé que non.

              Pas de « ou » entre les deux, pas de comparatif, pas de
              « meilleure valeur » : deux propositions posées l'une sous
              l'autre, et le joueur sait compter.
            */}
            {flaconPossible && achatsDisponibles() && flacons.length > 0 && (
              <>
                <div style={{
                  ...mono, fontSize: 11, letterSpacing: '0.2em', color: encre,
                  opacity: 0.5, textAlign: 'center', marginTop: 4,
                }}>
                  {tr('— OU REMPLIR L’ENCRIER —', '— OR FILL THE INKWELL —')}
                </div>
                {flacons.map(f => (
                  <button
                    key={f.id}
                    onClick={() => remplir(f)}
                    disabled={enCours !== null}
                    style={{ ...bouton('transparent', encre), opacity: enCours !== null ? 0.5 : 1 }}
                  >
                    {enCours === f.id
                      ? tr('En cours…', 'In progress…')
                      : `${f.images} ${tr('illustrations', 'illustrations')} · ${f.prix}`}
                  </button>
                ))}
                <p style={{ ...mono, fontSize: 10, color: encre, opacity: 0.45, lineHeight: 1.6, textAlign: 'center' }}>
                  {tr(
                    'Achat unique, sans reconduction. L’encre ne s’évapore pas.',
                    'One-time purchase, no renewal. The ink does not evaporate.',
                  )}
                </p>
              </>
            )}

            {message && (
              <p style={{ ...mono, fontSize: 12, color: accent, lineHeight: 1.5 }}>{message}</p>
            )}

            {motif !== 'plafond_jour' && achatsDisponibles() && (
              <button onClick={rendreSonDu} disabled={enCours !== null} style={bouton('transparent', encre)}>
                {enCours === 'restaurer'
                  ? tr('En cours…', 'In progress…')
                  : tr('Restaurer mes achats', 'Restore purchases')}
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

            <p style={{ ...mono, fontSize: 11, color: encre, opacity: 0.45, lineHeight: 1.6, textAlign: 'center' }}>
              {tr(
                'Le jeu reste entier sans abonnement : écrire à plusieurs, dessiner, publier en galerie ne demandent rien.',
                'The game stays whole without a subscription: writing together, drawing and publishing to the gallery ask for nothing.',
              )}
            </p>

            {motif !== 'plafond_jour' && (
              <p style={{ ...mono, fontSize: 10, color: encre, opacity: 0.4, lineHeight: 1.7, textAlign: 'center' }}>
                {tr(
                  'Abonnement reconductible. Il se renouvelle sauf résiliation au moins 24 h avant la fin de la période en cours, depuis les réglages de ton compte. ',
                  'Auto-renewing subscription. It renews unless cancelled at least 24 h before the end of the current period, from your account settings. ',
                )}
                <a href={EULA} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: 'underline' }}>
                  {tr('Conditions', 'Terms')}
                </a>
                {' · '}
                <a href="/privacy" style={{ color: accent, textDecoration: 'underline' }}>
                  {tr('Confidentialité', 'Privacy')}
                </a>
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
