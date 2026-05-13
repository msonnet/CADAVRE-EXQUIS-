import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import ConsigneCase from '../components/ConsigneCase'
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

// ─── Types internes ──────────────────────────────────────────────────────────

type Participant = { type: 'humain'; num: number } | { type: 'ia' }
type BrouillonActuel = { poemeId: string; config: ConfigPartie; cases: Case[]; caseIndex: number }

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

const MESSAGES_IA = [
  "Une voix s'avance…",
  "Une autre voix prend le relais…",
  "Une troisième présence écrit…",
  "Une nouvelle voix murmure…",
  "Quelqu'un d'autre continue…",
  "Une voix inconnue reprend…",
  "Un inconnu pose sa main…",
  "Une présence prend le mot…",
]

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

  // Solo uniquement : rotation si l'IA doit ouvrir
  if (nb === 1 && premierJoueur === 'ia' && seq[0].type === 'humain') {
    const iaIdx = seq.findIndex(p => p.type === 'ia')
    if (iaIdx > 0) return [...seq.slice(iaIdx), ...seq.slice(0, iaIdx)]
  }

  return seq
}

function lireBrouillon(): BrouillonActuel | null {
  try {
    const raw = localStorage.getItem('brouillon-actuel')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function normaliserCle(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function couleurTimer(t: number): string {
  if (t <= 5) return 'text-red-400'
  if (t <= 10) return 'text-amber-400'
  return 'text-or'
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
  const [participants] = useState<Participant[]>(() => {
    const seq = buildSequence(config.joueursHumains, config.voixIA, config.premierJoueur)
    return Array.from({ length: total }, (_, i) => seq[i % seq.length])
  })
  const [poemeId] = useState(() => b?.poemeId ?? crypto.randomUUID())

  const [cases, setCases]       = useState<Case[]>(() => b?.cases ?? [])
  const [caseIndex, setCaseIndex] = useState(() => b?.caseIndex ?? 0)
  const [inputValue, setInputValue] = useState('')
  const [erreur, setErreur]       = useState<string | null>(null)
  const [iaChargement, setIaChargement] = useState(false)
  const [tempsRestant, setTempsRestant] = useState<number | null>(null)
  const [attendPassage, setAttendPassage] = useState(false)

  const niveauValidation = (localStorage.getItem('validation-niveau') as NiveauValidation) ?? 'souple'

  const casesTraitees  = useRef(new Set<number>(b ? Array.from({ length: b.caseIndex }, (_, i) => i) : []))
  const sauvegardeFaite = useRef(false)
  const fallback        = useRef(makeFallbackPicker())
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const caseIndexSoumis = useRef(-1)
  const textesUtilises  = useRef(new Set<string>())
  const textesSession   = useRef(new Set<string>(JSON.parse(sessionStorage.getItem('textes-session') ?? '[]') as string[]))
  const voixUtilisees   = useRef(new Set<string>(JSON.parse(localStorage.getItem('voix-utilisees') ?? '[]') as string[]))

  const { start: ambianceStart, stop: ambianceStop, toggleMute, muted } = useAmbiance()
  const { jouer } = useSound()

  // ─── Dérivés ───────────────────────────────────────────────────────────────

  const participantActuel: Participant | undefined = participants[caseIndex]
  const defActuelle: DefinitionCase | undefined    = caseDefs[caseIndex]
  const modeHypnotique = config.mode === 'hypnotique'
  const multiJoueurs   = config.joueursHumains > 1
  const contexteVisible = participantActuel?.type === 'humain'
    ? getContexteVisible(cases, config.visibilite)
    : null

  // ─── Fonctions utilitaires ─────────────────────────────────────────────────

  function choisirVoixSansRepetition(): string {
    let unused = (VOICE_IDS as readonly string[]).filter(id => !voixUtilisees.current.has(id))
    if (unused.length === 0) {
      voixUtilisees.current.clear()
      unused = [...VOICE_IDS]
    }
    const choix = unused[Math.floor(Math.random() * unused.length)]
    voixUtilisees.current.add(choix)
    localStorage.setItem('voix-utilisees', JSON.stringify([...voixUtilisees.current]))
    return choix
  }

  function choisirSansDuplique(texte: string, type: string): string {
    const key = normaliserCle(texte)
    const totalUsed = new Set([...textesUtilises.current, ...textesSession.current])
    let final: string
    if (texte && !totalUsed.has(key)) {
      final = texte
    } else {
      final = pickUnused(type, totalUsed)
    }
    const finalKey = normaliserCle(final)
    textesUtilises.current.add(finalKey)
    textesSession.current.add(finalKey)
    sessionStorage.setItem('textes-session', JSON.stringify([...textesSession.current]))
    return final
  }

  function sauvegarderBrouillon(newCases: Case[], newIndex: number) {
    localStorage.setItem('brouillon-actuel', JSON.stringify({ poemeId, config, cases: newCases, caseIndex: newIndex }))
  }

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    ambianceStart()
    return () => ambianceStop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!muted) ambianceStart()
  }, [muted, ambianceStart])

  // Écran de passage en multijoueur
  useEffect(() => {
    if (multiJoueurs && participantActuel?.type === 'humain') {
      setAttendPassage(true)
    }
  }, [caseIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tour IA
  useEffect(() => {
    if (!defActuelle || participantActuel?.type !== 'ia') return
    if (casesTraitees.current.has(caseIndex)) return
    casesTraitees.current.add(caseIndex)

    setIaChargement(true)
    jouer('ia')

    const def = defActuelle
    const idx = caseIndex
    const voiceId = choisirVoixSansRepetition()

    demanderFragmentIA({ consigne: def.consigne, type: def.type, voiceId })
      .then(texte => avancer(idx, def, choisirSansDuplique(texte.trim(), def.type)))
      .catch(()  => avancer(idx, def, choisirSansDuplique('', def.type)))
  }, [caseIndex]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function avancer(idx: number, def: DefinitionCase, texte: string) {
    const c: Case = {
      numero: idx + 1,
      fonction: def.fonction,
      consigne: def.consigne,
      auteur: 'ia',
      texte,
      ts: Date.now(),
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
    const joueurNum = participantActuel?.type === 'humain' ? participantActuel.num : undefined
    pousserCase(inputValue.trim(), joueurNum)
  }

  function soumettreHypnotique() {
    if (!defActuelle) return
    const texte = inputValue.trim() || fallback.current(defActuelle.type)
    const joueurNum = participantActuel?.type === 'humain' ? participantActuel.num : undefined
    pousserCase(texte, joueurNum)
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
        <p className="font-cormorant italic text-encre text-lg mt-4">
          Le poème se referme…
        </p>
      </PageTransition>
    )
  }

  // Écran de passage (multijoueur)
  if (attendPassage && participantActuel?.type === 'humain') {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        <motion.p
          className="nav-discrete mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Passe le téléphone à
        </motion.p>
        <motion.p
          className="font-garamond italic text-5xl text-encre"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Joueur {participantActuel.num}
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
            C'est à moi →
          </button>
        </motion.div>
      </PageTransition>
    )
  }

  const hintQuestion =
    defActuelle?.type === 'proposition' &&
    inputValue.length > 0 &&
    !inputValue.includes('?')

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => { localStorage.removeItem('brouillon-actuel'); navigate('/') }}
          className="nav-discrete hover:text-encre transition-colors"
        >
          ← Abandonner
        </button>
        <button
          onClick={toggleMute}
          title={muted ? 'Activer le son' : 'Couper le son'}
          className={`nav-discrete text-encre transition-opacity ${muted ? 'opacity-40 line-through' : 'opacity-70 hover:opacity-100'}`}
        >
          ♪
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={caseIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <ConsigneCase
            caseNum={caseIndex + 1}
            total={total}
            def={defActuelle}
            auteur={participantActuel?.type ?? 'ia'}
            joueurNum={participantActuel?.type === 'humain' ? participantActuel.num : undefined}
            multiJoueurs={multiJoueurs}
          />
        </motion.div>
      </AnimatePresence>

      {participantActuel?.type === 'humain' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Timer hypnotique */}
          {modeHypnotique && tempsRestant !== null && (
            <motion.div
              className="flex items-center justify-end mb-3 gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.span
                className={`font-cormorant text-3xl tabular-nums transition-colors duration-500 ${couleurTimer(tempsRestant)}`}
                animate={tempsRestant <= 5 ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.5, repeat: tempsRestant <= 5 ? Infinity : 0 }}
              >
                {tempsRestant}
              </motion.span>
              <span className="nav-discrete">s</span>
            </motion.div>
          )}

          {contexteVisible && (
            <motion.div
              className="mb-3 pl-3 border-l-2 border-or/40"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="nav-discrete mb-0.5">
                {config.visibilite === 'dernier-mot' ? 'Dernier mot' : 'Case précédente'}
              </p>
              <p className="font-cormorant italic text-encre text-lg leading-snug">
                …{contexteVisible}
              </p>
            </motion.div>
          )}

          <textarea
            className="champ-carnet w-full min-h-[96px] resize-none mt-2"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setErreur(null) }}
            onKeyDown={handleKeyDown}
            placeholder="…"
            autoFocus
            rows={3}
          />

          {hintQuestion && (
            <p className="text-xs text-gris italic mt-1 opacity-60">
              Les questions se terminent par un ?
            </p>
          )}
          {erreur && (
            <p className="text-sm text-gris italic mt-2">{erreur}</p>
          )}

          <motion.div className="flex justify-end mt-4" whileTap={{ scale: 0.97 }}>
            <button
              onClick={soumettre}
              disabled={!inputValue.trim()}
              className="btn-primaire disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuer →
            </button>
          </motion.div>
        </motion.div>
      )}

      {participantActuel?.type === 'ia' && iaChargement && (
        <motion.div
          className="mt-12 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.span
            className="text-or text-2xl"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            ✦
          </motion.span>
          <p className="nav-discrete">
            {MESSAGES_IA[cases.filter(c => c.auteur === 'ia').length % MESSAGES_IA.length]}
          </p>
        </motion.div>
      )}
    </PageTransition>
  )
}
