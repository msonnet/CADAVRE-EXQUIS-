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
  | 'article-adj'

// Tokens hard-cap par type
const MAX_TOKENS: Record<TypeCase, number> = {
  'nom': 6,
  'verbe': 5,
  'adjectif': 5,
  'adverbe': 6,
  'groupe-nominal': 8,
  'groupe-verbal': 8,
  'proposition': 18,
  'libre': 18,
  'article-adj': 6,
}

// Contraintes de longueur explicites dans le prompt
const CONTRAINTES: Record<TypeCase, string> = {
  'nom': '1 MOT SEUL — jamais d\'article, jamais 2 mots (ex: "cœur", "nuage", "cendre", "os")',
  'verbe': '1 mot (verbe conjugué — ex : "dévore", "hante", "veille", "frôle")',
  'adjectif': '1 MOT SEUL (adjectif qualificatif — ex : "nocturne", "brisé", "sourd", "profond")',
  'adverbe': '1 à 2 mots',
  'groupe-nominal': '2 à 3 mots (article + nom, ex: "le silence", "une ombre froide")',
  'groupe-verbal': '2 mots (verbe + 1 complément court)',
  'proposition': '4 à 6 mots (phrase courte)',
  'libre': '3 à 6 mots (un vers)',
  'article-adj': '2 MOTS EXACTEMENT : article défini ou indéfini + adjectif qualificatif. Exemples valides : "un sombre", "la vieille", "une pâle", "le lourd", "un creux". INTERDIT : noms, pronoms, expressions figées.',
}

const FALLBACKS: Record<TypeCase, string[]> = {
  'nom': ['ombre', 'silence', 'nuit', 'cendre', 'vide', 'pierre', 'brume',
          'froid', 'poussière', 'vent', 'pluie', 'écho', 'flamme', 'seuil',
          'abîme', 'vertige', 'mousse', 'givre', 'encre', 'boue'],
  'verbe': ['glisse', 'brûle', 'tombe', 'tremble', 'demeure', 'se tait', 'disparaît', 'pèse',
            'erre', 'veille', 'frôle', 'hante', 'effleure', 'résiste', 'chavire', 'murmure',
            'vacille', 'sombre', 'rôde', 'dérive'],
  'adjectif': ['immobile', 'pâle', 'profond', 'étrange', 'brisé', 'nocturne', 'creux', 'lourd',
               'froid', 'sourd', 'amer', 'voilé', 'opaque', 'lent', 'nu', 'aigre',
               'muet', 'dense', 'sombre', 'fragile'],
  'adverbe': ['doucement', 'lentement', 'en silence', 'sans bruit', 'à jamais', 'encore', 'ailleurs',
              'en vain', 'presque', 'toujours', 'parfois', 'nulle part', 'jadis', 'désormais'],
  'groupe-nominal': [
    "l'ombre portée", 'la nuit sans fond', 'un souffle perdu', 'la cendre froide',
    'le bruit du vent', 'une lumière voilée', 'la terre durcie', 'un regard vide',
    'la pluie fine', 'un mur de brume', 'la main tendue',
    'un silence épais', 'le bord du gouffre', 'une voix creuse', "l'eau noire",
    'le corps absent', 'une ombre familière', 'la porte close', 'un feu mourant',
  ],
  'groupe-verbal': [
    'traverse la nuit', 'brûle en silence', "glisse dans l'ombre", 'tombe sans bruit',
    'demeure immobile', 'efface les traces', 'attend sans espoir', 'pèse sur le monde',
    'hante les couloirs', 'frôle les murs', 'résiste au vent', 'se perd dans le brouillard',
  ],
  'proposition': [
    'Que reste-t-il encore ?', 'Où vont les ombres ?', 'Qui a éteint la lumière ?',
    'Quand reviendra le froid ?', 'Pourquoi ce silence ?', 'Qui veille encore ?',
    'Que cherche-t-on ici ?', 'Où finit la nuit ?', "Qu'y a-t-il derrière ?",
    'Qui se souvient encore ?', "Jusqu'où va le vide ?", "Quand cela s'arrêtera-t-il ?",
  ],
  'libre': [
    'quelque chose demeure', 'la nuit garde tout', 'le silence répond',
    'rien ne disparaît vraiment', 'tout recommence ailleurs', "l'oubli protège",
    "les mots s'effacent", 'le temps hésite', "l'absence a une forme",
  ],
  'article-adj': [
    'un sombre', 'une vieille', 'le froid', 'une pâle', 'un beau', 'la douce',
    'un noir', 'une lente', 'le vieux', 'une étrange', 'un creux', 'la froide',
    'un lourd', 'une brisée', 'le muet', 'une profonde', 'un nu', 'la dense',
  ],
}

const ARTICLES_FR = new Set([
  'un', 'une', 'le', 'la', 'les', 'du', 'des', 'au', 'aux',
  'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
])

// Valide et normalise la sortie du modèle selon le type attendu.
// Retourne '' si invalide (déclenchera le fallback).
function normaliserSortie(texte: string, type: TypeCase): string {
  const t = texte.trim()
  const mots = t.split(/\s+/)

  switch (type) {
    case 'article-adj': {
      if (mots.length !== 2) return ''
      if (!ARTICLES_FR.has(mots[0].toLowerCase())) return ''
      return t
    }
    case 'nom': {
      // Cas "l'ombre" ou "d'encre" — élision sans espace → strip l' / d'
      if (mots.length === 1) return t.replace(/^[lLdD][''’]/, '')
      // Cas "le silence" ou "la nuit" — article séparé → strip l'article
      if (ARTICLES_FR.has(mots[0].toLowerCase())) return mots.slice(1).join(' ')
      if (mots.length > 2) return mots[0]
      return t
    }
    case 'adjectif': {
      // Prendre uniquement le premier mot si le modèle a écrit une phrase
      if (mots.length > 2) return mots[0]
      return t
    }
    case 'verbe': {
      if (mots.length > 3) return mots.slice(0, 2).join(' ')
      return t
    }
    default:
      return t
  }
}

function pickFallback(type: TypeCase): string {
  const arr = FALLBACKS[type] ?? FALLBACKS['libre']
  return arr[Math.floor(Math.random() * arr.length)]
}

const TYPES_VALIDES: Set<string> = new Set([
  'nom', 'verbe', 'adjectif', 'adverbe',
  'groupe-nominal', 'groupe-verbal',
  'proposition', 'libre', 'article-adj',
])

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { consigne, type, voiceId, contexte } = req.body ?? {}

  if (typeof consigne !== 'string' || typeof type !== 'string' || !consigne || !type) {
    res.status(400).json({ error: 'Champs manquants : consigne et type requis.' })
    return
  }
  if (!TYPES_VALIDES.has(type)) {
    res.status(400).json({ error: 'type invalide' })
    return
  }
  if (consigne.length > 200 || (typeof contexte === 'string' && contexte.length > 500)) {
    res.status(400).json({ error: 'champs trop longs' })
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

  const echoLine = contexte
    ? `\nTu entends en écho : "${contexte}".`
    : ''

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
        max_tokens: maxTokens,
        stop_sequences: ['\n', '.', '!', '?'],
        system: voix.systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Écris UNIQUEMENT le fragment demandé, sans ponctuation finale, sans explication.\nType : ${consigne}.\nContrainte absolue : ${contrainte}.\nSois inattendu — choisis l'image concrète et physique qui ne vient pas en premier.${echoLine}\nRéponds avec le fragment seul.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}`)
    }

    const data = await response.json()
    const brut = (data.content?.[0]?.text ?? '').trim()
    const propre = brut
      .replace(/\*+([^*]*)\*+/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\d{1,2}\s+\w+\s+\d{4}/g, '')
      .replace(/[.!?;,]+$/, '')
      .trim()

    const texte = normaliserSortie(propre, type as TypeCase)
    res.status(200).json({ texte: texte || pickFallback(type as TypeCase) })
  } catch (err) {
    console.error('Erreur Claude API:', err)
    res.status(200).json({ texte: pickFallback(type as TypeCase) })
  }
}
