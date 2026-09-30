-- ============================================
-- CricScore+ Database Schema
-- Box Cricket Live Scorer
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAYERS
-- ============================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

-- ============================================
-- MATCHES
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_a_id UUID NOT NULL REFERENCES teams(id),
  team_b_id UUID NOT NULL REFERENCES teams(id),
  batting_first_team_id UUID NOT NULL REFERENCES teams(id),
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'completed', 'abandoned')),
  current_innings INTEGER NOT NULL DEFAULT 1 CHECK (current_innings IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INNINGS
-- ============================================
CREATE TABLE IF NOT EXISTS innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  batting_team_id UUID NOT NULL REFERENCES teams(id),
  bowling_team_id UUID NOT NULL REFERENCES teams(id),
  innings_number INTEGER NOT NULL CHECK (innings_number IN (1, 2)),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  target INTEGER, -- only set for 2nd innings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, innings_number)
);

CREATE INDEX IF NOT EXISTS idx_innings_match ON innings(match_id);

-- ============================================
-- DELIVERIES (ball-by-ball - authoritative source)
-- ============================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_id UUID NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL, -- delivery count within the over (includes extras)
  striker_id UUID NOT NULL REFERENCES players(id),
  non_striker_id UUID NOT NULL REFERENCES players(id),
  bowler_id UUID NOT NULL REFERENCES players(id),
  batter_runs INTEGER NOT NULL DEFAULT 0,
  extra_runs INTEGER NOT NULL DEFAULT 0,
  extra_type TEXT CHECK (extra_type IN ('wide', 'no_ball', 'bye', 'leg_bye', NULL)),
  total_runs INTEGER NOT NULL DEFAULT 0,
  is_wicket BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_player_id UUID REFERENCES players(id),
  wicket_type TEXT CHECK (wicket_type IN ('bowled', 'caught', 'run_out', 'stumped', 'hit_wicket', 'retired', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_innings ON deliveries(innings_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_match ON deliveries(match_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(innings_id, over_number, ball_number);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for future viewer module)
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON innings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON deliveries FOR SELECT USING (true);

-- Allow authenticated and anon insert/update/delete (scorer operations)
-- In production, restrict these to authenticated users only
CREATE POLICY "Scorer write access" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Scorer update access" ON matches FOR UPDATE USING (true);
CREATE POLICY "Scorer write access" ON innings FOR INSERT WITH CHECK (true);
CREATE POLICY "Scorer update access" ON innings FOR UPDATE USING (true);
CREATE POLICY "Scorer write access" ON deliveries FOR INSERT WITH CHECK (true);
CREATE POLICY "Scorer delete access" ON deliveries FOR DELETE USING (true);

-- ============================================
-- ENABLE REALTIME (for future viewer module)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE innings;

-- ============================================
-- SEED DATA: 5 Tournament Teams with 8 Players Each
-- ============================================

-- Team 1: Titans
INSERT INTO teams (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Titans');
INSERT INTO players (team_id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Rohit Sharma'),
  ('11111111-1111-1111-1111-111111111111', 'Virat Kohli'),
  ('11111111-1111-1111-1111-111111111111', 'Shubman Gill'),
  ('11111111-1111-1111-1111-111111111111', 'KL Rahul'),
  ('11111111-1111-1111-1111-111111111111', 'Suryakumar Yadav'),
  ('11111111-1111-1111-1111-111111111111', 'Rishabh Pant'),
  ('11111111-1111-1111-1111-111111111111', 'Hardik Pandya'),
  ('11111111-1111-1111-1111-111111111111', 'Ravindra Jadeja');

-- Team 2: Raptors
INSERT INTO teams (id, name) VALUES ('22222222-2222-2222-2222-222222222222', 'Raptors');
INSERT INTO players (team_id, name) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Jasprit Bumrah'),
  ('22222222-2222-2222-2222-222222222222', 'Mohammed Shami'),
  ('22222222-2222-2222-2222-222222222222', 'Mohammed Siraj'),
  ('22222222-2222-2222-2222-222222222222', 'Kuldeep Yadav'),
  ('22222222-2222-2222-2222-222222222222', 'Yuzvendra Chahal'),
  ('22222222-2222-2222-2222-222222222222', 'Shardul Thakur'),
  ('22222222-2222-2222-2222-222222222222', 'Axar Patel'),
  ('22222222-2222-2222-2222-222222222222', 'Ravichandran Ashwin');

-- Team 3: Strikers
INSERT INTO teams (id, name) VALUES ('33333333-3333-3333-3333-333333333333', 'Strikers');
INSERT INTO players (team_id, name) VALUES
  ('33333333-3333-3333-3333-333333333333', 'David Warner'),
  ('33333333-3333-3333-3333-333333333333', 'Steve Smith'),
  ('33333333-3333-3333-3333-333333333333', 'Marnus Labuschagne'),
  ('33333333-3333-3333-3333-333333333333', 'Glenn Maxwell'),
  ('33333333-3333-3333-3333-333333333333', 'Travis Head'),
  ('33333333-3333-3333-3333-333333333333', 'Cameron Green'),
  ('33333333-3333-3333-3333-333333333333', 'Pat Cummins'),
  ('33333333-3333-3333-3333-333333333333', 'Mitchell Starc');

-- Team 4: Blasters
INSERT INTO teams (id, name) VALUES ('44444444-4444-4444-4444-444444444444', 'Blasters');
INSERT INTO players (team_id, name) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Kane Williamson'),
  ('44444444-4444-4444-4444-444444444444', 'Devon Conway'),
  ('44444444-4444-4444-4444-444444444444', 'Daryl Mitchell'),
  ('44444444-4444-4444-4444-444444444444', 'Glenn Phillips'),
  ('44444444-4444-4444-4444-444444444444', 'Tim Southee'),
  ('44444444-4444-4444-4444-444444444444', 'Trent Boult'),
  ('44444444-4444-4444-4444-444444444444', 'Kyle Jamieson'),
  ('44444444-4444-4444-4444-444444444444', 'Mitchell Santner');

-- Team 5: Hawks
INSERT INTO teams (id, name) VALUES ('55555555-5555-5555-5555-555555555555', 'Hawks');
INSERT INTO players (team_id, name) VALUES
  ('55555555-5555-5555-5555-555555555555', 'Jos Buttler'),
  ('55555555-5555-5555-5555-555555555555', 'Ben Stokes'),
  ('55555555-5555-5555-5555-555555555555', 'Joe Root'),
  ('55555555-5555-5555-5555-555555555555', 'Jonny Bairstow'),
  ('55555555-5555-5555-5555-555555555555', 'Mark Wood'),
  ('55555555-5555-5555-5555-555555555555', 'Jofra Archer'),
  ('55555555-5555-5555-5555-555555555555', 'Moeen Ali'),
  ('55555555-5555-5555-5555-555555555555', 'Sam Curran');
