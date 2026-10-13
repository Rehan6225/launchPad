const { Router } = require('express');
const { query } = require('../db/pool');
const { toMission } = require('../utils/mappers');
const { asyncRoute, HttpError } = require('../utils/http');

const router = Router();

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const { rows } = await query('SELECT * FROM missions ORDER BY id LIMIT 1');
    if (!rows.length) {
      throw new HttpError(404, 'No mission configured. Run `npm run db:seed`.');
    }
    const pillars = await query(
      'SELECT * FROM mission_pillars WHERE mission_id = $1 ORDER BY sort_order, id',
      [rows[0].id],
    );
    res.json(toMission(rows[0], pillars.rows));
  }),
);

module.exports = router;
