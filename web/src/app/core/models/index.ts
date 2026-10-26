/** Shared domain models for Launchpad. */

export type Pillar = 'dsa' | 'system_design' | 'projects' | 'jobs';

/** The four things that move ₹20 LPA → ₹40 LPA. Every task belongs to one. */
export const PILLARS: { id: Pillar; label: string }[] = [
  { id: 'dsa', label: 'DSA' },
  { id: 'system_design', label: 'System Design' },
  { id: 'projects', label: 'Projects' },
  { id: 'jobs', label: 'Job Hunt' },
];

export const pillarLabel = (id: Pillar) => PILLARS.find((p) => p.id === id)?.label ?? id;

export interface Mission {
  id: number;
  title: string;
  summary: string;
  currentCtcLpa: number;
  targetCtcLpa: number;
  targetDate: string; // ISO date
  bestOfferLpa: number | null;
}

export interface Task {
  id: number;
  title: string;
  pillar: Pillar;
  date: string; // ISO date
  done: boolean;
}

export interface DayNote {
  date: string;
  note: string;
}

/** Tasks done vs planned on one day — one cell of the contribution map. */
export interface DayActivity {
  date: string;
  done: number;
  total: number;
}

/** Everything for one Monday–Sunday week. */
export interface WeekData {
  start: string;
  focus: string;
  tasks: Task[];
  notes: DayNote[];
}

export type ApplicationStatus =
  | 'target'
  | 'referral_asked'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'dropped';

/** Pipeline order. The first four are "active" — they need a next step and can go stale. */
export const APPLICATION_STATUSES: { id: ApplicationStatus; label: string }[] = [
  { id: 'target', label: 'Target' },
  { id: 'referral_asked', label: 'Referral asked' },
  { id: 'applied', label: 'Applied' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'dropped', label: 'Dropped' },
];

export const ACTIVE_STATUSES: ApplicationStatus[] = ['target', 'referral_asked', 'applied', 'interviewing'];

export const statusLabel = (id: ApplicationStatus) =>
  APPLICATION_STATUSES.find((s) => s.id === id)?.label ?? id;

export type PayBand = 'yes' | 'maybe' | 'no';
export const PAY_BANDS: { id: PayBand; label: string }[] = [
  { id: 'yes', label: 'Pays 40L+' },
  { id: 'maybe', label: 'Maybe 40L' },
  { id: 'no', label: 'Below 40L' },
];

export type Source = 'referral' | 'recruiter' | 'direct';
export const SOURCES: { id: Source; label: string }[] = [
  { id: 'referral', label: 'Referral' },
  { id: 'recruiter', label: 'Recruiter' },
  { id: 'direct', label: 'Direct apply' },
];

/** Days without any change before an active company is flagged as stale. */
export const STALE_AFTER_DAYS = 7;

export interface Application {
  id: number;
  company: string;
  role: string;
  payBand: PayBand;
  source: Source;
  contact: string;
  status: ApplicationStatus;
  nextStep: string;
  nextStepOn: string | null;
  offerFixedLpa: number | null;
  offerTotalLpa: number | null;
  lastActivityOn: string;
}

export interface NextStep {
  nextStep: string;
  nextStepOn: string | null;
  status: ApplicationStatus;
}
