export const config = { maxDuration: 45 }

const STYLE_PROMPTS: Record<string, string> = {
  aquarelle:   'delicate watercolor painting, soft translucent color washes, wet-on-wet bleeding edges, visible paper grain, luminous and airy',
  encre:       'indian ink brush drawing, bold expressive black strokes on white paper, stark contrast, gestural sumi-e marks, ink pooling and bleeding',
  gravure:     'intaglio copper plate etching, dense fine cross-hatching, warm sepia and black tones, antique engraving detail, deep aquatint shadows',
  cyanotype:   'cyanotype photographic print, prussian blue and bright white only, ghostly photogram silhouettes, blueprint otherworldly quality',
  linogravure: 'linocut woodblock print, bold carved graphic shapes, rough-edged marks, stark black and white, visible printing pressure texture',
  pastel:      'soft dry pastel drawing, powdery blended chalky pigments, gentle sfumato transitions, velvety matte surface, dreamy soft focus',
  collage:     'surrealist paper collage, vintage engraving and book page fragments cut and assembled, Max Ernst frottage style, uncanny juxtapositions',
  gouache:     'gouache poster illustration, flat opaque matte colors, bold graphic shapes, simplified forms, mid-century modern design aesthetic',
  sanguine:    'sanguine red chalk drawing, warm terracotta lines on ivory paper, Renaissance old master study, hatching and stumping technique',
  mezzotinte:  'mezzotint engraving, extremely rich velvety black shadows, soft luminous highlights emerging from deep darkness, dramatic chiaroscuro',
  lavis:       'ink wash painting, monochrome diluted sepia ink, Chinese brush calligraphy style, soft gradients, rice paper texture, contemplative',
  serigraphie: 'silkscreen screen print, flat graphic limited three-color palette, bold simplified shapes, pop art poster aesthetic',
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
        max_tokens: 80,
        messages: [{
          role: 'user',
          content: `Ce poème surréaliste français va servir de base à une illustration. Décris en 1 à 2 phrases anglaises une scène visuelle unique et cohérente qui capture l'essence du poème (éléments concrets, composition unifiée, pas de mots abstraits).\n\nPoème : "${poeme}"`,
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

  const { texte, style } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  const falKey = process.env.FAL_KEY
  if (!falKey) { res.status(200).json({ url: null }); return }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.aquarelle

  // Transformer le poème en scène visuelle unifiée
  const sceneVisuelle = anthropicKey
    ? await poeticToVisual(texte, anthropicKey)
    : texte

  const prompt = `${stylePrompt}, surrealist dreamlike illustration, single unified scene: ${sceneVisuelle}. Poetic lyrical atmosphere, no text no letters no words no watermark no signature no writing`

  try {
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
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
