-- ════════════════════════════════════════════════════════════════════
-- Accès aux fonctions payantes : essai offert, puis abonnement
--
-- Le jeu est gratuit et entier. Seuls trois actes appellent un serveur qui
-- me facture — une illustration grand format, une partie où l'IA écrit, la
-- lecture surréaliste d'un dessin. Ces trois-là passent par ici.
--
-- Deux états, pas plus :
--   · non abonné → il lui reste une réserve d'essai, offerte une seule fois
--     à la création du profil ; quand elle est vide, le mur s'ouvre.
--   · abonné     → illimité, sous des plafonds journaliers qui ne sont pas
--     des règles de jeu mais des pare-feu : ils rendent le pire cas
--     impossible à rendre déficitaire.
--
-- Rien de tout cela ne peut vivre côté client : un statut d'abonné en
-- localStorage s'éditerait en dix secondes, et chaque acte coûte de l'argent
-- réel. Seul le service_role écrit — les fonctions Vercel et le webhook du
-- magasin.
-- ════════════════════════════════════════════════════════════════════

-- L'ancien modèle par crédits n'a jamais été mis en service. On le retire
-- pour qu'il ne reste qu'une seule comptabilité dans la base.
DROP FUNCTION IF EXISTS public.allouer_credits_mensuels(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.debiter_credit(UUID, INTEGER, JSONB);
DROP FUNCTION IF EXISTS public.crediter(UUID, INTEGER, TEXT, TEXT, JSONB);
DROP TABLE IF EXISTS public.credit_events;
DROP TABLE IF EXISTS public.credits;

-- rendre_acces a changé de signature en cours de route : sans ce retrait,
-- CREATE OR REPLACE créerait une surcharge au lieu de remplacer.
DROP FUNCTION IF EXISTS public.rendre_acces(UUID, TEXT, TEXT);

CREATE TABLE IF NOT EXISTS public.acces (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Réserve d'essai, offerte une seule fois. Les valeurs par défaut sont LE
  -- cadran d'acquisition : 5 × 0,040 $ + 5 × 0,020 $ + 3 × 0,008 $ ≈ 0,32 $
  -- par joueur au maximum, une fois. C'est ce qui lui montre ce qu'il achète.
  essai_images   INTEGER NOT NULL DEFAULT 5 CHECK (essai_images  >= 0),
  essai_parties  INTEGER NOT NULL DEFAULT 5 CHECK (essai_parties >= 0),
  essai_lectures INTEGER NOT NULL DEFAULT 3 CHECK (essai_lectures >= 0),

  -- Abonnement. Écrit exclusivement par le webhook du magasin : l'app ne
  -- décide jamais si elle a été payée.
  abonne_jusqu_a TIMESTAMPTZ,
  produit        TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal de consommation. Sert à trois choses : les plafonds journaliers,
-- l'idempotence (une partie déjà payée ne se repaie pas à chaque fragment),
-- et l'audit — ce que fal et Anthropic m'ont coûté face à ce que le magasin
-- m'a rapporté.
CREATE TABLE IF NOT EXISTS public.usage_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'avatar' n'a pas de réserve d'essai : il est simplement plafonné par
  -- jour, pour tout le monde. Une photo de profil ne se refait pas dix fois.
  type       TEXT NOT NULL CHECK (type IN ('image_pro', 'partie_ia', 'lecture_dessin', 'avatar')),
  -- Identifiant de la partie pour 'partie_ia' : une partie se paie une fois,
  -- puis ses douze fragments passent librement. NULL pour les actes unitaires.
  reference  TEXT,
  sur_essai  BOOLEAN NOT NULL DEFAULT FALSE,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_reference
  ON public.usage_events(user_id, type, reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_jour
  ON public.usage_events(user_id, type, created_at DESC);

ALTER TABLE public.acces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Le joueur lit son état ; il ne l'écrit jamais.
DROP POLICY IF EXISTS "Lire son acces" ON public.acces;
CREATE POLICY "Lire son acces" ON public.acces
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Lire sa consommation" ON public.usage_events;
CREATE POLICY "Lire sa consommation" ON public.usage_events
  FOR SELECT USING (auth.uid() = user_id);

-- ── État courant ────────────────────────────────────────────────────────
-- Crée la ligne au premier appel : c'est là que la réserve d'essai est
-- attribuée, une seule fois, par la valeur par défaut des colonnes.
CREATE OR REPLACE FUNCTION public.etat_acces(p_user UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row acces%ROWTYPE;
BEGIN
  INSERT INTO acces (user_id) VALUES (p_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_row FROM acces WHERE user_id = p_user;

  RETURN jsonb_build_object(
    'abonne',       v_row.abonne_jusqu_a IS NOT NULL AND v_row.abonne_jusqu_a > NOW(),
    'jusqua',       v_row.abonne_jusqu_a,
    'produit',      v_row.produit,
    'essai', jsonb_build_object(
      'images',   v_row.essai_images,
      'parties',  v_row.essai_parties,
      'lectures', v_row.essai_lectures
    )
  );
END;
$$;

-- ── Consommation ────────────────────────────────────────────────────────
-- Un seul point de passage pour les trois actes payants. Renvoie toujours un
-- objet : { autorise, motif, abonne, essai_restant, deja }.
--
-- `deja` signale une référence déjà réglée — c'est ce qui permet aux douze
-- fragments d'une même partie de passer sans jamais recompter, et rend
-- l'opération rejouable sans risque si le réseau bégaie.
CREATE OR REPLACE FUNCTION public.consommer_acces(
  p_user         UUID,
  p_type         TEXT,
  p_reference    TEXT    DEFAULT NULL,
  p_plafond_jour INTEGER DEFAULT NULL,
  p_detail       JSONB   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row     acces%ROWTYPE;
  v_abonne  BOOLEAN;
  v_reste   INTEGER;
  v_faites  INTEGER;
  v_event   BIGINT;
BEGIN
  INSERT INTO acces (user_id) VALUES (p_user) ON CONFLICT (user_id) DO NOTHING;

  -- Verrou de ligne : deux requêtes simultanées ne peuvent pas dépenser le
  -- même dernier essai.
  SELECT * INTO v_row FROM acces WHERE user_id = p_user FOR UPDATE;
  v_abonne := v_row.abonne_jusqu_a IS NOT NULL AND v_row.abonne_jusqu_a > NOW();

  -- Déjà réglé sous cette référence : on laisse passer sans rien recompter.
  IF p_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM usage_events
    WHERE user_id = p_user AND type = p_type AND reference = p_reference
  ) THEN
    RETURN jsonb_build_object('autorise', TRUE, 'deja', TRUE, 'abonne', v_abonne);
  END IF;

  v_reste := CASE p_type
    WHEN 'image_pro'      THEN v_row.essai_images
    WHEN 'partie_ia'      THEN v_row.essai_parties
    WHEN 'lecture_dessin' THEN v_row.essai_lectures
    ELSE NULL
  END;

  -- Plafond journalier : il vaut pour l'abonné, et pour les actes sans
  -- réserve d'essai (avatar) quel que soit le statut.
  --
  -- On ne compte QUE ce qui n'a pas été pris sur l'essai. Sinon celui qui
  -- s'abonne le jour même où il a épuisé sa réserve resterait bloqué jusqu'au
  -- lendemain : ses images d'essai auraient déjà rempli le plafond de
  -- l'abonné. L'essai est borné par lui-même ; le plafond ne garde que
  -- l'abonnement.
  IF p_plafond_jour IS NOT NULL AND (v_abonne OR v_reste IS NULL) THEN
    SELECT COUNT(*) INTO v_faites FROM usage_events
    WHERE user_id = p_user AND type = p_type AND sur_essai = FALSE
      AND created_at >= date_trunc('day', NOW());
    IF v_faites >= p_plafond_jour THEN
      RETURN jsonb_build_object(
        'autorise', FALSE, 'motif', 'plafond_jour',
        'abonne', v_abonne, 'plafond', p_plafond_jour
      );
    END IF;
  END IF;

  IF v_abonne OR v_reste IS NULL THEN
    INSERT INTO usage_events (user_id, type, reference, sur_essai, detail)
    VALUES (p_user, p_type, p_reference, FALSE, p_detail)
    RETURNING id INTO v_event;
    RETURN jsonb_build_object('autorise', TRUE, 'abonne', v_abonne, 'event', v_event);
  END IF;

  -- Non abonné : on puise dans la réserve d'essai.
  IF v_reste <= 0 THEN
    RETURN jsonb_build_object(
      'autorise', FALSE, 'motif', 'essai_epuise', 'abonne', FALSE, 'essai_restant', 0
    );
  END IF;

  UPDATE acces SET
    essai_images   = essai_images   - (CASE WHEN p_type = 'image_pro'      THEN 1 ELSE 0 END),
    essai_parties  = essai_parties  - (CASE WHEN p_type = 'partie_ia'      THEN 1 ELSE 0 END),
    essai_lectures = essai_lectures - (CASE WHEN p_type = 'lecture_dessin' THEN 1 ELSE 0 END),
    updated_at     = NOW()
  WHERE user_id = p_user;

  INSERT INTO usage_events (user_id, type, reference, sur_essai, detail)
  VALUES (p_user, p_type, p_reference, TRUE, p_detail)
  RETURNING id INTO v_event;

  RETURN jsonb_build_object(
    'autorise', TRUE, 'abonne', FALSE, 'essai_restant', v_reste - 1, 'event', v_event
  );
END;
$$;

-- ── Restitution ─────────────────────────────────────────────────────────
-- La génération a échoué : le joueur ne paie que ce qu'il a réellement
-- obtenu. On efface l'événement DÉSIGNÉ — pas « le dernier du même type » :
-- deux illustrations lancées de front, l'une réussie l'autre non, et la
-- restitution de la seconde annulerait la première.
CREATE OR REPLACE FUNCTION public.rendre_acces(p_user UUID, p_event BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type TEXT; v_essai BOOLEAN;
BEGIN
  DELETE FROM usage_events
  WHERE id = p_event AND user_id = p_user
  RETURNING type, sur_essai INTO v_type, v_essai;

  IF v_type IS NULL THEN RETURN; END IF;

  IF v_essai THEN
    UPDATE acces SET
      essai_images   = essai_images   + (CASE WHEN v_type = 'image_pro'      THEN 1 ELSE 0 END),
      essai_parties  = essai_parties  + (CASE WHEN v_type = 'partie_ia'      THEN 1 ELSE 0 END),
      essai_lectures = essai_lectures + (CASE WHEN v_type = 'lecture_dessin' THEN 1 ELSE 0 END),
      updated_at     = NOW()
    WHERE user_id = p_user;
  END IF;
END;
$$;

-- ── Abonnement ──────────────────────────────────────────────────────────
-- Appelée uniquement par le webhook du magasin, après vérification de sa
-- signature. `p_jusqu_a` vient de la date d'expiration transmise par le
-- magasin : une résiliation laisse l'accès courir jusqu'au terme payé, une
-- expiration le referme, et un renouvellement le repousse — un seul chemin
-- pour les trois.
CREATE OR REPLACE FUNCTION public.poser_abonnement(
  p_user UUID, p_jusqu_a TIMESTAMPTZ, p_produit TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO acces (user_id, abonne_jusqu_a, produit)
  VALUES (p_user, p_jusqu_a, p_produit)
  ON CONFLICT (user_id) DO UPDATE
    SET abonne_jusqu_a = EXCLUDED.abonne_jusqu_a,
        produit        = COALESCE(EXCLUDED.produit, acces.produit),
        updated_at     = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.etat_acces(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consommer_acces(UUID, TEXT, TEXT, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rendre_acces(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.poser_abonnement(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
