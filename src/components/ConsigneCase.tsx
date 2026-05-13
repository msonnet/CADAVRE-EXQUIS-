import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DefinitionCase } from '../structures'

interface Props {
  caseNum: number
  total: number
  def: DefinitionCase
  auteur: 'humain' | 'ia'
  joueurNum?: number
  multiJoueurs?: boolean
}

const EXEMPLES: Record<string, string> = {
  'nom':            '« le corbeau », « une étoile », « l\'ombre »',
  'verbe':          '« dévore », « disparaît », « dort »',
  'adjectif':       '« lumineux », « brisé », « profond »',
  'adverbe':        '« doucement », « en silence », « à jamais »',
  'groupe-nominal': '« le vieux manteau », « une lueur blanche »',
  'groupe-verbal':  '« traverse la forêt », « brûle en silence »',
  'proposition':    '« Où va l\'ombre ? », « Qui a éteint le feu ? »',
  'libre':          '« quelque chose demeure », « la nuit garde tout »',
}

export default function ConsigneCase({ caseNum, total, def, auteur, joueurNum, multiJoueurs }: Props) {
  const [aideVisible, setAideVisible] = useState(false)

  const labelTour = auteur === 'ia'
    ? 'En attente…'
    : multiJoueurs && joueurNum
      ? `Joueur ${joueurNum}, c'est à toi :`
      : "C'est à toi. Tu dois écrire :"

  const exemple = EXEMPLES[def.type]

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
        <div>
          <div className="flex items-baseline gap-2">
            <p className="font-cormorant italic text-encre text-xl leading-snug">
              {def.consigne}
            </p>
            {exemple && (
              <button
                onClick={() => setAideVisible(v => !v)}
                className="nav-discrete opacity-40 hover:opacity-80 transition-opacity text-xs leading-none shrink-0"
                aria-label="Voir un exemple"
              >
                ?
              </button>
            )}
          </div>
          <AnimatePresence>
            {aideVisible && exemple && (
              <motion.p
                className="nav-discrete mt-1 opacity-60 italic"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 0.6, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                ex. : {exemple}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
