-- ══════════════════════════════════════════════════════════
-- CADAVRE EXQUIS — Schéma multijoueur en ligne
-- Exécuter dans l'éditeur SQL de Supabase
-- ══════════════════════════════════════════════════════════

-- Profiles (extension de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  pseudo      TEXT NOT NULL CHECK (length(pseudo) BETWEEN 1 AND 30),
  avatar_url  TEXT,
  avatar_prompt TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Salons de jeu
CREATE TABLE IF NOT EXISTS rooms (
  code           TEXT PRIMARY KEY,
  host_id        UUID REFERENCES auth.users ON DELETE SET NULL,
  mode           TEXT NOT NULL DEFAULT 'ecrit' CHECK (mode IN ('ecrit', 'dessin')),
  structure_id   TEXT NOT NULL DEFAULT 'phrase-simple',
  nb_joueurs     INT NOT NULL DEFAULT 3 CHECK (nb_joueurs BETWEEN 2 AND 8),
  status         TEXT NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'playing', 'finished')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours')
);

-- Joueurs dans un salon
CREATE TABLE IF NOT EXISTS room_players (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code     TEXT REFERENCES rooms ON DELETE CASCADE NOT NULL,
  player_id     UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  pseudo        TEXT NOT NULL,
  avatar_url    TEXT,
  order_index   INT,
  is_ready      BOOLEAN DEFAULT FALSE,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_code, player_id)
);

-- Contributions (les cases du cadavre)
CREATE TABLE IF NOT EXISTS contributions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code     TEXT REFERENCES rooms ON DELETE CASCADE NOT NULL,
  player_id     UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  case_index    INT NOT NULL,
  texte         TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_code, case_index)
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_code);
CREATE INDEX IF NOT EXISTS idx_contributions_room ON contributions(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at);

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profil public en lecture"
  ON profiles FOR SELECT USING (TRUE);

CREATE POLICY "Créer son profil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Modifier son profil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Rooms
CREATE POLICY "Salons publics en lecture"
  ON rooms FOR SELECT USING (TRUE);

CREATE POLICY "Créer un salon"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hôte modifie le salon"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id);

-- Room players
CREATE POLICY "Joueurs publics en lecture"
  ON room_players FOR SELECT USING (TRUE);

CREATE POLICY "Rejoindre un salon"
  ON room_players FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Modifier son statut prêt"
  ON room_players FOR UPDATE
  USING (auth.uid() = player_id);

CREATE POLICY "Quitter un salon"
  ON room_players FOR DELETE
  USING (auth.uid() = player_id);

-- Contributions
CREATE POLICY "Contributions visibles quand partie terminée"
  ON contributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.code = room_code AND (
        r.status = 'finished' OR r.host_id = auth.uid()
      )
    )
    OR player_id = auth.uid()
  );

CREATE POLICY "Soumettre sa contribution"
  ON contributions FOR INSERT
  WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.code = room_code AND r.status = 'playing'
    )
  );

-- ── Realtime ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE contributions;

-- ── Trigger updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Nettoyage automatique des salons expirés ─────────────
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM rooms WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
