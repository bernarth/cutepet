import { Component, computed, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CartStore } from '@core/cart/cart.store';
import { NAV_LINKS } from './nav-links';

/**
 * @description Public layout: header, page content and footer. On mobile the links live in a side menu
 */
@Component({
  selector: 'cp-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatListModule,
    MatSidenavModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly links = NAV_LINKS;
  protected readonly cart = inject(CartStore);

  protected readonly cartLabel = computed(() => {
    const units = this.cart.unitCount();

    return units === 0
      ? 'Ver carrito'
      : `Ver carrito (${units} ${units === 1 ? 'prenda' : 'prendas'})`;
  });
}
