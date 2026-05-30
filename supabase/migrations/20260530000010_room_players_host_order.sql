-- The host assigns each player's turn order (order_index) when starting the game.
-- The original room_players UPDATE policy only allowed a player to modify THEIR
-- OWN row (auth.uid() = player_id), so the host's writes to other players' rows
-- were silently dropped by RLS — leaving their order_index NULL and freezing the
-- game (those players never got their turn).
--
-- The app no longer DEPENDS on this (it derives turn order from joined_at when
-- order_index is missing), but applying this restores the intended random order.
--
-- Allow the room host to update any room_players row in their own room.
DROP POLICY IF EXISTS "Hôte ordonne les joueurs" ON room_players;
CREATE POLICY "Hôte ordonne les joueurs"
  ON room_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.code = room_code AND r.host_id = auth.uid()
    )
  );
