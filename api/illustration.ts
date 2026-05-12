export const config = { maxDuration: 30 }

const STYLE_PROMPTS: Record<string, string> = {
  aquarelle: 'delicate watercolor painting, soft translucent color washes, wet-on-wet technique, fluid dreamy edges, visible paper texture',
  craies: 'oil pastel artwork, bold expressive strokes, rich layered pigments, vibrant textured marks, grainy surface',
  fusain: 'charcoal drawing on paper, smudged grays, expressive gestural marks, soft tonal gradients, subtle contrast',
  huile: 'oil painting, visible brushstrokes, rich color, warm luminous light, classic painterly technique, canvas texture',
  crayons: 'colored pencil illustration, fine hatching, soft blended hues, delicate precise detail, pencil grain visible',
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte, style } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  const apiKey = process.env.FAL_KEY
  if (!apiKey) { res.status(200).json({ url: null }); return }

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.aquarelle
  const prompt = `Surrealist poetic illustration, ${stylePrompt}, dreamlike and lyrical atmosphere, no text no letters no words no watermark no signature no copyright no writing: ${texte}`

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
