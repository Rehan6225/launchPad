import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lp-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        @if (subtitle) {
          <p class="muted small">{{ subtitle }}</p>
        }
      </div>
      <div class="row">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      }
      h1 {
        font-size: 20px;
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
