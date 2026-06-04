-- Gallery moderation: author ownership + content reporting.
-- Required by Apple App Store (content moderation mechanism).

-- 1. Add author_id to gallery (nullable for backward compat with existing rows)
ALTER TABLE public.gallery
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gallery_author_id_idx ON public.gallery(author_id);

-- 2. Allow authenticated authors to delete their own gallery items
CREATE POLICY "Authors can delete own gallery items"
  ON public.gallery FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- 3. Reports table
CREATE TABLE IF NOT EXISTS public.gallery_reports (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id  UUID        NOT NULL REFERENCES public.gallery(id) ON DELETE CASCADE,
  reporter_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT        NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'offensive', 'other')),
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  -- One report per user per item
  UNIQUE (gallery_id, reporter_id)
);

ALTER TABLE public.gallery_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert a report (but not read others')
CREATE POLICY "Authenticated users can report"
  ON public.gallery_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Service role reads all reports (for moderation dashboard)
CREATE POLICY "Service role reads all reports"
  ON public.gallery_reports FOR SELECT
  TO service_role
  USING (true);

-- 4. Anonymous reports (via API with rate limiting) allowed via service_role only
--    The API endpoint handles validation and rate limiting.
