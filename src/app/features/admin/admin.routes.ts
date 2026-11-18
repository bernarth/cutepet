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
      {
        path: 'venta-rapida',
        title: 'Venta rápida - Panel CutePet',
        loadComponent: () =>
          import('./pages/admin-quick-sale-page').then((m) => m.AdminQuickSalePage),
      },
      {
        path: 'prendas',
        title: 'Prendas - Panel CutePet',
        loadComponent: () => import('./pages/admin-products-page').then((m) => m.AdminProductsPage),
      },
      {
        path: 'prendas/nueva',
        title: 'Nueva prenda - Panel CutePet',
        loadComponent: () =>
          import('./pages/admin-product-new-page').then((m) => m.AdminProductNewPage),
      },
      {
        path: 'prendas/:id',
        title: 'Prenda - Panel CutePet',
        loadComponent: () => import('./pages/admin-product-page').then((m) => m.AdminProductPage),
      },
    ],
  },
];
