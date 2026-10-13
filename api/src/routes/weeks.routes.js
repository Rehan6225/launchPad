const { Router } = require('express');
const { query } = require('../db/pool');
const { toWeek, toOutcome, toTask } = require('../utils/mappers');
const { asyncRoute, required, oneOf, nullable, HttpError } = require('../utils/http');

const router = Router();
const TASK_STATUSES = ['planned', 'in_progress', 'done', 'skipped'];
const PRIORITIES = ['P0', 'P1', 'P2'];

/** GET /api/weeks — full plan, newest week first. */
router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const weeks = await query('SELECT * FROM weeks ORDER BY week_number DESC');
    if (!weeks.rowCount) return res.json([]);

    const ids = weeks.rows.map((w) => w.id);
    const outcomes = await query(
      'SELECT * FROM week_outcomes WHERE week_id = ANY($1::int[]) ORDER BY id',
      [ids],
    );
    const tasks = await query(
      'SELECT * FROM planned_tasks WHERE week_id = ANY($1::int[]) ORDER BY planned_date, priority, id',
      [ids],
    );

    res.json(
      weeks.rows.map((week) =>
        toWeek(
          week,
          outcomes.rows.filter((o) => o.week_id === week.id).map(toOutcome),
          tasks.rows.filter((t) => t.week_id === week.id).map(toTask),
        ),
      ),
    );
  }),
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    required(req.body, ['weekNumber', 'startDate', 'endDate']);
    const { weekNumber, startDate, endDate, theme = '' } = req.body;
    if (endDate < startDate) throw new HttpError(400, 'endDate must be on or after startDate.');

    const { rows } = await query(
      `INSERT INTO weeks (week_number, start_date, end_date, theme)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (week_number) DO UPDATE SET start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date, theme = EXCLUDED.theme
       RETURNING *`,
      [weekNumber, startDate, endDate, theme],
    );
    res.status(201).json(toWeek(rows[0]));
  }),
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM weeks WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

// ---------- outcomes ----------

router.post(
  '/:id/outcomes',
  asyncRoute(async (req, res) => {
    required(req.body, ['description']);
    const { rows } = await query(
      'INSERT INTO week_outcomes (week_id, description) VALUES ($1, $2) RETURNING *',
      [req.params.id, req.body.description],
    );
    res.status(201).json(toOutcome(rows[0]));
  }),
);

// ---------- planned tasks ----------

router.post(
  '/:id/tasks',
  asyncRoute(async (req, res) => {
    required(req.body, ['title', 'plannedDate']);
    const {
      title,
      category = 'General',
      plannedDate,
      estimatedHours = 0,
      priority = 'P1',
      dueDate = null,
    } = req.body;
    oneOf(priority, PRIORITIES, 'priority');

    const { rows } = await query(
      `INSERT INTO planned_tasks (week_id, title, category, planned_date, estimated_hours, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, title, category, plannedDate, estimatedHours, priority, nullable(dueDate)],
    );
    res.status(201).json(toTask(rows[0]));
  }),
);

module.exports = { router, TASK_STATUSES };
