import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BadgeComponent,
  CardComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  StatComponent,
} from '../../shared';
import { LogStore } from '../../core/services/log.store';
import { PlanStore } from '../../core/services/plan.store';
import { DailyLog, TaskOutcome } from '../../core/models';

@Component({
  selector: 'lp-daily-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    CardComponent,
    StatComponent,
    BadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
  ],
  template: `
    <div class="stack">
      <lp-page-header
        title="Daily Log"
        subtitle="What actually happened. Logs are stored separately from the committed plan."
      >
        <button class="btn btn-sm btn-primary" type="button" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Cancel' : 'New log' }}
        </button>
      </lp-page-header>

      @if (store.state.error(); as err) {
        <lp-error [message]="err" (retry)="store.refresh()" />
      }

      @if (showForm()) {
        <lp-card title="Log a day">
          <form [formGroup]="logForm" (ngSubmit)="createLog()" class="stack">
            <div class="grid grid-4">
              <label class="field">Date<input type="date" formControlName="logDate" /></label>
              <label class="field">Planned minutes<input type="number" formControlName="plannedMinutes" min="0" /></label>
              <label class="field">DSA problems solved<input type="number" formControlName="dsaProblemsSolved" min="0" /></label>
              <label class="field">DSA topics<input type="text" formControlName="dsaTopics" placeholder="e.g. Heaps, BFS" /></label>
            </div>
            <div class="grid grid-2">
              <label class="field">Blockers<textarea formControlName="blockers" placeholder="What slowed you down?"></textarea></label>
              <label class="field">Reflection<textarea formControlName="reflection" placeholder="What to change tomorrow?"></textarea></label>
            </div>
            <div class="row">
              <button class="btn btn-sm btn-primary" type="submit" [disabled]="logForm.invalid">Save log</button>
            </div>
          </form>
        </lp-card>
      }

      @if (store.state.loading() && !store.state.loaded()) {
        <lp-loading [lines]="5" label="Loading logs…" />
      } @else if (store.logs().length === 0) {
        <lp-empty
          title="No days logged yet"
          message="Log planned vs actual minutes to make the review section meaningful."
        />
      } @else {
        <div class="row-wrap">
          @for (log of store.logs(); track log.id) {
            <button
              type="button"
              class="btn btn-sm"
              [class.btn-primary]="log.id === selectedId()"
              (click)="selectedId.set(log.id)"
            >
              {{ log.logDate | date: 'd MMM' }}
            </button>
          }
        </div>

        @if (selected(); as log) {
          <div class="grid grid-4">
            <lp-stat label="Planned" [value]="log.plannedMinutes" unit="min" />
            <lp-stat
              label="Actual"
              [value]="log.actualMinutes"
              unit="min"
              [hint]="deltaLabel(log)"
            />
            <lp-stat label="DSA solved" [value]="log.dsaProblemsSolved" [hint]="log.dsaTopics || 'No topics noted'" />
            <lp-stat label="Entries" [value]="log.entries.length" hint="task outcomes" />
          </div>

          <lp-card title="Task outcomes" subtitle="Actual minutes against the planned tasks" [flush]="true">
            <form [formGroup]="entryForm" (ngSubmit)="addEntry(log.id)" class="entry-form">
              <select formControlName="taskId">
                <option value="">Unplanned work</option>
                @for (task of planStore.allTasks(); track task.id) {
                  <option [value]="task.id">{{ task.title }}</option>
                }
              </select>
              <input type="text" formControlName="taskTitle" placeholder="Label (if unplanned)" />
              <input type="number" formControlName="actualMinutes" min="0" placeholder="Minutes" />
              <select formControlName="outcome">
                <option value="done">Done</option>
                <option value="partial">Partial</option>
                <option value="skipped">Skipped</option>
              </select>
              <input type="text" formControlName="notes" placeholder="Notes" />
              <button class="btn btn-sm btn-primary" type="submit" [disabled]="entryForm.invalid">Add</button>
            </form>

            @if (log.entries.length === 0) {
              <div style="padding: 16px">
                <lp-empty title="No outcomes recorded" message="Add what you worked on and for how long." />
              </div>
            } @else {
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Minutes</th>
                      <th>Outcome</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (entry of log.entries; track entry.id) {
                      <tr>
                        <td>{{ entry.taskTitle }}</td>
                        <td class="mono">{{ entry.actualMinutes }}</td>
                        <td><lp-badge [value]="entry.outcome" /></td>
                        <td class="muted">{{ entry.notes || '—' }}</td>
                        <td>
                          <button class="btn btn-sm btn-ghost" type="button" (click)="store.deleteEntry(log.id, entry.id)">✕</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </lp-card>

          <div class="grid grid-2">
            <lp-card title="Blockers">
              @if (log.blockers.trim()) {
                <p class="muted">{{ log.blockers }}</p>
              } @else {
                <lp-empty title="No blockers recorded" />
              }
            </lp-card>
            <lp-card title="Reflection">
              @if (log.reflection.trim()) {
                <p class="muted">{{ log.reflection }}</p>
              } @else {
                <lp-empty title="No reflection written" />
              }
            </lp-card>
          </div>

          <div class="row">
            <button class="btn btn-sm btn-ghost" type="button" (click)="store.deleteLog(log.id)">
              Delete this log
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .entry-form {
        display: grid;
        grid-template-columns: 1.5fr 1.2fr 90px 110px 1.5fr auto;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
      }
      @media (max-width: 900px) {
        .entry-form {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class DailyLogPage implements OnInit {
  readonly store = inject(LogStore);
  readonly planStore = inject(PlanStore);
  private fb = inject(FormBuilder);

  readonly showForm = signal(false);
  readonly selectedId = signal<number | null>(null);
  readonly selected = computed(
    () => this.store.logs().find((l) => l.id === this.selectedId()) ?? this.store.latest(),
  );

  readonly logForm = this.fb.nonNullable.group({
    logDate: [new Date().toISOString().slice(0, 10), Validators.required],
    plannedMinutes: [0, [Validators.required, Validators.min(0)]],
    actualMinutes: [0],
    dsaProblemsSolved: [0, Validators.min(0)],
    dsaTopics: [''],
    blockers: [''],
    reflection: [''],
  });

  readonly entryForm = this.fb.nonNullable.group({
    taskId: [''],
    taskTitle: [''],
    actualMinutes: [30, [Validators.required, Validators.min(0)]],
    outcome: ['done' as TaskOutcome, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.store.load();
    this.planStore.load();
  }

  createLog(): void {
    if (this.logForm.invalid) return;
    this.store.createLog(this.logForm.getRawValue());
    this.showForm.set(false);
  }

  addEntry(logId: number): void {
    if (this.entryForm.invalid) return;
    const value = this.entryForm.getRawValue();
    const taskId = value.taskId ? Number(value.taskId) : null;
    const planned = this.planStore.allTasks().find((t) => t.id === taskId);
    this.store.addEntry(logId, {
      taskId,
      taskTitle: planned?.title || value.taskTitle || 'Unplanned work',
      actualMinutes: Number(value.actualMinutes),
      outcome: value.outcome,
      notes: value.notes,
    });
    this.entryForm.patchValue({ taskTitle: '', notes: '' });
  }

  deltaLabel(log: DailyLog): string {
    const delta = Number(log.actualMinutes) - Number(log.plannedMinutes);
    if (!log.plannedMinutes) return 'No plan set';
    if (delta === 0) return 'On plan';
    return delta > 0 ? `+${delta} min vs plan` : `${delta} min vs plan`;
  }
}
