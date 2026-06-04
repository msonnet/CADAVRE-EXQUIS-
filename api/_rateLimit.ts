const store = new Map<string, number[]>()

export function checkRateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now()
  const cutoff = now - 60_000
  const hits = (store.get(key) ?? []).filter(t => t > cutoff)
  hits.push(now)
  store.set(key, hits)
  if (store.size > 5_000) store.clear()
  return hits.length <= maxPerMinute
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0].trim()
  const real = req.headers['x-real-ip']
  if (typeof real === 'string') return real.trim()
  return 'unknown'
}
