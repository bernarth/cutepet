import { Service, inject } from '@angular/core';

import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import { AuditEntry } from '../models/audit-entry';

export interface AuditQuery {
  readonly table?: string;
  readonly recordId?: string;
  /** yyyy-mm-dd, inclusive */
  readonly fromDate?: string;
  /** yyyy-mm-dd, inclusive */
  readonly toDate?: string;
  /** Continues after the last entry already shown */
  readonly beforeId?: number;
  readonly pageSize: number;
}

/**
 * @description Reads the audit log through get_audit_log, which only admins can call and which names the actor without exposing emails of customers
 */
@Service()
export class AdminAuditRepository {
  private readonly supabase = inject(SUPABASE);

  async list(query: AuditQuery): Promise<AuditEntry[]> {
    const rows = unwrap(
      await this.supabase.rpc('get_audit_log', {
        target_table: query.table,
        target_record_id: query.recordId,
        from_date: query.fromDate,
        to_date: query.toDate,
        before_id: query.beforeId,
        page_size: query.pageSize,
      }),
    );

    return rows.map((row) => ({
      id: row.id,
      tableName: row.table_name,
      recordId: row.record_id,
      action: row.action,
      oldData: asRecord(row.old_data),
      newData: asRecord(row.new_data),
      reason: row.reason ?? null,
      actorLabel: row.actor_label,
      createdAt: row.created_at,
    }));
  }
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
