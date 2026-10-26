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
    // CTC progress only moves when a real offer is recorded.
    const offer = await query(
      "SELECT MAX(offer_total_lpa) AS best FROM applications WHERE status = 'offer'",
    );
    res.json(toMission(rows[0], offer.rows[0].best));
  }),
);

module.exports = router;
