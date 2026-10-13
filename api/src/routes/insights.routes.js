const { Router } = require('express');
const { query } = require('../db/pool');
const { day } = require('../utils/mappers');
const { asyncRoute } = require('../utils/http');

const router = Router();
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * GET /api/insights
 * Everything here is aggregated from stored plans and logs.
 * If there is no data, the response is empty — no placeholder metrics.
 */
router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const weeks = await query('SELECT * FROM weeks ORDER BY week_number DESC');
    const tasks = await query('SELECT week_id, estimated_hours, status FROM planned_tasks');
    const logs = await query('SELECT * FROM daily_logs');
    const applications = await query(
      'SELECT id, company, status, next_follow_up FROM applications',
    );

    const reviews = weeks.rows.map((week) => {
      const weekTasks = tasks.rows.filter((t) => t.week_id === week.id);
      const start = day(week.start_date);
      const end = day(week.end_date);
      const weekLogs = logs.rows.filter((l) => {
        const d = day(l.log_date);
        return d >= start && d <= end;
      });

      const tasksPlanned = weekTasks.length;
      const tasksDone = weekTasks.filter((t) => t.status === 'done').length;

      return {
        weekId: week.id,
        weekNumber: week.week_number,
        startDate: start,
        endDate: end,
        tasksPlanned,
        tasksDone,
        completionRate: tasksPlanned ? tasksDone / tasksPlanned : 0,
        plannedHours: round1(
          weekTasks.reduce((sum, t) => sum + Number(t.estimated_hours || 0), 0),
        ),
        actualHours: round1(
          weekLogs.reduce((sum, l) => sum + Number(l.actual_minutes || 0), 0) / 60,
        ),
        dsaProblemsSolved: weekLogs.reduce(
          (sum, l) => sum + Number(l.dsa_problems_solved || 0),
          0,
        ),
        blockers: weekLogs.map((l) => l.blockers).filter((b) => b && b.trim()),
      };
    });

    res.json({
      weeks: reviews,
      nextActions: buildNextActions(reviews, applications.rows),
    });
  }),
);

function buildNextActions(reviews, applications) {
  const actions = [];
  const latest = reviews[0];

  if (!reviews.length) {
    actions.push({
      id: 'create-week',
      label: 'Create your first weekly plan',
      reason: 'No weekly plan has been committed yet, so progress cannot be measured.',
      severity: 'info',
    });
  } else if (latest) {
    if (latest.tasksPlanned && latest.completionRate < 0.6) {
      actions.push({
        id: 'low-completion',
        label: `Re-scope week ${latest.weekNumber}`,
        reason: `${latest.tasksDone}/${latest.tasksPlanned} planned tasks completed.`,
        severity: 'warn',
      });
    }
    if (latest.plannedHours > 0 && latest.actualHours < latest.plannedHours * 0.7) {
      actions.push({
        id: 'hours-gap',
        label: 'Close the planned vs actual hours gap',
        reason: `Logged ${latest.actualHours}h against ${latest.plannedHours}h planned.`,
        severity: 'warn',
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const due = applications.filter(
    (a) => a.next_follow_up && day(a.next_follow_up) <= today && a.status !== 'rejected',
  );
  if (due.length) {
    actions.push({
      id: 'follow-ups',
      label: `Follow up on ${due.length} application(s)`,
      reason: due.map((a) => a.company).join(', '),
      severity: 'danger',
    });
  }

  if (!applications.length) {
    actions.push({
      id: 'no-applications',
      label: 'Add your first target company',
      reason: 'The application pipeline is empty.',
      severity: 'info',
    });
  }

  return actions;
}

module.exports = router;
