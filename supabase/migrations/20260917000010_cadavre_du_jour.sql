-- ══════════════════════════════════════════════════════════════════════
-- Le poème du jour — une chaîne, une main, un vers
--
-- UN seul poème par jour et par langue. Chaque main qui passe y ajoute un
-- vers à la suite, en ne voyant que le DERNIER MOT du vers précédent. À
-- minuit UTC la chaîne se scelle et se dévoile.
--
-- La longueur du poème EST le nombre de gens venus : un joueur, cinq vers ;
-- deux cents joueurs, deux cents vers. C'est pour cela que rien ici ne fixe
-- de taille — la première version en fixait une, et faisait du NOMBRE de
-- poèmes la variable d'ajustement, si bien qu'à deux cents joueurs « LE
-- poème du jour » désignait trente-trois parties privées.
--
-- ── Ce que la base ne fait PAS ────────────────────────────────────────────
--
-- Elle ne décide rien. L'écho, le plancher de cinq vers, ce qu'on accepte
-- comme vers : tout cela vit dans `src/lib/jourLogique.ts` et `api/_jour.ts`,
-- où cela se mesure. Ici : des tables, des contraintes d'intégrité, et les
-- garde-fous qu'un client ne doit pas pouvoir contourner.
--
-- ── L'aveuglement est tenu par les DROITS, pas par l'interface ────────────
--
-- Un joueur ne peut lire les vers qu'une fois la chaîne SCELLÉE. Sans cette
-- règle, n'importe qui lirait la table et verrait le poème entier avant
-- d'écrire — le jeu repose sur le fait que c'est impossible. Ce n'est pas
-- une politesse d'affichage, c'est le pli du papier, et il se pose ici.
-- ══════════════════════════════════════════════════════════════════════

-- Nettoyage d'un premier jet jamais appliqué (modèle à sièges, abandonné).
DROP TABLE IF EXISTS public.jour_cases;
DROP TABLE IF EXISTS public.jour_poemes;
DROP FUNCTION IF EXISTS public.nettoyer_jour(INT);

CREATE TABLE IF NOT EXISTS public.jour_chaines (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Le jour est UTC : c'est la seule horloge que tout le monde partage. Dès
  -- que les vers circulent, le jour local devient impossible — un joueur à
  -- Lisbonne à 00 h 30 serait déjà sur la journée suivante et ne pourrait
  -- pas s'asseoir à la même table qu'un joueur à Paris.
  jour       DATE NOT NULL,
  langue     TEXT NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'en')),
  -- L'amorce, recopiée : le poème d'hier ne doit pas changer si le sac
  -- d'amorces change de code, et la galerie doit se lire sans rejouer le
  -- calcul du jour.
  amorce     TEXT NOT NULL,
  scelle_le  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- UNE chaîne par jour et par langue. C'est toute la promesse du « LE ».
  UNIQUE (jour, langue)
);

CREATE INDEX IF NOT EXISTS idx_jour_chaines_scellees
  ON public.jour_chaines(langue, jour DESC) WHERE scelle_le IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.jour_vers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chaine_id  UUID NOT NULL REFERENCES public.jour_chaines ON DELETE CASCADE,
  rang       INT  NOT NULL CHECK (rang >= 1),
  -- NULL quand c'est une voix : elle n'appartient à personne.
  main_id    UUID REFERENCES auth.users ON DELETE SET NULL,
  pseudo     TEXT,
  voix       BOOLEAN NOT NULL DEFAULT FALSE,
  voix_nom   TEXT,
  texte      TEXT NOT NULL CHECK (length(btrim(texte)) BETWEEN 1 AND 100),
  -- Un vers signalé est REMPLACÉ, jamais effacé : un trou casserait la
  -- chaîne et l'écho de la main suivante ne voudrait plus rien dire.
  retire     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un rang ne se remplit qu'une fois : c'est la garde contre deux mains
  -- servies au même rang par deux requêtes simultanées. Le client peut
  -- tenter, la base tranche, le serveur repropose le rang suivant.
  UNIQUE (chaine_id, rang)
);

-- Une main, un vers, un jour. Sans cet index, une seule personne pourrait
-- écrire tout le poème du jour — et cesserait d'être aveugle. C'est aussi
-- ce qui fait que la longueur du poème compte les GENS et non les bavards ;
-- la règle ne peut donc pas vivre seulement dans le code client.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jour_une_main_par_chaine
  ON public.jour_vers(chaine_id, main_id) WHERE main_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jour_vers_chaine ON public.jour_vers(chaine_id, rang);
CREATE INDEX IF NOT EXISTS idx_jour_vers_main   ON public.jour_vers(main_id, created_at DESC);

ALTER TABLE public.jour_chaines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jour_vers    ENABLE ROW LEVEL SECURITY;

-- ── Lecture ───────────────────────────────────────────────────────────────
-- La chaîne est publique : son amorce et le fait qu'elle soit scellée n'ont
-- rien de secret. Le NOMBRE de vers ne se lit pas ici — il passe par l'API,
-- qui est aussi ce qui permet d'annoncer « tu seras la XXXVᵉ main ».
DROP POLICY IF EXISTS "Lire les chaines du jour" ON public.jour_chaines;
CREATE POLICY "Lire les chaines du jour" ON public.jour_chaines
  FOR SELECT USING (TRUE);

-- Les VERS ne se lisent qu'une fois la chaîne scellée — ou si c'est le sien.
-- C'est le pli du papier.
DROP POLICY IF EXISTS "Lire les vers scelles" ON public.jour_vers;
CREATE POLICY "Lire les vers scelles" ON public.jour_vers
  FOR SELECT USING (
    auth.uid() = main_id
    OR EXISTS (
      SELECT 1 FROM public.jour_chaines c
      WHERE c.id = jour_vers.chaine_id AND c.scelle_le IS NOT NULL
    )
  );

-- ── Écriture ──────────────────────────────────────────────────────────────
-- Rien. Pas une seule politique d'écriture pour le joueur : ouvrir la
-- chaîne, y poser un vers, appeler une voix, sceller — tout passe par les
-- fonctions Vercel en service_role, les seules à voir l'état complet et donc
-- les seules à pouvoir décider sans tricher.

-- ── Ménage ────────────────────────────────────────────────────────────────
-- Les chaînes ne sont pas la galerie : elles vivent le temps qu'on puisse
-- les découvrir, puis s'effacent. Ce qui mérite d'être gardé est publié en
-- galerie par une main qui y était.
CREATE OR REPLACE FUNCTION public.nettoyer_jour(p_jours INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n INT;
BEGIN
  DELETE FROM jour_chaines WHERE jour < (CURRENT_DATE - p_jours);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
