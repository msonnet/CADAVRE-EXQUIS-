export const config = { maxDuration: 30 }

import { checkRateLimit, getClientIp } from './_rateLimit.js'

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 30)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' }); return
  }

  const { texte, structureId, blocs } = req.body ?? {}
  if (typeof texte !== 'string' || !texte) { res.status(400).json({ error: 'texte requis' }); return }
  if (texte.length > 1500) { res.status(400).json({ error: 'texte trop long' }); return }

  // Vers libre : chaque vers est écrit en entier par un joueur — aucun accord inter-blocs
  if (structureId === 'vers-libre') { res.status(200).json({ texte }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(200).json({ texte }); return }

  // Build a structured prompt when individual blocs are available (always preferred).
  // Without blocs, the model can't know which words are invariable → corrections are unreliable.
  let prompt: string

  if (Array.isArray(blocs) && blocs.length > 0) {
    if (structureId === 'phrase-etoffee' && blocs.length === 7) {
      // 7 blocs — canonique de Breton.
      // Approche sémantique : Claude identifie le nom noyau de chaque groupe
      // plutôt que de supposer que bloc 2 = nom sujet (les joueurs font des erreurs).
      const labels = [
        'article + adjectif épithète',
        'nom sujet (prévu)',
        'adjectif du sujet',
        'verbe conjugué',
        'article + adjectif épithète',
        'nom COD (prévu)',
        'adjectif du COD',
      ]
      const blocLines = blocs.map((b, i) =>
        `  Bloc ${i + 1} (${labels[i]}) : «${b.texte.trim()}»`
      ).join('\n')

      prompt = `Tu es un correcteur de grammaire française pour le jeu du cadavre exquis.

Sept joueurs ont chacun écrit un bloc en aveugle, dans cet ordre :
${blocLines}

Phrase assemblée : «${texte}»

TÂCHE — effectue exactement ces étapes dans l'ordre :
1. Identifie le NOM PRINCIPAL du groupe sujet (cherche dans les blocs 1, 2 et 3 — les joueurs font parfois des erreurs de catégorie).
2. Accorde le déterminant et les adjectifs des blocs 1 et 3 avec ce nom (genre et nombre).
3. Identifie le NOM PRINCIPAL du groupe COD (cherche dans les blocs 5, 6 et 7).
4. Accorde le déterminant et les adjectifs des blocs 5 et 7 avec ce nom (genre et nombre).
5. Garde rigoureusement identiques : tous les noms, le verbe (bloc 4), les adverbes.
6. Si un bloc "article + adjectif" ne contient pas d'adjectif mais un nom (ex : «la terreur», «le chagrin»), remplace-le par article + adjectif du bon genre, en gardant l'esprit surréaliste.

Réponds avec LA PHRASE CORRIGÉE UNIQUEMENT, sur une seule ligne, sans guillemets ni explication.`

    } else if (structureId === 'phrase-simple' && blocs.length === 3) {
      // 3 blocs : groupe-nominal sujet | verbe | groupe-nominal complément
      const roles = [
        'groupe nominal sujet',
        'verbe conjugué — INVARIABLE',
        'groupe nominal complément',
      ]
      const blocLines = blocs.map((b, i) =>
        `  Bloc ${i + 1} (${roles[i]}) : «${b.texte.trim()}»`
      ).join('\n')

      prompt = `Tu es un correcteur de grammaire française pour le cadavre exquis.

Chaque joueur a écrit UN bloc sans voir les autres :
${blocLines}

RÈGLES STRICTES :
1. Ne touche JAMAIS au verbe (bloc 2).
2. Dans chaque groupe nominal (blocs 1 et 3), corrige les accords INTERNES : l'article et tous les adjectifs doivent s'accorder en genre et en nombre avec le nom principal du groupe.
3. Ne change JAMAIS les noms eux-mêmes.
4. Conserve l'ordre des mots et tous les mots non-concernés par les accords.

Réponds avec LA PHRASE CORRIGÉE UNIQUEMENT, sur une seule ligne, sans guillemets ni explication.`

    } else {
      // Autre structure avec blocs — prompt générique structuré
      const blocLines = blocs.map((b, i) => `  Bloc ${i + 1} : «${b.texte.trim()}»`).join('\n')
      prompt = `Tu es un correcteur de grammaire française. Corrige uniquement les fautes d'accord en genre et en nombre (articles et adjectifs → accord avec leur nom). Ne modifie aucun mot lexical (noms, verbes, adverbes).

Blocs écrits par des joueurs différents :
${blocLines}

Réponds avec la phrase complète corrigée sur une seule ligne, sans guillemets ni explication.`
    }
  } else {
    // Fallback sans blocs — prompt générique sur le texte assemblé
    prompt = `Tu es un correcteur de grammaire française. La phrase ci-dessous est une phrase surréaliste issue d'un cadavre exquis. Corrige uniquement les fautes d'accord en genre et en nombre (articles et adjectifs doivent s'accorder avec leur nom). Ne modifie aucun mot lexical (noms, verbes, adverbes). Réponds avec la phrase corrigée uniquement, sur une seule ligne, sans guillemets ni explication.

Phrase : ${texte}`
  }

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic ${response.status}`)

    const data = await response.json()
    const corrige = (data.content?.[0]?.text ?? '')
      .trim()
      .split('\n')[0]  // keep only the first line in case the model adds a comment
      .replace(/^[«"''"]|[«»"''"]$/g, '')
      .trim()

    res.status(200).json({ texte: corrige || texte })
  } catch {
    res.status(200).json({ texte })
  } finally {
    clearTimeout(timer)
  }
}
