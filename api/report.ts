export const config = { maxDuration: 10 }

import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { clientAdmin, diagnosticEnv } from './_supabase.js'

const VALID_REASONS = ['inappropriate', 'spam', 'offensive', 'other'] as const

export default async function handler(req: any, res: any): Promise<void> {
  try {
    if (req.method !== 'POST') { res.status(405).end(); return }

    const ip = getClientIp(req)
    if (!checkRateLimit(`report:${ip}`, 5)) {
      res.status(429).json({ error: 'Trop de signalements. Réessayez dans une minute.' }); return
    }

    const { gallery_id, reason, details, reporter_id } = req.body ?? {}
    if (typeof gallery_id !== 'string' || !gallery_id) {
      res.status(400).json({ error: 'gallery_id requis' }); return
    }
    if (!VALID_REASONS.includes(reason)) {
      res.status(400).json({ error: 'reason invalide' }); return
    }

    const sb = clientAdmin()
    if (!sb) { res.status(503).json({ error: 'Service indisponible', diagnostic: diagnosticEnv() }); return }

    const { error } = await sb.from('gallery_reports').insert({
      gallery_id,
      reason,
      details: typeof details === 'string' ? details.slice(0, 500) : null,
      reporter_id: typeof reporter_id === 'string' ? reporter_id : null,
    })

    if (error) {
      // 23505 = unique_violation -> deja signale par cet utilisateur
      if (error.code === '23505') {
        res.status(200).json({ ok: true, already: true }); return
      }
      res.status(500).json({ error: 'Erreur lors du signalement', code: error.code ?? null }); return
    }

    res.status(200).json({ ok: true })
  } catch (e) {
    // Jamais de FUNCTION_INVOCATION_FAILED : toujours une reponse JSON
    res.status(500).json({ error: 'Erreur interne', detail: String(e).slice(0, 200) })
  }
}
