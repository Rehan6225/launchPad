import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  BadgeComponent,
  CardComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  ProgressBarComponent,
  StatComponent,
} from '../../shared';
import { ApplicationStore } from '../../core/services/application.store';
import { LogStore } from '../../core/services/log.store';
import { MissionStore } from '../../core/services/mission.store';
import { PlanStore } from '../../core/services/plan.store';

@Component({
  selector: 'lp-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    PageHeaderComponent,
    CardComponent,
    StatComponent,
    BadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    ProgressBarComponent,
  ],
  template: `
    <div class="stack">
      <lp-page-header
        title="Dashboard"
        subtitle="One mission, tracked honestly. Numbers below only reflect what you have logged."
      >
        <a class="btn btn-sm" routerLink="/daily-log">Log today</a>
        <a class="btn btn-sm btn-primary" routerLink="/weekly-plan">Plan the week</a>
      </lp-page-header>

      @if (missionStore.state.error(); as err) {
        <lp-error [message]="err" (retry)="reload()" />
      }

      @if (missionStore.state.loading() && !mission()) {
        <lp-loading [lines]="4" label="Loading mission…" />
      }

      @if (mission(); as m) {
        <lp-card title="Career mission">
          <div class="stack">
            <h2 class="mission-title">{{ m.title }}</h2>
            <p class="muted">{{ m.summary }}</p>
            <div class="row-between ctc">
              <span class="small muted">Current ₹{{ m.currentCtcLpa }} LPA</span>
              <span class="small muted">Target ₹{{ m.targetCtcLpa }} LPA</span>
            </div>
            <lp-progress [percent]="ctcProgress()" />
            <p class="small faint">
              Progress is based on a confirmed offer only — it stays at
              {{ ctcProgress() }}% until one is recorded.
            </p>
          </div>
        </lp-card>

        <div class="grid grid-4">
          <lp-stat label="Current CTC" [value]="m.currentCtcLpa" unit="LPA" />
          <lp-stat label="Target CTC" [value]="m.targetCtcLpa" unit="LPA" hint="by Dec 2026" />
          <lp-stat
            label="Days left"
            [value]="daysLeft()"
            [hint]="m.targetDate | date: 'd MMM yyyy'"
          />
          <lp-stat
            label="Weeks planned"
            [value]="planStore.weeks().length"
            [hint]="planStore.allTasks().length + ' planned tasks'"
          />
        </div>

        <div class="grid grid-4">
          <lp-stat
            label="Applications"
            [value]="appStore.applications().length"
            [hint]="appStore.appliedCount() + ' submitted'"
          />
          <lp-stat label="Active pipeline" [value]="appStore.activeCount()" hint="not rejected" />
          <lp-stat
            label="Interview rounds"
            [value]="appStore.interviewCount()"
            [hint]="appStore.upcomingRounds().length + ' upcoming'"
          />
          <lp-stat
            label="Hours logged"
            [value]="hoursLogged() | number: '1.0-1'"
            unit="h"
            [hint]="logStore.logs().length + ' day(s) logged'"
          />
        </div>

        <div class="grid grid-2">
          <lp-card title="Mission pillars" subtitle="The four levers that move the offer">
            <div class="stack pillars">
              @for (pillar of m.pillars; track pillar.id) {
                <div class="pillar">
                  <strong>{{ pillar.name }}</strong>
                  <p class="small muted">{{ pillar.description }}</p>
                </div>
              }
            </div>
          </lp-card>

          <lp-card title="Upcoming interviews">
            @if (appStore.state.loading() && !appStore.state.loaded()) {
              <lp-loading [lines]="2" />
            } @else if (appStore.upcomingRounds().length === 0) {
              <lp-empty
                title="No interviews scheduled"
                message="Rounds you add to an application will appear here."
              >
                <a class="btn btn-sm" routerLink="/applications">Open applications</a>
              </lp-empty>
            } @else {
              <div class="stack">
                @for (round of appStore.upcomingRounds().slice(0, 5); track round.id) {
                  <div class="row-between item">
                    <div>
                      <strong>{{ round.company }}</strong>
                      <p class="small muted">{{ round.name }} · {{ round.role }}</p>
                    </div>
                    <div class="row">
                      <span class="small faint">{{
                        round.scheduledAt ? (round.scheduledAt | date: 'd MMM') : 'Unscheduled'
                      }}</span>
                      <lp-badge [value]="round.status" />
                    </div>
                  </div>
                }
              </div>
            }
          </lp-card>
        </div>

        <lp-card title="Follow-ups due">
          @if (appStore.dueFollowUps().length === 0) {
            <lp-empty
              title="Nothing due"
              message="Set a follow-up date on an application to get a reminder here."
            />
          } @else {
            <div class="stack">
              @for (app of appStore.dueFollowUps(); track app.id) {
                <div class="row-between item">
                  <div>
                    <strong>{{ app.company }}</strong>
                    <p class="small muted">{{ app.role }}</p>
                  </div>
                  <span class="small" style="color: var(--danger)">
                    Due {{ app.nextFollowUp | date: 'd MMM' }}
                  </span>
                </div>
              }
            </div>
          }
        </lp-card>
      }
    </div>
  `,
  styles: [
    `
      .mission-title {
        font-size: 16px;
      }
      .ctc {
        margin-top: 4px;
      }
      .pillar {
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-subtle);
      }
      .pillars {
        gap: 10px;
      }
      .item {
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border);
      }
      .item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
    `,
  ],
})
export class DashboardPage implements OnInit {
  readonly missionStore = inject(MissionStore);
  readonly planStore = inject(PlanStore);
  readonly logStore = inject(LogStore);
  readonly appStore = inject(ApplicationStore);

  readonly mission = this.missionStore.mission;

  readonly hoursLogged = computed(
    () => this.logStore.logs().reduce((sum, l) => sum + Number(l.actualMinutes || 0), 0) / 60,
  );

  /** Only a recorded offer moves this needle — no estimated progress. */
  readonly ctcProgress = computed(() => {
    const m = this.mission();
    if (!m) return 0;
    const bestOffer = Math.max(
      0,
      ...this.appStore
        .applications()
        .filter((a) => a.status === 'offer' && a.offeredCtcLpa)
        .map((a) => Number(a.offeredCtcLpa)),
    );
    if (!bestOffer) return 0;
    const span = m.targetCtcLpa - m.currentCtcLpa;
    if (span <= 0) return 100;
    return Math.round(Math.min(100, ((bestOffer - m.currentCtcLpa) / span) * 100));
  });

  readonly daysLeft = computed(() => {
    const m = this.mission();
    if (!m) return 0;
    const diff = new Date(m.targetDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86_400_000));
  });

  ngOnInit(): void {
    this.missionStore.load();
    this.planStore.load();
    this.logStore.load();
    this.appStore.load();
  }

  reload(): void {
    this.missionStore.load(true);
    this.planStore.refresh();
    this.logStore.refresh();
    this.appStore.refresh();
  }
}
