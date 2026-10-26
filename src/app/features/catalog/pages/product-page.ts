import { Component, input } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-product-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header [title]="slug()" />
    <cp-empty-state message="Detalle del producto en construcción." />
  `,
})
export class ProductPage {
  /** Bound from the `:slug` route param (withComponentInputBinding). */
  readonly slug = input.required<string>();
}
