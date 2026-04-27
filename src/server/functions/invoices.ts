import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  brokers,
  driverPayRecords,
  driverProfiles,
  invoiceLineItems,
  invoices,
  loads,
} from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import { NotFoundError } from "@/server/errors";

/**
 * Invoices — read aggregates only (Phase 2 owns full lifecycle). Brief §3.2
 * priority 6.
 *
 * Phase 1 surface: list, get, listCompletedLoadsForBroker. The mutation
 * endpoints (create/send/markPaid/void) ship in Phase 2 with PDF rendering.
 */

const InvoiceStatusZ = z.enum(["draft", "sent", "paid", "overdue", "void"]);

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListInvoicesInput = PaginationZ.extend({
  status: InvoiceStatusZ.optional(),
  brokerId: z.string().uuid().optional(),
});

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListInvoicesInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const conditions = [];
    if (data.status) conditions.push(eq(invoices.status, data.status));
    if (data.brokerId) conditions.push(eq(invoices.brokerId, data.brokerId));
    if (data.cursor) {
      conditions.push(sql`${invoices.createdAt} < ${new Date(data.cursor)}`);
    }

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        subtotalCents: invoices.subtotalCents,
        adjustmentsCents: invoices.adjustmentsCents,
        totalCents: invoices.totalCents,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        sentAt: invoices.sentAt,
        paidAt: invoices.paidAt,
        paidAmountCents: invoices.paidAmountCents,
        brokerId: invoices.brokerId,
        brokerCompany: brokers.companyName,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .leftJoin(brokers, eq(brokers.id, invoices.brokerId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(invoices.issueDate))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.createdAt.toISOString() : null;

    return {
      invoices: page.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        status: r.status,
        subtotalCents: r.subtotalCents,
        adjustmentsCents: r.adjustmentsCents,
        totalCents: r.totalCents,
        issueDate: r.issueDate,
        dueDate: r.dueDate,
        sentAt: r.sentAt?.toISOString() ?? null,
        paidAt: r.paidAt?.toISOString() ?? null,
        paidAmountCents: r.paidAmountCents,
        broker: { id: r.brokerId, companyName: r.brokerCompany ?? "" },
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  });

const GetInvoiceInput = z.object({ invoiceId: z.string().uuid() });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => GetInvoiceInput.parse(data))
  .handler(async ({ data }) => {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, data.invoiceId),
    });
    if (!invoice) throw new NotFoundError("Invoice");

    const broker = await db.query.brokers.findFirst({
      where: eq(brokers.id, invoice.brokerId),
    });

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoice.id))
      .orderBy(asc(invoiceLineItems.sortOrder));

    return {
      invoice: {
        ...invoice,
        sentAt: invoice.sentAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      },
      broker,
      lineItems: lineItems.map((li) => ({
        ...li,
        createdAt: li.createdAt.toISOString(),
      })),
    };
  });

const ListCompletedForBrokerInput = z.object({
  brokerId: z.string().uuid(),
});

export const listCompletedLoadsForBroker = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListCompletedForBrokerInput.parse(data))
  .handler(async ({ data }) => {
    const rows = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.brokerId, data.brokerId),
          eq(loads.status, "completed"),
          isNull(loads.deletedAt),
        ),
      )
      .orderBy(desc(loads.createdAt))
      .limit(200);

    return {
      loads: rows.map((l) => ({
        id: l.id,
        loadNumber: l.loadNumber,
        rateCents: l.rate,
        miles: l.miles,
        commodity: l.commodity,
        completedAt: l.updatedAt.toISOString(),
      })),
    };
  });
