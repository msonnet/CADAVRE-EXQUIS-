import { useCallback, useRef } from 'react'
import { getAudioContext, notifyContextRunning } from '../audio/sharedCtx'

export type SoundName = 'demarrage' | 'soumettre' | 'revelation' | 'ia' | 'clic'

function note(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  duration: number,
  peak: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + Math.min(0.04, duration * 0.2))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

export function useSound() {
  const filterRef = useRef<BiquadFilterNode | null>(null)

  const jouer = useCallback((son: SoundName) => {
    try {
      const ctx = getAudioContext()

      // Résoudre la suspension iOS depuis un geste utilisateur
      const play = () => {
        if (!filterRef.current || filterRef.current.context !== ctx) {
          const f = ctx.createBiquadFilter()
          f.type = 'lowpass'
          f.frequency.value = 2400
          f.connect(ctx.destination)
          filterRef.current = f
        }
        const dest = filterRef.current
        const t = ctx.currentTime

        switch (son) {
          case 'demarrage': {
            const freqs = [110, 165.4, 220, 261.6, 329.6]
            freqs.forEach((f, i) => note(ctx, dest, f, t + i * 0.22, 2.0, 0.07))
            break
          }
          case 'soumettre': {
            note(ctx, dest, 330, t, 0.55, 0.06)
            note(ctx, dest, 440, t + 0.06, 0.45, 0.04)
            break
          }
          case 'revelation': {
            const chord = [110, 165.4, 220, 261.6, 330]
            chord.forEach((f, i) => note(ctx, dest, f, t + i * 0.12, 4.5, 0.065))
            break
          }
          case 'ia': {
            note(ctx, dest, 220, t, 0.6, 0.04)
            note(ctx, dest, 165.4, t + 0.15, 0.5, 0.025)
            break
          }
          case 'clic': {
            note(ctx, dest, 660, t, 0.08, 0.035)
            break
          }
        }
      }

      if (ctx.state === 'running') {
        play()
      } else {
        ctx.resume().then(() => {
          notifyContextRunning() // déverrouille useAmbiance
          play()
        })
      }
    } catch {
      // audio non-bloquant
    }
  }, [])

  return { jouer }
}
