import { clientAdmin } from './_supabase.js'

/**
 * Webhook du magasin (RevenueCat).
 *
 * C'est le seul endroit où le statut d'abonné s'écrit. L'application ne
 * décide jamais qu'elle a été payée : elle lit un état que seul ce rappel
 * serveur a pu poser, après qu'Apple ou Google ont validé la transaction.
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
