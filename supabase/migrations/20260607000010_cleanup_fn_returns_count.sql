-- Upgrade cleanup_expired_rooms() to return deleted row count for better observability
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM rooms WHERE expires_at < NOW() RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$;

-- Allow the service role (used by the cron) to call this function
GRANT EXECUTE ON FUNCTION cleanup_expired_rooms() TO service_role;
