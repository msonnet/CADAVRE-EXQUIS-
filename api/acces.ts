import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { utilisateurDuJeton, etatAcces, consommer, PLAFOND_JOUR } from './_acces.js'
import { lireAbonnementDistant, peutRelire } from './_revenuecat.js'
import { clientAdmin } from './_supabase.js'

/**
 * État d'accès du joueur, et ouverture d'une partie avec les voix de l'IA.
 *
 * GET  → { abonne, jusqua, essai: { images, parties, lectures }, plafonds }
 * POST { partieId } → règle la partie une fois pour toutes ; les fragments
 *        qui suivront sur /api/claude passeront ensuite librement.
 *
 * On ne décompte qu'au lancement, jamais en cours de partie : un poème ne
 * doit pas s'interrompre au huitième vers parce que la réserve s'est vidée.
 */
export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).end(); return }

  if (!checkRateLimit(getClientIp(req), 60)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' })
    return
  }

  const userId = await utilisateurDuJeton(req)
  if (!userId) { res.status(401).json({ error: 'auth_requise' }); return }

  if (req.method === 'GET') {
    let etat = await etatAcces(userId)
    if (!etat) { res.status(503).json({ error: 'indisponible' }); return }

    // Pas d'abonnement chez nous : on demande à RevenueCat s'il en connaît
    // un. C'est ce qui fait marcher « Restaurer mes achats » après une
    // réinstallation, sans jamais croire le client sur parole.
    if (!etat.abonne && peutRelire(userId)) {
      const distant = await lireAbonnementDistant(userId)
      if (distant) {
        const admin = clientAdmin()
        await admin?.rpc('poser_abonnement', {
          p_user: userId, p_jusqu_a: distant.jusqua, p_produit: distant.produit,
        })
        etat = (await etatAcces(userId)) ?? etat
      }
    }

    res.status(200).json({ ...etat, plafonds: PLAFOND_JOUR })
    return
  }

  const { partieId, mode } = req.body ?? {}
  if (typeof partieId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(partieId)) {
    res.status(400).json({ error: 'partieId invalide' })
    return
  }

  const verdict = await consommer(userId, 'partie_ia', partieId, {
    mode: typeof mode === 'string' ? mode.slice(0, 24) : undefined,
  })

  if (!verdict.autorise) {
    res.status(402).json({
      autorise: false,
      motif: verdict.motif ?? 'essai_epuise',
      abonne: verdict.abonne,
      plafond: verdict.plafond,
    })
    return
  }

  res.status(200).json({
    autorise: true,
    abonne: verdict.abonne,
    essaiRestant: verdict.essaiRestant,
  })
}
