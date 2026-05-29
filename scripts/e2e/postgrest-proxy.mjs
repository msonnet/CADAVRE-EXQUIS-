import http from 'node:http'
const TARGET = 'http://127.0.0.1:33001'
const server = http.createServer(async (req, res) => {
  // strip the /rest/v1 (and /auth/v1) prefixes supabase-js adds
  const path = req.url.replace(/^\/rest\/v1/, '').replace(/^\/auth\/v1/, '')
  const chunks = []; for await (const c of req) chunks.push(c)
  const body = Buffer.concat(chunks)
  try {
    const r = await fetch(TARGET + path, {
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:33001' },
      body: ['GET','HEAD'].includes(req.method) ? undefined : body,
    })
    res.writeHead(r.status, Object.fromEntries(r.headers))
    res.end(Buffer.from(await r.arrayBuffer()))
  } catch (e) { res.writeHead(502); res.end(String(e)) }
})
server.listen(33000, '127.0.0.1', () => console.log('proxy on 33000 -> 33001'))
