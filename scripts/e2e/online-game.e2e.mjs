// TRUE end-to-end test of JeuOnline's data layer:
// real @supabase/supabase-js client -> real PostgREST -> real Postgres + RLS.
// Plays a full 3-player écrit game (5 cases) through the API and asserts that
// EVERY player (incl. non-hosts) sees the correct turn count, that turns
// advance, and that the game completes correctly.
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

// supabase-js eagerly constructs a RealtimeClient. We never open a channel here
// (this test exercises the PostgREST data layer only), so on Node < 22 we just
// provide a no-op WebSocket so the constructor doesn't throw.
if (!globalThis.WebSocket) {
  globalThis.WebSocket = class { constructor() {} close() {} addEventListener() {} removeEventListener() {} send() {} }
}

const REST = 'http://127.0.0.1:33000'
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'
const b64u = (b) => Buffer.from(b).toString('base64url')
function mintJWT(sub, role = 'authenticated') {
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64u(JSON.stringify({
    aud: 'authenticated', role, sub,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }))
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}
const H = '11111111-1111-1111-1111-111111111111'
const A = '22222222-2222-2222-2222-222222222222'
const B = '33333333-3333-3333-3333-333333333333'
const clientWith = (jwt) => createClient(REST, 'anon-key-not-used', {
  global: { headers: { Authorization: `Bearer ${jwt}` } },
  auth: { persistSession: false, autoRefreshToken: false },
})
const clientFor = (sub) => clientWith(mintJWT(sub))
const players = [{ name: 'Hote', id: H, idx: 0 }, { name: 'Alice', id: A, idx: 1 }, { name: 'Bob', id: B, idx: 2 }]
const clients = Object.fromEntries(players.map(p => [p.idx, clientFor(p.id)]))

let fail = 0
const assert = (cond, msg) => { if (!cond) { fail++; console.log('✗ FAIL:', msg) } else console.log('✓', msg) }

// ── Seed a fresh game via a service_role client (bypasses RLS, like the
//    server-side setup Salon performs when a game starts) ──────────────────
const admin = clientWith(mintJWT('00000000-0000-0000-0000-000000000000', 'service_role'))
await admin.from('contributions').delete().eq('room_code', 'GAME1')
await admin.from('room_players').delete().eq('room_code', 'GAME1')
await admin.from('rooms').delete().eq('code', 'GAME1')
// (auth.users rows for H/A/B are seeded by run.sh; they satisfy the host_id/player_id FKs)
await admin.from('rooms').insert({ code: 'GAME1', host_id: H, mode: 'ecrit', structure_id: 'phrase-simple', nb_joueurs: 3, status: 'playing', nb_cases: 5 })
await admin.from('room_players').insert(players.map(p => ({ room_code: 'GAME1', player_id: p.id, pseudo: p.name, order_index: p.idx })))

// Replicates JeuOnline.loadGame's contributions query (the count drives the turn)
async function fetchCount(client, code) {
  const { data, error } = await client.from('contributions')
    .select('case_index,texte,player_id').eq('room_code', code).order('case_index')
  if (error) throw new Error('select error: ' + error.message)
  return data
}

const code = 'GAME1'
const NB = 5, NPLAYERS = 3
console.log(`\n=== Full écrit game: ${NPLAYERS} players, ${NB} cases, via real client+PostgREST+RLS ===\n`)

for (let turn = 0; turn < NB; turn++) {
  // every client polls contributions (as the app does via realtime/7s poll)
  const counts = {}
  for (const p of players) counts[p.idx] = (await fetchCount(clients[p.idx], code)).length
  // CRITICAL: all clients (host AND non-hosts) must agree on the count
  const uniq = new Set(Object.values(counts))
  assert(uniq.size === 1 && counts[0] === turn,
    `turn ${turn}: all clients see ${turn} contributions (host=${counts[0]} alice=${counts[1]} bob=${counts[2]})`)

  // whoseTurnIdx computed from the (now-correct) shared count
  const currentCase = counts[1] // use a NON-HOST's view on purpose
  const whoseTurnIdx = currentCase % NPLAYERS
  const actor = players.find(p => p.idx === whoseTurnIdx)
  // actor submits exactly as handleSubmit does
  const { error } = await clients[actor.idx].from('contributions').insert({
    room_code: code, player_id: actor.id, case_index: currentCase, texte: `mot${currentCase}`,
  })
  assert(!error, `turn ${turn}: ${actor.name} (idx ${actor.idx}) submits case ${currentCase}${error ? ' ERR:' + error.message : ''}`)
}

// after NB submissions, host-finish should be triggered by the host client
const finalCounts = {}
for (const p of players) finalCounts[p.idx] = (await fetchCount(clients[p.idx], code)).length
assert(finalCounts[0] === NB && finalCounts[1] === NB && finalCounts[2] === NB,
  `game complete: everyone sees all ${NB} contributions (h=${finalCounts[0]} a=${finalCounts[1]} b=${finalCounts[2]})`)

// host marks room finished (rooms UPDATE policy: host only)
const { error: finErr } = await clients[0].from('rooms').update({ status: 'finished' }).eq('code', code)
assert(!finErr, `host marks room finished${finErr ? ' ERR:' + finErr.message : ''}`)

// non-host tries to finish a (new) room -> must be blocked by RLS (negative)
const { data: upd, error: upErr } = await clients[1].from('rooms')
  .update({ status: 'waiting' }).eq('code', code).select()
assert(!upErr && (!upd || upd.length === 0), `non-host CANNOT modify room (rows affected=${upd ? upd.length : 0})`)

// security: a non-host cannot insert a contribution impersonating another player
const { error: spoofErr } = await clients[1].from('contributions')
  .insert({ room_code: code, player_id: B, case_index: 99, texte: 'spoof' })
assert(!!spoofErr, `spoof insert (Alice as Bob) correctly rejected by RLS${spoofErr ? '' : ' -- NOT REJECTED!'}`)

// ── Drawing mode: each player submits one band (case_index = order_index),
//    simultaneously and independently; host finishes when all bands are in. ──
console.log(`\n=== Full dessin game: ${NPLAYERS} players, 1 band each, via real client+PostgREST+RLS ===\n`)
const dcode = 'GAME2'
await admin.from('contributions').delete().eq('room_code', dcode)
await admin.from('room_players').delete().eq('room_code', dcode)
await admin.from('rooms').delete().eq('code', dcode)
await admin.from('rooms').insert({ code: dcode, host_id: H, mode: 'dessin', structure_id: 'phrase-simple', nb_joueurs: 3, status: 'playing', nb_cases: 3 })
await admin.from('room_players').insert(players.map(p => ({ room_code: dcode, player_id: p.id, pseudo: p.name, order_index: p.idx })))

// players submit their band in arbitrary order (drawing is parallel, not round-robin)
for (const p of [players[2], players[0], players[1]]) {
  const { error } = await clients[p.idx].from('contributions').insert({
    room_code: dcode, player_id: p.id, case_index: p.idx, texte: `data:image/jpeg;base64,band${p.idx}`,
  })
  assert(!error, `dessin: ${p.name} submits band ${p.idx}${error ? ' ERR:' + error.message : ''}`)
}
const dCounts = {}
for (const p of players) dCounts[p.idx] = (await fetchCount(clients[p.idx], dcode)).length
assert(dCounts[0] === 3 && dCounts[1] === 3 && dCounts[2] === 3,
  `dessin complete: everyone sees all 3 bands (h=${dCounts[0]} a=${dCounts[1]} b=${dCounts[2]})`)
// duplicate band (reconnect race) must be rejected by UNIQUE(room_code, case_index)
const { error: dupErr } = await clients[0].from('contributions')
  .insert({ room_code: dcode, player_id: H, case_index: 0, texte: 'dup' })
assert(!!dupErr, `dessin: duplicate band rejected by UNIQUE constraint${dupErr ? '' : ' -- NOT REJECTED!'}`)

console.log(`\n${fail === 0 ? '✅ ALL E2E CHECKS PASSED' : '❌ ' + fail + ' E2E CHECK(S) FAILED'}`)
process.exit(fail ? 1 : 0)
