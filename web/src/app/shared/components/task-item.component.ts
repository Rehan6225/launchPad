import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Task, pillarLabel } from '../../core/models';

/** One task: checkbox, title, pillar tag, delete. Extra actions go in the content slot. */
@Component({
  selector: 'lp-task-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="task">
      <label class="row title">
        <input type="checkbox" [checked]="task.done" (change)="toggle.emit(task)" />
        <span [class.done]="task.done">{{ task.title }}</span>
      </label>
      <span class="tag">{{ label }}</span>
      <ng-content></ng-content>
      <button class="btn btn-sm btn-ghost" type="button" title="Delete" (click)="remove.emit(task)">✕</button>
    </div>
  `,
  styles: [
    `
      .task {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
      }
      .task:last-child {
        border-bottom: none;
      }
      .title {
        flex: 1;
        min-width: 0;
        cursor: pointer;
      }
      input[type='checkbox'] {
        width: 16px;
        height: 16px;
        flex: none;
        accent-color: var(--ok);
      }
      .done {
        text-decoration: line-through;
        color: var(--text-faint);
      }
      .tag {
        font-size: 11px;
        color: var(--text-muted);
        background: var(--bg-subtle);
        border: 1px solid var(--border-strong);
        border-radius: 99px;
        padding: 1px 8px;
        white-space: nowrap;
      }
    `,
  ],
})
export class TaskItemComponent {
  @Input({ required: true }) task!: Task;
  @Output() toggle = new EventEmitter<Task>();
  @Output() remove = new EventEmitter<Task>();

  get label(): string {
    return pillarLabel(this.task.pillar);
  }
}
