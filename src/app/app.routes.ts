import { Routes } from '@angular/router';

import { adminGuard } from '@core/auth/admin.guard';
import { Shell } from '@core/layout/shell';

/** Every feature is lazy-loaded. Paths are in Spanish */
export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: '',
        title: 'CutePet - Ropa para mascotas',
        loadComponent: () => import('@features/home/pages/home-page').then((m) => m.HomePage),
      },
      {
        path: 'catalogo',
        loadChildren: () =>
          import('@features/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
      },
      {
        path: 'carrito',
        title: 'Carrito - CutePet',
        loadComponent: () => import('@features/cart/pages/cart-page').then((m) => m.CartPage),
      },
      {
        path: 'pagar',
        title: 'Pagar - CutePet',
        loadComponent: () =>
          import('@features/checkout/pages/checkout-page').then((m) => m.CheckoutPage),
      },
      {
        path: 'guia-de-tallas',
        title: 'Guía de tallas - CutePet',
        loadComponent: () =>
          import('@features/catalog/pages/size-guide-page').then((m) => m.SizeGuidePage),
      },
      {
        path: 'personalizado',
        title: 'Pedido personalizado - CutePet',
        loadComponent: () =>
          import('@features/custom-request/pages/custom-request-page').then(
            (m) => m.CustomRequestPage,
          ),
      },
      {
        path: 'vendidos',
        title: 'Ya vendidos - CutePet',
        loadComponent: () =>
          import('@features/catalog/pages/sold-gallery-page').then((m) => m.SoldGalleryPage),
      },
      {
        path: 'mi-cuenta',
        title: 'Mi cuenta - CutePet',
        loadComponent: () =>
          import('@features/account/pages/account-page').then((m) => m.AccountPage),
      },
    ],
  },
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadChildren: () => import('@features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
