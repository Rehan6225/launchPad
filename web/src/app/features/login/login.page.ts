import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'lp-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <form class="panel" (ngSubmit)="submit()">
        <div class="brand">
          <span class="mark">L</span>
          <strong>Launchpad</strong>
        </div>

        <label class="field">
          Username
          <input name="username" autocomplete="username" required [(ngModel)]="username" />
        </label>
        <label class="field">
          Password
          <input
            name="password"
            type="password"
            autocomplete="current-password"
            required
            [(ngModel)]="password"
          />
        </label>

        @if (error()) {
          <p class="error small">{{ error() }}</p>
        }

        <button class="btn btn-primary" type="submit" [disabled]="busy() || !username || !password">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
      }
      .panel {
        width: 100%;
        max-width: 340px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 24px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
      }
      .mark {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: var(--accent);
        color: #0a0d12;
        font-weight: 700;
      }
      .error {
        color: var(--danger);
      }
    `,
  ],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => this.router.navigateByUrl('/today'),
      error: (err: Error) => {
        this.error.set(err.message);
        this.busy.set(false);
      },
    });
  }
}
