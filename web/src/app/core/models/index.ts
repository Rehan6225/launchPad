/** Shared domain models for Launchpad. */

export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'skipped';
export type Priority = 'P0' | 'P1' | 'P2';
export type TaskOutcome = 'done' | 'partial' | 'skipped';

export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'in_process'
  | 'offer'
  | 'rejected'
  | 'on_hold';

export type RoundStatus = 'scheduled' | 'cleared' | 'failed' | 'cancelled';

export interface Mission {
  id: number;
  title: string;
  summary: string;
  currentCtcLpa: number;
  targetCtcLpa: number;
  targetDate: string; // ISO date
  pillars: MissionPillar[];
}

export interface MissionPillar {
  id: number;
  name: string;
  description: string;
}

/** The plan as originally committed. Never mutated by execution logs. */
export interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  theme: string;
  outcomes: WeekOutcome[];
  tasks: PlannedTask[];
}

export interface WeekOutcome {
  id: number;
  weekId: number;
  description: string;
  achieved: boolean;
}

export interface PlannedTask {
  id: number;
  weekId: number;
  title: string;
  category: string;
  plannedDate: string;
  estimatedHours: number;
  priority: Priority;
  dueDate: string | null;
  status: TaskStatus;
}

/** Execution log — kept separate from the plan. */
export interface DailyLog {
  id: number;
  logDate: string;
  plannedMinutes: number;
  actualMinutes: number;
  dsaProblemsSolved: number;
  dsaTopics: string;
  blockers: string;
  reflection: string;
  entries: LogEntry[];
}

export interface LogEntry {
  id: number;
  logId: number;
  taskId: number | null;
  taskTitle: string;
  actualMinutes: number;
  outcome: TaskOutcome;
  notes: string;
}

export interface Application {
  id: number;
  company: string;
  role: string;
  expectedCtcLpa: number | null;
  offeredCtcLpa: number | null;
  referralSource: string | null;
  status: ApplicationStatus;
  appliedOn: string | null;
  nextFollowUp: string | null;
  notes: string;
  rounds: InterviewRound[];
}

export interface InterviewRound {
  id: number;
  applicationId: number;
  name: string;
  scheduledAt: string | null;
  status: RoundStatus;
  feedback: string;
}

export interface WeeklyReview {
  weekId: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  tasksPlanned: number;
  tasksDone: number;
  completionRate: number; // 0..1
  plannedHours: number;
  actualHours: number;
  dsaProblemsSolved: number;
  blockers: string[];
}

export interface ReviewInsights {
  weeks: WeeklyReview[];
  nextActions: NextAction[];
}

export interface NextAction {
  id: string;
  label: string;
  reason: string;
  severity: 'info' | 'warn' | 'danger';
}
