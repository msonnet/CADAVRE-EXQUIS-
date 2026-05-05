import { choisirVoixAleatoire } from './_voices'

type TypeCase =
  | 'nom'
  | 'verbe'
  | 'adjectif'
  | 'adverbe'
  | 'groupe-nominal'
  | 'groupe-verbal'
  | 'proposition'
  | 'libre'

const MAX_TOKENS: Record<TypeCase, number> = {
  'nom': 20,
  'verbe': 15,
  'adjectif': 15,
  'adverbe': 15,
  'groupe-nominal': 35,
  'groupe-verbal': 35,
  'proposition': 60,
  'libre': 80,
}

const FALLBACK: Record<TypeCase, string> = {
  'nom': "l'ombre",
  'verbe': 'glisse',
  'adjectif': 'immobile',
  'adverbe': 'lentement',
  'groupe-nominal': 'le silence',
  'groupe-verbal': 'traverse la nuit',
  'proposition': 'Que reste-t-il',
  'libre': 'quelque chose demeure',
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { consigne, type } = req.body ?? {}

  if (!consigne || !type) {
    res.status(400).json({ error: 'Champs manquants : consigne et type requis.' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const fallback = FALLBACK[type as TypeCase] ?? 'quelque chose'

  if (!apiKey) {
    res.status(200).json({ texte: fallback })
    return
  }

  const voix = choisirVoixAleatoire()
  const maxTokens = MAX_TOKENS[type as TypeCase] ?? 35

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
        max_tokens: maxTokens,
        system: voix.systemPrompt,
        messages: [{
          role: 'user',
          content: `Dans le cadre de ton travail, formule exactement ceci : ${consigne}.\nRéponds uniquement avec le fragment. Pas de guillemets. Pas de commentaire. Pas de ponctuation finale superflue.`,
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}`)
    }

    const data = await response.json()
    const texte = (data.content?.[0]?.text ?? '').trim()

    res.status(200).json({ texte: texte || fallback })
  } catch (err) {
    console.error('Erreur Claude API:', err)
    res.status(200).json({ texte: fallback })
  }
}
