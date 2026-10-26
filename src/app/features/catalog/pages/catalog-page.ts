import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-catalog-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Catálogo" />
    <cp-empty-state message="Pronto verás aquí todas las prendas disponibles." />
  `,
})
export class CatalogPage {}
