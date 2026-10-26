import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardComponent, EmptyStateComponent, ErrorStateComponent, PageHeaderComponent } from '../../shared';
import {
  ACTIVE_STATUSES,
  APPLICATION_STATUSES,
  Application,
  PAY_BANDS,
  PayBand,
  SOURCES,
  STALE_AFTER_DAYS,
  Source,
  statusLabel,
} from '../../core/models';
import { TrackerService } from '../../core/services/tracker.service';
import { addDays, daysBetween, today } from '../../core/dates';

const FUNNEL = APPLICATION_STATUSES.filter((s) => ACTIVE_STATUSES.includes(s.id) || s.id === 'offer');

@Component({
  selector: 'lp-jobs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, PageHeaderComponent, CardComponent, EmptyStateComponent, ErrorStateComponent],
  template: `
    <div class="stack">
      <lp-page-header
        title="Jobs"
        subtitle="Every company needs a next step with a date — that's what puts it on your Today page."
      />

      @if (error(); as err) {
        <lp-error [message]="err" (retry)="load()" />
      }

      <lp-card title="Pipeline">
        <div class="funnel">
          @for (stage of funnel(); track stage.id; let last = $last) {
            <div class="stage">
              <strong>{{ stage.count }}</strong>
              <span class="small muted">{{ stage.label }}</span>
            </div>
            @if (!last) {
              <span class="arrow" aria-hidden="true">→</span>
            }
          }
        </div>
        <div class="row-between foot">
          <p class="nudge small">{{ nudge() }}</p>
          <span class="small faint">Rejected {{ count('rejected') }} · Dropped {{ count('dropped') }}</span>
        </div>
      </lp-card>

      <lp-card title="Add a company">
        <form class="add" (ngSubmit)="add()">
          <input name="company" [(ngModel)]="draft.company" placeholder="Company *" />
          <input name="role" [(ngModel)]="draft.role" placeholder="Role, e.g. SDE-2 Full Stack" />
          <select name="payBand" [(ngModel)]="draft.payBand">
            @for (b of payBands; track b.id) {
              <option [value]="b.id">{{ b.label }}</option>
            }
          </select>
          <select name="source" [(ngModel)]="draft.source">
            @for (s of sources; track s.id) {
              <option [value]="s.id">{{ s.label }}</option>
            }
          </select>
          <input name="contact" [(ngModel)]="draft.contact" placeholder="Contact (who can refer you?)" />
          <input name="nextStep" [(ngModel)]="draft.nextStep" placeholder="Next step, e.g. Ask Rahul for referral" />
          <input name="nextStepOn" type="date" [(ngModel)]="draft.nextStepOn" />
          <button class="btn btn-sm btn-primary" type="submit" [disabled]="!draft.company.trim()">Add</button>
        </form>
      </lp-card>

      <lp-card title="Companies" subtitle="Click a row to update it" [flush]="true">
        @if (apps().length === 0) {
          <div style="padding: 16px">
            <lp-empty title="No companies yet" message="Add 10–15 companies that can pay ₹40L+, then find a referral for each." />
          </div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Pay</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                @for (app of sorted(); track app.id) {
                  <tr class="app-row" [class.closed]="!isActive(app)" (click)="toggleEdit(app)">
                    <td>
                      <strong>{{ app.company }}</strong>
                      @if (app.role) {
                        <div class="small muted">{{ app.role }}</div>
                      }
                    </td>
                    <td class="small" [class.ok]="app.payBand === 'yes'" [class.warn]="app.payBand === 'no'">
                      {{ bandLabel(app.payBand) }}
                    </td>
                    <td class="small muted">
                      {{ sourceLabel(app.source) }}
                      @if (app.contact) {
                        <div>via {{ app.contact }}</div>
                      }
                    </td>
                    <td class="small">
                      {{ statusText(app) }}
                      @if (staleDays(app); as d) {
                        <div class="warn">Stale · {{ d }}d quiet</div>
                      }
                    </td>
                    <td class="small">
                      @if (app.nextStep) {
                        <div>{{ app.nextStep }}</div>
                        @if (app.nextStepOn) {
                          <div [class.warn]="app.nextStepOn <= todayIso" class="muted">
                            {{ app.nextStepOn <= todayIso ? 'Due' : '' }} {{ app.nextStepOn | date: 'EEE d MMM' }}
                          </div>
                        }
                      } @else if (isActive(app)) {
                        <span class="warn">No next step</span>
                      } @else {
                        <span class="faint">—</span>
                      }
                    </td>
                  </tr>

                  @if (editingId() === app.id) {
                    <tr class="editor-row">
                      <td colspan="5">
                        <form class="editor" (ngSubmit)="save(app)">
                          <label class="field">Status
                            <select name="status" [(ngModel)]="edit.status">
                              @for (s of statuses; track s.id) {
                                <option [value]="s.id">{{ s.label }}</option>
                              }
                            </select>
                          </label>
                          <label class="field">Next step
                            <input name="nextStep" [(ngModel)]="edit.nextStep" placeholder="What's the next move?" />
                          </label>
                          <label class="field">When
                            <input name="nextStepOn" type="date" [(ngModel)]="edit.nextStepOn" />
                          </label>
                          <label class="field">Contact
                            <input name="contact" [(ngModel)]="edit.contact" />
                          </label>
                          <label class="field">Pay band
                            <select name="payBand" [(ngModel)]="edit.payBand">
                              @for (b of payBands; track b.id) {
                                <option [value]="b.id">{{ b.label }}</option>
                              }
                            </select>
                          </label>
                          <label class="field">Source
                            <select name="source" [(ngModel)]="edit.source">
                              @for (s of sources; track s.id) {
                                <option [value]="s.id">{{ s.label }}</option>
                              }
                            </select>
                          </label>
                          @if (edit.status === 'offer') {
                            <label class="field">Offer fixed (₹ LPA)
                              <input name="fixed" type="number" min="0" [(ngModel)]="edit.offerFixedLpa" />
                            </label>
                            <label class="field">Offer total (₹ LPA)
                              <input name="total" type="number" min="0" [(ngModel)]="edit.offerTotalLpa" />
                            </label>
                          }
                          <div class="row actions">
                            <button class="btn btn-sm btn-primary" type="submit">Save</button>
                            <button class="btn btn-sm" type="button" (click)="editingId.set(null)">Cancel</button>
                            <span class="spacer"></span>
                            <button class="btn btn-sm btn-ghost" type="button" (click)="remove(app)">Delete company</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
      </lp-card>
    </div>
  `,
  styles: [
    `
      .funnel {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .stage {
        display: flex;
        flex-direction: column;
        min-width: 90px;
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
      }
      .stage strong {
        font-size: 20px;
      }
      .arrow {
        color: var(--text-faint);
      }
      .foot {
        margin-top: 14px;
        flex-wrap: wrap;
      }
      .nudge {
        color: var(--text);
        border-left: 2px solid var(--accent);
        padding-left: 10px;
      }
      .add {
        display: grid;
        grid-template-columns: 1.2fr 1.4fr 1fr 1fr;
        gap: 8px;
      }
      .add > :nth-child(5) {
        grid-column: 1;
      }
      .add > :nth-child(6) {
        grid-column: 2 / 4;
      }
      .add > button {
        grid-column: 4;
      }
      @media (max-width: 700px) {
        .add {
          grid-template-columns: 1fr;
        }
        .add > :nth-child(5),
        .add > :nth-child(6),
        .add > button {
          grid-column: auto;
        }
      }
      .app-row {
        cursor: pointer;
      }
      .app-row:hover td {
        background: var(--bg-subtle);
      }
      .app-row.closed {
        opacity: 0.55;
      }
      .ok {
        color: var(--ok);
      }
      .warn {
        color: var(--warn);
      }
      .editor-row td {
        background: var(--bg);
      }
      .editor {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
      }
      .actions {
        grid-column: 1 / -1;
      }
      .spacer {
        flex: 1;
      }
    `,
  ],
})
export class JobsPage implements OnInit {
  private tracker = inject(TrackerService);

  readonly statuses = APPLICATION_STATUSES;
  readonly payBands = PAY_BANDS;
  readonly sources = SOURCES;
  readonly todayIso = today();

  readonly apps = signal<Application[]>([]);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);

  readonly funnel = computed(() => FUNNEL.map((s) => ({ ...s, count: this.count(s.id) })));

  /** Active first (soonest next step first), closed at the bottom. */
  readonly sorted = computed(() =>
    [...this.apps()].sort((a, b) => {
      const closed = Number(!this.isActive(a)) - Number(!this.isActive(b));
      if (closed) return closed;
      return (a.nextStepOn ?? '9999').localeCompare(b.nextStepOn ?? '9999');
    }),
  );

  /** One line telling you where the pipeline is stuck. */
  readonly nudge = computed(() => {
    const apps = this.apps();
    const active = apps.filter((a) => this.isActive(a));
    const stale = active.filter((a) => this.staleDays(a)).length;
    const noStep = active.filter((a) => !a.nextStep).length;
    const lowBand = active.filter((a) => a.payBand === 'no').length;

    if (!apps.length) return 'Start by adding 10–15 companies that can pay ₹40L+.';
    if (stale) return `${stale} compan${stale === 1 ? 'y has' : 'ies have'} gone quiet for ${STALE_AFTER_DAYS}+ days — follow up or drop.`;
    if (noStep) return `${noStep} active compan${noStep === 1 ? 'y has' : 'ies have'} no next step — add one so it shows up on Today.`;
    if (this.count('target') >= 3 && this.count('referral_asked') + this.count('applied') === 0)
      return `${this.count('target')} targets but no outreach yet — ask for referrals this week.`;
    if (lowBand) return `${lowBand} active compan${lowBand === 1 ? 'y is' : 'ies are'} below 40L — consider dropping to free up time.`;
    if (active.length < 5) return 'Fewer than 5 active companies — add more targets to keep the pipeline full.';
    return 'Pipeline is moving. Keep 2–3 referral asks going every week.';
  });

  draft = this.emptyDraft();
  edit: Partial<Application> = {};

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.tracker.applications().subscribe({
      next: (apps) => {
        this.error.set(null);
        this.apps.set(apps);
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  count(status: string): number {
    return this.apps().filter((a) => a.status === status).length;
  }

  isActive(app: Application): boolean {
    return ACTIVE_STATUSES.includes(app.status);
  }

  /** Days since last change, if an active company has been quiet too long; otherwise 0. */
  staleDays(app: Application): number {
    if (!this.isActive(app)) return 0;
    const days = daysBetween(app.lastActivityOn, this.todayIso);
    return days >= STALE_AFTER_DAYS ? days : 0;
  }

  statusText(app: Application): string {
    if (app.status === 'offer' && app.offerTotalLpa) {
      return `Offer · ₹${app.offerTotalLpa}L` + (app.offerFixedLpa ? ` (₹${app.offerFixedLpa}L fixed)` : '');
    }
    return statusLabel(app.status);
  }

  bandLabel(id: PayBand): string {
    return PAY_BANDS.find((b) => b.id === id)?.label ?? id;
  }

  sourceLabel(id: Source): string {
    return SOURCES.find((s) => s.id === id)?.label ?? id;
  }

  add(): void {
    if (!this.draft.company.trim()) return;
    const hasStep = this.draft.nextStep.trim() !== '';
    this.run(
      this.tracker.addApplication({
        ...this.draft,
        nextStep: this.draft.nextStep.trim(),
        nextStepOn: hasStep ? this.draft.nextStepOn || null : null,
      }),
    );
    this.draft = this.emptyDraft();
  }

  toggleEdit(app: Application): void {
    if (this.editingId() === app.id) {
      this.editingId.set(null);
      return;
    }
    this.edit = { ...app };
    this.editingId.set(app.id);
  }

  save(app: Application): void {
    const e = this.edit;
    this.run(
      this.tracker.updateApplication(app.id, {
        status: e.status,
        nextStep: e.nextStep ?? '',
        nextStepOn: e.nextStepOn || null,
        contact: e.contact ?? '',
        payBand: e.payBand,
        source: e.source,
        offerFixedLpa: e.offerFixedLpa ?? null,
        offerTotalLpa: e.offerTotalLpa ?? null,
      }),
    );
    this.editingId.set(null);
  }

  remove(app: Application): void {
    if (!confirm(`Delete ${app.company}?`)) return;
    this.editingId.set(null);
    this.run(this.tracker.deleteApplication(app.id));
  }

  private emptyDraft() {
    return {
      company: '',
      role: '',
      payBand: 'yes' as PayBand,
      source: 'referral' as Source,
      contact: '',
      nextStep: '',
      nextStepOn: addDays(today(), 1),
    };
  }

  private run(request: ReturnType<TrackerService['deleteApplication']>): void {
    request.subscribe({ next: () => this.load(), error: (e: Error) => this.error.set(e.message) });
  }
}
