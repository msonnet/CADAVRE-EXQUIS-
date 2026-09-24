import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'
import { CLAVIER_VERS } from '../lib/clavier'
import { zoneVivante } from '../lib/a11y'
import { vibrer } from '../utils/haptics'
import FeuilletPlie from '../components/FeuilletPlie'
import PoemeDevoile from '../components/PoemeDevoile'
import { usePartage } from '../hooks/usePartage'
import { mentionIA } from '../lib/attribution'
import { nomDeVoix } from '../data/voiceIds'
import { refusDuVers, MOTS_MAX, type RefusVers } from '../lib/jourLogique'
import {
  lireJour, poserVers, dernierPoemeScelle, signalerVers,
  type EtatDuJour, type PoemeScelle, type MotifRefus,
} from '../lib/jour'
import { pointerSerie } from '../utils/streak'
import { annoncerScellement } from '../utils/notifications'

/**
 * Le poème du jour — une chaîne, une main, un vers.
 *
 * ── Ce que cet écran montre, et ce qu'il cache ────────────────────────────
 *
 * Un MOT. L'écho du vers précédent, et rien d'autre : ni le poème, ni le
 * nombre de mots des autres, ni qui vient de passer. C'est le pli du
 * papier, et il n'est pas tenu ici — la politique RLS refuse la lecture et
 * l'API ne renvoie que l'écho. Cette page ne pourrait pas tricher.
 *
 * ── Trois états, trois écrans ─────────────────────────────────────────────
 *
 *  · tu n'as pas écrit  → l'écho, un champ, ton rang à venir
 *  · tu as écrit        → ton vers, et le rendez-vous de minuit
 *  · le poème d'hier    → scellé, lisible, ton vers mis en avant
 *
 * On ne montre jamais le poème du jour en cours, même à qui y a déjà écrit.
 * Attendre minuit EST le jeu.
 */

function ordinal(n: number): string {
  return tr(n === 1 ? '1ᵉʳ' : `${n}ᵉ`, n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`)
}

function libelleRefus(m: MotifRefus | RefusVers): string {
  switch (m) {
    case 'vide': return tr('Il faut écrire quelque chose.', 'Write something first.')
    case 'trop-de-mots': return tr(`Un vers, pas une strophe — ${MOTS_MAX} mots au plus.`, `One line, not a stanza — ${MOTS_MAX} words at most.`)
    case 'trop-long': return tr('Un vers, pas une strophe.', 'One line, not a stanza.')
    case 'plusieurs-lignes': return tr('Un seul vers.', 'A single line.')
    case 'deja-ecrit': return tr('Tu as déjà donné ta main aujourd’hui.', 'You have already given your hand today.')
    case 'scelle': return tr('Le poème du jour vient de se refermer.', 'Today’s poem has just closed.')
    case 'auth': return tr('Impossible d’ouvrir une identité — réessaie.', 'Could not open an identity — try again.')
    default: return tr('Le registre ne répond pas — réessaie dans un instant.', 'The register is not answering — try again shortly.')
  }
}

export default function PoemeDuJour() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'

  const [etat, setEtat] = useState<EtatDuJour | null>(null)
  const [hier, setHier] = useState<PoemeScelle | null>(null)
  const [chargement, setChargement] = useState(true)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [toutVoir, setToutVoir] = useState(false)

  /*
    LE DÉPLI DU POÈME SCELLÉ.

    Trois états, et non deux : le feuillet fermé, le dépli en cours, le
    feuillet ouvert avec ses coutures.

    ── Pourquoi il ne se rejoue pas ──────────────────────────────────────

    « Une belle animation qu'on subit une deuxième fois est pire qu'une
    animation bancale » — c'est la règle du dévoilement de fin de partie et
    elle vaut ici. On retient donc LE JOUR déjà déplié : revenir sur la page
    dans la même journée rouvre le poème à plat, sans rien redemander.

    On retient le jour et non un booléen, pour que le poème du lendemain
    retrouve son feuillet fermé tout seul. C'est le même motif que la graine
    d'ambiance et que la série.
  */
  const CLE_DEPLI = 'cadavre-jour-deplie'
  const dejaDeplie = (jour: string) => {
    try { return localStorage.getItem(CLE_DEPLI) === jour } catch { return false }
  }
  const [deplie, setDeplie] = useState(false)
  /**
   * Les coutures s'affichent d'abord — c'est la récompense annoncée.
   * On les retire pour LIRE, ce qui est l'autre usage d'un poème, et le
   * geste est le poème lui-même : on le touche.
   */
  const [coutures, setCoutures] = useState(true)
  /** Le mouvement réduit coupe la pose des noms comme il coupe le dépli. */
  const reduit = typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [revele, setRevele] = useState(false)
  // Les vers qu'on vient de signaler, le temps de la visite : le serveur ne
  // dit pas « déjà signalé » deux fois de suite, et griser le drapeau évite
  // d'appuyer en boucle sans retour.
  const [signales, setSignales] = useState<Set<string>>(new Set())
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let vivant = true
    ;(async () => {
      const [e, h] = await Promise.all([lireJour(), dernierPoemeScelle()])
      if (!vivant) return
      setEtat(e); setHier(h); setChargement(false)
      // Déjà déplié aujourd'hui : le feuillet s'ouvre à plat, sans
      // redemander le geste ni rejouer la séquence.
      if (h && dejaDeplie(h.jour)) { setDeplie(true); setRevele(true) }
    })()
    return () => { vivant = false }
  }, [])

  async function envoyer() {
    if (envoi) return
    const refus = refusDuVers(texte)
    if (refus) { setErreur(libelleRefus(refus)); return }

    setEnvoi(true); setErreur(null)
    const r = await poserVers(texte)
    setEnvoi(false)
    if (!r.ok) {
      setErreur(libelleRefus(r.motif))
      // Le rendez-vous a pu bouger sous nos pieds — on relit plutôt que de
      // laisser un écran qui ment.
      if (r.motif === 'deja-ecrit' || r.motif === 'scelle') setEtat(await lireJour())
      return
    }
    jouer('soumettre')
    // La série ne compte que les jours où une main a réellement écrit.
    pointerSerie()
    // Et l'on se donne rendez-vous : le poème sera scellé demain matin.
    void annoncerScellement(r.rang)
    setEtat(await lireJour())
    setTexte('')
  }

  async function signaler(id: string) {
    if (signales.has(id)) return
    setSignales(s => new Set(s).add(id))
    const r = await signalerVers(id)
    // Retiré sur-le-champ : le vers a atteint le seuil, on relit le poème
    // plutôt que de laisser le texte signalé à l'écran.
    if (r.ok && r.retire) setHier(await dernierPoemeScelle())
  }

  const partage = usePartage({ libelleCopie: tr('✓ POÈME COPIÉ', '✓ POEM COPIED') })

  /**
   * Partager le poème du jour.
   *
   * Le texte porte la MENTION DES VOIX dès qu'une machine y a écrit —
   * article 50 de l'AI Act, et la même règle que l'export du recueil. Elle
   * n'est pas décorative ici : le plancher de cinq vers fait qu'un poème
   * peu fréquenté en contient presque toujours.
   *
   * Le jour sert de graine : deux personnes qui partagent le même poème
   * obtiennent la même affiche, ce qui est la moindre des choses pour un
   * texte qu'elles ont écrit ensemble.
   */
  async function partagerLePoeme() {
    if (!hier || partage.enCours) return
    const lignes = hier.vers.map(v => v.texte)
    const mention = hier.vers.some(v => v.voix) ? `\n\n${mentionIA()}` : ''
    await partage.partager({
      type: 'poeme',
      titre: tr(`Le poème du ${hier.jour}`, `The poem of ${hier.jour}`),
      texte: lignes.join('\n') + mention,
      accent, bg, ink: encre,
      seed: hier.jour,
    })
  }

  const aEcrit = !!etat?.monVers

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── EN-TÊTE ── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← {tr('ACCUEIL', 'HOME')}
          </button>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.1em' }}>
            {tr('LE POÈME DU JOUR', 'THE POEM OF THE DAY')}
          </span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {chargement && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.span
              style={{ fontSize: 22, color: accent }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >✦</motion.span>
          </div>
        )}

        {!chargement && !etat && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 8px' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 19, color: encre, opacity: 0.7, lineHeight: 1.5 }}>
              {tr('Le registre ne répond pas.', 'The register is not answering.')}<br />
              {tr('Le poème du jour t’attend quand même — reviens dans un instant.', 'Today’s poem is waiting all the same — come back shortly.')}
            </p>
          </div>
        )}

        {!chargement && etat && (
          <>
            {/* ── LA RÈGLE, EN UNE LIGNE ── */}
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, lineHeight: 1.5, marginTop: 24, marginBottom: 20 }}>
              {tr(
                'Un seul poème aujourd’hui, écrit par toutes les mains qui passent. Tu en écris un vers, et tu ne vois du précédent que son dernier mot.',
                'One poem today, written by every hand that passes. You write one line of it, and of the line before you see only its last word.',
              )}
            </div>

            {/* ── L'ÉCHO — le seul endroit où l'on regarde ── */}
            {!aEcrit && !etat.scelle && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                  {etat.mains === 0
                    ? tr('— L’AMORCE DU JOUR —', '— TODAY’S SEED —')
                    : tr('— L’ÉCHO —', '— THE ECHO —')}
                </div>
                <div
                  className="font-fraunces font-black leading-tight"
                  style={{ fontSize: 'clamp(2.2rem, 10vw, 3.2rem)', color: accent, marginBottom: 8 }}
                >
                  {etat.echo}
                </div>
                <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.5, letterSpacing: '0.14em', marginBottom: 22 }}>
                  {etat.mains === 0
                    ? tr('PERSONNE N’A ENCORE ÉCRIT · TU OUVRES LE POÈME',
                         'NO ONE HAS WRITTEN YET · YOU OPEN THE POEM')
                    : tr(`${etat.mains} ${etat.mains > 1 ? 'MAINS SONT PASSÉES' : 'MAIN EST PASSÉE'} · TU SERAS LA ${ordinal(etat.rang).toUpperCase()}`,
                         `${etat.mains} ${etat.mains > 1 ? 'HANDS HAVE PASSED' : 'HAND HAS PASSED'} · YOU WILL BE THE ${ordinal(etat.rang).toUpperCase()}`)}
                </div>

                <input
                  ref={champ}
                  {...CLAVIER_VERS}
                  value={texte}
                  onChange={e => { setTexte(e.target.value); if (erreur) setErreur(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') envoyer() }}
                  placeholder={tr('ton vers — personne ne le verra avant minuit', 'your line — no one sees it before midnight')}
                  className="champ-carnet w-full"
                  style={{ borderLeftColor: accent, fontSize: 20 }}
                  aria-label={tr('Ton vers', 'Your line')}
                />

                <AnimatePresence>
                  {erreur && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: accent, marginTop: 8 }}
                      {...zoneVivante}
                    >
                      {erreur}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={envoyer}
                  disabled={envoi || !texte.trim()}
                  style={{
                    width: '100%', marginTop: 14,
                    background: encre, color: bg,
                    ...mono, fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '0.9em 1em', border: 'none', borderRadius: 3,
                    cursor: envoi || !texte.trim() ? 'default' : 'pointer',
                    opacity: envoi || !texte.trim() ? 0.55 : 1,
                  }}
                >
                  {envoi ? tr('ON POSE TA MAIN…', 'PLACING YOUR HAND…') : tr('Donner ma main', 'Give my hand')} ✧
                </button>
              </motion.div>
            )}

            {/* ── TU AS ÉCRIT — le rendez-vous est pris ── */}
            {aEcrit && etat.monVers && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                  {tr('— TON VERS —', '— YOUR LINE —')}
                </div>
                <div style={{
                  borderLeft: `2px solid ${accent}`, paddingLeft: 14,
                  fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                  fontSize: 'clamp(1.4rem, 6vw, 1.9rem)', color: encre, lineHeight: 1.4,
                  marginBottom: 12,
                }}>
                  {etat.monVers.texte}
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, lineHeight: 1.5 }}>
                  {tr(
                    `Tu es la ${ordinal(etat.monVers.rang)} main du poème. Il se referme à minuit, et tu sauras alors entre qui le sort t’a mise.`,
                    `You are the ${ordinal(etat.monVers.rang)} hand of the poem. It closes at midnight, and you will learn then between whom chance placed you.`,
                  )}
                </div>
              </motion.div>
            )}

            <div style={{ flex: 1, minHeight: 24 }} />

            {/* ── LE POÈME D'HIER, SCELLÉ ── */}
            {hier && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                style={{ marginTop: 20 }}
              >
                <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.14, marginBottom: 14 }} />
                <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 4 }}>
                  {tr('— LE POÈME ACHEVÉ —', '— THE FINISHED POEM —')}
                </div>
                <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.5, letterSpacing: '0.12em', marginBottom: 14 }}>
                  {hier.jour} · {hier.vers.length} {hier.vers.length > 1 ? tr('VERS', 'LINES') : tr('VERS', 'LINE')}
                  {' · '}
                  {hier.vers.filter(v => !v.voix).length} {tr('MAINS', 'HANDS')}
                </div>

                <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 15, color: accent, opacity: 0.8, marginBottom: 10 }}>
                  {hier.amorce}
                </div>

                {/*
                  La révélation s'ouvre sur TON vers et ses deux voisins — les
                  inconnus entre lesquels le sort t'a mise. Sur un poème long,
                  ouvrir au premier vers reviendrait à cacher la seule chose
                  qu'on vient chercher.
                */}
                {(() => {
                  const i = hier.monRang !== null ? hier.monRang - 1 : 0
                  const fenetre = toutVoir || hier.monRang === null
                    ? hier.vers
                    : hier.vers.slice(Math.max(0, i - 1), Math.min(hier.vers.length, i + 2))
                  const partiel = !toutVoir && hier.monRang !== null && fenetre.length < hier.vers.length

                  /*
                    LE FEUILLET FERMÉ — tant qu'on n'a pas touché.

                    Il porte l'amorce et les comptes, jamais un vers : le
                    poème se découvre en se dépliant, l'annoncer sur la
                    couverture viderait le geste.
                  */
                  if (!deplie) {
                    return (
                      <FeuilletPlie
                        vers={fenetre.length}
                        accent={accent}
                        encre={encre}
                        libelle={tr('Déplier le poème', 'Unfold the poem')}
                        onOuvrir={() => { jouer('clic'); vibrer('devoilement'); setDeplie(true) }}
                      >
                        <div style={{
                          ...mono, fontSize: 11, color: encre, opacity: 0.5,
                          letterSpacing: '0.14em', textAlign: 'center',
                          padding: '22px 0 20px',
                        }}>
                          {tr('TOUCHER POUR DÉPLIER', 'TOUCH TO UNFOLD')}
                        </div>
                      </FeuilletPlie>
                    )
                  }

                  /*
                    LE DÉPLI — la même séquence que la fin d'une partie.

                    On ne réécrit pas une seconde animation de papier : celle
                    de `PoemeDevoile` est mesurée (toute longueur en 10,7 s),
                    interruptible d'un appui, et elle honore déjà
                    `prefers-reduced-motion`. Réutiliser, c'est aussi garantir
                    que le poème du jour se dévoile EXACTEMENT comme un poème
                    de fin de partie — c'est le même objet.

                    Le style des vers est celui des coutures, au pixel près :
                    quand le dévoilement cède la place aux attributions, le
                    texte ne bouge pas d'une ligne.
                  */
                  if (!revele) {
                    return (
                      <div style={{ borderLeft: `1px solid ${accent}40`, paddingLeft: 12, marginLeft: 3 }}>
                        <PoemeDevoile
                          lignes={fenetre.map(v => v.texte)}
                          accent={accent}
                          actif
                          style={{
                            fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                            fontSize: 18, color: encre, opacity: 0.9, lineHeight: 1.5,
                            marginBottom: 28,
                          }}
                          onFini={() => {
                            setRevele(true)
                            try { localStorage.setItem(CLE_DEPLI, hier.jour) } catch { /* mode privé */ }
                          }}
                        />
                      </div>
                    )
                  }

                  return (
                    <>
                      {/*
                        LE POÈME RESTE TOUCHABLE une fois déplié.

                        Ce conteneur n'est PAS un bouton, et c'est délibéré :
                        les ⚑ en sont, et un bouton dans un bouton n'est pas
                        du HTML valide — le clavier n'y arrive jamais. C'est
                        donc un simple gestionnaire de clic, une commodité au
                        pointeur ; la commande accessible est « ⟡ COUTURES »
                        juste en dessous, qui fait exactement la même chose
                        et que le clavier atteint.
                      */}
                      <div
                        onClick={() => { jouer('clic'); setCoutures(c => !c) }}
                        style={{
                          borderLeft: `1px solid ${accent}40`, paddingLeft: 12, marginLeft: 3,
                          cursor: 'pointer',
                        }}
                      >
                        {fenetre.map((v, idx) => (
                          <div key={v.rang} style={{ marginBottom: 10 }}>
                            {/*
                              La MÊME taille pour tous, y compris le tien.

                              Il était à 19 contre 18 : d'un pixel, mais ce
                              pixel arrive juste après le dépli, qui vient
                              d'écrire la ligne à 18. Le vers sautait donc au
                              moment précis où l'on cesse de le regarder
                              s'écrire. Ton vers se marque par la COULEUR,
                              qui se fond sans rien déplacer.
                            */}
                            <div style={{
                              fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                              fontSize: 18,
                              color: v.aMoi ? accent : encre,
                              opacity: v.aMoi ? 1 : 0.9,
                              lineHeight: 1.5,
                              transition: 'color 0.6s ease',
                            }}>
                              {v.texte}
                            </div>
                            {/*
                              Les noms viennent APRÈS l'encre, et c'est la
                              promesse du jeu tenue à la lettre : « leurs noms
                              ne te seront rendus qu'au dernier vers ». Ils se
                              posent l'un après l'autre, dans l'ordre des
                              rangs, une fois la feuille ouverte.
                            */}
                            {/*
                              Les coutures se DÉMONTENT, elles ne se replient
                              pas à hauteur nulle.

                              Premier jet : `height: 0` et `overflow: hidden`.
                              Le texte restait dans le document — clippé,
                              pas absent — donc encore lu par un lecteur
                              d'écran, encore trouvé par la recherche de la
                              page, et le drapeau encore pressable. Masquer
                              n'est pas retirer, et ici c'est retirer qu'on
                              veut : on a demandé à lire le poème nu.
                            */}
                            <AnimatePresence initial={false}>
                            {coutures && (
                            <motion.div
                              key="coutures"
                              initial={reduit ? false : { opacity: 0, y: -2 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={reduit ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
                              transition={{ delay: 0.12 + idx * 0.07, duration: 0.45, ease: 'easeOut' }}
                              style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}
                            >
                              <span style={{ ...mono, fontSize: 10, color: encre, opacity: 0.45, letterSpacing: '0.1em' }}>
                                {v.rang} · {v.aMoi
                                  ? tr('TOI', 'YOU')
                                  : v.voix
                                    ? (v.voixNom ? nomDeVoix(v.voixNom, langueActuelle()).toUpperCase() : tr('UNE VOIX', 'A VOICE'))
                                    : (v.pseudo ?? tr('ANONYME', 'ANONYMOUS')).toUpperCase()}
                                {v.retire && ` · ${tr('VERS RETIRÉ', 'LINE WITHDRAWN')}`}
                              </span>
                              {/*
                                Le drapeau ne s'offre que sur le vers d'une
                                autre main : on ne signale pas le sien — ce
                                serait un moyen de récrire le poème des
                                autres après coup — ni celui d'une voix, qui
                                n'a pas de main à protéger.
                              */}
                              {!v.aMoi && !v.voix && !v.retire && (
                                <button
                                  onClick={() => signaler(v.id)}
                                  disabled={signales.has(v.id)}
                                  aria-label={tr('Signaler ce vers', 'Report this line')}
                                  title={tr('Signaler ce vers', 'Report this line')}
                                  style={{
                                    ...mono, fontSize: 10, letterSpacing: '0.1em',
                                    background: 'none', border: 'none', padding: 0,
                                    color: signales.has(v.id) ? accent : encre,
                                    opacity: signales.has(v.id) ? 0.8 : 0.35,
                                    cursor: signales.has(v.id) ? 'default' : 'pointer',
                                  }}
                                >
                                  {signales.has(v.id) ? tr('⚑ SIGNALÉ', '⚑ REPORTED') : '⚑'}
                                </button>
                              )}
                            </motion.div>
                            )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                      {/*
                        Deux gestes sous le poème, et pas un de plus. Les
                        coutures sont la récompense annoncée — « leurs noms
                        ne te seront rendus qu'au dernier vers » — donc elles
                        s'affichent d'abord ; on les retire pour LIRE, ce qui
                        est l'autre usage d'un poème.
                      */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, marginTop: 4, borderTop: `0.5px solid ${encre}12`, paddingTop: 2,
                      }}>
                        <button
                          onClick={() => { jouer('clic'); setCoutures(c => !c) }}
                          aria-pressed={coutures}
                          style={{
                            ...mono, fontSize: 12, letterSpacing: '0.1em',
                            color: coutures ? accent : encre, opacity: coutures ? 0.9 : 0.6,
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '12px 0', minHeight: 44,
                          }}
                        >
                          ⟡ {tr('COUTURES', 'SEAMS')}
                        </button>
                        <button
                          onClick={partagerLePoeme}
                          disabled={partage.enCours}
                          style={{
                            ...mono, fontSize: 12, letterSpacing: '0.1em',
                            color: partage.actif ? accent : encre, opacity: partage.actif ? 0.9 : 0.6,
                            background: 'none', border: 'none',
                            cursor: partage.enCours ? 'default' : 'pointer',
                            padding: '12px 0', minHeight: 44,
                          }}
                        >
                          {partage.libelle(tr('PARTAGER', 'SHARE'))}
                        </button>
                      </div>

                      {partiel && (
                        <button
                          onClick={() => {
                            jouer('clic')
                            setToutVoir(true)
                            /*
                              La feuille s'ouvre DAVANTAGE, elle ne saute
                              pas à plat. Rejouer ici ne contredit pas la
                              règle « on ne subit pas deux fois » : le
                              joueur vient de demander à voir plus, la
                              séquence est la réponse à son geste.
                            */
                            setRevele(false)
                          }}
                          style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0' }}
                        >
                          {tr(`LIRE LE POÈME ENTIER — ${hier.vers.length} VERS`, `READ THE WHOLE POEM — ${hier.vers.length} LINES`)} →
                        </button>
                      )}
                    </>
                  )
                })()}
              </motion.div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}
