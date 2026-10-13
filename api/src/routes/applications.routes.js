const { Router } = require('express');
const { query } = require('../db/pool');
const { toApplication, toRound } = require('../utils/mappers');
const { asyncRoute, required, oneOf, nullable, HttpError } = require('../utils/http');

const STATUSES = ['wishlist', 'applied', 'in_process', 'offer', 'rejected', 'on_hold'];
const ROUND_STATUSES = ['scheduled', 'cleared', 'failed', 'cancelled'];

const router = Router();

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const apps = await query('SELECT * FROM applications ORDER BY created_at DESC, id DESC');
    if (!apps.rowCount) return res.json([]);

    const rounds = await query(
      'SELECT * FROM interview_rounds WHERE application_id = ANY($1::int[]) ORDER BY scheduled_at NULLS LAST, id',
      [apps.rows.map((a) => a.id)],
    );
    res.json(
      apps.rows.map((app) =>
        toApplication(
          app,
          rounds.rows.filter((r) => r.application_id === app.id).map(toRound),
        ),
      ),
    );
  }),
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    required(req.body, ['company', 'role']);
    oneOf(req.body.status, STATUSES, 'status');

    const {
      company,
      role,
      expectedCtcLpa = null,
      offeredCtcLpa = null,
      referralSource = null,
      status = 'wishlist',
      appliedOn = null,
      nextFollowUp = null,
      notes = '',
    } = req.body;

    const { rows } = await query(
      `INSERT INTO applications
         (company, role, expected_ctc_lpa, offered_ctc_lpa, referral_source, status, applied_on, next_follow_up, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        company,
        role,
        nullable(expectedCtcLpa),
        nullable(offeredCtcLpa),
        nullable(referralSource),
        status,
        nullable(appliedOn),
        nullable(nextFollowUp),
        notes,
      ],
    );
    res.status(201).json(toApplication(rows[0]));
  }),
);

router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    oneOf(req.body.status, STATUSES, 'status');
    const fields = {
      status: req.body.status,
      applied_on: req.body.appliedOn,
      next_follow_up: req.body.nextFollowUp,
      offered_ctc_lpa: req.body.offeredCtcLpa,
      expected_ctc_lpa: req.body.expectedCtcLpa,
      referral_source: req.body.referralSource,
      notes: req.body.notes,
    };
    const updates = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (!updates.length) throw new HttpError(400, 'No updatable fields provided.');

    const set = updates.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => nullable(v));
    const { rows } = await query(
      `UPDATE applications SET ${set} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Application not found.');
    res.json(toApplication(rows[0]));
  }),
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM applications WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

router.post(
  '/:id/rounds',
  asyncRoute(async (req, res) => {
    required(req.body, ['name']);
    oneOf(req.body.status, ROUND_STATUSES, 'status');

    const { rows } = await query(
      `INSERT INTO interview_rounds (application_id, name, scheduled_at, status, feedback)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        req.params.id,
        req.body.name,
        nullable(req.body.scheduledAt),
        req.body.status ?? 'scheduled',
        req.body.feedback ?? '',
      ],
    );
    res.status(201).json(toRound(rows[0]));
  }),
);

const roundsRouter = Router();

roundsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    oneOf(req.body.status, ROUND_STATUSES, 'status');
    const fields = {
      status: req.body.status,
      scheduled_at: req.body.scheduledAt,
      feedback: req.body.feedback,
    };
    const updates = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (!updates.length) throw new HttpError(400, 'No updatable fields provided.');

    const set = updates.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => nullable(v));
    const { rows } = await query(
      `UPDATE interview_rounds SET ${set} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Round not found.');
    res.json(toRound(rows[0]));
  }),
);

roundsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await query('DELETE FROM interview_rounds WHERE id = $1', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  }),
);

module.exports = { router, roundsRouter };
