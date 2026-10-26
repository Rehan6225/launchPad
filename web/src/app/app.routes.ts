import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Launchpad',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
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
    ],
  },
  { path: '**', redirectTo: 'today' },
];
