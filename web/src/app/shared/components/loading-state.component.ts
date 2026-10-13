import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lp-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading">
      @for (row of rows(); track $index) {
        <div class="bar"></div>
      }
      <span class="small faint">{{ label }}</span>
    </div>
  `,
  styles: [
    `
      .loading {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 8px 0;
      }
      .bar {
        height: 14px;
        border-radius: var(--radius-sm);
        background: linear-gradient(90deg, var(--bg-subtle), var(--border), var(--bg-subtle));
        background-size: 200% 100%;
        animation: shimmer 1.2s linear infinite;
      }
      .bar:nth-child(even) {
        width: 70%;
      }
      @keyframes shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class LoadingStateComponent {
  @Input() lines = 3;
  @Input() label = 'Loading…';

  rows(): number[] {
    return Array.from({ length: this.lines });
  }
}
