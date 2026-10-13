# Launchpad — Career Command Center

A minimal, dark-mode career execution tracker for one mission:
**₹20 LPA → ₹40 LPA Full-Stack Engineer by December 2026.**

Angular 18 (standalone components + routing) on the frontend, Node.js + Express + PostgreSQL on the backend.

---

## Design principles

- **No invented progress.** Every metric is derived from plans you commit and days you log. Empty data renders an honest empty state, never a fake number. The CTC progress bar only moves when an actual offer is recorded.
- **Plan ≠ execution.** `weeks / week_outcomes / planned_tasks` store the original commitment (estimates, dates, priorities are immutable). `daily_logs / log_entries` store what really happened. Review & Insights compares the two.
- **Simple over clever.** Compact cards, neutral dark palette, one blue accent, no decorative animation.

---

## Project structure

```
DevMode/
├── web/                        # Angular frontend
│   └── src/app/
│       ├── core/
│       │   ├── models/         # Shared TypeScript domain types
│       │   ├── data/           # Mock backend + insight calculations
│       │   └── services/       # ApiService + signal-based stores
│       ├── shared/components/  # Card, Stat, Badge, Empty, Loading, Error, Progress
│       ├── layout/shell/       # Sidebar + responsive app shell
│       └── features/           # dashboard | weekly-plan | daily-log | applications | review
└── api/                        # Express + PostgreSQL API
    └── src/
        ├── db/                 # pool, schema.sql, migrate, seed
        ├── routes/             # mission | weeks | tasks | logs | applications | insights
        └── utils/              # row mappers, HTTP helpers
```

---

## Running it

### 1. Frontend (mock data, no database needed)

```bash
cd web
npm install
npm start          # http://localhost:4200
```

`src/environments/environment.ts` ships with `useMock: true`. The in-memory mock backend mirrors the real REST contracts and persists to `localStorage`, so the whole app is usable before Postgres exists.

### 2. Backend

```bash
createdb launchpad
cd api
npm install
cp .env.example .env        # adjust DATABASE_URL
npm run db:migrate          # apply schema.sql
npm run db:seed             # inserts the mission + pillars only — no fake progress
npm run dev                 # http://localhost:4000
```

### 3. Switch the frontend to the real API

Set `useMock: false` in `web/src/environments/environment.ts`, then `npm start`.
The dev server proxies `/api` to `http://localhost:4000` via `proxy.conf.json`.

---

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/mission` | Mission, CTC targets, pillars |
| GET / POST | `/api/weeks` | List plan / create a week |
| DELETE | `/api/weeks/:id` | Delete a week (cascades) |
| POST | `/api/weeks/:id/outcomes` | Add a weekly outcome |
| PATCH / DELETE | `/api/outcomes/:id` | Toggle achieved / remove |
| POST | `/api/weeks/:id/tasks` | Add a planned task |
| PATCH | `/api/tasks/:id` | Update **status only** (plan stays immutable) |
| DELETE | `/api/tasks/:id` | Remove a planned task |
| GET / POST | `/api/logs` | List / create a daily log |
| PATCH / DELETE | `/api/logs/:id` | Edit or delete a log |
| POST | `/api/logs/:id/entries` | Record actual minutes against a task |
| DELETE | `/api/logs/:id/entries/:entryId` | Remove an entry |
| GET / POST | `/api/applications` | Pipeline list / create |
| PATCH / DELETE | `/api/applications/:id` | Update status, follow-up, offer |
| POST | `/api/applications/:id/rounds` | Add an interview round |
| PATCH / DELETE | `/api/rounds/:id` | Update / remove a round |
| GET | `/api/insights` | Weekly completion, planned vs actual hours, next actions |

Errors always return `{ "message": "..." }`, which the UI surfaces in its error state.

---

## The five sections

1. **Dashboard** — mission, current vs target CTC, days remaining, live application/interview counts, mission pillars, upcoming interviews, follow-ups due.
2. **Weekly Plan** — create weeks, define outcomes, add tasks with estimated hours, priority, planned date and deadline; update task status.
3. **Daily Log** — planned vs actual minutes, DSA problems and topics, per-task outcomes, blockers and reflection.
4. **Applications** — companies, roles, expected/offered CTC, referral source, status, interview rounds, follow-up reminders with snooze.
5. **Review & Insights** — weekly completion rate, planned vs actual hours, DSA trend, blockers log, and next actions generated from gaps in your own data.

---

## Next steps

- Add authentication if this ever leaves `localhost`.
- Add a lightweight chart for the weekly trend table.
- Export weekly reviews to Markdown for retro notes.
