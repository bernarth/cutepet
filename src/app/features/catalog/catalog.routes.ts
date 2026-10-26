import { Routes } from '@angular/router';

export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    title: 'Catálogo - CutePet',
    loadComponent: () => import('./pages/catalog-page').then((m) => m.CatalogPage),
  },
  {
    path: ':slug',
    loadComponent: () => import('./pages/product-page').then((m) => m.ProductPage),
  },
];
