import { motion } from 'framer-motion'
import type { DefinitionCase } from '../structures'

interface Props {
  caseNum: number
  total: number
  def: DefinitionCase
  auteur: 'humain' | 'ia'
  joueurNum?: number      // numéro du joueur humain (mode multijoueur)
  multiJoueurs?: boolean  // true si plusieurs humains jouent
}

export default function ConsigneCase({ caseNum, total, def, auteur, joueurNum, multiJoueurs }: Props) {
  const labelTour = auteur === 'ia'
    ? 'En attente…'
    : multiJoueurs && joueurNum
      ? `Joueur ${joueurNum}, c'est à toi :`
      : "C'est à toi. Tu dois écrire :"

  return (
    <motion.div
      key={caseNum}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      {/* Indicateur de progression */}
      <div className="flex items-center justify-between mb-3">
        <span className="nav-discrete">
          Case {caseNum} sur {total}
        </span>
        <span className="nav-discrete italic">
          {def.fonction}
        </span>
      </div>

      {/* Barre de progression fine */}
      <div className="w-full h-px bg-gris-clair/30 mb-4">
        <motion.div
          className="h-px bg-or"
          initial={{ width: 0 }}
          animate={{ width: `${(caseNum / total) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Consigne principale */}
      <p className="consigne-grammaticale mb-1">{labelTour}</p>
      {auteur === 'humain' && (
        <p className="font-cormorant italic text-encre text-xl leading-snug">
          {def.consigne}
        </p>
      )}
    </motion.div>
  )
}
