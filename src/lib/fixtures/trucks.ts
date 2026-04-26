/**
 * Fixture trucks for frontend development. Matches `trucks` table
 * (02-DATA-MODEL.md §3) joined with assignedDriver.
 */

import type { TruckStatus } from "@/components/ui/status-pill";

export interface FixtureTruck {
  id: string;
  unitNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  plateState: string;
  registrationExpiration: string;
  insuranceExpiration: string;
  annualInspectionExpiration: string;
  currentMileage: number;
  status: TruckStatus;
  assignedDriver: { id: string; firstName: string; lastName: string } | null;
  updatedAt: string;
}

const today = new Date();
const plusDays = (n: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};

export const FIXTURE_TRUCKS: FixtureTruck[] = [
  {
    id: "tr_01",
    unitNumber: "101",
    vin: "1FUJGLD58DLBH2145",
    make: "Freightliner",
    model: "Cascadia",
    year: 2022,
    licensePlate: "MO-887321",
    plateState: "MO",
    registrationExpiration: plusDays(185),
    insuranceExpiration: plusDays(92),
    annualInspectionExpiration: plusDays(47),
    currentMileage: 312_455,
    status: "active",
    assignedDriver: {
      id: "dr_01",
      firstName: "Jordan",
      lastName: "Reeves",
    },
    updatedAt: plusDays(0),
  },
  {
    id: "tr_02",
    unitNumber: "T-205",
    vin: "3AKJHHDR8LSKR8821",
    make: "Kenworth",
    model: "T680",
    year: 2021,
    licensePlate: "MO-441982",
    plateState: "MO",
    registrationExpiration: plusDays(24),
    insuranceExpiration: plusDays(128),
    annualInspectionExpiration: plusDays(210),
    currentMileage: 488_120,
    status: "active",
    assignedDriver: {
      id: "dr_02",
      firstName: "Marcus",
      lastName: "Holloway",
    },
    updatedAt: plusDays(0),
  },
  {
    id: "tr_03",
    unitNumber: "308",
    vin: "1XPBDB9X5ND672411",
    make: "Peterbilt",
    model: "579",
    year: 2023,
    licensePlate: "AZ-221148",
    plateState: "AZ",
    registrationExpiration: plusDays(312),
    insuranceExpiration: plusDays(9),
    annualInspectionExpiration: plusDays(115),
    currentMileage: 142_880,
    status: "active",
    assignedDriver: {
      id: "dr_03",
      firstName: "Sara",
      lastName: "Chen",
    },
    updatedAt: plusDays(-1),
  },
];
