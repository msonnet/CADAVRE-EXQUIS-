export const config = { maxDuration: 30 }

import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'

export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'POST') { res.status(405).end(); return }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 30)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' }); return
  }

  const { texte, structureId, blocs, langue } = req.body ?? {}
  const enAnglais = langue === 'en'
  if (typeof texte !== 'string' || !texte) { res.status(400).json({ error: 'texte requis' }); return }
  if (texte.length > 1500) { res.status(400).json({ error: 'texte trop long' }); return }

  // Vers libre : chaque vers est écrit en entier par un joueur — aucun accord inter-blocs
  if (structureId === 'vers-libre') { res.status(200).json({ texte }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(200).json({ texte }); return }

  // Build a structured prompt when individual blocs are available (always preferred).
  // Without blocs, the model can't know which words are invariable → corrections are unreliable.
  let prompt: string
  // Atelier : poème multiligne — chaque vers est corrigé indépendamment, la réponse garde une ligne par vers
  const multiligne = structureId === 'atelier' && Array.isArray(blocs) && blocs.length > 0

  if (enAnglais) {
    // L'anglais n'a ni genre ni accord d'adjectif — mais il a l'accord
    // sujet-verbe (-s de troisième personne) et le choix a/an. Les fragments
    // cousus à l'aveugle peuvent les briser : « the bundles seeps ».
    if (multiligne) {
      const versLines = (blocs as { texte: string }[]).map((b, i) => `${i + 1}. «${b.texte.trim()}»`).join('\n')
      prompt = `You are a grammar fixer for a surrealist poem in English. Each line was stitched blind from fragments written by several hands.

Lines:
${versLines}

STRICT RULES:
1. Within each line only: fix subject-verb agreement (third-person -s) and the article a/an before vowel sounds.
2. Never create agreement across different lines — each line is a closed world.
3. Never change any lexical word (nouns, verbs stay the same words — only their inflection may change), never reorder words.

Reply with EXACTLY ${(blocs as unknown[]).length} lines — the corrected lines in order, one per line, no numbering, no quotes, no comment.`
    } else {
      const blocLines = Array.isArray(blocs) && blocs.length > 0
        ? (blocs as { texte: string }[]).map((b, i) => `  Block ${i + 1}: «${b.texte.trim()}»`).join('\n')
        : ''
      prompt = `You are a grammar fixer for an exquisite-corpse sentence in English. Each block was written blind by a different player.
${blocLines ? `\nBlocks:\n${blocLines}\n` : ''}
Assembled sentence: «${texte}»

STRICT RULES:
1. Fix ONLY subject-verb agreement (third-person -s) and the article a/an before vowel sounds.
2. Never change any lexical word (nouns and verbs stay the same words — only their inflection may change), never reorder words, never add or remove words.

Reply with THE CORRECTED SENTENCE ONLY, on a single line, no quotes, no explanation.`
    }
  } else if (multiligne) {
    const versLines = (blocs as { texte: string }[]).map((b, i) => `${i + 1}. «${b.texte.trim()}»`).join('\n')
    prompt = `Tu es un correcteur de grammaire française pour un poème surréaliste en vers libres. Chaque vers a été cousu à partir de fragments écrits à l'aveugle par plusieurs mains — les accords internes peuvent être brisés.

Vers :
${versLines}

RÈGLES STRICTES :
1. Corrige uniquement les accords en genre et en nombre À L'INTÉRIEUR de chaque vers (articles et adjectifs s'accordent avec leur nom ; sujet et verbe en nombre).
2. Ne crée AUCUN accord entre vers différents — chaque vers est un monde clos.
3. Ne modifie aucun mot lexical (noms, verbes, adverbes restent identiques).
4. Conserve l'ordre des mots de chaque vers.

Réponds avec EXACTEMENT ${(blocs as unknown[]).length} lignes — les vers corrigés dans l'ordre, un par ligne, sans numérotation, sans guillemets, sans commentaire.`

  } else if (Array.isArray(blocs) && blocs.length > 0) {
    if (structureId === 'phrase-etoffee' && blocs.length === 5) {
      // 5 blocs — canonique de Breton « Le cadavre exquis boira le vin nouveau ».
      // article+nom · adjectif · verbe · article+nom · adjectif
      const labels = [
        'groupe nominal sujet (article + nom)',
        'adjectif du sujet',
        'verbe conjugué',
        'groupe nominal complément (article + nom)',
        'adjectif du complément',
      ]
      const blocLines = blocs.map((b, i) =>
        `  Bloc ${i + 1} (${labels[i]}) : «${b.texte.trim()}»`
      ).join('\n')

      prompt = `Tu es un correcteur de grammaire française pour le jeu du cadavre exquis.

Cinq joueurs ont chacun écrit un bloc en aveugle, dans cet ordre :
${blocLines}

Phrase assemblée : «${texte}»

TÂCHE — effectue exactement ces étapes dans l'ordre :
1. Identifie le NOM PRINCIPAL du groupe sujet (bloc 1).
2. Accorde l'adjectif du bloc 2 avec ce nom (genre et nombre). Accorde aussi l'article interne du bloc 1 si nécessaire.
3. Identifie le NOM PRINCIPAL du groupe complément (bloc 4).
4. Accorde l'adjectif du bloc 5 avec ce nom (genre et nombre). Accorde aussi l'article interne du bloc 4 si nécessaire.
5. Garde rigoureusement identiques : tous les noms, le verbe (bloc 3), les adverbes.

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
        max_tokens: multiligne ? 1000 : 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic ${response.status}`)

    const data = await response.json()
    const brut = (data.content?.[0]?.text ?? '').trim()

    if (multiligne) {
      // Une ligne corrigée par vers — si le compte ne correspond pas, on garde l'original
      const lignes = brut
        .split('\n')
        .map((l: string) => l.replace(/^\s*\d+[.)]\s*/, '').replace(/^[«"''"]|[«»"''"]$/g, '').trim())
        .filter((l: string) => l.length > 0)
      const attendu = (blocs as unknown[]).length
      res.status(200).json({ texte: lignes.length === attendu ? lignes.join('\n') : texte })
      return
    }

    const corrige = brut
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
