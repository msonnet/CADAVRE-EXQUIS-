import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'
import { garderSiAbsent } from '../db'
import { poemeDuJour, idJour } from '../lib/versRecueil'
import BoutonRecolte from '../components/BoutonRecolte'
import { CLAVIER_VERS } from '../lib/clavier'
import { zoneVivante } from '../lib/a11y'
import { vibrer } from '../utils/haptics'
import FeuilletPlie from '../components/FeuilletPlie'
import PoemeDevoile from '../components/PoemeDevoile'
import { styleVers } from '../lib/composition'
import { usePartage } from '../hooks/usePartage'
import { mentionIA } from '../lib/attribution'
import { nomDeVoix } from '../data/voiceIds'
import { refusDuVers, MOTS_MAX, type RefusVers } from '../lib/jourLogique'
import {
  lireJour, poserVers, dernierPoemeScelle, signalerVers, almanach, lirePoemeScelle, horsLigne,
  type EtatDuJour, type PoemeScelle, type MotifRefus, type ChaineScellee,
} from '../lib/jour'
import {
  dejaDeplie, marquerDeplie, scelleGarde, almanachGarde, dernierAttendu, noterMain,
} from '../lib/jourLocal'
import { fermeture, heureAnnonce, libelleHeure } from '../lib/horlogeJour'
import { pointerSerie } from '../utils/streak'
import {
  annoncerScellement, etatAnnonce, rearmerRappelSiActif, type EtatAnnonce,
} from '../utils/notifications'

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
 *  · tu as écrit        → ton vers, l'heure où il se referme, et une suite
 *  · le poème d'hier    → scellé, lisible, ton vers mis en avant
 *
 * On ne montre jamais le poème du jour en cours, même à qui y a déjà écrit.
 * Attendre minuit UTC EST le jeu.
 *
 * ── Ce qui n'attend pas le réseau ─────────────────────────────────────────
 *
 * La phrase de la règle, et le poème scellé déjà reçu : il ne change plus,
 * l'appareil le garde (`jourLocal`). Seule la case où l'on pose son vers
 * attend le registre — et elle n'attend plus que six secondes.
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

/**
 * « DEMAIN À 9 H » — quand l'annonce partira, dit dans le fuseau du joueur.
 * C'est presque toujours demain ; aux fuseaux où la révélation passe minuit
 * local, ce peut être le surlendemain, et l'on écrit alors la date.
 */
function quandAnnonce(d: Date): string {
  const demain = new Date(); demain.setDate(demain.getDate() + 1)
  const h = libelleHeure(d, langueActuelle())
  if (d.toDateString() === demain.toDateString()) return tr(`DEMAIN À ${h}`, `TOMORROW AT ${h}`)
  const date = d.toLocaleDateString(tr('fr-FR', 'en-GB'), { day: 'numeric', month: 'short' }).toUpperCase()
  return tr(`LE ${date} À ${h}`, `ON ${date} AT ${h}`)
}

/** « 22 sept. » — le jour UTC d'une chaîne, dans la langue du joueur. */
function dateAlmanach(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`)
  return d.toLocaleDateString(tr('fr-FR', 'en-GB'), { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export default function PoemeDuJour() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const seance = useReve()
  const { jouer } = useSound()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'

  const langue = langueActuelle()
  /*
    LE POÈME GARDÉ, AVANT TOUTE REQUÊTE.

    Un poème scellé ne change plus : celui qu'on a déjà reçu s'affiche au
    premier rendu, sans étoile qui tourne, et le réseau ne fait ensuite que
    le confirmer. Il n'est présenté comme « le poème achevé » que s'il est
    bien le plus récent qu'on puisse attendre à cette heure ; une copie plus
    ancienne n'est qu'une page de l'almanach jusqu'à ce que le registre
    réponde.
  */
  const [garde] = useState(() => {
    const voulu = params.get('jour')
    const p = (voulu ? scelleGarde(langue, voulu) : null) ?? scelleGarde(langue)
    const connu = [almanachGarde(langue)[0]?.jour, scelleGarde(langue)?.jour]
      .filter((j): j is string => !!j).sort().pop() ?? null
    return { poeme: p, dernier: connu && connu >= dernierAttendu(new Date()) ? connu : null }
  })

  const [etat, setEtat] = useState<EtatDuJour | null>(null)
  const [hier, setHier] = useState<PoemeScelle | null>(garde.poeme)
  /** L'almanach — les journées scellées, et laquelle est la dernière. */
  const [jours, setJours] = useState<ChaineScellee[]>(() => almanachGarde(langue))
  const [dernier, setDernier] = useState<string | null>(garde.dernier)
  const [ouverture, setOuverture] = useState<string | null>(null)
  /** Le jour de l'almanach qu'on n'a pas pu ouvrir — ni gardé, ni reçu. */
  const [echecJour, setEchecJour] = useState<string | null>(null)
  /** Pourquoi la case du vers n'est pas là : pas de réseau, ou un registre muet. */
  const [reseau, setReseau] = useState<'hors-ligne' | 'muet' | null>(null)
  /** L'annonce du poème achevé, telle que l'écran « TON VERS » la propose. */
  const [annonce, setAnnonce] = useState<EtatAnnonce | 'demande' | 'refusee'>('muette')
  const haut = useRef<HTMLDivElement>(null)
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
    elle vaut ici. On retient donc LE JOUR déjà déplié (`cadavre-jour-deplie`,
    dans `jourLocal`, que l'accueil lit aussi) : revenir sur la page dans la
    même journée rouvre le poème à plat, sans rien redemander.
  */
  const [deplie, setDeplie] = useState(() => !!garde.poeme && dejaDeplie(garde.poeme.jour))
  // Le titre du poème scellé reçoit le focus quand on le déplie : le bouton
  // « Déplier » disparaît sous le doigt, et le focus tombait sur BODY — le
  // lecteur d'écran ne disait pas que le poème venait d'arriver.
  const titrePoeme = useRef<HTMLHeadingElement>(null)
  const focaliserPoeme = useRef(false)
  useEffect(() => {
    if (!deplie || !focaliserPoeme.current) return
    focaliserPoeme.current = false
    titrePoeme.current?.focus({ preventScroll: true })
  }, [deplie])
  /**
   * Les coutures s'affichent d'abord — c'est la récompense annoncée.
   * On les retire pour LIRE, ce qui est l'autre usage d'un poème, et le
   * geste est le poème lui-même : on le touche.
   */
  const [coutures, setCoutures] = useState(true)
  /** Le mouvement réduit coupe la pose des noms comme il coupe le dépli. */
  const reduit = typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [revele, setRevele] = useState(() => !!garde.poeme && dejaDeplie(garde.poeme.jour))
  /**
   * Le poème affiché, et si le joueur y a déjà touché. Quand le réseau
   * répond après coup, on remplace la copie gardée par la fraîche ; on ne
   * change de JOUR sous ses doigts que s'il n'a encore rien ouvert.
   */
  const vue = useRef<{ jour: string | null; touche: boolean }>({ jour: garde.poeme?.jour ?? null, touche: false })
  // Les vers qu'on vient de signaler, le temps de la visite : le serveur ne
  // dit pas « déjà signalé » deux fois de suite, et griser le drapeau évite
  // d'appuyer en boucle sans retour.
  const [signales, setSignales] = useState<Set<string>>(new Set())
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let vivant = true
    async function charger() {
      setChargement(true); setReseau(null)
      const [e, h, a] = await Promise.all([lireJour(), dernierPoemeScelle(), almanach()])
      // `?jour=` — un numéro touché au sommaire de la galerie. Il ouvre CE
      // jour, plié comme depuis l'almanach ; sans lui on aurait mené le
      // lecteur au dernier poème et laissé le sien à chercher plus bas. Un
      // jour inconnu ou illisible retombe sur le dernier, sans bruit.
      const voulu = params.get('jour')
      const cible = voulu && voulu !== h?.jour ? a.find(j => j.jour === voulu) : undefined
      const choisi = cible ? (await lirePoemeScelle(cible)) ?? h : h
      if (!vivant) return
      setEtat(e); setChargement(false)
      // Sobrement, et en distinguant les deux : sans réseau, c'est au
      // téléphone qu'il faut regarder ; avec, c'est le registre qui se tait.
      if (!e) setReseau(horsLigne() ? 'hors-ligne' : 'muet')
      if (a.length) setJours(a)
      if (h) setDernier(h.jour)
      if (choisi) recevoir(choisi)
      // Ta main est posée aujourd'hui : l'accueil le dira (✦), et le rappel
      // du soir saute ce soir-ci. Ne replanifie qu'à la nouvelle.
      if (e?.monVers && noterMain(langue, e.jour, e.monVers.rang)) void rearmerRappelSiActif()
    }
    void charger()
    // Le réseau revient : on relit sans attendre un geste. C'est le cas du
    // train qui sort du tunnel, exactement celui qu'on vise.
    const retour = () => { if (vivant) void charger() }
    window.addEventListener('online', retour)
    return () => { vivant = false; window.removeEventListener('online', retour) }
  }, [])

  /** La copie fraîche d'un poème : elle remplace la gardée sans rien rejouer. */
  function recevoir(p: PoemeScelle) {
    if (vue.current.jour === p.jour) {
      setHier(p)
      entrerAuRecueil(p)
    } else if (!vue.current.touche) {
      montrer(p)
    }
  }

  // Qui a posé un vers garde le poème : il entre au recueil, avec les
  // noms des mains. Sans geste — les deux boutons sous le poème restent
  // deux. Un visiteur qui n'a rien écrit ne s'en voit rien ajouter.
  function entrerAuRecueil(h: PoemeScelle) {
    if (h.monRang === null) return
    garderSiAbsent(poemeDuJour({ langue: langueActuelle(), jour: h.jour, vers: h.vers }))
      .catch(() => { /* stockage refusé : le poème reste lisible ici */ })
  }

  /** Montrer un poème scellé — le dernier, ou un jour de l'almanach. */
  function montrer(h: PoemeScelle | null) {
    vue.current.jour = h?.jour ?? null
    setHier(h)
    setToutVoir(false)
    setCoutures(true)
    if (h) entrerAuRecueil(h)
    // Déjà déplié : le feuillet s'ouvre à plat, sans redemander le geste ni
    // rejouer la séquence. Sinon il arrive plié.
    const ouvert = !!h && dejaDeplie(h.jour)
    setDeplie(ouvert); setRevele(ouvert)
  }

  async function ouvrirJour(c: ChaineScellee) {
    if (ouverture || c.jour === hier?.jour) return
    jouer('clic')
    vue.current.touche = true
    setEchecJour(null)
    // Un jour déjà gardé s'ouvre tout de suite ; le réseau ne fait que le
    // confirmer derrière.
    const g = scelleGarde(langue, c.jour)
    if (g) {
      montrer(g)
      haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      void lirePoemeScelle(c).then(p => { if (p) recevoir(p) })
      return
    }
    setOuverture(c.jour)
    const p = await lirePoemeScelle(c)
    setOuverture(null)
    if (!p) { setEchecJour(c.jour); return }
    montrer(p)
    haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /*
    L'ANNONCE, PROPOSÉE SOUS TON VERS.

    Elle ne se demandait nulle part ailleurs que dans les Réglages, au
    rappel du soir : la plupart des mains ne recevaient donc jamais la
    nouvelle la plus désirable du jeu. Le moment juste pour la demander est
    celui-ci — le joueur vient de donner sa main et attend la suite.
  */
  useEffect(() => {
    if (!etat?.monVers) return
    let vivant = true
    void etatAnnonce(etat.jour).then(v => {
      // Ne jamais redescendre : l'annonce a pu être armée entre-temps.
      if (vivant) setAnnonce(a => a === 'armee' ? a : v)
    })
    return () => { vivant = false }
  }, [etat?.jour, !!etat?.monVers])

  async function demanderAnnonce() {
    if (!etat?.monVers || annonce === 'demande') return
    jouer('clic')
    setAnnonce('demande')
    const ok = await annoncerScellement(etat.monVers.rang, etat.jour, true)
    setAnnonce(ok ? 'armee' : 'refusee')
  }

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
    const jour = etat?.jour
    if (jour) {
      // Retenir la main AVANT de replanifier : c'est elle qui fait sauter
      // le rappel de ce soir.
      noterMain(langue, jour, r.rang)
      void rearmerRappelSiActif()
    }
    // Et l'on se donne rendez-vous — sans rien demander : seul celui qui a
    // déjà accepté les notifications est prévenu d'office.
    const annonceArmee = jour ? annoncerScellement(r.rang, jour) : Promise.resolve(false)
    setEtat(await lireJour())
    setTexte('')
    if (await annonceArmee) setAnnonce('armee')
  }

  async function signaler(id: string) {
    if (signales.has(id)) return
    setSignales(s => new Set(s).add(id))
    const r = await signalerVers(id)
    // Retiré sur-le-champ : le vers a atteint le seuil, on relit le poème
    // plutôt que de laisser le texte signalé à l'écran. Un registre muet
    // rendait `null` et faisait disparaître le poème entier.
    if (r.ok && r.retire) {
      const p = await dernierPoemeScelle()
      if (p) recevoir(p)
    }
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
  /** L'heure locale où la chaîne d'aujourd'hui se ferme : « 2 h », « 5 PM ». */
  const heureFermeture = etat ? libelleHeure(fermeture(etat.jour), langue) : ''

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

        {/* ── LA RÈGLE, EN UNE LIGNE ── écrite avant toute réponse du réseau. */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, lineHeight: 1.5, marginTop: 24, marginBottom: 20 }}>
          {tr(
            'Un seul poème aujourd’hui, écrit par toutes les mains qui passent. Tu en écris un vers, et tu ne vois du précédent que son dernier mot.',
            'One poem today, written by every hand that passes. You write one line of it, and of the line before you see only its last word.',
          )}
        </div>

        {/* Seule la case du vers attend le registre — l'étoile tient sa
            place, elle ne prend plus la page entière. */}
        {chargement && !etat && (
          <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.span
              style={{ fontSize: 22, color: accent }}
              animate={reduit ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >✦</motion.span>
          </div>
        )}

        {!chargement && !etat && (
          <div style={{ minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 8px' }} {...zoneVivante}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 19, color: encre, opacity: 0.7, lineHeight: 1.5 }}>
              {reseau === 'hors-ligne'
                ? <>
                    {tr('Pas de réseau.', 'No network.')}<br />
                    {hier
                      ? tr('Ta main attendra son retour ; le poème achevé, lui, est gardé ici.', 'Your hand will wait for it; the finished poem is kept here.')
                      : tr('Ta main attendra son retour.', 'Your hand will wait for it.')}
                  </>
                : <>
                    {tr('Le registre ne répond pas.', 'The register is not answering.')}<br />
                    {tr('Le poème du jour t’attend quand même — reviens dans un instant.', 'Today’s poem is waiting all the same — come back shortly.')}
                  </>}
            </p>
            {/* Le réseau pendu ne prévient pas de son retour : un geste
                pour relire, plutôt qu'une page à recharger. */}
            {reseau === 'muet' && (
              <button
                onClick={() => { jouer('clic'); window.dispatchEvent(new Event('online')) }}
                style={{ ...mono, fontSize: 12, letterSpacing: '0.14em', color: accent, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', minHeight: 44 }}
              >
                {tr('RÉESSAYER', 'TRY AGAIN')}
              </button>
            )}
          </div>
        )}

            {/* ── L'ÉCHO — le seul endroit où l'on regarde ── */}
            {etat && !aEcrit && !etat.scelle && (
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
                  placeholder={tr(`ton vers — personne ne le verra avant ${heureFermeture}`, `your line — no one sees it before ${heureFermeture}`)}
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
            {etat && aEcrit && etat.monVers && (
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
                {/*
                  L'HEURE LOCALE, et non « minuit ».

                  Le poème se ferme à minuit UTC : 2 h à Lamastre l'été, 1 h
                  l'hiver, 17 h en Californie. « À minuit » était faux pour
                  à peu près tout le monde.
                */}
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, lineHeight: 1.5 }}>
                  {tr(
                    `Tu es la ${ordinal(etat.monVers.rang)} main du poème. Il se referme à ${heureFermeture}, et tu sauras alors entre qui le sort t’a mise.`,
                    `You are the ${ordinal(etat.monVers.rang)} hand of the poem. It closes at ${heureFermeture}, and you will learn then between whom chance placed you.`,
                  )}
                </div>

                {/*
                  LA SUITE — l'écran n'est plus une impasse.

                  Deux lignes en petites capitales, pas des boutons pleins :
                  la page a déjà dit l'essentiel. La première ne se montre
                  que si l'appareil sait notifier et qu'on ne l'a pas
                  refusé ; la seconde toujours, parce qu'attendre la nuit
                  n'oblige pas à attendre sans rien faire.
                */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 14 }}>
                  {(annonce === 'proposable' || annonce === 'demande') && (
                    <button
                      onClick={demanderAnnonce}
                      disabled={annonce === 'demande'}
                      style={{
                        ...mono, fontSize: 12, letterSpacing: '0.12em', textAlign: 'left',
                        color: accent, opacity: annonce === 'demande' ? 0.5 : 0.9,
                        background: 'none', border: 'none', cursor: annonce === 'demande' ? 'default' : 'pointer',
                        padding: '12px 0', minHeight: 44,
                      }}
                    >
                      ✧ {tr('M’ÉCRIRE QUAND IL SERA ACHEVÉ', 'TELL ME WHEN IT IS FINISHED')}
                    </button>
                  )}
                  {annonce === 'armee' && (
                    <div style={{ ...mono, fontSize: 12, letterSpacing: '0.12em', color: accent, opacity: 0.85, padding: '12px 0' }} {...zoneVivante}>
                      ✦ {tr('ON T’ÉCRIRA', 'WE WILL WRITE TO YOU')} {quandAnnonce(heureAnnonce(etat.jour, new Date()))}
                    </div>
                  )}
                  {annonce === 'refusee' && (
                    <div style={{ ...mono, fontSize: 12, letterSpacing: '0.12em', color: encre, opacity: 0.6, padding: '12px 0', lineHeight: 1.6 }} {...zoneVivante}>
                      {tr('NOTIFICATIONS REFUSÉES · LES RÉGLAGES DU TÉLÉPHONE LES ROUVRENT', 'NOTIFICATIONS DECLINED · YOUR PHONE SETTINGS CAN REOPEN THEM')}
                    </div>
                  )}
                  <button
                    onClick={() => { jouer('clic'); navigate('/config') }}
                    style={{
                      ...mono, fontSize: 12, letterSpacing: '0.12em', textAlign: 'left',
                      color: encre, opacity: 0.7,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '12px 0', minHeight: 44,
                    }}
                  >
                    {tr('EN ATTENDANT — UN CADAVRE ÉCRIT', 'IN THE MEANTIME — A WRITTEN CADAVRE')} →
                  </button>
                </div>
              </motion.div>
            )}

            <div style={{ flex: 1, minHeight: 24 }} />

            {/* ── LE POÈME D'HIER, SCELLÉ ── */}
            {hier && (
              <motion.div
                key={hier.jour}
                ref={haut}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                style={{ marginTop: 20, scrollMarginTop: 16 }}
              >
                <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.14, marginBottom: 14 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  {/* Un vrai titre, au style inchangé : le rotor « Titres »
                      le trouve, et il reçoit le focus au dépli. */}
                  <h2 ref={titrePoeme} tabIndex={-1} style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', outline: 'none' }}>
                    {hier.jour === dernier
                      ? tr('— LE POÈME ACHEVÉ —', '— THE FINISHED POEM —')
                      : tr('— DANS L’ALMANACH —', '— FROM THE ALMANAC —')}
                  </h2>
                  {dernier && hier.jour !== dernier && (
                    <button
                      onClick={() => { const c = jours.find(j => j.jour === dernier); if (c) void ouvrirJour(c) }}
                      style={{ ...mono, fontSize: 12, letterSpacing: '0.12em', color: encre, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0' }}
                    >
                      ← {tr('LE DERNIER', 'THE LATEST')}
                    </button>
                  )}
                </div>
                <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.5, letterSpacing: '0.12em', marginBottom: 14 }}>
                  {dateAlmanach(hier.jour).toUpperCase()} · {hier.vers.length} {hier.vers.length > 1 ? tr('VERS', 'LINES') : tr('VERS', 'LINE')}
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
                        onOuvrir={() => { vue.current.touche = true; jouer('clic'); vibrer('devoilement'); focaliserPoeme.current = true; setDeplie(true) }}
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
                            marquerDeplie(hier.jour)
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
                              // Le retrait des débords, comme pendant le
                              // dépli (`VersEncre`) : sans lui, la suite d'un
                              // vers long sauterait au bord à l'instant où
                              // le dépli cède la place aux coutures.
                              ...styleVers(),
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
                                Garder le vers d'une autre main. Le carnet ne
                                récoltait que ses propres coutures, alors que ce
                                sont les vers des autres qui font les meilleurs
                                assemblages — et qu'un visiteur qui n'a rien
                                écrit n'emporte pas le poème au recueil. Le lien
                                vers le poème n'est posé que s'il y est entré.
                              */}
                              <BoutonRecolte
                                compact
                                texte={v.texte}
                                accent={accent}
                                encre={encre}
                                poemeId={hier.monRang !== null ? idJour(langueActuelle(), hier.jour) : undefined}
                                poemeTitre={tr('Poème du jour', 'Poem of the day')}
                                datePoeme={Date.parse(`${hier.jour}T12:00:00Z`)}
                                signature={v.aMoi
                                  ? tr('toi', 'you')
                                  : v.voix
                                    // La forme d'`attribution` pour une voix : « voix · Le
                                    // géologue ». Recousu en feuillet, le nom y redevient un lien.
                                    ? (v.voixNom ? `${tr('voix', 'voice')} · ${nomDeVoix(v.voixNom, langueActuelle())}` : tr('voix', 'voice'))
                                    : (v.pseudo || tr('une main', 'a hand'))}
                                auteur={v.voix ? 'ia' : 'humain'}
                              />
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
                            vue.current.touche = true
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

            {/* ── L'ALMANACH ──
                Les journées d'avant. Un jour manqué ne fait plus disparaître
                un poème : il reste ici, plié, jusqu'à ce qu'on l'ouvre. */}
            {jours.filter(j => j.jour !== hier?.jour).length > 0 && (
              <nav aria-label={tr('Almanach des poèmes du jour', 'Almanac of daily poems')} style={{ marginTop: 28 }}>
                <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.14, marginBottom: 14 }} />
                <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                  {tr('— L’ALMANACH —', '— THE ALMANAC —')}
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {jours.filter(j => j.jour !== hier?.jour).map(j => (
                    <li key={j.id} style={{ borderBottom: `0.5px solid ${encre}10` }}>
                      <button
                        onClick={() => void ouvrirJour(j)}
                        disabled={!!ouverture}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'baseline', gap: 14, textAlign: 'left',
                          background: 'none', border: 'none', cursor: ouverture ? 'wait' : 'pointer',
                          padding: '12px 0', minHeight: 44, color: encre,
                        }}
                      >
                        <span style={{ ...mono, fontSize: 12, letterSpacing: '0.12em', opacity: 0.6, flexShrink: 0, minWidth: '7.5em' }}>
                          {dateAlmanach(j.jour).toUpperCase()}
                        </span>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 16, opacity: ouverture === j.jour ? 0.45 : 0.85 }}>
                          {j.amorce}
                        </span>
                      </button>
                      {/* Ni gardé sur l'appareil, ni reçu : on le dit là où
                          l'on a touché, pas en haut d'une page qu'on a
                          quittée des yeux. */}
                      {echecJour === j.jour && (
                        <div style={{ ...mono, fontSize: 11, letterSpacing: '0.12em', color: accent, opacity: 0.8, paddingBottom: 10 }} {...zoneVivante}>
                          {horsLigne()
                            ? tr('PAS DE RÉSEAU · CE JOUR N’EST PAS GARDÉ ICI', 'NO NETWORK · THIS DAY IS NOT KEPT HERE')
                            : tr('LE REGISTRE NE RÉPOND PAS', 'THE REGISTER IS NOT ANSWERING')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            )}
      </div>
    </PageTransition>
  )
}
