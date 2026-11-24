import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RETURN_PATH_PARAM, adminReturnPath } from '@core/auth/return-path';
import { AuthStore } from '@core/auth/auth.store';
import { LoadingBar } from '@shared/ui/loading-bar';

/**
 * @description Google sign-in for the panel. Also tells a signed-in user without the admin role that the account has no access
 */
@Component({
  selector: 'cp-admin-sign-in-page',
  imports: [MatButtonModule, MatIconModule, RouterLink, LoadingBar],
  template: `
    <main class="card">
      <h1>Panel CutePet</h1>
      <cp-loading-bar [active]="!isReady() || isBusy()" />

      @if (isReady()) {
        @if (auth.isAdmin()) {
          <p>Ya ingresaste al panel.</p>
          <a mat-flat-button [routerLink]="returnPath">Ir al panel</a>
        } @else if (auth.isSignedIn()) {
          <p>Tu cuenta no tiene acceso al panel.</p>
          <p class="email">{{ auth.user()?.email }}</p>
          <button
            mat-stroked-button
            type="button"
            [disabled]="isBusy()"
            (click)="useAnotherAccount()"
          >
            Usar otra cuenta
          </button>
        } @else {
          <p>Ingresa con la cuenta de Google de la tienda.</p>
          <button mat-flat-button type="button" [disabled]="isBusy()" (click)="signIn()">
            <mat-icon>login</mat-icon>
            Ingresar con Google
          </button>
        }
      }

      @if (errorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <a mat-button routerLink="/">Volver a la tienda</a>
    </main>
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: var(--cp-space-md);
      box-sizing: border-box;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--cp-space-sm);
      width: 100%;
      max-width: 400px;
      padding: var(--cp-space-lg) var(--cp-space-md);
      box-sizing: border-box;
      text-align: center;
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    h1 {
      font-family: var(--cp-font-display);
      margin: 0;
    }
    p {
      margin: 0;
    }
    .email {
      overflow-wrap: anywhere;
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class AdminSignInPage {
  protected readonly auth = inject(AuthStore);
  protected readonly isReady = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly returnPath = adminReturnPath(
    inject(ActivatedRoute).snapshot.queryParamMap.get(RETURN_PATH_PARAM),
  );

  constructor() {
    void this.auth.ready.then(() => this.isReady.set(true));
  }

  protected async signIn(): Promise<void> {
    await this.run(
      () => this.auth.signInWithGoogle(this.returnPath),
      'No se pudo abrir el ingreso con Google',
    );
  }

  protected async useAnotherAccount(): Promise<void> {
    await this.run(async () => {
      await this.auth.signOut();
      await this.auth.signInWithGoogle(this.returnPath);
    }, 'No se pudo cambiar de cuenta');
  }

  private async run(action: () => Promise<void>, failureMessage: string): Promise<void> {
    this.isBusy.set(true);
    this.errorMessage.set(null);

    try {
      await action();
    } catch {
      this.errorMessage.set(`${failureMessage}. Inténtalo de nuevo.`);
    } finally {
      this.isBusy.set(false);
    }
  }
}
