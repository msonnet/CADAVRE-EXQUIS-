import { useCallback, useRef } from 'react'
import { getAudioContext, notifyContextRunning } from '../audio/sharedCtx'

export type SoundName =
  | 'demarrage'
  | 'soumettre'
  | 'revelation'
  | 'ia'
  | 'clic'
  | 'lettrine'
  | 'abandon'
  | 'fin'
  | 'glisser'

function note(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType = 'sine',
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
  const filterRef = useRef<BiquadFilterNode | null>(null)

  const jouer = useCallback((son: SoundName) => {
    try {
      const ctx = getAudioContext()

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
            // Arpège ascendant en la mineur — la séance commence
            const freqs = [110, 165.4, 220, 261.6, 329.6]
            freqs.forEach((f, i) => note(ctx, dest, f, t + i * 0.22, 2.0, 0.07))
            break
          }
          case 'soumettre': {
            // Deux notes — le fragment se scelle
            note(ctx, dest, 330, t, 0.55, 0.06)
            note(ctx, dest, 440, t + 0.06, 0.45, 0.04)
            break
          }
          case 'revelation': {
            // Accord balayé — le rideau se lève
            const chord = [110, 165.4, 220, 261.6, 330]
            chord.forEach((f, i) => note(ctx, dest, f, t + i * 0.12, 4.5, 0.065))
            break
          }
          case 'ia': {
            // Deux notes descendantes — la voix de l'ailleurs
            note(ctx, dest, 220, t, 0.6, 0.04)
            note(ctx, dest, 165.4, t + 0.15, 0.5, 0.025)
            break
          }
          case 'clic': {
            // Goutte d'encre — click de navigation
            note(ctx, dest, 660, t, 0.08, 0.035)
            break
          }
          case 'lettrine': {
            // Impact grave — la grande lettre tombe sur la page
            note(ctx, dest, 110, t, 1.0, 0.09)
            note(ctx, dest, 165.4, t + 0.06, 0.8, 0.045)
            break
          }
          case 'abandon': {
            // Résolution descendante — on quitte la séance
            note(ctx, dest, 261.6, t, 0.5, 0.04)
            note(ctx, dest, 220, t + 0.10, 0.4, 0.03)
            note(ctx, dest, 165.4, t + 0.22, 0.6, 0.025)
            break
          }
          case 'fin': {
            // Cadence finale — le cadavre est complet
            note(ctx, dest, 165.4, t, 1.2, 0.05)
            note(ctx, dest, 220, t + 0.14, 1.0, 0.055)
            note(ctx, dest, 261.6, t + 0.30, 1.8, 0.065)
            note(ctx, dest, 329.6, t + 0.50, 2.5, 0.045)
            break
          }
          case 'glisser': {
            // Glissement de page — navigation douce
            note(ctx, dest, 440, t, 0.12, 0.025)
            note(ctx, dest, 392, t + 0.05, 0.10, 0.018)
            break
          }
        }
      }

      if (ctx.state === 'running') {
        play()
      } else {
        ctx.resume().then(() => {
          notifyContextRunning()
          play()
        }).catch(() => { /* session audio indisponible (iOS) — le son est non-bloquant */ })
      }
    } catch {
      // audio non-bloquant
    }
  }, [])

  return { jouer }
}
