import { Injectable, computed, inject } from '@angular/core';
import { PlannedTask, TaskStatus, Week, WeekOutcome } from '../models';
import { ApiService } from './api.service';
import { ResourceState } from './resource-state';

export interface NewWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  theme: string;
}

export type NewTask = Omit<PlannedTask, 'id' | 'weekId' | 'status'>;

@Injectable({ providedIn: 'root' })
export class PlanStore {
  private api = inject(ApiService);

  readonly state = new ResourceState<Week[]>();
  readonly weeks = computed(() => this.state.data() ?? []);
  readonly currentWeek = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weeks = this.weeks();
    return weeks.find((w) => w.startDate <= today && today <= w.endDate) ?? weeks[0] ?? null;
  });
  readonly allTasks = computed(() => this.weeks().flatMap((w) => w.tasks));

  load(force = false): void {
    if (this.state.loaded() && !force) return;
    this.refresh();
  }

  refresh(): void {
    this.state.track(this.api.get<Week[]>('weeks')).subscribe({ error: () => void 0 });
  }

  createWeek(week: NewWeek): void {
    this.api.post<Week>('weeks', week).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  deleteWeek(weekId: number): void {
    this.api.delete(`weeks/${weekId}`).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  addTask(weekId: number, task: NewTask): void {
    this.api.post<PlannedTask>(`weeks/${weekId}/tasks`, task).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  setTaskStatus(taskId: number, status: TaskStatus): void {
    this.api.patch<PlannedTask>(`tasks/${taskId}`, { status }).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  deleteTask(taskId: number): void {
    this.api.delete(`tasks/${taskId}`).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  addOutcome(weekId: number, description: string): void {
    this.api.post<WeekOutcome>(`weeks/${weekId}/outcomes`, { description }).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  setOutcomeAchieved(outcomeId: number, achieved: boolean): void {
    this.api.patch<WeekOutcome>(`outcomes/${outcomeId}`, { achieved }).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  deleteOutcome(outcomeId: number): void {
    this.api.delete(`outcomes/${outcomeId}`).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }
}
