import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-size-guide-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Guía de tallas" subtitle="Cómo medir a tu mascota" />
    <cp-empty-state icon="straighten" message="Guía y calculadora de tallas en construcción." />
  `,
})
export class SizeGuidePage {}
