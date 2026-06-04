-- Distributed rate limiting via Supabase RPC.
-- Replaces the in-memory Map in api/_rateLimit.ts which doesn't survive
-- multiple Vercel instances or redeployments.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT    NOT NULL,
  window_start BIGINT  NOT NULL,
  count        INT     NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

-- No RLS: table is only accessed via service_role from API routes.
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- Atomic check-and-increment.
-- Returns TRUE if the request is within the limit, FALSE if it should be blocked.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key        TEXT,
  p_max        INT,
  p_window_ms  BIGINT DEFAULT 60000
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now_ms      BIGINT;
  v_window_start BIGINT;
  v_count       INT;
BEGIN
  v_now_ms       := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
  v_window_start := (v_now_ms / p_window_ms) * p_window_ms;

  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE
    SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Trim stale entries (older than 2 full windows)
  DELETE FROM public.rate_limits
  WHERE window_start < v_now_ms - p_window_ms * 2;

  RETURN v_count <= p_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
