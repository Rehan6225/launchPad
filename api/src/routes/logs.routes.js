const { Router } = require('express');
const { query, withTransaction } = require('../db/pool');
const { toLog, toEntry } = require('../utils/mappers');
const { asyncRoute, required, oneOf, HttpError } = require('../utils/http');

const router = Router();
const OUTCOMES = ['done', 'partial', 'skipped'];

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const logs = await query('SELECT * FROM daily_logs ORDER BY log_date DESC');
    if (!logs.rowCount) return res.json([]);

    const entries = await query(
      'SELECT * FROM log_entries WHERE log_id = ANY($1::int[]) ORDER BY id',
      [logs.rows.map((l) => l.id)],
    );
    res.json(
      logs.rows.map((log) =>
        toLog(
          log,
          entries.rows.filter((e) => e.log_id === log.id).map(toEntry),
        ),
      ),
    );
  }),
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    required(req.body, ['logDate']);
    const {
      logDate,
      plannedMinutes = 0,
      actualMinutes = 0,
      dsaProblemsSolved = 0,
      dsaTopics = '',
      blockers = '',
      reflection = '',
    } = req.body;

    const { rows } = await query(
      `INSERT INTO daily_logs
         (log_date, planned_minutes, actual_minutes, dsa_problems_solved, dsa_topics, blockers, reflection)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (log_date) DO UPDATE SET
         planned_minutes = EXCLUDED.planned_minutes,
         dsa_problems_solved = EXCLUDED.dsa_problems_solved,
         dsa_topics = EXCLUDED.dsa_topics,
         blockers = EXCLUDED.blockers,
         reflection = EXCLUDED.reflection
       RETURNING *`,
      [logDate, plannedMinutes, actualMinutes, dsaProblemsSolved, dsaTopics, blockers, reflection],
    );
    res.status(201).json(toLog(rows[0]));
  }),
);

router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const fields = {
      planned_minutes: req.body.plannedMinutes,
      dsa_problems_solved: req.body.dsaProblemsSolved,
      dsa_topics: req.body.dsaTopics,
      blockers: req.body.blockers,
      reflection: req.body.reflection,
    };
    const updates = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (!updates.length) throw new HttpError(400, 'No updatable fields provided.');

    const set = updates.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);
    const { rows } = await query(
      `UPDATE daily_logs SET ${set} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Log not found.');
    res.json(toLog(rows[0]));
  }),
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM daily_logs WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

/** Entries are the actual execution record against (optionally) a planned task. */
router.post(
  '/:id/entries',
  asyncRoute(async (req, res) => {
    required(req.body, ['taskTitle', 'actualMinutes']);
    oneOf(req.body.outcome, OUTCOMES, 'outcome');

    const entry = await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO log_entries (log_id, task_id, task_title, actual_minutes, outcome, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          req.params.id,
          req.body.taskId ?? null,
          req.body.taskTitle,
          req.body.actualMinutes,
          req.body.outcome ?? 'done',
          req.body.notes ?? '',
        ],
      );
      await client.query(
        `UPDATE daily_logs SET actual_minutes =
           (SELECT COALESCE(SUM(actual_minutes), 0) FROM log_entries WHERE log_id = $1)
         WHERE id = $1`,
        [req.params.id],
      );
      return inserted.rows[0];
    });

    res.status(201).json(toEntry(entry));
  }),
);

router.delete(
  '/:id/entries/:entryId',
  asyncRoute(async (req, res) => {
    await withTransaction(async (client) => {
      await client.query('DELETE FROM log_entries WHERE id = $1 AND log_id = $2', [
        req.params.entryId,
        req.params.id,
      ]);
      await client.query(
        `UPDATE daily_logs SET actual_minutes =
           (SELECT COALESCE(SUM(actual_minutes), 0) FROM log_entries WHERE log_id = $1)
         WHERE id = $1`,
        [req.params.id],
      );
    });
    res.json({ id: Number(req.params.entryId) });
  }),
);

module.exports = router;
