-- Host failover: when the host of a room leaves, the oldest remaining player
-- automatically becomes the new host.
--
-- The "Hôte modifie le salon" RLS policy requires auth.uid() = host_id, so a
-- non-host player cannot directly write rooms.host_id. This SECURITY DEFINER
-- function runs with elevated privileges and performs the transfer atomically:
--   1. Confirm the current host is no longer in room_players.
--   2. Find the oldest remaining player (by joined_at).
--   3. Transfer host_id only if the caller IS that oldest player.
--      → Even if all remaining players race to call this, exactly one wins.

CREATE OR REPLACE FUNCTION public.claim_host(p_room_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_host UUID;
  v_updated  INT;
BEGIN
  -- If the current host is still in the room, nothing to do
  IF EXISTS (
    SELECT 1 FROM rooms r
    JOIN room_players rp
      ON rp.room_code = r.code AND rp.player_id = r.host_id
    WHERE r.code = p_room_code
  ) THEN
    RETURN FALSE;
  END IF;

  -- Elect the oldest remaining player as new host
  SELECT player_id INTO v_new_host
  FROM room_players
  WHERE room_code = p_room_code
  ORDER BY joined_at ASC
  LIMIT 1;

  IF v_new_host IS NULL THEN
    RETURN FALSE; -- Empty room
  END IF;

  -- Only the elected player may complete the transfer
  IF v_new_host IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;

  UPDATE rooms
  SET host_id = v_new_host
  WHERE code = p_room_code
    -- Re-check: host still absent (guards concurrent calls)
    AND NOT EXISTS (
      SELECT 1 FROM room_players rp2
      WHERE rp2.room_code = p_room_code
        AND rp2.player_id = host_id
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_host(TEXT) TO authenticated;
