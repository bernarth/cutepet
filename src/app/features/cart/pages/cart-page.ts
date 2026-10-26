import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-cart-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Tu carrito" />
    <cp-empty-state icon="shopping_bag" message="Tu carrito está vacío." />
  `,
})
export class CartPage {}
