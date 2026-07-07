export const config = { maxDuration: 10 }

import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'

const VALID_REASONS = ['inappropriate', 'spam', 'offensive', 'other'] as const

export default async function handler(req: any, res: any): Promise<void> {
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

  // Même repli que cleanup.ts : la prod Vercel ne définit que VITE_SUPABASE_URL
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { res.status(503).json({ error: 'Service indisponible' }); return }

  const sb = createClient(url, key, { auth: { persistSession: false } })

  const { error } = await sb.from('gallery_reports').insert({
    gallery_id,
    reason,
    details: typeof details === 'string' ? details.slice(0, 500) : null,
    reporter_id: typeof reporter_id === 'string' ? reporter_id : null,
  })

  if (error) {
    // 23505 = unique_violation → user already reported this item
    if (error.code === '23505') {
      res.status(200).json({ ok: true, already: true }); return
    }
    res.status(500).json({ error: 'Erreur lors du signalement' }); return
  }

  res.status(200).json({ ok: true })
}
