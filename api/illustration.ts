export const config = { maxDuration: 55 }

const STYLE_PROMPTS: Record<string, string> = {
  aquarelle: 'traditional watercolor painting on cold press paper, wet-on-wet color blooms and granulation, cauliflower bleeds at edges, translucent glazed layers, crisp dry-brush detail in shadows, visible paper grain and texture, colors merging naturally, professional fine art watercolor technique',
  fusain:    'raw charcoal drawing on rough textured paper, heavy smudging and blending with fingers, velvety deep blacks, powdery chalky texture, erased white highlights carved from darkness, gestural expressionist marks, Käthe Kollwitz dark emotional energy, visible paper fibres and grain',
  huile:     'thick impasto oil painting, heavy palette knife and bristle brush texture, oil paint ridges catching raking light, rich Old Master dark shadows, layered glazes over thick ground, cracked and aged surface, visible canvas weave through thin passages, Rembrandt dramatic chiaroscuro',
  encre:     'pure india ink on white paper, bold gestural brush strokes varying from hairline to broad, spontaneous ink splatter and bleed marks, stark white negative space, calligraphic line energy, accidental marks embraced, raw directness, high contrast black and white only',
  gravure:   'copper plate intaglio etching, ultra-precise cross-hatching and stippling, aquatint tonal gradients, bitten metal plate texture, warm sepia plate tone on aged paper, Piranesi and Dürer precision, deeply worked shadows through layered hatching, fine burr marks',
}

async function poeticToVisual(poeme: string, anthropicKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Ce poème surréaliste va être illustré. Crée une interprétation visuelle INATTENDUE et DÉCALÉE : ne traduis pas les métaphores littéralement. Transforme l'atmosphère du poème en une scène concrète mais étrange, avec des associations surréalistes inattendues — objets détournés de leur contexte, échelles impossibles, juxtapositions troublantes à la Ernst ou Magritte. Décris en 2 phrases anglaises précises une seule scène unifiée et surprenante.

Poème : "${poeme}"`,
        }],
      }),
    })
    if (!response.ok) return poeme
    const data = await response.json()
    return (data.content?.[0]?.text ?? poeme).trim()
  } catch {
    return poeme
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte, style, promptLibre } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  const falKey = process.env.FAL_KEY
  if (!falKey) { res.status(200).json({ url: null }); return }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.aquarelle

  const sceneVisuelle = anthropicKey
    ? await poeticToVisual(texte, anthropicKey)
    : texte

  let prompt: string
  if (promptLibre?.trim()) {
    prompt = `${sceneVisuelle}. Artist's direction: ${promptLibre.trim()}. Rendered as ${stylePrompt}. No text, no letters, no watermark, no signature`
  } else {
    prompt = `${stylePrompt}, surrealist scene: ${sceneVisuelle}. No text, no letters, no watermark, no signature`
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'portrait_4_3',
        num_inference_steps: 28,
        guidance_scale: 3.5,
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
