// Faithful reproduction of the REAL app flow (not a simplified version):
// 1. host creates room in status 'waiting' (like Online.tsx)
// 2. guest joins room_players with NO order_index (like Salon.joinRoom)
// 3. host "starts": shuffles order_index, sets nb_cases, status 'playing' (Salon.startGame)
// 4. host submits case 0
// 5. THE TEST: does the guest, polling contributions, see length advance to 1?
import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON) { console.error('Missing env'); process.exit(2) }

let fail = 0
const ok = (c, m) => { if (!c) { fail++; console.log('✗ FAIL:', m) } else console.log('✓', m) }
const rnd = Math.random().toString(36).slice(2, 8)
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

async function makeUser(tag) {
  const c = mk()
  const email = `ce-flow-${rnd}-${tag}@example.com`
  const password = `Pw_${rnd}_${tag}_123!`
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
  await admin.auth.admin.createUser({ email, password, email_confirm: true })
  const { data } = await c.auth.signInWithPassword({ email, password })
  return { client: c, id: data.user.id, email }
}

const CODE = `FLW${rnd.toUpperCase().slice(0, 4)}`
let host
try {
  console.log(`\n=== REAL FLOW reproduction (room ${CODE}) ===\n`)
  host = await makeUser('host')
  const guest = await makeUser('guest')

  // 1. host creates room in WAITING (exactly like Online.tsx createRoom)
  const { error: e1 } = await host.client.from('rooms').insert({
    code: CODE, host_id: host.id, mode: 'ecrit', structure_id: 'phrase-simple',
    nb_joueurs: 3, status: 'waiting', is_public: false,
  })
  ok(!e1, `host created room in 'waiting'${e1 ? ' ERR:' + e1.message : ''}`)

  // 2. both join WITHOUT order_index (like Salon.joinRoom upsert)
  const j1 = await host.client.from('room_players').upsert(
    { room_code: CODE, player_id: host.id, pseudo: 'Hote', is_ready: true },
    { onConflict: 'room_code,player_id' })
  const j2 = await guest.client.from('room_players').upsert(
    { room_code: CODE, player_id: guest.id, pseudo: 'Invite', is_ready: true },
    { onConflict: 'room_code,player_id' })
  ok(!j1.error && !j2.error, `both joined room_players${j1.error ? ' H:' + j1.error.message : ''}${j2.error ? ' G:' + j2.error.message : ''}`)

  // 3. host starts: assign order_index, nb_cases, status playing (Salon.startGame)
  // host=0, guest=1 (deterministic for the test)
  await host.client.from('room_players').update({ order_index: 0 }).eq('room_code', CODE).eq('player_id', host.id)
  await host.client.from('room_players').update({ order_index: 1 }).eq('room_code', CODE).eq('player_id', guest.id)
  const { error: e3 } = await host.client.from('rooms').update({
    status: 'playing', nb_joueurs: 2, nb_cases: 3, started_at: new Date().toISOString(),
  }).eq('code', CODE)
  ok(!e3, `host started game (status=playing, nb_cases=3)${e3 ? ' ERR:' + e3.message : ''}`)

  // 3b. guest reads room + players (like JeuOnline.loadGame) — does guest see order_index?
  // The guest reads ALL players incl. joined_at (the app derives turn order from this)
  const { data: gPlayers } = await guest.client.from('room_players')
    .select('player_id,order_index,pseudo,joined_at').eq('room_code', CODE).order('joined_at')
  const guestRow = gPlayers?.find(p => p.player_id === guest.id)
  // order_index is EXPECTED to be null for the guest (host's RLS-blocked write).
  // The fix derives ordering from joined_at instead.
  console.log(`   (info) guest order_index from DB = ${guestRow?.order_index} (null is expected & fine now)`)
  const { data: gRoom } = await guest.client.from('rooms').select('nb_cases,status').eq('code', CODE).single()
  ok(gRoom?.nb_cases === 3, `guest sees room.nb_cases=3 (got ${gRoom?.nb_cases})`)

  // Replicate the client's derived ordering (order_index if all present, else joined_at)
  const deriveOrder = (list) => [...list].sort((a, b) => {
    if (a.order_index != null && b.order_index != null && a.order_index !== b.order_index) return a.order_index - b.order_index
    const aj = a.joined_at ?? '', bj = b.joined_at ?? ''
    if (aj !== bj) return aj < bj ? -1 : 1
    return a.player_id < b.player_id ? -1 : 1
  })
  const ordered = deriveOrder(gPlayers ?? [])
  const guestDerivedIdx = ordered.findIndex(p => p.player_id === guest.id)
  ok(guestDerivedIdx === 1, `guest derived index = 1 from joined_at (got ${guestDerivedIdx})`)

  // 4. host submits case 0
  const { error: e4 } = await host.client.from('contributions').insert({
    room_code: CODE, player_id: host.id, case_index: 0, texte: 'Le chat',
  })
  ok(!e4, `host submitted case 0${e4 ? ' ERR:' + e4.message : ''}`)

  // 5. THE CRITICAL TEST: guest polls contributions (like the 3s poll). Sees length 1?
  const { data: gContribs, error: e5 } = await guest.client.from('contributions')
    .select('case_index,texte,player_id').eq('room_code', CODE).order('case_index')
  ok(!e5, `guest poll did not error${e5 ? ' ERR:' + e5.message : ''}`)
  ok(gContribs?.length === 1,
    `guest sees ${gContribs?.length} contribution(s) — expected 1`)

  // 6. compute guest's turn the way the FIXED app does (derived index)
  const currentCase = gContribs?.length ?? 0
  const whoseTurnIdx = currentCase % ordered.length
  const isGuestTurn = guestDerivedIdx === whoseTurnIdx
  ok(isGuestTurn, `>>> guest's turn is now ACTIVE (currentCase=${currentCase}, whoseTurnIdx=${whoseTurnIdx}, guestDerivedIdx=${guestDerivedIdx}) <<<`)

  // 7. guest submits case 1 (their turn) — proves the game advances
  const { error: e7 } = await guest.client.from('contributions').insert({
    room_code: CODE, player_id: guest.id, case_index: 1, texte: 'dévore',
  })
  ok(!e7, `guest submits case 1 — game advances${e7 ? ' ERR:' + e7.message : ''}`)

} catch (e) {
  fail++; console.log('✗ FAIL (exception):', e.message)
} finally {
  try { if (host) await host.client.from('rooms').delete().eq('code', CODE) } catch {}
  if (SERVICE) {
    try {
      const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
      const { data: list } = await admin.auth.admin.listUsers()
      for (const u of (list?.users ?? []).filter(u => u.email?.startsWith(`ce-flow-${rnd}-`))) {
        await admin.auth.admin.deleteUser(u.id)
      }
    } catch {}
  }
}
console.log(`\n${fail === 0 ? '✅ REAL FLOW OK — guest gets their turn' : '❌ ' + fail + ' FAILED — this is the bug'}`)
process.exit(fail ? 1 : 0)
