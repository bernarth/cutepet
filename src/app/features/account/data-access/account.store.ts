import { Service, afterNextRender, computed, inject, resource, signal } from '@angular/core';

import { AuthStore } from '@core/auth/auth.store';
import { ACCOUNT_PATH } from '@core/auth/return-path';
import { SignInAttemptStorage } from '@core/auth/sign-in-attempt';
import { SettingsRepository } from '@core/settings/settings.repository';
import { whatsappLink } from '@shared/whatsapp/whatsapp-link';
import { OTHER_DEVICE_MESSAGE, lostOrdersMessage } from '../models/account-whatsapp';
import { AccountOrderRepository } from './account-order.repository';
import { GuestTransferStore } from './guest-transfer.store';

/**
 * - visitor: no session in this browser
 * - guest: bought here without an account
 * - account: signed in with Google
 */
export type AccountView = 'loading' | 'visitor' | 'guest' | 'account';

/**
 * @description Provided by AccountPage next to GuestTransferStore
 */
@Service({ autoProvided: false })
export class AccountStore {
  private readonly auth = inject(AuthStore);
  private readonly attempts = inject(SignInAttemptStorage);
  private readonly repository = inject(AccountOrderRepository);
  private readonly transfer = inject(GuestTransferStore);
  private readonly settingsRepository = inject(SettingsRepository);

  private readonly isReady = signal(false);
  /** After the transfer, because reloading a list that is still loading does nothing */
  private readonly canLoadOrders = signal(false);
  private readonly busy = signal(false);
  private readonly unfinished = signal(false);

  private readonly ordersResource = resource({
    params: () => (this.canLoadOrders() ? this.auth.user()?.id : undefined),
    loader: ({ params: customerId }) => this.repository.listOrders(customerId),
  });
  private readonly settingsResource = resource({
    loader: () => this.settingsRepository.getStoreSettings(),
  });

  readonly view = computed<AccountView>(() => {
    if (!this.isReady()) {
      return 'loading';
    }
    if (!this.auth.user()) {
      return 'visitor';
    }
    return this.auth.isGuest() ? 'guest' : 'account';
  });
  readonly email = computed(() => this.auth.user()?.email ?? '');
  readonly orders = computed(() =>
    this.ordersResource.hasValue() ? this.ordersResource.value() : [],
  );
  readonly hasSession = computed(() => this.view() === 'guest' || this.view() === 'account');
  readonly canKeepOrders = computed(
    () => this.view() === 'guest' && this.ordersResource.hasValue(),
  );
  readonly isLoading = computed(
    () => !this.canLoadOrders() || this.ordersResource.isLoading() || this.busy(),
  );
  readonly hasOrdersError = computed(() => this.ordersResource.status() === 'error');
  readonly isBusy = this.busy.asReadonly();
  readonly showSignInHelp = computed(() => this.unfinished() && !this.auth.isSignedIn());

  readonly otherDeviceUrl = computed(() => this.whatsappUrl(OTHER_DEVICE_MESSAGE));
  readonly lostOrdersUrl = computed(() =>
    this.whatsappUrl(lostOrdersMessage(this.transfer.lostOrderCodes())),
  );

  constructor() {
    afterNextRender(() => void this.start());
  }

  /** Also called when the browser brings the page back from its cache after Google */
  checkUnfinishedSignIn(): void {
    this.unfinished.set(this.attempts.read() !== null);
  }

  reloadOrders(): void {
    this.ordersResource.reload();
  }

  signIn(): Promise<boolean> {
    return this.run(() =>
      this.view() === 'guest'
        ? this.auth.linkGoogle(ACCOUNT_PATH)
        : this.auth.signInWithGoogle(ACCOUNT_PATH),
    );
  }

  /** The guest said the orders belong to someone else, so this browser forgets them */
  signInWithoutOrders(): Promise<boolean> {
    return this.run(async () => {
      await this.auth.signOut();
      await this.auth.signInWithGoogle(ACCOUNT_PATH);
    });
  }

  signOut(): Promise<boolean> {
    this.transfer.dismiss();
    return this.run(() => this.auth.signOut());
  }

  async finishTransfer(): Promise<void> {
    if (await this.transfer.finish()) {
      this.ordersResource.reload();
    }
  }

  private async start(): Promise<void> {
    await this.auth.ready;
    this.isReady.set(true);
    this.checkUnfinishedSignIn();
    if (this.auth.isSignedIn()) {
      await this.transfer.finish();
    }
    this.canLoadOrders.set(true);
  }

  /** @returns False when it failed */
  private async run(action: () => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    try {
      await action();
      return true;
    } catch {
      this.attempts.clear();
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private whatsappUrl(message: string): string | null {
    const number = this.settingsResource.hasValue()
      ? this.settingsResource.value().storeWhatsapp
      : null;
    return number ? whatsappLink(number, message) : null;
  }
}
