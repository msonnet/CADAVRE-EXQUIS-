-- Ajout du champ is_public aux salons
-- Distingue les salons publics (visibles dans le navigateur de parties)
-- des salons privés (accessibles uniquement par code)

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

UPDATE rooms SET is_public = TRUE WHERE is_public IS NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_public_waiting
  ON rooms(is_public, status, created_at)
  WHERE is_public = TRUE AND status = 'waiting';

DROP POLICY IF EXISTS "Salons publics en lecture" ON rooms;
CREATE POLICY "Salons publics en lecture"
  ON rooms FOR SELECT USING (TRUE);
