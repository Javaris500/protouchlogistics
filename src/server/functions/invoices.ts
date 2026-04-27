import { renderToBuffer } from "@react-pdf/renderer";
import { createServerFn } from "@tanstack/react-start";
import { put } from "@vercel/blob";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  notInArray,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  brokers,
  companySettings,
  driverPayRecords,
  driverProfiles,
  invoiceLineItems,
  invoices,
  loads,
} from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import { env } from "@/server/env";
import { BusinessRuleError, NotFoundError } from "@/server/errors";
import { record as auditRecord } from "@/server/services/audit.service";
import { InvoicePdf } from "@/server/pdf/InvoicePdf";

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
    // Exclude loads already attached to an invoice line item — those have
    // been billed and shouldn't appear as billable again.
    const billedSubquery = db
      .selectDistinct({ loadId: invoiceLineItems.loadId })
      .from(invoiceLineItems)
      .where(sql`${invoiceLineItems.loadId} IS NOT NULL`);

    const rows = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.brokerId, data.brokerId),
          eq(loads.status, "completed"),
          isNull(loads.deletedAt),
          notInArray(loads.id, billedSubquery),
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

const CreateInvoiceInput = z.object({
  brokerId: z.string().uuid(),
  loadIds: z.array(z.string().uuid()).min(1),
  adjustmentsCents: z.number().int().default(0),
  notes: z.string().nullable().optional(),
});

const PAYMENT_TERMS_DAYS: Record<string, number> = {
  net_15: 15,
  net_30: 30,
  net_45: 45,
  net_60: 60,
  quick_pay: 7,
  other: 30,
};

function nextInvoiceNumber(existingMax: string | null): string {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  // Pull the numeric suffix from the highest INV-YYYY-NNNN this year, if any.
  let nextSeq = 1;
  if (existingMax && existingMax.startsWith(prefix)) {
    const seq = parseInt(existingMax.slice(prefix.length), 10);
    if (!Number.isNaN(seq)) nextSeq = seq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => CreateInvoiceInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      // 1. Validate broker exists.
      const broker = await tx.query.brokers.findFirst({
        where: and(eq(brokers.id, data.brokerId), isNull(brokers.deletedAt)),
      });
      if (!broker) throw new NotFoundError("Broker");

      // 2. Validate every load: belongs to this broker, completed, not
      // already billed, not deleted.
      const candidateLoads = await tx
        .select({
          id: loads.id,
          loadNumber: loads.loadNumber,
          rate: loads.rate,
          status: loads.status,
          brokerId: loads.brokerId,
          deletedAt: loads.deletedAt,
        })
        .from(loads)
        .where(inArray(loads.id, data.loadIds));

      if (candidateLoads.length !== data.loadIds.length) {
        throw new NotFoundError("One or more loads");
      }
      for (const l of candidateLoads) {
        if (l.brokerId !== data.brokerId) {
          throw new BusinessRuleError(
            `Load ${l.loadNumber} doesn't belong to this broker`,
          );
        }
        if (l.status !== "completed") {
          throw new BusinessRuleError(
            `Load ${l.loadNumber} isn't completed yet`,
          );
        }
        if (l.deletedAt) {
          throw new BusinessRuleError(`Load ${l.loadNumber} is archived`);
        }
      }

      // Already-billed check — guard against double-invoicing the same load.
      const alreadyBilled = await tx
        .select({ loadId: invoiceLineItems.loadId })
        .from(invoiceLineItems)
        .where(inArray(invoiceLineItems.loadId, data.loadIds));
      if (alreadyBilled.length > 0) {
        throw new BusinessRuleError(
          "One or more loads are already on a different invoice",
        );
      }

      // 3. Generate invoice number.
      const [maxRow] = await tx
        .select({ max: sql<string>`max(${invoices.invoiceNumber})` })
        .from(invoices)
        .where(sql`${invoices.invoiceNumber} LIKE ${"INV-" + new Date().getFullYear() + "-%"}`);
      const invoiceNumber = nextInvoiceNumber(maxRow?.max ?? null);

      // 4. Compute totals.
      const subtotalCents = candidateLoads.reduce(
        (sum, l) => sum + l.rate,
        0,
      );
      const totalCents = subtotalCents + data.adjustmentsCents;

      const today = new Date();
      const issueDate = today.toISOString().slice(0, 10);
      const termDays =
        PAYMENT_TERMS_DAYS[broker.paymentTerms] ?? 30;
      const due = new Date(today);
      due.setDate(due.getDate() + termDays);
      const dueDate = due.toISOString().slice(0, 10);

      // 5. Insert invoice row.
      const [created] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          brokerId: data.brokerId,
          status: "draft",
          subtotalCents,
          adjustmentsCents: data.adjustmentsCents,
          totalCents,
          issueDate,
          dueDate,
          notes: data.notes ?? null,
          createdByUserId: context.user.id,
        })
        .returning();
      if (!created) throw new Error("Invoice insert failed");

      // 6. Insert line items, one per load.
      await tx.insert(invoiceLineItems).values(
        candidateLoads.map((l, idx) => ({
          invoiceId: created.id,
          loadId: l.id,
          description: `Load ${l.loadNumber}`,
          amountCents: l.rate,
          sortOrder: idx,
        })),
      );

      // 7. Audit.
      await auditRecord(
        {
          userId: context.user.id,
          action: "invoice.created",
          entityType: "invoice",
          entityId: created.id,
          changes: {
            invoiceNumber,
            brokerId: data.brokerId,
            loadCount: candidateLoads.length,
            totalCents,
          },
        },
        tx,
      );

      return {
        invoice: {
          id: created.id,
          invoiceNumber: created.invoiceNumber,
          status: created.status,
          totalCents: created.totalCents,
        },
      };
    });
  });

const MarkInvoicePaidInput = z.object({
  invoiceId: z.string().uuid(),
  paidAmountCents: z.number().int().min(0).optional(),
  paymentMethod: z.string().min(1).max(40).optional(),
});

export const markInvoicePaid = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => MarkInvoicePaidInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({
        where: eq(invoices.id, data.invoiceId),
      });
      if (!invoice) throw new NotFoundError("Invoice");
      if (invoice.status === "paid") {
        throw new BusinessRuleError("Invoice is already marked paid");
      }
      if (invoice.status === "void") {
        throw new BusinessRuleError("Cannot mark a void invoice as paid");
      }

      const paidAmount = data.paidAmountCents ?? invoice.totalCents;
      const now = new Date();

      const [updated] = await tx
        .update(invoices)
        .set({
          status: "paid",
          paidAt: now,
          paidAmountCents: paidAmount,
          paymentMethod: data.paymentMethod ?? null,
          updatedAt: now,
        })
        .where(eq(invoices.id, invoice.id))
        .returning();
      if (!updated) throw new Error("Invoice update failed");

      await auditRecord(
        {
          userId: context.user.id,
          action: "invoice.marked_paid",
          entityType: "invoice",
          entityId: invoice.id,
          changes: {
            paidAmountCents: paidAmount,
            paymentMethod: data.paymentMethod ?? null,
          },
        },
        tx,
      );

      return { invoice: updated };
    });
  });

const SendInvoiceInput = z.object({ invoiceId: z.string().uuid() });

export const markInvoiceSent = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => SendInvoiceInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({
        where: eq(invoices.id, data.invoiceId),
      });
      if (!invoice) throw new NotFoundError("Invoice");
      if (invoice.status !== "draft") {
        throw new BusinessRuleError(
          `Invoice is ${invoice.status}, only drafts can be sent`,
        );
      }

      const now = new Date();
      const [updated] = await tx
        .update(invoices)
        .set({ status: "sent", sentAt: now, updatedAt: now })
        .where(eq(invoices.id, invoice.id))
        .returning();
      if (!updated) throw new Error("Invoice update failed");

      await auditRecord(
        {
          userId: context.user.id,
          action: "invoice.sent",
          entityType: "invoice",
          entityId: invoice.id,
          changes: { sentAt: now.toISOString() },
        },
        tx,
      );

      return { invoice: updated };
    });
  });

const DownloadInvoicePdfInput = z.object({ invoiceId: z.string().uuid() });

/**
 * Returns the rendered PDF as a Response stream. Browser opens or downloads
 * via the `content-disposition: attachment` header.
 *
 * Phase 2 will add a "save to Vercel Blob + email broker" path; for now this
 * generates on-demand. Each call hits the DB once and renders the PDF in
 * ~50–150ms for a typical invoice (1–10 line items).
 */
export const downloadInvoicePdf = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => DownloadInvoicePdfInput.parse(data))
  .handler(async ({ data }) => {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, data.invoiceId),
    });
    if (!invoice) throw new NotFoundError("Invoice");

    const broker = await db.query.brokers.findFirst({
      where: eq(brokers.id, invoice.brokerId),
    });
    if (!broker) throw new NotFoundError("Broker for invoice");

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoice.id))
      .orderBy(asc(invoiceLineItems.sortOrder));

    const [company] = await db.select().from(companySettings).limit(1);

    const pdfBuffer = await renderToBuffer(
      InvoicePdf({
        data: {
          company: {
            name: company?.name ?? "ProTouch Logistics",
            timezone: company?.timezone ?? null,
          },
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            subtotalCents: invoice.subtotalCents,
            adjustmentsCents: invoice.adjustmentsCents,
            totalCents: invoice.totalCents,
            notes: invoice.notes,
          },
          broker: {
            companyName: broker.companyName,
            contactName: broker.contactName,
            contactEmail: broker.contactEmail,
            billingEmail: broker.billingEmail,
            addressLine1: broker.addressLine1,
            addressLine2: broker.addressLine2,
            city: broker.city,
            state: broker.state,
            zip: broker.zip,
            paymentTerms: broker.paymentTerms,
            mcNumber: broker.mcNumber,
          },
          lineItems: lineItems.map((li) => ({
            description: li.description,
            amountCents: li.amountCents,
          })),
        },
      }),
    );

    const safeNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Persist to Vercel Blob so the URL is reusable: future Phase 2 email
    // send (Resend, deferred per current scope) will attach this URL
    // without regenerating the PDF. Path uses `addRandomSuffix: false` +
    // a deterministic key so repeat downloads overwrite the same blob —
    // keeps storage usage bounded as Gary regenerates after edits.
    const blobPath = `invoices/${invoice.id}/${safeNumber}.pdf`;
    try {
      const uploaded = await put(blobPath, pdfBuffer, {
        access: "public",
        contentType: "application/pdf",
        token: env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      // Save the URL on invoice.pdfUrl so detail pages can hot-link without
      // re-rendering. Best effort — if the persistence call fails we still
      // hand the bytes back to the browser.
      await db
        .update(invoices)
        .set({ pdfUrl: uploaded.url, updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[downloadInvoicePdf] blob upload failed", err);
    }

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${safeNumber}.pdf"`,
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  });
