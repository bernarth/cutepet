import { Service, computed, inject, resource, signal } from '@angular/core';

import { SettingsRepository } from '@core/settings/settings.repository';
import { AdminOrder } from '../models/admin-order';
import { compressPhoto } from '@shared/images/photo-compression';
import { toTimeline } from '../models/order-timeline';
import { AdminAuditRepository } from './admin-audit.repository';
import { AdminOrderRepository, PrivateBucket } from './admin-order.repository';

const NO_PICKUP_INFO = { address: '', hours: '', notice: '' };

@Service()
export class AdminOrderStore {
  private readonly repository = inject(AdminOrderRepository);
  private readonly auditRepository = inject(AdminAuditRepository);
  private readonly settings = inject(SettingsRepository);
  private readonly code = signal<string | null>(null);

  private readonly orderResource = resource({
    params: () => this.code() ?? undefined,
    loader: ({ params: code }) => this.repository.getOrder(code),
  });
  private readonly timelineResource = resource({
    params: () => this.orderResource.value()?.id,
    loader: ({ params: orderId }) =>
      this.auditRepository.list({ table: 'orders', recordId: orderId, pageSize: 100 }),
  });
  private readonly pickupResource = resource({
    loader: async () => (await this.settings.getStoreSettings()).pickup,
  });

  readonly order = computed(() => this.orderResource.value() ?? null);
  readonly timeline = computed(() => toTimeline(this.timelineResource.value() ?? []));
  readonly pickupInfo = computed(() => this.pickupResource.value() ?? NO_PICKUP_INFO);
  readonly isLoading = computed(
    () => this.orderResource.isLoading() || this.timelineResource.isLoading(),
  );
  readonly hasError = computed(() => this.orderResource.error() !== undefined);
  readonly notFound = computed(
    () => this.orderResource.status() === 'resolved' && this.orderResource.value() === null,
  );

  load(code: string): void {
    this.code.set(code);
  }

  confirm(order: AdminOrder): Promise<void> {
    return this.afterChange(this.repository.confirm(order.id));
  }

  advance(order: AdminOrder): Promise<void> {
    return this.afterChange(this.repository.advance(order.id));
  }

  cancel(order: AdminOrder, reason: string): Promise<void> {
    return this.afterChange(this.repository.cancel(order.id, reason.trim()));
  }

  restore(order: AdminOrder, reason: string): Promise<void> {
    return this.afterChange(this.repository.restore(order.id, reason.trim()));
  }

  revert(order: AdminOrder, reason: string): Promise<void> {
    return this.afterChange(this.repository.revert(order.id, reason.trim()));
  }

  async attachShippingReceipt(order: AdminOrder, photo: Blob): Promise<void> {
    await this.afterChange(
      this.repository.attachShippingReceipt(order.id, await compressPhoto(photo)),
    );
  }

  signedUrl(bucket: PrivateBucket, path: string): Promise<string> {
    return this.repository.signedUrl(bucket, path);
  }

  /**
   * @description The order and its timeline are loaded again even when the change fails, because the order may have moved on
   */
  private async afterChange(change: Promise<void>): Promise<void> {
    try {
      await change;
    } finally {
      this.orderResource.reload();
      this.timelineResource.reload();
    }
  }
}
