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
} from '../../shared';
import { PlanStore } from '../../core/services/plan.store';
import { Priority, TaskStatus, Week } from '../../core/models';

const STATUSES: TaskStatus[] = ['planned', 'in_progress', 'done', 'skipped'];

@Component({
  selector: 'lp-weekly-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    CardComponent,
    BadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
  ],
  template: `
    <div class="stack">
      <lp-page-header
        title="Weekly Plan"
        subtitle="The plan you commit to. Estimates and dates stay as written — only status changes."
      >
        <button class="btn btn-sm btn-primary" type="button" (click)="showWeekForm.set(!showWeekForm())">
          {{ showWeekForm() ? 'Cancel' : 'New week' }}
        </button>
      </lp-page-header>

      @if (store.state.error(); as err) {
        <lp-error [message]="err" (retry)="store.refresh()" />
      }

      @if (showWeekForm()) {
        <lp-card title="Create a week">
          <form [formGroup]="weekForm" (ngSubmit)="createWeek()" class="stack">
            <div class="grid grid-4">
              <label class="field">Week number<input type="number" formControlName="weekNumber" min="1" /></label>
              <label class="field">Start date<input type="date" formControlName="startDate" /></label>
              <label class="field">End date<input type="date" formControlName="endDate" /></label>
              <label class="field">Theme<input type="text" formControlName="theme" placeholder="e.g. Graphs + referrals" /></label>
            </div>
            <div class="row">
              <button class="btn btn-sm btn-primary" type="submit" [disabled]="weekForm.invalid">Save week</button>
            </div>
          </form>
        </lp-card>
      }

      @if (store.state.loading() && !store.state.loaded()) {
        <lp-loading [lines]="5" label="Loading plans…" />
      } @else if (store.weeks().length === 0) {
        <lp-empty
          title="No weekly plan yet"
          message="Create a week, define 2–3 outcomes, then break them into daily tasks."
        />
      } @else {
        <div class="row-wrap">
          @for (week of store.weeks(); track week.id) {
            <button
              type="button"
              class="btn btn-sm"
              [class.btn-primary]="week.id === selectedId()"
              (click)="selectedId.set(week.id)"
            >
              Week {{ week.weekNumber }}
            </button>
          }
        </div>

        @if (selected(); as week) {
          <div class="grid grid-2">
            <lp-card
              [title]="'Week ' + week.weekNumber + (week.theme ? ' · ' + week.theme : '')"
              [subtitle]="(week.startDate | date: 'd MMM') + ' – ' + (week.endDate | date: 'd MMM yyyy')"
            >
              <div class="stack">
                <form [formGroup]="outcomeForm" (ngSubmit)="addOutcome(week.id)" class="row">
                  <input
                    type="text"
                    formControlName="description"
                    placeholder="Outcome for this week"
                  />
                  <button class="btn btn-sm" type="submit" [disabled]="outcomeForm.invalid">Add</button>
                </form>

                @if (week.outcomes.length === 0) {
                  <lp-empty title="No outcomes defined" message="What must be true by Sunday?" />
                } @else {
                  <div class="stack outcomes">
                    @for (outcome of week.outcomes; track outcome.id) {
                      <label class="row-between outcome">
                        <span class="row">
                          <input
                            type="checkbox"
                            class="check"
                            [checked]="outcome.achieved"
                            (change)="store.setOutcomeAchieved(outcome.id, !outcome.achieved)"
                          />
                          <span [class.done]="outcome.achieved">{{ outcome.description }}</span>
                        </span>
                        <button
                          class="btn btn-sm btn-ghost"
                          type="button"
                          (click)="store.deleteOutcome(outcome.id)"
                        >
                          ✕
                        </button>
                      </label>
                    }
                  </div>
                }
              </div>
            </lp-card>

            <lp-card title="Week at a glance">
              <div class="stack">
                <div class="row-between">
                  <span class="muted">Planned tasks</span><strong>{{ week.tasks.length }}</strong>
                </div>
                <div class="row-between">
                  <span class="muted">Estimated hours</span><strong>{{ plannedHours(week) }}h</strong>
                </div>
                <div class="row-between">
                  <span class="muted">Completed</span>
                  <strong>{{ doneCount(week) }} / {{ week.tasks.length }}</strong>
                </div>
                <hr class="divider" />
                <p class="small faint">
                  Actual time comes from the Daily Log and never overwrites these estimates.
                </p>
                <button class="btn btn-sm btn-ghost" type="button" (click)="store.deleteWeek(week.id)">
                  Delete week
                </button>
              </div>
            </lp-card>
          </div>

          <lp-card title="Planned tasks" subtitle="Original commitments for this week" [flush]="true">
            <form [formGroup]="taskForm" (ngSubmit)="addTask(week.id)" class="task-form">
              <input type="text" formControlName="title" placeholder="Task title" />
              <input type="text" formControlName="category" placeholder="Category" />
              <input type="date" formControlName="plannedDate" />
              <input type="number" formControlName="estimatedHours" step="0.5" min="0" placeholder="Hrs" />
              <select formControlName="priority">
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
              </select>
              <input type="date" formControlName="dueDate" />
              <button class="btn btn-sm btn-primary" type="submit" [disabled]="taskForm.invalid">Add task</button>
            </form>

            @if (week.tasks.length === 0) {
              <div style="padding: 16px">
                <lp-empty title="No tasks planned" message="Add the tasks that deliver the outcomes above." />
              </div>
            } @else {
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Category</th>
                      <th>Planned</th>
                      <th>Est.</th>
                      <th>Priority</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (task of sortedTasks(week); track task.id) {
                      <tr>
                        <td>{{ task.title }}</td>
                        <td class="muted">{{ task.category }}</td>
                        <td class="muted">{{ task.plannedDate | date: 'EEE d MMM' }}</td>
                        <td class="mono">{{ task.estimatedHours }}h</td>
                        <td><lp-badge [value]="task.priority" /></td>
                        <td class="muted">{{ task.dueDate ? (task.dueDate | date: 'd MMM') : '—' }}</td>
                        <td>
                          <select
                            [value]="task.status"
                            (change)="onStatusChange(task.id, $event)"
                            class="status-select"
                          >
                            @for (status of statuses; track status) {
                              <option [value]="status">{{ status.replace('_', ' ') }}</option>
                            }
                          </select>
                        </td>
                        <td>
                          <button class="btn btn-sm btn-ghost" type="button" (click)="store.deleteTask(task.id)">✕</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </lp-card>
        }
      }
    </div>
  `,
  styles: [
    `
      .task-form {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 70px 80px 1fr auto;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
      }
      @media (max-width: 900px) {
        .task-form {
          grid-template-columns: 1fr 1fr;
        }
      }
      .outcome {
        padding: 6px 0;
      }
      .outcomes {
        gap: 2px;
      }
      .check {
        width: 15px;
        height: 15px;
        accent-color: var(--accent);
      }
      .done {
        text-decoration: line-through;
        color: var(--text-faint);
      }
      .status-select {
        width: 120px;
        text-transform: capitalize;
      }
    `,
  ],
})
export class WeeklyPlanPage implements OnInit {
  readonly store = inject(PlanStore);
  private fb = inject(FormBuilder);

  readonly statuses = STATUSES;
  readonly showWeekForm = signal(false);
  readonly selectedId = signal<number | null>(null);

  readonly selected = computed(() => {
    const weeks = this.store.weeks();
    const id = this.selectedId();
    return weeks.find((w) => w.id === id) ?? this.store.currentWeek();
  });

  readonly weekForm = this.fb.nonNullable.group({
    weekNumber: [1, [Validators.required, Validators.min(1)]],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    theme: [''],
  });

  readonly outcomeForm = this.fb.nonNullable.group({
    description: ['', Validators.required],
  });

  readonly taskForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    category: ['DSA'],
    plannedDate: ['', Validators.required],
    estimatedHours: [1, [Validators.required, Validators.min(0)]],
    priority: ['P1' as Priority],
    dueDate: [''],
  });

  ngOnInit(): void {
    this.store.load();
    const monday = startOfWeek();
    this.weekForm.patchValue({
      weekNumber: this.store.weeks().length + 1,
      startDate: monday,
      endDate: addDays(monday, 6),
      theme: '',
    });
    this.taskForm.patchValue({ plannedDate: new Date().toISOString().slice(0, 10) });
  }

  createWeek(): void {
    if (this.weekForm.invalid) return;
    this.store.createWeek(this.weekForm.getRawValue());
    this.showWeekForm.set(false);
    this.weekForm.patchValue({ theme: '' });
  }

  addOutcome(weekId: number): void {
    if (this.outcomeForm.invalid) return;
    this.store.addOutcome(weekId, this.outcomeForm.getRawValue().description);
    this.outcomeForm.reset({ description: '' });
  }

  addTask(weekId: number): void {
    if (this.taskForm.invalid) return;
    const value = this.taskForm.getRawValue();
    this.store.addTask(weekId, {
      title: value.title,
      category: value.category || 'General',
      plannedDate: value.plannedDate,
      estimatedHours: Number(value.estimatedHours),
      priority: value.priority,
      dueDate: value.dueDate || null,
    });
    this.taskForm.patchValue({ title: '', dueDate: '' });
  }

  onStatusChange(taskId: number, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as TaskStatus;
    this.store.setTaskStatus(taskId, status);
  }

  sortedTasks(week: Week) {
    return [...week.tasks].sort(
      (a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.priority.localeCompare(b.priority),
    );
  }

  plannedHours(week: Week): number {
    return Math.round(week.tasks.reduce((s, t) => s + Number(t.estimatedHours || 0), 0) * 10) / 10;
  }

  doneCount(week: Week): number {
    return week.tasks.filter((t) => t.status === 'done').length;
  }
}

function startOfWeek(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  now.setDate(now.getDate() - day);
  return now.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
