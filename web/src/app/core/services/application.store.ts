import { Injectable, computed, inject } from '@angular/core';
import { Application, ApplicationStatus, InterviewRound, RoundStatus } from '../models';
import { ApiService } from './api.service';
import { ResourceState } from './resource-state';

export type NewApplication = Omit<Application, 'id' | 'rounds'>;

export interface NewRound {
  name: string;
  scheduledAt: string | null;
  status: RoundStatus;
  feedback: string;
}

const ACTIVE: ApplicationStatus[] = ['applied', 'in_process', 'offer'];

@Injectable({ providedIn: 'root' })
export class ApplicationStore {
  private api = inject(ApiService);

  readonly state = new ResourceState<Application[]>();
  readonly applications = computed(() => this.state.data() ?? []);

  readonly activeCount = computed(
    () => this.applications().filter((a) => ACTIVE.includes(a.status)).length,
  );
  readonly appliedCount = computed(
    () => this.applications().filter((a) => a.status !== 'wishlist').length,
  );
  readonly interviewCount = computed(() =>
    this.applications().reduce((sum, a) => sum + a.rounds.length, 0),
  );
  readonly upcomingRounds = computed(() => {
    const now = new Date().toISOString().slice(0, 10);
    return this.applications()
      .flatMap((a) => a.rounds.map((r) => ({ ...r, company: a.company, role: a.role })))
      .filter((r) => r.status === 'scheduled' && (!r.scheduledAt || r.scheduledAt >= now))
      .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  });
  readonly dueFollowUps = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.applications().filter(
      (a) => !!a.nextFollowUp && a.nextFollowUp <= today && a.status !== 'rejected',
    );
  });

  load(force = false): void {
    if (this.state.loaded() && !force) return;
    this.refresh();
  }

  refresh(): void {
    this.state.track(this.api.get<Application[]>('applications')).subscribe({ error: () => void 0 });
  }

  create(application: NewApplication): void {
    this.api.post<Application>('applications', application).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  update(id: number, patch: Partial<NewApplication>): void {
    this.api.patch<Application>(`applications/${id}`, patch).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  remove(id: number): void {
    this.api.delete(`applications/${id}`).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  addRound(applicationId: number, round: NewRound): void {
    this.api.post<InterviewRound>(`applications/${applicationId}/rounds`, round).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  updateRound(roundId: number, patch: Partial<NewRound>): void {
    this.api.patch<InterviewRound>(`rounds/${roundId}`, patch).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }

  removeRound(roundId: number): void {
    this.api.delete(`rounds/${roundId}`).subscribe({
      next: () => this.refresh(),
      error: (e: Error) => this.state.error.set(e.message),
    });
  }
}
