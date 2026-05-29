-- Bootstrap a minimal Supabase-like environment so the real migrations apply
-- and RLS behaves as in production.

-- Roles used by Supabase / migrations
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticator NOINHERIT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT anon, authenticated, service_role TO postgres;

-- auth schema + users table + auth.uid() reading the JWT 'sub' claim
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);

-- auth.uid() reads PostgREST's request.jwt.claims JSON (with a fallback to the
-- legacy per-claim GUC), exactly like the real Supabase helper.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

-- In real Supabase the API roles can call auth.uid(); replicate that grant so
-- RLS policies that reference it evaluate correctly under PostgREST.
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

-- storage schema stub (gallery_storage migration may reference it)
CREATE SCHEMA IF NOT EXISTS storage;

-- supabase_realtime publication (migrations add tables to it)
DO $$ BEGIN
  CREATE PUBLICATION supabase_realtime;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
