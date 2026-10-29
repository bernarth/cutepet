export interface NavLink {
  readonly label: string;
  readonly path: string;
}

/**
 * @description Single source of truth for the public navigation (header and footer).
 */
export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Catálogo', path: '/catalogo' },
  { label: 'Personalizado', path: '/personalizado' },
  { label: 'Guía de tallas', path: '/guia-de-tallas' },
];
