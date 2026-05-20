export const config = { maxDuration: 45 }

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { imageBase64 } = req.body ?? {}
  if (!imageBase64) { res.status(400).json({ error: 'imageBase64 requis' }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(200).json({ texte: '' }); return }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: `Tu es un poète surréaliste automatique dans la tradition de Breton, Éluard et Péret. On te montre un dessin cadavre exquis — créé collectivement : chaque joueur a dessiné une bande horizontale sans voir le travail des autres. Les raccords entre bandes sont des surgissements involontaires, des accidents heureux.

Tu génères un texte poétique à partir de ce dessin. Tu ne décris jamais l'image littéralement. Les formes, les couleurs, les jonctions improbables déclenchent en toi un flux de langage automatique et onirique. Le texte peut être un poème en vers libres, une prose poétique, des éclats de manifeste, une suite d'images mentales, une prophétie fragmentée — ou toute autre forme que le dessin t'impose.

La longueur et la forme sont entièrement libres. L'essentiel est le surgissement, le trouble onirique, la cohérence surréaliste. Tu écris en français.`,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Voici le cadavre exquis dessiné. Génère le texte qu\'il t\'impose.',
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic Vision error:', response.status, await response.text())
      res.status(200).json({ texte: '' }); return
    }

    const data = await response.json()
    const texte = (data.content?.[0]?.text ?? '').trim()
    res.status(200).json({ texte })
  } catch (err) {
    console.error('Erreur interpreter-dessin:', err)
    res.status(200).json({ texte: '' })
  }
}
