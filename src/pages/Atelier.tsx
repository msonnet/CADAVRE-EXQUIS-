import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { VOICE_IDS } from '../data/voiceIds'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import MurAbonnement from '../components/MurAbonnement'
import { ouvrirPartieIA, nouvellePartieId, deposerRecu, type Refus } from '../lib/acces'

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

export interface PlanAtelier {
  totalVers: number          // 5–37, tiré au sort (plancher relevé par le nombre de voix)
  toursJoueur: number[]      // indices des vers écrits par le médium (toujours 0 et totalVers-1)
  toursFragmentJoueur: number[] // sous-ensemble de toursJoueur (hors 0 et totalVers-1) où le médium
                             // remplit un seul fragment parmi les voix — plus les voix sont nombreuses,
                             // plus ces tours sont fréquents (0 voix → 0%, max voix → 100%)
  voixPool: string[]         // ids des voix convoquées, mélangées
  echo: boolean              // true = l'écho (dernier mot du vers précédent) ; false = obscurité totale
  /** Quelles voix parlent sur quel vers — index dans voixPool. Voir repartirVoix. */
  voixParVers: Record<number, number[]>
}

const MIN_VERS = 5
const MAX_VERS = 37

/**
 * Répartit les voix sur les vers, en ROTATION.
 *
 * Le tirage se faisait vers par vers, en remélangeant le pool entier à chaque
 * fois, sans mémoire de qui avait déjà parlé. Convoquer les 46 voix ne les
 * faisait donc pas parler : simulé sur quatre mille séances de 37 vers,
 * seize d'entre elles en moyenne restaient muettes pendant qu'une autre
 * prenait la parole jusqu'à huit fois. La table ronde n'avait pas lieu.
 *
 * On vide donc une file mélangée avant d'en tirer une nouvelle : toutes
 * parlent une fois avant que l'une reparle. Et le nombre de voix par vers
 * n'est plus plafonné à trois — mieux vaut cinq voix sur un vers qu'une voix
 * qui ne dit jamais rien.
 */
export function repartirVoix(
  nbVoix: number,
  versIA: number[],
  versFragment: number[],
): Record<number, number[]> {
  if (nbVoix === 0) return {}
  const porteurs = [...versIA, ...versFragment].sort((a, b) => a - b)
  if (!porteurs.length) return {}

  // Un vers de fragment garde une case pour le médium : au plus quatre voix,
  // pour que le gabarit ne dépasse jamais cinq cases.
  const fragment = new Set(versFragment)
  const plafond = (v: number) => (fragment.has(v) ? 4 : 5)

  // Le tirage reste vivant, mais son assiette se relève si la couverture
  // l'exige : c'est le nombre de convives qui commande la densité.
  const requise = Math.ceil(nbVoix / porteurs.length)
  const bas = Math.max(1, requise - 1)
  const haut = Math.max(bas, requise + 1)

  const compte: Record<number, number> = {}
  for (const v of porteurs) {
    compte[v] = Math.min(bas + Math.floor(Math.random() * (haut - bas + 1)), plafond(v))
  }
  // Le solo du médium : sur un vers de fragment, le sort peut le tirer seul.
  for (const v of versFragment) {
    if (Math.random() < 0.12) compte[v] = 0
  }

  // Rattrapage — sans lui la garantie n'en serait pas une : tant que le total
  // des cases n'atteint pas le nombre de voix, on charge les vers qui ont
  // encore de la place.
  let total = porteurs.reduce((s, v) => s + compte[v], 0)
  while (total < nbVoix) {
    const dispo = porteurs.filter(v => compte[v] < plafond(v))
    if (!dispo.length) break   // poème trop court malgré le plancher : on fait au mieux
    compte[dispo[Math.floor(Math.random() * dispo.length)]]++
    total++
  }

  const parVers: Record<number, number[]> = {}
  let file: number[] = []
  const recharger = () => {
    file = Array.from({ length: nbVoix }, (_, i) => i).sort(() => Math.random() - 0.5)
  }
  recharger()
  for (const v of porteurs) {
    const ligne: number[] = []
    let gardes = 0
    while (ligne.length < compte[v] && gardes < nbVoix * 2 + 4) {
      if (!file.length) recharger()
      const candidat = file.shift() as number
      // Jamais deux fois la même voix sur un même vers : elle repart en queue.
      if (ligne.includes(candidat)) { file.push(candidat); gardes++; continue }
      ligne.push(candidat)
    }
    parVers[v] = ligne
  }
  return parVers
}

// La cadence du retour est quasi plate : la présence du médium ne se mesure
// pas en nombre de tours mais en mots contribués — et c'est probFragment
// (plus bas) qui porte cette variation. Plus les voix sont nombreuses, plus
// les retours du médium se font fragments (un mot ou deux), donc la main peut
// revenir souvent sans peser sur le poème.
// 1 voix → pas de 1 à 2, 46 voix → pas de 2 à 3 — une inclinaison de courtoisie.
// Le hasard garde sa part : seule la fourchette est liée, jamais le tirage.
export function cadenceRetour(nbVoix: number): [number, number] {
  const t = (Math.min(Math.max(nbVoix, 1), VOICE_IDS.length) - 1) / (VOICE_IDS.length - 1)
  return [Math.round(1 + t), Math.round(2 + t)]
}

/**
 * Le plan, tiré à une longueur plancher donnée.
 *
 * Séparé de `tirerPlan` parce que la couverture ne se calcule pas d'avance :
 * le nombre de vers qui portent des voix dépend de la cadence du médium et du
 * tirage des tours fragment, tous deux aléatoires. On construit, on vérifie,
 * on rallonge si besoin.
 */
function construirePlan(nbVoix: number, echo: boolean, plancher: number): PlanAtelier {
  const totalVers = plancher + Math.floor(Math.random() * (MAX_VERS - plancher + 1))
  if (nbVoix === 0) {
    return {
      totalVers,
      toursJoueur: Array.from({ length: totalVers }, (_, i) => i),
      toursFragmentJoueur: [],
      voixPool: [],
      echo,
      voixParVers: {},
    }
  }
  const [pasMin, pasMax] = cadenceRetour(nbVoix)
  const tours = [0]
  let curseur = 0
  for (;;) {
    const pas = pasMin + Math.floor(Math.random() * (pasMax - pasMin + 1))
    const suivant = curseur + pas
    if (suivant >= totalVers - 1) break
    tours.push(suivant)
    curseur = suivant
  }
  tours.push(totalVers - 1)
  // Des voix sont convoquées : au moins un vers doit leur revenir.
  // (À pas 1, le sort peut couvrir tout le poème — on libère un vers du milieu.)
  if (tours.length >= totalVers) {
    tours.splice(1 + Math.floor(Math.random() * (tours.length - 2)), 1)
  }
  const pool = [...VOICE_IDS].sort(() => Math.random() - 0.5).slice(0, nbVoix)
  // Tours fragment : parmi les retours du milieu, une proportion dépend du nombre de voix.
  // 0 voix → 0 %, max voix → 100 % — le médium devient une voix parmi d'autres.
  // Une voix parmi d'autres jusqu'au bout : même sur un tour fragment, le sort
  // peut le tirer seul sur le vers (1 chance sur 3, comme les voix IA) — il
  // écrit alors le vers entier. Le tirage vit dans JeuAtelier (initFragment).
  const probFragment = nbVoix / VOICE_IDS.length
  const toursFragmentJoueur = tours.filter(
    t => t !== 0 && t !== totalVers - 1 && Math.random() < probFragment
  )
  const auJoueur = new Set(tours)
  const versIA = Array.from({ length: totalVers }, (_, i) => i).filter(i => !auJoueur.has(i))
  const voixParVers = repartirVoix(nbVoix, versIA, toursFragmentJoueur)
  return { totalVers, toursJoueur: tours, toursFragmentJoueur, voixPool: pool, echo, voixParVers }
}

/**
 * Les cases qui n'admettent qu'un mot-outil.
 *
 * Une conjonction se choisit dans une classe fermée — mais, car, or, pourtant,
 * quand, lorsque. Mesuré sur six voix très différentes, cinq ont rendu le même
 * mot : « or ». Aucune personnalité ne peut se loger là, c'est une
 * impossibilité de la langue et non un défaut de réglage.
 *
 * Tant que le tirage était aveugle, c'était un gâchis discret. Depuis que
 * toutes les voix convoquées parlent, c'en est un visible : une voix dont
 * l'unique prise de parole du poème est « or » est une voix absente.
 */
const CASES_OUTILS = new Set(['conjonction-coord', 'conjonction-subord'])

/** Combien de fois chaque voix prend la parole dans l'ensemble du plan. */
export function multiplicitesVoix(plan: PlanAtelier): Record<number, number> {
  const n: Record<number, number> = {}
  for (const ligne of Object.values(plan.voixParVers)) {
    for (const v of ligne) n[v] = (n[v] ?? 0) + 1
  }
  return n
}

/**
 * Aligne les voix d'un vers sur les cases du gabarit.
 *
 * Les mots-outils reviennent en priorité aux voix qui parlent ailleurs dans
 * le poème : celles qui n'ont qu'une seule apparition la dépensent sur une
 * case qui porte quelque chose. Si toutes sont uniques, on ne peut rien
 * sauver — on rend l'ordre tel quel plutôt que de prétendre choisir.
 */
export function placerVoix(
  indices: number[],
  typesDesCases: string[],
  multiplicite: Record<number, number>,
): number[] {
  if (indices.length < 2) return indices

  const outils: number[] = []
  const contenu: number[] = []
  typesDesCases.forEach((t, i) => (CASES_OUTILS.has(t) ? outils : contenu).push(i))
  if (!outils.length || outils.length >= indices.length) return indices

  const bavardes = indices.filter(v => (multiplicite[v] ?? 0) > 1)
  const uniques = indices.filter(v => (multiplicite[v] ?? 0) <= 1)
  if (!bavardes.length) return indices

  // Les bavardes prennent les outils, les uniques passent devant sur le
  // contenu. Le reste comble dans l'ordre, sans préférence.
  const pourOutils = [...bavardes]
  const pourContenu = [...uniques]
  while (pourOutils.length > outils.length) pourContenu.push(pourOutils.pop() as number)
  while (pourOutils.length < outils.length) pourOutils.push(pourContenu.shift() as number)

  const place: number[] = new Array(indices.length)
  outils.forEach((slot, k) => { place[slot] = pourOutils[k] })
  contenu.forEach((slot, k) => { place[slot] = pourContenu[k] })
  return place
}

/**
 * La fourchette de longueur annoncée au joueur, pour un nombre de voix donné.
 *
 * Le plancher monte avec le nombre de convives — une table de quarante-six ne
 * tient pas dans cinq vers. L'écran l'annonçait en dur (« de V à XXVII »)
 * et disait donc deux fois faux : ni le maximum ni le minimum.
 */
export function fourchetteVers(nbVoix: number): [number, number] {
  return [Math.min(MAX_VERS, Math.max(MIN_VERS, Math.ceil(nbVoix / 3))), MAX_VERS]
}

/** Combien de voix distinctes prennent réellement la parole dans ce plan. */
export function voixEntendues(plan: PlanAtelier): number {
  const vues = new Set<number>()
  for (const ligne of Object.values(plan.voixParVers)) for (const v of ligne) vues.add(v)
  return vues.size
}

// La main revient : le médium ouvre, referme, et la main lui revient selon la
// cadence. À zéro voix (« seul »), tous les vers lui reviennent.
//
// Le poème s'allonge jusqu'à ce que toutes les voix convoquées y tiennent.
// Un plancher calculé d'avance ne suffisait pas : avec peu de voix, le médium
// reprend la main tous les un à deux vers et les porteurs se raréfient — à
// douze voix, jusqu'à sept restaient muettes. On construit, on compte, on
// rallonge de deux vers et on recommence.
export function tirerPlan(nbVoix: number, echo: boolean): PlanAtelier {
  let plancher = Math.min(MAX_VERS, Math.max(MIN_VERS, Math.ceil(nbVoix / 3)))
  let plan = construirePlan(nbVoix, echo, plancher)
  for (let essai = 0; essai < 20; essai++) {
    if (nbVoix === 0 || voixEntendues(plan) >= nbVoix || plancher >= MAX_VERS) break
    plancher = Math.min(MAX_VERS, plancher + 2)
    plan = construirePlan(nbVoix, echo, plancher)
  }
  return plan
}

export default function Atelier() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const [nbVoix, setNbVoix] = useState<number>(() => {
    // `|| défaut` avalerait le zéro (« seul ») — on valide explicitement
    const brut = localStorage.getItem('atelier-nb-voix')
    const n = brut === null ? NaN : Number(brut)
    return Number.isInteger(n) && n >= 0 && n <= VOICE_IDS.length ? n : VOICE_IDS.length
  })
  const [echo, setEcho] = useState<boolean>(
    () => (localStorage.getItem('atelier-visibilite') ?? 'echo') === 'echo'
  )

  const [refus, setRefus] = useState<Refus | null>(null)
  const [ouverture, setOuverture] = useState(false)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const colorLabel = c?.name.toUpperCase() ?? ''

  const toutes = nbVoix === VOICE_IDS.length

  async function ouvrirSeance() {
    jouer('clic')
    localStorage.setItem('atelier-nb-voix', String(nbVoix))
    localStorage.setItem('atelier-visibilite', echo ? 'echo' : 'obscurite')

    // « Seul » (aucune voix) n'appelle rien : la séance reste gratuite.
    if (nbVoix > 0) {
      if (ouverture) return
      setOuverture(true)
      const partieId = nouvellePartieId()
      const refuse = await ouvrirPartieIA(partieId, 'atelier')
      setOuverture(false)
      if (refuse) { setRefus(refuse); return }
      deposerRecu(partieId)
    }

    const plan = tirerPlan(nbVoix, echo)
    navigate('/jeu-atelier', { state: { plan } })
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="atelier" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('ACCUEIL', 'HOME')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
          {tr("— L'ATELIER —", '— THE WORKSHOP —')}
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 18 }}
        >
          <div
            className="font-fraunces font-black leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 6 }}
          >
            {tr('Écrire avec', 'Writing with')} <span style={{ color: accent }}>{tr('les voix.', 'the voices.')}</span>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, fontStyle: 'italic', lineHeight: 1.5 }}>
            {nbVoix === 0
              ? <>{tr(`Le sort fixera la longueur du poème — de ${toRomain(fourchetteVers(nbVoix)[0])} à ${toRomain(fourchetteVers(nbVoix)[1])} vers. Tu les écriras tous, seul, sans jamais relire : le cadavre exquis se joue contre ta propre mémoire.`,
                  `Fate will set the length of the poem — from ${toRomain(fourchetteVers(nbVoix)[0])} to ${toRomain(fourchetteVers(nbVoix)[1])} lines. You will write them all, alone, without ever rereading: the exquisite corpse is played against your own memory.`)}</>
              : <>{tr(`Le sort fixera la longueur du poème — de ${toRomain(fourchetteVers(nbVoix)[0])} à ${toRomain(fourchetteVers(nbVoix)[1])} vers.${nbVoix > 1 ? ' Toutes les voix convoquées y parleront.' : ''} Tu l'ouvriras, tu le refermeras, et la main te reviendra tous les`, `Fate will set the length of the poem — from ${toRomain(fourchetteVers(nbVoix)[0])} to ${toRomain(fourchetteVers(nbVoix)[1])} lines.${nbVoix > 1 ? ' Every voice you summon will speak.' : ''} You will open it, you will close it, and the pen will return to you every`)} {toRomain(cadenceRetour(nbVoix)[0])} {tr('à', 'to')} {toRomain(cadenceRetour(nbVoix)[1])} {tr('vers — plus les voix sont nombreuses, plus tes retours se font fragments.', 'lines — the more voices there are, the more your turns shrink to fragments.')}</>
            }
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 22 }} />

        {/* ── VOIX ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 26 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            {tr('— VOIX CONVOQUÉES —', '— SUMMONED VOICES —')}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
            <span className="font-fraunces font-black" style={{ fontSize: 44, color: accent, lineHeight: 1 }}>
              {nbVoix === 0 ? tr('Seul', 'Alone') : toRomain(nbVoix)}
            </span>
            <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, textTransform: 'uppercase' }}>
              {nbVoix === 0 ? tr('ta main uniquement', 'your hand only') : toutes ? tr('Toutes les voix', 'All the voices') : nbVoix === 1 ? tr('une seule voix', 'a single voice') : tr(`${nbVoix} voix`, `${nbVoix} voices`)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={VOICE_IDS.length}
            value={nbVoix}
            onChange={e => setNbVoix(Number(e.target.value))}
            style={{ width: '100%', accentColor: accent }}
            aria-label={tr('Nombre de voix', 'Number of voices')}
          />
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.7, marginTop: 8 }}>
            {nbVoix === 0
              ? tr('Aucune voix ne parlera — la dernière main se passe le papier à elle-même.', 'No voice will speak — the last hand passes the paper to itself.')
              : tr('Les voix sont tirées au sort — tu ne sauras jamais lesquelles parlent.', 'The voices are drawn at random — you will never know which ones speak.')}
          </div>
        </motion.div>

        {/* ── VISIBILITÉ ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            {tr('— VISIBILITÉ —', '— VISIBILITY —')}
          </div>
          <div className="flex gap-2 mb-3">
            {[
              { id: true,  label: tr("L'ÉCHO", 'THE ECHO') },
              { id: false, label: tr('OBSCURITÉ', 'DARKNESS') },
            ].map(opt => {
              const active = echo === opt.id
              return (
                <button
                  key={String(opt.id)}
                  onClick={() => setEcho(opt.id)}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.8 }}>
            {echo
              ? (nbVoix === 0
                ? tr('Tu n’entendras que le dernier mot de ton propre vers précédent.', 'You will hear only the last word of your own previous line.')
                : tr('Chaque main — la tienne comme celles des voix — n’entend que le dernier mot du vers précédent.', 'Each hand — yours and the voices’ alike — hears only the last word of the previous line.'))
              : (nbVoix === 0
                ? tr('Tu ne reliras rien. Le poème se coud dans le noir, vers après vers.', 'You will reread nothing. The poem is stitched in the dark, line after line.')
                : tr('Personne ne voit rien. Le poème se coud dans le noir absolu.', 'No one sees anything. The poem is stitched in absolute darkness.'))}
          </div>
        </motion.div>

        <div style={{ flex: 1 }} />

        {/* ── CTA ── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          onClick={ouvrirSeance}
          disabled={ouverture}
          style={{
            width: '100%',
            background: encre, color: bg,
            ...mono, fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '0.9em 1em', border: 'none',
            cursor: ouverture ? 'default' : 'pointer',
            borderRadius: 3,
            marginBottom: 10,
            opacity: ouverture ? 0.7 : 1,
          }}
        >
          {tr('Ouvrir la séance', 'Open the séance')} ✧
        </motion.button>

      </div>

      <MurAbonnement
        visible={refus !== null}
        acte={refus?.acte ?? 'partie_ia'}
        motif={refus?.motif ?? 'essai_epuise'}
        plafond={refus?.plafond}
        onFermer={() => setRefus(null)}
        onAbonne={() => { setRefus(null); ouvrirSeance() }}
        accent={accent} encre={encre} bg={bg}
      />
    </PageTransition>
  )
}
