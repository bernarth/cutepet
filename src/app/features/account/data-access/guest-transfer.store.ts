import { Service, inject, signal } from '@angular/core';

import { SignInAttemptStorage } from '@core/auth/sign-in-attempt';
import { TransferNotice, transferFailure, transferNotice } from '../models/transfer-notice';
import { AccountOrderRepository } from './account-order.repository';

/**
 * @description Provided by AccountPage. Moves the orders a guest took to an account that already existed
 */
@Service({ autoProvided: false })
export class GuestTransferStore {
  private readonly attempts = inject(SignInAttemptStorage);
  private readonly repository = inject(AccountOrderRepository);

  private readonly currentNotice = signal<TransferNotice | null>(null);
  private readonly lostCodes = signal<readonly string[]>([]);

  readonly notice = this.currentNotice.asReadonly();
  /** Orders of a transfer that is no longer valid */
  readonly lostOrderCodes = this.lostCodes.asReadonly();

  /**
   * @returns True when orders moved, so the list has to be loaded again
   */
  async finish(): Promise<boolean> {
    const attempt = this.attempts.read();
    const transfer = attempt?.kind === 'transferring' ? attempt : null;

    try {
      const result = await this.repository.transferGuestOrders(transfer?.transferToken ?? null);
      this.attempts.clear();
      this.currentNotice.set(transferNotice(result));
      return result.movedCount > 0;
    } catch (error) {
      if (transfer || this.currentNotice()) {
        this.fail(transferFailure(error), transfer?.orderCodes ?? []);
      }
      return false;
    }
  }

  dismiss(): void {
    this.currentNotice.set(null);
  }

  private fail(failure: TransferNotice, orderCodes: readonly string[]): void {
    if (failure.kind === 'invalid') {
      this.attempts.clear();
      this.lostCodes.set(orderCodes);
    }
    this.currentNotice.set(failure);
  }
}
