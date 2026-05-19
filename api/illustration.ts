export const config = { maxDuration: 55 }

const STYLE_PROMPTS: Record<string, string> = {
  aquarelle:     'traditional watercolor painting on cold press paper, wet-on-wet color blooms and granulation, cauliflower bleeds at edges, translucent glazed layers, crisp dry-brush detail in shadows, visible paper grain and texture, colors merging naturally, professional fine art watercolor technique',
  fusain:        'raw charcoal drawing on rough textured paper, heavy smudging and blending with fingers, velvety deep blacks, powdery chalky texture, erased white highlights carved from darkness, gestural expressionist marks, Käthe Kollwitz dark emotional energy, visible paper fibres and grain',
  huile:         'thick impasto oil painting, heavy palette knife and bristle brush texture, oil paint ridges catching raking light, rich Old Master dark shadows, layered glazes over thick ground, cracked and aged surface, visible canvas weave through thin passages, Rembrandt dramatic chiaroscuro',
  encre:         'pure india ink on white paper, bold gestural brush strokes varying from hairline to broad, spontaneous ink splatter and bleed marks, stark white negative space, calligraphic line energy, accidental marks embraced, raw directness, high contrast black and white only',
  gravure:       'copper plate intaglio etching, ultra-precise cross-hatching and stippling, aquatint tonal gradients, bitten metal plate texture, warm sepia plate tone on aged paper, Piranesi and Dürer precision, deeply worked shadows through layered hatching, fine burr marks',
  hyperrealisme: 'ultra-photorealistic hyperdetailed rendering, 8K resolution, sharp critical focus, physically accurate materials and lighting, subsurface scattering on organic surfaces, ray-traced reflections and global illumination, every texture rendered with perfect fidelity, indistinguishable from a photograph',
  cyanotype:     'cyanotype photogram on textured paper, prussian blue monochrome, white silhouettes of objects and plants, UV-contact print aesthetic, slightly uneven development marks, deep saturated blue shadows',
  linogravure:   'linocut print, bold graphic reduction, strong black ink on cream paper, rough carved edges, hatching in parallel cuts, flat areas of solid ink, expressionist woodblock energy',
  pastel:        'soft pastel drawing on tinted paper, chalky matte texture, blended color transitions with fingertip smudging, luminous highlights, delicate strokes layered over each other, Degas-like softness',
  collage:       'dadaist paper collage, torn printed paper fragments, magazine clippings and newsprint, overlapping layers with visible edges, mixed typography and photographic scraps, glue spots and creases, Ernst or Heartfield assemblage',
  gouache:       'opaque gouache illustration, flat matte color areas, clean sharp edges, poster-like graphic quality, mid-century illustration style, no transparency, rich saturated pigments',
  sanguine:      'red chalk sanguine drawing on cream paper, warm reddish-brown lines, hatching and cross-hatching, Renaissance drawing technique, Leonardo or Raphael study aesthetic',
  mezzotinte:    'mezzotint intaglio print, velvety dark tones burnished to create light, rich deep blacks, gradual tonal transitions from darkness to luminosity, romantic nocturnal atmosphere',
  lavis:         'ink wash painting, diluted ink in varying grey tones, fluid brushwork, Chinese or Japanese sumi-e influence, white paper showing through thin washes, spontaneous gestural quality',
  serigraphie:        'silkscreen print, flat areas of separated solid colors, registration marks slightly off, bold graphic design, pop art influence, Warhol-style repetition and color separation',
  collage_surrealiste: 'surrealist photomontage collage in the style of Max Ernst and Hannah Höch, cut-and-paste fragments of engravings and photographs, dreamlike juxtapositions of scale and context, torn paper edges, anatomical diagrams mixed with natural history prints, vintage typographic scraps, Dada composition, overlapping layers with visible paste marks and creases',
}

async function texteVersPromptVisuel(texte: string, anthropicKey: string): Promise<string> {
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
        max_tokens: 140,
        messages: [{
          role: 'user',
          content: `Convert this French surrealist poem into a vivid English visual scene description for a fine art image generator.\n\nRules:\n- Keep every subject and object\n- Use GERUND form for all actions to show the act in progress, not the result:\n  * "eats/devours" = "jaws wide open, teeth sinking into [object], actively devouring — NOT the aftermath"\n  * "crushes" = "pressing [object] flat underfoot, the act of crushing mid-motion"\n  * "flies" = "airborne mid-flight, wings fully spread"\n  * "caresses" = "hand in motion touching [object]"\n- Surrealist impossible scenes happen literally — specify what is physically touching what\n- Nudity: describe as classical fine art ("nude figure", "draped torso", "sculptural female form") — painterly and museum-quality, never explicit\n- 25–35 words max, concrete and visual\n- Return only the description\n\nFrench: "${texte}"`,
        }],
      }),
    })
    if (!response.ok) return texte
    const data = await response.json()
    return (data.content?.[0]?.text ?? texte).trim()
  } catch {
    return texte
  }
}

async function traduireDirection(direction: string, anthropicKey: string): Promise<string> {
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
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: `Translate this artistic direction to concise English. Return only the translation, no explanation.\n\n"${direction}"`,
        }],
      }),
    })
    if (!response.ok) return direction
    const data = await response.json()
    return (data.content?.[0]?.text ?? direction).trim()
  } catch {
    return direction
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte, style, promptLibre } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  const falKey = process.env.FAL_KEY
  if (!falKey) { res.status(200).json({ url: null }); return }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const stylePrompt = style !== 'libre' ? (STYLE_PROMPTS[style] ?? STYLE_PROMPTS.aquarelle) : ''

  // Description visuelle explicite : force FLUX à rendre les actions littéralement
  const textePrompt = anthropicKey ? await texteVersPromptVisuel(texte, anthropicKey) : texte

  let prompt: string
  let guidance_scale: number

  if (promptLibre?.trim()) {
    const direction = anthropicKey
      ? await traduireDirection(promptLibre.trim(), anthropicKey)
      : promptLibre.trim()
    prompt = stylePrompt
      ? `${textePrompt}. ${direction}, rendered as ${stylePrompt}. No text, no letters, no watermark, no signature`
      : `${textePrompt}. ${direction}. No text, no letters, no watermark, no signature`
    guidance_scale = 6.0
  } else {
    prompt = stylePrompt
      ? `${textePrompt}. ${stylePrompt}. No text, no letters, no watermark, no signature`
      : `${textePrompt}. No text, no letters, no watermark, no signature`
    guidance_scale = 4.5
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'portrait_4_3',
        num_inference_steps: 28,
        guidance_scale,
        safety_tolerance: '5',
        num_images: 1,
      }),
    })

    if (!response.ok) throw new Error(`fal.ai ${response.status}`)

    const data = await response.json()
    const url = data.images?.[0]?.url ?? null
    res.status(200).json({ url, promptVisuel: textePrompt })
  } catch (err) {
    console.error('Erreur fal.ai:', err)
    res.status(200).json({ url: null })
  }
}

