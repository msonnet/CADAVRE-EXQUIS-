import { useState, useCallback, useRef } from 'react'

export function useTTS() {
  const [parlant, setParlant] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const parler = useCallback((texte: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(texte)
    u.lang = 'fr-FR'
    u.rate = 0.82
    u.pitch = 0.88

    // Prefer a French voice if available
    const voices = window.speechSynthesis.getVoices()
    const frVoice = voices.find(v => v.lang.startsWith('fr'))
    if (frVoice) u.voice = frVoice

    u.onstart = () => setParlant(true)
    u.onend = () => setParlant(false)
    u.onerror = () => setParlant(false)

    utterRef.current = u
    window.speechSynthesis.speak(u)
  }, [])

  const arreter = useCallback(() => {
    window.speechSynthesis?.cancel()
    setParlant(false)
  }, [])

  return { parler, arreter, parlant }
}
