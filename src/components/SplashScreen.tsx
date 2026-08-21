import { Fragment, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReve } from '../reve'
import { tr } from '../i18n'

const LINE1 = tr('Chaque fragment ignore les autres.', 'Each fragment is blind to the others.')

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// La séquence d'ouverture se referme d'elle-même : le tap ne fait qu'abréger.
// Sans minuteur, un joueur qui attend — le réflexe normal devant un écran de
// démarrage — restait bloqué sur un rideau opaque dont l'invite n'apparaissait
// qu'au bout de 3,2 s, en 12 px à 30 % d'opacité.
const DUREE_VOILE = 4200

export default function SplashScreen() {
  const seance = useReve()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), DUREE_VOILE)
    return () => clearTimeout(t)
  }, [])

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const bg = c?.bg ?? '#0f0805'
  const encre = c?.encre ?? '#e8d4b8'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
          onClick={() => setVisible(false)}
          role="button"
          tabIndex={0}
          aria-label={tr('Entrer dans le jeu', 'Enter the game')}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVisible(false) }
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: bg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {/* Halo radial — lumière qui s'ouvre */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.15, 0.08], scale: [0.4, 2.4, 3.2] }}
            transition={{ delay: 0.1, duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              width: '80vmin', height: '80vmin',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Étoile — éclosion avec rebond */}
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -30 }}
            animate={{ opacity: [0, 1, 0.88], scale: [0, 1.28, 1], rotate: [-30, 8, 0] }}
            transition={{ delay: 0.12, duration: 0.95, ease: [0.22, 1.6, 0.36, 1] }}
            style={{
              fontSize: 'clamp(2.4rem, 9vw, 3.2rem)',
              color: accent,
              marginBottom: 32,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            ✦
          </motion.div>

          {/* Ligne 1 : encre qui s'imprègne lettre par lettre */}
          <div
            style={{
              textAlign: 'center', padding: '0 40px',
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(1.15rem, 4.8vw, 1.6rem)',
              lineHeight: 1.75,
            }}
          >
            <span aria-label={LINE1}>
              {reduced ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                  style={{ color: encre }}
                >
                  {LINE1}
                </motion.span>
              ) : (
                // Les lettres sont groupées par mot, et le mot est insécable.
                // Chaque lettre étant un inline-block autonome, le navigateur
                // ne voyait plus de mots du tout et coupait où il voulait :
                // « Chaque fragment ignore les autr / es. » sur un écran de
                // 320 px. L'espace entre deux mots reste un nœud de texte
                // ordinaire — c'est lui qui rend le retour à la ligne possible.
                (() => {
                  let n = 0
                  const mots = LINE1.split(' ')
                  return mots.map((mot, wi) => (
                    <Fragment key={wi}>
                      {wi > 0 ? ' ' : null}
                      <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                        {[...mot].map(char => {
                          const i = n++
                          return (
                            <motion.span
                              key={i}
                              aria-hidden
                              initial={{ opacity: 0, filter: 'blur(7px)', y: 4 }}
                              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                              transition={{ delay: 0.9 + i * 0.032, duration: 0.45, ease: 'easeOut' }}
                              style={{ display: 'inline-block', color: encre }}
                            >
                              {char}
                            </motion.span>
                          )
                        })}
                      </span>
                    </Fragment>
                  ))
                })()
              )}
            </span>

            {/* Ligne 2 : simple fade — le contraste est le message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.95, duration: 0.75 }}
              style={{
                fontStyle: 'italic',
                color: accent,
                marginTop: 2,
              }}
            >
              {tr('Ensemble, ils rêvent.', 'Together, they dream.')}
            </motion.div>
          </div>

          {/* Invite discrète */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            style={{
              position: 'absolute',
              bottom: 'max(48px, env(safe-area-inset-bottom, 48px))',
              fontFamily: "'Raleway', sans-serif", fontSize: 12,
              letterSpacing: '0.26em', textTransform: 'uppercase',
              color: encre,
            }}
          >
            {tr('Toucher pour entrer', 'Tap to enter')}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
