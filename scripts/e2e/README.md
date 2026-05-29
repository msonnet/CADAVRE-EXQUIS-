# Online multiplayer — end-to-end test

Verifies the online game's data layer against a **real** stack:
`@supabase/supabase-js` → PostgREST → PostgreSQL with the actual RLS policies
from `supabase/migrations/`.

It is the regression guard for the bug where the `contributions` SELECT policy
hid other players' rows from non-host clients, so the round-robin turn counter
(`contributions.length`) was wrong for everyone but the host and the game froze
after a player validated their turn.

## What it checks

- **Écrit** (3 players, 5 cases): every player — host *and* non-hosts — sees the
  same, correct contribution count each turn; turns advance round-robin; the game
  completes; the host can finish the room and non-hosts cannot.
- **Dessin** (3 players): each player submits one band independently; everyone
  sees all bands; a duplicate band is rejected by `UNIQUE(room_code, case_index)`.
- **Security**: a player cannot insert a contribution impersonating another.

## Run it

```bash
bash scripts/e2e/run.sh
```

Requirements: PostgreSQL server binaries (`/usr/lib/postgresql/16/bin`, override
with `PGBIN`), a non-root user to run `initdb`, `npm install` already done, and
internet on first run to fetch the PostgREST static binary (cached at
`/tmp/postgrest`, override with `PGRST_BIN`).

The script stands up a throwaway Postgres + PostgREST, applies `bootstrap.sql`
(a minimal Supabase-like environment: `auth.uid()`, the `anon`/`authenticated`/
`service_role` roles) followed by every file in `supabase/migrations/`, then runs
`online-game.e2e.mjs`. Everything is torn down on exit. Exit code is non-zero if
any check fails.

## Files

- `run.sh` — orchestrates the local stack and runs the test.
- `bootstrap.sql` — minimal Supabase-compatible bootstrap so the real migrations apply.
- `postgrest-proxy.mjs` — strips the `/rest/v1` prefix supabase-js adds.
- `online-game.e2e.mjs` — the actual game playthrough and assertions.
