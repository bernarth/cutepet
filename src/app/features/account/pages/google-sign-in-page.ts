import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { RETURN_PATH_PARAM, SIGN_IN_CALLBACK_PATH, signInReturnPath } from '@core/auth/return-path';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import {
  SIGN_IN_FAILURE_MESSAGES,
  SignInFailure,
  addressFailure,
  exchangeFailure,
} from '../models/sign-in-failure';

/**
 * @description Where Google sign-in comes back, for customers and admins. The code leaves the address before it is used
 */
@Component({
  selector: 'cp-google-sign-in-page',
  imports: [RouterLink, MatButtonModule, PageHeader, LoadingBar, EmptyState],
  template: `
    <cp-page-header title="Ingresar con Google" />
    <cp-loading-bar [active]="isWorking()" label="Ingresando" />

    <div aria-live="polite">
      @if (message(); as text) {
        <cp-empty-state icon="info" [message]="text">
          @if (auth.isSignedIn()) {
            <p class="email">{{ auth.user()?.email }}</p>
            <a mat-flat-button [routerLink]="returnPath" [replaceUrl]="true">Continuar</a>
          } @else {
            <button mat-flat-button type="button" [disabled]="isWorking()" (click)="signInAgain()">
              Volver a intentarlo
            </button>
            <a mat-button routerLink="/">Volver a la tienda</a>
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
})
export class GoogleSignInPage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly returnPath = signInReturnPath(this.query.get(RETURN_PATH_PARAM));
  protected readonly isWorking = signal(true);
  private readonly failure = signal<SignInFailure | null>(null);
  protected readonly message = computed(() => {
    const failure = this.failure();
    if (!failure) {
      return null;
    }
    return this.auth.isSignedIn() ? 'Ya ingresaste con Google.' : SIGN_IN_FAILURE_MESSAGES[failure];
  });

  constructor() {
    afterNextRender(() => void this.finish());
  }

  protected async signInAgain(): Promise<void> {
    this.isWorking.set(true);
    try {
      await this.auth.signInWithGoogle(this.returnPath);
    } catch {
      this.failure.set('failed');
    } finally {
      this.isWorking.set(false);
    }
  }

  private async finish(): Promise<void> {
    await this.cleanAddress();
    await this.auth.ready;
    const failure = await this.exchange();

    if (failure === null) {
      await this.router.navigateByUrl(this.returnPath, { replaceUrl: true });
      return;
    }
    this.failure.set(failure);
    this.isWorking.set(false);
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

  private async exchange(): Promise<SignInFailure | null> {
    const code = this.query.get('code');
    if (!code) {
      return addressFailure(this.query.get('error'), this.query.get('error_code'));
    }

    try {
      await this.auth.completeSignIn(code);
      return null;
    } catch (error) {
      return exchangeFailure(error);
    }
  }
}
