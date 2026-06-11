export const config = { maxDuration: 30 }

import { choisirVoixAleatoire, VOIX } from './_voices.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'

type TypeCase =
  | 'nom'
  | 'verbe'
  | 'verbe-transitif'
  | 'adjectif'
  | 'adverbe'
  | 'groupe-nominal'
  | 'groupe-verbal'
  | 'proposition'
  | 'libre'
  | 'article-adj'

// Tokens hard-cap par type — marges larges : le français tokenise lourdement,
// un plafond trop serré coupe les mots en plein milieu (« l'asymét »)
const MAX_TOKENS: Record<TypeCase, number> = {
  'nom': 8,
  'verbe': 8,
  'verbe-transitif': 8,
  'adjectif': 8,
  'adverbe': 10,
  'groupe-nominal': 10,
  'groupe-verbal': 16,
  'proposition': 24,
  'libre': 24,
  'article-adj': 10,
}

// Contraintes de longueur explicites dans le prompt
const CONTRAINTES: Record<TypeCase, string> = {
  'nom': '1 MOT SEUL — jamais d\'article, jamais 2 mots (ex: "cœur", "nuage", "cendre", "os")',
  'verbe': '1 MOT — VERBE CONJUGUÉ à la 3e personne du singulier (tout temps : "dévore", "hantait", "boira", "frôle", "vacilla", "glissera"). INTERDIT ABSOLU : adjectifs (sourd, pâle, brisé…), noms, participes passés non conjugués, adverbes.',
  'verbe-transitif': '1 MOT — VERBE TRANSITIF DIRECT conjugué à la 3e personne du singulier, qui appelle un complément d\'objet (tout temps : "dévore", "effleurait", "rongera", "soulève"). INTERDIT ABSOLU : verbes intransitifs (trembler, vaciller, tressaillir…), verbes pronominaux, adjectifs, noms, adverbes.',
  'adjectif': '1 MOT SEUL (adjectif qualificatif — ex : "nocturne", "brisé", "sourd", "profond")',
  'adverbe': '1 SEUL ADVERBE INVARIABLE (en -ment : "doucement", "obliquement") ou une locution adverbiale de 2 mots ("sans bruit", "à rebours"). INTERDIT ABSOLU : adjectifs (pesant, sourd…), noms, verbes.',
  'groupe-nominal': '2 MOTS EXACTEMENT : article + nom — ex : "le silence", "une ombre", "la pluie", "un couteau". JAMAIS d\'adjectif après le nom.',
  'groupe-verbal': '3 à 4 mots — verbe conjugué à la 3e personne du singulier + complément AVEC son article ou sa préposition (ex : "traverse la nuit", "pèse sur le monde"). JAMAIS de complément sans article ("cède terrain" est INTERDIT, "cède du terrain" est correct).',
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
  'verbe-transitif': ['dévore', 'effleure', 'avale', 'fissure', 'traverse', 'ronge', 'soulève',
                      'recoud', 'berce', 'creuse', 'apprivoise', 'engloutit', 'caresse', 'déchire',
                      'hante', 'épouse', 'retient', 'efface'],
  'adjectif': ['immobile', 'pâle', 'profond', 'étrange', 'brisé', 'nocturne', 'creux', 'lourd',
               'froid', 'sourd', 'amer', 'voilé', 'opaque', 'lent', 'nu', 'aigre',
               'muet', 'dense', 'sombre', 'fragile'],
  'adverbe': ['doucement', 'lentement', 'en silence', 'sans bruit', 'à jamais', 'encore', 'ailleurs',
              'en vain', 'presque', 'toujours', 'parfois', 'nulle part', 'jadis', 'désormais'],
  'groupe-nominal': [
    "l'ombre", 'la nuit', 'un souffle', 'la cendre',
    'le bruit', 'une lumière', 'la terre', 'un regard',
    'la pluie', 'un mur', 'la main',
    'le silence', 'le bord', 'une voix', "l'eau",
    'le corps', 'une ombre', 'la porte', 'un feu',
    'le ventre', 'une bouche', 'le ciel', 'un os',
    'la pierre', 'un crâne', 'le sel', 'une racine',
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
  'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'notre', 'votre', 'leur',
])

const ADVERBES_INVARIABLES = new Set([
  'encore', 'toujours', 'jamais', 'ailleurs', 'presque', 'parfois', 'souvent', 'déjà',
  'demain', 'hier', 'ici', 'là', 'loin', 'partout', 'jadis', 'désormais', 'soudain',
  'ensemble', 'dedans', 'dehors', 'tard', 'tôt', 'vite', 'mal', 'bien', 'peu', 'trop',
  'ensuite', 'pourtant', 'longtemps', 'autrefois', 'alentour', 'çà',
])
// Premiers mots admis pour une locution adverbiale de 2 mots (« sans bruit », « à rebours », « nulle part »)
const TETES_LOCUTION_ADV = new Set([
  'à', 'au', 'aux', 'en', 'sans', 'sous', 'de', 'par', 'pour', 'vers', 'contre',
  'dans', 'entre', 'sur', 'nulle', 'quelque', 'tout', 'là-bas',
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
    case 'verbe':
    case 'verbe-transitif': {
      if (mots.length > 3) return mots.slice(0, 2).join(' ')
      return t
    }
    case 'adverbe': {
      // Un adjectif glissé dans la case adverbe (« pesants ») casse l'accord du
      // vers cousu et la correction le protège ensuite comme un adverbe : on
      // n'accepte qu'un -ment, un invariable connu ou une locution adverbiale.
      if (mots.length === 1) {
        const w = mots[0].toLowerCase()
        return /ment$/.test(w) || ADVERBES_INVARIABLES.has(w) ? t : ''
      }
      if (mots.length === 2 && TETES_LOCUTION_ADV.has(mots[0].toLowerCase())) return t
      return ''
    }
    case 'groupe-nominal': {
      // Strictement article + nom — un GN sans article (« racines », « chair opposée »)
      // casse la syntaxe du vers cousu : on rejette → fallback avec article garanti
      const gn = mots.length > 2 ? mots.slice(0, 2).join(' ') : t
      const gm = gn.split(/\s+/)
      if (gm.length === 1) return /^[lLdD][''’]\S+/.test(gm[0]) ? gn : ''
      return ARTICLES_FR.has(gm[0].toLowerCase()) ? gn : ''
    }
    default:
      return t
  }
}

function pickFallback(type: TypeCase, eviter: string[] = []): string {
  const arr = FALLBACKS[type] ?? FALLBACKS['libre']
  // Prefer fallback words that haven't already been used in the game
  const used = new Set(eviter.map(m => m.toLowerCase()))
  const dispo = arr.filter(m => !used.has(m.toLowerCase()))
  const pool = dispo.length ? dispo : arr
  return pool[Math.floor(Math.random() * pool.length)]
}

const TYPES_VALIDES: Set<string> = new Set([
  'nom', 'verbe', 'verbe-transitif', 'adjectif', 'adverbe',
  'groupe-nominal', 'groupe-verbal',
  'proposition', 'libre', 'article-adj',
])

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 60)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' })
    return
  }

  const { consigne, type, voiceId, contexte, eviter, mots } = req.body ?? {}

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
    res.status(200).json({ texte: pickFallback(type as TypeCase), source: 'fallback' })
    return
  }

  const voix = voiceId
    ? (VOIX.find(v => v.id === voiceId) ?? choisirVoixAleatoire())
    : choisirVoixAleatoire()
  // Mode atelier : nombre de mots imposé dynamiquement (1 à 8) — prime sur la contrainte du type
  const motsCible = Number.isInteger(mots) && mots >= 1 && mots <= 8 ? (mots as number) : null
  const maxTokens = motsCible
    ? Math.min(motsCible * 4 + 8, 44)
    : (MAX_TOKENS[type as TypeCase] ?? 14)
  // Vers entier ('libre') : la voix écrit seule tout le vers — il doit être
  // grammatical et garder ses articles. « N mots exactement, pas une phrase
  // complète » produisait des télégrammes (« câble vibre chair absente froide »).
  const contrainte = motsCible
    ? (type === 'libre'
      ? `environ ${motsCible} mots — un vers COMPLET et grammatical : un sujet avec son article et un verbe conjugué, ou une image nominale complète. JAMAIS de style télégraphique : chaque nom garde son article. Sans ponctuation finale.`
      : `${motsCible} MOT${motsCible > 1 ? 'S' : ''} EXACTEMENT — un fragment de vers, pas une phrase complète, sans ponctuation`)
    : (CONTRAINTES[type as TypeCase] ?? '2 à 4 mots')
  // Strip the « — ex : … » part so examples never influence the AI (they're only for human players)
  const consigneIA = consigne.replace(/\s*[—–-]\s*ex\s*:.*$/i, '').trim()

  const echoLine = contexte
    ? `\nTu entends en écho : "${contexte}". Libre à toi d'y rebondir ou de l'ignorer — reste dans ton propre monde.`
    : ''

  // Anti-répétition : liste des mots déjà employés dans la partie, à ne jamais réutiliser.
  // Le vocabulaire reste libre — on interdit seulement les doublons exacts déjà sortis.
  const motsEviter = Array.isArray(eviter)
    ? [...new Set(eviter.filter((m: unknown): m is string => typeof m === 'string' && m.trim().length > 0)
        .map((m: string) => m.trim().toLowerCase()))].slice(0, 60)
    : []
  const eviterLine = motsEviter.length
    ? `\nINTERDICTION ABSOLUE de réutiliser ces mots déjà employés (trouve autre chose) : ${motsEviter.join(', ')}.`
    : ''

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25_000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        stop_sequences: ['.', '!', '?'],
        system: voix.systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Écris UNIQUEMENT le fragment demandé, sans ponctuation finale, sans explication.\nType : ${consigneIA}.\nContrainte absolue : ${contrainte}.\nReste fidèle à ta manière de voir. Évite le mot le plus attendu et les clichés.${echoLine}${eviterLine}\nRéponds avec le fragment seul.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}`)
    }

    const data = await response.json()
    const brut = (data.content?.[0]?.text ?? '').trim()
    let propre = brut
      .replace(/\*+([^*]*)\*+/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\d{1,2}\s+\w+\s+\d{4}/g, '')
      .replace(/[.!?;,]+$/, '')
      .trim()

    // Plafond de tokens atteint → le dernier mot est probablement tronqué (« l'asymét ») : on le retire
    if (data.stop_reason === 'max_tokens') {
      propre = propre.replace(/\s*\S+$/, '').trim()
    }

    // Detect meta-responses where the AI explains its task instead of generating poetic content
    const isMetaResponse =
      /^je vais\b/i.test(propre) ||
      /^voici\b/i.test(propre) ||
      /^d['']accord\b/i.test(propre) ||
      /^bien s[uû]r\b/i.test(propre) ||
      /^pour\s+(répondre|compléter|créer|générer)\b/i.test(propre) ||
      /\bétapes?\b/i.test(propre) ||
      propre.endsWith(':')

    let texte = isMetaResponse ? '' : normaliserSortie(propre, type as TypeCase)
    // Si un nombre de mots est imposé, tronquer doucement les débordements.
    // Pour un vers entier ('libre'), couper en plein vers recréerait le
    // télégramme : on tolère le dépassement, garde-fou à 9 mots seulement.
    if (texte && motsCible) {
      const m = texte.split(/\s+/)
      const plafond = type === 'libre' ? Math.max(motsCible + 3, 9) : motsCible + 1
      if (m.length > plafond) texte = m.slice(0, type === 'libre' ? plafond : motsCible).join(' ')
    }
    res.status(200).json({
      texte: texte || pickFallback(type as TypeCase, motsEviter),
      source: texte ? 'ia' : 'fallback',
      voixNom: voix.id,
    })
  } catch (err) {
    console.error('Erreur Claude API:', err)
    res.status(200).json({ texte: pickFallback(type as TypeCase, motsEviter), source: 'fallback' })
  } finally {
    clearTimeout(timer)
  }
}
