const { pool } = require('./pool');

/**
 * Seeds the mission only. No tasks or applications are created —
 * progress must come from real execution, never from a seed script.
 */
const MISSION = {
  title: 'Full-Stack Engineer @ ₹40 LPA by December 2026',
  summary:
    'Move from ₹20 LPA to ₹40 LPA through daily DSA reps, weekly system design, shipped projects, and a steady referral pipeline.',
  currentCtc: 20,
  targetCtc: 40,
  targetDate: '2026-12-31',
};

async function seed() {
  const existing = await pool.query('SELECT id FROM missions ORDER BY id LIMIT 1');
  if (existing.rowCount) {
    console.log('• Mission already present, skipping seed');
  } else {
    await pool.query(
      `INSERT INTO missions (title, summary, current_ctc_lpa, target_ctc_lpa, target_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [MISSION.title, MISSION.summary, MISSION.currentCtc, MISSION.targetCtc, MISSION.targetDate],
    );
    console.log('✔ Mission seeded');
  }
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
