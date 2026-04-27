import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import type { JsonObject } from "@/lib/json";

/**
 * Notifications — admin server functions. Brief §3.2 priority 5.
 *
 * Admin reads its own notification feed. Driver-side variants live under
 * `src/server/functions/driver/notifications.ts` (Session 3 owns).
 */

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListNotificationsInput = PaginationZ.extend({
  unreadOnly: z.boolean().default(false),
});

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListNotificationsInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const conditions = [eq(notifications.userId, context.user.id)];
    if (data.unreadOnly) conditions.push(isNull(notifications.readAt));
    if (data.cursor) {
      conditions.push(
        sql`${notifications.createdAt} < ${new Date(data.cursor)}`,
      );
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.createdAt.toISOString() : null;

    const [unreadCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, context.user.id),
          isNull(notifications.readAt),
        ),
      );

    return {
      notifications: page.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl,
        metadata: (n.metadata as JsonObject | null) ?? null,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      nextCursor,
      unreadCount: unreadCountRow?.count ?? 0,
    };
  });

const MarkReadInput = z.object({ notificationId: z.string().uuid() });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => MarkReadInput.parse(data))
  .handler(async ({ data, context }) => {
    const row = await db.query.notifications.findFirst({
      where: eq(notifications.id, data.notificationId),
    });
    if (!row) throw new NotFoundError("Notification");
    if (row.userId !== context.user.id) {
      throw new ForbiddenError("That notification belongs to another user");
    }

    if (row.readAt) return { ok: true as const };

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, row.id));
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .handler(async ({ context }) => {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, context.user.id),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });

    return { ok: true as const, count: result.length };
  });
