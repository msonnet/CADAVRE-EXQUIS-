// Distributed rate limiter using Supabase RPC.
// Falls back to in-memory Map if Supabase env vars are absent (local dev / test).
import { createClient } from '@supabase/supabase-js'

// ── In-memory fallback (single-instance only) ─────────────────────────────────
const store = new Map<string, number[]>()

function checkRateLimitMemory(key: string, maxPerMinute: number): boolean {
  const now = Date.now()
  const cutoff = now - 60_000
  const hits = (store.get(key) ?? []).filter(t => t > cutoff)
  hits.push(now)
  store.set(key, hits)
  if (store.size > 5_000) store.clear()
  return hits.length <= maxPerMinute
}

// ── Distributed rate limiter (Supabase RPC) ───────────────────────────────────
let _sb: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (_sb) return _sb
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _sb = createClient(url, key, { auth: { persistSession: false } })
  return _sb
}

export async function checkRateLimit(key: string, maxPerMinute: number): Promise<boolean> {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await sb.rpc('check_rate_limit', {
        p_key: key,
        p_max: maxPerMinute,
        p_window_ms: 60000,
      })
      if (!error) return data as boolean
    } catch {
      // Network or Supabase error → fall through to in-memory
    }
  }
  return checkRateLimitMemory(key, maxPerMinute)
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0].trim()
  const real = req.headers['x-real-ip']
  if (typeof real === 'string') return real.trim()
  return 'unknown'
}
