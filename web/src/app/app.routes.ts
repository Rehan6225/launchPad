import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Launchpad',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'weekly-plan',
    title: 'Weekly Plan · Launchpad',
    loadComponent: () =>
      import('./features/weekly-plan/weekly-plan.page').then((m) => m.WeeklyPlanPage),
  },
  {
    path: 'daily-log',
    title: 'Daily Log · Launchpad',
    loadComponent: () => import('./features/daily-log/daily-log.page').then((m) => m.DailyLogPage),
  },
  {
    path: 'applications',
    title: 'Applications · Launchpad',
    loadComponent: () =>
      import('./features/applications/applications.page').then((m) => m.ApplicationsPage),
  },
  {
    path: 'review',
    title: 'Review & Insights · Launchpad',
    loadComponent: () => import('./features/review/review.page').then((m) => m.ReviewPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];
