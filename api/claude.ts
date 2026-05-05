import { choisirVoixAleatoire } from './_voices.js'

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

const FALLBACKS: Record<TypeCase, string[]> = {
  'nom': ["l'ombre", 'le silence', 'la nuit', 'la cendre', 'le vide', 'la pierre', 'le froid'],
  'verbe': ['glisse', 'brûle', 'tombe', 'tremble', 'demeure', 'se tait', 'disparaît'],
  'adjectif': ['immobile', 'pâle', 'profond', 'étrange', 'brisé', 'nocturne', 'creux'],
  'adverbe': ['doucement', 'lentement', 'en silence', 'sans bruit', 'à jamais', 'encore'],
  'groupe-nominal': ["l'ombre du soir", 'la nuit froide', 'le silence qui reste', 'un vide entre deux souffles'],
  'groupe-verbal': ['traverse la nuit', 'brûle en silence', "glisse dans l'ombre", 'tombe sans bruit'],
  'proposition': ['Que reste-t-il encore', 'Où vont les ombres', 'Qui a éteint la lumière'],
  'libre': ['quelque chose demeure', 'rien ne se perd vraiment', 'la nuit garde tout'],
}

function pickFallback(type: TypeCase): string {
  const arr = FALLBACKS[type] ?? ['quelque chose']
  return arr[Math.floor(Math.random() * arr.length)]
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

  if (!apiKey) {
    res.status(200).json({ texte: pickFallback(type as TypeCase) })
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
          content: `Inscris dans ton document le fragment suivant : ${consigne}.\nRègle absolue : écris UNIQUEMENT le fragment lui-même, en 3 à 8 mots maximum. Une seule courte phrase ou expression. Aucune explication. Aucun refus. Si la consigne sort de ton domaine habituel, adapte-la librement à ton univers.`,
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}`)
    }

    const data = await response.json()
    const texte = (data.content?.[0]?.text ?? '').trim()

    res.status(200).json({ texte: texte || pickFallback(type as TypeCase) })
  } catch (err) {
    console.error('Erreur Claude API:', err)
    res.status(200).json({ texte: pickFallback(type as TypeCase) })
  }
}
