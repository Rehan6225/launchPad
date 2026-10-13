-- Launchpad schema
-- The committed plan (weeks / week_outcomes / planned_tasks) is kept
-- deliberately separate from the execution record (daily_logs / log_entries).

CREATE TABLE IF NOT EXISTS missions (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL DEFAULT '',
  current_ctc_lpa NUMERIC(6, 2) NOT NULL,
  target_ctc_lpa  NUMERIC(6, 2) NOT NULL,
  target_date     DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mission_pillars (
  id          SERIAL PRIMARY KEY,
  mission_id  INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ---------- Plan (immutable intent) ----------

CREATE TABLE IF NOT EXISTS weeks (
  id          SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  theme       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_number)
);

CREATE TABLE IF NOT EXISTS week_outcomes (
  id          SERIAL PRIMARY KEY,
  week_id     INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  achieved    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS planned_tasks (
  id              SERIAL PRIMARY KEY,
  week_id         INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'General',
  planned_date    DATE NOT NULL,
  estimated_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
  priority        TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2')),
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'in_progress', 'done', 'skipped')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planned_tasks_week_idx ON planned_tasks (week_id);

-- ---------- Execution (what actually happened) ----------

CREATE TABLE IF NOT EXISTS daily_logs (
  id                  SERIAL PRIMARY KEY,
  log_date            DATE NOT NULL UNIQUE,
  planned_minutes     INTEGER NOT NULL DEFAULT 0,
  actual_minutes      INTEGER NOT NULL DEFAULT 0,
  dsa_problems_solved INTEGER NOT NULL DEFAULT 0,
  dsa_topics          TEXT NOT NULL DEFAULT '',
  blockers            TEXT NOT NULL DEFAULT '',
  reflection          TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS log_entries (
  id             SERIAL PRIMARY KEY,
  log_id         INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  task_id        INTEGER REFERENCES planned_tasks(id) ON DELETE SET NULL,
  task_title     TEXT NOT NULL,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  outcome        TEXT NOT NULL DEFAULT 'done'
                 CHECK (outcome IN ('done', 'partial', 'skipped')),
  notes          TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS log_entries_log_idx ON log_entries (log_id);

-- ---------- Pipeline ----------

CREATE TABLE IF NOT EXISTS applications (
  id               SERIAL PRIMARY KEY,
  company          TEXT NOT NULL,
  role             TEXT NOT NULL,
  expected_ctc_lpa NUMERIC(6, 2),
  offered_ctc_lpa  NUMERIC(6, 2),
  referral_source  TEXT,
  status           TEXT NOT NULL DEFAULT 'wishlist'
                   CHECK (status IN ('wishlist', 'applied', 'in_process', 'offer', 'rejected', 'on_hold')),
  applied_on       DATE,
  next_follow_up   DATE,
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interview_rounds (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  scheduled_at   DATE,
  status         TEXT NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled', 'cleared', 'failed', 'cancelled')),
  feedback       TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS interview_rounds_app_idx ON interview_rounds (application_id);
