import { Service, computed, inject, resource, signal } from '@angular/core';

import { PickupRule } from '@core/cart/cart-summary';
import { SettingsRepository } from '@core/settings/settings.repository';
import { normalizeText } from '../models/admin-product.mapper';
import { QuickSaleRequest, SaleOption } from '../models/quick-sale';
import { QuickSaleRepository, RecordedSale } from './quick-sale.repository';

const NO_PICKUP_RULE: PickupRule = { fee: 0, freeFromUnits: 1 };

/**
 * @description What can be sold right now and the pickup rule for the summary. The order itself is checked again in the database
 */
@Service()
export class QuickSaleStore {
  private readonly repository = inject(QuickSaleRepository);
  private readonly settings = inject(SettingsRepository);

  private readonly products = resource({ loader: () => this.repository.listSaleProducts() });
  private readonly pickupRuleResource = resource({
    loader: async () => (await this.settings.getStoreSettings()).pickupRule,
  });

  readonly search = signal('');
  readonly isLoading = computed(
    () => this.products.isLoading() || this.pickupRuleResource.isLoading(),
  );
  readonly hasError = computed(
    () => this.products.error() !== undefined || this.pickupRuleResource.error() !== undefined,
  );
  readonly pickupRule = computed(() => this.pickupRuleResource.value() ?? NO_PICKUP_RULE);

  readonly visibleProducts = computed(() => {
    const search = normalizeText(this.search().trim());
    return (this.products.value() ?? []).filter((product) =>
      normalizeText(product.name).includes(search),
    );
  });

  readonly optionsById = computed(
    () =>
      new Map<number, SaleOption>(
        (this.products.value() ?? []).flatMap((product) =>
          product.options.map((option) => [option.variantId, option] as const),
        ),
      ),
  );

  reload(): void {
    this.products.reload();
    this.pickupRuleResource.reload();
  }

  /**
   * @description The list is loaded again after every attempt, so sold items disappear from it
   */
  async record(request: QuickSaleRequest): Promise<RecordedSale> {
    try {
      return await this.repository.createQuickSale(request);
    } finally {
      this.products.reload();
    }
  }
}
