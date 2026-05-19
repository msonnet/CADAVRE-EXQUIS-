export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte, structureId } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  // Correction inutile pour le vers libre (chaque ligne est autonome)
  if (structureId === 'vers-libre') { res.status(200).json({ texte }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(200).json({ texte }); return }

  const prompt = structureId === 'phrase-etoffee'
    ? `Tu corriges les accords en genre dans une phrase surréaliste française issue d'un cadavre exquis.
Structure exacte : [article+adjectif] [nom-sujet] [adjectif-sujet] [verbe] [article+adjectif] [nom-COD] [adjectif-COD]

Règles STRICTES :
- Les noms (2e et 6e blocs) sont immuables — leur genre grammatical fait loi
- Accorde l'article+adjectif qui précède chaque nom, et l'adjectif qui le suit
- Ne change AUCUN mot lexical (noms, verbes, adverbes) — seulement les terminaisons et articles
- Retourne UNIQUEMENT la phrase corrigée, sans guillemets ni explication

Phrase : ${texte}`
    : `Corrige uniquement les accords en genre et en nombre (articles, adjectifs) dans cette phrase surréaliste française. Ne change aucun mot lexical. Retourne uniquement la phrase corrigée, sans guillemets ni explication.\n\nPhrase : ${texte}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 60,
        stop_sequences: ['\n'],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic ${response.status}`)

    const data = await response.json()
    const corrige = (data.content?.[0]?.text ?? '')
      .trim()
      .replace(/^[«"''"]|[«"''"]$/g, '')
      .trim()

    res.status(200).json({ texte: corrige || texte })
  } catch {
    res.status(200).json({ texte })
  }
}
