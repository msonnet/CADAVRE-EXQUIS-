import { useState, useRef, useCallback, useEffect } from 'react'
import { getAudioContext, onContextRunning } from '../audio/sharedCtx'

const VOLUME = 0.10

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

    // Pseudo-reverb : delay avec feedback doux
    const delay = ctx.createDelay(2.0)
    delay.delayTime.value = 0.42
    const feedback = ctx.createGain()
    feedback.gain.value = 0.28
    const wetGain = ctx.createGain()
    wetGain.gain.value = 0.32
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wetGain)
    wetGain.connect(master)

    // Pentatonique A : A3=220, E4=330, A4=440, B3=247 — aérien, doux
    const specs = [
      { freq: 220.0, gain: 0.32, lfoRate: 0.07, lfoDepth: 1.2 },
      { freq: 329.6, gain: 0.20, lfoRate: 0.05, lfoDepth: 0.8 },
      { freq: 440.0, gain: 0.11, lfoRate: 0.03, lfoDepth: 0.4 },
      { freq: 246.9, gain: 0.09, lfoRate: 0.06, lfoDepth: 0.6 },
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
      lfoGain.gain.value = s.lfoDepth
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()
      osc.connect(oscGain)
      oscGain.connect(master)
      oscGain.connect(delay)
      osc.start()
    }

    if (!muted) {
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(0, t)
      master.gain.linearRampToValueAtTime(VOLUME, t + 5)
    }
  }, [muted])

  const start = useCallback(() => {
    if (muted) return
    const ctx = getAudioContext()

    if (ctx.state === 'running') {
      buildOscillators()
    } else {
      onContextRunning(buildOscillators)
      const unlock = () => {
        ctx.resume().then(buildOscillators)
      }
      document.addEventListener('touchstart', unlock, { once: true, passive: true })
      document.addEventListener('mousedown', unlock, { once: true })
    }
  }, [muted, buildOscillators])

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
