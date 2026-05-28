-- Fix: turn advancement was broken for non-host players in online "écrit" mode.
--
-- The round-robin turn logic in JeuOnline derives the current turn from the
-- total number of contributions in the room (currentCase = contributions.length).
-- The previous SELECT policy only let a player read their OWN contributions
-- during a "playing" game (others were hidden until "finished"), and the host.
-- So for a non-host player, contributions.length only counted their own rows,
-- the turn counter never reflected the real progress, and their turn never
-- came back — the game appeared frozen after they submitted.
--
-- This relaxes SELECT so any participant (player listed in room_players, or the
-- host) can read every contribution row in their room during play. Realtime
-- (postgres_changes) respects RLS, so this also lets non-host clients receive
-- INSERT events and advance turns in real time.
--
-- Secrecy is preserved at the UI level: the client never renders another
-- player's contribution text before the game is finished (it only reads
-- .texte for the current user's own rows). This keeps the cadavre-exquis
-- surprise intact while making the turn counter correct for everyone.

DROP POLICY IF EXISTS "Contributions visibles quand partie terminée" ON contributions;
CREATE POLICY "Contributions visibles quand partie terminée"
  ON contributions FOR SELECT
  USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.code = room_code AND (
        r.status = 'finished'
        OR r.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM room_players rp
          WHERE rp.room_code = r.code AND rp.player_id = auth.uid()
        )
      )
    )
  );
