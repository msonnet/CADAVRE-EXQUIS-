-- Langue de la partie : fixée par le créateur du salon.
-- Les consignes, la correction et la publication suivent la langue du salon,
-- pas celle de chaque client — un salon ne mélange plus deux langues.
-- L'historique (colonne absente/NULL) est français.

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS langue TEXT DEFAULT 'fr';

UPDATE rooms SET langue = 'fr' WHERE langue IS NULL;
