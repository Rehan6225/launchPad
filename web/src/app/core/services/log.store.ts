import { Injectable, computed, inject } from '@angular/core';
import { DailyLog, LogEntry, TaskOutcome } from '../models';
import { ApiService } from './api.service';
import { ResourceState } from './resource-state';

export type NewLog = Omit<DailyLog, 'id' | 'entries'>;

export interface NewLogEntry {
  taskId: number | null;
  taskTitle: string;
  actualMinutes: number;
  outcome: TaskOutcome;
  notes: string;
}

@Injectable({ providedIn: 'root' })
export class LogStore {
  private api = inject(ApiService);

  readonly state = new ResourceState<DailyLog[]>();
  readonly logs = computed(() => this.state.data() ?? []);
  readonly latest = computed(() => this.logs()[0] ?? null);

  load(force = false): void {
    if (this.state.loaded() && !force) return;
    this.refresh();
  }

  refresh(): void {
    this.state.track(this.api.get<DailyLog[]>('logs')).subscribe({ error: () => void 0 });
  }

  createLog(log: NewLog): void {
    this.api.post<DailyLog>('logs', log).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  updateLog(id: number, patch: Partial<NewLog>): void {
    this.api.patch<DailyLog>(`logs/${id}`, patch).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  deleteLog(id: number): void {
    this.api.delete(`logs/${id}`).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  addEntry(logId: number, entry: NewLogEntry): void {
    this.api.post<LogEntry>(`logs/${logId}/entries`, entry).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  deleteEntry(logId: number, entryId: number): void {
    this.api.delete(`logs/${logId}/entries/${entryId}`).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }
}
