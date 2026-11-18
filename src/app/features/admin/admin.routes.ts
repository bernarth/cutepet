import { Routes } from '@angular/router';

import { adminGuard } from '@core/auth/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'ingresar',
    title: 'Ingresar al panel - CutePet',
    loadComponent: () => import('./pages/admin-sign-in-page').then((m) => m.AdminSignInPage),
  },
  {
    path: '',
    canMatch: [adminGuard],
    loadComponent: () => import('./pages/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        title: 'Panel - CutePet',
        loadComponent: () =>
          import('./pages/admin-dashboard-page').then((m) => m.AdminDashboardPage),
      },
    ],
  },
];
