const { Router } = require('express');
const { query } = require('../db/pool');
const { toTask, toNote } = require('../utils/mappers');
const { asyncRoute, required, oneOf, HttpError } = require('../utils/http');

const PILLARS = ['dsa', 'system_design', 'projects', 'jobs'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isoDay(value, field) {
  if (!ISO_DAY.test(value || '')) throw new HttpError(400, `Invalid ${field}. Expected YYYY-MM-DD.`);
  return value;
}

/** GET /api/week/:start — everything for Monday `start` through Sunday. */
const weekRouter = Router();

weekRouter.get(
  '/:start',
  asyncRoute(async (req, res) => {
    const start = isoDay(req.params.start, 'start');
    const [tasks, notes, focus] = await Promise.all([
      query(
        'SELECT * FROM tasks WHERE task_date BETWEEN $1::date AND $1::date + 6 ORDER BY task_date, id',
        [start],
      ),
      query(
        'SELECT * FROM day_notes WHERE note_date BETWEEN $1::date AND $1::date + 6 ORDER BY note_date',
        [start],
      ),
      query('SELECT focus FROM week_focus WHERE week_start = $1', [start]),
    ]);
    res.json({
      start,
      focus: focus.rows[0]?.focus ?? '',
      tasks: tasks.rows.map(toTask),
      notes: notes.rows.map(toNote),
    });
  }),
);

weekRouter.put(
  '/:start/focus',
  asyncRoute(async (req, res) => {
    const start = isoDay(req.params.start, 'start');
    await query(
      `INSERT INTO week_focus (week_start, focus) VALUES ($1, $2)
       ON CONFLICT (week_start) DO UPDATE SET focus = EXCLUDED.focus`,
      [start, req.body.focus ?? ''],
    );
    res.json({ start, focus: req.body.focus ?? '' });
  }),
);

/** Tasks — the only unit of work. */
const tasksRouter = Router();

tasksRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    required(req.body, ['title', 'pillar', 'date']);
    oneOf(req.body.pillar, PILLARS, 'pillar');
    const { rows } = await query(
      'INSERT INTO tasks (title, pillar, task_date) VALUES ($1, $2, $3) RETURNING *',
      [req.body.title.trim(), req.body.pillar, isoDay(req.body.date, 'date')],
    );
    res.status(201).json(toTask(rows[0]));
  }),
);

tasksRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    oneOf(req.body.pillar, PILLARS, 'pillar');
    const fields = {
      title: req.body.title,
      pillar: req.body.pillar,
      task_date: req.body.date === undefined ? undefined : isoDay(req.body.date, 'date'),
      done: req.body.done,
    };
    const updates = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (!updates.length) throw new HttpError(400, 'No updatable fields provided.');

    const set = updates.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const { rows } = await query(
      `UPDATE tasks SET ${set} WHERE id = $${updates.length + 1} RETURNING *`,
      [...updates.map(([, v]) => v), req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Task not found.');
    res.json(toTask(rows[0]));
  }),
);

tasksRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

/** Overdue = not done and dated before `before`. Powers "carry over" on Today. */
tasksRouter.get(
  '/overdue',
  asyncRoute(async (req, res) => {
    const before = isoDay(req.query.before, 'before');
    const { rows } = await query(
      'SELECT * FROM tasks WHERE NOT done AND task_date < $1 ORDER BY task_date, id',
      [before],
    );
    res.json(rows.map(toTask));
  }),
);

/** Done/total tasks per day in [from, to] — powers the contribution map. */
const activityRouter = Router();

activityRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const from = isoDay(req.query.from, 'from');
    const to = isoDay(req.query.to, 'to');
    const { rows } = await query(
      `SELECT task_date, COUNT(*) FILTER (WHERE done)::int AS done, COUNT(*)::int AS total
       FROM tasks WHERE task_date BETWEEN $1 AND $2
       GROUP BY task_date ORDER BY task_date`,
      [from, to],
    );
    res.json(rows.map((r) => ({ date: r.task_date, done: r.done, total: r.total })));
  }),
);

/** One note per day. */
const notesRouter = Router();

notesRouter.put(
  '/:date',
  asyncRoute(async (req, res) => {
    const date = isoDay(req.params.date, 'date');
    const { rows } = await query(
      `INSERT INTO day_notes (note_date, note) VALUES ($1, $2)
       ON CONFLICT (note_date) DO UPDATE SET note = EXCLUDED.note RETURNING *`,
      [date, req.body.note ?? ''],
    );
    res.json(toNote(rows[0]));
  }),
);

module.exports = { weekRouter, tasksRouter, notesRouter, activityRouter };
