export interface AuditEntry {
  readonly id: number;
  readonly tableName: string;
  readonly recordId: string;
  readonly action: string;
  readonly oldData: Readonly<Record<string, unknown>> | null;
  readonly newData: Readonly<Record<string, unknown>> | null;
  readonly reason: string | null;
  readonly actorLabel: string;
  readonly createdAt: string;
}
