export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { texte, structureId } = req.body ?? {}
  if (typeof texte !== 'string' || !texte) { res.status(400).json({ error: 'texte requis' }); return }
  if (texte.length > 1000) { res.status(400).json({ error: 'texte trop long' }); return }

  // Vers libre : chaque vers est écrit en entier par un joueur, pas de désaccord inter-blocs
  if (structureId === 'vers-libre') { res.status(200).json({ texte }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(200).json({ texte }); return }

  const prompt = structureId === 'phrase-etoffee'
    ? `Tu es un correcteur de grammaire française expert du cadavre exquis.

La phrase ci-dessous a été construite par 7 joueurs écrivant chacun un bloc sans voir les autres. Les accords peuvent être cassés, et certains blocs peuvent contenir un mot du mauvais type (ex : un nom à la place d'un adjectif).

Structure exacte dans l'ordre :
  Bloc 1 : article + adjectif épithète   (ex : "un sombre", "la vieille", "une pâle")
  Bloc 2 : nom sujet                     (INVARIABLE — son genre grammatical fait loi)
  Bloc 3 : adjectif qualifiant le sujet  (1 mot)
  Bloc 4 : verbe conjugué                (INVARIABLE)
  Bloc 5 : article + adjectif épithète   (ex : "la douce", "un long", "une froide")
  Bloc 6 : nom COD                       (INVARIABLE — son genre grammatical fait loi)
  Bloc 7 : adjectif qualifiant le COD    (1 mot)

Tu dois :
1. Accorder le bloc 1 (article + adjectif) en genre avec le bloc 2 (nom sujet)
2. Accorder le bloc 3 (adjectif) en genre avec le bloc 2 (nom sujet)
3. Accorder le bloc 5 (article + adjectif) en genre avec le bloc 6 (nom COD)
4. Accorder le bloc 7 (adjectif) en genre avec le bloc 6 (nom COD)
5. Si le bloc 1 ou le bloc 5 contient un nom commun au lieu d'un adjectif (ex : "la peine", "le chagrin", "la terreur"), remplace-le par un article + adjectif du genre correspondant au nom associé (bloc 2 ou 6), en gardant l'esprit surréaliste

Ne touche pas aux noms (blocs 2 et 6), au verbe (bloc 4), ni aux adverbes.
Réponds avec LA PHRASE CORRIGÉE UNIQUEMENT, sans guillemets ni explication.

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
