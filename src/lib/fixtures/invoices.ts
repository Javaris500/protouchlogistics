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

export const FIXTURE_INVOICES: FixtureInvoice[] = [];
