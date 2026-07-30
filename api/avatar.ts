export const config = { maxDuration: 30 }

import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { utilisateurDuJeton, consommer, rendre, PLAFOND_JOUR } from './_acces.js'

export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'POST') { res.status(405).end(); return }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 5)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' }); return
  }

  const { prompt, style = 'surrealiste' } = req.body ?? {}
  if (typeof prompt !== 'string' || !prompt) { res.status(400).json({ error: 'prompt requis' }); return }
  if (prompt.length > 500) { res.status(400).json({ error: 'prompt trop long' }); return }
  if (typeof style !== 'string' || style.length > 50) { res.status(400).json({ error: 'style invalide' }); return }

  // Une génération d'avatar coûte de l'argent réel : sans identité, cet
  // appel était une porte ouverte sur la clé fal pour qui la trouvait.
  const userId = await utilisateurDuJeton(req)
  if (!userId) { res.status(401).json({ url: null, reason: 'auth_requise' }); return }

  const verdict = await consommer(userId, 'avatar')
  if (!verdict.autorise) {
    res.status(402).json({ url: null, reason: 'plafond_jour', plafond: PLAFOND_JOUR.avatar })
    return
  }

  const falKey = process.env.FAL_KEY
  if (!falKey) {
    await rendre(userId, verdict.event)
    res.status(200).json({ url: null, reason: 'not_configured' })
    return
  }

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
    // Un portrait affiché dans une pastille de 96 px ne réclame pas le grand
    // format : le modèle rapide suffit et coûte treize fois moins. Une
    // identité anonyme se crée librement — cet appel doit rester bon marché.
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: 'square',
        num_inference_steps: 4,
        num_images: 1,
      }),
    })

    if (!response.ok) {
      console.error(`avatar fal.ai ${response.status}`)
      await rendre(userId, verdict.event)
      res.status(200).json({ url: null, reason: `fal_error_${response.status}` })
      return
    }

    const data = await response.json()
    const url = data.images?.[0]?.url ?? null
    if (!url) await rendre(userId, verdict.event)
    res.status(200).json({ url })
  } catch (err) {
    console.error('Erreur avatar:', err)
    await rendre(userId, verdict.event)
    res.status(200).json({ url: null, reason: 'network_error' })
  }
}
