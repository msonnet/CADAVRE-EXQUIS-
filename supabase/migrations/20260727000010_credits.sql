-- ════════════════════════════════════════════════════════════════════
-- Crédits d'illustration
--
-- Une illustration coûte de l'argent réel (fal.ai) : le solde ne peut pas
-- vivre côté client, il s'éditerait en dix secondes. Toute la comptabilité
-- est donc ici, et seul le service_role écrit — les fonctions Vercel.
--
-- Trois entrées de crédit : l'allocation mensuelle offerte, l'achat intégré
-- (validé par le webhook du magasin), la publicité récompensée (validée par
-- le rappel serveur de la régie). Une seule sortie : la génération.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.credits (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  solde       INTEGER NOT NULL DEFAULT 0 CHECK (solde >= 0),
  -- Mois de la dernière allocation offerte, au format AAAA-MM
  mois_alloue TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal : toute variation de solde laisse une trace. Sert à la fois d'audit
-- comptable (ce que fal m'a coûté vs ce que le magasin m'a rapporté) et de
-- garde-fou anti-rejeu pour les récompenses publicitaires.
CREATE TABLE IF NOT EXISTS public.credit_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'allocation' | 'achat' | 'publicite' | 'generation' | 'remboursement'
  type       TEXT NOT NULL,
  montant    INTEGER NOT NULL,          -- signé : +5 crédité, -1 débité
  -- Identifiant externe unique (transaction du magasin, jeton de la régie) :
  -- l'index unique plus bas rend tout rejeu impossible.
  reference  TEXT,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_events_user ON public.credit_events(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_events_reference
  ON public.credit_events(reference) WHERE reference IS NOT NULL;

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_events ENABLE ROW LEVEL SECURITY;

-- Le joueur lit son solde et son historique ; il n'écrit jamais.
DROP POLICY IF EXISTS "Lire son solde" ON public.credits;
CREATE POLICY "Lire son solde" ON public.credits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Lire son historique" ON public.credit_events;
CREATE POLICY "Lire son historique" ON public.credit_events
  FOR SELECT USING (auth.uid() = user_id);

-- ── Allocation mensuelle offerte ────────────────────────────────────────
-- Idempotente : appelée à chaque ouverture, elle ne crédite qu'une fois par
-- mois civil. Le joueur occasionnel ne rencontre jamais le mur.
CREATE OR REPLACE FUNCTION public.allouer_credits_mensuels(p_user UUID, p_montant INTEGER DEFAULT 3)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mois TEXT := to_char(NOW(), 'YYYY-MM');
  v_solde INTEGER;
BEGIN
  INSERT INTO credits (user_id, solde, mois_alloue)
  VALUES (p_user, p_montant, v_mois)
  ON CONFLICT (user_id) DO UPDATE
    SET solde = CASE WHEN credits.mois_alloue IS DISTINCT FROM v_mois
                     THEN credits.solde + p_montant ELSE credits.solde END,
        mois_alloue = v_mois,
        updated_at = NOW()
  RETURNING solde INTO v_solde;

  -- Trace seulement si l'allocation a bien eu lieu ce mois-ci
  INSERT INTO credit_events (user_id, type, montant, reference)
  VALUES (p_user, 'allocation', p_montant, p_user::text || ':' || v_mois)
  ON CONFLICT (reference) DO NOTHING;

  RETURN v_solde;
END;
$$;

-- ── Débit atomique ──────────────────────────────────────────────────────
-- Renvoie le nouveau solde, ou NULL si les crédits sont insuffisants. Le
-- CHECK (solde >= 0) et le UPDATE conditionnel rendent la course impossible :
-- deux requêtes simultanées ne peuvent pas débiter le même dernier crédit.
CREATE OR REPLACE FUNCTION public.debiter_credit(p_user UUID, p_montant INTEGER DEFAULT 1, p_detail JSONB DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_solde INTEGER;
BEGIN
  UPDATE credits SET solde = solde - p_montant, updated_at = NOW()
  WHERE user_id = p_user AND solde >= p_montant
  RETURNING solde INTO v_solde;

  IF v_solde IS NULL THEN RETURN NULL; END IF;

  INSERT INTO credit_events (user_id, type, montant, detail)
  VALUES (p_user, 'generation', -p_montant, p_detail);

  RETURN v_solde;
END;
$$;

-- ── Crédit (achat, publicité, remboursement) ────────────────────────────
-- p_reference rend l'opération idempotente : un webhook rejoué ou un jeton
-- publicitaire renvoyé deux fois ne crédite qu'une seule fois.
CREATE OR REPLACE FUNCTION public.crediter(
  p_user UUID, p_montant INTEGER, p_type TEXT,
  p_reference TEXT DEFAULT NULL, p_detail JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_solde INTEGER; v_insere INTEGER;
BEGIN
  INSERT INTO credit_events (user_id, type, montant, reference, detail)
  VALUES (p_user, p_type, p_montant, p_reference, p_detail)
  ON CONFLICT (reference) DO NOTHING;
  GET DIAGNOSTICS v_insere = ROW_COUNT;

  -- Référence déjà vue : on ne recrédite pas, on renvoie le solde courant
  IF v_insere = 0 AND p_reference IS NOT NULL THEN
    SELECT solde INTO v_solde FROM credits WHERE user_id = p_user;
    RETURN COALESCE(v_solde, 0);
  END IF;

  INSERT INTO credits (user_id, solde) VALUES (p_user, p_montant)
  ON CONFLICT (user_id) DO UPDATE
    SET solde = credits.solde + p_montant, updated_at = NOW()
  RETURNING solde INTO v_solde;

  RETURN v_solde;
END;
$$;

REVOKE ALL ON FUNCTION public.allouer_credits_mensuels(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debiter_credit(UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crediter(UUID, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
