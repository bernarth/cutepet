import { ComponentType } from '@angular/cdk/portal';
import { Component, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { AdminProductStore } from '../data-access/admin-product.store';
import { AdminProduct, AdminVariant } from '../models/admin-product';
import { adminProductStatus } from '../models/admin-product.mapper';
import { measurementWarnings } from '../models/measurement-warnings';
import {
  EMPTY_PRODUCT_FORM,
  ProductFormModel,
  productFormFrom,
  productFormSchema,
} from '../models/product-form';
import { variantMeasurements } from '../models/variant-form';
import { ProductFormFields } from '../ui/product-form-fields';
import { ProductStatusBadge } from '../ui/product-status-badge';
import { SaveState } from '../ui/save-state';
import { SlugDialog, SlugDialogData } from '../ui/slug-dialog';
import { StockAdjustmentDialog, StockAdjustmentDialogData } from '../ui/stock-adjustment-dialog';
import { VariantCard } from '../ui/variant-card';
import { VariantDialog, VariantDialogData } from '../ui/variant-dialog';

const DIALOG_CONFIG: MatDialogConfig = {
  width: '560px',
  maxWidth: 'calc(100vw - 32px)',
  autoFocus: 'first-tabbable',
};

@Component({
  selector: 'cp-admin-product-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    EmptyState,
    LoadingBar,
    ProductFormFields,
    ProductStatusBadge,
    VariantCard,
  ],
  templateUrl: './admin-product-page.html',
  styleUrl: './admin-product-page.scss',
})
export class AdminProductPage {
  /** Route parameter `:id` */
  readonly id = input.required<string>();

  protected readonly store = inject(AdminProductStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly saving = new SaveState();
  protected readonly status = computed(() => {
    const product = this.store.product();
    return product ? adminProductStatus(product) : null;
  });

  /** Resets only when another product opens, so a reload after saving a size keeps unsaved edits */
  private readonly model = linkedSignal<number | undefined, ProductFormModel>({
    source: () => this.store.product()?.id,
    computation: () => {
      const product = untracked(this.store.product);
      return product ? productFormFrom(product) : { ...EMPTY_PRODUCT_FORM };
    },
  });
  protected readonly form = form(this.model, productFormSchema);

  protected readonly variantWarnings = computed(() => {
    const sizes = this.store.lookups().sizes;
    const variants = this.store.product()?.variants ?? [];

    return new Map(
      variants.map((variant) => {
        const size = sizes.find((candidate) => candidate.id === variant.sizeId);
        return [variant.id, size ? measurementWarnings(variantMeasurements(variant), size) : []];
      }),
    );
  });

  constructor() {
    effect(() => this.store.load(Number(this.id())));
  }

  protected saveProduct(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      if (await this.saving.run(() => this.store.saveProduct(this.model()))) {
        this.form().reset();
        this.notify('Cambios guardados');
      }
    });
  }

  protected async toggleActive(product: AdminProduct): Promise<void> {
    if (await this.saving.run(() => this.store.setActive(!product.isActive))) {
      this.notify(product.isActive ? 'Prenda archivada' : 'Prenda publicada otra vez');
    }
  }

  protected openSlugDialog(product: AdminProduct): void {
    const data: SlugDialogData = {
      slug: product.slug,
      save: (slug) => this.store.changeSlug(slug),
    };
    this.openDialog(SlugDialog, data, 'Enlace cambiado');
  }

  protected openVariantDialog(product: AdminProduct, variant: AdminVariant | null): void {
    const data: VariantDialogData = {
      variant,
      sizes: this.store.lookups().sizes,
      usedSizeIds: product.variants
        .filter((other) => other.id !== variant?.id)
        .map((other) => other.sizeId),
      save: (model) => this.store.saveVariant(variant, model),
    };
    this.openDialog(VariantDialog, data, variant ? 'Talla guardada' : 'Talla agregada');
  }

  protected openStockDialog(variant: AdminVariant): void {
    const data: StockAdjustmentDialogData = {
      variant,
      save: (newStock, reason) => this.store.adjustStock(variant, newStock, reason),
    };
    this.openDialog(StockAdjustmentDialog, data, 'Stock ajustado');
  }

  private openDialog<TDialog, TData>(
    dialog: ComponentType<TDialog>,
    data: TData,
    successMessage: string,
  ): void {
    this.dialog
      .open<TDialog, TData, boolean>(dialog, { ...DIALOG_CONFIG, data })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.notify(successMessage);
        }
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }
}
