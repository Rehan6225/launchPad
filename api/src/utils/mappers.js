/** Row → API shape mappers. Dates are returned as plain ISO day strings. */

function day(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function num(value) {
  return value === null || value === undefined ? null : Number(value);
}

const toMission = (row, bestOfferLpa) => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  currentCtcLpa: Number(row.current_ctc_lpa),
  targetCtcLpa: Number(row.target_ctc_lpa),
  targetDate: day(row.target_date),
  bestOfferLpa: num(bestOfferLpa),
});

const toTask = (row) => ({
  id: row.id,
  title: row.title,
  pillar: row.pillar,
  date: day(row.task_date),
  done: row.done,
});

const toNote = (row) => ({
  date: day(row.note_date),
  note: row.note,
});

const toApplication = (row) => ({
  id: row.id,
  company: row.company,
  role: row.role,
  payBand: row.pay_band,
  source: row.source,
  contact: row.contact,
  status: row.status,
  nextStep: row.next_step,
  nextStepOn: day(row.next_step_on),
  offerFixedLpa: num(row.offer_fixed_lpa),
  offerTotalLpa: num(row.offer_total_lpa),
  lastActivityOn: day(row.last_activity_on),
});

module.exports = { day, toMission, toTask, toNote, toApplication };
