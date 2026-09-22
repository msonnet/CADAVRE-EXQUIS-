import { clientAdmin } from './_supabase.js'
import { crediterFlacon, imagesDuFlacon } from './_acces.js'

/**
 * Webhook du magasin (RevenueCat).
 *
 * C'est le seul endroit où le statut d'abonné s'écrit, et le seul où un
 * flacon se crédite. L'application ne décide jamais qu'elle a été payée :
 * elle lit un état que seul ce rappel serveur a pu poser, après qu'Apple ou
 * Google ont validé la transaction.
 *
 * L'`app_user_id` transmis par RevenueCat est l'identifiant Supabase du
 * joueur — c'est l'application qui le lui donne à l'ouverture de session.
 *
 * Tous les événements se ramènent à une seule écriture : la date
 * d'expiration. Un renouvellement la repousse, une résiliation la laisse
 * courir jusqu'au terme payé, une expiration la met dans le passé. Un seul
 * chemin, donc aucun état intermédiaire à maintenir.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }

  // RevenueCat renvoie l'en-tête Authorization tel qu'il est configuré dans
  // le tableau de bord. Sans secret configuré, on refuse : mieux vaut un
  // abonnement qui ne se pose pas qu'un abonnement que n'importe qui pose.
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) {
    console.error('[revenuecat] REVENUECAT_WEBHOOK_SECRET absent')
    res.status(503).json({ error: 'non_configure' })
    return
  }
  const recu = String(req.headers?.authorization ?? '').replace(/^Bearer\s+/i, '').trim()
  if (recu !== secret) { res.status(401).json({ error: 'signature_invalide' }); return }

  const evt = req.body?.event
  if (!evt || typeof evt !== 'object') { res.status(400).json({ error: 'evenement_absent' }); return }

  const type = String(evt.type ?? '')

  // Changement d'identité : RevenueCat rattache l'historique à un autre
  // identifiant. Rien à écrire, l'événement d'abonnement suivra.
  if (type === 'SUBSCRIBER_ALIAS' || type === 'TRANSFER') {
    console.log(`[revenuecat] ${type} ignoré`)
    res.status(200).json({ ok: true, ignore: type })
    return
  }

  const userId = String(evt.app_user_id ?? '')
  if (!UUID.test(userId)) {
    // Identifiant anonyme de RevenueCat ($RCAnonymousID:…) : la session
    // Supabase n'était pas ouverte à l'achat. Rien à rattacher.
    console.warn(`[revenuecat] app_user_id non rattachable (${type})`)
    res.status(200).json({ ok: true, ignore: 'app_user_id' })
    return
  }

  /*
    Le flacon — un achat NON RENOUVELABLE.

    Il doit être traité AVANT le contrôle d'`expiration_at_ms` : un
    consommable n'expire pas, il n'en porte donc aucune, et le garde
    ci-dessous le jetterait comme un événement malformé. C'est exactement
    le genre de panne qui ne se voit pas — l'achat est débité chez Apple,
    le joueur ne reçoit rien, et nos journaux disent « ignoré ».

    La quantité vient de la TABLE, jamais de l'événement : un identifiant
    de produit inconnu ne crédite rien.
  */
  if (type === 'NON_RENEWING_PURCHASE') {
    const images = imagesDuFlacon(evt.product_id)
    if (!images) {
      console.warn(`[revenuecat] produit non renouvelable inconnu : ${evt.product_id}`)
      res.status(200).json({ ok: true, ignore: 'produit_inconnu' })
      return
    }
    // `transaction_id` identifie l'achat chez le magasin ; à défaut, l'`id`
    // de l'événement. L'un des deux existe toujours, et il faut qu'il soit
    // stable d'un rejeu à l'autre — sans quoi l'idempotence ne tient plus.
    const reference = String(evt.transaction_id ?? evt.id ?? '')
    if (!reference) {
      console.error('[revenuecat] achat sans référence stable — non crédité')
      res.status(500).json({ error: 'reference_absente' })
      return
    }

    const { ok, credite } = await crediterFlacon(userId, images, reference)
    if (!ok) {
      // 500 : le magasin réessaiera. Laisser passer perdrait un achat payé.
      res.status(500).json({ error: 'ecriture_impossible' })
      return
    }
    console.log(`[revenuecat] flacon ${evt.product_id} → ${credite} image(s)`)
    res.status(200).json({ ok: true, images: credite })
    return
  }

  const ms = Number(evt.expiration_at_ms)
  if (!Number.isFinite(ms) || ms <= 0) {
    console.warn(`[revenuecat] ${type} sans expiration_at_ms`)
    res.status(200).json({ ok: true, ignore: 'sans_expiration' })
    return
  }

  const admin = clientAdmin()
  if (!admin) { res.status(503).json({ error: 'indisponible' }); return }

  const { error } = await admin.rpc('poser_abonnement', {
    p_user: userId,
    p_jusqu_a: new Date(ms).toISOString(),
    p_produit: typeof evt.product_id === 'string' ? evt.product_id : null,
  })

  if (error) {
    console.error('[revenuecat] écriture impossible', error.message)
    // 500 : RevenueCat réessaiera, et poser_abonnement est idempotente.
    res.status(500).json({ error: 'ecriture_impossible' })
    return
  }

  console.log(`[revenuecat] ${type} → ${new Date(ms).toISOString()}`)
  res.status(200).json({ ok: true })
}
