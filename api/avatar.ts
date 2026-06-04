export const config = { maxDuration: 30 }

import { checkRateLimit, getClientIp } from './_rateLimit.js'

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 5)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' }); return
  }

  const { prompt, style = 'surrealiste' } = req.body ?? {}
  if (typeof prompt !== 'string' || !prompt) { res.status(400).json({ error: 'prompt requis' }); return }
  if (prompt.length > 500) { res.status(400).json({ error: 'prompt trop long' }); return }
  if (typeof style !== 'string' || style.length > 50) { res.status(400).json({ error: 'style invalide' }); return }

  const falKey = process.env.FAL_KEY
  if (!falKey) { res.status(200).json({ url: null, reason: 'not_configured' }); return }

  const stylePrompts: Record<string, string> = {
    surrealiste:     'surrealist fine art portrait, dreamlike uncanny atmosphere, painted, dark warm tones',
    aquarelle:       'delicate watercolor portrait, soft washes of color, loose brushstrokes, white paper texture',
    fusain:          'charcoal drawing portrait, expressive marks, deep blacks, smudged textures, sketch aesthetic',
    art_nouveau:     'Art Nouveau portrait, ornate flowing lines, botanical motifs, Mucha-inspired, decorative border',
    encre:           'ink portrait, bold brushwork, high contrast black and white, East Asian ink painting influence',
    expressionniste: 'expressionist portrait, bold brushstrokes, distorted forms, intense color, Kirchner influence',
  }
  const styleDesc = stylePrompts[style] ?? stylePrompts.surrealiste
  const fullPrompt = `Portrait of a person described as: ${prompt}. ${styleDesc}. Centered face, no text, no watermark, fine art quality.`

  try {
    const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: 'square',
        num_inference_steps: 20,
        guidance_scale: 3.5,
        safety_tolerance: 5,
        num_images: 1,
      }),
    })

    if (!response.ok) {
      console.error(`avatar fal.ai ${response.status}`)
      res.status(200).json({ url: null, reason: `fal_error_${response.status}` })
      return
    }

    const data = await response.json()
    const url = data.images?.[0]?.url ?? null
    res.status(200).json({ url })
  } catch (err) {
    console.error('Erreur avatar:', err)
    res.status(200).json({ url: null, reason: 'network_error' })
  }
}
