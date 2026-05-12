import { useState, useRef, useCallback, useEffect } from 'react'
import { getAudioContext, onContextRunning } from '../audio/sharedCtx'

const VOLUME = 0.08

export function useAmbiance() {
  const [muted, setMuted] = useState(() => localStorage.getItem('ambiance-muted') === 'true')
  const masterRef = useRef<GainNode | null>(null)
  const builtRef = useRef(false)

  const buildOscillators = useCallback(() => {
    if (builtRef.current) return
    builtRef.current = true

    const ctx = getAudioContext()
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    masterRef.current = master

    const specs = [
      { freq: 55,    gain: 0.45, lfoRate: 0.04 },
      { freq: 55.4,  gain: 0.40, lfoRate: 0.06 },
      { freq: 110.2, gain: 0.25, lfoRate: 0.03 },
    ]
    for (const s of specs) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = s.freq
      const oscGain = ctx.createGain()
      oscGain.gain.value = s.gain
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = s.lfoRate
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 1.2
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()
      osc.connect(oscGain)
      oscGain.connect(master)
      osc.start()
    }

    if (!muted) {
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(0, t)
      master.gain.linearRampToValueAtTime(VOLUME, t + 4)
    }
  }, [muted])

  const start = useCallback(() => {
    if (muted) return
    const ctx = getAudioContext()

    if (ctx.state === 'running') {
      buildOscillators()
    } else {
      // S'abonner au déverrouillage via useSound (geste utilisateur)
      onContextRunning(buildOscillators)
      // Fallback: listener direct sur le document
      const unlock = () => {
        ctx.resume().then(buildOscillators)
      }
      document.addEventListener('touchstart', unlock, { once: true, passive: true })
      document.addEventListener('mousedown', unlock, { once: true })
    }
  }, [muted, buildOscillators])

  // Re-démarrer quand l'utilisateur active le son
  useEffect(() => {
    if (!muted) start()
  }, [muted, start])

  const stop = useCallback(() => {
    const master = masterRef.current
    const ctx = getAudioContext()
    if (!master) return
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(master.gain.value, t)
    master.gain.linearRampToValueAtTime(0, t + 2)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      localStorage.setItem('ambiance-muted', String(next))
      const master = masterRef.current
      const ctx = getAudioContext()
      if (master) {
        const t = ctx.currentTime
        master.gain.cancelScheduledValues(t)
        master.gain.setValueAtTime(master.gain.value, t)
        master.gain.linearRampToValueAtTime(next ? 0 : VOLUME, t + 1)
      }
      return next
    })
  }, [])

  return { start, stop, toggleMute, muted }
}
