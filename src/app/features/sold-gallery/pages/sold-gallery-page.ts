import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-sold-gallery-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Ya vendidos" subtitle="Prendas que ya encontraron dueño" />
    <cp-empty-state icon="favorite" message="Galería en construcción." />
  `,
})
export class SoldGalleryPage {}
