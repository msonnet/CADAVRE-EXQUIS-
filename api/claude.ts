import { choisirVoixAleatoire, VOIX } from './_voices.js'

type TypeCase =
  | 'nom'
  | 'verbe'
  | 'adjectif'
  | 'adverbe'
  | 'groupe-nominal'
  | 'groupe-verbal'
  | 'proposition'
  | 'libre'

// Tokens hard-cap par type — force les réponses courtes
const MAX_TOKENS: Record<TypeCase, number> = {
  'nom': 4,
  'verbe': 4,
  'adjectif': 4,
  'adverbe': 6,
  'groupe-nominal': 7,
  'groupe-verbal': 8,
  'proposition': 18,
  'libre': 12,
}

// Contraintes de longueur explicites dans le prompt
const CONTRAINTES: Record<TypeCase, string> = {
  'nom': '1 mot seul (nom sans article)',
  'verbe': '1 mot (verbe conjugué, forme courte)',
  'adjectif': '1 mot (adjectif seul)',
  'adverbe': '1 à 2 mots',
  'groupe-nominal': '2 mots (article + nom, ex: "le silence", "une ombre")',
  'groupe-verbal': '2 mots (verbe + 1 complément court)',
  'proposition': '4 à 6 mots (phrase courte)',
  'libre': '2 à 3 mots',
}

const FALLBACKS: Record<TypeCase, string[]> = {
  'nom': ["l'ombre", 'le silence', 'la nuit', 'la cendre', 'le vide', 'la pierre', 'le froid'],
  'verbe': ['glisse', 'brûle', 'tombe', 'tremble', 'demeure', 'se tait', 'disparaît'],
  'adjectif': ['immobile', 'pâle', 'profond', 'étrange', 'brisé', 'nocturne', 'creux'],
  'adverbe': ['doucement', 'lentement', 'en silence', 'sans bruit', 'à jamais', 'encore'],
  'groupe-nominal': ["l'ombre du soir", 'la nuit froide', 'le silence qui reste', 'un vide pesant'],
  'groupe-verbal': ['traverse la nuit', 'brûle en silence', "glisse dans l'ombre", 'tombe sans bruit'],
  'proposition': ['Que reste-t-il encore ?', 'Où vont les ombres ?', 'Qui a éteint la lumière ?'],
  'libre': ['quelque chose demeure', 'rien ne se perd', 'la nuit garde tout'],
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

  const { consigne, type, voiceId } = req.body ?? {}

  if (!consigne || !type) {
    res.status(400).json({ error: 'Champs manquants : consigne et type requis.' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    res.status(200).json({ texte: pickFallback(type as TypeCase) })
    return
  }

  const voix = voiceId
    ? (VOIX.find(v => v.id === voiceId) ?? choisirVoixAleatoire())
    : choisirVoixAleatoire()
  const maxTokens = MAX_TOKENS[type as TypeCase] ?? 14
  const contrainte = CONTRAINTES[type as TypeCase] ?? '2 à 4 mots'

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
        stop_sequences: ['\n', '.', '!', '?', ';'],
        system: voix.systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Écris UNIQUEMENT le fragment demandé, sans ponctuation finale, sans explication.\nType : ${consigne}.\nLongueur absolue : ${contrainte}.\nRéponds avec le fragment seul.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}`)
    }

    const data = await response.json()
    const brut = (data.content?.[0]?.text ?? '').trim()
    const texte = brut
      .replace(/\*+([^*]*)\*+/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\d{1,2}\s+\w+\s+\d{4}/g, '')
      .replace(/[.!?;,]+$/, '')
      .trim()

    res.status(200).json({ texte: texte || pickFallback(type as TypeCase) })
  } catch (err) {
    console.error('Erreur Claude API:', err)
    res.status(200).json({ texte: pickFallback(type as TypeCase) })
  }
}
