import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lp-stat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat">
      <span class="label">{{ label }}</span>
      <span class="value"
        >{{ value }}@if (unit) {<span class="unit">{{ unit }}</span>}</span
      >
      @if (hint) {
        <span class="hint">{{ hint }}</span>
      }
    </div>
  `,
  styles: [
    `
      .stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 14px 16px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }
      .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-faint);
      }
      .value {
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .unit {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-muted);
        margin-left: 4px;
      }
      .hint {
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
})
export class StatComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number | null = '—';
  @Input() unit = '';
  @Input() hint: string | null = '';
}
