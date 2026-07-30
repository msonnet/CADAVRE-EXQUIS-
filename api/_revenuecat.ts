/**
 * Lecture directe de l'abonnement chez RevenueCat.
 *
 * Le webhook suffit au quotidien : achat, renouvellement, expiration
 * arrivent tout seuls. Mais le jeu n'a pas de compte durable — l'identité
 * est anonyme et attachée à l'appareil. Après une réinstallation, le joueur
 * repart avec un nouvel identifiant, et le webhook d'origine pointe sur
 * l'ancien.
 *
 * « Restaurer mes achats » côté client rattache l'appareil à son client
 * RevenueCat d'origine ; cette lecture serveur va alors chercher la date
 * d'expiration réelle et la repose chez nous. Le client n'affirme jamais
 * qu'il est abonné : il demande seulement qu'on vérifie.
 */

const ENTITLEMENT = 'encrier'

export interface AbonnementDistant {
  jusqua: string
  produit: string | null
}

export async function lireAbonnementDistant(userId: string): Promise<AbonnementDistant | null> {
  const cle = process.env.REVENUECAT_SECRET_KEY
  if (!cle) return null

  try {
    const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${cle}` },
    })
    // 404 : client inconnu de RevenueCat — il n'a simplement jamais acheté.
    if (!r.ok) return null

    const data = await r.json()
    const ent = data?.subscriber?.entitlements?.[ENTITLEMENT]
    const expire = ent?.expires_date
    if (typeof expire !== 'string') return null

    return {
      jusqua: expire,
      produit: typeof ent.product_identifier === 'string' ? ent.product_identifier : null,
    }
  } catch (err) {
    console.error('[revenuecat] lecture impossible', err)
    return null
  }
}

/**
 * Une lecture distante par joueur et par minute au plus : l'écran d'accueil
 * interroge son état à chaque ouverture, et RevenueCat n'a pas à répondre
 * pour chacune d'elles.
 */
const dernieres = new Map<string, number>()
const INTERVALLE_MS = 60_000

export function peutRelire(userId: string): boolean {
  const t = dernieres.get(userId)
  if (t !== undefined && Date.now() - t < INTERVALLE_MS) return false
  if (dernieres.size > 5000) {
    const limite = Date.now() - INTERVALLE_MS
    for (const [k, v] of dernieres) if (v < limite) dernieres.delete(k)
  }
  dernieres.set(userId, Date.now())
  return true
}
