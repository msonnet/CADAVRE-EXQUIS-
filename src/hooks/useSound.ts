import { useCallback, useRef } from 'react'
import { getAudioContext, notifyContextRunning } from '../audio/sharedCtx'

export type SoundName = 'demarrage' | 'soumettre' | 'revelation' | 'ia' | 'clic'

// Impulsion synthétique — reverbe de salon sans fichier audio
function makeIR(ctx: AudioContext, dur = 1.4, decay = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

interface SoundInfra {
  filter: BiquadFilterNode   // lowpass 3200 Hz — sortie master
  convolver: ConvolverNode   // réverbe de salon
  wetGain: GainNode          // niveau wet 0.22
}

function buildInfra(ctx: AudioContext): SoundInfra {
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'; filter.frequency.value = 3200
  filter.connect(ctx.destination)

  const convolver = ctx.createConvolver()
  convolver.buffer = makeIR(ctx)
  const wetGain = ctx.createGain(); wetGain.gain.value = 0.22
  convolver.connect(wetGain); wetGain.connect(ctx.destination)

  return { filter, convolver, wetGain }
}

// Oscillateur avec paire désaccordée (+/−4 cents) — "instrument" au lieu de "bip"
function detuned(
  ctx: AudioContext, dest: AudioNode, freq: number,
  start: number, dur: number, peak: number,
  type: OscillatorType = 'sine',
) {
  for (const cents of [+4, -4]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = cents
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(peak / 2, start + Math.min(0.025, dur * 0.15))
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain); gain.connect(dest)
    osc.start(start); osc.stop(start + dur + 0.05)
  }
}

function sine(
  ctx: AudioContext, dest: AudioNode, freq: number,
  start: number, dur: number, peak: number,
  type: OscillatorType = 'sine', attackMs = 25,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type; osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(peak, start + attackMs / 1000)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain); gain.connect(dest)
  osc.start(start); osc.stop(start + dur + 0.05)
}

function noiseBuffer(
  ctx: AudioContext, dest: AudioNode,
  start: number, dur: number, peak: number,
  loFreq: number, hiFreq: number,
) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource(); src.buffer = buf
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = loFreq
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = hiFreq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(peak, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(dest)
  src.start(start); src.stop(start + dur + 0.02)
}

export function useSound() {
  const infraRef = useRef<SoundInfra | null>(null)

  const jouer = useCallback((son: SoundName) => {
    try {
      const ctx = getAudioContext()

      const play = () => {
        if (!infraRef.current || infraRef.current.filter.context !== ctx) {
          infraRef.current = buildInfra(ctx)
        }
        const { filter: dry, convolver: rev } = infraRef.current
        const t = ctx.currentTime

        switch (son) {
          case 'demarrage': {
            // Trait de plume + 3 cordes pincées en la mineur — la séance commence
            // Bruit de nib traversant le papier
            noiseBuffer(ctx, dry, t, 0.6, 0.018, 1200, 2600)
            // 3 cordes pincées — triangle → lowpass qui se ferme
            const plucks = [
              { freq: 220.0, del: 0.00 },
              { freq: 261.6, del: 0.18 },
              { freq: 329.6, del: 0.36 },
            ]
            for (const { freq, del } of plucks) {
              const osc = ctx.createOscillator()
              const lp  = ctx.createBiquadFilter()
              const g   = ctx.createGain()
              osc.type = 'triangle'; osc.frequency.value = freq
              lp.type  = 'lowpass'
              lp.frequency.setValueAtTime(3000, t + del)
              lp.frequency.exponentialRampToValueAtTime(600, t + del + 0.7)
              g.gain.setValueAtTime(0.0001, t + del)
              g.gain.linearRampToValueAtTime(0.055, t + del + 0.005)
              g.gain.exponentialRampToValueAtTime(0.0001, t + del + 0.75)
              osc.connect(lp); lp.connect(g)
              g.connect(dry); g.connect(rev)
              osc.start(t + del); osc.stop(t + del + 0.8)
            }
            break
          }

          case 'soumettre': {
            // Goutte dans l'encrier — chute tonale puis quinte qui s'épanouit
            const osc = ctx.createOscillator()
            const g   = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(659, t)
            osc.frequency.exponentialRampToValueAtTime(440, t + 0.12)
            g.gain.setValueAtTime(0.0001, t)
            g.gain.linearRampToValueAtTime(0.05, t + 0.003)
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
            osc.connect(g); g.connect(dry)
            osc.start(t); osc.stop(t + 0.2)

            // Épanouissement — quinte ouverte A3 + E4 (triangle désaccordé, attaque lente)
            for (const freq of [220, 330]) {
              detuned(ctx, rev, freq, t + 0.08, 0.60, 0.030, 'triangle')
            }
            // écho harmonique discret
            sine(ctx, rev, 440, t + 0.15, 0.45, 0.018, 'sine', 80)
            break
          }

          case 'revelation': {
            // Cloche inharmonique — le rideau se lève
            // Partiels inharmoniques (le rapport 2.4× est la tierce mineure de cloche)
            const bell = [
              { freq: 220, gain: 0.060, dur: 2.0 },
              { freq: 440, gain: 0.040, dur: 1.4 },
              { freq: 528, gain: 0.030, dur: 1.0 }, // 2.4× de 220 — partiel mineur
              { freq: 880, gain: 0.018, dur: 0.6 },
            ]
            for (const p of bell) {
              detuned(ctx, rev, p.freq, t, p.dur, p.gain / 2)
            }
            // Nappe harmonique — swell 200 ms
            for (const freq of [110, 165.4, 261.6]) {
              detuned(ctx, rev, freq, t, 1.9, 0.035, 'sine')
              const osc = ctx.createOscillator()
              const g   = ctx.createGain()
              osc.type = 'sine'; osc.frequency.value = freq
              g.gain.setValueAtTime(0.0001, t)
              g.gain.linearRampToValueAtTime(0.035, t + 0.20)
              g.gain.exponentialRampToValueAtTime(0.0001, t + 1.90)
              osc.connect(g); g.connect(rev)
              osc.start(t); osc.stop(t + 2.0)
            }
            break
          }

          case 'ia': {
            // Voix de l'ailleurs — tierce mineure descendante avec vibrato et formant voyelle
            const osc  = ctx.createOscillator()
            const bp   = ctx.createBiquadFilter()
            const g    = ctx.createGain()
            const lfo  = ctx.createOscillator()
            const lfoG = ctx.createGain()
            osc.type  = 'sine'
            osc.frequency.setValueAtTime(261.6, t)
            osc.frequency.linearRampToValueAtTime(220, t + 0.35)
            bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2
            g.gain.setValueAtTime(0.0001, t)
            g.gain.linearRampToValueAtTime(0.042, t + 0.06) // attaque douce — respiré
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.60)
            lfo.type = 'sine'; lfo.frequency.value = 5.5
            lfoG.gain.value = 6
            lfo.connect(lfoG); lfoG.connect(osc.frequency)
            osc.connect(bp); bp.connect(g)
            g.connect(dry); g.connect(rev)
            lfo.start(t); osc.start(t)
            lfo.stop(t + 0.65); osc.stop(t + 0.65)
            break
          }

          case 'clic': {
            // Goutte d'encre sur papier — glissando bref vers le bas, sec (pas de reverbe)
            const osc = ctx.createOscillator()
            const g   = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(880, t)
            osc.frequency.exponentialRampToValueAtTime(660, t + 0.05)
            g.gain.setValueAtTime(0.0001, t)
            g.gain.linearRampToValueAtTime(0.050, t + 0.002)
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
            osc.connect(g); g.connect(dry) // dry uniquement — doit sembler instantané
            osc.start(t); osc.stop(t + 0.1)
            // Harmonique papier
            sine(ctx, dry, 1320, t, 0.04, 0.012, 'sine', 2)
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
        })
      }
    } catch {
      // audio non-bloquant
    }
  }, [])

  return { jouer }
}
