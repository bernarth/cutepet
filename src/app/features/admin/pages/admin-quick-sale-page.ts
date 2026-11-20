import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { itemsTotal, pickupFee } from '@core/cart/cart-summary';
import { DELIVERY_LABELS } from '@core/orders/customer-details';
import { PricePipe, formatPrice } from '@shared/pipes/price';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { whatsappLink } from '@shared/whatsapp/whatsapp-link';
import { QuickSaleStore } from '../data-access/quick-sale.store';
import { confirmedMessage } from '../models/customer-messages';
import {
  EMPTY_QUICK_SALE,
  QuickSaleModel,
  SaleOption,
  addLine,
  quickSaleSchema,
  removeLine,
  toQuickSaleRequest,
} from '../models/quick-sale';
import { SaleLines } from '../ui/sale-lines';
import { SaleProductPicker } from '../ui/sale-product-picker';
import { SaveState } from '../ui/save-state';

interface RecordedSaleView {
  readonly code: string;
  readonly itemsTotal: number;
  readonly whatsappUrl: string;
}

@Component({
  selector: 'cp-admin-quick-sale-page',
  imports: [
    FormField,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PricePipe,
    EmptyState,
    LoadingBar,
    SaleLines,
    SaleProductPicker,
  ],
  templateUrl: './admin-quick-sale-page.html',
  styleUrl: './admin-quick-sale-page.scss',
})
export class AdminQuickSalePage {
  protected readonly store = inject(QuickSaleStore);
  protected readonly deliveryLabels = DELIVERY_LABELS;
  protected readonly saving = new SaveState();
  protected readonly recorded = signal<RecordedSaleView | null>(null);

  private readonly model = signal<QuickSaleModel>({ ...EMPTY_QUICK_SALE });
  protected readonly form = form(this.model, quickSaleSchema);

  protected readonly total = computed(() => itemsTotal(this.model().lines));
  protected readonly units = computed(() =>
    this.model().lines.reduce((sum, line) => sum + line.quantity, 0),
  );
  protected readonly pickupText = computed(() => {
    const fee = pickupFee(this.model().lines, this.store.pickupRule());
    return fee === 0
      ? 'Recojo en La Paz: gratis'
      : `Recojo en La Paz: ${formatPrice(fee)} al recoger`;
  });

  constructor() {
    this.store.reload();
  }

  protected onSearch(event: Event): void {
    this.store.search.set((event.target as HTMLInputElement).value);
  }

  protected addOption(option: SaleOption): void {
    this.form.lines().value.update((lines) => addLine(lines, option));
  }

  protected removeOption(variantId: number): void {
    this.form.lines().value.update((lines) => removeLine(lines, variantId));
  }

  protected record(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      const sale = this.model();
      await this.saving.run(async () => {
        const { code, itemsTotal } = await this.store.record(toQuickSaleRequest(sale));
        const message = confirmedMessage({
          customerName: sale.customerName,
          code,
          itemsTotal,
          deliveryMethod: sale.deliveryMethod,
        });
        this.recorded.set({
          code,
          itemsTotal,
          whatsappUrl: whatsappLink(sale.customerPhone, message),
        });
      });
    });
  }

  protected startNewSale(): void {
    this.model.set({ ...EMPTY_QUICK_SALE });
    this.form().reset();
    this.recorded.set(null);
    this.store.search.set('');
  }
}
