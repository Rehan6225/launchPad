import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lp-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      @if (title) {
        <header class="card-head">
          <div>
            <h3>{{ title }}</h3>
            @if (subtitle) {
              <p class="small muted">{{ subtitle }}</p>
            }
          </div>
          <ng-content select="[card-actions]"></ng-content>
        </header>
      }
      <div class="card-body" [class.flush]="flush">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      .card {
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        display: flex;
        flex-direction: column;
      }
      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
      }
      h3 {
        font-size: 13px;
        letter-spacing: 0.02em;
      }
      .card-body {
        padding: 16px;
        flex: 1;
      }
      .card-body.flush {
        padding: 0;
      }
    `,
  ],
})
export class CardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  /** Removes body padding — useful for tables. */
  @Input() flush = false;
}
