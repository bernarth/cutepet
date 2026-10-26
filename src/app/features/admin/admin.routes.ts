import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    title: 'Panel - CutePet',
    loadComponent: () => import('./pages/admin-dashboard-page').then((m) => m.AdminDashboardPage),
  },
];
