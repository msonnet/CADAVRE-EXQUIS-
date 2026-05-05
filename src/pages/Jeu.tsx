import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import ConsigneCase from '../components/ConsigneCase'
import { getStructure, nombreCasesEffectif } from '../structures'
import type { DefinitionCase } from '../structures'
import { validerCase } from '../utils/validation'
import { demanderFragmentIA } from '../api/claude'
import { sauvegarderPoeme } from '../db'
import type { ConfigPartie, Case, Poeme } from '../types'

const CONFIG_DEFAUT: ConfigPartie = {
  structureId: 'phrase-etoffee',
  visibilite: 'aveugle',
  premierJoueur: 'ia',
  mode: 'standard',
}

function computeAuteurs(
  total: number,
  premierJoueur: 'humain' | 'ia'
): Array<'humain' | 'ia'> {
  return Array.from({ length: total }, (_, i) => {
    const estPremier = i % 2 === 0
    return estPremier
      ? premierJoueur
      : premierJoueur === 'humain' ? 'ia' : 'humain'
  })
}

const FALLBACKS_CLIENT: Record<string, string[]> = {
  nom: ["l'ombre", 'le silence', 'la nuit', 'la cendre', 'le vide', 'la pierre'],
  verbe: ['glisse', 'brûle', 'tombe', 'tremble', 'demeure', 'se tait'],
  adjectif: ['immobile', 'pâle', 'profond', 'étrange', 'brisé', 'nocturne'],
  adverbe: ['doucement', 'lentement', 'en silence', 'sans bruit', 'à jamais'],
  'groupe-nominal': ["l'ombre du soir", 'la nuit froide', 'le silence qui reste', 'un souffle perdu'],
  'groupe-verbal': ['traverse la nuit', 'brûle en silence', "glisse dans l'ombre"],
  proposition: ['Que reste-t-il encore', 'Où vont les ombres', 'Qui a éteint la lumière'],
  libre: ['quelque chose demeure', 'rien ne se perd vraiment', 'la nuit garde tout'],
}

function fallbackType(type: string): string {
  const arr = FALLBACKS_CLIENT[type] ?? ['quelque chose']
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function Jeu() {
  const navigate = useNavigate()

  const [config] = useState<ConfigPartie>(() => {
    const raw = sessionStorage.getItem('config-partie')
    return raw ? (JSON.parse(raw) as ConfigPartie) : CONFIG_DEFAUT
  })

  const [structure] = useState(() => getStructure(config.structureId))
  const [total] = useState(() => nombreCasesEffectif(structure))
  const [caseDefs] = useState<DefinitionCase[]>(() => structure.cases.slice(0, total))
  const [auteurs] = useState<Array<'humain' | 'ia'>>(() =>
    computeAuteurs(total, config.premierJoueur)
  )
  const [poemeId] = useState(() => crypto.randomUUID())

  const [cases, setCases] = useState<Case[]>([])
  const [caseIndex, setCaseIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [iaChargement, setIaChargement] = useState(false)

  const casesTraitees = useRef(new Set<number>())
  const sauvegardeFaite = useRef(false)

  const defActuelle: DefinitionCase | undefined = caseDefs[caseIndex]
  const auteurActuel: 'humain' | 'ia' | undefined = auteurs[caseIndex]

  // Tour IA
  useEffect(() => {
    if (!defActuelle || auteurActuel !== 'ia') return
    if (casesTraitees.current.has(caseIndex)) return
    casesTraitees.current.add(caseIndex)

    setIaChargement(true)

    const def = defActuelle
    const idx = caseIndex

    demanderFragmentIA({ consigne: def.consigne, type: def.type })
      .then(texte => avancer(idx, def, texte.trim() || fallbackType(def.type)))
      .catch(() => avancer(idx, def, fallbackType(def.type)))
  }, [caseIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  function avancer(idx: number, def: DefinitionCase, texte: string) {
    const c: Case = {
      numero: idx + 1,
      fonction: def.fonction,
      consigne: def.consigne,
      auteur: 'ia',
      texte,
      ts: Date.now(),
    }
    setCases(prev => [...prev, c])
    setCaseIndex(idx + 1)
    setIaChargement(false)
  }

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
      .finally(() => navigate('/fin', { state: { poeme } }))
  }, [cases.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function soumettre() {
    if (!defActuelle || !inputValue.trim()) return
    const v = validerCase(inputValue, defActuelle.type, 'souple')
    if (!v.valide) {
      setErreur(v.message ?? 'Texte invalide.')
      return
    }
    const c: Case = {
      numero: caseIndex + 1,
      fonction: defActuelle.fonction,
      consigne: defActuelle.consigne,
      auteur: 'humain',
      texte: inputValue.trim(),
      ts: Date.now(),
    }
    setCases(prev => [...prev, c])
    setInputValue('')
    setErreur(null)
    setCaseIndex(prev => prev + 1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      soumettre()
    }
  }

  // Écran de transition (fin de partie ou sauvegarde)
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

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button
        onClick={() => navigate('/')}
        className="nav-discrete mb-8 hover:text-encre transition-colors"
      >
        ← Abandonner
      </button>

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
            auteur={auteurActuel}
          />
        </motion.div>
      </AnimatePresence>

      {auteurActuel === 'humain' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <textarea
            className="champ-carnet w-full min-h-[96px] resize-none mt-2"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setErreur(null) }}
            onKeyDown={handleKeyDown}
            placeholder="…"
            autoFocus
            rows={3}
          />
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

      {auteurActuel === 'ia' && iaChargement && (
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
          <p className="nav-discrete">Une voix écrit…</p>
        </motion.div>
      )}
    </PageTransition>
  )
}
