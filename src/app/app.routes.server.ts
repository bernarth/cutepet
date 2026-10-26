import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * - Server: public pages that must show a real preview when shared on WhatsApp/Facebook
 *   and be indexable by Google (catalog and product pages change with stock)
 * - Prerender: static content
 * - Client: private or session-dependent pages (cart, checkout, account, admin)
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'catalogo', renderMode: RenderMode.Server },
  { path: 'catalogo/:slug', renderMode: RenderMode.Server },
  { path: 'vendidos', renderMode: RenderMode.Server },
  { path: 'guia-de-tallas', renderMode: RenderMode.Prerender },
  { path: 'personalizado', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
