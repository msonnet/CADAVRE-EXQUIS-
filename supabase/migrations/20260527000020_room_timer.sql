-- ══════════════════════════════════════════════════════════
-- CADAVRE EXQUIS — Timer par tour
-- Ajoute deux colonnes optionnelles à `rooms` :
--   • turn_seconds : durée maximale d'un tour en secondes
--                    (NULL = sans limite ; ex. 120 / 300 / 600)
--   • started_at   : horodatage de passage en status='playing'
-- ══════════════════════════════════════════════════════════

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS turn_seconds INTEGER;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
