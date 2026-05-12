import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { useSound } from '../hooks/useSound'
import type { ConfigPartie, StructureId, Visibilite, PremierJoueur, ModeJeu } from '../types'

const STRUCTURES: { id: StructureId; label: string; description: string }[] = [
  { id: 'phrase-simple', label: 'Phrase simple', description: '3 cases — sujet, verbe, complément' },
  { id: 'phrase-etoffee', label: 'Phrase étoffée', description: '7 cases — la canonique de Breton' },
  { id: 'conditionnelle', label: 'Conditionnelle', description: '8 cases — « si… alors »' },
  { id: 'comparative', label: 'Comparative', description: '7 cases — « … comme … »' },
  { id: 'enumerative', label: 'Énumérative', description: '5 à 8 cases libres' },
  { id: 'question-reponse', label: 'Question / Réponse', description: 'Paires questions et réponses' },
  { id: 'vers-libre', label: 'Vers libre', description: '4 à 12 tours sans contrainte fixe' },
]

const CONFIG_PAR_DEFAUT: ConfigPartie = {
  structureId: 'phrase-etoffee',
  visibilite: 'aveugle',
  premierJoueur: 'ia',
  mode: 'standard',
}

interface OptionProps {
  label: string
  description?: string
  active: boolean
  onClick: () => void
}

function Option({ label, description, active, onClick }: OptionProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded border transition-colors ${
        active
          ? 'border-or/60 bg-or/8 text-encre'
          : 'border-transparent hover:border-or/20 text-gris hover:text-encre'
      }`}
    >
      <span className="font-cormorant italic text-lg">{label}</span>
      {description && (
        <span className="block text-xs mt-0.5 opacity-60">{description}</span>
      )}
    </button>
  )
}

export default function Configuration() {
  const navigate = useNavigate()
  const { jouer } = useSound()
  const [config, setConfig] = useState<ConfigPartie>(CONFIG_PAR_DEFAUT)

  function demarrer() {
    jouer('demarrage')
    sessionStorage.setItem('config-partie', JSON.stringify(config))
    navigate('/jeu')
  }

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="nav-discrete hover:text-encre transition-colors">
          ← Accueil
        </button>
      </div>

      <h2 className="font-garamond italic text-2xl text-encre mb-1">Configurer la partie</h2>
      <p className="sous-titre mb-6">Choisis ta structure et ton mode</p>

      <SeparateurOr />

      <section className="mb-8 pt-6">
        <h3 className="consigne-grammaticale mb-4">Structure</h3>
        <div className="flex flex-col gap-2">
          {STRUCTURES.map(s => (
            <Option
              key={s.id}
              label={s.label}
              description={s.description}
              active={config.structureId === s.id}
              onClick={() => setConfig((c) => ({ ...c, structureId: s.id }))}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="consigne-grammaticale mb-4">Visibilité</h3>
        <div className="flex flex-col gap-2">
          <Option label="Aveugle" description="Aucun contexte — puriste" active={config.visibilite === 'aveugle'} onClick={() => setConfig((c) => ({ ...c, visibilite: 'aveugle' as Visibilite }))} />
          <Option label="Dernier mot" description="Un seul mot de contexte" active={config.visibilite === 'dernier-mot'} onClick={() => setConfig((c) => ({ ...c, visibilite: 'dernier-mot' as Visibilite }))} />
          <Option label="Dernière case" description="La case précédente visible" active={config.visibilite === 'derniere-case'} onClick={() => setConfig((c) => ({ ...c, visibilite: 'derniere-case' as Visibilite }))} />
        </div>
      </section>

      <section className="mb-8">
        <h3 className="consigne-grammaticale mb-4">Premier joueur</h3>
        <div className="flex flex-col gap-2">
          <Option label="Moi" active={config.premierJoueur === 'humain'} onClick={() => setConfig((c) => ({ ...c, premierJoueur: 'humain' as PremierJoueur }))} />
          <Option label="Une voix" description="Une voix inconnue ouvre le poème" active={config.premierJoueur === 'ia'} onClick={() => setConfig((c) => ({ ...c, premierJoueur: 'ia' as PremierJoueur }))} />
        </div>
      </section>

      <section className="mb-10">
        <h3 className="consigne-grammaticale mb-4">Mode</h3>
        <div className="flex flex-col gap-2">
          <Option label="Standard" active={config.mode === 'standard'} onClick={() => setConfig((c) => ({ ...c, mode: 'standard' as ModeJeu }))} />
          <Option label="Sommeil hypnotique" description="Timer 30s — écriture sous contrainte" active={config.mode === 'hypnotique'} onClick={() => setConfig((c) => ({ ...c, mode: 'hypnotique' as ModeJeu }))} />
        </div>
      </section>

      <SeparateurOr />

      <motion.div className="flex justify-center" whileTap={{ scale: 0.97 }}>
        <button onClick={demarrer} className="btn-primaire">Commencer</button>
      </motion.div>
    </PageTransition>
  )
}
