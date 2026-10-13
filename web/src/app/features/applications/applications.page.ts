import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
import { ApplicationStore } from '../../core/services/application.store';
import { Application, ApplicationStatus, RoundStatus } from '../../core/models';

const STATUSES: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'in_process',
  'offer',
  'rejected',
  'on_hold',
];

@Component({
  selector: 'lp-applications',
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
        title="Applications"
        subtitle="Every target company, its rounds, and the next follow-up you owe."
      >
        <button class="btn btn-sm btn-primary" type="button" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Cancel' : 'Add company' }}
        </button>
      </lp-page-header>

      @if (store.state.error(); as err) {
        <lp-error [message]="err" (retry)="store.refresh()" />
      }

      @if (showForm()) {
        <lp-card title="New application">
          <form [formGroup]="form" (ngSubmit)="create()" class="stack">
            <div class="grid grid-4">
              <label class="field">Company<input type="text" formControlName="company" /></label>
              <label class="field">Role<input type="text" formControlName="role" /></label>
              <label class="field">Expected CTC (LPA)<input type="number" formControlName="expectedCtcLpa" min="0" /></label>
              <label class="field">Referral source<input type="text" formControlName="referralSource" placeholder="Name / channel" /></label>
            </div>
            <div class="grid grid-4">
              <label class="field"
                >Status
                <select formControlName="status">
                  @for (status of statuses; track status) {
                    <option [value]="status">{{ status.replace('_', ' ') }}</option>
                  }
                </select>
              </label>
              <label class="field">Applied on<input type="date" formControlName="appliedOn" /></label>
              <label class="field">Next follow-up<input type="date" formControlName="nextFollowUp" /></label>
              <label class="field">Notes<input type="text" formControlName="notes" /></label>
            </div>
            <div class="row">
              <button class="btn btn-sm btn-primary" type="submit" [disabled]="form.invalid">Save</button>
            </div>
          </form>
        </lp-card>
      }

      @if (store.state.loading() && !store.state.loaded()) {
        <lp-loading [lines]="5" label="Loading pipeline…" />
      } @else if (store.applications().length === 0) {
        <lp-empty
          title="Pipeline is empty"
          message="Add target companies to start tracking referrals, rounds, and follow-ups."
        />
      } @else {
        <div class="grid grid-4">
          <lp-stat label="Total" [value]="store.applications().length" />
          <lp-stat label="Submitted" [value]="store.appliedCount()" />
          <lp-stat label="Active" [value]="store.activeCount()" hint="in play" />
          <lp-stat label="Rounds" [value]="store.interviewCount()" [hint]="store.upcomingRounds().length + ' upcoming'" />
        </div>

        <lp-card title="Pipeline" [flush]="true">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>CTC</th>
                  <th>Referral</th>
                  <th>Applied</th>
                  <th>Follow-up</th>
                  <th>Status</th>
                  <th>Rounds</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (app of store.applications(); track app.id) {
                  <tr>
                    <td><strong>{{ app.company }}</strong></td>
                    <td class="muted">{{ app.role }}</td>
                    <td class="mono">
                      {{ app.offeredCtcLpa ? app.offeredCtcLpa + ' offered' : (app.expectedCtcLpa ? app.expectedCtcLpa + ' exp.' : '—') }}
                    </td>
                    <td class="muted">{{ app.referralSource || '—' }}</td>
                    <td class="muted">{{ app.appliedOn ? (app.appliedOn | date: 'd MMM') : '—' }}</td>
                    <td [class.overdue]="isOverdue(app)">
                      {{ app.nextFollowUp ? (app.nextFollowUp | date: 'd MMM') : '—' }}
                    </td>
                    <td>
                      <select [value]="app.status" (change)="onStatusChange(app.id, $event)" class="status-select">
                        @for (status of statuses; track status) {
                          <option [value]="status">{{ status.replace('_', ' ') }}</option>
                        }
                      </select>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-ghost" type="button" (click)="toggle(app.id)">
                        {{ app.rounds.length }} {{ expandedId() === app.id ? '▴' : '▾' }}
                      </button>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-ghost" type="button" (click)="store.remove(app.id)">✕</button>
                    </td>
                  </tr>
                  @if (expandedId() === app.id) {
                    <tr>
                      <td colspan="9" class="rounds-cell">
                        <div class="stack">
                          <form [formGroup]="roundForm" (ngSubmit)="addRound(app.id)" class="round-form">
                            <input type="text" formControlName="name" placeholder="Round name (e.g. DSA screen)" />
                            <input type="date" formControlName="scheduledAt" />
                            <select formControlName="status">
                              @for (rs of roundStatuses; track rs) {
                                <option [value]="rs">{{ rs }}</option>
                              }
                            </select>
                            <input type="text" formControlName="feedback" placeholder="Feedback" />
                            <button class="btn btn-sm btn-primary" type="submit" [disabled]="roundForm.invalid">Add round</button>
                          </form>

                          @if (app.rounds.length === 0) {
                            <lp-empty title="No rounds yet" message="Add each interview round as it gets scheduled." />
                          } @else {
                            @for (round of app.rounds; track round.id) {
                              <div class="row-between round">
                                <div>
                                  <strong>{{ round.name }}</strong>
                                  <p class="small muted">
                                    {{ round.scheduledAt ? (round.scheduledAt | date: 'd MMM yyyy') : 'Unscheduled' }}
                                    · {{ round.feedback || 'No feedback recorded' }}
                                  </p>
                                </div>
                                <div class="row">
                                  <lp-badge [value]="round.status" />
                                  <select [value]="round.status" (change)="onRoundStatusChange(round.id, $event)" class="status-select">
                                    @for (rs of roundStatuses; track rs) {
                                      <option [value]="rs">{{ rs }}</option>
                                    }
                                  </select>
                                  <button class="btn btn-sm btn-ghost" type="button" (click)="store.removeRound(round.id)">✕</button>
                                </div>
                              </div>
                            }
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </lp-card>

        <lp-card title="Follow-up reminders">
          @if (store.dueFollowUps().length === 0) {
            <lp-empty title="Nothing due today" message="Follow-ups scheduled for today or earlier show up here." />
          } @else {
            <div class="stack">
              @for (app of store.dueFollowUps(); track app.id) {
                <div class="row-between">
                  <span>{{ app.company }} · <span class="muted">{{ app.role }}</span></span>
                  <div class="row">
                    <span class="small overdue">Due {{ app.nextFollowUp | date: 'd MMM' }}</span>
                    <button class="btn btn-sm" type="button" (click)="snooze(app)">Snooze 3 days</button>
                  </div>
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
      .status-select {
        width: 118px;
        text-transform: capitalize;
      }
      .rounds-cell {
        background: var(--bg-subtle);
      }
      .round-form {
        display: grid;
        grid-template-columns: 1.5fr 140px 130px 1.5fr auto;
        gap: 8px;
      }
      @media (max-width: 900px) {
        .round-form {
          grid-template-columns: 1fr 1fr;
        }
      }
      .round {
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
      }
      .round:last-child {
        border-bottom: none;
      }
      .overdue {
        color: var(--danger);
      }
    `,
  ],
})
export class ApplicationsPage implements OnInit {
  readonly store = inject(ApplicationStore);
  private fb = inject(FormBuilder);

  readonly statuses = STATUSES;
  readonly roundStatuses: RoundStatus[] = ['scheduled', 'cleared', 'failed', 'cancelled'];
  readonly showForm = signal(false);
  readonly expandedId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    company: ['', Validators.required],
    role: ['Full-Stack Engineer', Validators.required],
    expectedCtcLpa: [40],
    offeredCtcLpa: [null as number | null],
    referralSource: [''],
    status: ['wishlist' as ApplicationStatus],
    appliedOn: [''],
    nextFollowUp: [''],
    notes: [''],
  });

  readonly roundForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    scheduledAt: [''],
    status: ['scheduled' as RoundStatus],
    feedback: [''],
  });

  ngOnInit(): void {
    this.store.load();
  }

  create(): void {
    if (this.form.invalid) return;
    this.store.create(this.form.getRawValue());
    this.form.patchValue({ company: '', referralSource: '', notes: '' });
    this.showForm.set(false);
  }

  toggle(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  addRound(applicationId: number): void {
    if (this.roundForm.invalid) return;
    const value = this.roundForm.getRawValue();
    this.store.addRound(applicationId, { ...value, scheduledAt: value.scheduledAt || null });
    this.roundForm.patchValue({ name: '', feedback: '' });
  }

  onStatusChange(id: number, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as ApplicationStatus;
    const patch: { status: ApplicationStatus; appliedOn?: string } = { status };
    this.store.update(id, patch);
  }

  onRoundStatusChange(roundId: number, event: Event): void {
    this.store.updateRound(roundId, {
      status: (event.target as HTMLSelectElement).value as RoundStatus,
    });
  }

  isOverdue(app: Application): boolean {
    return !!app.nextFollowUp && app.nextFollowUp <= new Date().toISOString().slice(0, 10);
  }

  snooze(app: Application): void {
    const base = new Date(app.nextFollowUp ?? new Date().toISOString().slice(0, 10));
    base.setDate(base.getDate() + 3);
    this.store.update(app.id, { nextFollowUp: base.toISOString().slice(0, 10) });
  }
}
