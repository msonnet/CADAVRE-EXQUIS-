export const config = { maxDuration: 30 }

// Called by Vercel Cron every hour to delete expired rooms and dangling data.
// Also callable manually: GET /api/cleanup?secret=<CRON_SECRET>
export default async function handler(req: any, res: any): Promise<void> {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers['authorization']
  const querySecret = req.query?.secret

  // Allow Vercel Cron (sends Bearer token) or manual call with ?secret=
  const authorized =
    (secret && authHeader === `Bearer ${secret}`) ||
    (secret && querySecret === secret) ||
    (!secret) // no secret configured → open (dev mode)

  if (!authorized) {
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
    res.status(200).json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    console.error('cleanup error:', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
