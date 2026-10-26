import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-checkout-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Pagar con QR" />
    <cp-empty-state icon="qr_code_2" message="Flujo de pago en construcción." />
  `,
})
export class CheckoutPage {}
