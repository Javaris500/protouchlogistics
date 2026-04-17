/**
 * Fixture invoices for frontend development. Replace with server-function
 * data once the backend contracts in 05-TECH-CONTRACTS.md §9.8 are wired up.
 */

import type { InvoiceStatus } from "@/components/ui/status-pill";

export interface FixtureInvoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  broker: { id: string; companyName: string };
  loadCount: number;
  loads: string[];
  subtotalCents: number;
  adjustmentsCents: number;
  totalCents: number;
  issueDate: string;
  dueDate: string;
  sentAt: string | null;
  paidAt: string | null;
  paidAmountCents: number | null;
  paymentMethod: string | null;
  createdAt: string;
}

const now = new Date();
const d = (offsetDays: number) => {
  const x = new Date(now);
  x.setDate(x.getDate() + offsetDays);
  x.setHours(12, 0, 0, 0);
  return x.toISOString();
};

export const FIXTURE_INVOICES: FixtureInvoice[] = [
  {
    id: "inv_01",
    invoiceNumber: "PTL-INV-2026-0012",
    status: "paid",
    broker: { id: "br_01", companyName: "CH Robinson" },
    loadCount: 3,
    loads: ["PTL-2026-0131", "PTL-2026-0128", "PTL-2026-0125"],
    subtotalCents: 725_000,
    adjustmentsCents: 0,
    totalCents: 725_000,
    issueDate: d(-21),
    dueDate: d(-6),
    sentAt: d(-21),
    paidAt: d(-8),
    paidAmountCents: 725_000,
    paymentMethod: "ACH",
    createdAt: d(-21),
  },
  {
    id: "inv_02",
    invoiceNumber: "PTL-INV-2026-0013",
    status: "paid",
    broker: { id: "br_02", companyName: "Total Quality Logistics" },
    loadCount: 2,
    loads: ["PTL-2026-0130", "PTL-2026-0127"],
    subtotalCents: 442_500,
    adjustmentsCents: -15_000,
    totalCents: 427_500,
    issueDate: d(-18),
    dueDate: d(-3),
    sentAt: d(-18),
    paidAt: d(-5),
    paidAmountCents: 427_500,
    paymentMethod: "Check #4891",
    createdAt: d(-18),
  },
  {
    id: "inv_03",
    invoiceNumber: "PTL-INV-2026-0014",
    status: "overdue",
    broker: { id: "br_03", companyName: "XPO Logistics" },
    loadCount: 2,
    loads: ["PTL-2026-0129", "PTL-2026-0126"],
    subtotalCents: 530_000,
    adjustmentsCents: 0,
    totalCents: 530_000,
    issueDate: d(-35),
    dueDate: d(-5),
    sentAt: d(-35),
    paidAt: null,
    paidAmountCents: null,
    paymentMethod: null,
    createdAt: d(-35),
  },
  {
    id: "inv_04",
    invoiceNumber: "PTL-INV-2026-0015",
    status: "sent",
    broker: { id: "br_01", companyName: "CH Robinson" },
    loadCount: 2,
    loads: ["PTL-2026-0134", "PTL-2026-0133"],
    subtotalCents: 485_000,
    adjustmentsCents: 0,
    totalCents: 485_000,
    issueDate: d(-7),
    dueDate: d(8),
    sentAt: d(-7),
    paidAt: null,
    paidAmountCents: null,
    paymentMethod: null,
    createdAt: d(-7),
  },
  {
    id: "inv_05",
    invoiceNumber: "PTL-INV-2026-0016",
    status: "sent",
    broker: { id: "br_04", companyName: "Landstar System" },
    loadCount: 1,
    loads: ["PTL-2026-0132"],
    subtotalCents: 320_000,
    adjustmentsCents: 25_000,
    totalCents: 345_000,
    issueDate: d(-3),
    dueDate: d(12),
    sentAt: d(-3),
    paidAt: null,
    paidAmountCents: null,
    paymentMethod: null,
    createdAt: d(-3),
  },
  {
    id: "inv_06",
    invoiceNumber: "PTL-INV-2026-0017",
    status: "draft",
    broker: { id: "br_02", companyName: "Total Quality Logistics" },
    loadCount: 2,
    loads: ["PTL-2026-0138", "PTL-2026-0139"],
    subtotalCents: 403_500,
    adjustmentsCents: 0,
    totalCents: 403_500,
    issueDate: d(0),
    dueDate: d(30),
    sentAt: null,
    paidAt: null,
    paidAmountCents: null,
    paymentMethod: null,
    createdAt: d(0),
  },
];
