export const config = { maxDuration: 25 }

import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'

/**
 * Lecture du poème — ElevenLabs eleven_multilingual_v2.
 * Voix par défaut : George (grave, chaleureuse, excellent français).
 * Sans ELEVENLABS_API_KEY, renvoie 503 → le client retombe sur la voix
 * système (Web Speech), comme avant.
 */
const VOICE_ID_DEFAUT = 'JBFqnCBsd6RMkjVDRZzb' // George

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

    const key = (process.env.ELEVENLABS_API_KEY ?? '').replace(/["'\s]/g, '')
    if (!key) { res.status(503).json({ error: 'not_configured' }); return }
    const voiceId = (process.env.ELEVENLABS_VOICE_ID ?? '').replace(/["'\s]/g, '') || VOICE_ID_DEFAUT

    // Des pauses respirées entre les vers : les sauts de ligne deviennent
    // des points de suspension prosodiques que le modèle interprète bien.
    const lecture = texte.trim().replace(/\n+/g, ' … ')

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: lecture,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.42,        // un peu d'imprévu dans la prosodie
          similarity_boost: 0.8,
          style: 0.35,            // lecture habitée, pas neutre
          use_speaker_boost: true,
        },
      }),
    })

    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      res.status(502).json({ error: 'lecture indisponible', detail: detail.slice(0, 160) }); return
    }

    const audio = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(audio)
  } catch (e) {
    res.status(500).json({ error: 'Erreur interne', detail: String(e).slice(0, 160) })
  }
}
