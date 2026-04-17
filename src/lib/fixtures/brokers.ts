/**
 * Fixture brokers for frontend development. Replace with server-function
 * data once the backend contracts in 05-TECH-CONTRACTS.md §9.4 are wired up.
 *
 * IDs align with `br_*` references in FIXTURE_LOADS and FIXTURE_INVOICES so
 * cross-linking works. When a broker referenced by a load or invoice isn't
 * in this list, `brokerById` falls back to a sparse "mini" record built from
 * whatever companyName the referring entity has.
 */

export type BrokerGrade = "A" | "B" | "C" | "D";
export type PaymentTerms =
  | "quickpay"
  | "net_15"
  | "net_30"
  | "net_45"
  | "net_60";

export interface FixtureBroker {
  id: string;
  companyName: string;
  mcNumber: string;
  dotNumber: string;
  contactName: string;
  contactEmail: string;
  billingEmail: string;
  contactPhone: string;
  paymentTerms: PaymentTerms;
  status: "active" | "archived";
  /** Gary's manual 1–5 rating. */
  starRating: number;
  /** Computed letter grade. */
  grade: BrokerGrade;

  /* Scorecard — computed at render time in production; here prefilled. */
  avgDaysToPay: number;
  onTimeRate: number; // 0..1
  avgRatePerMileCents: number;
  loadsYtd: number;
  revenueYtdCents: number;
  /** ≥2hr wait incidents at pickup/delivery in the last 90 days. */
  detention90d: number;
}

export const FIXTURE_BROKERS: FixtureBroker[] = [
  {
    id: "br_01",
    companyName: "CH Robinson",
    mcNumber: "123456",
    dotNumber: "7654321",
    contactName: "Jane Dispatcher",
    contactEmail: "dispatch@chrobinson.com",
    billingEmail: "billing@chrobinson.com",
    contactPhone: "(555) 123-4567",
    paymentTerms: "net_30",
    status: "active",
    starRating: 5,
    grade: "A",
    avgDaysToPay: 28,
    onTimeRate: 0.94,
    avgRatePerMileCents: 285,
    loadsYtd: 47,
    revenueYtdCents: 128_500_00,
    detention90d: 1,
  },
  {
    id: "br_02",
    companyName: "Total Quality Logistics",
    mcNumber: "987654",
    dotNumber: "1234567",
    contactName: "Marcus Denton",
    contactEmail: "ops@tql.com",
    billingEmail: "ap@tql.com",
    contactPhone: "(555) 888-0123",
    paymentTerms: "net_30",
    status: "active",
    starRating: 4,
    grade: "B",
    avgDaysToPay: 34,
    onTimeRate: 0.86,
    avgRatePerMileCents: 272,
    loadsYtd: 28,
    revenueYtdCents: 72_420_00,
    detention90d: 3,
  },
  {
    id: "br_03",
    companyName: "XPO Logistics",
    mcNumber: "246810",
    dotNumber: "9876543",
    contactName: "Priya Shah",
    contactEmail: "priya.shah@xpo.com",
    billingEmail: "ap@xpo.com",
    contactPhone: "(555) 420-9988",
    paymentTerms: "net_45",
    status: "active",
    starRating: 3,
    grade: "B",
    avgDaysToPay: 41,
    onTimeRate: 0.81,
    avgRatePerMileCents: 268,
    loadsYtd: 19,
    revenueYtdCents: 51_800_00,
    detention90d: 2,
  },
  {
    id: "br_04",
    companyName: "Coyote Logistics",
    mcNumber: "135791",
    dotNumber: "2468013",
    contactName: "Ryan Kearns",
    contactEmail: "rkearns@coyote.com",
    billingEmail: "ap@coyote.com",
    contactPhone: "(555) 222-7300",
    paymentTerms: "quickpay",
    status: "active",
    starRating: 4,
    grade: "A",
    avgDaysToPay: 2,
    onTimeRate: 0.98,
    avgRatePerMileCents: 292,
    loadsYtd: 12,
    revenueYtdCents: 34_950_00,
    detention90d: 0,
  },
  {
    id: "br_05",
    companyName: "Arrive Logistics",
    mcNumber: "369258",
    dotNumber: "8520147",
    contactName: "Sam Oduya",
    contactEmail: "sam@arrivelogistics.com",
    billingEmail: "billing@arrivelogistics.com",
    contactPhone: "(555) 611-4422",
    paymentTerms: "net_30",
    status: "active",
    starRating: 2,
    grade: "C",
    avgDaysToPay: 52,
    onTimeRate: 0.68,
    avgRatePerMileCents: 258,
    loadsYtd: 9,
    revenueYtdCents: 21_300_00,
    detention90d: 5,
  },
];

export function brokerById(id: string): FixtureBroker | undefined {
  return FIXTURE_BROKERS.find((b) => b.id === id);
}

export const PAYMENT_TERMS_LABEL: Record<PaymentTerms, string> = {
  quickpay: "QuickPay",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
};

export function gradeTone(
  grade: BrokerGrade,
): "success" | "primary" | "warning" | "muted" {
  switch (grade) {
    case "A":
      return "success";
    case "B":
      return "primary";
    case "C":
      return "warning";
    case "D":
      return "muted";
  }
}

export function formatRatePerMile(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
