import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'today' },
  {
    path: 'today',
    title: 'Today · Launchpad',
    loadComponent: () => import('./features/today/today.page').then((m) => m.TodayPage),
  },
  {
    path: 'week',
    title: 'Week · Launchpad',
    loadComponent: () => import('./features/week/week.page').then((m) => m.WeekPage),
  },
  {
    path: 'jobs',
    title: 'Jobs · Launchpad',
    loadComponent: () => import('./features/jobs/jobs.page').then((m) => m.JobsPage),
  },
  { path: '**', redirectTo: 'today' },
];
