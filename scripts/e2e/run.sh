#!/usr/bin/env bash
# End-to-end test of the online multiplayer data layer:
#   real @supabase/supabase-js client -> PostgREST -> PostgreSQL + the real RLS
#   policies from supabase/migrations/.
#
# It plays a full 3-player "écrit" game through the API and asserts every
# player (including non-hosts) sees the correct turn count, turns advance, the
# game completes, and security holds (no impersonation, non-host can't edit room).
#
# This is the regression guard for the bug where the contributions SELECT policy
# hid other players' rows from non-host clients, freezing the turn counter.
#
# Requirements: postgresql server binaries, a non-root user, internet (to fetch
# the PostgREST static binary once), and `npm install` already run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/tmp/ce_pgtest}"
PGPORT="${PGPORT:-55432}"
SOCK="/tmp/ce_pgrun"
PGRST_PORT=33001
PROXY_PORT=33000
SECRET="super-secret-jwt-token-with-at-least-32-characters-long"

cleanup() {
  [ -n "${PROXY_PID:-}" ] && kill "$PROXY_PID" 2>/dev/null || true
  [ -n "${PGRST_PID:-}" ] && kill "$PGRST_PID" 2>/dev/null || true
  "$PGBIN/pg_ctl" -D "$PGDATA" stop 2>/dev/null || true
}
trap cleanup EXIT

# free our ports from any leftover run (best-effort; ignore failures)
"$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate 2>/dev/null || true
for port in "$PGPORT" "$PGRST_PORT" "$PROXY_PORT"; do
  for pid in $(ps -eo pid,args 2>/dev/null | grep -E "(postgrest|postgrest-proxy\.mjs|-p $port )" | grep -v grep | awk '{print $1}'); do
    kill -9 "$pid" 2>/dev/null || true
  done
done
sleep 1

mkdir -p "$SOCK"
rm -rf "$PGDATA"
"$PGBIN/initdb" -D "$PGDATA" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PGPORT -k $SOCK" -l /tmp/ce_pg.log start
sleep 2
PSQL="psql -h $SOCK -p $PGPORT -U postgres -q -v ON_ERROR_STOP=1"

$PSQL -f "$ROOT/scripts/e2e/bootstrap.sql" >/dev/null
for f in $(ls -1 "$ROOT"/supabase/migrations/*.sql | sort); do
  $PSQL -f "$f" >/dev/null 2>&1 || true   # gallery_storage needs storage.buckets; irrelevant here
done
$PSQL >/dev/null <<SQL
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT anon, authenticated, service_role TO authenticator;
ALTER ROLE authenticator LOGIN PASSWORD 'authpw';
-- seed the auth.users referenced by the test (FKs on host_id/player_id)
INSERT INTO auth.users(id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;
SQL

# PostgREST
PGRST_BIN="${PGRST_BIN:-/tmp/postgrest}"
if [ ! -x "$PGRST_BIN" ]; then
  curl -sSL -o /tmp/postgrest.tar.xz \
    "https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz"
  tar xf /tmp/postgrest.tar.xz -C /tmp
fi
cat > /tmp/ce_postgrest.conf <<CONF
db-uri = "postgres://authenticator:authpw@localhost:$PGPORT/postgres"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
jwt-aud = "authenticated"
server-port = $PGRST_PORT
server-host = "127.0.0.1"
CONF
"$PGRST_BIN" /tmp/ce_postgrest.conf >/tmp/ce_postgrest.log 2>&1 & PGRST_PID=$!
sleep 4
node "$ROOT/scripts/e2e/postgrest-proxy.mjs" >/tmp/ce_proxy.log 2>&1 & PROXY_PID=$!
sleep 1

# health probe: confirm PostgREST is the one WE started and JWT auth resolves
echo "--- postgrest log ---"; tail -2 /tmp/ce_postgrest.log
PROBE_JWT=$(node -e 'const c=require("crypto");const S="super-secret-jwt-token-with-at-least-32-characters-long";const b=(x)=>Buffer.from(x).toString("base64url");const h=b(JSON.stringify({alg:"HS256",typ:"JWT"}));const p=b(JSON.stringify({aud:"authenticated",role:"authenticated",sub:"11111111-1111-1111-1111-111111111111",exp:Math.floor(Date.now()/1000)+3600}));process.stdout.write(h+"."+p+"."+c.createHmac("sha256",S).update(h+"."+p).digest("base64url"))')
echo "--- probe whoami (expect uid 1111...) ---"
psql -h "$SOCK" -p "$PGPORT" -U postgres -q -c "CREATE OR REPLACE FUNCTION public.whoami() RETURNS json LANGUAGE sql STABLE AS \$f\$ SELECT json_build_object('uid',auth.uid()) \$f\$; GRANT EXECUTE ON FUNCTION public.whoami() TO anon, authenticated;" >/dev/null
psql -h "$SOCK" -p "$PGPORT" -U postgres -q -c "NOTIFY pgrst, 'reload schema';" >/dev/null; sleep 1
curl -sS -m6 -X POST -H "Authorization: Bearer $PROBE_JWT" -H "Content-Type: application/json" http://127.0.0.1:$PROXY_PORT/rest/v1/rpc/whoami -d '{}'; echo

cd "$ROOT" && node scripts/e2e/online-game.e2e.mjs
