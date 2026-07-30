export const config = { maxDuration: 45 }

import { cors } from './_cors.js'
import { utilisateurDuJeton, consommer, rendre, PLAFOND_JOUR } from './_acces.js'

// ~5 Mo de base64 (≈ 3.7 Mo binaire) — assez pour un dessin assemblé en PNG
const MAX_BASE64_BYTES = 5 * 1024 * 1024

export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { imageBase64, langue } = req.body ?? {}
  const enAnglais = langue === 'en'
  if (typeof imageBase64 !== 'string' || !imageBase64) { res.status(400).json({ error: 'imageBase64 requis' }); return }
  if (imageBase64.length > MAX_BASE64_BYTES) { res.status(413).json({ error: 'image trop volumineuse' }); return }
  if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) { res.status(400).json({ error: 'base64 invalide' }); return }

  // Dessiner reste illimité ; seule la lecture surréaliste appelle un
  // serveur facturé. On décompte avant, on rend si elle échoue.
  const userId = await utilisateurDuJeton(req)
  if (!userId) { res.status(401).json({ error: 'auth_requise' }); return }

  const verdict = await consommer(userId, 'lecture_dessin')
  if (!verdict.autorise) {
    res.status(402).json({
      error: verdict.motif ?? 'essai_epuise',
      abonne: verdict.abonne,
      plafond: PLAFOND_JOUR.lecture_dessin,
    })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    await rendre(userId, verdict.event)
    res.status(200).json({ texte: '' })
    return
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
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: enAnglais
          ? `You are a surrealist poet. You receive an exquisite corpse drawing — several players each drew one band without seeing the rest.

You produce 1 to 3 lines of verse, no more. Never a title. Never explanatory punctuation. Never a literal description.

The shapes and their junctions trigger a flow of automatic language. You may rhyme if the drawing demands it, or leave the verse free. What matters: brevity, mystery, the surrealist surge. Write in English.`
          : `Tu es un poète surréaliste. Tu reçois un dessin cadavre exquis — plusieurs joueurs ont chacun dessiné une bande sans voir le reste.

Tu génères 1 à 3 vers, pas plus. Jamais de titre. Jamais de ponctuation explicative. Jamais de description littérale.

Les formes et les jonctions déclenchent un flux de langage automatique. Tu peux faire rimer les vers si le dessin l'impose, ou laisser le vers libre. L'essentiel : la brièveté, le mystère, le surgissement surréaliste. Écris en français.`,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: enAnglais
                ? 'Generate the lines this drawn cadavre imposes on you.'
                : 'Génère les vers que ce cadavre dessiné t\'impose.',
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic Vision error:', response.status)
      await rendre(userId, verdict.event)
      res.status(200).json({ texte: '' }); return
    }

    const data = await response.json()
    const texte = (data.content?.[0]?.text ?? '').trim()
    if (!texte) await rendre(userId, verdict.event)
    res.status(200).json({ texte, abonne: verdict.abonne, essaiRestant: verdict.essaiRestant })
  } catch (err) {
    console.error('Erreur interpreter-dessin:', err)
    await rendre(userId, verdict.event)
    res.status(200).json({ texte: '' })
  }
}

