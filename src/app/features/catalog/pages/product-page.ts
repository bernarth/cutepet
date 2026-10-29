import { Component, computed, effect, inject, linkedSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { quantityInCart } from '@core/cart/cart-line';
import { CartStore } from '@core/cart/cart.store';
import { PageMeta } from '@core/seo/page-meta';
import { EmptyState } from '@shared/ui/empty-state';
import { PricePipe } from '@shared/pipes/price';
import { LoadingBar } from '@shared/ui/loading-bar';
import { ProductStore } from '../data-access/product.store';
import { measurementsText, referenceMeasurementsText } from '../models/measurements-text';
import { productMetaDescription } from '../models/product-meta';
import { PhotoGallery } from '../ui/photo-gallery';
import { SizeCalculator } from '../ui/size-calculator';
import { SizePicker } from '../ui/size-picker';

@Component({
  selector: 'cp-product-page',
  imports: [
    PricePipe,
    RouterLink,
    MatButtonModule,
    LoadingBar,
    EmptyState,
    PhotoGallery,
    SizePicker,
    SizeCalculator,
  ],
  providers: [ProductStore],
  templateUrl: './product-page.html',
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--cp-space-lg);
    }
    @media (min-width: 768px) {
      .layout {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        align-items: start;
      }
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-md);
      min-width: 0;
    }
    h1 {
      margin: 0;
      font-family: var(--cp-font-display);
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    p {
      margin: 0;
    }
    .price {
      font: var(--mat-sys-headline-small);
      font-weight: 700;
    }
    .reserved {
      opacity: 0.55;
    }
    .notice {
      padding: var(--cp-space-md);
      border-radius: var(--cp-radius);
      background: var(--cp-lavender);
      color: var(--cp-ink);
    }
    .hint,
    .meta {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .calculator h2 {
      margin: 0 0 var(--cp-space-sm);
      font: var(--mat-sys-title-medium);
      font-family: var(--cp-font-display);
    }
    .add-to-cart {
      width: 100%;
    }
    @media (min-width: 768px) {
      .add-to-cart {
        width: fit-content;
        min-width: 16rem;
      }
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--cp-space-sm);
    }
  `,
})
export class ProductPage {
  protected readonly store = inject(ProductStore);
  private readonly pageMeta = inject(PageMeta);
  private readonly cart = inject(CartStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly selectedVariantId = linkedSignal(
    () => this.store.product()?.variants.find((variant) => !variant.isReserved)?.id ?? null,
  );

  private readonly selectedVariant = computed(
    () =>
      this.store.product()?.variants.find((variant) => variant.id === this.selectedVariantId()) ??
      null,
  );

  /**
   * @description Measurements of the selected size, or of the first one when every size is reserved.
   * Without exact measurements it falls back to the reference ranges of the size table
   */
  protected readonly measurements = computed(() => {
    const shown = this.selectedVariant() ?? this.store.product()?.variants[0];
    if (!shown) {
      return null;
    }
    const size = this.store.sizes().find((item) => item.id === shown.sizeId);
    return measurementsText(shown) ?? (size ? referenceMeasurementsText(size) : null);
  });

  protected readonly hasReservedSize = computed(() => {
    const product = this.store.product();
    return (
      product?.status === 'available' && product.variants.some((variant) => variant.isReserved)
    );
  });

  protected readonly cartAction = computed(() => {
    const variant = this.selectedVariant();

    if (!variant || variant.isReserved) {
      return 'unavailable';
    }

    return quantityInCart(this.cart.lines(), variant.id) < variant.availableStock
      ? 'add'
      : 'in_cart';
  });

  protected addToCart(): void {
    const product = this.store.product();
    const variant = this.selectedVariant();

    if (!product || !variant) {
      return;
    }

    this.cart.add(
      { variantId: variant.id, productName: product.name, sizeLabel: variant.sizeLabel },
      variant.availableStock,
    );
    this.snackBar
      .open('Agregado al carrito', 'Ver carrito', { duration: 4000 })
      .onAction()
      .subscribe(() => void this.router.navigateByUrl('/carrito'));
  }

  constructor() {
    effect(() => {
      const product = this.store.product();

      if (product) {
        this.pageMeta.set({
          title: product.name,
          description: productMetaDescription(product),
          path: `/catalogo/${product.slug}`,
          imageUrl: product.photo?.url,
          price: product.price,
        });
      } else if (this.store.isSoldOut()) {
        this.pageMeta.set({
          title: 'Prenda no disponible',
          description:
            'Esta prenda ya no está disponible. Mira el catálogo o pide una personalizada.',
          path: '/catalogo',
          noIndex: true,
        });
      } else if (this.store.notFound()) {
        this.pageMeta.set({
          title: 'Prenda no encontrada',
          description: 'Esta prenda no existe.',
          path: '/catalogo',
          noIndex: true,
        });
        this.pageMeta.setNotFoundStatus();
      }
    });
  }
}
