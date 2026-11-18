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
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      {
        path: 'pedidos',
        title: 'Pedidos - Panel CutePet',
        loadComponent: () => import('./pages/admin-orders-page').then((m) => m.AdminOrdersPage),
      },
      {
        path: 'pedidos/:code',
        title: 'Pedido - Panel CutePet',
        loadComponent: () => import('./pages/admin-order-page').then((m) => m.AdminOrderPage),
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
      {
        path: 'configuracion',
        title: 'Configuración - Panel CutePet',
        loadComponent: () => import('./pages/admin-settings-page').then((m) => m.AdminSettingsPage),
      },
      {
        path: 'categorias-y-tallas',
        title: 'Categorías y tallas - Panel CutePet',
        loadComponent: () =>
          import('./pages/admin-catalog-lists-page').then((m) => m.AdminCatalogListsPage),
      },
      {
        path: 'historial',
        title: 'Historial - Panel CutePet',
        loadComponent: () => import('./pages/admin-audit-page').then((m) => m.AdminAuditPage),
      },
    ],
  },
];
