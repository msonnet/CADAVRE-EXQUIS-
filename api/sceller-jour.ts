import { cors } from './_cors.js'
import {
  chainesAsceller, poserVersDeVoix, sceller, dernierMot,
  PLANCHER_VERS, MOTS_MAX, CARACTERES_MAX,
} from './_jour.js'
import { choisirVoixAleatoire, promptSysteme } from './_voices.js'

export const config = { maxDuration: 60 }

/**
 * Scelle les poèmes du jour écoulé.
 *
 * Appelé par le cron à 00 h 30 UTC, une demi-heure après la fermeture de la
 * journée. Il ne touche JAMAIS à la journée en cours : une chaîne appartient
 * à sa journée jusqu'à son dernier instant, et une chaîne scellée ne se
 * rouvre pas.
 *
 * ── Pourquoi une fois par jour et non toutes les heures ───────────────────
 *
 * Premier jet : `5 * * * *`. Le plan Hobby de Vercel n'autorise qu'un
 * déclenchement quotidien et REJETTE la configuration avant même de
 * construire — tous les déploiements ont échoué en six secondes, sans logs,
 * pendant que l'ancien restait servi. La panne ne se voyait donc que depuis
 * GitHub, où le statut du commit portait « Deployment failed ».
 *
 * Une fois par jour suffit : cette route ne ferme que des journées écoulées.
 * Le seul effet du rythme est le délai avant qu'un poème devienne lisible,
 * et une demi-heure après minuit est plus proche du rendez-vous que ne
 * l'était le cron horaire dans le pire des cas.
 *
 * ── Ce que les voix font, et c'est peu ────────────────────────────────────
 *
 * Elles complètent au plancher, et rien de plus. Moins de cinq mains sont
 * venues ? on monte à cinq. Au-delà, aucune voix n'intervient — la longueur
 * du poème doit rester la mesure de la journée.
 *
 * Le coût est donc borné par le plancher et jamais par la foule : quatre
 * appels par jour au maximum, zéro dès cinq joueurs. C'est ce qui permet au
 * rendez-vous de ne rien décompter à personne.
 *
 * ── Chaque voix reçoit l'écho, comme tout le monde ────────────────────────
 *
 * Une voix qui verrait le poème entier écrirait une chute, pas un vers de
 * cadavre exquis. Elle est aveugle exactement comme les mains : un mot, et
 * l'ordre d'écrire un vers.
 *
 * ── Un vers manqué ne bloque pas le scellement ────────────────────────────
 *
 * Si le modèle ne répond pas, on scelle quand même avec ce qu'on a. Un poème
 * de trois vers vaut mieux qu'une chaîne d'hier qui traîne ouverte et qu'un
 * joueur retrouve le lendemain sans comprendre.
 */
export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return

  const secret = process.env.CRON_SECRET
  const autorise =
    (secret && req.headers['authorization'] === `Bearer ${secret}`) ||
    (secret && req.query?.secret === secret) ||
    !secret
  if (!autorise) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
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
        // La voix suivante reçoit l'écho de celle-ci : la chaîne reste une
        // chaîne jusqu'au bout, y compris entre deux voix.
        echo = dernierMot(texte)
        posees++
      }
      const ok = await sceller(c.id)
      compte.push({ jour: c.jour, langue: c.langue, voix: posees, scelle: ok })
    }

    res.status(200).json({ ok: true, chaines: compte, ts: new Date().toISOString() })
  } catch (err) {
    console.error('[sceller-jour]', err)
    res.status(500).json({ error: 'Internal error' })
  }
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
