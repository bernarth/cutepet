import { Component, inject } from '@angular/core';

import { PageMeta } from '@core/seo/page-meta';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import { SizeGuideStore } from '../data-access/size-guide.store';
import { SizeCalculator } from '../ui/size-calculator';
import { SizeTable } from '../ui/size-table';

@Component({
  selector: 'cp-size-guide-page',
  imports: [PageHeader, EmptyState, SizeTable, SizeCalculator, LoadingBar],
  providers: [SizeGuideStore],
  templateUrl: './size-guide-page.html',
  styles: `
    section {
      margin-bottom: var(--cp-space-xl);
    }
    h2 {
      margin: 0 0 var(--cp-space-sm);
    }
    .steps {
      display: grid;
      gap: var(--cp-space-md);
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .steps li {
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    .steps h3 {
      margin: 0 0 var(--cp-space-xs);
    }
    .steps p,
    .tips p {
      margin: 0;
    }
    .illustration {
      display: grid;
      place-items: center;
      aspect-ratio: 16 / 9;
      margin-bottom: var(--cp-space-sm);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-medium);
    }
    .tips {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      margin-top: var(--cp-space-md);
    }
  `,
})
export class SizeGuidePage {
  protected readonly store = inject(SizeGuideStore);

  constructor() {
    inject(PageMeta).set({
      title: 'Guía de tallas',
      description: 'Cómo medir a tu mascota y qué talla elegir. Calcula su talla en segundos.',
      path: '/guia-de-tallas',
    });
  }
}
