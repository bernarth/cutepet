import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-custom-request-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Pedido personalizado" subtitle="Cuéntanos qué quieres y te cotizamos" />
    <cp-empty-state icon="design_services" message="Formulario en construcción." />
  `,
})
export class CustomRequestPage {}
