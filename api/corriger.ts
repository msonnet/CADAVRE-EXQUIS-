export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte, structureId } = req.body ?? {}
  if (!texte) { res.status(400).json({ error: 'texte requis' }); return }

  // Vers libre : chaque vers est écrit en entier par un joueur, pas de désaccord inter-blocs
  if (structureId === 'vers-libre') { res.status(200).json({ texte }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(200).json({ texte }); return }

  const prompt = structureId === 'phrase-etoffee'
    ? `Tu es un correcteur de grammaire française spécialisé dans le cadavre exquis.

La phrase ci-dessous a été construite par 7 joueurs différents écrivant chacun UN bloc sans voir les autres. Les accords en genre sont donc cassés : la personne qui a écrit l'article+adjectif ne connaissait pas le nom qui allait suivre.

Structure des 7 blocs dans l'ordre :
  1. article + adjectif épithète  (ex : "un vieux" / "une belle" / "le grand")
  2. nom sujet                    (ex : "nuage" / "flamme" / "couteau")
  3. adjectif qualifiant le sujet (ex : "mystérieux" / "violente" / "sombre")
  4. verbe conjugué               (inchangé)
  5. article + adjectif épithète  (ex : "un long" / "la vieille" / "un pur")
  6. nom COD                      (ex : "miroir" / "forêt" / "os")
  7. adjectif qualifiant le COD   (ex : "brisé" / "profonde" / "éternel")

Règle absolue : les NOMS (blocs 2 et 6) ne bougent JAMAIS. Leur genre grammatical est la loi.
Tu dois mettre en accord :
  • bloc 1 avec bloc 2  (article et adjectif épithète → genre du nom sujet)
  • bloc 3 avec bloc 2  (adjectif attribut → genre du nom sujet)
  • bloc 5 avec bloc 6  (article et adjectif épithète → genre du nom COD)
  • bloc 7 avec bloc 6  (adjectif attribut → genre du nom COD)

Ne touche à rien d'autre (verbe, noms, adverbes, ponctuation).
Réponds avec LA PHRASE CORRIGÉE UNIQUEMENT, sans guillemets, sans explication.

Phrase : ${texte}`
    : `Tu es un correcteur de grammaire française. La phrase ci-dessous est une phrase surréaliste issue d'un cadavre exquis. Corrige uniquement les fautes d'accord en genre et en nombre (articles et adjectifs doivent s'accorder avec leur nom). Ne modifie aucun mot lexical (noms, verbes, adverbes). Réponds avec la phrase corrigée uniquement, sans guillemets ni explication.

Phrase : ${texte}`

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
        max_tokens: 200,
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
