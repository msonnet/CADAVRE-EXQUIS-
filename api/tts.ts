export const config = { maxDuration: 25 }

import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'

/**
 * Lecture du poème — ElevenLabs eleven_multilingual_v2, voix George
 * (grave, chaleureuse, excellent français).
 *
 * Deux chemins, dans l'ordre :
 * 1. ELEVENLABS_API_KEY (compte ElevenLabs direct) — si présent
 * 2. FAL_KEY (déjà configurée pour les illustrations) — le même modèle
 *    hébergé par fal.ai, aucune inscription supplémentaire
 * Sans aucune clé : 503 → le client retombe sur la voix système.
 */
const VOICE_ID_DEFAUT = 'JBFqnCBsd6RMkjVDRZzb' // George (id, chemin direct)
const VOICE_NOM_DEFAUT = 'George'              // George (nom, chemin fal)

const REGLAGES = { stability: 0.42, similarity_boost: 0.8, style: 0.35 }

function nettoyer(v: string | undefined): string {
  return (v ?? '').replace(/["'\s]/g, '')
}

async function viaElevenLabs(key: string, texte: string): Promise<Buffer | null> {
  const voiceId = nettoyer(process.env.ELEVENLABS_VOICE_ID) || VOICE_ID_DEFAUT
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: texte,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { ...REGLAGES, use_speaker_boost: true },
    }),
  })
  if (!r.ok) return null
  return Buffer.from(await r.arrayBuffer())
}

async function viaFal(key: string, texte: string): Promise<Buffer | null> {
  const voice = nettoyer(process.env.ELEVENLABS_VOICE) || VOICE_NOM_DEFAUT
  const r = await fetch('https://fal.run/fal-ai/elevenlabs/tts/multilingual-v2', {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texte, voice, ...REGLAGES }),
  })
  if (!r.ok) return null
  const data = await r.json().catch(() => null)
  const url = data?.audio?.url
  if (typeof url !== 'string' || !url.startsWith('https://')) return null
  const audio = await fetch(url)
  if (!audio.ok) return null
  return Buffer.from(await audio.arrayBuffer())
}

export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  try {
    if (req.method !== 'POST') { res.status(405).end(); return }

    const ip = getClientIp(req)
    if (!checkRateLimit(`tts:${ip}`, 10)) {
      res.status(429).json({ error: 'Trop de lectures. Réessaie dans une minute.' }); return
    }

    const { texte } = req.body ?? {}
    if (typeof texte !== 'string' || !texte.trim()) {
      res.status(400).json({ error: 'texte requis' }); return
    }
    if (texte.length > 1200) {
      res.status(413).json({ error: 'texte trop long' }); return
    }

    // Des pauses respirées entre les vers : les sauts de ligne deviennent
    // des suspensions prosodiques que le modèle interprète bien.
    const lecture = texte.trim().replace(/\n+/g, ' … ')

    const elKey = nettoyer(process.env.ELEVENLABS_API_KEY)
    const falKey = nettoyer(process.env.FAL_KEY)
    if (!elKey && !falKey) { res.status(503).json({ error: 'not_configured' }); return }

    let audio: Buffer | null = null
    if (elKey) audio = await viaElevenLabs(elKey, lecture)
    if (!audio && falKey) audio = await viaFal(falKey, lecture)
    if (!audio) { res.status(502).json({ error: 'lecture indisponible' }); return }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(audio)
  } catch (e) {
    res.status(500).json({ error: 'Erreur interne', detail: String(e).slice(0, 160) })
  }
}
