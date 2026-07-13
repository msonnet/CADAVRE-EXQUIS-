import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { demanderFragmentIA } from '../api/claude'
import { corrigerAccords } from '../api/corriger'
import { sauvegarderPoeme } from '../db'
import type { Poeme, Case } from '../types'
import type { PlanAtelier } from './Atelier'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

interface VersAtelier {
  texte: string
  auteur: 'humain' | 'ia' | 'mixte'  // 'mixte' = médium + voix(es) sur le même vers
  voixNums: number[]   // numéros (1-based) des voix IA qui ont participé — vide pour 'humain' pur
}

interface VoixEnCours {
  num: number
  role: string
  fait: boolean
}

// ── Gabarits grammaticaux — le principe du cadavre écrit ──────────────────────
// Chaque voix remplit une case syntaxique définie : le vers assemblé reste
// grammaticalement valide même quand l'image est absurde. Les longueurs
// arbitraires produisaient des tas de noms juxtaposés sans syntaxe.

interface RoleFragment {
  type: string       // type de case envoyé à l'API (contraintes serveur)
  consigne: string
  role: string       // étiquette affichée pendant que la voix écrit
  mots?: number      // uniquement pour le vers à une voix (longueur aléatoire)
  apres?: string     // ponctuation cousue après le fragment (ex : virgule de l'adverbe en tête)
}

const GN_SUJET: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal sujet', 'a subject noun phrase'), role: tr('SUJET', 'SUBJECT'),
}
const GN_COMPLEMENT: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal complément', 'an object noun phrase'), role: tr('COMPLÉMENT', 'OBJECT'),
}
const VERBE: RoleFragment = {
  type: 'verbe', consigne: tr('un verbe conjugué', 'a conjugated verb'), role: tr('VERBE', 'VERB'),
}
// Devant un complément, le gabarit exige un verbe transitif — la voix ne sait pas
// qu'un complément suit (principe du cadavre), mais le gabarit, lui, le sait
const VERBE_TRANSITIF: RoleFragment = {
  type: 'verbe-transitif', consigne: tr('un verbe transitif conjugué', 'a conjugated transitive verb'), role: tr('VERBE', 'VERB'),
}
const GROUPE_VERBAL: RoleFragment = {
  type: 'groupe-verbal', consigne: tr("un verbe conjugué suivi d'un complément court", 'a conjugated verb followed by a short complement'), role: tr('VERBE + COMPL.', 'VERB + COMPL.'),
}
const ADJECTIF: RoleFragment = {
  type: 'adjectif', consigne: tr('un adjectif qualificatif seul', 'a single descriptive adjective'), role: tr('ADJECTIF', 'ADJECTIVE'),
}
const ADVERBE_TETE: RoleFragment = {
  type: 'adverbe', consigne: tr('un adverbe ou une locution adverbiale', 'an adverb or adverbial phrase'), role: tr('ADVERBE', 'ADVERB'), apres: ',',
}
const ADVERBE_FIN: RoleFragment = {
  type: 'adverbe', consigne: tr('un adverbe ou une locution adverbiale', 'an adverb or adverbial phrase'), role: tr('ADVERBE', 'ADVERB'),
}
const CONJ_COORD: RoleFragment = {
  type: 'conjonction-coord', consigne: tr('une conjonction de coordination ou un adverbe de liaison', 'a coordinating conjunction or linking adverb'), role: tr('CONJONCTION', 'CONJUNCTION'),
}
const CONJ_SUBORD: RoleFragment = {
  type: 'conjonction-subord', consigne: tr('une conjonction de subordination', 'a subordinating conjunction'), role: tr('CONJONCTION', 'CONJUNCTION'),
}
const INFINITIF: RoleFragment = {
  type: 'infinitif', consigne: tr("un verbe à l'infinitif", 'a verb in the infinitive'), role: tr('INFINITIF', 'INFINITIVE'),
}
const GERONDIF: RoleFragment = {
  type: 'gérondif', consigne: tr('un gérondif (en + participe présent)', 'a gerund clause (an -ing form)'), role: tr('GÉRONDIF', 'GERUND'), apres: ',',
}
const QUESTION: RoleFragment = {
  type: 'proposition', consigne: tr('une question courte et étrange', 'a short, strange question'), role: 'QUESTION',
}

function tirerGabarit(nVoix: number, questionPermise = true): RoleFragment[] {
  if (nVoix === 1) {
    // Une seule plume écrit le vers entier — rarement une question (l'interrogatif
    // épuisé devient un tic sur un poème long : budget géré par l'appelant), sinon
    // un vers libre de longueur tirée au sort (3 à 6 mots)
    if (questionPermise && Math.random() < 0.12) return [QUESTION]
    const mots = 3 + Math.floor(Math.random() * 4)
    return [{ type: 'libre', consigne: tr('un vers — une image physique et inattendue', 'one line of verse — a physical, unexpected image'), role: tr('VERS ENTIER', 'FULL LINE'), mots }]
  }
  if (nVoix === 2) {
    const variantes: RoleFragment[][] = [
      [GN_SUJET, GROUPE_VERBAL],   // « le silence » + « traverse la nuit »
      [GN_SUJET, VERBE],           // « la lumière » + « tremble »
      [GN_SUJET, ADJECTIF],        // « une lumière » + « froide » — vers nominal
      [INFINITIF, GN_COMPLEMENT],  // « brûler » + « la cendre »
      [CONJ_COORD, GROUPE_VERBAL], // « mais » + « traverse la nuit » — ellipse sans sujet
    ]
    return variantes[Math.floor(Math.random() * variantes.length)]
  }
  const variantes: RoleFragment[][] = [
    [GN_SUJET, VERBE_TRANSITIF, GN_COMPLEMENT], // la phrase courte de Breton
    [GN_SUJET, ADJECTIF, GROUPE_VERBAL],    // « la lumière » + « froide » + « traverse la nuit »
    [ADVERBE_TETE, GN_SUJET, GROUPE_VERBAL], // « doucement, » + « la cendre » + « pèse sur le monde »
    [GN_SUJET, GROUPE_VERBAL, ADVERBE_FIN],  // « le sel » + « traverse la nuit » + « lentement »
    [GN_SUJET, VERBE, ADVERBE_FIN],          // « une écluse » + « chavire » + « sans bruit »
    [CONJ_COORD, GN_SUJET, GROUPE_VERBAL],   // « mais » + « la cendre » + « pèse sur le monde »
    [CONJ_COORD, GN_SUJET, VERBE],           // « car » + « la lumière » + « tremble »
    [CONJ_SUBORD, GN_SUJET, VERBE],          // « quand » + « le sel » + « chavire »
    [CONJ_SUBORD, GN_SUJET, GROUPE_VERBAL],  // « lorsque » + « la cendre » + « pèse sur le monde »
    [GERONDIF, GN_SUJET, VERBE],             // « en tombant, » + « la lumière » + « tremble »
  ]
  return variantes[Math.floor(Math.random() * variantes.length)]
}

// Signature d'un gabarit — pour ne jamais tirer deux fois de suite la même forme
function signatureGabarit(g: RoleFragment[]): string {
  return g.map(f => `${f.type}:${f.mots ?? ''}`).join('|')
}

// Dernier mot d'un vers, dépouillé de sa ponctuation — la seule trace transmise en écho
function dernierMot(texte: string): string | undefined {
  return texte.trim().split(/\s+/).at(-1)?.replace(/^[«"(]+|[»".,;:!?…)]+$/g, '')
}

// Réserve locale par rôle si l'API est injoignable — le poème ne s'arrête jamais
const RESERVE_FR: Record<string, string[]> = {
  'groupe-nominal': ['le silence', "l'ombre", 'une cendre', 'la nuit', 'un souffle', 'la pierre', 'le givre', 'une porte',
                     'la rouille', 'un seuil', "l'écume", 'le lierre', 'une aiguille', 'le limon'],
  'verbe': ['tremble', 'dévore', 'veille', 'chavire', 'demeure', 'glisse', 'rôde', 'vacille',
            'affleure', 'se penche', 'consent', 'recule'],
  'verbe-transitif': ['dévore', 'effleure', 'avale', 'fissure', 'traverse', 'ronge',
                      'soulève', 'recoud', 'berce', 'creuse', 'apprivoise', 'engloutit'],
  'groupe-verbal': ['traverse la nuit', 'brûle en silence', 'tombe sans bruit', 'pèse sur le monde', "glisse dans l'ombre",
                    'compte les heures', 'retient son souffle', 'efface les seuils'],
  'adjectif': ['pâle', 'sourd', 'creux', 'nocturne', 'amer', 'froid', 'opaque', 'muet', 'fendu', 'tiède'],
  'adverbe': ['sans bruit', 'doucement', 'à jamais', 'ailleurs', 'en silence', 'à rebours', 'de biais'],
  'proposition': ['Que reste-t-il encore ?', 'Où vont les ombres ?', 'Qui veille encore ?', "Jusqu'où va le vide ?"],
  'libre': ["l'ombre se souvient", 'la nuit garde tout', 'le sel des heures', 'une porte respire', 'le vent du nord demeure',
            'quelque chose consent', "l'eau noire patiente"],
  'conjonction-coord': ['mais', 'car', 'or', 'pourtant', 'cependant', 'donc'],
  'conjonction-subord': ['quand', 'si', 'comme', 'lorsque', 'dès que', 'tandis que'],
  'infinitif': ['brûler', 'attendre', 'traverser', 'descendre', 'effacer', 'tenir', 'sentir', 'glisser'],
  'gérondif': ['en tombant', 'en glissant', 'en brûlant', 'en tremblant', 'en dormant', 'en cherchant'],
}
const RESERVE_EN: Record<string, string[]> = {
  'groupe-nominal': ['the silence', 'the shadow', 'an ember', 'the night', 'a breath', 'the stone', 'the frost', 'a door',
                     'the rust', 'a threshold', 'the foam', 'the ivy', 'a needle', 'the silt'],
  'verbe': ['trembles', 'devours', 'keeps watch', 'capsizes', 'remains', 'glides', 'prowls', 'wavers',
            'surfaces', 'leans over', 'consents', 'recoils'],
  'verbe-transitif': ['devours', 'grazes', 'swallows', 'cracks', 'crosses', 'gnaws',
                      'lifts', 'mends', 'cradles', 'hollows', 'tames', 'engulfs'],
  'groupe-verbal': ['crosses the night', 'burns in silence', 'falls without a sound', 'weighs on the world', 'slips into the shadow',
                    'counts the hours', 'holds its breath', 'erases the thresholds'],
  'adjectif': ['pale', 'muffled', 'hollow', 'nocturnal', 'bitter', 'cold', 'opaque', 'mute', 'cracked', 'lukewarm'],
  'adverbe': ['without a sound', 'gently', 'forever', 'elsewhere', 'in silence', 'backwards', 'sideways'],
  'proposition': ['What still remains?', 'Where do the shadows go?', 'Who keeps watch?', 'How far does the void go?'],
  'libre': ['the shadow remembers', 'the night keeps everything', 'the salt of the hours', 'a door breathes', 'the north wind remains',
            'something consents', 'the black water waits'],
  'conjonction-coord': ['but', 'for', 'yet', 'however', 'and yet', 'so'],
  'conjonction-subord': ['when', 'if', 'as', 'while', 'as soon as', 'whereas'],
  'infinitif': ['to burn', 'to wait', 'to cross', 'to descend', 'to erase', 'to hold', 'to feel', 'to glide'],
  'gérondif': ['falling', 'gliding', 'burning', 'trembling', 'sleeping', 'searching'],
}
const RESERVE: Record<string, string[]> = langueActuelle() === 'en' ? RESERVE_EN : RESERVE_FR

const CLE_BROUILLON = 'atelier-en-cours'

const attendre = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// Masque un vers : la forme des mots sans le texte (traits proportionnels)
function masquer(texte: string): string {
  return texte
    .split(/\s+/)
    .map(w => '─'.repeat(Math.max(2, Math.min(8, Math.round(w.length * 0.75)))))
    .join(' ')
}

export default function JeuAtelier() {
  const navigate = useNavigate()
  const location = useLocation()
  const seance = useReve()
  const { jouer } = useSound()

  // Plan : depuis la navigation, sinon depuis le brouillon (rechargement de page)
  const [plan] = useState<PlanAtelier | null>(() => {
    const fromState = (location.state as { plan?: PlanAtelier } | null)?.plan
    if (fromState) return fromState
    try {
      const saved = localStorage.getItem(CLE_BROUILLON)
      if (saved) return (JSON.parse(saved) as { plan: PlanAtelier }).plan
    } catch { /* ignore */ }
    return null
  })

  const [vers, setVers] = useState<VersAtelier[]>(() => {
    const fromState = (location.state as { plan?: PlanAtelier } | null)?.plan
    if (fromState) return []   // nouvelle séance — on repart de zéro
    try {
      const saved = localStorage.getItem(CLE_BROUILLON)
      if (saved) return (JSON.parse(saved) as { vers: VersAtelier[] }).vers ?? []
    } catch { /* ignore */ }
    return []
  })
  const versRef = useRef<VersAtelier[]>(vers)
  versRef.current = vers

  const [saisie, setSaisie] = useState('')
  const [voixEnCours, setVoixEnCours] = useState<VoixEnCours[]>([])
  const traites = useRef<Set<number>>(new Set())
  const traiteFragment = useRef<Set<number>>(new Set())
  const sauvegardeFaite = useRef(false)
  const dernierGabarit = useRef('')

  // État pour les tours fragment du médium (verse co-écrit avec des voix IA)
  const [fragGabarit, setFragGabarit] = useState<RoleFragment[] | null>(null)
  const [fragSlotJoueur, setFragSlotJoueur] = useState(0)
  const [fragVoixIndices, setFragVoixIndices] = useState<number[]>([])
  const [fragTextes, setFragTextes] = useState<(string | null)[]>([])

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const colorLabel = c?.name.toUpperCase() ?? ''

  const idx = vers.length
  const total = plan?.totalVers ?? 0
  const termine = plan !== null && idx >= total
  const tourJoueur = plan !== null && !termine && plan.toursJoueur.includes(idx)
  // toursFragmentJoueur peut être absent des vieux brouillons sauvegardés → ?? []
  const tourFragmentJoueur = tourJoueur && (plan?.toursFragmentJoueur ?? []).includes(idx)

  // Pas de plan (accès direct à l'URL) → retour à la configuration
  useEffect(() => {
    if (!plan) navigate('/atelier', { replace: true })
  }, [plan, navigate])

  // Brouillon : la séance survit à un rechargement
  useEffect(() => {
    if (!plan || termine) return
    try { localStorage.setItem(CLE_BROUILLON, JSON.stringify({ plan, vers })) } catch { /* ignore */ }
  }, [plan, vers, termine])

  function ajouterVers(v: VersAtelier) {
    setVers(prev => [...prev, v])
  }

  // ── Tour des voix : 1 à 3 voix se partagent le vers, chacune dans une case
  // grammaticale tirée au sort — le principe du cadavre écrit ──
  useEffect(() => {
    if (!plan || termine || tourJoueur) return   // tourFragmentJoueur ⊂ tourJoueur — couvert ici
    if (traites.current.has(idx)) return
    traites.current.add(idx)
    jouer('ia')

    let annule = false

    async function ecrireVersIA() {
      const p = plan!
      const nVoix = Math.min(1 + Math.floor(Math.random() * 3), p.voixPool.length)
      const indices = p.voixPool.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, nVoix)
      // L'interrogatif est plafonné : une question par poème (deux au-delà de XX vers)
      // — sans budget, les « Qui pleure sous la craie ? » s'accumulent en tic
      const questionsOk = versRef.current.filter(v => v.texte.includes('?')).length
        < Math.max(1, Math.floor(p.totalVers / 10))
      // Jamais deux fois de suite la même forme — la métrique respire
      let gabarit = tirerGabarit(nVoix, questionsOk)
      for (let essai = 0; essai < 5 && signatureGabarit(gabarit) === dernierGabarit.current; essai++) {
        gabarit = tirerGabarit(nVoix, questionsOk)
      }
      dernierGabarit.current = signatureGabarit(gabarit)
      setVoixEnCours(indices.map((vi, k) => ({ num: vi + 1, role: gabarit[k].role, fait: false })))

      // L'écho au dernier mot : seule la dernière trace du vers précédent est
      // transmise — assez pour un raccord, pas assez pour imposer un thème.
      // La voix décide librement d'y rebondir ou de l'ignorer.
      const precedent = versRef.current[idx - 1]?.texte
      const echo = precedent ? dernierMot(precedent) : undefined
      const contexte = p.echo && echo ? echo : undefined

      const fragments: string[] = []
      // Conjonctions courtes (≤2 lettres) : "en" (gérondif), "or", "si", "et", "ni"
      // échappent au filtre > 2 chars. Calculé avant la boucle : versRef est stable
      // entre itérations, inutile de refaire le scan à chaque fragment.
      const CONJ_COURTES = langueActuelle() === 'en' ? new Set(['or', 'if', 'as', 'so']) : new Set(['or', 'si', 'en', 'et', 'ni'])
      const conjCourtesUsees = versRef.current.flatMap(v => {
        const m = v.texte.trim().toLowerCase().match(/^[a-zà-ÿ]+/)
        return m && CONJ_COURTES.has(m[0]) ? [m[0]] : []
      })
      for (let k = 0; k < indices.length; k++) {
        if (annule) return
        const caseRole = gabarit[k]
        const enCours = fragments.join(' ')
        const eviter = [
          ...versRef.current.flatMap(v => v.texte.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []).filter(m => m.length > 2),
          ...(enCours.toLowerCase().match(/[a-zà-ÿ]+/gi)?.filter(m => m.length > 2) ?? []),
          ...conjCourtesUsees,
        ]

        const requete = {
          consigne: caseRole.consigne,
          type: caseRole.type,
          voiceId: p.voixPool[indices[k]],
          contexte,
          eviter,
          ...(caseRole.mots ? { mots: caseRole.mots } : {}),
        }
        let texte = ''
        try {
          const [reponse] = await Promise.all([
            // Une reprise avant la réserve locale — les lignes en conserve se reconnaissent
            demanderFragmentIA(requete).catch(async () => { await attendre(800); return demanderFragmentIA(requete) }),
            attendre(650 + Math.random() * 450),   // respiration théâtrale minimale par voix
          ])
          texte = reponse.texte.trim()
        } catch { /* réserve locale */ }
        if (!texte) {
          const pool = RESERVE[caseRole.type] ?? RESERVE['libre']
          texte = pool[Math.floor(Math.random() * pool.length)]
        }
        // Les questions retrouvent leur point d'interrogation (le serveur coupe la ponctuation finale)
        if (caseRole.type === 'proposition' && !/[?!.]\s*$/.test(texte)) texte += ' ?'

        // Les fragments suivants se cousent en minuscule — un seul fil
        const cousu = k === 0 ? texte : texte.charAt(0).toLowerCase() + texte.slice(1)
        fragments.push(cousu + (caseRole.apres ?? ''))
        if (annule) return
        setVoixEnCours(prev => prev.map((v, j) => j === k ? { ...v, fait: true } : v))
      }

      await attendre(500)
      if (annule) return
      setVoixEnCours([])
      ajouterVers({
        texte: fragments.join(' ').replace(/\s+/g, ' ').trim(),
        auteur: 'ia',
        voixNums: indices.map(i => i + 1),
      })
    }

    ecrireVersIA()
    return () => { annule = true }
  }, [idx, plan, termine, tourJoueur]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tour fragment : le médium remplit un slot, les voix remplissent les autres ──
  // Le gabarit est tiré, un slot est assigné au médium, les voix IA cherchent
  // leurs fragments en parallèle pendant que le médium tape le sien.
  useEffect(() => {
    if (!plan || termine || !tourFragmentJoueur) return
    if (traiteFragment.current.has(idx)) return
    traiteFragment.current.add(idx)
    jouer('ia')

    let annule = false

    async function initFragment() {
      const p = plan!
      // Le médium écrit surtout des FRAGMENTS cousus avec les voix : le vers
      // entier en solitaire devient l'exception (12 %) — c'est la couture
      // aveugle qui fait l'atelier, pas l'écriture en solo.
      const r = Math.random()
      const nAIVoulu = r < 0.12 ? 0 : r < 0.56 ? 1 : 2
      const nAI = Math.min(nAIVoulu, p.voixPool.length)
      const nTotal = nAI + 1
      // Le budget interrogatif s'applique aussi à la plume du médium
      const questionsOk = versRef.current.filter(v => v.texte.includes('?')).length
        < Math.max(1, Math.floor(p.totalVers / 10))
      let gabarit = tirerGabarit(nTotal, questionsOk)
      for (let essai = 0; essai < 5 && signatureGabarit(gabarit) === dernierGabarit.current; essai++) {
        gabarit = tirerGabarit(nTotal, questionsOk)
      }
      dernierGabarit.current = signatureGabarit(gabarit)

      const slotJoueur = Math.floor(Math.random() * gabarit.length)
      const aiIndices = p.voixPool.map((_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, nAI)

      setFragGabarit(gabarit)
      setFragSlotJoueur(slotJoueur)
      setFragVoixIndices(aiIndices)
      setFragTextes(new Array(gabarit.length).fill(null))

      // Voix IA affichées comme en cours (hors slot médium)
      let aiCounter = 0
      setVoixEnCours(
        gabarit
          .map((role, k) => k !== slotJoueur
            ? { num: aiIndices[aiCounter++] + 1, role: role.role, fait: false }
            : null)
          .filter(Boolean) as VoixEnCours[]
      )

      // Eviter — calculé une fois, partagé par tous les fetches parallèles
      const CONJ_COURTES_F = langueActuelle() === 'en' ? new Set(['or', 'if', 'as', 'so']) : new Set(['or', 'si', 'en', 'et', 'ni'])
      const conjCourtesUsees = versRef.current.flatMap(v => {
        const m = v.texte.trim().toLowerCase().match(/^[a-zà-ÿ]+/)
        return m && CONJ_COURTES_F.has(m[0]) ? [m[0]] : []
      })
      const eviterBase = [
        ...versRef.current.flatMap(v => v.texte.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []).filter(m => m.length > 2),
        ...conjCourtesUsees,
      ]

      const echoVers = versRef.current[idx - 1]?.texte
      const echoMot = echoVers ? dernierMot(echoVers) : undefined
      const contexte = p.echo && echoMot ? echoMot : undefined

      // Slots IA numérotés pour mise à jour de voixEnCours
      const aiSlots: { k: number; aiIdx: number }[] = []
      let c = 0
      for (let k = 0; k < gabarit.length; k++) {
        if (k !== slotJoueur) aiSlots.push({ k, aiIdx: c++ })
      }

      // Fetch en parallèle — le médium tape pendant que les voix cherchent
      await Promise.all(aiSlots.map(async ({ k, aiIdx: localIdx }) => {
        if (annule) return
        const role = gabarit[k]
        const requete = {
          consigne: role.consigne,
          type: role.type,
          voiceId: p.voixPool[aiIndices[localIdx]],
          contexte,
          eviter: eviterBase,
        }
        let texte = ''
        try {
          const [reponse] = await Promise.all([
            demanderFragmentIA(requete).catch(async () => { await attendre(800); return demanderFragmentIA(requete) }),
            attendre(400 + Math.random() * 400),
          ])
          texte = reponse.texte.trim()
        } catch { /* réserve locale */ }
        if (!texte) {
          const pool = RESERVE[role.type] ?? RESERVE['libre']
          texte = pool[Math.floor(Math.random() * pool.length)]
        }
        if (role.type === 'proposition' && !/[?!.]\s*$/.test(texte)) texte += ' ?'
        if (annule) return
        setFragTextes(prev => { const next = [...prev]; if (next.length > k) next[k] = texte; return next })
        setVoixEnCours(prev => prev.map((v, i) => i === localIdx ? { ...v, fait: true } : v))
      }))
    }

    initFragment()
    return () => { annule = true }
  }, [idx, plan, termine, tourFragmentJoueur]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Assemblage fragment : quand tous les slots sont remplis (médium + voix) ──
  useEffect(() => {
    if (!fragGabarit || fragTextes.length === 0) return
    if (fragTextes.some(t => t === null)) return

    const coutures = fragGabarit.map((role, k) => {
      const t = fragTextes[k] as string
      const cousu = k === 0 ? t : t.charAt(0).toLowerCase() + t.slice(1)
      return cousu + (role.apres ?? '')
    })
    const texte = coutures.join(' ').replace(/\s+/g, ' ').trim()
    const voixNums = fragVoixIndices.map(i => i + 1)

    setVoixEnCours([])
    // Tiré seul sur le vers, le médium signe seul — pas de couture mixte
    ajouterVers({ texte, auteur: voixNums.length === 0 ? 'humain' : 'mixte', voixNums })
    setFragGabarit(null)
    setFragTextes([])
  }, [fragTextes, fragGabarit]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fin : correction des accords vers par vers, sauvegarde et révélation ──
  useEffect(() => {
    if (!plan || !termine || sauvegardeFaite.current) return
    sauvegardeFaite.current = true

    finaliser()

    async function finaliser() {
      // Les accords sont cousus dans le poème lui-même : les coutures
      // (vue vers par vers) montrent le même texte que le feuillet.
      let textes = versRef.current.map(v => v.texte)
      try {
        const corrige = await corrigerAccords(
          textes.join('\n'), 'atelier',
          textes.map(t => ({ texte: t, type: 'libre' })),
        )
        const lignes = corrige.split('\n').map(l => l.trim()).filter(Boolean)
        if (lignes.length === textes.length) textes = lignes
      } catch { /* texte brut */ }

      const cases: Case[] = versRef.current.map((v, i) => ({
        numero: i + 1,
        fonction: tr(`vers ${i + 1}`, `line ${i + 1}`),
        consigne: v.auteur === 'humain'
          ? tr('vers du médium', 'line by the medium')
          : v.auteur === 'mixte'
            ? tr(`vers du médium et des voix ${v.voixNums.map(toRomain).join(' · ')}`, `line by the medium and voices ${v.voixNums.map(toRomain).join(' · ')}`)
            : tr(`vers des voix ${v.voixNums.map(toRomain).join(' · ')}`, `line by voices ${v.voixNums.map(toRomain).join(' · ')}`),
        auteur: v.auteur,
        texte: textes[i],
        ts: Date.now(),
      }))

      const poeme: Poeme = {
        id: `atelier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        titre: null,
        structureId: 'atelier',
        mode: 'standard',
        visibilite: plan!.echo ? 'derniere-case' : 'aveugle',
        cases,
        dateCreation: Date.now(),
        dateModification: Date.now(),
      }

      sauvegarderPoeme(poeme)
        .catch(console.error)
        .finally(() => {
          localStorage.removeItem(CLE_BROUILLON)
          navigate('/fin', { state: { poeme } })
        })
    }
  }, [termine, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  function deposerVers() {
    const t = saisie.trim()
    if (!t || !tourJoueur || tourFragmentJoueur) return
    jouer('soumettre')
    setSaisie('')
    ajouterVers({ texte: t, auteur: 'humain', voixNums: [] })
  }

  function deposerFragment() {
    let t = saisie.trim()
    if (!t || !fragGabarit || fragTextes[fragSlotJoueur] !== null) return
    // La question du médium retrouve son point d'interrogation, comme celle des voix
    if (fragGabarit[fragSlotJoueur].type === 'proposition' && !/[?!.]\s*$/.test(t)) t += ' ?'
    jouer('soumettre')
    setSaisie('')
    setFragTextes(prev => {
      const next = [...prev]
      next[fragSlotJoueur] = t
      return next
    })
  }

  function quitter() {
    if (vers.length > 0 && !window.confirm(tr("Refermer l'atelier ? La séance en cours sera perdue.", 'Close the workshop? The current séance will be lost.'))) return
    localStorage.removeItem(CLE_BROUILLON)
    navigate('/')
  }

  if (!plan) return null

  // Le médium reçoit le même écho que les voix : le dernier mot du vers précédent, rien de plus
  const echoTexte = plan.echo && tourJoueur && idx > 0 ? (dernierMot(vers[idx - 1].texte) ?? null) : null
  const seul = plan.voixPool.length === 0
  const consigneJoueur = idx === 0
    ? seul
      ? tr('Ouvre la séance — tu joues contre ta propre mémoire.', 'Open the séance — you play against your own memory.')
      : tr("Ouvre la séance — le premier vers t'appartient.", 'Open the séance — the first line is yours.')
    : idx === total - 1
      ? seul
        ? tr('Referme le poème — sans te relire.', 'Close the poem — without rereading yourself.')
        : tr("Referme le poème — le dernier vers t'appartient.", 'Close the poem — the last line is yours.')
      : seul
        ? tr("Continue à l'aveugle — ta mémoire seule guide la main.", 'Carry on blind — memory alone guides your hand.')
        : tr('La main te revient.', 'The pen returns to you.')

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="jeu" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={quitter}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('QUITTER', 'LEAVE')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── ÉTAT DE SÉANCE ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em' }}>
            {tr("— L'ATELIER —", '— THE WORKSHOP —')}
          </span>
          <span style={{ ...mono, fontSize: 12, color: encre, opacity: 0.6 }}>
            {tr('VERS', 'LINE')} {toRomain(Math.min(idx + 1, total))} / {toRomain(total)}
          </span>
        </div>
        <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.45, marginTop: 3 }}>
          {plan.voixPool.length === 0 ? tr('SEUL', 'ALONE') : tr(`${toRomain(plan.voixPool.length)} VOIX`, `${toRomain(plan.voixPool.length)} VOICES`)} · {plan.echo ? tr("L'ÉCHO", 'THE ECHO') : tr('OBSCURITÉ TOTALE', 'TOTAL DARKNESS')}
        </div>

        {/* ── FEUILLET MASQUÉ : la forme du poème, jamais le texte ── */}
        <div style={{ marginTop: 22, marginBottom: 18, minHeight: 60 }}>
          {vers.map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, lineHeight: 1.2 }}
            >
              <span style={{
                fontSize: 11, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center',
                color: v.auteur === 'ia' ? encre : accent,
                opacity: v.auteur === 'humain' ? 0.9 : v.auteur === 'mixte' ? 0.55 : 0.4,
              }}>
                {v.auteur === 'ia'
                  ? '✦'
                  : <span style={{ display: 'inline-block', width: 7, height: 7, background: 'currentColor', borderRadius: 1 }} />}
              </span>
              <span style={{ fontSize: 13, color: encre, opacity: 0.55, letterSpacing: '0.08em', wordBreak: 'break-all' }}>
                {masquer(v.texte)}
              </span>
            </motion.div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* ── ZONE ACTIVE ── */}
        <AnimatePresence mode="wait">

          {/* Tour fragment : le médium remplit un slot, les voix les autres */}
          {tourFragmentJoueur && fragGabarit ? (
            <motion.div
              key={`fragment-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 8 }}
            >
              {echoTexte ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 6 }}>
                    {tr("— L'ÉCHO —", '— THE ECHO —')}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontStyle: 'italic', color: encre, opacity: 0.85, lineHeight: 1.4 }}>
                    « … {echoTexte} »
                  </div>
                </div>
              ) : idx > 0 && (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginBottom: 14 }}>
                  {tr('— TU ÉCRIS DANS LE NOIR —', '— YOU WRITE IN THE DARK —')}
                </div>
              )}

              {/* Voix IA travaillant en parallèle */}
              {voixEnCours.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {voixEnCours.map((v, k) => (
                    <motion.div
                      key={k}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: v.fait ? 0.5 : 0.75 }}
                      transition={{ duration: 0.3 }}
                      style={{ ...mono, fontSize: 12, color: encre, marginBottom: 5 }}
                    >
                      {tr('VOIX', 'VOICE')} {toRomain(v.num)} · {v.role}{' '}
                      {v.fait
                        ? <span style={{ color: accent }}>✦</span>
                        : <motion.span
                            animate={{ opacity: [0.25, 1, 0.25] }}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                            style={{ color: accent }}
                          >…</motion.span>}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Slot du médium — actif tant qu'il n'a pas soumis */}
              {fragTextes[fragSlotJoueur] === null ? (
                <>
                  <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 6 }}>
                    {fragGabarit.length === 1
                      ? <>{tr('— LE SORT TE TIRE SEUL ·', '— FATE DRAWS YOU ALONE ·')} {fragGabarit[fragSlotJoueur].role} —</>
                      : <>{tr('— FRAGMENT', '— FRAGMENT')} {toRomain(fragSlotJoueur + 1)} / {toRomain(fragGabarit.length)} · {fragGabarit[fragSlotJoueur].role} —</>}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontStyle: 'italic', color: encre, opacity: 0.7, marginBottom: 10 }}>
                    {fragGabarit[fragSlotJoueur].consigne}
                  </div>
                  <input
                    value={saisie}
                    onChange={e => setSaisie(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); deposerFragment() } }}
                    placeholder={tr('ton fragment…', 'your fragment…')}
                    autoFocus
                    style={{
                      width: '100%',
                      fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: 'italic',
                      color: encre, background: 'transparent',
                      border: 'none', borderBottom: `1.2px solid ${accent}66`,
                      outline: 'none', padding: '4px 2px 8px', lineHeight: 1.45,
                    }}
                  />
                  <button
                    onClick={deposerFragment}
                    disabled={!saisie.trim()}
                    style={{
                      width: '100%', marginTop: 14,
                      background: saisie.trim() ? encre : `${encre}30`,
                      color: bg,
                      ...mono, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '0.85em 1em', border: 'none',
                      borderRadius: 3,
                      cursor: saisie.trim() ? 'pointer' : 'default',
                      transition: 'background 0.2s',
                    }}
                  >
                    {tr('Glisser le fragment', 'Slip in the fragment')} →
                  </button>
                </>
              ) : (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginTop: 8 }}>
                  {tr('— LES VOIX TERMINENT —', '— THE VOICES ARE FINISHING —')}
                </div>
              )}
            </motion.div>

          /* Tour complet : le médium écrit le vers seul */
          ) : tourJoueur ? (
            <motion.div
              key={`humain-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 8 }}
            >
              {echoTexte ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 6 }}>
                    {tr("— L'ÉCHO —", '— THE ECHO —')}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontStyle: 'italic', color: encre, opacity: 0.85, lineHeight: 1.4 }}>
                    « … {echoTexte} »
                  </div>
                </div>
              ) : idx > 0 && (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginBottom: 16 }}>
                  {tr('— TU ÉCRIS DANS LE NOIR —', '— YOU WRITE IN THE DARK —')}
                </div>
              )}

              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontStyle: 'italic', color: encre, opacity: 0.75, marginBottom: 12 }}>
                {consigneJoueur}
              </div>

              <textarea
                value={saisie}
                onChange={e => setSaisie(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); deposerVers() }
                }}
                placeholder={tr('ton vers…', 'your line…')}
                rows={2}
                autoFocus
                style={{
                  width: '100%', resize: 'none',
                  fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: 'italic',
                  color: encre, background: 'transparent',
                  border: 'none', borderBottom: `1.2px solid ${accent}66`,
                  outline: 'none', padding: '4px 2px 8px', lineHeight: 1.45,
                }}
              />
              <button
                onClick={deposerVers}
                disabled={!saisie.trim()}
                style={{
                  width: '100%', marginTop: 14,
                  background: saisie.trim() ? encre : `${encre}30`,
                  color: bg,
                  ...mono, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '0.85em 1em', border: 'none',
                  borderRadius: 3,
                  cursor: saisie.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
              >
                {idx === total - 1 ? tr('Refermer le poème →', 'Close the poem →') : tr('Déposer le vers →', 'Lay down the line →')}
              </button>
            </motion.div>

          /* Tour IA pur ou attente init fragment */
          ) : !termine ? (
            <motion.div
              key={`ia-${idx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 24, textAlign: 'center' }}
            >
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 14 }}>
                {tr('— LES VOIX ÉCRIVENT —', '— THE VOICES ARE WRITING —')}
              </div>
              {voixEnCours.map((v, k) => (
                <motion.div
                  key={k}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: v.fait ? 0.85 : 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, marginBottom: 7 }}
                >
                  {tr('VOIX', 'VOICE')} {toRomain(v.num)} · {v.role}{' '}
                  {v.fait
                    ? <span style={{ color: accent }}>✦</span>
                    : <motion.span
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ repeat: Infinity, duration: 1.4 }}
                        style={{ color: accent }}
                      >…</motion.span>}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="fin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ paddingBottom: 24, textAlign: 'center', ...mono, fontSize: 13, color: accent, letterSpacing: '0.22em' }}
            >
              {tr('— LE POÈME SE REFERME —', '— THE POEM CLOSES —')}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  )
}
