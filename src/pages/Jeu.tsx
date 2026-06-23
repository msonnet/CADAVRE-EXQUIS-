import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import TutorielCoach from '../components/TutorielCoach'
import { useTutoriel, TUTORIEL_TOTAL, T_JEU_1, T_JEU_IA, T_JEU_2 } from '../hooks/useTutoriel'

import { getStructure, nombreCasesEffectif } from '../structures'
import type { DefinitionCase } from '../structures'
import { validerCase } from '../utils/validation'
import type { NiveauValidation } from '../utils/validation'
import { demanderFragmentIA } from '../api/claude'
import { VOICE_IDS } from '../data/voiceIds'
import { sauvegarderPoeme } from '../db'
import type { ConfigPartie, Case, Poeme, Visibilite } from '../types'
import { useAmbiance } from '../hooks/useAmbiance'
import { useSound } from '../hooks/useSound'
import { Decor, useReve } from '../reve'

// ─── Types internes ──────────────────────────────────────────────────────────

type Participant = { type: 'humain'; num: number } | { type: 'ia' }
type BrouillonActuel = { poemeId: string; config: ConfigPartie; cases: Case[]; caseIndex: number; voixParSlot?: Record<number, string> }

// ─── Constantes ──────────────────────────────────────────────────────────────

const CONFIG_DEFAUT: ConfigPartie = {
  structureId: 'phrase-etoffee',
  visibilite: 'aveugle',
  premierJoueur: 'ia',
  mode: 'standard',
  joueursHumains: 1,
  voixIA: 1,
}

const DUREE_HYPNOTIQUE = 30

// ─── Fonctions pures ─────────────────────────────────────────────────────────

/**
 * Construit la séquence de participants qui se répète sur toute la partie.
 * H et IA sont entrelacés autant que possible : H1, IA, H2, IA, H3…
 * En solo, premierJoueur détermine si H ou IA ouvre.
 */
function buildSequence(
  joueursHumains: number,
  voixIA: number,
  premierJoueur: 'humain' | 'ia'
): Participant[] {
  const nb = Math.max(1, joueursHumains)
  const H: Participant[] = Array.from({ length: nb }, (_, i) => ({ type: 'humain' as const, num: i + 1 }))
  const I: Participant[] = Array.from({ length: voixIA }, () => ({ type: 'ia' as const }))

  if (I.length === 0) return H

  // Entrelacement : le tableau le plus court s'intercale dans le plus long
  const first  = nb >= I.length ? H : I
  const second = nb >= I.length ? I : H
  const seq: Participant[] = []
  for (let i = 0; i < first.length; i++) {
    seq.push(first[i])
    if (i < second.length) seq.push(second[i])
  }

  // Rotation : garantir que le bon type ouvre la séquence
  if (premierJoueur === 'humain' && seq[0].type !== 'humain') {
    const idx = seq.findIndex(p => p.type === 'humain')
    if (idx > 0) return [...seq.slice(idx), ...seq.slice(0, idx)]
  } else if (premierJoueur === 'ia' && seq[0].type !== 'ia') {
    const idx = seq.findIndex(p => p.type === 'ia')
    if (idx > 0) return [...seq.slice(idx), ...seq.slice(0, idx)]
  }

  return seq
}

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

// ~36 % des vers libres s'ouvrent autrement que par un article — conjonctions,
// infinitif, gérondif — pour briser la succession « le… la… un… ».
function ouvertureAleatoire(consigneBase: string): string {
  const r = Math.random()
  if (r < 0.13) return 'un vers de 3 à 6 mots — commence par une conjonction de coordination (mais, car, or, pourtant, cependant) suivie d\'une image physique et inattendue'
  if (r < 0.23) return 'un vers de 3 à 6 mots — commence par une conjonction de subordination (quand, si, comme, lorsque) suivie d\'une image physique et inattendue'
  if (r < 0.30) return "un vers de 3 à 6 mots — commence par un verbe à l'infinitif (brûler, attendre, traverser, descendre) suivi d'une image physique et inattendue"
  if (r < 0.36) return 'un vers de 3 à 6 mots — commence par un gérondif (en tombant, en glissant, en brûlant) suivi d\'une image physique et inattendue'
  return consigneBase
}

const TYPE_SUBTITLE: Partial<Record<string, string>> = {
  'nom':             "AVEC ARTICLE · OU SANS",
  'verbe':           "À L'INFINITIF · OU CONJUGUÉ",
  'adjectif':        "ÉPITHÈTE · OU ATTRIBUT",
  'adverbe':         "DE MANIÈRE · OU DEGRÉ",
  'groupe-nominal':  "DÉT. · NOM · ÉPITHÈTE",
  'groupe-verbal':   "VERBE · COMPLÉMENT",
  'proposition':     "PHRASE COMPLÈTE · AVEC PONCTUATION",
  'libre':           "LIBRE · SANS CONTRAINTE",
}

// Exemples concrets pour chaque type — montrés toujours, en taille lisible.
const TYPE_EXAMPLE: Partial<Record<string, string>> = {
  'nom':             "« la pluie » · « un silence » · « l'abîme »",
  'verbe':           "« brûle » · « disparaît » · « se tait »",
  'adjectif':        "« immobile » · « nocturne » · « étrange »",
  'adverbe':         "« doucement » · « en silence » · « à jamais »",
  'groupe-nominal':  "« l'ombre portée » · « un souffle perdu » · « la nuit sans fond »",
  'groupe-verbal':   "« traverse la nuit » · « brûle en silence » · « efface les traces »",
  'proposition':     "« Où vont les ombres ? » · « Que reste-t-il encore ? »",
}

function renderConsigneTitre(consigne: string, accent: string): React.ReactNode {
  const idx = consigne.indexOf(' ')
  if (idx === -1) {
    const cap = consigne.charAt(0).toUpperCase() + consigne.slice(1)
    return <span style={{ color: accent }}>{cap}.</span>
  }
  const article = consigne.slice(0, idx + 1)
  const keyword = consigne.slice(idx + 1)
  return (
    <>
      {article.charAt(0).toUpperCase() + article.slice(1)}
      <span style={{ color: accent }}>{keyword}</span>
      {'.'}
    </>
  )
}

function lireBrouillon(): BrouillonActuel | null {
  try {
    const raw = localStorage.getItem('brouillon-actuel')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    const v = JSON.parse(raw)
    return v ?? fallback
  } catch { return fallback }
}

function normaliserCle(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ─── Fallbacks client ────────────────────────────────────────────────────────

const FALLBACKS_CLIENT: Record<string, string[]> = {
  nom: ["l'ombre", 'le silence', 'la nuit', 'la cendre', 'le vide', 'la pierre', 'la brume',
        'le froid', 'la poussière', 'le vent', 'la pluie', "l'écho", 'la flamme', 'le seuil',
        "l'abîme", 'le vertige', 'la mousse', 'le givre', "l'encre", 'la boue'],
  verbe: ['glisse', 'brûle', 'tombe', 'tremble', 'demeure', 'se tait', 'disparaît', 'pèse',
          'erre', 'veille', 'frôle', 'hante', 'effleure', 'résiste', 'chavire', 'murmure',
          'vacille', 'sombre', 'rôde', 'dérive'],
  adjectif: ['immobile', 'pâle', 'profond', 'étrange', 'brisé', 'nocturne', 'creux', 'lourd',
             'froid', 'sourd', 'amer', 'voilé', 'opaque', 'lent', 'nu', 'aigre',
             'muet', 'dense', 'sombre', 'fragile'],
  adverbe: ['doucement', 'lentement', 'en silence', 'sans bruit', 'à jamais', 'encore', 'ailleurs',
            'en vain', 'presque', 'toujours', 'parfois', 'nulle part', 'jadis', 'désormais'],
  'groupe-nominal': [
    "l'ombre portée", 'la nuit sans fond', 'un souffle perdu', 'la cendre froide',
    'le bruit du vent', 'une lumière voilée', 'la terre durcie', 'un regard vide',
    'la pluie fine', 'le temps qui passe', 'un mur de brume', 'la main tendue',
    'un silence épais', 'le bord du gouffre', 'une voix creuse', "l'eau noire",
    'le corps absent', 'une ombre familière', 'la porte close', 'un feu mourant',
  ],
  'groupe-verbal': [
    'traverse la nuit', 'brûle en silence', "glisse dans l'ombre", 'tombe sans bruit',
    'demeure immobile', 'efface les traces', 'attend sans espoir', 'pèse sur le monde',
    'hante les couloirs', 'frôle les murs', 'résiste au vent', 'se perd dans le brouillard',
  ],
  proposition: [
    'Que reste-t-il encore ?', 'Où vont les ombres ?', 'Qui a éteint la lumière ?',
    'Quand reviendra le froid ?', 'Pourquoi ce silence ?', 'Qui veille encore ?',
    'Que cherche-t-on ici ?', 'Où finit la nuit ?', "Qu'y a-t-il derrière ?",
    'Qui se souvient encore ?', "Jusqu'où va le vide ?", "Quand cela s'arrêtera-t-il ?",
  ],
  libre: [
    'quelque chose demeure', 'la nuit garde tout', 'le silence répond',
    'rien ne disparaît vraiment', 'tout recommence ailleurs', "l'oubli protège",
    'il reste toujours quelque chose', 'les mots s\'effacent', 'le temps hésite',
    "l'absence a une forme",
  ],
}

function makeFallbackPicker() {
  const derniers: Record<string, string> = {}
  return function pick(type: string): string {
    const arr = FALLBACKS_CLIENT[type] ?? ['quelque chose']
    const dernier = derniers[type]
    const candidats = arr.length > 1 ? arr.filter(v => v !== dernier) : arr
    const choix = candidats[Math.floor(Math.random() * candidats.length)]
    derniers[type] = choix
    return choix
  }
}

function pickUnused(type: string, used: Set<string>): string {
  const pool = FALLBACKS_CLIENT[type] ?? ['quelque chose']
  const unused = pool.filter(v => !used.has(normaliserCle(v)))
  const source = unused.length > 0 ? unused : pool
  return source[Math.floor(Math.random() * source.length)]
}

function getContexteVisible(cases: Case[], visibilite: Visibilite): string | null {
  if (cases.length === 0) return null
  const derniere = cases[cases.length - 1]
  if (visibilite === 'dernier-mot') {
    const mots = derniere.texte.trim().split(/\s+/).filter(Boolean)
    return mots[mots.length - 1] ?? null
  }
  if (visibilite === 'derniere-case') return derniere.texte.trim()
  return null
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function Jeu() {
  const navigate = useNavigate()

  const [b] = useState<BrouillonActuel | null>(lireBrouillon)

  const [config] = useState<ConfigPartie>(() => {
    const raw = b?.config ?? (() => {
      const r = sessionStorage.getItem('config-partie')
      return r ? JSON.parse(r) : null
    })()
    if (!raw) return CONFIG_DEFAUT
    return { joueursHumains: 1, voixIA: 1, ...raw } as ConfigPartie
  })

  const [structure]  = useState(() => getStructure(config.structureId))
  const [total]      = useState(() => nombreCasesEffectif(structure))
  const [caseDefs]   = useState<DefinitionCase[]>(() => structure.cases.slice(0, total))
  const [seq]        = useState(() => buildSequence(config.joueursHumains, config.voixIA, config.premierJoueur))
  const [participants] = useState<Participant[]>(() =>
    Array.from({ length: total }, (_, i) => seq[i % seq.length])
  )
  const [poemeId] = useState(() => b?.poemeId ?? crypto.randomUUID())

  // Pré-assigne une voix stable à chaque slot IA de la séquence, une fois pour toute la partie.
  // Fenêtre glissante : on garde l'ordre des voix récemment employées et on interdit la
  // réutilisation des FENETRE_VOIX dernières — impossible de retomber sur la même voix avant
  // une vingtaine de parties, tout en finissant par toutes les parcourir.
  const [voixParSlot] = useState<Record<number, string>>(() => {
    if (b?.voixParSlot) return b.voixParSlot
    const FENETRE_VOIX = 20
    let recentes = safeParse<string[]>(localStorage.getItem('voix-recentes'), [])
      .filter(id => (VOICE_IDS as readonly string[]).includes(id))
    const map: Record<number, string> = {}
    seq.forEach((p, idx) => {
      if (p.type === 'ia') {
        // On exclut les FENETRE_VOIX plus récentes (sans jamais tout exclure)
        const fenetre = Math.min(FENETRE_VOIX, VOICE_IDS.length - 1)
        const interdites = new Set(recentes.slice(-fenetre))
        const avail = (VOICE_IDS as readonly string[]).filter(id => !interdites.has(id))
        const choix = avail[Math.floor(Math.random() * avail.length)]
        recentes = [...recentes, choix].slice(-VOICE_IDS.length)
        map[idx] = choix
      }
    })
    localStorage.setItem('voix-recentes', JSON.stringify(recentes))
    return map
  })

  // Numéro d'affichage de chaque slot IA (position dans seq → numéro 1-based)
  const [iaSlotNums] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {}
    let count = 0
    seq.forEach((p, idx) => { if (p.type === 'ia') map[idx] = ++count })
    return map
  })

  const [cases, setCases]       = useState<Case[]>(() => b?.cases ?? [])
  const [caseIndex, setCaseIndex] = useState(() => b?.caseIndex ?? 0)
  const [inputValue, setInputValue] = useState('')
  const [erreur, setErreur]       = useState<string | null>(null)
  const [iaChargement, setIaChargement] = useState(false)
  const [iaTexteRevele, setIaTexteRevele] = useState<string | null>(null)
  const [iaFallbackRevele, setIaFallbackRevele] = useState(false)
  const [tempsRestant, setTempsRestant] = useState<number | null>(null)
  const [attendPassage, setAttendPassage] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [sealing, setSealing] = useState(false)

  const niveauValidation = (localStorage.getItem('validation-niveau') as NiveauValidation) ?? 'souple'

  const casesTraitees  = useRef(new Set<number>(b ? Array.from({ length: b.caseIndex }, (_, i) => i) : []))
  const sauvegardeFaite = useRef(false)
  const fallback        = useRef(makeFallbackPicker())
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const revealTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const caseIndexSoumis = useRef(-1)
  const textesUtilises  = useRef(new Set<string>())
  const textesSession   = useRef(new Set<string>(safeParse<string[]>(sessionStorage.getItem('textes-session'), [])))
  // Mots produits par l'IA lors des parties récentes (persistés), pour éviter que
  // la même imagerie (« boue », « pierre », « chaux »…) ne revienne d'une partie à l'autre.
  const motsIaRecents   = useRef<string[]>(safeParse<string[]>(localStorage.getItem('mots-ia-recents'), []))
  const MOTS_IA_MAX = 140
  function memoriserMotsIa(texte: string) {
    const mots = (texte.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []).filter(m => m.length > 2)
    const debut = texte.trim().toLowerCase().match(/^(or|si|en|et|ni)\b/)
    if (debut) mots.unshift(debut[0])
    if (!mots.length) return
    const fusion = [...motsIaRecents.current, ...mots]
    motsIaRecents.current = fusion.slice(-MOTS_IA_MAX)
    localStorage.setItem('mots-ia-recents', JSON.stringify(motsIaRecents.current))
  }

  const { start: ambianceStart, stop: ambianceStop, toggleMute, muted } = useAmbiance()
  const { jouer } = useSound()
  const seance = useReve()
  const { etape: tutEtape, actif: tutActif, avancer: tutAvancer, terminer: tutTerminer } = useTutoriel()

  // ─── Dérivés ───────────────────────────────────────────────────────────────

  const participantActuel: Participant | undefined = participants[caseIndex]
  const defActuelle: DefinitionCase | undefined    = caseDefs[caseIndex]
  const modeHypnotique = config.mode === 'hypnotique'
  const multiJoueurs   = config.joueursHumains > 1
  const contexteVisible = participantActuel?.type === 'humain'
    ? getContexteVisible(cases, config.visibilite)
    : null

  // ─── Tutoriel ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tutActif) return
    // T_JEU_IA n'est PAS auto-avancé ici : le joueur doit taper "Compris"
    // pour avoir le temps de lire le panneau.
    if (tutEtape === T_JEU_1 && caseIndex === 1) tutAvancer()
    if (tutEtape === T_JEU_2 && caseIndex >= total) tutAvancer()
  }, [caseIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fonctions utilitaires ─────────────────────────────────────────────────

  function choisirSansDuplique(texte: string, type: string): { texte: string; remplace: boolean } {
    const key = normaliserCle(texte)
    const totalUsed = new Set([...textesUtilises.current, ...textesSession.current])
    let final: string
    // remplace = true quand on a dû puiser dans la réserve (FALLBACKS) car le texte
    // était vide (échec API) ou déjà employé dans la partie.
    let remplace: boolean
    if (texte && !totalUsed.has(key)) {
      final = texte
      remplace = false
    } else {
      final = pickUnused(type, totalUsed)
      remplace = true
    }
    const finalKey = normaliserCle(final)
    textesUtilises.current.add(finalKey)
    textesSession.current.add(finalKey)
    sessionStorage.setItem('textes-session', JSON.stringify([...textesSession.current]))
    return { texte: final, remplace }
  }

  function sauvegarderBrouillon(newCases: Case[], newIndex: number) {
    localStorage.setItem('brouillon-actuel', JSON.stringify({ poemeId, config, cases: newCases, caseIndex: newIndex, voixParSlot }))
  }

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    ambianceStart()
    return () => ambianceStop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!muted) ambianceStart()
  }, [muted, ambianceStart])

  // Écran de passage avant chaque tour humain + reset de l'animation de soumission
  useEffect(() => {
    setSealing(false)
    if (participantActuel?.type === 'humain') {
      setAttendPassage(true)
    }
  }, [caseIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tour IA
  useEffect(() => {
    if (!defActuelle || participantActuel?.type !== 'ia') return
    if (casesTraitees.current.has(caseIndex)) return
    casesTraitees.current.add(caseIndex)

    setIaChargement(true)
    setIaTexteRevele(null)
    jouer('ia')

    const def = defActuelle
    const idx = caseIndex
    const seqPos = caseIndex % seq.length
    const voiceId = voixParSlot[seqPos]
    const slotNum = iaSlotNums[seqPos]

    const finaliser = (brut: string, sourceServeur: 'ia' | 'fallback') => {
      const { texte, remplace } = choisirSansDuplique(brut, def.type)
      // Fallback si le serveur a renvoyé un mot de réserve OU si on a remplacé un doublon localement
      const estFallback = sourceServeur === 'fallback' || remplace
      memoriserMotsIa(texte)
      setIaChargement(false)
      setIaTexteRevele(texte)
      setIaFallbackRevele(estFallback)
      revealTimerRef.current = setTimeout(() => {
        avancer(idx, def, texte, slotNum, estFallback)
        setIaTexteRevele(null)
        setIaFallbackRevele(false)
      }, 2600)
    }

    const contexteIA = getContexteVisible(cases, config.visibilite) ?? undefined
    // Anti-répétition : mots déjà employés dans la partie (>2 lettres) + mots produits
    // par l'IA lors des parties récentes, pour que chaque partie diverge vraiment et que
    // la même imagerie ne revienne pas trois fois de suite. Vocabulaire libre par ailleurs.
    // Conjonctions courtes (≤2 lettres) : échappent au filtre habituel > 2 chars.
    // On extrait explicitement celles utilisées en tête de vers pour les bannir.
    const CONJ_COURTES = new Set(['or', 'si', 'en', 'et', 'ni'])
    const conjCourtesUsees = cases
      .filter(c => c.texte)
      .flatMap(c => {
        const m = c.texte.trim().toLowerCase().match(/^[a-zà-ÿ]+/)
        return m && CONJ_COURTES.has(m[0]) ? [m[0]] : []
      })
    const motsPartie = [
      ...cases
        .filter(c => c.texte)
        .flatMap(c => c.texte.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? [])
        .filter(m => m.length > 2),
      ...conjCourtesUsees,
    ]
    // Les mots les plus récents d'abord (le serveur tronque la liste) : on garantit
    // ainsi que l'imagerie de la partie précédente est bien interdite.
    const eviterIA = [...motsPartie, ...[...motsIaRecents.current].reverse()]
    const consigneIA = def.type === 'libre' ? ouvertureAleatoire(def.consigne) : def.consigne
    demanderFragmentIA({ consigne: consigneIA, type: def.type, voiceId, contexte: contexteIA, eviter: eviterIA })
      .then(({ texte, source }) => finaliser(texte.trim(), source))
      .catch(()  => finaliser('', 'fallback'))
  }, [caseIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Nettoyage du timer de révélation IA au démontage
  useEffect(() => () => { if (revealTimerRef.current) clearTimeout(revealTimerRef.current) }, [])

  // Timer hypnotique
  useEffect(() => {
    if (!modeHypnotique || participantActuel?.type !== 'humain' || !defActuelle || attendPassage) {
      setTempsRestant(null)
      return
    }
    setTempsRestant(DUREE_HYPNOTIQUE)
    timerRef.current = setInterval(() => {
      setTempsRestant(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [caseIndex, attendPassage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-soumission à expiration
  useEffect(() => {
    if (tempsRestant !== 0) return
    if (timerRef.current) clearInterval(timerRef.current)
    soumettreHypnotique()
  }, [tempsRestant]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sauvegarde et navigation en fin de partie
  useEffect(() => {
    if (cases.length < total) return
    if (sauvegardeFaite.current) return
    sauvegardeFaite.current = true

    const poeme: Poeme = {
      id: poemeId,
      titre: null,
      structureId: config.structureId,
      mode: config.mode,
      visibilite: config.visibilite,
      cases,
      dateCreation: Date.now(),
      dateModification: Date.now(),
    }

    sauvegarderPoeme(poeme)
      .catch(console.error)
      .finally(() => {
        localStorage.removeItem('brouillon-actuel')
        navigate('/fin', { state: { poeme } })
      })
  }, [cases.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fonctions de jeu ─────────────────────────────────────────────────────

  function avancer(idx: number, def: DefinitionCase, texte: string, slotNum?: number, isFallback?: boolean) {
    const c: Case = {
      numero: idx + 1,
      fonction: def.fonction,
      consigne: def.consigne,
      auteur: 'ia',
      voixSlot: slotNum,
      texte,
      ts: Date.now(),
      fallback: isFallback || undefined,
    }
    setCases(prev => {
      const next = [...prev, c]
      sauvegarderBrouillon(next, idx + 1)
      return next
    })
    setCaseIndex(idx + 1)
    setIaChargement(false)
  }

  function pousserCase(texte: string, joueurNum?: number) {
    if (!defActuelle || caseIndex === caseIndexSoumis.current) return
    caseIndexSoumis.current = caseIndex
    textesUtilises.current.add(normaliserCle(texte))
    const c: Case = {
      numero: caseIndex + 1,
      fonction: defActuelle.fonction,
      consigne: defActuelle.consigne,
      auteur: 'humain',
      joueurNumero: joueurNum,
      texte,
      ts: Date.now(),
    }
    const nextIndex = caseIndex + 1
    setCases(prev => {
      const next = [...prev, c]
      sauvegarderBrouillon(next, nextIndex)
      return next
    })
    setInputValue('')
    setErreur(null)
    setCaseIndex(nextIndex)
  }

  function soumettre() {
    if (!defActuelle || !inputValue.trim()) return
    const v = validerCase(inputValue, defActuelle.type, niveauValidation)
    if (!v.valide) { setErreur(v.message ?? 'Texte invalide.'); return }
    ambianceStart()
    jouer('soumettre')
    setSealing(true)
  }

  function vraimentSoumettre() {
    const joueurNum = participantActuel?.type === 'humain' ? participantActuel.num : undefined
    pousserCase(inputValue.trim(), joueurNum)
  }

  function soumettreHypnotique() {
    if (!defActuelle) return
    const texte = inputValue.trim() || fallback.current(defActuelle.type)
    const joueurNum = participantActuel?.type === 'humain' ? participantActuel.num : undefined
    pousserCase(texte, joueurNum)
  }

  function abandonner() {
    jouer('abandon')
    localStorage.removeItem('brouillon-actuel')
    ambianceStop()
    navigate('/')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); soumettre() }
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  // Écran de fin / transition
  if (!defActuelle || cases.length >= total) {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh">
        <motion.span
          className="text-or text-3xl"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          ✦
        </motion.span>
        <p className="text-encre mt-4" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 19 }}>
          Le poème se referme…
        </p>
      </PageTransition>
    )
  }

  // Écran de passage avant chaque tour humain
  if (attendPassage && participantActuel?.type === 'humain') {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        {multiJoueurs && (
          <motion.p
            className="nav-discrete mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Passe le téléphone à
          </motion.p>
        )}
        <motion.p
          className="text-encre"
          style={{
            fontFamily: "'Bodoni Moda', serif", fontWeight: 900,
            fontSize: 'clamp(4rem, 18vw, 7rem)',
            lineHeight: 0.95, letterSpacing: '-0.02em',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: multiJoueurs ? 0.4 : 0.2 }}
        >
          Joueur {participantActuel.num}.
        </motion.p>
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileTap={{ scale: 0.97 }}
        >
          <button
            onClick={() => setAttendPassage(false)}
            className="btn-primaire"
          >
            {multiJoueurs ? "C'est à moi →" : "C'est parti →"}
          </button>
        </motion.div>
      </PageTransition>
    )
  }

  const hintQuestion =
    defActuelle?.type === 'proposition' &&
    inputValue.length > 0 &&
    !inputValue.includes('?')

  const sc = seance?.colorSchema
  const accent = sc?.hex ?? '#b22c20'
  const encre = sc?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = sc?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }
  const acteLabel = `ACTE ${toRomain(caseIndex + 1)} / ${toRomain(total)}`
  const subtitle = TYPE_SUBTITLE[defActuelle?.type ?? ''] ?? ''
  const example  = TYPE_EXAMPLE[defActuelle?.type ?? ''] ?? null

  // ── IA screen ──────────────────────────────────────────────────────────────
  if (participantActuel?.type === 'ia' && (iaChargement || iaTexteRevele !== null)) {
    return (
      <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
        <Decor variant="jeu-ia" />
        <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex justify-between items-baseline">
            <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: encre, opacity: 0.7 }}>{acteLabel}</span>
            <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
          </div>
          <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

          <div className="flex flex-col items-center flex-1 text-center justify-center">
            {/* Espaceur souple — centre "La voix parle…" verticalement,
                équilibré par le <div flex:1 /> en bas */}
            <div style={{ flex: 1 }} />

            <motion.div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(2.2rem, 9vw, 3rem)',
                color: encre,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              La voix parle<motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              >…</motion.span>
            </motion.div>

            {/* Contenu variable rendu en flux nul (hauteur 0) : il flotte sous le
                titre sans jamais le décaler entre l'état « chargement » et « révélé ». */}
            <div style={{ position: 'relative', height: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {iaChargement ? (
                  <motion.div
                    className="flex gap-2 mt-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.4 }}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <>
                    <motion.div
                      style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, marginTop: 16, lineHeight: 1.7, textAlign: 'center' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      elle dépose son fragment<br />à l'abri des regards
                    </motion.div>

                    <motion.div
                      style={{ fontSize: 17, color: accent, marginTop: 22 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      ✦
                    </motion.div>

                    {iaFallbackRevele && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        style={{
                          ...mono,
                          fontSize: 11,
                          color: accent,
                          opacity: 0.55,
                          marginTop: 18,
                          letterSpacing: '0.22em',
                          border: `1px solid ${accent}55`,
                          padding: '2px 8px',
                          borderRadius: 3,
                        }}
                      >
                        RÉSERVE
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }} />
          </div>

          {/* Footer */}
          <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, textAlign: 'center', paddingBottom: 8 }}>
            {iaChargement ? '— NE PAS LA DÉRANGER —' : '— SES MOTS RESTENT SCELLÉS —'}
          </div>
        </div>
        <TutorielCoach
          visible={tutActif && tutEtape === T_JEU_IA}
          etape={T_JEU_IA} total={TUTORIEL_TOTAL}
          titre="La voix mystérieuse écrit…"
          corps="Un fragment secret est ajouté à l'aveugle. Tu ne vois pas ce qu'il contient — c'est la règle du cadavre exquis. Tape Compris quand tu es prêt à écrire la suite."
          onCompris={tutAvancer}
          onPasser={tutTerminer}
          accent={accent} encre={encre} bg={bg}
        />
      </PageTransition>
    )
  }

  // ── Human turn screen ──────────────────────────────────────────────────────
  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="jeu" />
      <div style={{ position: 'relative', zIndex: 10, paddingBottom: tutActif ? 230 : 0 }} className="flex flex-col flex-1">

        {/* Header */}
        <div className="flex justify-between items-baseline">
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: encre, opacity: 0.7 }}>{acteLabel}</span>
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
            aria-pressed={!muted}
            style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, opacity: muted ? 0.35 : 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {colorLabel}
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={caseIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col flex-1"
          >
            {/* Previous voice */}
            {contexteVisible && (
              <motion.div
                style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 12, marginTop: 20, marginBottom: 18 }}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>
                  — VOIX PRÉCÉDENTE —
                </div>
                <p style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 17,
                  color: encre, lineHeight: 1.5,
                }}>
                  « {contexteVisible} »
                </p>
              </motion.div>
            )}

            {/* Consigne section */}
            <motion.div
              style={{ marginTop: contexteVisible ? 8 : 24, marginBottom: 16 }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div
                className="font-fraunces font-black"
                style={{
                  fontSize: 'clamp(1.6rem, 7vw, 2.4rem)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  color: encre,
                  marginBottom: (subtitle || example) ? 6 : 14,
                }}
              >
                {renderConsigneTitre(defActuelle?.consigne ?? '', accent)}
              </div>
              {subtitle && (
                <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.42, letterSpacing: '0.18em', marginBottom: example ? 4 : 14 }}>
                  {subtitle}
                </div>
              )}
              {example && (
                <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 17, color: encre, opacity: 0.9, marginBottom: 14, lineHeight: 1.55 }}>
                  {example}
                </div>
              )}
            </motion.div>

            {/* Timer */}
            {modeHypnotique && tempsRestant !== null && (
              <motion.div
                className="flex items-center justify-end mb-2 gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.span
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: accent }}
                  animate={tempsRestant <= 5 ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.5, repeat: tempsRestant <= 5 ? Infinity : 0 }}
                >
                  {tempsRestant}
                </motion.span>
                <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.75 }}>s</span>
              </motion.div>
            )}

            {/* Textarea section */}
            <motion.div
              animate={sealing ? { scaleY: 0, opacity: 0.4, filter: 'brightness(0.7)' } : { scaleY: 1, opacity: 1, filter: 'brightness(1)' }}
              style={{ transformOrigin: 'top center' }}
              transition={{ duration: 0.4, ease: [0.7, 0, 0.84, 0] }}
              onAnimationComplete={() => { if (sealing) vraimentSoumettre() }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {/* Encre qui transperce le papier — reflet renversé du texte en cours */}
                <div
                  aria-hidden
                  style={{
                    fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                    fontSize: '1.35rem', lineHeight: 1.55, padding: '0 16px',
                    transform: 'scaleY(-1)', filter: 'blur(2.5px)',
                    opacity: inputValue ? 0.10 : 0, color: encre,
                    maxHeight: 48, overflow: 'hidden', pointerEvents: 'none',
                    transition: 'opacity 0.6s', userSelect: 'none',
                  }}
                >{inputValue}</div>
                <textarea
                  className="champ-carnet w-full min-h-[96px] resize-none"
                  style={{ borderLeftColor: accent }}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setErreur(null) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Écris ici — toi seul le verras…"
                  aria-label="Ta contribution"
                  autoFocus
                  rows={3}
                />
                {hintQuestion && (
                  <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.9, marginTop: 4 }}>
                    LES QUESTIONS SE TERMINENT PAR UN ?
                  </p>
                )}
                {erreur && (
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: accent, marginTop: 6 }}>
                    {erreur}
                  </p>
                )}
              </motion.div>
            </motion.div>

            <div style={{ flex: 1 }} />

            {/* CTA */}
            <motion.div
              className="mt-4 mb-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <button
                onClick={soumettre}
                disabled={!inputValue.trim()}
                aria-label="Sceller cette voix et passer à la suivante"
                className="w-full flex flex-col items-center justify-center"
                style={{
                  background: !inputValue.trim() ? `${encre}30` : accent,
                  color: btnText,
                  ...mono, fontSize: 17,
                  textTransform: 'uppercase',
                  padding: '1.1em 1em',
                  border: 'none',
                  cursor: !inputValue.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  gap: 2,
                  borderRadius: 3,
                }}
              >
                <span>Sceller cette voix</span>
                <span aria-hidden style={{ fontSize: 17, opacity: 0.85 }}>→</span>
              </button>
            </motion.div>

            {/* Footer + abandon */}
            <div style={{ textAlign: 'center', paddingBottom: 4 }}>
              {!confirmAbandon ? (
                <button
                  onClick={() => setConfirmAbandon(true)}
                  style={{ ...mono, fontSize: 13, color: encre, opacity: 0.55, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  abandonner la partie
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={abandonner}
                    style={{ flex: 1, padding: '0.75em', background: '#7B0000', color: '#e8d4b8', ...mono, fontSize: 17, border: 'none', cursor: 'pointer', borderRadius: 3 }}
                  >
                    Confirmer l'abandon
                  </button>
                  <button
                    onClick={() => setConfirmAbandon(false)}
                    style={{ padding: '0.75em 1em', background: 'transparent', color: encre, ...mono, fontSize: 17, border: `0.5px solid ${encre}30`, cursor: 'pointer', borderRadius: 3 }}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <TutorielCoach
        visible={tutActif && tutEtape === T_JEU_1}
        etape={T_JEU_1} total={TUTORIEL_TOTAL}
        titre="Ton premier fragment"
        corps="Le cadavre exquis se construit à l'aveugle : chaque joueur écrit sa partie sans voir les autres. Écris ce qui te passe par la tête — l'inattendu est bienvenu."
        cible="SCELLER CETTE VOIX"
        onPasser={tutTerminer}
        accent={accent} encre={encre} bg={bg}
      />
      {/* Coach IA affiché sur l'écran humain si le jeu a avancé avant le tap Compris */}
      <TutorielCoach
        visible={tutActif && tutEtape === T_JEU_IA && participantActuel?.type === 'humain'}
        etape={T_JEU_IA} total={TUTORIEL_TOTAL}
        titre="La voix a écrit en secret."
        corps="Son fragment est scellé. Tu vas maintenant écrire le dernier morceau du cadavre, à l'aveugle comme elle."
        onCompris={tutAvancer}
        onPasser={tutTerminer}
        accent={accent} encre={encre} bg={bg}
      />
      <TutorielCoach
        visible={tutActif && tutEtape === T_JEU_2}
        etape={T_JEU_2} total={TUTORIEL_TOTAL}
        titre="Ton deuxième fragment"
        corps="Continue librement — tu ne sais pas ce que la voix mystérieuse a écrit. C'est cet assemblage aveugle qui produira quelque chose d'imprévisible."
        cible="SCELLER CE DERNIER FRAGMENT"
        onPasser={tutTerminer}
        accent={accent} encre={encre} bg={bg}
      />
    </PageTransition>
  )
}
