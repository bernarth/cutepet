import { NavLink } from '@core/layout/nav-links';

export interface AdminNavLink extends NavLink {
  readonly icon: string;
}

/**
 * @description Sections of the admin panel. Each slice of step 5 adds its own link
 */
export const ADMIN_NAV_LINKS: readonly AdminNavLink[] = [
  { label: 'Inicio', path: '/admin', icon: 'dashboard' },
  { label: 'Prendas', path: '/admin/prendas', icon: 'checkroom' },
];
