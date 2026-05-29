// Faithful simulation of JeuOnline's turn state machine.
// Mirrors the exact formulas in src/pages/JeuOnline.tsx, now that RLS lets
// every participant see the full `contributions` array.

function runEcrit(nbPlayers, nbCases) {
  const players = Array.from({ length: nbPlayers }, (_, i) => ({ order_index: i }))
  const room = { mode: 'ecrit', nb_cases: nbCases, status: 'playing', host_id: 0 }
  // shared, fully visible to all clients (RLS fix)
  let contributions = []
  // each client's local submitted flag
  const submitted = new Array(nbPlayers).fill(false)

  const nbTotal = () => room.nb_cases
  const currentCase = () => contributions.length
  const whoseTurnIdx = () => (players.length > 0 ? currentCase() % players.length : 0)

  const isMyTurnEcrit = (idx) =>
    room.mode === 'ecrit' && !submitted[idx] &&
    idx !== null && players.length > 0 &&
    idx === whoseTurnIdx() && currentCase() < nbTotal()

  // reset-submitted effect, run for every client after any state change
  const runResetEffects = () => {
    for (let idx = 0; idx < nbPlayers; idx++) {
      if (!submitted[idx]) continue
      if (room.status !== 'playing' || room.mode !== 'ecrit') continue
      const currCase = currentCase()
      if (currCase >= nbTotal()) continue
      if (idx === currCase % players.length) submitted[idx] = false
    }
  }
  // host auto-finish effect
  const runHostFinish = () => {
    if (contributions.length >= nbTotal() && room.status === 'playing') room.status = 'finished'
  }

  const perPlayerCount = new Array(nbPlayers).fill(0)
  let steps = 0
  const MAX = nbCases * 50 + 100
  while (room.status === 'playing') {
    if (++steps > MAX) throw new Error(`STUCK écrit p=${nbPlayers} c=${nbCases}: no progress, contributions=${contributions.length}`)
    // find the unique player whose turn it is
    const actors = players.map((_, i) => i).filter(isMyTurnEcrit)
    if (actors.length === 0) {
      // nobody can act but game not finished -> frozen bug
      runHostFinish()
      if (room.status === 'finished') break
      throw new Error(`FROZEN écrit p=${nbPlayers} c=${nbCases} at case ${currentCase()}: no player has the turn`)
    }
    if (actors.length > 1) throw new Error(`AMBIGUOUS turn écrit p=${nbPlayers} c=${nbCases}: players ${actors} all think it's their turn`)
    const idx = actors[0]
    // submit
    contributions = [...contributions, { case_index: currentCase(), player_id: idx, texte: `w${currentCase()}` }]
    submitted[idx] = true
    perPlayerCount[idx]++
    // broadcast -> all clients recompute
    runResetEffects()
    runHostFinish()
  }
  if (contributions.length !== nbCases) throw new Error(`WRONG total écrit p=${nbPlayers} c=${nbCases}: got ${contributions.length}`)
  // verify round-robin ordering
  contributions.forEach((c, i) => {
    if (c.player_id !== i % nbPlayers) throw new Error(`BAD order écrit p=${nbPlayers} c=${nbCases} case ${i}: by ${c.player_id}, expected ${i % nbPlayers}`)
  })
  return { steps, perPlayerCount }
}

function runDessin(nbPlayers) {
  const room = { mode: 'dessin', nb_cases: nbPlayers, status: 'playing', host_id: 0 }
  let contributions = []
  const submitted = new Array(nbPlayers).fill(false)
  const nbTotal = () => room.nb_cases
  const isMyTurnDessin = (idx) => room.mode === 'dessin' && !submitted[idx] && idx !== null
  const runHostFinish = () => { if (contributions.length >= nbTotal() && room.status === 'playing') room.status = 'finished' }

  // players draw simultaneously, each once; simulate arbitrary order incl. duplicates guard
  let steps = 0
  while (room.status === 'playing') {
    if (++steps > nbPlayers + 5) throw new Error(`STUCK dessin p=${nbPlayers}`)
    const actors = []
    for (let i = 0; i < nbPlayers; i++) if (isMyTurnDessin(i)) actors.push(i)
    if (actors.length === 0) { runHostFinish(); if (room.status === 'finished') break; throw new Error(`FROZEN dessin p=${nbPlayers}`) }
    const idx = actors[0]
    // dedupe guard (client side): skip if a contribution for this index exists
    if (!contributions.some(c => c.case_index === idx && c.player_id === idx)) {
      contributions = [...contributions, { case_index: idx, player_id: idx, texte: 'img' }]
    }
    submitted[idx] = true
    runHostFinish()
  }
  if (contributions.length !== nbPlayers) throw new Error(`WRONG total dessin p=${nbPlayers}: ${contributions.length}`)
  return { steps }
}

let pass = 0, fail = 0
const log = (ok, name, extra='') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗ FAIL'} ${name} ${extra}`) }

// écrit: fixed structures (cases divisible and not), 2..8 players, various case counts
for (const p of [2,3,4,5,6,7,8]) {
  for (const c of [3,4,5,6,7,8,9,12]) {
    try { const r = runEcrit(p, c); log(true, `écrit p=${p} cases=${c}`, `steps=${r.steps} perPlayer=[${r.perPlayerCount}]`) }
    catch (e) { log(false, `écrit p=${p} cases=${c}`, e.message) }
  }
}
// vers libre: variable but persisted total (simulate the random pick once)
for (const p of [2,3,4]) {
  for (let trial = 0; trial < 5; trial++) {
    const c = Math.floor(Math.random() * 9) + 4 // 4..12, persisted
    try { runEcrit(p, c); log(true, `vers-libre p=${p} cases=${c} (persisted)`) }
    catch (e) { log(false, `vers-libre p=${p} cases=${c}`, e.message) }
  }
}
// dessin: 2..8 players
for (const p of [2,3,4,5,6,7,8]) {
  try { const r = runDessin(p); log(true, `dessin p=${p}`, `steps=${r.steps}`) }
  catch (e) { log(false, `dessin p=${p}`, e.message) }
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
