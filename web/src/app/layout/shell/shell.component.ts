import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'lp-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="sidebar">
        <div class="brand">
          <span class="mark">L</span>
          <div>
            <strong>Launchpad</strong>
            <p class="small faint">₹20 LPA → ₹40 LPA</p>
          </div>
        </div>

        <nav>
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              (click)="navOpen.set(false)"
              class="nav-item"
            >
              <span class="icon" aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>

        <footer class="small faint">
          {{ mode }}
        </footer>
      </aside>

      <div class="main">
        <div class="topbar">
          <button class="btn btn-sm btn-ghost" type="button" (click)="navOpen.set(!navOpen())">
            ☰ Menu
          </button>
          <span class="small muted">Target date · 31 Dec 2026</span>
        </div>
        <main>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell {
        display: grid;
        grid-template-columns: 232px 1fr;
        min-height: 100vh;
      }
      .sidebar {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 20px 14px;
        background: var(--bg-elevated);
        border-right: 1px solid var(--border);
        position: sticky;
        top: 0;
        height: 100vh;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 6px;
      }
      .mark {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: var(--accent);
        color: #0a0d12;
        font-weight: 700;
      }
      .brand strong {
        font-size: 14px;
      }
      nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        color: var(--text-muted);
        font-size: 13px;
      }
      .nav-item:hover {
        background: var(--bg-subtle);
        color: var(--text);
      }
      .nav-item.active {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .icon {
        width: 18px;
        text-align: center;
        font-size: 13px;
      }
      .main {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .topbar {
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border);
      }
      main {
        padding: 28px;
        max-width: 1180px;
        width: 100%;
      }
      @media (max-width: 900px) {
        .shell {
          grid-template-columns: 1fr;
        }
        .sidebar {
          display: none;
        }
        .shell.nav-open .sidebar {
          display: flex;
          position: fixed;
          z-index: 20;
          width: 232px;
        }
        .topbar {
          display: flex;
        }
        main {
          padding: 18px 16px 48px;
        }
      }
    `,
  ],
})
export class ShellComponent {
  readonly navOpen = signal(false);
  readonly mode = environment.useMock ? 'Mock data (local)' : 'Connected to API';

  readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '◎' },
    { path: '/weekly-plan', label: 'Weekly Plan', icon: '▤' },
    { path: '/daily-log', label: 'Daily Log', icon: '✎' },
    { path: '/applications', label: 'Applications', icon: '✉' },
    { path: '/review', label: 'Review & Insights', icon: '◳' },
  ];
}
