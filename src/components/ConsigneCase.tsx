import { motion } from 'framer-motion'
import type { DefinitionCase } from '../structures'

interface Props {
  caseNum: number      // numero de la case (1-based)
  total: number        // nombre total de cases
  def: DefinitionCase
  auteur: 'humain' | 'ia'
}

export default function ConsigneCase({ caseNum, total, def, auteur }: Props) {
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
      <p className="consigne-grammaticale mb-1">
        {auteur === 'humain' ? "C'est a toi. Tu dois ecrire :" : 'En attente…'}
      </p>
      {auteur === 'humain' && (
        <p className="font-cormorant italic text-encre text-xl leading-snug">
          {def.consigne}
        </p>
      )}
    </motion.div>
  )
}
