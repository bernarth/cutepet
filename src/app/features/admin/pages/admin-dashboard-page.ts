import { Component } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-admin-dashboard-page',
  imports: [PageHeader, EmptyState],
  template: `
    <cp-page-header title="Panel de administración" />
    <cp-empty-state
      icon="dashboard"
      message="Pedidos, productos y configuración en construcción."
    />
  `,
})
export class AdminDashboardPage {}
