export const config = { maxDuration: 30 }

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { prompt } = req.body ?? {}
  if (!prompt) { res.status(400).json({ error: 'prompt requis' }); return }

  const falKey = process.env.FAL_KEY
  if (!falKey) { res.status(200).json({ url: null, reason: 'not_configured' }); return }

  const fullPrompt = `Portrait of a person described as: ${prompt}. Surrealist fine art portrait, dreamlike atmosphere, painted style, centered face, dark warm background, no text, no watermark.`

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
      const body = await response.text().catch(() => '')
      console.error(`avatar fal.ai ${response.status}:`, body)
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
