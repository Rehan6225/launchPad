import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Simple, static progress bar. Shows nothing invented — 0 stays 0. */
@Component({
  selector: 'lp-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="track" [attr.aria-valuenow]="clamped" role="progressbar">
      <div class="fill" [style.width.%]="clamped"></div>
    </div>
  `,
  styles: [
    `
      .track {
        height: 6px;
        width: 100%;
        background: var(--bg-subtle);
        border-radius: 99px;
        overflow: hidden;
      }
      .fill {
        height: 100%;
        background: var(--accent);
        border-radius: 99px;
      }
    `,
  ],
})
export class ProgressBarComponent {
  /** 0..100 */
  @Input() percent = 0;

  get clamped(): number {
    return Math.max(0, Math.min(100, Math.round(this.percent)));
  }
}
