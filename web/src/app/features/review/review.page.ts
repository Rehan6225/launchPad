import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  CardComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  ProgressBarComponent,
  StatComponent,
} from '../../shared';
import { InsightsStore } from '../../core/services/insights.store';
import { WeeklyReview } from '../../core/models';

@Component({
  selector: 'lp-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    PercentPipe,
    RouterLink,
    PageHeaderComponent,
    CardComponent,
    StatComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    ProgressBarComponent,
  ],
  template: `
    <div class="stack">
      <lp-page-header
        title="Review & Insights"
        subtitle="Derived only from committed plans and logged execution — nothing is estimated."
      >
        <button class="btn btn-sm" type="button" (click)="store.load(true)">Refresh</button>
      </lp-page-header>

      @if (store.state.error(); as err) {
        <lp-error [message]="err" (retry)="store.load(true)" />
      }

      @if (store.state.loading() && !store.state.loaded()) {
        <lp-loading [lines]="5" label="Crunching your logs…" />
      } @else if (store.weeks().length === 0) {
        <lp-empty
          title="Nothing to review yet"
          message="Insights appear once you have at least one planned week and one daily log."
        >
          <a class="btn btn-sm btn-primary" routerLink="/weekly-plan">Create a week</a>
        </lp-empty>
      } @else {
        <div class="grid grid-4">
          <lp-stat
            label="Latest completion"
            [value]="latest() ? (latest()!.completionRate | percent: '1.0-0') : '—'"
            [hint]="latest() ? latest()!.tasksDone + '/' + latest()!.tasksPlanned + ' tasks' : ''"
          />
          <lp-stat
            label="Planned hours"
            [value]="totals().planned | number: '1.0-1'"
            unit="h"
            hint="all weeks"
          />
          <lp-stat
            label="Actual hours"
            [value]="totals().actual | number: '1.0-1'"
            unit="h"
            [hint]="hoursDelta()"
          />
          <lp-stat label="DSA solved" [value]="totals().dsa" hint="from daily logs" />
        </div>

        <lp-card title="Weekly trend" subtitle="Completion rate and hours per week" [flush]="true">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Dates</th>
                  <th>Tasks</th>
                  <th>Completion</th>
                  <th>Planned h</th>
                  <th>Actual h</th>
                  <th>DSA</th>
                </tr>
              </thead>
              <tbody>
                @for (week of store.weeks(); track week.weekId) {
                  <tr>
                    <td><strong>W{{ week.weekNumber }}</strong></td>
                    <td class="muted">
                      {{ week.startDate | date: 'd MMM' }} – {{ week.endDate | date: 'd MMM' }}
                    </td>
                    <td class="mono">{{ week.tasksDone }}/{{ week.tasksPlanned }}</td>
                    <td>
                      <div class="completion">
                        <lp-progress [percent]="week.completionRate * 100" />
                        <span class="small muted">{{ week.completionRate | percent: '1.0-0' }}</span>
                      </div>
                    </td>
                    <td class="mono">{{ week.plannedHours }}</td>
                    <td class="mono" [class.short]="week.actualHours < week.plannedHours">
                      {{ week.actualHours }}
                    </td>
                    <td class="mono">{{ week.dsaProblemsSolved }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </lp-card>

        <div class="grid grid-2">
          <lp-card title="Next actions" subtitle="Generated from the gaps in your own data">
            @if (store.nextActions().length === 0) {
              <lp-empty title="No flags" message="Plan vs execution is on track for the latest week." />
            } @else {
              <div class="stack">
                @for (action of store.nextActions(); track action.id) {
                  <div class="action" [class]="'sev-' + action.severity">
                    <strong>{{ action.label }}</strong>
                    <p class="small muted">{{ action.reason }}</p>
                  </div>
                }
              </div>
            }
          </lp-card>

          <lp-card title="Blockers logged">
            @if (blockers().length === 0) {
              <lp-empty title="No blockers recorded" message="Blockers you log each day collect here." />
            } @else {
              <ul class="blockers">
                @for (blocker of blockers(); track $index) {
                  <li class="muted">{{ blocker }}</li>
                }
              </ul>
            }
          </lp-card>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .completion {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 140px;
      }
      .action {
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        border-left: 2px solid var(--border-strong);
        background: var(--bg-subtle);
      }
      .sev-warn {
        border-left-color: var(--warn);
      }
      .sev-danger {
        border-left-color: var(--danger);
      }
      .sev-info {
        border-left-color: var(--accent);
      }
      .short {
        color: var(--warn);
      }
      .blockers {
        margin: 0;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    `,
  ],
})
export class ReviewPage implements OnInit {
  readonly store = inject(InsightsStore);

  readonly latest = computed<WeeklyReview | null>(
    () => [...this.store.weeks()].sort((a, b) => b.weekNumber - a.weekNumber)[0] ?? null,
  );

  readonly totals = computed(() => {
    const weeks = this.store.weeks();
    return {
      planned: weeks.reduce((s, w) => s + w.plannedHours, 0),
      actual: weeks.reduce((s, w) => s + w.actualHours, 0),
      dsa: weeks.reduce((s, w) => s + w.dsaProblemsSolved, 0),
    };
  });

  readonly hoursDelta = computed(() => {
    const { planned, actual } = this.totals();
    if (!planned) return 'No estimates yet';
    const delta = Math.round((actual - planned) * 10) / 10;
    if (delta === 0) return 'Exactly on plan';
    return delta > 0 ? `+${delta}h vs plan` : `${delta}h vs plan`;
  });

  readonly blockers = computed(() => this.store.weeks().flatMap((w) => w.blockers));

  ngOnInit(): void {
    this.store.load(true);
  }
}
