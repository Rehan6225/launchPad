import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lp-empty',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <p class="title">{{ title }}</p>
      @if (message) {
        <p class="small muted">{{ message }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        text-align: center;
        padding: 32px 16px;
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius);
        color: var(--text-muted);
      }
      .title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() message = '';
}
