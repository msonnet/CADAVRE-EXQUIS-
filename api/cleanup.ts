export const config = { maxDuration: 60 }

import { cors } from './_cors.js'
import {
  chainesAsceller, poserVersDeVoix, sceller, dernierMot,
  PLANCHER_VERS,
} from './_jour.js'
import { choisirVoixAleatoire } from './_voices.js'
import { ecrireVersDeVoix } from './_vers.js'

/**
 * Qui a le droit d'appeler le ménage.
 *
 * Vercel joint `CRON_SECRET` en jeton porteur à ses propres déclenchements ;
 * à la main, on le passe en paramètre.
 *
 * ── Ce qui change, et pourquoi ────────────────────────────────────────────
 *
 * Le premier jet ouvrait la porte quand AUCUN secret n'était configuré, pour
 * qu'un poste de développement n'ait rien à poser. C'était défendable tant
 * que la route n'appelait qu'une fonction SQL idempotente : au pire, on
 * nettoyait deux fois des salons déjà expirés.
 *
 * Elle scelle désormais les poèmes du jour, et le scellement appelle le
 * modèle — jusqu'à quatre fois par journée déserte. Une porte ouverte n'y
 * coûte plus rien à la base, elle coûte de l'argent réel, et à un inconnu.
 *
 * On garde donc l'ouverture SANS secret, mais hors production seulement.
 * Le prix est dit : tant que `CRON_SECRET` n'est pas posé chez Vercel, la
 * production refuse son propre cron et les poèmes ne se scellent pas. C'est
 * une panne visible — les poèmes d'hier restent fermés — là où une porte
 * ouverte ne se voit sur aucun écran.
 */
export function portailOuvert(
  secret: string | undefined,
  env: string | undefined,
  enTete: unknown,
  enParametre: unknown,
): boolean {
  if (secret) return enTete === `Bearer ${secret}` || enParametre === secret
  return env !== 'production'
}

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
  if (!portailOuvert(
    process.env.CRON_SECRET,
    process.env.VERCEL_ENV,
    req.headers['authorization'],
    req.query?.secret,
  )) {
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
    // `chainesAsceller` a déjà appliqué la règle de l'amorce : sur une
    // journée déserte, la première voix reçoit la graine entière.
    let echo = c.echo
    let posees = 0
    for (let i = 0; i < c.manque; i++) {
      const rang = PLANCHER_VERS - c.manque + i + 1
      const voix = choisirVoixAleatoire()
      const texte = await ecrireVersDeVoix(voix, echo, c.langue)
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


// `nettoyerVersDeVoix` et l'écriture du vers vivent dans `_vers.ts` : le
// scellement et le remplacement d'un vers retiré écrivent de la même façon,
// et comme l'Atelier écrit un vers entier.
export { nettoyerVersDeVoix } from './_vers.js'
