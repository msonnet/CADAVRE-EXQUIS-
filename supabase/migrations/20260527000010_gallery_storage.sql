-- Ajouter colonne image_url (pour pointer vers Supabase Storage)
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Bucket public pour images de la galerie
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies bucket (lecture publique, upload authentifié OU anonyme)
DROP POLICY IF EXISTS "Galerie images lecture publique" ON storage.objects;
CREATE POLICY "Galerie images lecture publique"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

DROP POLICY IF EXISTS "Galerie images upload" ON storage.objects;
CREATE POLICY "Galerie images upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-images');
