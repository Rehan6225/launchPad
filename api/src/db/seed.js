const { pool, withTransaction } = require('./pool');

/**
 * Seeds the mission only. No weeks, logs, or applications are created —
 * progress must come from real execution, never from a seed script.
 */
const MISSION = {
  title: 'Full-Stack Engineer @ ₹40 LPA by December 2026',
  summary:
    'Move from ₹20 LPA to ₹40 LPA by compounding deep system design, consistent DSA reps, shipped full-stack proof of work, and a warm referral pipeline.',
  currentCtc: 20,
  targetCtc: 40,
  targetDate: '2026-12-31',
  pillars: [
    ['DSA fluency', 'Consistent daily problem reps with spaced revision of weak topics.'],
    ['System design depth', 'One design deep-dive per week, written up and defensible in an interview.'],
    ['Shipped proof of work', 'Production-grade full-stack projects that back the senior-level narrative.'],
    ['Referral pipeline', 'Warm intros and recruiter conversations maintained every single week.'],
  ],
};

async function seed() {
  await withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM missions ORDER BY id LIMIT 1');
    if (existing.rowCount) {
      console.log('• Mission already present, skipping seed');
      return;
    }

    const { rows } = await client.query(
      `INSERT INTO missions (title, summary, current_ctc_lpa, target_ctc_lpa, target_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [MISSION.title, MISSION.summary, MISSION.currentCtc, MISSION.targetCtc, MISSION.targetDate],
    );
    const missionId = rows[0].id;

    for (const [index, [name, description]] of MISSION.pillars.entries()) {
      await client.query(
        `INSERT INTO mission_pillars (mission_id, name, description, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [missionId, name, description, index],
      );
    }
    console.log('✔ Mission seeded');
  });
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
