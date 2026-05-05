import { useState, useRef, useCallback } from 'react'

const VOLUME = 0.05

export function useAmbiance() {
  const [muted, setMuted] = useState(() => localStorage.getItem('ambiance-muted') === 'true')
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)

  const buildContext = useCallback((): AudioContext => {
    if (ctxRef.current) return ctxRef.current

    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    masterRef.current = master
    ctxRef.current = ctx

    const specs = [
      { freq: 55,   gain: 0.45, lfoRate: 0.04 },
      { freq: 55.4, gain: 0.40, lfoRate: 0.06 },
      { freq: 110.2,gain: 0.25, lfoRate: 0.03 },
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

    return ctx
  }, [])

  const doFadeIn = useCallback(() => {
    const ctx = ctxRef.current
    const master = masterRef.current
    if (!ctx || !master) return
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(master.gain.value, t)
    master.gain.linearRampToValueAtTime(VOLUME, t + 4)
  }, [])

  const start = useCallback(() => {
    if (muted) return
    const ctx = buildContext()

    if (ctx.state === 'running') {
      doFadeIn()
      return
    }

    // iOS Safari blocks AudioContext until a user gesture — wait for first tap
    const unlock = () => {
      ctx.resume().then(() => doFadeIn())
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('mousedown', unlock)
    }
    document.addEventListener('touchstart', unlock, { once: true, passive: true })
    document.addEventListener('mousedown', unlock, { once: true })
  }, [muted, buildContext, doFadeIn])

  const stop = useCallback(() => {
    const ctx = ctxRef.current
    const master = masterRef.current
    if (!ctx || !master) return
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(master.gain.value, t)
    master.gain.linearRampToValueAtTime(0, t + 2)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      localStorage.setItem('ambiance-muted', String(next))
      const ctx = ctxRef.current
      const master = masterRef.current
      if (ctx && master) {
        if (!next && ctx.state === 'suspended') {
          ctx.resume().then(() => {
            const t = ctx.currentTime
            master.gain.cancelScheduledValues(t)
            master.gain.setValueAtTime(master.gain.value, t)
            master.gain.linearRampToValueAtTime(VOLUME, t + 1)
          })
        } else if (ctx && master) {
          const t = ctx.currentTime
          master.gain.cancelScheduledValues(t)
          master.gain.setValueAtTime(master.gain.value, t)
          master.gain.linearRampToValueAtTime(next ? 0 : VOLUME, t + 1)
        }
      }
      return next
    })
  }, [])

  return { start, stop, toggleMute, muted }
}
