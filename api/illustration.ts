export const config = { maxDuration: 30 }

const STYLE_PROMPTS: Record<string, string> = {
  aquarelle: 'delicate watercolor painting, soft translucent color washes, wet-on-wet technique, dreamy fluid edges, paper texture visible',
  craies: 'oil pastel artwork, bold expressive strokes, rich textured pigments, vibrant layered marks, grainy surface',
  fusain: 'charcoal drawing on white paper, smudged blacks and grays, dramatic shadows, expressive gestural marks, high contrast',
  huile: 'oil painting, thick impasto texture, deep saturated colors, dramatic chiaroscuro, old master technique, canvas texture',
  crayons: 'colored pencil illustration, fine hatching and cross-hatching, soft blended hues, delicate precise detail, pencil grain visible',
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte, style } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  const apiKey = process.env.FAL_KEY
  if (!apiKey) { res.status(200).json({ url: null }); return }

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.aquarelle
  const prompt = `Surrealist dreamlike illustration, ${stylePrompt}, dark atmospheric, mysterious ethereal light, symbolist art, no text no letters no words: ${texte}`

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
