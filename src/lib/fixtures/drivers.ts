/**
 * Fixture drivers for frontend development. Matches `driver_profiles`
 * (02-DATA-MODEL.md §2) joined with `users` for status + email.
 */

import type { DriverStatus } from "@/components/ui/status-pill";

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
    // CDL expiring within 90 days — exercises expiring-soon UI.
    cdlExpiration: plusDays(68),
    medicalExpiration: plusDays(280),
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
    // Medical expiring very soon — exercises urgent warning styling.
    medicalExpiration: plusDays(24),
    assignedTruck: { id: "tr_03", unitNumber: "308" },
    loadsThisYear: 31,
    updatedAt: plusDays(-2),
  },
];

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
