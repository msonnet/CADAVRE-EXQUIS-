import { useState, useCallback, useRef } from 'react'

export function useTTS() {
  const [parlant, setParlant] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const parler = useCallback((texte: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const speak = (voices: SpeechSynthesisVoice[]) => {
      const u = new SpeechSynthesisUtterance(texte)
      u.lang = 'fr-FR'
      u.rate = 0.72
      u.pitch = 0.75
      u.volume = 0.9
      const frVoice =
        voices.find(v => v.lang === 'fr-FR') ||
        voices.find(v => v.lang.startsWith('fr'))
      if (frVoice) u.voice = frVoice
      u.onstart = () => setParlant(true)
      u.onend = () => setParlant(false)
      u.onerror = () => setParlant(false)
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
