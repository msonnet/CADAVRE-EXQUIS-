-- Track which of the 40 anonymous AI voices wrote each fragment.
-- NULL means the player wrote it themselves (no AI used).
-- The value is the human-readable voice name (e.g. "l'archiviste",
-- "la botaniste", …) stored at submission time.

ALTER TABLE contributions ADD COLUMN IF NOT EXISTS voice_name TEXT;
