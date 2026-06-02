import { describe, it, expect } from 'vitest'

// ── Helpers mirroring JeuOnline.tsx logic ────────────────────────────────────

type RoomPlayer = { player_id: string; order_index: number | null; joined_at: string | null }

function orderedPlayers(players: RoomPlayer[]): RoomPlayer[] {
  return [...players].sort((a, b) => {
    const ao = a.order_index, bo = b.order_index
    if (ao != null && bo != null && ao !== bo) return ao - bo
    const aj = a.joined_at ?? '', bj = b.joined_at ?? ''
    if (aj !== bj) return aj < bj ? -1 : 1
    return a.player_id < b.player_id ? -1 : 1
  })
}

function whoseTurnIdx(contribCount: number, playerCount: number): number {
  return playerCount > 0 ? contribCount % playerCount : 0
}

function isMyTurnEcrit(
  myEffectiveIndex: number | null,
  turnIdx: number,
  submitted: boolean,
  currentCase: number,
  nbTotal: number,
): boolean {
  return !submitted && myEffectiveIndex !== null && myEffectiveIndex === turnIdx && currentCase < nbTotal
}

function isMyTurnDessin(
  myEffectiveIndex: number | null,
  turnIdx: number,
  submitted: boolean,
  currentCase: number,
  nbTotal: number,
): boolean {
  return !submitted && myEffectiveIndex !== null && myEffectiveIndex === turnIdx && currentCase < nbTotal
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('orderedPlayers', () => {
  it('sorts by order_index when set', () => {
    const players: RoomPlayer[] = [
      { player_id: 'b', order_index: 1, joined_at: '2024-01-01T00:00:00Z' },
      { player_id: 'a', order_index: 0, joined_at: '2024-01-01T00:01:00Z' },
    ]
    const result = orderedPlayers(players)
    expect(result[0].player_id).toBe('a')
    expect(result[1].player_id).toBe('b')
  })

  it('falls back to joined_at when order_index is null', () => {
    const players: RoomPlayer[] = [
      { player_id: 'late', order_index: null, joined_at: '2024-01-01T00:01:00Z' },
      { player_id: 'early', order_index: null, joined_at: '2024-01-01T00:00:00Z' },
    ]
    const result = orderedPlayers(players)
    expect(result[0].player_id).toBe('early')
  })

  it('falls back to player_id lexicographic order when joined_at is equal', () => {
    const players: RoomPlayer[] = [
      { player_id: 'z-player', order_index: null, joined_at: '2024-01-01T00:00:00Z' },
      { player_id: 'a-player', order_index: null, joined_at: '2024-01-01T00:00:00Z' },
    ]
    const result = orderedPlayers(players)
    expect(result[0].player_id).toBe('a-player')
  })
})

describe('whoseTurnIdx', () => {
  it('returns 0 when there are no players', () => {
    expect(whoseTurnIdx(5, 0)).toBe(0)
  })

  it('wraps around correctly for round-robin (3 players)', () => {
    expect(whoseTurnIdx(0, 3)).toBe(0)
    expect(whoseTurnIdx(1, 3)).toBe(1)
    expect(whoseTurnIdx(2, 3)).toBe(2)
    expect(whoseTurnIdx(3, 3)).toBe(0) // second round
    expect(whoseTurnIdx(4, 3)).toBe(1)
  })

  it('handles 2-player games', () => {
    expect(whoseTurnIdx(0, 2)).toBe(0)
    expect(whoseTurnIdx(1, 2)).toBe(1)
    expect(whoseTurnIdx(2, 2)).toBe(0)
    expect(whoseTurnIdx(3, 2)).toBe(1)
  })
})

describe('isMyTurnEcrit', () => {
  it("is true when it is the player's turn and game is ongoing", () => {
    expect(isMyTurnEcrit(1, 1, false, 1, 7)).toBe(true)
  })

  it('is false when player has already submitted', () => {
    expect(isMyTurnEcrit(1, 1, true, 1, 7)).toBe(false)
  })

  it('is false when myEffectiveIndex does not match turnIdx', () => {
    expect(isMyTurnEcrit(0, 1, false, 1, 7)).toBe(false)
  })

  it('is false when game is finished (currentCase >= nbTotal)', () => {
    expect(isMyTurnEcrit(0, 0, false, 7, 7)).toBe(false)
  })

  it('is false when myEffectiveIndex is null (spectator)', () => {
    expect(isMyTurnEcrit(null, 0, false, 0, 7)).toBe(false)
  })
})

describe('isMyTurnDessin', () => {
  it('is true for the player whose index matches the current case', () => {
    // In dessin mode, each player draws their own band (index = case_index)
    expect(isMyTurnDessin(2, 2, false, 2, 3)).toBe(true)
  })

  it('is false when submitted', () => {
    expect(isMyTurnDessin(2, 2, true, 2, 3)).toBe(false)
  })

  it('is false when all bands are done', () => {
    expect(isMyTurnDessin(0, 0, false, 3, 3)).toBe(false)
  })
})

describe('full round-robin sequence (3 players, 7 cases)', () => {
  const players: RoomPlayer[] = [
    { player_id: 'p0', order_index: 0, joined_at: null },
    { player_id: 'p1', order_index: 1, joined_at: null },
    { player_id: 'p2', order_index: 2, joined_at: null },
  ]
  const ordered = orderedPlayers(players)
  const NB_TOTAL = 7

  it('correctly assigns all 7 turns', () => {
    const expectedOwner = ['p0', 'p1', 'p2', 'p0', 'p1', 'p2', 'p0']
    for (let c = 0; c < NB_TOTAL; c++) {
      const turnIdx = whoseTurnIdx(c, ordered.length)
      expect(ordered[turnIdx].player_id).toBe(expectedOwner[c])
    }
  })

  it('game is finished when contributions.length === NB_TOTAL', () => {
    const turnIdx = whoseTurnIdx(NB_TOTAL, ordered.length)
    // No case is valid at index NB_TOTAL
    expect(isMyTurnEcrit(0, turnIdx, false, NB_TOTAL, NB_TOTAL)).toBe(false)
    expect(isMyTurnEcrit(1, turnIdx, false, NB_TOTAL, NB_TOTAL)).toBe(false)
    expect(isMyTurnEcrit(2, turnIdx, false, NB_TOTAL, NB_TOTAL)).toBe(false)
  })
})
