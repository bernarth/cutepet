import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  DestroyRef,
  PLATFORM_ID,
  Service,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';

import { AuthStore } from '@core/auth/auth.store';
import { SettingsRepository } from '@core/settings/settings.repository';
import { compressPhoto } from '@shared/images/photo-compression';
import { CheckoutOrder, checkoutView } from '../models/checkout-order';
import { remainingSeconds } from '../models/countdown';
import { planProofUpload, proofErrorMessage } from '../models/payment-proof';
import { CheckoutRepository } from './checkout.repository';

interface LoadedOrder {
  readonly order: CheckoutOrder | null;
  /** performance.now() when the server answered, the start of the countdown */
  readonly loadedAt: number;
}

/**
 * @description Provided by CheckoutPage. The server decides when a reservation expires, the screen only
 * counts down from what the server said and asks again at 0 and when the customer comes back to the tab
 */
@Service({ autoProvided: false })
export class CheckoutStore {
  private readonly auth = inject(AuthStore);
  private readonly repository = inject(CheckoutRepository);
  private readonly settingsRepository = inject(SettingsRepository);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly code = signal<string | undefined>(undefined);
  private readonly clock = signal(this.isBrowser ? performance.now() : 0);
  private readonly uploading = signal(false);
  private readonly uploadFailure = signal<string | null>(null);

  private readonly orderResource = resource({
    params: () => this.code(),
    loader: async ({ params: code }): Promise<LoadedOrder> => {
      await this.auth.ready;
      const order = this.auth.user() ? await this.repository.findOrder(code) : null;
      return { order, loadedAt: performance.now() };
    },
  });
  private readonly settingsResource = resource({
    loader: () => this.settingsRepository.getStoreSettings(),
  });

  readonly order = computed(() =>
    this.orderResource.hasValue() ? this.orderResource.value().order : null,
  );
  readonly isLoading = computed(() => this.orderResource.isLoading() && !this.order());
  readonly hasError = computed(
    () => this.orderResource.status() === 'error' || this.settingsResource.status() === 'error',
  );
  readonly secondsLeft = computed(() => {
    const loaded = this.orderResource.hasValue() ? this.orderResource.value() : null;
    const start = loaded?.order?.secondsLeft ?? 0;
    return loaded ? remainingSeconds(start, this.clock() - loaded.loadedAt) : 0;
  });
  readonly view = computed(() => {
    const order = this.order();
    return order ? checkoutView(order, this.secondsLeft()) : null;
  });
  readonly qrImageUrl = computed(() => {
    const path = this.settingsResource.hasValue()
      ? this.settingsResource.value().qrImagePath
      : null;
    return path ? this.repository.qrImageUrl(path) : null;
  });
  readonly validationHours = computed(() =>
    this.settingsResource.hasValue() ? this.settingsResource.value().validationHours : '',
  );
  readonly isUploading = this.uploading.asReadonly();
  readonly uploadError = this.uploadFailure.asReadonly();

  constructor() {
    if (this.isBrowser) {
      this.watchTime();
    }

    effect(() => {
      const ranOutHere = (this.order()?.secondsLeft ?? 0) > 0 && this.secondsLeft() === 0;
      if (ranOutHere && this.order()?.status === 'pending_payment') {
        untracked(() => this.orderResource.reload());
      }
    });
  }

  load(code: string | undefined): void {
    this.code.set(code);
  }

  /**
   * @description Without a code, the latest pending or expired order of this customer
   */
  async findCurrentCode(): Promise<string | null> {
    await this.auth.ready;
    return this.auth.user() ? ((await this.repository.findOrder(null))?.code ?? null) : null;
  }

  async uploadProof(file: File): Promise<void> {
    const order = this.order();
    const plan = planProofUpload(file);
    if (!order || this.uploading()) {
      return;
    }
    if (plan.kind === 'reject') {
      this.uploadFailure.set(plan.message);
      return;
    }

    this.uploading.set(true);
    this.uploadFailure.set(null);
    try {
      const proof = plan.kind === 'compress' ? await compressPhoto(file) : file;
      await this.repository.submitProof(order.id, proof);
      this.orderResource.reload();
    } catch (error) {
      this.uploadFailure.set(proofErrorMessage(error));
    } finally {
      this.uploading.set(false);
    }
  }

  /**
   * @returns False when the order changed meanwhile, for example the reservation already expired
   */
  async cancel(): Promise<boolean> {
    const order = this.order();
    if (!order) {
      return false;
    }

    try {
      await this.repository.cancelOrder(order.id);
      return true;
    } catch {
      this.orderResource.reload();
      return false;
    }
  }

  retry(): void {
    this.orderResource.reload();
    this.settingsResource.reload();
  }

  /**
   * @description Phones pause timers while the customer is in the bank app, so coming back asks the server again
   */
  private watchTime(): void {
    const document = inject(DOCUMENT);
    const tick = setInterval(() => this.clock.set(performance.now()), 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        this.clock.set(performance.now());
        this.orderResource.reload();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    });
  }
}
