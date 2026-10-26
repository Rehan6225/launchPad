const { Router } = require('express');
const { query, withTransaction } = require('../db/pool');
const { toApplication, toTask } = require('../utils/mappers');
const { asyncRoute, required, oneOf, nullable, HttpError } = require('../utils/http');

const STATUSES = ['target', 'referral_asked', 'applied', 'interviewing', 'offer', 'rejected', 'dropped'];
const ACTIVE = ['target', 'referral_asked', 'applied', 'interviewing'];
const PAY_BANDS = ['yes', 'maybe', 'no'];
const SOURCES = ['referral', 'recruiter', 'direct'];

function validate(body) {
  oneOf(body.status, STATUSES, 'status');
  oneOf(body.payBand, PAY_BANDS, 'payBand');
  oneOf(body.source, SOURCES, 'source');
}

const router = Router();

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const { rows } = await query('SELECT * FROM applications ORDER BY created_at DESC, id DESC');
    res.json(rows.map(toApplication));
  }),
);

/** Active companies whose next step is due on or before `on` — shown on the Today page. */
router.get(
  '/due',
  asyncRoute(async (req, res) => {
    required(req.query, ['on']);
    const { rows } = await query(
      `SELECT * FROM applications
       WHERE status = ANY($1) AND next_step <> '' AND next_step_on <= $2
       ORDER BY next_step_on, id`,
      [ACTIVE, req.query.on],
    );
    res.json(rows.map(toApplication));
  }),
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    required(req.body, ['company']);
    validate(req.body);

    const b = req.body;
    const { rows } = await query(
      `INSERT INTO applications (company, role, pay_band, source, contact, status, next_step, next_step_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        b.company.trim(),
        b.role ?? '',
        b.payBand ?? 'maybe',
        b.source ?? 'referral',
        b.contact ?? '',
        b.status ?? 'target',
        b.nextStep ?? '',
        nullable(b.nextStepOn),
      ],
    );
    res.status(201).json(toApplication(rows[0]));
  }),
);

router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    validate(req.body);
    const fields = {
      company: req.body.company,
      role: req.body.role,
      pay_band: req.body.payBand,
      source: req.body.source,
      contact: req.body.contact,
      status: req.body.status,
      next_step: req.body.nextStep,
      next_step_on: req.body.nextStepOn,
      offer_fixed_lpa: req.body.offerFixedLpa,
      offer_total_lpa: req.body.offerTotalLpa,
    };
    const updates = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (!updates.length) throw new HttpError(400, 'No updatable fields provided.');

    // Text columns keep '' (NOT NULL); dates and numbers turn '' into NULL.
    const textCols = ['company', 'role', 'contact', 'next_step'];
    const values = updates.map(([col, v]) => (textCols.includes(col) ? v : nullable(v)));
    const set = updates.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const { rows } = await query(
      `UPDATE applications SET ${set}, last_activity_on = CURRENT_DATE
       WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Application not found.');
    res.json(toApplication(rows[0]));
  }),
);

/**
 * Marks the current next step as done: logs it as a completed Job Hunt task for today
 * (so it counts on the contribution map) and sets the following step.
 */
router.post(
  '/:id/complete-step',
  asyncRoute(async (req, res) => {
    oneOf(req.body.status, STATUSES, 'status');
    const result = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM applications WHERE id = $1 FOR UPDATE', [
        req.params.id,
      ]);
      if (!current.rowCount) throw new HttpError(404, 'Application not found.');
      const app = current.rows[0];

      const task = await client.query(
        `INSERT INTO tasks (title, pillar, task_date, done)
         VALUES ($1, 'jobs', CURRENT_DATE, true) RETURNING *`,
        [`${app.company}: ${app.next_step || 'follow-up'}`],
      );
      const updated = await client.query(
        `UPDATE applications
         SET next_step = $1, next_step_on = $2, status = $3, last_activity_on = CURRENT_DATE
         WHERE id = $4 RETURNING *`,
        [req.body.nextStep ?? '', nullable(req.body.nextStepOn), req.body.status ?? app.status, app.id],
      );
      return { application: toApplication(updated.rows[0]), task: toTask(task.rows[0]) };
    });
    res.json(result);
  }),
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM applications WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

module.exports = router;
