import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'

interface BlocProps {
  titre: string
  children: React.ReactNode
  delai?: number
}

function Bloc({ titre, children, delai = 0 }: BlocProps) {
  return (
    <motion.section
      className="mb-8"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delai, duration: 0.5 }}
    >
      <h3 className="consigne-grammaticale mb-3">{titre}</h3>
      {children}
    </motion.section>
  )
}

interface LigneProps {
  label: string
  description: string
  exemple?: string
}

function Ligne({ label, description, exemple }: LigneProps) {
  return (
    <div className="py-3 border-b border-gris-clair/20 last:border-0">
      <div className="flex items-baseline gap-3">
        <span className="font-cormorant italic text-encre text-base leading-snug min-w-[9rem]">
          {label}
        </span>
        <span className="nav-discrete leading-relaxed flex-1">{description}</span>
      </div>
      {exemple && (
        <p className="font-cormorant italic text-gris text-sm mt-1 pl-[9rem] opacity-60">
          ex. {exemple}
        </p>
      )}
    </div>
  )
}

export default function Aide() {
  const navigate = useNavigate()

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button
        onClick={() => navigate(-1)}
        className="nav-discrete mb-8 hover:text-encre transition-colors"
      >
        ← Retour
      </button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-garamond italic text-2xl text-encre mb-1">Comment jouer</h2>
        <p className="sous-titre mb-6">Règles et modes de jeu</p>
      </motion.div>

      <SeparateurOr />

      <motion.div
        className="my-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7 }}
      >
        <p className="vers-jeu leading-relaxed text-center">
          Le cadavre exquis est un jeu surréaliste inventé à Paris dans les années 1920.
          Chaque joueur écrit un fragment sans voir ce que l'autre a écrit.
          Le poème révélé à la fin est toujours une surprise.
        </p>
        <p className="nav-discrete text-center mt-3">
          Ici, tu joues avec une des 40 voix anonymes. Tu ne sauras jamais laquelle.
        </p>
      </motion.div>

      <SeparateurOr />

      <div className="mt-8">
        <Bloc titre="Structures" delai={0.3}>
          <Ligne
            label="Phrase simple"
            description="3 cases — sujet, verbe, complément. La forme la plus courte."
            exemple="L'ombre / glisse / dans la nuit froide"
          />
          <Ligne
            label="Phrase étoffée"
            description="7 cases — la structure canonique de Breton, avec déterminants et qualificatifs."
            exemple="Le / beau / soleil / caresse / lentement / la / mer endormie"
          />
          <Ligne
            label="Conditionnelle"
            description="8 cases — structure en « Si… alors… ». Deux propositions enchaînées."
            exemple="Si le silence tombe / alors l'ombre répond"
          />
          <Ligne
            label="Comparative"
            description="7 cases — structure en « … comme … ». Une image par analogie."
            exemple="La nuit est douce / comme / un souffle oublié"
          />
          <Ligne
            label="Énumérative"
            description="5 à 8 cases libres — accumulation de fragments. Le nombre de cases varie à chaque partie."
          />
          <Ligne
            label="Question / Réponse"
            description="Paires alternées — une voix pose, l'autre répond, sans jamais savoir quoi."
            exemple="Où vont les ombres ? / Elles rejoignent le froid."
          />
          <Ligne
            label="Vers libre"
            description="4 à 12 tours sans contrainte fixe. La structure la plus ouverte."
          />
        </Bloc>

        <SeparateurOr />

        <Bloc titre="Visibilité" delai={0.4}>
          <Ligne
            label="Aveugle"
            description="Aucun contexte — tu écris dans le vide total. La forme la plus surréaliste et la plus pure."
          />
          <Ligne
            label="Dernier mot"
            description="Un seul mot de la case précédente est visible. Un fil ténu, juste assez pour raccrocher quelque chose."
          />
          <Ligne
            label="Dernière case"
            description="La case précédente entière est visible. Le poème sera plus cohérent, mais moins surprenant."
          />
        </Bloc>

        <SeparateurOr />

        <Bloc titre="Mode de jeu" delai={0.5}>
          <Ligne
            label="Standard"
            description="Aucune contrainte de temps. Tu prends le temps qu'il faut pour chaque fragment."
          />
          <Ligne
            label="Sommeil hypnotique"
            description="30 secondes par case. Le décompte s'affiche en haut à droite — il passe à l'ambre puis au rouge. À 0, le fragment en cours est soumis automatiquement. Si le champ est vide, une voix intérieure complète à ta place."
          />
        </Bloc>

        <SeparateurOr />

        <Bloc titre="Premier joueur" delai={0.6}>
          <Ligne
            label="Moi"
            description="Tu ouvres le poème. La première case est à toi."
          />
          <Ligne
            label="Une voix"
            description="Une des 40 voix anonymes écrit le premier fragment. Tu ne sais pas qui a ouvert — tu continues dans l'inconnu."
          />
        </Bloc>
      </div>

      <motion.div
        className="mt-8 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <button onClick={() => navigate('/config')} className="btn-primaire">
          Nouvelle partie
        </button>
      </motion.div>
    </PageTransition>
  )
}
