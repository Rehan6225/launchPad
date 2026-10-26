-- Launchpad schema
-- One idea: a task has a date, a pillar, and a done checkbox.
-- Weeks are not stored — a week is simply Monday..Sunday.

CREATE TABLE IF NOT EXISTS missions (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL DEFAULT '',
  current_ctc_lpa NUMERIC(6, 2) NOT NULL,
  target_ctc_lpa  NUMERIC(6, 2) NOT NULL,
  target_date     DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  pillar     TEXT NOT NULL
             CHECK (pillar IN ('dsa', 'system_design', 'projects', 'jobs')),
  task_date  DATE NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_date_idx ON tasks (task_date);

-- One free-text note per day ("what happened, what blocked me").
CREATE TABLE IF NOT EXISTS day_notes (
  note_date DATE PRIMARY KEY,
  note      TEXT NOT NULL DEFAULT ''
);

-- One focus line per week, keyed by the Monday.
CREATE TABLE IF NOT EXISTS week_focus (
  week_start DATE PRIMARY KEY,
  focus      TEXT NOT NULL DEFAULT ''
);

-- Job pipeline. `next_step` + `next_step_on` is what surfaces a company on the Today page;
-- `last_activity_on` is bumped on every change and drives the "stale" flag.
CREATE TABLE IF NOT EXISTS applications (
  id               SERIAL PRIMARY KEY,
  company          TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT '',
  pay_band         TEXT NOT NULL DEFAULT 'maybe'
                   CHECK (pay_band IN ('yes', 'maybe', 'no')),
  source           TEXT NOT NULL DEFAULT 'referral'
                   CHECK (source IN ('referral', 'recruiter', 'direct')),
  contact          TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'target'
                   CHECK (status IN ('target', 'referral_asked', 'applied', 'interviewing', 'offer', 'rejected', 'dropped')),
  next_step        TEXT NOT NULL DEFAULT '',
  next_step_on     DATE,
  offer_fixed_lpa  NUMERIC(6, 2),
  offer_total_lpa  NUMERIC(6, 2),
  last_activity_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
