import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReve } from '../reve'

const SPLASH_KEY = 'cadavre-splash-v1'

export default function SplashScreen() {
  const seance = useReve()
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem(SPLASH_KEY) !== '1' } catch { return true }
  })

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const bg = c?.bg ?? '#0f0805'
  const encre = c?.encre ?? '#e8d4b8'

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(dismiss, 3800)
    return () => clearTimeout(timer)
  }, [visible])

  function dismiss() {
    try { localStorage.setItem(SPLASH_KEY, '1') } catch {}
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: 'easeInOut' }}
          onClick={dismiss}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: bg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.85 }}
            style={{ textAlign: 'center', padding: '0 32px' }}
          >
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(1.25rem, 5vw, 1.75rem)',
              color: encre,
              lineHeight: 1.7,
              marginBottom: 8,
            }}>
              Chaque fragment ignore les autres.
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.8 }}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(1.25rem, 5vw, 1.75rem)',
                color: accent,
                lineHeight: 1.7,
              }}
            >
              Ensemble, ils rêvent.
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.7 }}
            style={{
              position: 'absolute', bottom: 48,
              fontFamily: "'Inter', sans-serif", fontSize: 8,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: encre, opacity: 0.28,
            }}
          >
            Toucher pour entrer
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
