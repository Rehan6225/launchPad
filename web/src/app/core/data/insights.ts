import {
  DailyLog,
  Mission,
  ReviewInsights,
  Week,
  WeeklyReview,
  Application,
  NextAction,
} from '../models';

/**
 * Builds review insights purely from committed plans + execution logs.
 * No value is fabricated: everything is derived from stored records.
 */
export function buildInsights(
  weeks: Week[],
  logs: DailyLog[],
  applications: Application[],
): ReviewInsights {
  const reviews: WeeklyReview[] = weeks.map((week) => {
    const weekLogs = logs.filter(
      (log) => log.logDate >= week.startDate && log.logDate <= week.endDate,
    );
    const tasksPlanned = week.tasks.length;
    const tasksDone = week.tasks.filter((t) => t.status === 'done').length;
    const plannedHours = round1(
      week.tasks.reduce((sum, t) => sum + Number(t.estimatedHours || 0), 0),
    );
    const actualHours = round1(
      weekLogs.reduce((sum, l) => sum + Number(l.actualMinutes || 0), 0) / 60,
    );

    return {
      weekId: week.id,
      weekNumber: week.weekNumber,
      startDate: week.startDate,
      endDate: week.endDate,
      tasksPlanned,
      tasksDone,
      completionRate: tasksPlanned ? tasksDone / tasksPlanned : 0,
      plannedHours,
      actualHours,
      dsaProblemsSolved: weekLogs.reduce(
        (sum, l) => sum + Number(l.dsaProblemsSolved || 0),
        0,
      ),
      blockers: weekLogs.map((l) => l.blockers).filter((b): b is string => !!b && !!b.trim()),
    };
  });

  return { weeks: reviews, nextActions: buildNextActions(reviews, applications) };
}

function buildNextActions(reviews: WeeklyReview[], applications: Application[]): NextAction[] {
  const actions: NextAction[] = [];
  const latest = [...reviews].sort((a, b) => b.weekNumber - a.weekNumber)[0];

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
  const dueFollowUps = applications.filter(
    (a) => a.nextFollowUp && a.nextFollowUp <= today && a.status !== 'rejected',
  );
  if (dueFollowUps.length) {
    actions.push({
      id: 'follow-ups',
      label: `Follow up on ${dueFollowUps.length} application(s)`,
      reason: dueFollowUps.map((a) => a.company).join(', '),
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

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export const SEED_MISSION: Mission = {
  id: 1,
  title: 'Full-Stack Engineer @ ₹40 LPA by December 2026',
  summary:
    'Move from ₹20 LPA to ₹40 LPA by compounding deep system design, consistent DSA reps, shipped full-stack proof of work, and a warm referral pipeline.',
  currentCtcLpa: 20,
  targetCtcLpa: 40,
  targetDate: '2026-12-31',
  pillars: [
    {
      id: 1,
      name: 'DSA fluency',
      description: 'Consistent daily problem reps with spaced revision of weak topics.',
    },
    {
      id: 2,
      name: 'System design depth',
      description: 'One design deep-dive per week, written up and defensible in an interview.',
    },
    {
      id: 3,
      name: 'Shipped proof of work',
      description: 'Production-grade full-stack projects that back the senior-level narrative.',
    },
    {
      id: 4,
      name: 'Referral pipeline',
      description: 'Warm intros and recruiter conversations maintained every single week.',
    },
  ],
};
