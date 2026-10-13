import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  Application,
  DailyLog,
  Mission,
  PlannedTask,
  Week,
} from '../models';
import { SEED_MISSION, buildInsights } from './insights';

interface MockState {
  mission: Mission;
  weeks: Week[];
  logs: DailyLog[];
  applications: Application[];
  seq: number;
}

const STORAGE_KEY = 'launchpad.mock.v1';

/**
 * In-memory stand-in for the Express API, so the UI is fully functional
 * before the backend is wired up. Mirrors the real endpoint contracts.
 * Deliberately seeded with no progress data — only the mission itself.
 */
@Injectable({ providedIn: 'root' })
export class MockBackend {
  private state: MockState = this.load();

  handle<T>(method: string, path: string, body?: unknown): Observable<T> {
    try {
      const result = this.route(method.toUpperCase(), path.replace(/^\/+/, ''), body);
      this.persist();
      return of(structuredClone(result) as T).pipe(delay(220));
    } catch (err) {
      return throwError(() => err).pipe(delay(220));
    }
  }

  private route(method: string, path: string, body: any): unknown {
    const [resource, id, sub, subId] = path.split('/');

    switch (resource) {
      case 'mission':
        return this.state.mission;

      case 'weeks':
        if (method === 'GET') return this.sortedWeeks();
        if (method === 'POST' && !id) return this.createWeek(body);
        if (method === 'POST' && sub === 'tasks') return this.createTask(Number(id), body);
        if (method === 'POST' && sub === 'outcomes') return this.createOutcome(Number(id), body);
        if (method === 'DELETE' && id && !sub) return this.deleteWeek(Number(id));
        break;

      case 'tasks':
        if (method === 'PATCH') return this.patchTask(Number(id), body);
        if (method === 'DELETE') return this.deleteTask(Number(id));
        break;

      case 'outcomes':
        if (method === 'PATCH') return this.patchOutcome(Number(id), body);
        if (method === 'DELETE') return this.deleteOutcome(Number(id));
        break;

      case 'logs':
        if (method === 'GET') return this.sortedLogs();
        if (method === 'POST' && !id) return this.createLog(body);
        if (method === 'POST' && sub === 'entries') return this.createEntry(Number(id), body);
        if (method === 'PATCH' && id && !sub) return this.patchLog(Number(id), body);
        if (method === 'DELETE' && sub === 'entries') return this.deleteEntry(Number(id), Number(subId));
        if (method === 'DELETE' && id) return this.deleteLog(Number(id));
        break;

      case 'applications':
        if (method === 'GET') return this.state.applications;
        if (method === 'POST' && !id) return this.createApplication(body);
        if (method === 'POST' && sub === 'rounds') return this.createRound(Number(id), body);
        if (method === 'PATCH' && id && !sub) return this.patchApplication(Number(id), body);
        if (method === 'DELETE' && id) return this.deleteApplication(Number(id));
        break;

      case 'rounds':
        if (method === 'PATCH') return this.patchRound(Number(id), body);
        if (method === 'DELETE') return this.deleteRound(Number(id));
        break;

      case 'insights':
        return buildInsights(this.state.weeks, this.state.logs, this.state.applications);
    }

    throw new Error(`Mock endpoint not implemented: ${method} /${path}`);
  }

  // ---------- weeks ----------

  private sortedWeeks(): Week[] {
    return [...this.state.weeks].sort((a, b) => b.weekNumber - a.weekNumber);
  }

  private createWeek(body: Partial<Week>): Week {
    const week: Week = {
      id: this.nextId(),
      weekNumber: Number(body.weekNumber) || this.state.weeks.length + 1,
      startDate: body.startDate!,
      endDate: body.endDate!,
      theme: body.theme ?? '',
      outcomes: [],
      tasks: [],
    };
    this.state.weeks.push(week);
    return week;
  }

  private deleteWeek(id: number): { id: number } {
    this.state.weeks = this.state.weeks.filter((w) => w.id !== id);
    return { id };
  }

  private createTask(weekId: number, body: Partial<PlannedTask>): PlannedTask {
    const week = this.week(weekId);
    const task: PlannedTask = {
      id: this.nextId(),
      weekId,
      title: body.title!,
      category: body.category ?? 'General',
      plannedDate: body.plannedDate ?? week.startDate,
      estimatedHours: Number(body.estimatedHours) || 0,
      priority: body.priority ?? 'P1',
      dueDate: body.dueDate ?? null,
      status: body.status ?? 'planned',
    };
    week.tasks.push(task);
    return task;
  }

  private patchTask(id: number, body: Partial<PlannedTask>): PlannedTask {
    for (const week of this.state.weeks) {
      const task = week.tasks.find((t) => t.id === id);
      if (task) {
        // Only execution status is mutable; the committed plan stays intact.
        if (body.status) task.status = body.status;
        return task;
      }
    }
    throw new Error(`Task ${id} not found`);
  }

  private deleteTask(id: number): { id: number } {
    for (const week of this.state.weeks) {
      week.tasks = week.tasks.filter((t) => t.id !== id);
    }
    return { id };
  }

  private createOutcome(weekId: number, body: { description: string }) {
    const week = this.week(weekId);
    const outcome = {
      id: this.nextId(),
      weekId,
      description: body.description,
      achieved: false,
    };
    week.outcomes.push(outcome);
    return outcome;
  }

  private patchOutcome(id: number, body: { achieved?: boolean }) {
    for (const week of this.state.weeks) {
      const outcome = week.outcomes.find((o) => o.id === id);
      if (outcome) {
        if (body.achieved !== undefined) outcome.achieved = body.achieved;
        return outcome;
      }
    }
    throw new Error(`Outcome ${id} not found`);
  }

  private deleteOutcome(id: number): { id: number } {
    for (const week of this.state.weeks) {
      week.outcomes = week.outcomes.filter((o) => o.id !== id);
    }
    return { id };
  }

  private week(id: number): Week {
    const week = this.state.weeks.find((w) => w.id === id);
    if (!week) throw new Error(`Week ${id} not found`);
    return week;
  }

  // ---------- logs ----------

  private sortedLogs(): DailyLog[] {
    return [...this.state.logs].sort((a, b) => b.logDate.localeCompare(a.logDate));
  }

  private createLog(body: Partial<DailyLog>): DailyLog {
    const log: DailyLog = {
      id: this.nextId(),
      logDate: body.logDate!,
      plannedMinutes: Number(body.plannedMinutes) || 0,
      actualMinutes: Number(body.actualMinutes) || 0,
      dsaProblemsSolved: Number(body.dsaProblemsSolved) || 0,
      dsaTopics: body.dsaTopics ?? '',
      blockers: body.blockers ?? '',
      reflection: body.reflection ?? '',
      entries: [],
    };
    this.state.logs.push(log);
    return log;
  }

  private patchLog(id: number, body: Partial<DailyLog>): DailyLog {
    const log = this.log(id);
    Object.assign(log, {
      plannedMinutes: body.plannedMinutes ?? log.plannedMinutes,
      actualMinutes: body.actualMinutes ?? log.actualMinutes,
      dsaProblemsSolved: body.dsaProblemsSolved ?? log.dsaProblemsSolved,
      dsaTopics: body.dsaTopics ?? log.dsaTopics,
      blockers: body.blockers ?? log.blockers,
      reflection: body.reflection ?? log.reflection,
    });
    return log;
  }

  private deleteLog(id: number): { id: number } {
    this.state.logs = this.state.logs.filter((l) => l.id !== id);
    return { id };
  }

  private createEntry(logId: number, body: any) {
    const log = this.log(logId);
    const entry = {
      id: this.nextId(),
      logId,
      taskId: body.taskId ?? null,
      taskTitle: body.taskTitle ?? this.taskTitle(body.taskId),
      actualMinutes: Number(body.actualMinutes) || 0,
      outcome: body.outcome ?? 'done',
      notes: body.notes ?? '',
    };
    log.entries.push(entry);
    log.actualMinutes = log.entries.reduce((s, e) => s + e.actualMinutes, 0);
    return entry;
  }

  private deleteEntry(logId: number, entryId: number): { id: number } {
    const log = this.log(logId);
    log.entries = log.entries.filter((e) => e.id !== entryId);
    log.actualMinutes = log.entries.reduce((s, e) => s + e.actualMinutes, 0);
    return { id: entryId };
  }

  private log(id: number): DailyLog {
    const log = this.state.logs.find((l) => l.id === id);
    if (!log) throw new Error(`Log ${id} not found`);
    return log;
  }

  private taskTitle(taskId: number | null): string {
    if (!taskId) return 'Unplanned work';
    for (const week of this.state.weeks) {
      const task = week.tasks.find((t) => t.id === taskId);
      if (task) return task.title;
    }
    return 'Unplanned work';
  }

  // ---------- applications ----------

  private createApplication(body: Partial<Application>): Application {
    const app: Application = {
      id: this.nextId(),
      company: body.company!,
      role: body.role!,
      expectedCtcLpa: numOrNull(body.expectedCtcLpa),
      offeredCtcLpa: numOrNull(body.offeredCtcLpa),
      referralSource: body.referralSource || null,
      status: body.status ?? 'wishlist',
      appliedOn: body.appliedOn || null,
      nextFollowUp: body.nextFollowUp || null,
      notes: body.notes ?? '',
      rounds: [],
    };
    this.state.applications.push(app);
    return app;
  }

  private patchApplication(id: number, body: Partial<Application>): Application {
    const app = this.application(id);
    Object.assign(app, {
      status: body.status ?? app.status,
      appliedOn: body.appliedOn !== undefined ? body.appliedOn : app.appliedOn,
      nextFollowUp: body.nextFollowUp !== undefined ? body.nextFollowUp : app.nextFollowUp,
      offeredCtcLpa: body.offeredCtcLpa !== undefined ? numOrNull(body.offeredCtcLpa) : app.offeredCtcLpa,
      referralSource: body.referralSource !== undefined ? body.referralSource : app.referralSource,
      notes: body.notes ?? app.notes,
    });
    return app;
  }

  private deleteApplication(id: number): { id: number } {
    this.state.applications = this.state.applications.filter((a) => a.id !== id);
    return { id };
  }

  private createRound(applicationId: number, body: any) {
    const app = this.application(applicationId);
    const round = {
      id: this.nextId(),
      applicationId,
      name: body.name,
      scheduledAt: body.scheduledAt || null,
      status: body.status ?? 'scheduled',
      feedback: body.feedback ?? '',
    };
    app.rounds.push(round);
    return round;
  }

  private patchRound(id: number, body: any) {
    for (const app of this.state.applications) {
      const round = app.rounds.find((r) => r.id === id);
      if (round) {
        Object.assign(round, {
          status: body.status ?? round.status,
          scheduledAt: body.scheduledAt !== undefined ? body.scheduledAt : round.scheduledAt,
          feedback: body.feedback ?? round.feedback,
        });
        return round;
      }
    }
    throw new Error(`Round ${id} not found`);
  }

  private deleteRound(id: number): { id: number } {
    for (const app of this.state.applications) {
      app.rounds = app.rounds.filter((r) => r.id !== id);
    }
    return { id };
  }

  private application(id: number): Application {
    const app = this.state.applications.find((a) => a.id === id);
    if (!app) throw new Error(`Application ${id} not found`);
    return app;
  }

  // ---------- persistence ----------

  private nextId(): number {
    return ++this.state.seq;
  }

  private load(): MockState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as MockState;
    } catch {
      /* fall through to a clean state */
    }
    return { mission: SEED_MISSION, weeks: [], logs: [], applications: [], seq: 100 };
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage unavailable — keep working in memory */
    }
  }
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
