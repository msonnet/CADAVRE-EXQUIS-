-- ══════════════════════════════════════════════════════════════════════
-- Le cadavre du jour à plusieurs mains
--
-- Tu n'écris pas un poème : tu écris UNE case d'un poème commencé par
-- quelqu'un d'autre. Tu vois l'amorce du jour — elle est publique — et rien
-- d'autre. Le poème se scelle quand ses cases sont pleines, et tu découvres
-- alors où ta main a atterri, entre des mains que tu ne connaîtras jamais.
--
-- C'est le cadavre exquis de 1925 : plusieurs mains, chacune aveugle des
-- autres. Les voix de l'IA n'y remplacent pas les joueurs, elles prennent
-- les sièges que personne n'a pris.
--
-- ── Ce que la base ne fait PAS ────────────────────────────────────────────
--
-- Elle ne décide rien. Quel siège tendre, quand une voix doit combler, ce
-- qu'on accepte comme fragment : tout cela vit dans `src/lib/jourLogique.ts`,
-- où cela se mesure. Dispersées en SQL, ces règles seraient invérifiables.
-- Ici : des tables, des contraintes d'intégrité, et le strict nécessaire de
-- garde-fous qu'un client ne doit pas pouvoir contourner.
--
-- ── L'aveuglement est tenu par les DROITS, pas par l'interface ────────────
--
-- Un joueur ne peut lire un fragment qu'une fois le poème SCELLÉ. Sans cette
-- règle, n'importe qui lirait la table et verrait les cases voisines avant
-- d'écrire la sienne — le jeu entier repose sur le fait que c'est
-- impossible. Ce n'est pas une politesse d'affichage, c'est la règle du jeu,
-- et elle se pose ici.
-- ══════════════════════════════════════════════════════════════════════

-- Un poème du jour en cours d'écriture.
CREATE TABLE IF NOT EXISTS public.jour_poemes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- AAAA-MM-JJ du rendez-vous. Le jour est UTC côté serveur : c'est la seule
  -- horloge que tout le monde partage. Le client, lui, affiche son jour local
  -- — l'écart est d'au plus quelques heures et ne change rien au jeu, alors
  -- qu'une table par fuseau éclaterait le rendez-vous en vingt-quatre.
  jour         DATE NOT NULL,
  langue       TEXT NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'en')),
  structure_id TEXT NOT NULL,
  -- L'amorce, recopiée : la galerie doit se lire sans rejouer le calcul de
  -- la contrainte, et une amorce qui changerait de code ne doit pas réécrire
  -- les poèmes d'hier.
  amorce       TEXT NOT NULL,
  nb_cases     INT  NOT NULL CHECK (nb_cases BETWEEN 2 AND 12),
  scelle_le    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jour_poemes_ouverts
  ON public.jour_poemes(jour, langue) WHERE scelle_le IS NULL;
CREATE INDEX IF NOT EXISTS idx_jour_poemes_scelles
  ON public.jour_poemes(jour, langue, scelle_le DESC) WHERE scelle_le IS NOT NULL;

-- Une case. Elle n'existe QUE remplie : un siège libre est un rang absent.
-- Insérer les cases vides à l'ouverture aurait exigé de les mettre à jour,
-- donc d'accorder un droit d'écriture sur des lignes qu'on ne possède pas.
CREATE TABLE IF NOT EXISTS public.jour_cases (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poeme_id   UUID NOT NULL REFERENCES public.jour_poemes ON DELETE CASCADE,
  rang       INT  NOT NULL CHECK (rang >= 1),
  -- NULL quand c'est une voix : elle n'appartient à personne.
  main_id    UUID REFERENCES auth.users ON DELETE SET NULL,
  pseudo     TEXT,
  voix       BOOLEAN NOT NULL DEFAULT FALSE,
  voix_nom   TEXT,
  texte      TEXT NOT NULL CHECK (length(btrim(texte)) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un rang ne se remplit qu'une fois : c'est la garde contre deux mains
  -- servies au même siège par deux requêtes simultanées. Le client peut
  -- tenter, la base tranche.
  UNIQUE (poeme_id, rang)
);

-- Une main ne prend qu'UN siège par poème. Sans cela elle verrait la moitié
-- de la phrase et pourrait la diriger — c'est la règle qui protège le jeu, et
-- elle ne peut pas vivre seulement dans le code client.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jour_une_main_par_poeme
  ON public.jour_cases(poeme_id, main_id) WHERE main_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jour_cases_poeme ON public.jour_cases(poeme_id, rang);
CREATE INDEX IF NOT EXISTS idx_jour_cases_main  ON public.jour_cases(main_id, created_at DESC);

ALTER TABLE public.jour_poemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jour_cases  ENABLE ROW LEVEL SECURITY;

-- ── Lecture ───────────────────────────────────────────────────────────────
-- Les poèmes sont publics : leur amorce et leur avancement n'ont rien de
-- secret, et c'est ce qui permet d'annoncer « trois mains sur quatre ».
DROP POLICY IF EXISTS "Lire les poemes du jour" ON public.jour_poemes;
CREATE POLICY "Lire les poemes du jour" ON public.jour_poemes
  FOR SELECT USING (TRUE);

-- Les FRAGMENTS, eux, ne se lisent qu'une fois le poème scellé — ou s'ils
-- sont les siens. C'est l'aveuglement, tenu par les droits.
DROP POLICY IF EXISTS "Lire les cases scellees" ON public.jour_cases;
CREATE POLICY "Lire les cases scellees" ON public.jour_cases
  FOR SELECT USING (
    auth.uid() = main_id
    OR EXISTS (
      SELECT 1 FROM public.jour_poemes p
      WHERE p.id = jour_cases.poeme_id AND p.scelle_le IS NOT NULL
    )
  );

-- ── Écriture ──────────────────────────────────────────────────────────────
-- Rien. Pas une seule politique d'écriture pour le joueur : ouvrir un poème,
-- poser un fragment, appeler une voix, sceller — tout passe par les fonctions
-- Vercel en service_role, qui sont les seules à voir l'état complet et donc
-- les seules à pouvoir décider sans tricher.

-- ── Ménage ────────────────────────────────────────────────────────────────
-- Les poèmes du jour ne sont pas la galerie : ils vivent le temps qu'on
-- puisse les découvrir, puis s'effacent. Ce qui mérite d'être gardé est
-- publié en galerie par celui qui y a mis la main.
CREATE OR REPLACE FUNCTION public.nettoyer_jour(p_jours INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n INT;
BEGIN
  DELETE FROM jour_poemes WHERE jour < (CURRENT_DATE - p_jours);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
