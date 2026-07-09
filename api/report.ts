export const config = { maxDuration: 10 }

import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { clientAdmin, diagnosticEnv, urlProjet } from './_supabase.js'

const VALID_REASONS = ['inappropriate', 'spam', 'offensive', 'other'] as const

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Contenu inapproprié',
  spam: 'Spam',
  offensive: 'Contenu offensant',
  other: 'Autre',
}

/**
 * Notifie le modérateur par e-mail (Resend) — meilleur effort : un échec
 * d'envoi ne fait jamais échouer le signalement lui-même.
 * Config Vercel : RESEND_API_KEY + REPORT_EMAIL (adresse de réception,
 * qui doit être celle du compte Resend tant qu'aucun domaine n'est vérifié).
 */
async function notifierModerateur(
  sb: NonNullable<ReturnType<typeof clientAdmin>>,
  galleryId: string,
  reason: string,
  details: string | null,
): Promise<void> {
  const resendKey = (process.env.RESEND_API_KEY ?? '').trim()
  const dest = (process.env.REPORT_EMAIL ?? '').trim()
  if (!resendKey || !dest) return

  // Contexte de la publication visée (best effort)
  let contexte = ''
  try {
    const { data: item } = await sb
      .from('gallery')
      .select('titre, author_pseudo, type, created_at')
      .eq('id', galleryId)
      .single()
    if (item) {
      contexte = `Publication : ${item.type === 'dessin' ? 'dessin' : 'poème'} « ${item.titre ?? 'sans titre'} » de ${item.author_pseudo}\nPubliée le : ${item.created_at}\n`
    }
  } catch { /* la publication a pu être supprimée entre-temps */ }

  const ref = (() => {
    try { return new URL(urlProjet() ?? '').hostname.split('.')[0] } catch { return '' }
  })()
  const lien = ref
    ? `https://supabase.com/dashboard/project/${ref}/editor`
    : 'https://supabase.com/dashboard'

  const texte = [
    `Un contenu de la galerie vient d'être signalé.`,
    ``,
    `Motif : ${REASON_LABELS[reason] ?? reason}`,
    details ? `Détails : ${details}` : null,
    contexte || null,
    `ID galerie : ${galleryId}`,
    ``,
    `→ Examiner et modérer : ${lien}`,
    `(tables gallery_reports et gallery)`,
    ``,
    `Rappel App Store : traiter les signalements sous 24 h.`,
  ].filter(l => l !== null).join('\n')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Cadavre Exquis <onboarding@resend.dev>',
      to: [dest],
      subject: `⚑ Signalement galerie — ${REASON_LABELS[reason] ?? reason}`,
      text: texte,
    }),
  })
}

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
      res.status(500).json({ error: 'Erreur lors du signalement', code: error.code ?? null, message: (error.message ?? '').slice(0, 160) }); return
    }

    // E-mail au modérateur — attendu avant la réponse (les fonctions
    // serverless gèlent après res.json), mais jamais bloquant en cas d'échec.
    try {
      await notifierModerateur(sb, gallery_id, reason, typeof details === 'string' ? details.slice(0, 500) : null)
    } catch { /* le signalement est enregistré ; l'e-mail est best effort */ }

    res.status(200).json({ ok: true })
  } catch (e) {
    // Jamais de FUNCTION_INVOCATION_FAILED : toujours une reponse JSON
    res.status(500).json({ error: 'Erreur interne', detail: String(e).slice(0, 200) })
  }
}
