import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoemes, sauvegarderIllustration } from '../db'
import type { ConfigPartie, Poeme } from '../types'
import { useSound } from '../hooks/useSound'
import { genererIllustration } from '../api/illustration'
import { corrigerAccords } from '../api/corriger'
import { Decor, useReve } from '../reve'
import RevealAssemblageTexte from '../components/RevealAssemblageTexte'
import PoemeDevoile from '../components/PoemeDevoile'
import TutorielCoach from '../components/TutorielCoach'
import { useTutoriel, TUTORIEL_TOTAL, T_FIN_REVEL, T_FIN_SUITE, T_BIBLIO } from '../hooks/useTutoriel'
import { vibrer } from '../utils/haptics'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'
import MurAbonnement from '../components/MurAbonnement'
import SoldeEncrier from '../components/SoldeEncrier'
import { attribution, libelleMorceaux } from '../lib/attribution'
import EtiquetteReserve from '../components/EtiquetteReserve'
import { zoneVivante } from '../lib/a11y'
import { ouvrirTable } from '../lib/lancerTable'
import { lignesDuFeuillet } from '../lib/plis'
import { corpsDuPoeme, TAILLE_CORPS, RETRAIT_DEBORD } from '../lib/composition'
import MainsDuVers from '../components/MainsDuVers'
import { usePartage } from '../hooks/usePartage'
import BoutonRecolte from '../components/BoutonRecolte'
import { useAuth } from '../hooks/useAuth'
import type { Refus } from '../lib/acces'

const STYLES = langueActuelle() === 'en' ? [
  { id: 'aquarelle',           label: 'Watercolor' },
  { id: 'fusain',              label: 'Charcoal' },
  { id: 'huile',               label: 'Oil painting' },
  { id: 'encre',               label: 'India ink' },
  { id: 'gravure',             label: 'Engraving' },
  { id: 'hyperrealisme',       label: 'Hyperrealism' },
  { id: 'collage_surrealiste', label: 'Surrealist collage' },
  { id: 'libre',               label: 'Free' },
] : [
  { id: 'aquarelle',           label: 'Aquarelle' },
  { id: 'fusain',              label: 'Fusain' },
  { id: 'huile',               label: "Peinture à l'huile" },
  { id: 'encre',               label: 'Encre de Chine' },
  { id: 'gravure',             label: 'Gravure' },
  { id: 'hyperrealisme',       label: 'Hyperréalisme' },
  { id: 'collage_surrealiste', label: 'Collages surréalistes' },
  { id: 'libre',               label: 'Libre' },
]

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

const STRUCT_LABELS: Record<string, string> = langueActuelle() === 'en' ? {
  'phrase-simple': 'Short form',
  'phrase-etoffee': 'Full form',
  'vers-libre': 'Free verse',
  'atelier': 'The Workshop',
} : {
  'phrase-simple': 'Structure courte',
  'phrase-etoffee': 'Structure étoffée',
  'vers-libre': 'Vers libre',
  'atelier': "L'Atelier",
}

// Lu à l'appel, comme dans PoemeDevoile : le réglage peut changer en cours de route.
const mouvementReduit = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function FinDePartie() {
  const navigate = useNavigate()
  const location = useLocation()
  const seance = useReve()
  const [poeme, setPoeme] = useState<Poeme | null>(
    (location.state as { poeme?: Poeme } | null)?.poeme ?? null
  )
  // La table qui vient de jouer — absente après la Découverte et l'Atelier,
  // qui ne se rejouent pas « à la même table ».
  const table = (location.state as { table?: ConfigPartie } | null)?.table ?? null
  const aPlusieurs = !!table && table.joueursHumains > 1
  const [relance, setRelance] = useState(false)
  const [activeSection, setActiveSection] = useState<'recueil' | 'coutures' | 'image' | null>(null)
  // À plusieurs mains, les coutures se dévoilent une à une, au toucher et
  // dans l'ordre des cases — on devine avant de savoir. Elles s'ouvraient
  // d'un bloc : autour de la table, la question « qui a écrit ça ? » était
  // tranchée avant d'avoir été posée. Seul, il n'y a rien à deviner.
  const [devoilees, setDevoilees] = useState(0)
  const voiles = useRef<(HTMLElement | null)[]>([])
  const focusApres = useRef<number | null>(null)
  const [revealReady, setRevealReady] = useState(false)
  /*
    Trois instants, dans cet ordre, et la page n'en connaissait qu'un.

    Les délais de la page couraient depuis son MONTAGE, donc sous le rideau
    d'assemblage : quand il se levait, « SCELLER AU RECUEIL », PARTAGER et
    NOUVELLE PARTIE étaient déjà là, pleins, au-dessus d'une carte encore
    vide — l'invitation à quitter le poème arrivait avant lui. Et le titre
    du rideau, « Le cadavre se reconstitue… », traversait la carte en
    surimpression pendant son demi-seconde de sortie.

      — `rideauLeve` : le rideau est SORTI, pas seulement congédié. Le titre
        frappe et l'encre commence à cet instant, sur une page nette.
      — `poemeFini` : le dernier mot est posé (ou le joueur a touché pour
        abréger). Les actions montent alors, et pas avant.
      — `coachPret` : le guide s'ouvre un temps après, jamais pendant
        l'écriture. Toucher son bouton pendant l'encre posait tout le poème
        d'un coup, puisque PoemeDevoile écoute l'appui en capture.
  */
  const [rideauLeve, setRideauLeve] = useState(false)
  const [poemeFini, setPoemeFini] = useState(false)
  const [coachPret, setCoachPret] = useState(false)
  const titreRef = useRef<HTMLHeadingElement>(null)
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null)
  const [styleChoisi, setStyleChoisi] = useState<string | null>(null)
  const [promptLibre, setPromptLibre] = useState('')
  const [generatingIllustration, setGeneratingIllustration] = useState(false)
  const [erreurIllustration, setErreurIllustration] = useState<string | null>(null)
  const [refus, setRefus] = useState<Refus | null>(null)
  // Le solde se relit à la RETOMBÉE de la génération, jamais au montage : un
  // chiffre affiché juste avant que l'image soit décomptée serait périmé
  // sous les yeux du joueur.
  const [soldeRelu, setSoldeRelu] = useState(0)
  const generationPrecedente = useRef(false)
  // Dernier style demandé — le mur le rejoue une fois l'abonnement ouvert
  const styleChoisiRef = useRef<string | null>(null)
  const [promptVisuel, setPromptVisuel] = useState<string | null>(null)
  const [promptVisible, setPromptVisible] = useState(false)
  const [texteCorrige, setTexteCorrige] = useState<string | null>(null)
  const correctionPromise = useRef<Promise<string> | null>(null)
  const [pleinEcran, setPleinEcran] = useState(false)
  const partage = usePartage({ libelleCopie: tr('✓ POÈME COPIÉ', '✓ POEM COPIED') })
  const { profile } = useAuth()
  const { jouer } = useSound()

  // Le geste qui dévoile une couture rend le focus à la suivante ; sans
  // cela il tombait sur BODY, le bouton venant de disparaître.
  useEffect(() => {
    if (focusApres.current === null) return
    voiles.current[focusApres.current]?.focus()
    focusApres.current = null
  }, [devoilees])

  useEffect(() => {
    if (!pleinEcran) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPleinEcran(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pleinEcran])

  const sc = seance?.colorSchema
  const accent = sc?.hex ?? '#b22c20'
  const encre = sc?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = sc?.name.toUpperCase() ?? ''
  // Les liens empilés du bas : une boîte de 44 px chacun (voir plus bas).
  const lienBas: React.CSSProperties = {
    ...mono, fontSize: 13, color: encre, opacity: 0.75, background: 'none', border: 'none', textAlign: 'center',
    minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const { etape: tutEtape, actif: tutActif, avancer: tutAvancer, allerA: tutAllerA, terminer: tutTerminer } = useTutoriel()

  // La sortie du rideau prévient d'elle-même (`onExitComplete`). Le filet :
  // une animation suspendue — onglet en arrière-plan — ne doit pas garder
  // le poème sous clé.
  useEffect(() => {
    if (!revealReady || rideauLeve) return
    const t = setTimeout(() => setRideauLeve(true), 900)
    return () => clearTimeout(t)
  }, [revealReady, rideauLeve])

  // Le titre reçoit le focus au lever du rideau : le lecteur d'écran
  // annonce enfin que le poème est arrivé, et la lecture part de là.
  useEffect(() => {
    if (rideauLeve) titreRef.current?.focus({ preventScroll: true })
  }, [rideauLeve])

  useEffect(() => {
    if (!poemeFini) return
    const t = setTimeout(() => setCoachPret(true), 600)
    return () => clearTimeout(t)
  }, [poemeFini])

  const onPoemeFini = useCallback(() => setPoemeFini(true), [])

  useEffect(() => {
    if (!poeme) {
      chargerPoemes()
        .then(ps => { if (ps.length > 0) setPoeme(ps[0]) })
        .catch(console.error)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (poeme?.illustration) {
      setIllustrationUrl(poeme.illustration.url)
      setStyleChoisi(poeme.illustration.style)
    }
  }, [poeme?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!poeme) return
    let cancelled = false
    const structure = getStructure(poeme.structureId)
    const brut = reconstruirePoeme(poeme.cases, structure)
    setTexteCorrige(null)
    const blocs = poeme.cases.map((c, i) => ({
      texte: c.texte,
      type: structure.cases[i]?.type ?? 'libre',
    }))
    const p = corrigerAccords(brut, poeme.structureId, blocs)
    correctionPromise.current = p
    p.then(t => { if (!cancelled) setTexteCorrige(t) })
    return () => { cancelled = true }
  }, [poeme?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (generationPrecedente.current && !generatingIllustration) setSoldeRelu(v => v + 1)
    generationPrecedente.current = generatingIllustration
  }, [generatingIllustration])

  function choisirStyle(style: string) {
    if (!poeme || generatingIllustration) return
    styleChoisiRef.current = style
    setStyleChoisi(style)
    setErreurIllustration(null)
    setGeneratingIllustration(true)
    const structure = getStructure(poeme.structureId)
    const texte = reconstruirePoeme(poeme.cases, structure)
    const pl = promptLibre.trim() || undefined
    genererIllustration(texte, style, pl)
      .then(({ url, promptVisuel: pv, reason, refus: refuse }) => {
        // Encrier sec : on ouvre le mur au lieu d'une erreur sèche
        if (refuse) {
          setRefus(refuse)
          setStyleChoisi(null)
          setGeneratingIllustration(false)
          return
        }
        if (url) {
          setIllustrationUrl(url)
          if (pv) setPromptVisuel(pv)
          const illustration = { url, style, promptLibre: pl, promptUtilise: texte, dateGeneration: Date.now() }
          sauvegarderIllustration(poeme.id, illustration).catch(console.error)
          // On NE lève pas l'attente ici : c'est `onLoad` de l'image qui s'en
          // charge. Voir la note sur le drapeau, plus bas dans le rendu.
          // Sauf si le serveur rend exactement l'image déjà affichée —
          // `onLoad` ne se déclencherait pas et l'attente ne finirait jamais.
          if (url === illustrationUrl) setGeneratingIllustration(false)
          return
        } else {
          const msg = reason === 'not_configured'
            ? tr("Génération d'images non configurée (clé FAL_KEY manquante)", 'Image generation not configured (missing FAL_KEY)')
            : reason === 'timeout'
            ? tr('La génération a pris trop de temps — réessaie', 'Generation took too long — try again')
            : tr('Illustration indisponible — réessaie dans un instant', 'Illustration unavailable — try again in a moment')
          setErreurIllustration(msg)
          setStyleChoisi(null)
        }
        setGeneratingIllustration(false)
      })
      // Un `then` qui jette laisserait « EN COURS… » à vie : le repli est ici.
      .catch(() => {
        setErreurIllustration(tr(
          'Illustration indisponible — réessaie dans un instant',
          'Illustration unavailable — try again in a moment',
        ))
        setGeneratingIllustration(false)
      })
  }

  /**
   * Relancer après un échec.
   *
   * `styleChoisi` est remis à null quand la génération échoue — la relance
   * lisait donc null et ne faisait rien. Le style demandé survit dans la
   * référence, qui existait déjà pour rejouer la demande après l'abonnement.
   */
  function relancer() {
    const style = styleChoisi ?? styleChoisiRef.current
    if (style) choisirStyle(style)
  }

  /**
   * Une autre partie, à la même table.
   *
   * La soirée se joue par parties successives, et le geste qui la continuait
   * était un lien de 13 px vers des préparatifs remis à zéro. Les mêmes
   * mains, les mêmes prénoms, les mêmes règles — et la même porte que les
   * préparatifs : une table où une voix écrit se règle à son ouverture, le
   * raccourci ne contourne pas l'encrier.
   */
  async function memeTable() {
    if (!table || relance) return
    jouer('demarrage')
    setRelance(true)
    const refuse = await ouvrirTable(table)
    setRelance(false)
    if (refuse) { setRefus(refuse); return }
    navigate('/jeu')
  }

  /*
    Les deux gestes que le guide propose après le premier poème. Le guide
    reprend ensuite au recueil (`T_BIBLIO`) : celui qui rejoue tout de suite
    le retrouvera là, en y venant — le rendez-vous du poème du jour, à la
    toute fin, n'est pas perdu pour avoir choisi de rejouer.
  */
  function encoreUne() {
    tutAllerA(T_BIBLIO)
    if (table) { void memeTable(); return }
    navigate('/config')
  }

  function aPlusieursIci() {
    tutAllerA(T_BIBLIO)
    navigate('/config?mains=2')
  }

  if (!poeme) {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, textAlign: 'center' }}>
          {tr('Aucun poème en cours.', 'No poem in progress.')}
        </p>
        <button
          onClick={() => navigate('/config')}
          style={{ marginTop: 32, background: accent, color: btnText, ...mono, fontSize: 17, textTransform: 'uppercase', padding: '0.9em 1.8em', border: 'none', cursor: 'pointer', borderRadius: 3 }}
        >
          {tr('Nouvelle partie', 'New game')}
        </button>
      </PageTransition>
    )
  }

  const structure = getStructure(poeme.structureId)
  const texte = reconstruirePoeme(poeme.cases, structure)
  // Une phrase se déplie un fragment par bande — un pli par main
  // (`lib/plis.ts`). Les vers, eux, sont déjà une main par ligne. Chaque
  // ligne sait de quelle case elle vient : c'est là que sa couture se pose.
  const feuillet = lignesDuFeuillet(poeme.structureId, poeme.cases.map(c => c.texte), texteCorrige)
  const lignes = feuillet.lignes
  const corps = corpsDuPoeme(lignes, poeme.structureId)
  const voixCount = poeme.cases.length
  const couturesOuvertes = activeSection === 'coutures'

  /*
    Les coutures se posent SUR le poème, sous chaque vers — la forme que le
    poème du jour a trouvée. Elles ouvraient sous la carte une seconde liste
    qui recopiait chaque vers, avec sa fonction de structure (« X — toi »)
    et un bouton « ◇ GARDER » par ligne : un atelier de onze vers
    s'affichait deux fois de suite, et les noms arrivaient loin sous le pli.

    Elles se DÉMONTENT au lieu de se replier : un texte clippé reste lu par
    le lecteur d'écran et trouvé par la recherche de la page.
  */
  function couture(j: number): React.ReactNode {
    if (!couturesOuvertes || !poeme) return null
    const i = feuillet.cases[j]
    const c = poeme.cases[i]
    if (!c) return null
    const iaNum = c.voixSlot ?? poeme.cases.slice(0, i).filter(x => x.auteur === 'ia').length + 1
    // Voilée tant que la table ne l'a pas demandée ; seule la SUIVANTE se
    // touche, pour que l'ordre des cases tienne.
    const voilee = aPlusieurs && i >= devoilees
    const suivante = voilee && i === devoilees
    // Petites capitales par le style, pas par le texte : le lecteur d'écran
    // lit un nom, il n'épelle pas des majuscules.
    const signe: React.CSSProperties = { ...mono, fontSize: 11, letterSpacing: '0.12em', fontStyle: 'normal', textIndent: 0, textTransform: 'uppercase' }
    return (
      <motion.div
        data-couture
        initial={mouvementReduit() ? false : { opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 + Math.min(j, 12) * 0.06, duration: 0.4, ease: 'easeOut' }}
        style={{ paddingLeft: RETRAIT_DEBORD, marginTop: -2, marginBottom: 8 }}
      >
        <div style={{ ...signe, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: encre, lineHeight: 1.4 }}>
          <span style={{ opacity: 0.5 }}>{i + 1} ·</span>
          {suivante ? (
            <button
              ref={el => { voiles.current[i] = el }}
              onClick={() => { focusApres.current = i + 1; setDevoilees(i + 1) }}
              aria-label={tr(`Dévoiler qui a écrit le fragment ${i + 1}`, `Reveal who wrote fragment ${i + 1}`)}
              style={{ ...signe, color: accent, background: 'none', border: 'none', borderBottom: `1px dotted ${accent}`, padding: 0, cursor: 'pointer' }}
            >
              {tr('QUI ?', 'WHO?')}
            </button>
          ) : voilee ? (
            <span aria-hidden="true" style={{ opacity: 0.35, letterSpacing: '0.3em' }}>· · ·</span>
          ) : (
            <motion.span
              ref={el => { voiles.current[i] = el }}
              tabIndex={-1}
              initial={aPlusieurs && !mouvementReduit() ? { opacity: 0 } : false}
              animate={{ opacity: 0.75 }}
              transition={{ duration: 0.35 }}
              style={{ outline: 'none' }}
            >
              {attribution(c, iaNum)}
            </motion.span>
          )}
          {c.fallback && !voilee && <EtiquetteReserve voixNom={c.voixNom} accent={accent} />}
          {/* Garder ce vers : un glyphe de marge, à droite, qui prend l'accent une fois gardé. */}
          <span style={{ marginLeft: 'auto' }}>
            <BoutonRecolte
              glyphe
              texte={c.texte}
              accent={accent}
              encre={encre}
              poemeId={poeme.id}
              poemeTitre={poeme.titre}
              datePoeme={poeme.dateCreation}
              signature={attribution(c, iaNum)}
              nbVoix={c.nbVoix}
            />
          </span>
        </div>
        {c.mains?.length && !voilee ? <MainsDuVers mains={c.mains} accent={accent} encre={encre} /> : null}
      </motion.div>
    )
  }

  async function partager() {
    if (!poeme || partage.enCours) return
    const textePartage = texteCorrige ?? (correctionPromise.current ? await correctionPromise.current : texte)
    await partage.partager({
      type: 'poeme',
      titre: poeme.titre ?? '',
      texte: textePartage,
      imageDataUrl: illustrationUrl || undefined,
      accent, bg, ink: encre,
      date: poeme.dateCreation,
      seed: poeme.id,
    })
  }

  const structLabel = STRUCT_LABELS[poeme.structureId] ?? poeme.structureId
  const heureStr = new Date(poeme.dateCreation).toLocaleTimeString(tr('fr-FR', 'en-GB'), { hour: '2-digit', minute: '2-digit' })
  /*
    « FEUILLET 5 · FIN » comptait des CASES sous un mot qui désigne une
    feuille. Dans une revue « FEUILLET 5 » se lit « feuillet numéro 5 » : le
    libellé annonçait un rang là où il donnait un total, et il annonçait un
    rang qui n'existe pas — il n'y a qu'un feuillet.

    On ôte le nombre plutôt que de le corriger. `libelleMorceaux` l'annonce
    déjà, juste, quelques lignes plus bas et sur le même écran — « 5
    FRAGMENTS · PHRASE ÉTOFFÉE · 21:04 ». Le porter aussi dans le bouton de
    retour le dirait deux fois pour n'en rendre vrai qu'une.

    Le mot « FEUILLET » reste, car sans nombre il redevient ce qu'il est :
    le titre de la feuille, et non son rang. C'est déjà son emploi au détail
    du poème, où il ne compte rien.
  */
  const feuilletLabel = `${tr('FEUILLET', 'FOLIO')} · ${tr('FIN', 'END')}`
  const labelStyle = STYLES.find(s => s.id === styleChoisi)?.label

  return (
    <>
      {/* ── SÉQUENCE D'ASSEMBLAGE THÉÂTRALE ── */}
      <AnimatePresence onExitComplete={() => setRideauLeve(true)}>
        {!revealReady && poeme && (
          <RevealAssemblageTexte
            fragments={poeme.cases.map(c => ({ texte: c.texte }))}
            voixCount={voixCount}
            libelle={libelleMorceaux(poeme.structureId, voixCount)}
            accent={accent}
            encre={encre}
            bg={bg}
            jouerClimax={() => jouer('revelation')}
            onTermine={() => setRevealReady(true)}
          />
        )}
      </AnimatePresence>
      <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
        <Decor variant={illustrationUrl ? 'fin-image' : 'fin'} />

      {/* ── LE MUR ── */}
      <MurAbonnement
        visible={refus !== null}
        acte={refus?.acte ?? 'image_pro'}
        motif={refus?.motif ?? 'essai_epuise'}
        plafond={refus?.plafond}
        onFermer={() => setRefus(null)}
        onEncrierRempli={() => {
          const acte = refus?.acte
          setRefus(null)
          if (acte === 'partie_ia') { memeTable(); return }
          if (styleChoisiRef.current) choisirStyle(styleChoisiRef.current)
        }}
        accent={accent} encre={encre} bg={bg}
      />

      {/* ── PLEIN ÉCRAN ILLUSTRATION ── */}
      <AnimatePresence>
        {pleinEcran && illustrationUrl && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Illustration en plein écran"
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(10,6,3,0.97)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setPleinEcran(false)}
          >
            <img
              src={illustrationUrl}
              alt="Illustration du poème en plein écran"
              style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain' }}
            />
            {labelStyle && (
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: 13, letterSpacing: '0.18em', color: '#e8d4b8', opacity: 0.75, marginTop: 12 }}>
                {labelStyle.toUpperCase()}
              </p>
            )}
            <button
              aria-label="Fermer le plein écran"
              onClick={e => { e.stopPropagation(); setPleinEcran(false) }}
              style={{ position: 'absolute', top: 'max(20px, var(--sa-top))', right: 'max(20px, var(--sa-right))', fontFamily: "'Raleway', sans-serif", fontSize: 13, letterSpacing: '0.18em', color: '#e8d4b8', opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
            >
              ✕ {tr('FERMER', 'CLOSE')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {feuilletLabel}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── TITLE — frappé au lever de rideau ──
            Un vrai titre (`h1`), au style inchangé : le rotor « Titres » de
            VoiceOver ne trouvait rien sur les écrans de jeu. Il reçoit le
            focus quand le rideau est sorti. */}
        <motion.div
          className="mt-5 mb-4"
          initial={{ opacity: 0, scale: 1.09 }}
          animate={rideauLeve ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.09 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <h1
            ref={titreRef}
            tabIndex={-1}
            className="font-fraunces font-black"
            style={{
              fontSize: 'clamp(3.5rem, 15vw, 6rem)',
              lineHeight: 0.92,
              letterSpacing: '-0.02em',
              color: encre,
              outline: 'none',
            }}
          >
            <span style={{ display: 'block' }}>{tr('Le cadavre', 'The corpse')}</span>
            <span style={{ display: 'block', color: accent }}>{tr('est exquis', 'is exquisite')}</span>
          </h1>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 20 }} />

        {/* ── POEM CARD ──
            Un article nommé : le poème était une coulée de texte fondue
            avec l'en-tête et le pied, ni titre, ni région.
            La surface dérive de l'ENCRE, comme le feuillet plié du poème du
            jour : le voile crème fixe, à 25 %, devenait une dalle
            gris-lavande sur minuit, gris-brun sur argile — étrangère à
            l'ambiance. */}
        <motion.article
          id="feuillet-fin"
          aria-label={tr('Le poème', 'The poem')}
          initial={{ opacity: 0, y: 12 }}
          animate={rideauLeve ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45 }}
          style={{
            border: `1px solid ${accent}40`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: 3,
            padding: '16px 16px 12px',
            background: `${encre}09`,
            marginBottom: 20,
          }}
        >
          {/* Poem title in mono */}
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            CADAVRE EXQUIS · {new Date(poeme.dateCreation).toLocaleDateString(tr('fr-FR', 'en-GB'), { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
          </div>

          {/* Le poème — le feuillet s'ouvre volet par volet, l'encre vient dessus */}
          <PoemeDevoile
            lignes={lignes}
            accent={accent}
            actif={rideauLeve}
            lettrine
            onLettrine={() => { jouer('lettrine'); vibrer('devoilement') }}
            onFini={onPoemeFini}
            apres={couture}
            style={{
              fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
              // Un cran plus bas quand les vers sont longs (`lib/composition.ts`).
              color: encre, fontSize: TAILLE_CORPS[corps], lineHeight: 1.6,
              overflowWrap: 'break-word', wordBreak: 'break-word',
            }}
          />

          {/* À plusieurs, les coutures se dévoilent une à une : la dernière
              dévoilée est dite au lecteur d'écran, et tout se lève d'un geste. */}
          {couturesOuvertes && aPlusieurs && (
            <>
              <p className="sr-only" {...zoneVivante}>
                {devoilees > 0 && devoilees <= poeme.cases.length
                  ? (() => {
                      const k = devoilees - 1
                      const ck = poeme.cases[k]
                      const n = ck.voixSlot ?? poeme.cases.slice(0, k).filter(x => x.auteur === 'ia').length + 1
                      return `${k + 1} — ${attribution(ck, n)}`
                    })()
                  : ''}
              </p>
              {devoilees < poeme.cases.length && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setDevoilees(poeme.cases.length)}
                    style={{ ...mono, fontSize: 11, letterSpacing: '0.15em', color: encre, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}
                  >
                    {tr('TOUT DÉVOILER', 'REVEAL ALL')}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Card footer */}
          <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.75, marginTop: 14, paddingTop: 8, borderTop: `0.5px solid ${encre}20` }}>
            {libelleMorceaux(poeme.structureId, voixCount)} · {structLabel.toUpperCase()} · {heureStr}
          </div>
        </motion.article>

        {/*
          Tout ce qui suit attend que le poème ait parlé — le dernier mot
          posé, ou l'appui qui abrège. Absent du document jusque-là, et non
          seulement transparent : un bouton invisible se presse quand même,
          et le lecteur d'écran l'annoncerait avant le poème.
        */}
        {poemeFini && (
        <motion.div
          className="flex flex-col"
          initial={mouvementReduit() ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >

        {/* ── IMAGE (if already generated) ── */}
        {illustrationUrl && (
          <motion.div
            className="mb-3 flex flex-col gap-1"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <button
              onClick={() => !generatingIllustration && setPleinEcran(true)}
              aria-label={tr("Voir l'illustration en plein écran", 'View the illustration full screen')}
              style={{ display: 'block', background: 'none', border: 'none', padding: 0, cursor: generatingIllustration ? 'default' : 'zoom-in', width: '100%' }}
            >
              {/*
                C'est l'image qui lève l'attente, pas la promesse réseau.

                Ceinture et bretelles, et il faut dire pourquoi : sur le chemin
                normal `normaliserFormatInstagram` attend déjà le `onload` de
                l'image avant de la rasteriser en data URL, si bien que la
                promesse ne se résout jamais avant le décodage. Ce garde-fou ne
                sert donc que le repli — quand la normalisation échoue (CORS,
                canvas indisponible) et qu'on affiche l'URL distante brute. Là,
                l'image se charge vraiment après coup, et sans `onLoad`
                l'attente se lèverait sur un cadre vide.
              */}
              <img
                src={illustrationUrl}
                alt={tr('Illustration du poème', 'Poem illustration')}
                className="w-full border"
                onLoad={() => setGeneratingIllustration(false)}
                onError={() => {
                  setGeneratingIllustration(false)
                  setErreurIllustration(tr(
                    "L'illustration ne s'est pas chargée — réessaie",
                    'The illustration failed to load — try again',
                  ))
                }}
                style={{ borderColor: `${accent}30`, filter: 'contrast(0.97)', opacity: generatingIllustration ? 0.4 : 1, transition: 'opacity 0.5s' }}
              />
            </button>
            <div className="flex justify-between items-center">
              {labelStyle && !generatingIllustration && (
                <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.75 }}>{labelStyle.toUpperCase()}</span>
              )}
              {!generatingIllustration && (
                <button
                  onClick={() => setPleinEcran(true)}
                  aria-label="Agrandir l'illustration"
                  style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                >↗ {tr('AGRANDIR', 'ENLARGE')}</button>
              )}
            </div>
            {/* Prompt reveal — always visible after generation */}
            {promptVisuel && !generatingIllustration && (
              <div className="w-full">
                <button
                  onClick={() => setPromptVisible(v => !v)}
                  style={{ ...mono, fontSize: 13, color: encre, opacity: 0.75, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {promptVisible ? tr('↑ masquer le prompt', '↑ hide the prompt') : tr('→ voir le prompt IA', '→ see the AI prompt')}
                </button>
                {promptVisible && (
                  <p style={{
                    fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre,
                    opacity: 0.85, marginTop: 6, lineHeight: 1.55,
                  }}>
                    {promptVisuel}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SPINNER ── */}
        <AnimatePresence>
          {generatingIllustration && (
            <motion.div
              key="spinner"
              role="status"
              aria-label={`Génération de l'illustration en cours`}
              aria-live="polite"
              className="flex flex-col items-center gap-2 my-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              // Le fondu de sortie n'était pas réglé, donc à la valeur par
              // défaut de framer-motion. Mesuré : l'étiquette « EN COURS… »
              // restait un demi-tour de seconde AU-DESSUS de l'image finie
              // — opacité 0,98 puis 0,52 puis 0,03. C'est ce que l'audit a
              // relevé comme « l'état ne se lève pas » : le drapeau se levait
              // bien, c'est le fondu qui traînait. Un tiers de seconde suffit
              // à passer la main sans faire douter.
              transition={{ opacity: { duration: 0.18 } }}
            >
              <motion.span
                aria-hidden
                style={{ fontSize: 22, color: sc?.second ?? accent }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >✦</motion.span>
              <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8 }}>{labelStyle?.toUpperCase()} {tr('EN COURS…', 'IN PROGRESS…')}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SCELLER CTA ──
            À plusieurs, le bouton principal est la partie suivante : le
            poème est déjà au recueil depuis la dernière case, « sceller »
            ne faisait que mener à la bibliothèque — et c'est la relance que
            la table attend. Seul, rien ne change : le guide des premiers
            pas désigne ce bouton. */}
        <motion.div
          className="mb-3 mt-2"
          whileTap={{ scale: 0.98 }}
        >
          {aPlusieurs ? (
            <button
              onClick={memeTable}
              disabled={relance}
              className="w-full flex items-center justify-center"
              style={{
                background: accent, color: btnText,
                ...mono, fontSize: 17,
                textTransform: 'uppercase',
                padding: '1.15em 1em',
                border: 'none', cursor: relance ? 'default' : 'pointer',
                gap: 2,
                borderRadius: 3,
                opacity: relance ? 0.7 : 1,
              }}
            >
              <span>{tr('Une autre, à la même table', 'Another, at the same table')}&nbsp;→</span>
            </button>
          ) : (
          <button
            onClick={() => {
              // Le guide reprend au recueil, quel que soit le panneau ouvert.
              if (tutActif && tutEtape >= T_FIN_REVEL && tutEtape < T_BIBLIO) tutAllerA(T_BIBLIO)
              navigate('/bibliotheque')
            }}
            className="w-full flex items-center justify-center"
            style={{
              background: accent, color: btnText,
              ...mono, fontSize: 17,
              textTransform: 'uppercase',
              padding: '1.15em 1em',
              border: 'none', cursor: 'pointer',
              gap: 2,
              borderRadius: 3,
            }}
          >
            <span>{tr('Sceller au recueil', 'Seal into the collection')}&nbsp;→</span>
          </button>
          )}

        </motion.div>

        {/* ── FOOTER LINKS ──
            Trois pairs, trois colonnes égales séparées par un filet : en
            deux colonnes, les tirets de deux libellés voisins se touchaient
            et le troisième restait orphelin. Voir PoemeDetail, même remède. */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', paddingBottom: 4, marginBottom: 8 }}
        >
          <button
            onClick={partager}
            disabled={partage.enCours}
            className="appui"
            style={{ ...mono, fontSize: 12, letterSpacing: '0.1em', whiteSpace: 'nowrap', color: partage.actif ? accent : encre, opacity: partage.actif ? 0.9 : 0.7, background: 'none', border: 'none', cursor: partage.enCours ? 'default' : 'pointer', textAlign: 'center', padding: '12px 0', minHeight: 44 }}
          >
            {partage.libelle(tr('PARTAGER', 'SHARE'))}
          </button>
          <button
            onClick={() => setActiveSection(s => s === 'coutures' ? null : 'coutures')}
            aria-expanded={couturesOuvertes}
            aria-controls="feuillet-fin"
            className="appui"
            style={{ ...mono, fontSize: 12, letterSpacing: '0.1em', whiteSpace: 'nowrap', color: activeSection === 'coutures' ? accent : encre, opacity: activeSection === 'coutures' ? 0.9 : 0.7, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '12px 0', minHeight: 44, borderLeft: `0.5px solid ${encre}1f` }}
          >
            {tr('COUTURES', 'SEAMS')}
          </button>
          <button
            onClick={() => setActiveSection(s => s === 'image' ? null : 'image')}
            className="appui"
            aria-expanded={activeSection === 'image'}
            aria-controls="panneau-image"
            style={{ ...mono, fontSize: 12, letterSpacing: '0.1em', whiteSpace: 'nowrap', color: activeSection === 'image' ? accent : encre, opacity: activeSection === 'image' ? 0.9 : 0.7, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '12px 0', minHeight: 44, borderLeft: `0.5px solid ${encre}1f` }}
          >
            {tr('IMAGE', 'IMAGE')}
          </button>
        </div>

        {/*
          L'audit (lot 16) voulait faire de ces trois libellés une barre
          d'onglets, au motif qu'ouvrir IMAGE laisserait COUTURES ouvert.
          Reproduit : c'est faux — un seul `activeSection` les gouverne, ils
          sont DÉJÀ exclusifs. Et `role="tablist"` serait un mensonge d'un
          autre genre : PARTAGER, le premier des trois, est une action et non
          un onglet. Ce qui manquait, c'était le lien entre la bascule et ce
          qu'elle ouvre — `aria-controls`. Les coutures vivant désormais dans
          la carte, c'est la carte qu'il désigne.
        */}

        {/* ── IMAGE PANEL ── */}
        <AnimatePresence>
          {activeSection === 'image' && (
            <motion.div
              key="image"
              id="panneau-image"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="mb-6"
            >
              <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15, marginBottom: 16 }} />

              {/*
                Le solde en tête du panneau : c'est la première chose qu'on
                lit en ouvrant IMAGE, avant de choisir un style. Le joueur
                apprenait la limite au refus, ce qui fait passer un modèle
                annoncé pour un piège.
              */}
              <SoldeEncrier
                acte="image_pro" encre={encre} accent={accent} relire={soldeRelu}
                style={{ marginBottom: 14 }}
              />

              {/* Prompt libre */}
              <div className="mb-4">
                <input
                  type="text"
                  value={promptLibre}
                  onChange={e => setPromptLibre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && promptLibre.trim()) choisirStyle(styleChoisi || 'libre') }}
                  placeholder={tr('Direction artistique libre… (ex. : sombre et organique)', 'Free art direction… (e.g.: dark and organic)')}
                  className="champ-carnet w-full"
                  style={{ borderLeftColor: accent }}
                />
                {promptLibre.trim() && (
                  <button
                    onClick={() => choisirStyle(styleChoisi || 'libre')}
                    style={{ ...mono, fontSize: 13, color: accent, background: 'none', border: `0.5px solid ${accent}50`, borderRadius: 3, padding: '8px 12px', cursor: 'pointer', marginTop: 8, width: '100%' }}
                  >
                    ✦ {tr('GÉNÉRER AVEC CETTE DIRECTION', 'GENERATE WITH THIS DIRECTION')}
                  </button>
                )}
              </div>

              {erreurIllustration && (
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: accent, opacity: 0.7, textAlign: 'center', marginBottom: 10 }}>
                  {erreurIllustration}
                </p>
              )}

              {/* Style buttons */}
              {!generatingIllustration && (
                <div className="flex flex-col gap-2">
                  {/*
                    Relancer — après une image, mais aussi après un échec.
                    Le bouton était conditionné à l'existence d'une image :
                    une première génération ratée ne laissait donc qu'un
                    message, sans aucun moyen de réessayer autrement qu'en
                    retrouvant son style dans la liste.
                  */}
                  {(illustrationUrl || erreurIllustration) && (
                    <button
                      onClick={relancer}
                      style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8, background: 'none', border: `0.5px solid ${encre}20`, borderRadius: 3, padding: '8px', cursor: 'pointer' }}
                    >
                      ↺ {tr('RELANCER', 'RETRY')}
                    </button>
                  )}
                  {STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => choisirStyle(s.id)}
                      style={{
                        ...mono, fontSize: 13,
                        color: styleChoisi === s.id && illustrationUrl ? accent : encre,
                        opacity: styleChoisi === s.id && illustrationUrl ? 0.9 : 0.55,
                        background: 'transparent',
                        border: `0.5px solid ${styleChoisi === s.id && illustrationUrl ? accent : `${encre}20`}`,
                        borderRadius: 3,
                        padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {/* Prompt IA reveal */}
              {promptVisuel && !generatingIllustration && (
                <div className="flex flex-col items-center mt-3">
                  <button
                    onClick={() => setPromptVisible(v => !v)}
                    style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {promptVisible ? tr('↑ MASQUER LE PROMPT', '↑ HIDE THE PROMPT') : tr('→ VOIR LE PROMPT IA', '→ SEE THE AI PROMPT')}
                  </button>
                  {promptVisible && (
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, marginTop: 6, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>
                      {promptVisuel}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NOUVELLE PARTIE ──
            Quand une table a joué, il y a deux suites et elles ne se
            confondent pas : la même table, d'un geste, ou une autre table,
            par les préparatifs — qui se souviennent désormais de la
            dernière. À plusieurs, la première est déjà le bouton principal,
            et c'est le recueil qui descend ici.

            Chaque lien a une boîte RÉELLE de 44 px. Ils étaient hauts de
            20 px à 4 px d'écart : la zone d'appui globale (le ::after de
            44 px) débordait sur le voisin, et le suivant dans le DOM
            gagnait — la moitié basse de « VOIR AU RECUEIL » menait aux
            préparatifs. La taille était juste, c'est le recouvrement qui
            mentait. */}
        <div className="flex flex-col items-center mt-4 pb-2">
          {table && !aPlusieurs && (
            <button
              onClick={memeTable}
              disabled={relance}
              style={{ ...lienBas, cursor: relance ? 'default' : 'pointer' }}
            >
              {tr('— UNE AUTRE, À LA MÊME TABLE —', '— ANOTHER, AT THE SAME TABLE —')}
            </button>
          )}
          {aPlusieurs && (
            <button
              onClick={() => navigate('/bibliotheque')}
              style={{ ...lienBas, cursor: 'pointer' }}
            >
              {tr('— VOIR AU RECUEIL —', '— SEE IN THE COLLECTION —')}
            </button>
          )}
          <button
            onClick={() => navigate('/config')}
            style={{ ...lienBas, cursor: 'pointer' }}
          >
            {table ? tr('— CHANGER DE TABLE —', '— CHANGE THE TABLE —') : tr('— NOUVELLE PARTIE —', '— NEW GAME —')}
          </button>
        </div>
        </motion.div>
        )}

      </div>

      {/* ── TUTORIEL COACHES ── */}
      <TutorielCoach
        visible={tutActif && tutEtape === T_FIN_REVEL && coachPret}
        etape={T_FIN_REVEL} total={TUTORIEL_TOTAL}
        titre={tr('La révélation', 'The revelation')}
        corps={tr("Trois fragments écrits sans se voir — voilà le poème que personne n'a décidé.", 'Fragments written blind to each other — a poem no one decided.')}
        onCompris={tutAvancer}
        onPasser={tutTerminer}
        accent={accent} encre={encre} bg={bg}
      />
      {/*
        La suite : rejouer, et d'abord à plusieurs. C'était la visite de
        l'IMAGE, du PARTAGE et du RECUEIL — trois panneaux qui faisaient
        visiter des fonctions déjà sous les yeux, et jamais ne proposaient
        de rejouer ni la soirée sur un même téléphone. Le recueil reste au
        bout du lien discret, pour poursuivre le guide.
      */}
      <TutorielCoach
        visible={tutActif && tutEtape === T_FIN_SUITE && coachPret}
        etape={T_FIN_SUITE} total={TUTORIEL_TOTAL}
        titre={tr('La suite', 'What next')}
        corps={tr(
          'Une autre, tout de suite — ou ce soir, à plusieurs sur ce téléphone : chacun écrit sa bande sans voir celle du voisin.',
          'Another one, right away — or tonight, with friends on this phone: each writes a strip without seeing the next one.',
        )}
        gestes={[
          { libelle: tr('ENCORE UNE', 'ONE MORE'), onClick: encoreUne },
          { libelle: tr('À PLUSIEURS, SUR CE TÉLÉPHONE', 'WITH FRIENDS, ON THIS PHONE'), onClick: aPlusieursIci },
        ]}
        onCompris={() => { tutAvancer(); navigate('/bibliotheque') }}
        labelCompris={tr('VOIR MON RECUEIL →', 'SEE MY COLLECTION →')}
        onPasser={tutTerminer}
        accent={accent} encre={encre} bg={bg}
      />

    </PageTransition>
    </>
  )
}
