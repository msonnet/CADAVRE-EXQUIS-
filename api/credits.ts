import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { utilisateurDuJeton, etatCredits, ALLOCATION_MENSUELLE, COUT_ILLUSTRATION } from './_credits.js'

/**
 * Solde de crédits du joueur.
 *
 * GET (jeton de session en Authorization) → { solde, allocationMensuelle, couts }
 * L'allocation du mois est appliquée au passage : le premier appel de chaque
 * mois civil crédite, les suivants ne font que lire.
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

  const etat = await etatCredits(userId)
  if (!etat) { res.status(503).json({ error: 'indisponible' }); return }

  res.status(200).json({
    solde: etat.solde,
    allocationMensuelle: ALLOCATION_MENSUELLE,
    couts: COUT_ILLUSTRATION,
  })
}
