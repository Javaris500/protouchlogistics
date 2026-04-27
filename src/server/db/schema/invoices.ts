import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { brokers } from "./brokers";
import { driverProfiles } from "./drivers";
import { loads } from "./loads";
import { documents } from "./documents";
import { invoiceStatus } from "./_enums";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceNumber: text("invoice_number").notNull(),
    brokerId: uuid("broker_id")
      .notNull()
      .references(() => brokers.id, { onDelete: "restrict" }),
    status: invoiceStatus("status").notNull(),

    subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull(),
    adjustmentsCents: bigint("adjustments_cents", { mode: "number" })
      .notNull()
      .default(0),
    totalCents: bigint("total_cents", { mode: "number" }).notNull(),

    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidAmountCents: bigint("paid_amount_cents", { mode: "number" }),
    paymentMethod: text("payment_method"),

    pdfUrl: text("pdf_url"),
    notes: text("notes"),

    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("invoices_invoice_number_key").on(t.invoiceNumber),
    index("invoices_broker_idx").on(t.brokerId),
    index("invoices_status_due_idx").on(t.status, t.dueDate),
  ],
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    // Null on manual line items like "detention" with no source load.
    loadId: uuid("load_id").references(() => loads.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invoice_line_items_invoice_idx").on(t.invoiceId),
    index("invoice_line_items_load_idx").on(t.loadId),
  ],
);

/**
 * Per-load pay snapshot, written at completion. Pay model is per-load
 * (`loads.driverPayCents`), so this row exists primarily for fast reporting
 * and `paidAt` toggling — there is no per-driver `payModel`/`payRate` to
 * snapshot.
 */
export const driverPayRecords = pgTable(
  "driver_pay_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverProfileId: uuid("driver_profile_id")
      .notNull()
      .references(() => driverProfiles.id, { onDelete: "restrict" }),
    loadId: uuid("load_id")
      .notNull()
      .references(() => loads.id, { onDelete: "restrict" }),
    calculatedAmountCents: integer("calculated_amount_cents").notNull(),
    adjustmentsCents: integer("adjustments_cents").notNull().default(0),
    totalAmountCents: integer("total_amount_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("driver_pay_records_load_key").on(t.loadId),
    index("driver_pay_records_driver_created_idx").on(
      t.driverProfileId,
      sql`${t.createdAt} DESC`,
    ),
    index("driver_pay_records_unpaid_idx")
      .on(t.paidAt)
      .where(sql`${t.paidAt} IS NULL`),
  ],
);

export const settlementStatements = pgTable(
  "settlement_statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverProfileId: uuid("driver_profile_id")
      .notNull()
      .references(() => driverProfiles.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    totalCents: bigint("total_cents", { mode: "number" }).notNull(),
    loadCount: integer("load_count").notNull(),
    pdfUrl: text("pdf_url").notNull(),
    pdfKey: text("pdf_key").notNull(),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("settlement_statements_driver_period_key").on(
      t.driverProfileId,
      t.periodStart,
    ),
  ],
);

export const podDeliveries = pgTable(
  "pod_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loadId: uuid("load_id")
      .notNull()
      .references(() => loads.id, { onDelete: "cascade" }),
    podDocumentId: uuid("pod_document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "restrict" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    sentToEmail: text("sent_to_email").notNull(),
    pdfKey: text("pdf_key").notNull(),
    deliveryAttempts: integer("delivery_attempts").notNull().default(1),
    lastError: text("last_error"),
  },
  (t) => [index("pod_deliveries_load_idx").on(t.loadId)],
);

export const displayTokens = pgTable(
  "display_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull(),
    name: text("name").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("display_tokens_token_key").on(t.token)],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type DriverPayRecord = typeof driverPayRecords.$inferSelect;
export type SettlementStatement = typeof settlementStatements.$inferSelect;
export type PodDelivery = typeof podDeliveries.$inferSelect;
export type DisplayToken = typeof displayTokens.$inferSelect;
