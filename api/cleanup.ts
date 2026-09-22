export const config = { maxDuration: 60 }

import { cors } from './_cors.js'
import {
  chainesAsceller, poserVersDeVoix, sceller, dernierMot,
  PLANCHER_VERS, MOTS_MAX, CARACTERES_MAX,
} from './_jour.js'
import { choisirVoixAleatoire, promptSysteme } from './_voices.js'

/**
 * Le ménage quotidien — les salons expirés, puis les poèmes du jour écoulé.
 *
 * ── Pourquoi DEUX travaux dans une seule route ────────────────────────────
 *
 * Le plan Hobby de Vercel autorise douze fonctions serverless par
 * déploiement. Le projet en comptait dix ; le poème du jour en ajoutait
 * trois, ce qui faisait treize — et le build échouait sans que rien, dans
 * l'application, ne le laisse voir : les anciennes routes continuaient de
 * répondre depuis le déploiement précédent.
 *
 * Le scellement rejoint donc le nettoyage. Ce n'est pas un pis-aller : les
 * deux sont des travaux de fin de journée, déclenchés par le même cron, et
 * aucun des deux ne répond à un joueur. Ils avaient de toute façon vocation
 * à partager une horloge.
 *
 * Appelable à la main : GET /api/cleanup?secret=<CRON_SECRET>
 */
export default async function handler(req: any, res: any): Promise<void> {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers['authorization']
  const querySecret = req.query?.secret

  // Allow Vercel Cron (sends Bearer token) or manual call with ?secret=
  const authorized =
    (secret && authHeader === `Bearer ${secret}`) ||
    (secret && querySecret === secret) ||
    (!secret) // no secret configured → open (dev mode)

  if (!authorized) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.startsWith('http')) supabaseUrl = 'https://' + supabaseUrl
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' })
    return
  }

  try {
    // Call the cleanup_expired_rooms() Supabase function defined in the initial migration
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/cleanup_expired_rooms`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('cleanup_expired_rooms failed:', response.status, text)
      res.status(502).json({ error: 'Supabase RPC failed', status: response.status })
      return
    }

    console.log('cleanup_expired_rooms: success')
  } catch (err) {
    console.error('cleanup error:', err)
    res.status(500).json({ error: 'Internal error' })
    return
  }

  // ── Puis les poèmes du jour écoulé ──
  // Un scellement qui échoue ne doit pas faire échouer le nettoyage, qui a
  // déjà réussi : on rend compte des deux séparément.
  let chaines: unknown[] = []
  try {
    chaines = await scellerLesChainesDues()
  } catch (err) {
    console.error('[sceller-jour]', err)
  }

  res.status(200).json({ ok: true, chaines, ts: new Date().toISOString() })
}

/**
 * Scelle les poèmes des jours écoulés, en complétant au plancher.
 *
 * Ne touche JAMAIS à la journée en cours : une chaîne appartient à sa
 * journée jusqu'à son dernier instant, et une chaîne scellée ne se rouvre
 * pas.
 *
 * Les voix complètent au plancher, et rien de plus. Chacune reçoit l'ÉCHO
 * comme tout le monde — une voix qui verrait le poème entier écrirait une
 * chute, pas un vers de cadavre exquis — et l'écho passe de voix en voix,
 * si bien que la chaîne reste une chaîne jusqu'au bout.
 *
 * Un vers manqué ne bloque pas : mieux vaut un poème de trois vers qu'une
 * chaîne d'hier qui traîne ouverte et qu'un joueur retrouve le lendemain
 * sans comprendre.
 */
async function scellerLesChainesDues() {
  const dues = await chainesAsceller()
  const compte: { jour: string; langue: string; voix: number; scelle: boolean }[] = []

  for (const c of dues) {
    let echo = dernierMot(c.dernier)
    let posees = 0
    for (let i = 0; i < c.manque; i++) {
      const rang = PLANCHER_VERS - c.manque + i + 1
      const voix = choisirVoixAleatoire()
      const texte = await versDeVoix(voix, echo, c.langue)
      if (!texte) break
      // On stocke l'IDENTIFIANT de la voix, pas son nom : les libellés
      // bilingues vivent dans `src/data/voiceIds.ts`, et un poème d'hier ne
      // doit pas être figé dans la langue du serveur.
      if (!(await poserVersDeVoix(c.id, rang, texte, voix.id))) break
      echo = dernierMot(texte)
      posees++
    }
    const ok = await sceller(c.id)
    compte.push({ jour: c.jour, langue: c.langue, voix: posees, scelle: ok })
  }
  return compte
}


/**
 * Ce qu'on garde de la réponse du modèle.
 *
 * Il rend parfois plusieurs lignes, des guillemets, un point final, ou une
 * strophe entière quand la consigne l'inspire trop. Un vers de voix qui
 * déborderait casserait la règle que les mains humaines subissent — et la
 * chaîne serait injuste avant d'être belle. Sorti de l'appel réseau pour
 * être mesurable.
 */
export function nettoyerVersDeVoix(brut: string): string | null {
  const ligne = String(brut ?? '').split('\n').map(s => s.trim()).filter(Boolean)[0] ?? ''
  const propre = ligne.replace(/^[«»"'\s]+|[«»"'\s.,;:!?]+$/g, '').trim()
  if (!propre) return null
  if (propre.length > CARACTERES_MAX) return null
  if (propre.split(/\s+/).filter(Boolean).length > MOTS_MAX) return null
  return propre
}

/** Un vers de voix, écrit sur le seul écho. */
async function versDeVoix(voix: any, echo: string, langue: string): Promise<string | null> {
  const cle = process.env.ANTHROPIC_API_KEY
  if (!cle) return null

  const consigne = langue === 'en'
    ? `Write ONE line of surrealist free verse, 3 to 8 words, no final full stop. The previous line ended on the word "${echo}" — that is all you know of the poem. Answer with the line alone.`
    : `Écris UN vers de poésie surréaliste, 3 à 8 mots, sans point final. Le vers précédent finissait sur le mot « ${echo} » — c'est tout ce que tu sais du poème. Réponds par le seul vers.`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cle,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 60,
        system: promptSysteme(voix),
        messages: [{ role: 'user', content: consigne }],
      }),
    })
    if (!r.ok) return null
    const data = await r.json()
    return nettoyerVersDeVoix(String(data?.content?.[0]?.text ?? ''))
  } catch {
    return null
  }
}
