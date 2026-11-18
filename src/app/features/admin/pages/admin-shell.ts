import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { AuthStore } from '@core/auth/auth.store';
import { ADMIN_NAV_LINKS } from '../admin-nav-links';

const WIDE_SCREEN = '(min-width: 1024px)';

/**
 * @description Admin layout. On phones the menu opens over the page; from 1024px it stays open beside it
 */
@Component({
  selector: 'cp-admin-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly links = ADMIN_NAV_LINKS;
  protected readonly isWide = toSignal(
    inject(BreakpointObserver)
      .observe(WIDE_SCREEN)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected closeOnPhone(menu: MatSidenav): void {
    if (!this.isWide()) {
      void menu.close();
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/admin/ingresar');
  }
}
