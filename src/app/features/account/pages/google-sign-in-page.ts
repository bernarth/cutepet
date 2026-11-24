import { Component, afterNextRender, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ACCOUNT_PATH,
  RETURN_PATH_PARAM,
  SIGN_IN_CALLBACK_PATH,
  signInReturnPath,
} from '@core/auth/return-path';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import { GoogleSignInStore } from '../data-access/google-sign-in.store';

/**
 * @description Where Google sign-in comes back, for customers and admins. The code leaves the address before it is used
 */
@Component({
  selector: 'cp-google-sign-in-page',
  imports: [RouterLink, MatButtonModule, PageHeader, LoadingBar, EmptyState],
  providers: [GoogleSignInStore],
  template: `
    <cp-page-header title="Ingresar con Google" />
    <cp-loading-bar [active]="store.isWorking()" label="Ingresando" />

    <div aria-live="polite">
      @if (store.message(); as text) {
        <cp-empty-state icon="info" [message]="text">
          @if (store.isSignedIn()) {
            <p class="email">{{ store.email() }}</p>
            <a mat-flat-button [routerLink]="returnPath" [replaceUrl]="true">Continuar</a>
          } @else if (store.retryLabel(); as label) {
            <button
              mat-flat-button
              type="button"
              [disabled]="store.isWorking()"
              (click)="store.retry(returnPath)"
            >
              {{ label }}
            </button>
            <a mat-button routerLink="/">Volver a la tienda</a>
          } @else {
            <a mat-flat-button [routerLink]="accountPath">Ir a Mi cuenta</a>
          }
        </cp-empty-state>
      }
    </div>
  `,
  styles: `
    .email {
      margin: 0;
      overflow-wrap: anywhere;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  host: { '(window:pageshow)': 'onPageShow($event)' },
})
export class GoogleSignInPage {
  protected readonly store = inject(GoogleSignInStore);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly accountPath = ACCOUNT_PATH;
  protected readonly returnPath = signInReturnPath(this.query.get(RETURN_PATH_PARAM));

  constructor() {
    afterNextRender(() => void this.finish());
  }

  protected onPageShow(event: PageTransitionEvent): void {
    if (event.persisted) {
      this.store.resume(this.returnPath);
    }
  }

  private async finish(): Promise<void> {
    await this.cleanAddress();

    if (await this.store.finish(this.query)) {
      await this.router.navigateByUrl(this.returnPath, { replaceUrl: true });
    }
  }

  /**
   * @description Goes through the router so it also forgets the code, and cannot write it back later
   */
  private async cleanAddress(): Promise<void> {
    await this.router.navigate([SIGN_IN_CALLBACK_PATH], {
      queryParams: { [RETURN_PATH_PARAM]: this.returnPath },
      replaceUrl: true,
    });
  }
}
