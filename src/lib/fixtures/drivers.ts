/**
 * Fixture drivers for frontend development. Matches `driver_profiles`
 * (02-DATA-MODEL.md §2) joined with `users` for status + email.
 */

import type { DriverStatus } from "@/components/ui/status-pill";

export type PayModel = "percent_of_rate" | "per_mile" | "flat_per_load";

export interface FixtureDriver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: DriverStatus;
  hireDate: string | null;
  cdlNumber: string;
  cdlClass: "A" | "B" | "C";
  cdlState: string;
  cdlExpiration: string;
  medicalExpiration: string;
  payModel: PayModel;
  /** Basis points (percent_of_rate), cents/mile (per_mile), or cents (flat_per_load). */
  payRate: number;
  assignedTruck: { id: string; unitNumber: string } | null;
  loadsThisYear: number;
  updatedAt: string;
}

const today = new Date();
const plusDays = (n: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};

export const FIXTURE_DRIVERS: FixtureDriver[] = [
  {
    id: "dr_01",
    firstName: "Jordan",
    lastName: "Reeves",
    email: "jordan.reeves@protouch.co",
    phone: "+18165550123",
    city: "Kansas City",
    state: "MO",
    status: "active",
    hireDate: "2023-05-14",
    cdlNumber: "MO-D8821-R14",
    cdlClass: "A",
    cdlState: "MO",
    cdlExpiration: plusDays(420),
    medicalExpiration: plusDays(330),
    payModel: "percent_of_rate",
    payRate: 2500, // 25.00%
    assignedTruck: { id: "tr_01", unitNumber: "101" },
    loadsThisYear: 42,
    updatedAt: plusDays(0),
  },
  {
    id: "dr_02",
    firstName: "Marcus",
    lastName: "Holloway",
    email: "marcus.holloway@protouch.co",
    phone: "+12145550145",
    city: "Dallas",
    state: "TX",
    status: "active",
    hireDate: "2022-11-02",
    cdlNumber: "TX-M4412-H08",
    cdlClass: "A",
    cdlState: "TX",
    cdlExpiration: plusDays(68), // expiring soon
    medicalExpiration: plusDays(280),
    payModel: "per_mile",
    payRate: 55, // 55¢/mile
    assignedTruck: { id: "tr_02", unitNumber: "T-205" },
    loadsThisYear: 58,
    updatedAt: plusDays(-1),
  },
  {
    id: "dr_03",
    firstName: "Sara",
    lastName: "Chen",
    email: "sara.chen@protouch.co",
    phone: "+16025550167",
    city: "Phoenix",
    state: "AZ",
    status: "active",
    hireDate: "2024-01-08",
    cdlNumber: "AZ-C7721-S31",
    cdlClass: "A",
    cdlState: "AZ",
    cdlExpiration: plusDays(620),
    medicalExpiration: plusDays(24), // expiring very soon
    payModel: "flat_per_load",
    payRate: 55000, // $550/load
    assignedTruck: { id: "tr_03", unitNumber: "308" },
    loadsThisYear: 31,
    updatedAt: plusDays(-2),
  },
  {
    id: "dr_04",
    firstName: "Tyrone",
    lastName: "Hill",
    email: "tyrone.hill@protouch.co",
    phone: "+19015550189",
    city: "Memphis",
    state: "TN",
    status: "pending_approval",
    hireDate: null,
    cdlNumber: "TN-H9912-T05",
    cdlClass: "A",
    cdlState: "TN",
    cdlExpiration: plusDays(580),
    medicalExpiration: plusDays(410),
    payModel: "percent_of_rate",
    payRate: 2500,
    assignedTruck: null,
    loadsThisYear: 0,
    updatedAt: plusDays(-1),
  },
  {
    id: "dr_05",
    firstName: "Dave",
    lastName: "Gonzalez",
    email: "dave.gonzalez@protouch.co",
    phone: "+12105550212",
    city: "San Antonio",
    state: "TX",
    status: "suspended",
    hireDate: "2021-06-30",
    cdlNumber: "TX-G3301-D12",
    cdlClass: "A",
    cdlState: "TX",
    cdlExpiration: plusDays(-14), // expired
    medicalExpiration: plusDays(-60), // expired
    payModel: "per_mile",
    payRate: 50,
    assignedTruck: null,
    loadsThisYear: 12,
    updatedAt: plusDays(-30),
  },
  {
    id: "dr_06",
    firstName: "Alicia",
    lastName: "Knox",
    email: "alicia.knox@protouch.co",
    phone: "+14045550284",
    city: "Atlanta",
    state: "GA",
    status: "invited",
    hireDate: null,
    cdlNumber: "",
    cdlClass: "A",
    cdlState: "GA",
    cdlExpiration: plusDays(365),
    medicalExpiration: plusDays(365),
    payModel: "percent_of_rate",
    payRate: 2500,
    assignedTruck: null,
    loadsThisYear: 0,
    updatedAt: plusDays(-3),
  },
];

export const PAY_MODEL_LABEL: Record<PayModel, string> = {
  percent_of_rate: "% of rate",
  per_mile: "Per mile",
  flat_per_load: "Flat / load",
};

export function formatPayRate(d: FixtureDriver): string {
  switch (d.payModel) {
    case "percent_of_rate":
      return `${(d.payRate / 100).toFixed(1)}%`;
    case "per_mile":
      return `$${(d.payRate / 100).toFixed(2)}/mi`;
    case "flat_per_load":
      return `$${(d.payRate / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}/load`;
  }
}

/** Days until the nearest-expiring compliance doc. Negative = expired. */
export function driverNextExpiration(
  d: FixtureDriver,
  today = new Date(),
): { days: number; label: "CDL" | "Medical"; date: string } {
  const items: { label: "CDL" | "Medical"; date: string }[] = [
    { label: "CDL", date: d.cdlExpiration },
    { label: "Medical", date: d.medicalExpiration },
  ];
  const sorted = items
    .map((i) => ({
      ...i,
      days: Math.floor(
        (new Date(i.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }))
    .sort((a, b) => a.days - b.days);
  // Safe: items has two entries by construction.
  return sorted[0] ?? { label: "CDL", days: 0, date: d.cdlExpiration };
}

export function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return e164;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
