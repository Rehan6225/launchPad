import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type BadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';

const TONE_MAP: Record<string, BadgeTone> = {
  // task status
  planned: 'neutral',
  in_progress: 'accent',
  done: 'ok',
  skipped: 'warn',
  // log outcome
  partial: 'warn',
  // application status
  wishlist: 'neutral',
  applied: 'accent',
  in_process: 'accent',
  offer: 'ok',
  rejected: 'danger',
  on_hold: 'warn',
  // round status
  scheduled: 'accent',
  cleared: 'ok',
  failed: 'danger',
  cancelled: 'neutral',
  // priority
  P0: 'danger',
  P1: 'warn',
  P2: 'neutral',
};

@Component({
  selector: 'lp-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'tone-' + resolvedTone">{{ label }}</span>`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        border: 1px solid transparent;
      }
      .tone-neutral {
        background: var(--bg-subtle);
        color: var(--text-muted);
        border-color: var(--border-strong);
      }
      .tone-accent {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .tone-ok {
        background: var(--ok-soft);
        color: var(--ok);
      }
      .tone-warn {
        background: var(--warn-soft);
        color: var(--warn);
      }
      .tone-danger {
        background: var(--danger-soft);
        color: var(--danger);
      }
    `,
  ],
})
export class BadgeComponent {
  @Input({ required: true }) value = '';
  @Input() tone: BadgeTone | null = null;

  get resolvedTone(): BadgeTone {
    return this.tone ?? TONE_MAP[this.value] ?? 'neutral';
  }

  get label(): string {
    return this.value.replace(/_/g, ' ');
  }
}
