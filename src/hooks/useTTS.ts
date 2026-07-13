import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../lib/apiBase'
import { langueActuelle } from '../i18n'

// ── Lecture premium (ElevenLabs via /api/tts) avec repli voix système ────────
//
// parler() tente d'abord la voix IA du serveur — lecture habitée, française,
// digne du poème. Si le serveur n'est pas configuré (503) ou échoue, on
// retombe sans bruit sur la synthèse du navigateur (comportement historique).

// Cache de session : le même poème relu ne recoûte rien
const cacheAudio = new Map<string, string>()

// ── Voix système (repli) ─────────────────────────────────────────────────────
const VOICE_PRIORITY = [
  'Amélie',     // macOS/iOS fr-CA — très naturelle
  'Thomas',     // macOS/iOS fr-FR — bonne qualité
  'Marie',      // certains iOS
  'Audrey',     // Windows fr-FR
  'HortenseNeural', // Edge/Azure fr-BE
  'DeniseNeural',   // Edge/Azure fr-FR
]

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (langueActuelle() === 'en') {
    return (
      voices.find(v => v.name.includes('Samantha')) ||
      voices.find(v => v.name.includes('Daniel')) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang.startsWith('en')) ||
      null
    )
  }
  for (const name of VOICE_PRIORITY) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  return (
    voices.find(v => v.lang === 'fr-CA') ||
    voices.find(v => v.lang === 'fr-FR') ||
    voices.find(v => v.lang.startsWith('fr')) ||
    null
  )
}

function parlerAvecVoix(texte: string, voices: SpeechSynthesisVoice[], onStart: () => void, onEnd: () => void): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(texte)
  u.lang = langueActuelle() === 'en' ? 'en-GB' : 'fr-FR'
  const voix = pickVoice(voices)
  if (voix) {
    u.voice = voix
    if (voix.lang.startsWith('fr-CA') || voix.name.includes('Neural') || voix.name.includes('Amélie')) {
      u.rate = 0.88; u.pitch = 1.0; u.volume = 1.0
    } else {
      u.rate = 0.82; u.pitch = 0.95; u.volume = 1.0
    }
  } else {
    u.rate = 0.82; u.pitch = 0.95; u.volume = 1.0
  }
  u.onstart = onStart
  u.onend = onEnd
  u.onerror = onEnd
  return u
}

export function useTTS() {
  const [parlant, setParlant] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sessionLecture = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      audioRef.current?.pause()
      audioRef.current = null
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const arreter = useCallback(() => {
    sessionLecture.current++
    audioRef.current?.pause()
    audioRef.current = null
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setParlant(false)
  }, [])

  const parlerSysteme = useCallback((texte: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const onStart = () => { if (mountedRef.current) setParlant(true) }
    const onEnd = () => { if (mountedRef.current) setParlant(false) }
    const speak = (voices: SpeechSynthesisVoice[]) => {
      if (!mountedRef.current) return
      const u = parlerAvecVoix(texte, voices, onStart, onEnd)
      utterRef.current = u
      window.speechSynthesis.speak(u)
    }
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      speak(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        speak(window.speechSynthesis.getVoices())
      }
    }
  }, [])

  const parler = useCallback((texte: string) => {
    if (!texte.trim()) return
    arreter()
    const session = ++sessionLecture.current
    setParlant(true)

    const jouerUrl = (url: string) => {
      if (!mountedRef.current || session !== sessionLecture.current) return
      const a = new Audio(url)
      audioRef.current = a
      a.onended = () => { if (mountedRef.current && session === sessionLecture.current) setParlant(false) }
      a.onerror = () => { if (mountedRef.current && session === sessionLecture.current) setParlant(false) }
      a.play().catch(() => {
        // Autoplay refusé ou lecture impossible : repli système
        if (mountedRef.current && session === sessionLecture.current) parlerSysteme(texte)
      })
    }

    const enCache = cacheAudio.get(texte)
    if (enCache) { jouerUrl(enCache); return }

    fetch(api('/api/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte }),
    })
      .then(async r => {
        if (!r.ok) throw new Error(String(r.status))
        const blob = await r.blob()
        if (!blob.type.includes('audio') || blob.size < 1000) throw new Error('audio invalide')
        const url = URL.createObjectURL(blob)
        cacheAudio.set(texte, url)
        jouerUrl(url)
      })
      .catch(() => {
        // Serveur non configuré ou en échec : la voix système prend le relais
        if (mountedRef.current && session === sessionLecture.current) parlerSysteme(texte)
      })
  }, [arreter, parlerSysteme])

  return { parler, arreter, parlant }
}
