const { Router } = require('express');
const { query } = require('../db/pool');
const { toTask, toOutcome } = require('../utils/mappers');
const { asyncRoute, oneOf, HttpError } = require('../utils/http');

const TASK_STATUSES = ['planned', 'in_progress', 'done', 'skipped'];

const tasksRouter = Router();

/**
 * PATCH /api/tasks/:id — only `status` is mutable.
 * The committed plan (title, estimate, dates) is intentionally immutable
 * so plan vs. actual comparisons stay honest.
 */
tasksRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    oneOf(req.body.status, TASK_STATUSES, 'status');
    if (!req.body.status) throw new HttpError(400, 'status is required.');

    const { rows } = await query(
      'UPDATE planned_tasks SET status = $1 WHERE id = $2 RETURNING *',
      [req.body.status, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Task not found.');
    res.json(toTask(rows[0]));
  }),
);

tasksRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM planned_tasks WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

const outcomesRouter = Router();

outcomesRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    if (typeof req.body.achieved !== 'boolean') {
      throw new HttpError(400, 'achieved (boolean) is required.');
    }
    const { rows } = await query(
      'UPDATE week_outcomes SET achieved = $1 WHERE id = $2 RETURNING *',
      [req.body.achieved, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Outcome not found.');
    res.json(toOutcome(rows[0]));
  }),
);

outcomesRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM week_outcomes WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

module.exports = { tasksRouter, outcomesRouter };
