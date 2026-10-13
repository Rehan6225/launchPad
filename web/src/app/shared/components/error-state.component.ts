import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'lp-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error">
      <div>
        <p class="title">{{ title }}</p>
        <p class="small">{{ message }}</p>
      </div>
      <button type="button" class="btn btn-sm" (click)="retry.emit()">Retry</button>
    </div>
  `,
  styles: [
    `
      .error {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 16px;
        border: 1px solid var(--danger);
        background: var(--danger-soft);
        border-radius: var(--radius);
        color: var(--text);
      }
      .title {
        font-size: 13px;
        font-weight: 600;
      }
      .small {
        color: var(--text-muted);
      }
    `,
  ],
})
export class ErrorStateComponent {
  @Input() title = 'Could not load data';
  @Input({ required: true }) message = '';
  @Output() retry = new EventEmitter<void>();
}
