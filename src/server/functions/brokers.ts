import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  brokers,
  invoices,
  loads,
} from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import { ConflictError, NotFoundError } from "@/server/errors";
import { record as auditRecord } from "@/server/services/audit.service";

/**
 * Brokers — admin server functions. Brief §3.2 priority 2.
 *
 * Soft delete only; `deletedAt` flips. The schema has no `status` column —
 * non-null `deletedAt` plays the "archived" role and the partial unique on
 * `mcNumber` already guards against re-creating a duplicate live broker.
 *
 * `grade` is derived (not persisted): 5★ = A, 4★ = B, 3★ = C, ≤ 2★ = D.
 * Scorecard aggregates (avgDaysToPay, onTimeRate, etc.) are Phase 2 — we
 * return zeros now so the UI can render with empty-state styling.
 */

export type BrokerGrade = "A" | "B" | "C" | "D";

function gradeFromStarRating(stars: number): BrokerGrade {
  if (stars >= 5) return "A";
  if (stars === 4) return "B";
  if (stars === 3) return "C";
  return "D";
}

const PaymentTermsZ = z.enum([
  "net_15",
  "net_30",
  "net_45",
  "net_60",
  "quick_pay",
  "other",
]);

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListBrokersInput = PaginationZ.extend({
  search: z.string().optional(),
  grade: z.enum(["A", "B", "C", "D"]).optional(),
});

export const listBrokers = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListBrokersInput.parse(data))
  .handler(async ({ data }) => {
    const conditions = [isNull(brokers.deletedAt)];
    if (data.cursor) {
      conditions.push(sql`${brokers.companyName} > ${data.cursor}`);
    }
    if (data.search?.trim()) {
      const q = `%${data.search.trim()}%`;
      conditions.push(
        or(
          ilike(brokers.companyName, q),
          ilike(brokers.mcNumber, q),
          ilike(brokers.dotNumber, q),
          ilike(brokers.contactName, q),
          ilike(brokers.contactEmail, q),
        )!,
      );
    }
    if (data.grade) {
      const range = gradeStarRange(data.grade);
      conditions.push(
        sql`${brokers.starRating} BETWEEN ${range.min} AND ${range.max}`,
      );
    }

    const rows = await db
      .select()
      .from(brokers)
      .where(and(...conditions))
      .orderBy(asc(brokers.companyName))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.companyName : null;

    return {
      brokers: page.map((b) => ({
        ...b,
        grade: gradeFromStarRating(b.starRating),
      })),
      nextCursor,
    };
  });

function gradeStarRange(g: BrokerGrade): { min: number; max: number } {
  switch (g) {
    case "A":
      return { min: 5, max: 5 };
    case "B":
      return { min: 4, max: 4 };
    case "C":
      return { min: 3, max: 3 };
    case "D":
      return { min: 0, max: 2 };
  }
}

const GetBrokerInput = z.object({ brokerId: z.string().uuid() });

export const getBroker = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => GetBrokerInput.parse(data))
  .handler(async ({ data }) => {
    const broker = await db.query.brokers.findFirst({
      where: eq(brokers.id, data.brokerId),
    });
    if (!broker || broker.deletedAt) throw new NotFoundError("Broker");

    const recentLoads = await db
      .select({
        id: loads.id,
        loadNumber: loads.loadNumber,
        status: loads.status,
        rate: loads.rate,
        miles: loads.miles,
        commodity: loads.commodity,
        createdAt: loads.createdAt,
      })
      .from(loads)
      .where(and(eq(loads.brokerId, broker.id), isNull(loads.deletedAt)))
      .orderBy(desc(loads.createdAt))
      .limit(20);

    const recentInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        totalCents: invoices.totalCents,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .where(eq(invoices.brokerId, broker.id))
      .orderBy(desc(invoices.issueDate))
      .limit(20);

    return {
      broker: { ...broker, grade: gradeFromStarRating(broker.starRating) },
      scorecard: {
        avgDaysToPay: 0,
        onTimeRate: 0,
        avgRatePerMileCents: 0,
        loadsYtd: 0,
        revenueYtdCents: 0,
        detention90d: 0,
      },
      recentLoads,
      invoices: recentInvoices,
    };
  });

const CreateBrokerInput = z.object({
  companyName: z.string().min(1),
  mcNumber: z.string().nullable().optional(),
  dotNumber: z.string().nullable().optional(),
  contactName: z.string().min(1),
  contactPhone: z.string().min(7),
  contactEmail: z.string().email(),
  billingEmail: z.string().email().nullable().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(3),
  paymentTerms: PaymentTermsZ,
  paymentTermsOther: z.string().nullable().optional(),
  creditRating: z.string().nullable().optional(),
  starRating: z.number().int().min(0).max(5).default(0),
  notes: z.string().nullable().optional(),
});

export const createBroker = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => CreateBrokerInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      if (data.mcNumber) {
        const existing = await tx
          .select({ id: brokers.id })
          .from(brokers)
          .where(
            and(eq(brokers.mcNumber, data.mcNumber), isNull(brokers.deletedAt)),
          )
          .limit(1);
        if (existing.length > 0) {
          throw new ConflictError(
            `MC number ${data.mcNumber} is already on file`,
          );
        }
      }

      const [created] = await tx
        .insert(brokers)
        .values({
          ...data,
          mcNumber: data.mcNumber ?? null,
          dotNumber: data.dotNumber ?? null,
          billingEmail: data.billingEmail ?? null,
          addressLine2: data.addressLine2 ?? null,
          paymentTermsOther: data.paymentTermsOther ?? null,
          creditRating: data.creditRating ?? null,
          notes: data.notes ?? null,
        })
        .returning();
      if (!created) throw new Error("Failed to insert broker");

      await auditRecord(
        {
          userId: context.user.id,
          action: "broker.created",
          entityType: "broker",
          entityId: created.id,
          changes: { companyName: created.companyName },
        },
        tx,
      );
      return {
        broker: { ...created, grade: gradeFromStarRating(created.starRating) },
      };
    });
  });

const UpdateBrokerInput = z.object({
  brokerId: z.string().uuid(),
  patch: CreateBrokerInput.partial().refine(
    (p) => Object.keys(p).length > 0,
    { message: "Patch must contain at least one field" },
  ),
});

export const updateBroker = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => UpdateBrokerInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const broker = await tx.query.brokers.findFirst({
        where: eq(brokers.id, data.brokerId),
      });
      if (!broker || broker.deletedAt) throw new NotFoundError("Broker");

      const [updated] = await tx
        .update(brokers)
        .set({ ...data.patch, updatedAt: new Date() })
        .where(eq(brokers.id, broker.id))
        .returning();
      if (!updated) throw new Error("Failed to update broker");

      await auditRecord(
        {
          userId: context.user.id,
          action: "broker.updated",
          entityType: "broker",
          entityId: broker.id,
          changes: data.patch as Record<string, unknown>,
        },
        tx,
      );
      return {
        broker: { ...updated, grade: gradeFromStarRating(updated.starRating) },
      };
    });
  });

const DeleteBrokerInput = z.object({ brokerId: z.string().uuid() });

export const deleteBroker = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => DeleteBrokerInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const broker = await tx.query.brokers.findFirst({
        where: eq(brokers.id, data.brokerId),
      });
      if (!broker || broker.deletedAt) throw new NotFoundError("Broker");

      const now = new Date();
      await tx
        .update(brokers)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(brokers.id, broker.id));

      await auditRecord(
        {
          userId: context.user.id,
          action: "broker.deleted",
          entityType: "broker",
          entityId: broker.id,
        },
        tx,
      );
      return { ok: true as const };
    });
  });
