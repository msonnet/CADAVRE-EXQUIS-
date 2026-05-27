-- Table galerie publique
CREATE TABLE IF NOT EXISTS gallery (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('poeme', 'dessin')),
  titre         TEXT,
  payload       TEXT NOT NULL,
  author_pseudo TEXT NOT NULL DEFAULT 'Anonyme',
  author_avatar TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_type ON gallery(type);
CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery(created_at DESC);

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Galerie publique en lecture" ON gallery;
CREATE POLICY "Galerie publique en lecture"
  ON gallery FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Publier dans la galerie" ON gallery;
CREATE POLICY "Publier dans la galerie"
  ON gallery FOR INSERT
  WITH CHECK (TRUE);
