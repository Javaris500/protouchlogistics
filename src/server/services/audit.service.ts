import { db } from "@/server/db";
import { auditLog } from "@/server/db/schema";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * One audit row per mutation. Brief §3.2: "Every write wraps `requireAdmin()`
 * + audit log entry." Pass the transaction handle so the audit row commits
 * atomically with the change it describes.
 *
 * IP and user-agent are accepted but optional — Session 2 doesn't ship the
 * `requestContext` middleware in v1 (see session-2-asks.md A2). Once that
 * lands, callers will populate IP; until then it is null. The audit_log
 * table doesn't carry user-agent in the LOCKED schema — it's stored in
 * `changes.userAgent` if a caller wants to record it.
 */
export interface AuditRecordInput {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function record(
  input: AuditRecordInput,
  tx: DbOrTx = db,
): Promise<void> {
  await tx.insert(auditLog).values({
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    changes: input.changes ?? null,
    ipAddress: input.ipAddress ?? null,
  });
}
