export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

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
      // 7 exact blocs — canonique de Breton
      // Invariable: nom (bloc 2, 6), verbe (bloc 4). Variable: article-adj (1,5), adjectif (3,7).
      const roles = [
        'article + adjectif épithète',
        'nom sujet — INVARIABLE, fait loi pour le genre',
        'adjectif qualifiant le sujet',
        'verbe conjugué — INVARIABLE',
        'article + adjectif épithète',
        'nom COD — INVARIABLE, fait loi pour le genre',
        'adjectif qualifiant le COD',
      ]
      const blocLines = blocs.map((b, i) =>
        `  Bloc ${i + 1} (${roles[i]}) : «${b.texte.trim()}»`
      ).join('\n')

      prompt = `Tu es un correcteur de grammaire française pour le cadavre exquis.

Chaque joueur a écrit UN bloc sans voir les autres :
${blocLines}

RÈGLES STRICTES — respecte-les à la lettre :
1. Ne touche JAMAIS aux blocs NOM (2 et 6) ni au VERBE (4) — ils sont invariables et font loi.
2. Bloc 1 : accorde l'article ET l'adjectif en genre et nombre avec le NOM du bloc 2.
3. Bloc 3 : accorde l'adjectif en genre et nombre avec le NOM du bloc 2.
4. Bloc 5 : accorde l'article ET l'adjectif en genre et nombre avec le NOM du bloc 6.
5. Bloc 7 : accorde l'adjectif en genre et nombre avec le NOM du bloc 6.
6. Si un bloc "article + adjectif" contient un nom commun à la place d'un adjectif (ex : "la terreur", "le chagrin"), remplace-le par UN ARTICLE + UN ADJECTIF du même genre que le nom associé (bloc 2 ou 6), en gardant un esprit surréaliste.
7. Conserve tous les mots lexicaux (noms, verbes, adverbes) tels quels.

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
  }
}
