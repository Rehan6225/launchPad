import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { DayActivity } from '../../core/models';
import { addDays, mondayOf, parseIso } from '../../core/dates';

interface Cell {
  date: string;
  done: number;
  total: number;
  level: number; // 0..4
  future: boolean;
}

/** Sequential steps, one hue (green), dim → bright on the dark surface. Index = level. */
const LEVELS = ['var(--bg-subtle)', '#1f4a38', '#2a7353', '#379c6e', '#4fd394'];

/**
 * GitHub-style contribution map: one column per week (Mon–Sun), one cell per day.
 * Colour = tasks completed that day. Days after `today` are empty runway to the deadline.
 */
@Component({
  selector: 'lp-activity-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-wrap">
      <div class="map" [style.grid-template-columns]="'28px repeat(' + weeks().length + ', 13px)'">
        <span></span>
        @for (week of weeks(); track week.start) {
          <span class="month">{{ week.month }}</span>
        }

        @for (row of rows; track row) {
          <span class="weekday">{{ row % 2 === 0 ? weekdayLabels[row] : '' }}</span>
          @for (week of weeks(); track week.start) {
            @if (week.cells[row]; as cell) {
              <button
                type="button"
                class="cell"
                [class.future]="cell.future"
                [class.today]="cell.date === today"
                [class.selected]="cell.date === selected"
                [style.background]="cell.future ? 'transparent' : levels[cell.level]"
                [attr.aria-label]="describe(cell)"
                (mouseenter)="hover.set(cell)"
                (mouseleave)="hover.set(null)"
                (focus)="hover.set(cell)"
                (blur)="hover.set(null)"
                (click)="select.emit(cell.date)"
              ></button>
            } @else {
              <span></span>
            }
          }
        }
      </div>
    </div>

    <div class="row-between foot">
      <span class="small muted readout">{{ hover() ? describe(hover()!) : 'Hover a day for details · click to open it' }}</span>
      <span class="legend small faint">
        Less
        @for (color of levels; track $index) {
          <i [style.background]="color"></i>
        }
        More
      </span>
    </div>
  `,
  styles: [
    `
      .map-wrap {
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .map {
        display: grid;
        grid-auto-rows: 13px;
        gap: 3px;
        width: max-content;
      }
      .month,
      .weekday {
        font-size: 10px;
        line-height: 13px;
        color: var(--text-faint);
        white-space: nowrap;
        overflow: visible;
      }
      .cell {
        width: 13px;
        height: 13px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 3px;
      }
      .cell:hover,
      .cell:focus-visible {
        outline: 1px solid var(--text-muted);
        outline-offset: 1px;
      }
      .cell.future {
        border: 1px dashed var(--border);
      }
      .cell.today {
        border-color: var(--text);
      }
      .cell.selected {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
      }
      .foot {
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .readout {
        min-height: 18px;
      }
      .legend {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .legend i {
        width: 11px;
        height: 11px;
        border-radius: 3px;
        display: inline-block;
      }
    `,
  ],
})
export class ActivityMapComponent {
  @Input({ required: true }) set data(value: DayActivity[]) {
    this.byDate.set(new Map(value.map((d) => [d.date, d])));
  }
  @Input({ required: true }) set from(value: string) {
    this.start.set(mondayOf(value));
  }
  @Input({ required: true }) set to(value: string) {
    this.end.set(value);
  }
  @Input({ required: true }) set today(value: string) {
    this.todayIso.set(value);
  }
  get today(): string {
    return this.todayIso();
  }
  @Input() selected = '';
  @Output() select = new EventEmitter<string>();

  readonly levels = LEVELS;
  readonly rows = [0, 1, 2, 3, 4, 5, 6];
  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly hover = signal<Cell | null>(null);

  private readonly byDate = signal(new Map<string, DayActivity>());
  private readonly start = signal('');
  private readonly end = signal('');
  private readonly todayIso = signal('');

  readonly weeks = computed(() => {
    const start = this.start();
    const end = this.end();
    const today = this.todayIso();
    if (!start || !end) return [];

    const weeks: { start: string; month: string; cells: (Cell | null)[] }[] = [];
    let lastMonth = -1;
    for (let monday = start; monday <= end; monday = addDays(monday, 7)) {
      const month = parseIso(monday).getMonth();
      const cells = this.rows.map((i) => {
        const date = addDays(monday, i);
        if (date > end) return null;
        const day = this.byDate().get(date);
        const done = day?.done ?? 0;
        return { date, done, total: day?.total ?? 0, level: Math.min(done, 4), future: date > today };
      });
      weeks.push({
        start: monday,
        month: month !== lastMonth ? parseIso(monday).toLocaleDateString('en-IN', { month: 'short' }) : '',
        cells,
      });
      lastMonth = month;
    }
    // A single leading week of a month has no room for its label next to the following month's.
    if (weeks.length > 1 && weeks[1].month) weeks[0].month = '';
    return weeks;
  });

  describe(cell: Cell): string {
    const day = parseIso(cell.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    if (cell.future) return `${day}: upcoming`;
    if (!cell.total) return `${day}: nothing planned`;
    return `${day}: ${cell.done} of ${cell.total} task${cell.total === 1 ? '' : 's'} done`;
  }
}
