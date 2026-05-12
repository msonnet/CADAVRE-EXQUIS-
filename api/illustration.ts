export const config = { maxDuration: 30 }

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  const apiKey = process.env.FAL_KEY
  if (!apiKey) { res.status(200).json({ url: null }); return }

  const prompt = `Surrealist dreamlike illustration, ink wash and watercolor, dark atmospheric, mysterious ethereal light, symbolist art, no text no letters no words: ${texte}`

  try {
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'portrait_4_3',
        num_inference_steps: 4,
        num_images: 1,
      }),
    })

    if (!response.ok) throw new Error(`fal.ai ${response.status}`)

    const data = await response.json()
    const url = data.images?.[0]?.url ?? null
    res.status(200).json({ url })
  } catch (err) {
    console.error('Erreur fal.ai:', err)
    res.status(200).json({ url: null })
  }
}
