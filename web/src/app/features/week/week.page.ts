import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CardComponent,
  ErrorStateComponent,
  PageHeaderComponent,
  ProgressBarComponent,
  TaskItemComponent,
} from '../../shared';
import { PILLARS, Pillar, Task, WeekData } from '../../core/models';
import { TrackerService } from '../../core/services/tracker.service';
import { addDays, mondayOf, today } from '../../core/dates';

@Component({
  selector: 'lp-week',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, PageHeaderComponent, CardComponent, ErrorStateComponent, ProgressBarComponent, TaskItemComponent],
  template: `
    <div class="stack">
      <lp-page-header
        title="Week"
        [subtitle]="(start() | date: 'd MMM') + ' – ' + (end() | date: 'd MMM yyyy')"
      >
        <div class="row">
          <button class="btn btn-sm" type="button" (click)="shift(-7)">‹ Prev</button>
          @if (start() !== thisMonday) {
            <button class="btn btn-sm" type="button" (click)="go(thisMonday)">This week</button>
          }
          <button class="btn btn-sm" type="button" (click)="shift(7)">Next ›</button>
        </div>
      </lp-page-header>

      @if (error(); as err) {
        <lp-error [message]="err" (retry)="load()" />
      }

      <lp-card title="Focus" subtitle="The one thing this week is about">
        <div class="row">
          <input [(ngModel)]="focus" (ngModelChange)="focusSaved.set(false)" placeholder="e.g. Binary search variations + 2 referrals" />
          <button class="btn btn-sm" type="button" (click)="saveFocus()">Save</button>
          @if (focusSaved()) {
            <span class="small faint">Saved</span>
          }
        </div>
      </lp-card>

      <lp-card title="Progress by pillar" [subtitle]="doneCount() + ' of ' + tasks().length + ' tasks done'">
        <div class="stack pillars">
          @for (p of pillarStats(); track p.id) {
            <div class="pillar">
              <span>{{ p.label }}</span>
              <lp-progress [percent]="p.total ? (p.done / p.total) * 100 : 0" />
              <span class="small mono" [class.warn]="p.total === 0">
                {{ p.total ? p.done + '/' + p.total : 'nothing planned' }}
              </span>
            </div>
          }
        </div>
      </lp-card>

      <lp-card title="Plan the week">
        <form class="add" (ngSubmit)="add()">
          <input name="title" [(ngModel)]="newTitle" placeholder="Task" />
          <select name="pillar" [(ngModel)]="newPillar">
            @for (p of pillars; track p.id) {
              <option [value]="p.id">{{ p.label }}</option>
            }
          </select>
          <select name="day" [(ngModel)]="newDate">
            @for (d of days(); track d) {
              <option [value]="d">{{ d | date: 'EEE d MMM' }}</option>
            }
          </select>
          <button class="btn btn-sm btn-primary" type="submit" [disabled]="!newTitle.trim()">Add</button>
        </form>
      </lp-card>

      @for (d of days(); track d) {
        <lp-card [title]="(d | date: 'EEEE, d MMM') + (d === todayIso ? ' · today' : '')">
          @if (tasksOn(d).length === 0 && !noteOn(d)) {
            <p class="small faint">Nothing planned or logged.</p>
          }
          @for (task of tasksOn(d); track task.id) {
            <lp-task-item [task]="task" (toggle)="toggle($event)" (remove)="remove($event)" />
          }
          @if (noteOn(d); as note) {
            <p class="note small muted">{{ note }}</p>
          }
        </lp-card>
      }
    </div>
  `,
  styles: [
    `
      .pillars {
        gap: 10px;
      }
      .pillar {
        display: grid;
        grid-template-columns: 120px 1fr 110px;
        align-items: center;
        gap: 12px;
      }
      .pillar .mono {
        text-align: right;
      }
      .warn {
        color: var(--warn);
      }
      .add {
        display: grid;
        grid-template-columns: 1fr 150px 150px auto;
        gap: 8px;
      }
      @media (max-width: 700px) {
        .add {
          grid-template-columns: 1fr;
        }
      }
      .note {
        margin-top: 8px;
        white-space: pre-line;
        border-left: 2px solid var(--border-strong);
        padding-left: 10px;
      }
    `,
  ],
})
export class WeekPage implements OnInit {
  private tracker = inject(TrackerService);

  readonly pillars = PILLARS;
  readonly todayIso = today();
  readonly thisMonday = mondayOf(this.todayIso);

  readonly start = signal(this.thisMonday);
  readonly week = signal<WeekData | null>(null);
  readonly error = signal<string | null>(null);
  readonly focusSaved = signal(false);

  readonly end = computed(() => addDays(this.start(), 6));
  readonly days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(this.start(), i)));
  readonly tasks = computed(() => this.week()?.tasks ?? []);
  readonly doneCount = computed(() => this.tasks().filter((t) => t.done).length);
  readonly pillarStats = computed(() =>
    PILLARS.map((p) => {
      const mine = this.tasks().filter((t) => t.pillar === p.id);
      return { ...p, total: mine.length, done: mine.filter((t) => t.done).length };
    }),
  );

  focus = '';
  newTitle = '';
  newPillar: Pillar = 'dsa';
  newDate = this.todayIso;

  ngOnInit(): void {
    this.load();
  }

  go(monday: string): void {
    this.start.set(monday);
    this.newDate = this.days().includes(this.todayIso) ? this.todayIso : monday;
    this.load();
  }

  shift(days: number): void {
    this.go(addDays(this.start(), days));
  }

  load(): void {
    this.tracker.week(this.start()).subscribe({
      next: (week) => {
        this.error.set(null);
        this.week.set(week);
        this.focus = week.focus;
        this.focusSaved.set(false);
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  tasksOn(date: string): Task[] {
    return this.tasks().filter((t) => t.date === date);
  }

  noteOn(date: string): string {
    return this.week()?.notes.find((n) => n.date === date)?.note ?? '';
  }

  saveFocus(): void {
    this.tracker.saveFocus(this.start(), this.focus).subscribe({
      next: () => this.focusSaved.set(true),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  add(): void {
    const title = this.newTitle.trim();
    if (!title) return;
    this.newTitle = '';
    this.run(this.tracker.addTask(title, this.newPillar, this.newDate));
  }

  toggle(task: Task): void {
    this.run(this.tracker.updateTask(task.id, { done: !task.done }));
  }

  remove(task: Task): void {
    this.run(this.tracker.deleteTask(task.id));
  }

  private run(request: ReturnType<TrackerService['deleteTask']>): void {
    request.subscribe({ next: () => this.load(), error: (e: Error) => this.error.set(e.message) });
  }
}
