import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { auditLog, users } from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import type { JsonObject } from "@/lib/json";

/**
 * Audit log — admin server functions. Brief §3.2 priority 5.
 *
 * Read-only. Mutation logs are written from inside each resource handler via
 * `auditService.record(...)`.
 */

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListAuditInput = PaginationZ.extend({
  userId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  action: z.string().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
});

export const listAudit = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListAuditInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const conditions = [];
    if (data.userId) conditions.push(eq(auditLog.userId, data.userId));
    if (data.entityType) conditions.push(eq(auditLog.entityType, data.entityType));
    if (data.entityId) conditions.push(eq(auditLog.entityId, data.entityId));
    if (data.action) conditions.push(eq(auditLog.action, data.action));
    if (data.since) conditions.push(gte(auditLog.createdAt, new Date(data.since)));
    if (data.until) conditions.push(lte(auditLog.createdAt, new Date(data.until)));
    if (data.cursor) {
      conditions.push(sql`${auditLog.createdAt} < ${new Date(data.cursor)}`);
    }

    const rows = await db
      .select({
        id: auditLog.id,
        userId: auditLog.userId,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        changes: auditLog.changes,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
        actorEmail: users.email,
        actorName: users.name,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.createdAt.toISOString() : null;

    return {
      entries: page.map((r) => ({
        id: r.id,
        userId: r.userId,
        actor: r.userId
          ? { id: r.userId, email: r.actorEmail ?? "", name: r.actorName ?? "" }
          : null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        changes: (r.changes as JsonObject | null) ?? null,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor,
    };
  });
