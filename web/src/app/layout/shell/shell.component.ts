import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ProgressBarComponent } from '../../shared';
import { Mission } from '../../core/models';
import { TrackerService } from '../../core/services/tracker.service';
import { daysBetween, today } from '../../core/dates';

@Component({
  selector: 'lp-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ProgressBarComponent],
  template: `
    <header class="top">
      <div class="inner">
        <div class="brand">
          <span class="mark">L</span>
          <strong>Launchpad</strong>
        </div>
        <nav>
          <a routerLink="/today" routerLinkActive="active">Today</a>
          <a routerLink="/week" routerLinkActive="active">Week</a>
          <a routerLink="/jobs" routerLinkActive="active">Jobs</a>
        </nav>
      </div>
    </header>

    @if (mission(); as m) {
      <section class="mission">
        <div class="inner">
          <div class="row-between">
            <span>
              <strong>₹{{ m.currentCtcLpa }}L → ₹{{ m.targetCtcLpa }}L</strong>
              <span class="muted"> · Full-Stack Engineer</span>
            </span>
            <span class="small muted">
              <strong class="days">{{ daysLeft() }}</strong> days left ·
              Best offer: {{ m.bestOfferLpa ? '₹' + m.bestOfferLpa + 'L' : 'none yet' }}
            </span>
          </div>
          <lp-progress [percent]="ctcPercent()" />
        </div>
      </section>
    }

    <main class="inner">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .inner {
        max-width: 880px;
        margin: 0 auto;
        padding: 0 16px;
      }
      .top {
        border-bottom: 1px solid var(--border);
        background: var(--bg-elevated);
      }
      .top .inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 56px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
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
      nav {
        display: flex;
        gap: 4px;
      }
      nav a {
        padding: 6px 12px;
        border-radius: var(--radius-sm);
        color: var(--text-muted);
      }
      nav a:hover {
        color: var(--text);
        background: var(--bg-subtle);
      }
      nav a.active {
        color: var(--accent);
        background: var(--accent-soft);
      }
      .mission {
        border-bottom: 1px solid var(--border);
        padding: 14px 0;
      }
      .mission .inner {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .mission .row-between {
        flex-wrap: wrap;
      }
      .days {
        color: var(--text);
      }
      main.inner {
        padding-top: 24px;
        padding-bottom: 48px;
      }
    `,
  ],
})
export class ShellComponent implements OnInit {
  private tracker = inject(TrackerService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly mission = signal<Mission | null>(null);
  readonly daysLeft = computed(() => {
    const m = this.mission();
    return m ? Math.max(0, daysBetween(today(), m.targetDate)) : 0;
  });
  /** Moves only when a real offer is recorded on the Jobs page. */
  readonly ctcPercent = computed(() => {
    const m = this.mission();
    if (!m?.bestOfferLpa) return 0;
    return ((m.bestOfferLpa - m.currentCtcLpa) / (m.targetCtcLpa - m.currentCtcLpa)) * 100;
  });

  ngOnInit(): void {
    this.loadMission();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMission());
  }

  private loadMission(): void {
    this.tracker.mission().subscribe({ next: (m) => this.mission.set(m), error: () => void 0 });
  }
}
