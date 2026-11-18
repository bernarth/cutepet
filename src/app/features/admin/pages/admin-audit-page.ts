import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { AdminAuditStore } from '../data-access/admin-audit.store';
import { AUDIT_ENTITIES } from '../models/audit-row';
import { AuditEntryCard } from '../ui/audit-entry-card';

/**
 * @description Read only history of every change in the store. Nothing here can be edited or exported
 */
@Component({
  selector: 'cp-admin-audit-page',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EmptyState,
    LoadingBar,
    AuditEntryCard,
  ],
  templateUrl: './admin-audit-page.html',
  styleUrl: './admin-audit-page.scss',
})
export class AdminAuditPage {
  protected readonly store = inject(AdminAuditStore);
  protected readonly entities = AUDIT_ENTITIES;

  constructor() {
    this.store.reload();
  }

  protected dateValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
