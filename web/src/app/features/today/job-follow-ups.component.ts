import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../shared';
import { APPLICATION_STATUSES, Application, NextStep } from '../../core/models';
import { TrackerService } from '../../core/services/tracker.service';
import { addDays, daysBetween, today } from '../../core/dates';

/**
 * Companies whose next step is due today or earlier. "Done" logs the step as a
 * Job Hunt task and asks for the following step, so the pipeline never goes quiet.
 */
@Component({
  selector: 'lp-job-follow-ups',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CardComponent],
  template: `
    @if (due().length) {
      <lp-card title="Job follow-ups" subtitle="Next steps due from your Jobs pipeline">
        @for (app of due(); track app.id) {
          <div class="item">
            <div class="row-between">
              <div>
                <strong>{{ app.company }}</strong>
                <span class="muted"> · {{ app.nextStep }}</span>
                @if (lateBy(app); as d) {
                  <span class="small warn"> · {{ d }}d overdue</span>
                }
              </div>
              @if (completingId() !== app.id) {
                <button class="btn btn-sm" type="button" (click)="start(app)">Done ✓</button>
              }
            </div>

            @if (completingId() === app.id) {
              <form class="next" (ngSubmit)="complete(app)">
                <input name="nextStep" [(ngModel)]="next.nextStep" placeholder="What's next? (blank = nothing)" />
                <input name="nextStepOn" type="date" [(ngModel)]="next.nextStepOn" />
                <select name="status" [(ngModel)]="next.status">
                  @for (s of statuses; track s.id) {
                    <option [value]="s.id">{{ s.label }}</option>
                  }
                </select>
                <button class="btn btn-sm btn-primary" type="submit">Save</button>
                <button class="btn btn-sm btn-ghost" type="button" (click)="completingId.set(null)">Cancel</button>
              </form>
            }
          </div>
        }
        <p class="small faint more"><a routerLink="/jobs">Open Jobs →</a></p>
      </lp-card>
    }
  `,
  styles: [
    `
      .item {
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
      }
      .warn {
        color: var(--warn);
      }
      .next {
        display: grid;
        grid-template-columns: 1fr 140px 140px auto auto;
        gap: 8px;
        margin-top: 8px;
      }
      @media (max-width: 700px) {
        .next {
          grid-template-columns: 1fr;
        }
      }
      .more {
        margin-top: 10px;
      }
    `,
  ],
})
export class JobFollowUpsComponent implements OnInit {
  private tracker = inject(TrackerService);

  /** Fires after a step is completed so the page can refresh tasks and the map. */
  @Output() changed = new EventEmitter<void>();

  readonly statuses = APPLICATION_STATUSES;
  readonly todayIso = today();
  readonly due = signal<Application[]>([]);
  readonly completingId = signal<number | null>(null);

  next: NextStep = { nextStep: '', nextStepOn: null, status: 'target' };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.tracker.dueFollowUps(this.todayIso).subscribe({ next: (apps) => this.due.set(apps), error: () => void 0 });
  }

  lateBy(app: Application): number {
    return app.nextStepOn ? daysBetween(app.nextStepOn, this.todayIso) : 0;
  }

  start(app: Application): void {
    this.next = { nextStep: '', nextStepOn: addDays(this.todayIso, 3), status: app.status };
    this.completingId.set(app.id);
  }

  complete(app: Application): void {
    const step = this.next.nextStep.trim();
    this.tracker
      .completeStep(app.id, { ...this.next, nextStep: step, nextStepOn: step ? this.next.nextStepOn : null })
      .subscribe(() => {
        this.completingId.set(null);
        this.load();
        this.changed.emit();
      });
  }
}
