import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

/**
 * Write-only, immutable. Every mutation writes a row; Better Auth lifecycle
 * hooks (login/logout/password_reset_*) bridge into this table per
 * 05-TECH-CONTRACTS §4.3.
 *
 * `ipAddress` uses Postgres `inet` (not text) so we can index by subnet
 * later. Drizzle exposes inet via custom type; we'll store as text for
 * Phase 1 and migrate later if subnet queries become useful.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    changes: jsonb("changes"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_log_user_created_idx").on(
      t.userId,
      sql`${t.createdAt} DESC`,
    ),
    index("audit_log_entity_idx").on(
      t.entityType,
      t.entityId,
      sql`${t.createdAt} DESC`,
    ),
  ],
);

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
