export const config = { maxDuration: 10 }

import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { clientAdmin, diagnosticEnv } from './_supabase.js'

/**
 * Suppression de compte (App Store guideline 5.1.1(v)).
 * Authentifiée par le jeton de session de l'utilisateur — chacun ne peut
 * supprimer que son propre compte. Les publications de la galerie sont
 * anonymisées (le cadavre exquis est une œuvre collective), tout le reste
 * (profil, présences salon, compte auth) est supprimé.
 */
export default async function handler(req: any, res: any): Promise<void> {
  try {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const ip = getClientIp(req)
  if (!checkRateLimit(`delete-account:${ip}`, 3)) {
    res.status(429).json({ error: 'Trop de tentatives. Réessaie dans une minute.' }); return
  }

  const auth: string = req.headers?.authorization ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) { res.status(401).json({ error: 'Non authentifié' }); return }

  const sb = clientAdmin()
  if (!sb) { res.status(503).json({ error: 'Service indisponible', diagnostic: diagnosticEnv() }); return }

  const { data: { user }, error: userErr } = await sb.auth.getUser(token)
  if (userErr || !user) { res.status(401).json({ error: 'Session invalide' }); return }
  const uid = user.id

  // Anonymiser les publications (l'œuvre reste, l'identité part)
  await sb.from('gallery')
    .update({ author_id: null, author_pseudo: 'Anonyme', author_avatar: null })
    .eq('author_id', uid)

  // Détacher toute référence restante avant de supprimer le compte auth :
  // une FK vers auth.users sans ON DELETE CASCADE ferait échouer deleteUser.
  await sb.from('gallery_reports').update({ reporter_id: null }).eq('reporter_id', uid)
  await sb.from('rooms').update({ host_id: null }).eq('host_id', uid)

  // Retirer des salons en cours et effacer le profil
  await sb.from('room_players').delete().eq('player_id', uid)
  await sb.from('profiles').delete().eq('id', uid)

  const { error: delErr } = await sb.auth.admin.deleteUser(uid)
  if (delErr) {
    res.status(500).json({ error: 'Suppression impossible — réessaie.' }); return
  }

  res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Erreur interne', detail: String(e).slice(0, 200) })
  }
}
