import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

const variantes = {
  initiale: { opacity: 0, y: 8 },
  animee: { opacity: 1, y: 0 },
  sortie: { opacity: 0, y: -8 },
}

export default function PageTransition({ children, className }: Props) {
  return (
    <motion.div
      className={className}
      variants={variantes}
      initial="initiale"
      animate="animee"
      exit="sortie"
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
