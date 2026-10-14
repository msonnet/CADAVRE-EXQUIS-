-- ══════════════════════════════════════════════════════════
-- CADAVRE EXQUIS — Le lancement : salons privés, exclusion, convenance
-- À appliquer à la main : copier TOUT ce fichier dans l'éditeur SQL de
-- Supabase (SQL Editor → New query), puis Run. Sans elle, l'app
-- fonctionne comme avant : les salons naissent privés (le client le dit),
-- retirer une main répond « pas encore possible sur ce serveur », et le
-- filtre ne vit que côté client et côté API du poème du jour.
-- ══════════════════════════════════════════════════════════

-- ── 0. Les colonnes dont elle dépend ──────────────────────
-- Posées par des migrations antérieures ; redites ici pour qu'elle passe
-- même si l'une d'elles n'a jamais été appliquée.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS langue TEXT DEFAULT 'fr';

-- ── 1. Un salon est privé par défaut ──────────────────────
-- Le client l'écrit déjà explicitement ; la valeur par défaut le dit aussi
-- pour toute insertion qui l'oublierait.
ALTER TABLE rooms ALTER COLUMN is_public SET DEFAULT FALSE;

-- ── 2. L'hôte peut retirer une main ───────────────────────
-- Les exclus d'une table ne peuvent plus s'y rasseoir : sans cette liste,
-- une main retirée revenait en rechargeant la page.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS exclus UUID[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "Hôte retire une main" ON room_players;
CREATE POLICY "Hôte retire une main"
  ON room_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.code = room_code AND r.host_id = auth.uid() AND r.status = 'waiting'
    )
  );

-- On ne s'assoit qu'à une table qui attend, et dont on n'a pas été retiré.
-- Avant, n'importe qui pouvait s'insérer dans une partie commencée et en
-- changer le nombre de mains.
DROP POLICY IF EXISTS "Rejoindre un salon" ON room_players;
CREATE POLICY "Rejoindre un salon"
  ON room_players FOR INSERT
  WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.code = room_code AND r.status = 'waiting' AND NOT (auth.uid() = ANY (r.exclus))
    )
  );

-- ── 3. La convenance ──────────────────────────────────────
-- Les mêmes listes que `src/lib/convenance.ts` et `api/_convenance.ts` :
-- `convenance.test.ts` les tient d'accord. Le pourquoi est écrit dans le
-- fichier du client.

CREATE OR REPLACE FUNCTION cadavre_squelette(t TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    translate(
      replace(replace(lower(coalesce(t, '')), 'œ', 'oe'), 'æ', 'ae'),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ0134578@$€',
      'aaaaaaceeeeiiiinooooouuuuyyoieastbase'),
    '[.*_]', ' ', 'g')
$$;

CREATE OR REPLACE FUNCTION cadavre_inconvenant(t TEXT, langue TEXT DEFAULT 'tout')
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  communs TEXT[] := ARRAY['nigger', 'nigga', 'negre', 'negresse', 'bougnoule', 'bicot', 'youpin', 'youtre', 'faggot', 'fag', 'tarlouze', 'tafiole', 'pede', 'pd', 'gouine', 'kike', 'chink', 'tranny', 'hitler', 'nazi', 'porno', 'porn', 'pornographie', 'pedophile', 'pedo']::text[];
  fr      TEXT[] := ARRAY['pute', 'putain', 'salope', 'salopard', 'salaud', 'connard', 'connarde', 'connasse', 'con', 'conne', 'nique', 'niquer', 'bite', 'couille', 'petasse', 'poufiasse', 'pouffiasse', 'branleur', 'branleuse', 'branlette', 'suceuse', 'fellation', 'viol', 'violeur', 'violeuse']::text[];
  en      TEXT[] := ARRAY['cunt', 'whore', 'slut', 'bitch', 'asshole', 'dickhead', 'twat', 'jizz', 'blowjob', 'handjob', 'rape', 'rapist', 'retard', 'wanker']::text[];
  racines TEXT[] := ARRAY['fuck', 'encul', 'motherf', 'fagg', 'pedophil']::text[];
  mots    TEXT[];
  sq      TEXT := cadavre_squelette(t);
  exacts  TEXT;
  rac     TEXT;
  tok     TEXT;
  suite   TEXT := '';
  recolles TEXT := '';
BEGIN
  IF btrim(sq) = '' THEN RETURN FALSE; END IF;
  -- les mots épelés lettre à lettre (« p u t e », « f.u.c.k ») sont recollés
  FOREACH tok IN ARRAY regexp_split_to_array(sq, '[^a-z]+') || ARRAY['']::TEXT[] LOOP
    IF length(tok) = 1 THEN
      suite := suite || tok;
    ELSE
      IF length(suite) >= 3 THEN recolles := recolles || ' ' || suite; END IF;
      suite := '';
    END IF;
  END LOOP;
  sq := sq || recolles;
  mots := communs
    || CASE WHEN langue <> 'en' THEN fr ELSE '{}'::TEXT[] END
    || CASE WHEN langue <> 'fr' THEN en ELSE '{}'::TEXT[] END;
  -- chaque lettre admet ses doublons : « fuck » devient f+u+c+k+
  SELECT string_agg(regexp_replace(m, '(.)', '\1+', 'g'), '|') INTO exacts FROM unnest(mots) m;
  SELECT string_agg(regexp_replace(m, '(.)', '\1+', 'g'), '|') INTO rac FROM unnest(racines) m;
  RETURN sq ~ ('(^|[^a-z])(' || exacts || ')(s|x)?([^a-z]|$)')
      OR sq ~ ('(' || rac || ')');
END
$$;

-- Les noms de plume : au profil, et recopiés à la table d'un salon.
CREATE OR REPLACE FUNCTION cadavre_pseudo_convenable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF cadavre_inconvenant(NEW.pseudo, 'tout') THEN
    RAISE EXCEPTION 'pseudo_inconvenant' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS pseudo_convenable ON profiles;
CREATE TRIGGER pseudo_convenable
  BEFORE INSERT OR UPDATE OF pseudo ON profiles
  FOR EACH ROW EXECUTE FUNCTION cadavre_pseudo_convenable();

DROP TRIGGER IF EXISTS pseudo_convenable ON room_players;
CREATE TRIGGER pseudo_convenable
  BEFORE INSERT OR UPDATE OF pseudo ON room_players
  FOR EACH ROW EXECUTE FUNCTION cadavre_pseudo_convenable();

-- Les fragments d'un salon PUBLIC : des inconnus les liront à la révélation.
-- Une table privée est une table d'amis, on n'y regarde pas. Les bandes
-- dessinées (« data: », ou l'objet JSON du salon) ne sont pas du texte.
CREATE OR REPLACE FUNCTION cadavre_fragment_convenable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  publique BOOLEAN;
  lg TEXT;
BEGIN
  IF NEW.texte LIKE 'data:%' OR NEW.texte LIKE '{%' THEN RETURN NEW; END IF;
  SELECT r.is_public, coalesce(r.langue, 'fr') INTO publique, lg FROM rooms r WHERE r.code = NEW.room_code;
  IF coalesce(publique, FALSE) AND cadavre_inconvenant(NEW.texte, lg) THEN
    RAISE EXCEPTION 'fragment_inconvenant' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS fragment_convenable ON contributions;
CREATE TRIGGER fragment_convenable
  BEFORE INSERT ON contributions
  FOR EACH ROW EXECUTE FUNCTION cadavre_fragment_convenable();

-- La galerie : le titre, le nom de l'auteur, et les cases d'un poème.
CREATE OR REPLACE FUNCTION cadavre_publication_convenable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  p JSONB;
  lg TEXT := 'tout';
  corps TEXT := '';
BEGIN
  BEGIN
    p := NEW.payload::JSONB;
    lg := CASE WHEN p->>'langue' IN ('fr', 'en') THEN p->>'langue' ELSE 'tout' END;
    IF jsonb_typeof(p->'cases') = 'array' THEN
      SELECT coalesce(string_agg(c->>'texte', ' '), '') INTO corps FROM jsonb_array_elements(p->'cases') c;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- une charge illisible n'empêche pas de juger le titre et le nom
  END;
  IF cadavre_inconvenant(NEW.author_pseudo, 'tout')
     OR cadavre_inconvenant(NEW.titre, lg)
     OR cadavre_inconvenant(corps, lg) THEN
    RAISE EXCEPTION 'publication_inconvenante' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS publication_convenable ON gallery;
CREATE TRIGGER publication_convenable
  BEFORE INSERT ON gallery
  FOR EACH ROW EXECUTE FUNCTION cadavre_publication_convenable();
