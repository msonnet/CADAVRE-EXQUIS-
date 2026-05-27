-- Réactions (likes + emojis) sur les œuvres de la galerie
CREATE TABLE IF NOT EXISTS gallery_reactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id  UUID REFERENCES gallery ON DELETE CASCADE NOT NULL,
  emoji       TEXT NOT NULL CHECK (length(emoji) BETWEEN 1 AND 8),
  reactor_key TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gallery_id, reactor_key, emoji)
);

CREATE INDEX IF NOT EXISTS idx_gallery_reactions_gallery ON gallery_reactions(gallery_id);

ALTER TABLE gallery_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Réactions lecture publique" ON gallery_reactions;
CREATE POLICY "Réactions lecture publique"
  ON gallery_reactions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Réagir librement" ON gallery_reactions;
CREATE POLICY "Réagir librement"
  ON gallery_reactions FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Retirer sa réaction" ON gallery_reactions;
CREATE POLICY "Retirer sa réaction"
  ON gallery_reactions FOR DELETE USING (TRUE);

-- Vues (compteur agrégé sur la table gallery)
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Function pour incrémenter les vues (RPC publique, RLS-safe)
CREATE OR REPLACE FUNCTION increment_gallery_view(g_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE gallery SET views_count = views_count + 1 WHERE id = g_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_gallery_view(UUID) TO anon, authenticated;
