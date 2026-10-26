import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Application, DayActivity, DayNote, Mission, NextStep, Pillar, Task, WeekData } from '../models';
import { ApiService } from './api.service';

/** Typed wrappers for every API call the app makes. */
@Injectable({ providedIn: 'root' })
export class TrackerService {
  private api = inject(ApiService);

  mission(): Observable<Mission> {
    return this.api.get('mission');
  }

  week(monday: string): Observable<WeekData> {
    return this.api.get(`week/${monday}`);
  }

  saveFocus(monday: string, focus: string): Observable<unknown> {
    return this.api.put(`week/${monday}/focus`, { focus });
  }

  activity(from: string, to: string): Observable<DayActivity[]> {
    return this.api.get(`activity?from=${from}&to=${to}`);
  }

  overdue(before: string): Observable<Task[]> {
    return this.api.get(`tasks/overdue?before=${before}`);
  }

  addTask(title: string, pillar: Pillar, date: string): Observable<Task> {
    return this.api.post('tasks', { title, pillar, date });
  }

  updateTask(id: number, patch: Partial<Pick<Task, 'done' | 'date' | 'title' | 'pillar'>>): Observable<Task> {
    return this.api.patch(`tasks/${id}`, patch);
  }

  deleteTask(id: number): Observable<unknown> {
    return this.api.delete(`tasks/${id}`);
  }

  saveNote(date: string, note: string): Observable<DayNote> {
    return this.api.put(`notes/${date}`, { note });
  }

  applications(): Observable<Application[]> {
    return this.api.get('applications');
  }

  dueFollowUps(on: string): Observable<Application[]> {
    return this.api.get(`applications/due?on=${on}`);
  }

  addApplication(app: Partial<Application>): Observable<Application> {
    return this.api.post('applications', app);
  }

  /** Logs the current step as a done Job Hunt task and sets the following one. */
  completeStep(id: number, next: NextStep): Observable<unknown> {
    return this.api.post(`applications/${id}/complete-step`, next);
  }

  updateApplication(id: number, patch: Partial<Application>): Observable<Application> {
    return this.api.patch(`applications/${id}`, patch);
  }

  deleteApplication(id: number): Observable<unknown> {
    return this.api.delete(`applications/${id}`);
  }
}
