import { useCallback, useRef } from 'react'

export type SoundName = 'demarrage' | 'soumettre' | 'revelation' | 'ia'

function getCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext {
  if (ref.current) return ref.current
  const ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  ref.current = ctx
  return ctx
}

function note(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
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
  const ctxRef = useRef<AudioContext | null>(null)

  const jouer = useCallback((son: SoundName) => {
    try {
      const ctx = getCtx(ctxRef)
      if (ctx.state === 'suspended') ctx.resume()

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2200
      filter.connect(ctx.destination)

      const t = ctx.currentTime

      switch (son) {
        case 'demarrage': {
          const freqs = [110, 165.4, 220, 261.6, 329.6]
          freqs.forEach((f, i) => note(ctx, filter, f, t + i * 0.22, 2.0, 0.07))
          break
        }
        case 'soumettre': {
          note(ctx, filter, 330, t, 0.55, 0.06)
          note(ctx, filter, 440, t + 0.06, 0.45, 0.04)
          break
        }
        case 'revelation': {
          const chord = [110, 165.4, 220, 261.6, 330]
          chord.forEach((f, i) => note(ctx, filter, f, t + i * 0.12, 4.5, 0.065))
          break
        }
        case 'ia': {
          note(ctx, filter, 220, t, 0.6, 0.04)
          note(ctx, filter, 165.4, t + 0.15, 0.5, 0.025)
          break
        }
      }
    } catch {
      // L'audio est un enrichissement, jamais bloquant
    }
  }, [])

  return { jouer }
}
