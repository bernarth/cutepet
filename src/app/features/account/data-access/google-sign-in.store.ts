import { Service, computed, inject, signal } from '@angular/core';
import { ParamMap } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import {
  ACCOUNT_PATH,
  ADMIN_HOME_PATH,
  RETURN_PATH_PARAM,
  signInReturnPath,
} from '@core/auth/return-path';
import { SignInAttempt, SignInAttemptStorage } from '@core/auth/sign-in-attempt';
import {
  SIGN_IN_FAILURE_MESSAGES,
  SignInFailure,
  addressFailure,
  exchangeFailure,
} from '../models/sign-in-failure';
import { AccountOrderRepository } from './account-order.repository';

/** What the button of a failed sign-in does */
type Retry = 'transfer' | 'link' | 'sign_in' | 'open_account';

/**
 * @description Provided by GoogleSignInPage. Finishes the sign-in this tab started
 */
@Service({ autoProvided: false })
export class GoogleSignInStore {
  private readonly auth = inject(AuthStore);
  private readonly attempts = inject(SignInAttemptStorage);
  private readonly repository = inject(AccountOrderRepository);

  private attempt: SignInAttempt | null = null;
  private readonly working = signal(true);
  private readonly failure = signal<SignInFailure | null>(null);
  private readonly retryKind = signal<Retry>('sign_in');

  readonly isWorking = this.working.asReadonly();
  readonly isSignedIn = this.auth.isSignedIn;
  readonly email = computed(() => this.auth.user()?.email ?? '');
  readonly message = computed(() => {
    const failure = this.failure();
    if (!failure) {
      return null;
    }
    return this.isSignedIn() ? 'Ya ingresaste con Google.' : SIGN_IN_FAILURE_MESSAGES[failure];
  });
  /** Null when there is nothing to start again, only the account to open */
  readonly retryLabel = computed(() => {
    switch (this.retryKind()) {
      case 'open_account':
        return null;
      case 'transfer':
        return 'Ingresar y guardar mis pedidos';
      default:
        return 'Volver a intentarlo';
    }
  });

  /**
   * @param query What Google sign-in came back with
   * @returns True when the person is signed in and the next page can open
   */
  async finish(query: ParamMap): Promise<boolean> {
    await this.auth.ready;
    this.attempt = this.attempts.read();
    const failure = await this.exchange(query);

    if (failure === null) {
      return true;
    }
    if (failure === 'account_exists' && this.attempt?.kind === 'linking' && this.hasGuest()) {
      await this.run(() => this.transfer(false), 'account_exists');
      return false;
    }

    this.fail(failure, signInReturnPath(query.get(RETURN_PATH_PARAM)));
    return false;
  }

  retry(returnPath: string): Promise<void> {
    switch (this.retryKind()) {
      case 'transfer':
        return this.run(() => this.transfer(true), 'account_exists');
      case 'link':
        return this.run(() => this.auth.linkGoogle(returnPath), 'failed');
      default:
        return this.run(() => this.auth.signInWithGoogle(returnPath), 'failed');
    }
  }

  /**
   * @description The browser brought this page back from its cache, so the person left Google without signing in
   */
  resume(returnPath: string): void {
    this.attempt = this.attempts.read();
    this.fail('cancelled', returnPath);
  }

  private async exchange(query: ParamMap): Promise<SignInFailure | null> {
    const code = query.get('code');
    if (!code) {
      return addressFailure(query.get('error'), query.get('error_code'));
    }

    try {
      await this.auth.completeSignIn(code);
    } catch (error) {
      return exchangeFailure(error);
    }

    if (this.attempt?.kind !== 'transferring') {
      this.attempts.clear();
    }
    return null;
  }

  /**
   * @description The account page moves the orders once the person is signed in
   */
  private async transfer(showPicker: boolean): Promise<void> {
    const guest = this.auth.user();
    const [transferToken, orders] = await Promise.all([
      this.repository.startGuestTransfer(),
      guest ? this.repository.listOrders(guest.id) : [],
    ]);

    await this.auth.signInToTransfer(
      ACCOUNT_PATH,
      { kind: 'transferring', transferToken, orderCodes: orders.map((order) => order.code) },
      showPicker,
    );
  }

  private fail(failure: SignInFailure, returnPath: string): void {
    const wasTransferring = this.attempt?.kind === 'transferring' && this.hasGuest();
    const shown = wasTransferring ? 'account_exists' : failure;

    this.attempts.clear();
    this.retryKind.set(this.retryFor(shown, returnPath));
    this.failure.set(shown);
    this.working.set(false);
  }

  /**
   * @description A guest never goes through a plain sign-in by retrying here, because it would leave their orders behind
   */
  private retryFor(failure: SignInFailure, returnPath: string): Retry {
    if (!this.hasGuest()) {
      return 'sign_in';
    }
    if (failure === 'account_exists') {
      return 'transfer';
    }
    if (this.attempt?.kind === 'linking') {
      return 'link';
    }
    return returnPath.startsWith(ADMIN_HOME_PATH) ? 'sign_in' : 'open_account';
  }

  private hasGuest(): boolean {
    return this.auth.user() !== null && this.auth.isGuest();
  }

  /** On success the browser is already leaving for Google */
  private async run(action: () => Promise<void>, failure: SignInFailure): Promise<void> {
    this.working.set(true);
    try {
      await action();
    } catch {
      this.fail(failure, ACCOUNT_PATH);
    }
  }
}
