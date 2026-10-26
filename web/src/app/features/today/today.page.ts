import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import {
  ActivityMapComponent,
  CardComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  PageHeaderComponent,
  TaskItemComponent,
} from '../../shared';
import {
  DayActivity,
  PILLARS,
  Pillar,
  Task,
  WeekData,
} from '../../core/models';
import { TrackerService } from '../../core/services/tracker.service';
import { addDays, mondayOf, parseIso, today } from '../../core/dates';
import { JobFollowUpsComponent } from './job-follow-ups.component';

@Component({
  selector: 'lp-today',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    ActivityMapComponent,
    PageHeaderComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TaskItemComponent,
    JobFollowUpsComponent,
  ],
  template: `
    <div class="stack">
      <lp-page-header
        [title]="isToday() ? 'Today' : weekday()"
        [subtitle]="fullDate()"
      >
        <div class="row">
          <button class="btn btn-sm" type="button" (click)="shift(-1)">
            ‹ Prev
          </button>
          @if (!isToday()) {
            <button class="btn btn-sm" type="button" (click)="go(todayIso)">
              Today
            </button>
          }
          <button class="btn btn-sm" type="button" (click)="shift(1)">
            Next ›
          </button>
        </div>
      </lp-page-header>

      @if (error(); as err) {
        <lp-error [message]="err" (retry)="load()" />
      }

      @if (week()?.focus; as focus) {
        <p class="focus small">
          This week's focus: <strong>{{ focus }}</strong>
        </p>
      }

      <lp-card title="Consistency" [subtitle]="consistency()">
        <lp-activity-map
          [data]="activity()"
          [from]="mapFrom"
          [to]="targetDate()"
          [today]="todayIso"
          [selected]="date()"
          (select)="go($event)"
        />
      </lp-card>

      <lp-card
        title="Tasks"
        [subtitle]="doneCount() + ' of ' + tasks().length + ' done'"
      >
        <form class="add" (ngSubmit)="add()">
          <input
            name="title"
            [(ngModel)]="newTitle"
            placeholder="What will you do? e.g. 3 binary search problems"
          />
          <select name="pillar" [(ngModel)]="newPillar">
            @for (p of pillars; track p.id) {
              <option [value]="p.id">{{ p.label }}</option>
            }
          </select>
          <button
            class="btn btn-sm btn-primary"
            type="submit"
            [disabled]="!newTitle.trim()"
          >
            Add
          </button>
        </form>

        @if (tasks().length === 0) {
          <lp-empty
            title="Nothing planned"
            message="Add 1–3 tasks that move you toward ₹40 LPA."
          />
        } @else {
          @for (task of tasks(); track task.id) {
            <lp-task-item
              [task]="task"
              (toggle)="toggle($event)"
              (remove)="remove($event)"
            />
          }
        }
      </lp-card>

      @if (isToday()) {
        <lp-job-follow-ups (changed)="load()" />
      }

      @if (overdue().length) {
        <lp-card
          title="Unfinished from earlier days"
          subtitle="Move to today, tick off, or delete"
        >
          @for (task of overdue(); track task.id) {
            <lp-task-item
              [task]="task"
              (toggle)="toggle($event)"
              (remove)="remove($event)"
            >
              <span class="small faint">{{ task.date | date: 'd MMM' }}</span>
              <button
                class="btn btn-sm"
                type="button"
                (click)="moveToToday(task)"
              >
                Move to today
              </button>
            </lp-task-item>
          }
        </lp-card>
      }

      <lp-card
        title="Note"
        subtitle="What happened? What blocked you? (optional)"
      >
        <div class="stack">
          <textarea
            [(ngModel)]="note"
            (ngModelChange)="noteSaved.set(false)"
            placeholder="e.g. Stuck on lower-bound variation, will revisit tomorrow."
          ></textarea>
          <div class="row">
            <button class="btn btn-sm" type="button" (click)="saveNote()">
              Save note
            </button>
            @if (noteSaved()) {
              <span class="small faint">Saved</span>
            }
          </div>
        </div>
      </lp-card>
    </div>
  `,
  styles: [
    `
      .add {
        display: grid;
        grid-template-columns: 1fr 150px auto;
        gap: 8px;
        margin-bottom: 8px;
      }
      @media (max-width: 600px) {
        .add {
          grid-template-columns: 1fr;
        }
      }
      .focus {
        color: var(--text-muted);
      }
    `,
  ],
})
export class TodayPage implements OnInit {
  private tracker = inject(TrackerService);

  readonly pillars = PILLARS;
  readonly todayIso = today();

  readonly date = signal(this.todayIso);
  readonly week = signal<WeekData | null>(null);
  readonly overdue = signal<Task[]>([]);
  readonly error = signal<string | null>(null);
  readonly noteSaved = signal(false);

  /** The map shows the last ~4 months, then empty runway up to the mission deadline. */
  readonly mapFrom = addDays(this.todayIso, -7 * 17);
  readonly targetDate = signal(addDays(this.todayIso, 7 * 8));
  readonly activity = signal<DayActivity[]>([]);

  readonly consistency = computed(() => {
    const doneOn = new Map(this.activity().map((d) => [d.date, d.done]));
    // Today doesn't break the streak until it's over.
    let day = doneOn.get(this.todayIso)
      ? this.todayIso
      : addDays(this.todayIso, -1);
    let streak = 0;
    while (doneOn.get(day)) {
      streak++;
      day = addDays(day, -1);
    }
    const past = this.activity().filter((d) => d.date <= this.todayIso);
    const activeDays = past.filter((d) => d.done > 0).length;
    const tasksDone = past.reduce((sum, d) => sum + d.done, 0);
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    return `${streak}-day streak · ${plural(activeDays, 'active day')} · ${plural(tasksDone, 'task')} done in the last 4 months`;
  });

  readonly isToday = computed(() => this.date() === this.todayIso);
  readonly weekday = computed(() =>
    parseIso(this.date()).toLocaleDateString('en-IN', { weekday: 'long' }),
  );
  readonly fullDate = computed(() =>
    parseIso(this.date()).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  );
  readonly tasks = computed(() =>
    (this.week()?.tasks ?? []).filter((t) => t.date === this.date()),
  );
  readonly doneCount = computed(
    () => this.tasks().filter((t) => t.done).length,
  );

  newTitle = '';
  newPillar: Pillar = 'dsa';
  note = '';

  ngOnInit(): void {
    this.load();
  }

  go(date: string): void {
    this.date.set(date);
    this.load();
  }

  shift(days: number): void {
    this.go(addDays(this.date(), days));
  }

  load(): void {
    const date = this.date();
    forkJoin({
      week: this.tracker.week(mondayOf(date)),
      overdue: this.isToday() ? this.tracker.overdue(date) : of([]),
      mission: this.tracker.mission(),
    })
      .pipe(
        switchMap((result) =>
          this.tracker
            .activity(this.mapFrom, result.mission.targetDate)
            .pipe(map((activity) => ({ ...result, activity }))),
        ),
      )
      .subscribe({
        next: ({ week, overdue, mission, activity }) => {
          this.error.set(null);
          this.targetDate.set(mission.targetDate);
          this.activity.set(activity);
          this.week.set(week);
          this.overdue.set(overdue);
          this.note = week.notes.find((n) => n.date === date)?.note ?? '';
          this.noteSaved.set(false);
        },
        error: (e: Error) => this.error.set(e.message),
      });
  }

  add(): void {
    const title = this.newTitle.trim();
    if (!title) return;
    this.newTitle = '';
    this.run(this.tracker.addTask(title, this.newPillar, this.date()));
  }

  toggle(task: Task): void {
    this.run(this.tracker.updateTask(task.id, { done: !task.done }));
  }

  remove(task: Task): void {
    this.run(this.tracker.deleteTask(task.id));
  }

  moveToToday(task: Task): void {
    this.run(this.tracker.updateTask(task.id, { date: this.todayIso }));
  }

  saveNote(): void {
    this.tracker.saveNote(this.date(), this.note).subscribe({
      next: () => this.noteSaved.set(true),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  private run(request: ReturnType<TrackerService['deleteTask']>): void {
    request.subscribe({
      next: () => this.load(),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
