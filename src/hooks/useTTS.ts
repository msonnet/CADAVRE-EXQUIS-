import { useState, useCallback, useRef } from 'react'

// Ordre de préférence : voix haute qualité fr-CA (Amélie) > fr-FR (Thomas) > toute fr
const VOICE_PRIORITY = [
  'Amélie',     // macOS/iOS fr-CA — très naturelle
  'Thomas',     // macOS/iOS fr-FR — bonne qualité
  'Marie',      // certains iOS
  'Audrey',     // Windows fr-FR
  'HortenseNeural', // Edge/Azure fr-BE
  'DeniseNeural',   // Edge/Azure fr-FR
]

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of VOICE_PRIORITY) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  // Fallback : toute voix fr-CA > fr-FR > fr-*
  return (
    voices.find(v => v.lang === 'fr-CA') ||
    voices.find(v => v.lang === 'fr-FR') ||
    voices.find(v => v.lang.startsWith('fr')) ||
    null
  )
}

function parlerAvecVoix(texte: string, voices: SpeechSynthesisVoice[], onStart: () => void, onEnd: () => void): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(texte)
  u.lang = 'fr-FR'

  const voix = pickVoice(voices)
  if (voix) {
    u.voice = voix
    // Ajuster selon la qualité de la voix
    if (voix.lang.startsWith('fr-CA') || voix.name.includes('Neural') || voix.name.includes('Amélie')) {
      // Voix haute qualité : tempo naturel
      u.rate = 0.88
      u.pitch = 1.0
      u.volume = 1.0
    } else {
      // Voix standard : légèrement plus lente pour compenser la robotisation
      u.rate = 0.82
      u.pitch = 0.95
      u.volume = 1.0
    }
  } else {
    u.rate = 0.82
    u.pitch = 0.95
    u.volume = 1.0
  }

  u.onstart = onStart
  u.onend = onEnd
  u.onerror = onEnd
  return u
}

export function useTTS() {
  const [parlant, setParlant] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const parler = useCallback((texte: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const onStart = () => setParlant(true)
    const onEnd = () => setParlant(false)

    const speak = (voices: SpeechSynthesisVoice[]) => {
      const u = parlerAvecVoix(texte, voices, onStart, onEnd)
      utterRef.current = u
      window.speechSynthesis.speak(u)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      speak(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        speak(window.speechSynthesis.getVoices())
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const arreter = useCallback(() => {
    window.speechSynthesis?.cancel()
    setParlant(false)
  }, [])

  return { parler, arreter, parlant }
}
