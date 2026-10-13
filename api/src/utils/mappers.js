/** Row → API shape mappers. Dates are returned as plain ISO day strings. */

function day(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function num(value) {
  return value === null || value === undefined ? null : Number(value);
}

const toMission = (row, pillars) => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  currentCtcLpa: Number(row.current_ctc_lpa),
  targetCtcLpa: Number(row.target_ctc_lpa),
  targetDate: day(row.target_date),
  pillars: pillars.map((p) => ({ id: p.id, name: p.name, description: p.description })),
});

const toTask = (row) => ({
  id: row.id,
  weekId: row.week_id,
  title: row.title,
  category: row.category,
  plannedDate: day(row.planned_date),
  estimatedHours: Number(row.estimated_hours),
  priority: row.priority,
  dueDate: day(row.due_date),
  status: row.status,
});

const toOutcome = (row) => ({
  id: row.id,
  weekId: row.week_id,
  description: row.description,
  achieved: row.achieved,
});

const toWeek = (row, outcomes = [], tasks = []) => ({
  id: row.id,
  weekNumber: row.week_number,
  startDate: day(row.start_date),
  endDate: day(row.end_date),
  theme: row.theme,
  outcomes,
  tasks,
});

const toEntry = (row) => ({
  id: row.id,
  logId: row.log_id,
  taskId: row.task_id,
  taskTitle: row.task_title,
  actualMinutes: row.actual_minutes,
  outcome: row.outcome,
  notes: row.notes,
});

const toLog = (row, entries = []) => ({
  id: row.id,
  logDate: day(row.log_date),
  plannedMinutes: row.planned_minutes,
  actualMinutes: row.actual_minutes,
  dsaProblemsSolved: row.dsa_problems_solved,
  dsaTopics: row.dsa_topics,
  blockers: row.blockers,
  reflection: row.reflection,
  entries,
});

const toRound = (row) => ({
  id: row.id,
  applicationId: row.application_id,
  name: row.name,
  scheduledAt: day(row.scheduled_at),
  status: row.status,
  feedback: row.feedback,
});

const toApplication = (row, rounds = []) => ({
  id: row.id,
  company: row.company,
  role: row.role,
  expectedCtcLpa: num(row.expected_ctc_lpa),
  offeredCtcLpa: num(row.offered_ctc_lpa),
  referralSource: row.referral_source,
  status: row.status,
  appliedOn: day(row.applied_on),
  nextFollowUp: day(row.next_follow_up),
  notes: row.notes,
  rounds,
});

module.exports = {
  day,
  toMission,
  toTask,
  toOutcome,
  toWeek,
  toEntry,
  toLog,
  toRound,
  toApplication,
};
