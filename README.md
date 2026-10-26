# Launchpad — Career Command Center

A minimal, dark-mode tracker for one mission:
**₹20 LPA → ₹40 LPA Full-Stack Engineer by December 2026.**

Angular 18 frontend, Node.js + Express + PostgreSQL backend.

---

## How it works

There is one idea: **a task**. A task has a title, a date, a pillar, and a done checkbox.

Every task belongs to one of four pillars — the things that actually move your CTC:

| Pillar | Example task |
| --- | --- |
| DSA | 3 binary search problems |
| System Design | Read DDIA ch. 5, write a 1-page summary |
| Projects | Ship auth to the side project |
| Job Hunt | Ask 2 people for referrals at Razorpay |

Three pages:

1. **Today** — add today's 1–3 tasks, tick them off, write an optional note (what happened / what blocked you). Unfinished tasks from earlier days show up with a "Move to today" button.
2. **Week** — set one focus line for the week, see progress per pillar (a pillar with nothing planned is flagged), plan tasks for any day, and see each day's tasks and notes.
3. **Jobs** — your pipeline: Target → Referral asked → Applied → Interviewing → Offer.
   Each company has a pay band (can they pay 40L?), source (referral / recruiter / direct), a contact,
   and a **next step with a date**. A one-line nudge tells you where the pipeline is stuck.
   Active companies with no change for 7+ days are flagged **stale**.
   Record an offer (fixed + total) and the ₹ progress bar at the top moves.

**The daily loop:** a company's next step shows up on **Today** under "Job follow-ups" when it's due.
Clicking **Done** logs it as a completed Job Hunt task (so it counts on the contribution map)
and asks for the next step — so no company silently goes quiet.

Weeks are automatic (Monday–Sunday) — there is nothing to create.
The CTC progress bar only moves when you record a real offer.

---

## Running it

```bash
createdb launchpad
cd api
npm install
cp .env.example .env        # set DATABASE_URL
npm run db:migrate          # apply schema.sql
npm run db:seed             # inserts the mission only
npm run dev                 # http://localhost:4000

cd ../web
npm install
npm start                   # http://localhost:4200 (proxies /api to :4000)
```

---

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/mission` | Mission, CTC targets, best recorded offer |
| GET | `/api/week/:monday` | Tasks, notes and focus for that Monday–Sunday |
| PUT | `/api/week/:monday/focus` | Set the week's focus line |
| POST | `/api/tasks` | Add a task `{ title, pillar, date }` |
| PATCH / DELETE | `/api/tasks/:id` | Tick done, move date, rename / delete |
| GET | `/api/tasks/overdue?before=YYYY-MM-DD` | Unfinished tasks before a date |
| PUT | `/api/notes/:date` | Save the note for a day |
| GET | `/api/activity?from=&to=` | Done/total tasks per day (contribution map) |
| GET / POST | `/api/applications` | Job list / add a company |
| GET | `/api/applications/due?on=YYYY-MM-DD` | Active companies whose next step is due |
| PATCH / DELETE | `/api/applications/:id` | Update status, next step, offer / delete |
| POST | `/api/applications/:id/complete-step` | Log current step as a done Job Hunt task, set the next one |

Errors always return `{ "message": "..." }`, which the UI shows.
