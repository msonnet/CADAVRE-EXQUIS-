// Production end-to-end check for online multiplayer — run this AFTER applying
// the SQL migrations to your Supabase project. It talks to your REAL database
// through the same @supabase/supabase-js client the app uses, with two real
// (ephemeral) accounts, and verifies the exact thing that was broken:
//   a NON-HOST player sees the turn counter advance and the round-robin works.
//
// It uses only your PUBLIC anon key (the same one shipped in the frontend) —
// no service role, no secret. Safe to run from your machine.
//
// Usage:
//   VITE_SUPABASE_URL="https://xxxx.supabase.co" \
//   VITE_SUPABASE_ANON_KEY="eyJ..." \
//   node scripts/e2e/prod-check.mjs
//
// It creates a throwaway room + two test users (emails ce-e2e-*@example.com),
// plays a full short "écrit" game, asserts correctness, then deletes the room
// (contributions/players cascade). The two test auth users are harmless; remove
// them in the dashboard (Authentication → Users) if you like.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
if (!URL || !ANON) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars.')
  process.exit(2)
}

let fail = 0
const assert = (cond, msg) => { if (!cond) { fail++; console.log('✗ FAIL:', msg) } else console.log('✓', msg) }
const rnd = Math.random().toString(36).slice(2, 8)
const mkClient = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

async function makeUser(tag) {
  const c = mkClient()
  const email = `ce-e2e-${rnd}-${tag}@example.com`
  const password = `Pw_${rnd}_${tag}_123!`
  let { data, error } = await c.auth.signUp({ email, password })
  if (error || !data.session) {
    // maybe the user exists from a previous run, or confirmations are on
    const r = await c.auth.signInWithPassword({ email, password })
    data = r.data; error = r.error
  }
  if (error || !data.session) throw new Error(`auth failed for ${tag}: ${error?.message || 'no session (email confirmations enabled?)'}`)
  return { client: c, id: data.user.id, email }
}

const CODE = `E2E${rnd.toUpperCase().slice(0, 4)}`
const NB = 4 // short structure
let host
try {
  console.log(`\n=== Production check against ${URL} (room ${CODE}) ===\n`)
  host = await makeUser('host')
  const guest = await makeUser('guest')
  assert(true, `two ephemeral accounts created & signed in`)

  // host creates the room (RLS: host_id must equal auth.uid)
  const { error: rErr } = await host.client.from('rooms').insert({
    code: CODE, host_id: host.id, mode: 'ecrit', structure_id: 'phrase-simple',
    nb_joueurs: 2, status: 'playing', nb_cases: NB,
  })
  assert(!rErr, `host created room${rErr ? ' ERR:' + rErr.message : ''}`)

  // both join with order_index 0 (host) and 1 (guest)
  const j1 = await host.client.from('room_players').insert({ room_code: CODE, player_id: host.id, pseudo: 'Hote', order_index: 0 })
  const j2 = await guest.client.from('room_players').insert({ room_code: CODE, player_id: guest.id, pseudo: 'Invite', order_index: 1 })
  assert(!j1.error && !j2.error, `both players joined${j1.error ? ' H:' + j1.error.message : ''}${j2.error ? ' G:' + j2.error.message : ''}`)

  const players = [{ ...host, idx: 0, name: 'Hote' }, { ...guest, idx: 1, name: 'Invite' }]
  const fetchCount = async (cl) => (await cl.from('contributions').select('case_index').eq('room_code', CODE)).data?.length ?? -1

  for (let turn = 0; turn < NB; turn++) {
    const hc = await fetchCount(host.client)
    const gc = await fetchCount(guest.client)
    // THE bug check: the non-host (guest) must see the same advancing count as host
    assert(hc === turn && gc === turn,
      `turn ${turn}: host AND guest both see ${turn} contributions (host=${hc} guest=${gc})`)
    const actor = players[turn % players.length]
    const { error } = await actor.client.from('contributions').insert({
      room_code: CODE, player_id: actor.id, case_index: turn, texte: `mot${turn}`,
    })
    assert(!error, `turn ${turn}: ${actor.name} submits case ${turn}${error ? ' ERR:' + error.message : ''}`)
  }

  const hEnd = await fetchCount(host.client)
  const gEnd = await fetchCount(guest.client)
  assert(hEnd === NB && gEnd === NB, `game complete: both see all ${NB} contributions (host=${hEnd} guest=${gEnd})`)

  const { error: finErr } = await host.client.from('rooms').update({ status: 'finished' }).eq('code', CODE)
  assert(!finErr, `host marked room finished${finErr ? ' ERR:' + finErr.message : ''}`)
} catch (e) {
  fail++; console.log('✗ FAIL (exception):', e.message)
} finally {
  // cleanup: delete the room (contributions + players cascade)
  try { if (host) await host.client.from('rooms').delete().eq('code', CODE) } catch {}
}

console.log(`\n${fail === 0 ? '✅ PRODUCTION CHECK PASSED — online turns advance for non-host players' : '❌ ' + fail + ' check(s) FAILED — see above'}`)
process.exit(fail ? 1 : 0)
