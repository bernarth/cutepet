import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-account-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Mi cuenta" />
    <cp-empty-state icon="person" message="Mis pedidos y Mis mascotas en construcción." />
  `,
})
export class AccountPage {}
