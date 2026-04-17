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
    unitNumber: "T-301",
    vin: "1XPBDB9X5ND672411",
    make: "Peterbilt",
    model: "579",
    year: 2023,
    licensePlate: "KS-221148",
    plateState: "KS",
    registrationExpiration: plusDays(312),
    insuranceExpiration: plusDays(9),
    annualInspectionExpiration: plusDays(115),
    currentMileage: 142_880,
    status: "active",
    assignedDriver: {
      id: "dr_03",
      firstName: "Terrell",
      lastName: "Mason",
    },
    updatedAt: plusDays(-1),
  },
  {
    id: "tr_04",
    unitNumber: "T-402",
    vin: "1FUJGHDV3DLBS5578",
    make: "Freightliner",
    model: "Cascadia",
    year: 2020,
    licensePlate: "AR-990112",
    plateState: "AR",
    registrationExpiration: plusDays(64),
    insuranceExpiration: plusDays(178),
    annualInspectionExpiration: plusDays(-4),
    currentMileage: 612_300,
    status: "in_shop",
    assignedDriver: {
      id: "dr_04",
      firstName: "Devon",
      lastName: "Walker",
    },
    updatedAt: plusDays(-2),
  },
  {
    id: "tr_05",
    unitNumber: "T-118",
    vin: "1M1AN07Y4LM031902",
    make: "Mack",
    model: "Anthem",
    year: 2019,
    licensePlate: "MO-118221",
    plateState: "MO",
    registrationExpiration: plusDays(-12),
    insuranceExpiration: plusDays(301),
    annualInspectionExpiration: plusDays(56),
    currentMileage: 798_455,
    status: "out_of_service",
    assignedDriver: null,
    updatedAt: plusDays(-21),
  },
  {
    id: "tr_06",
    unitNumber: "T-510",
    vin: "3AKJHHDR1MSNL4402",
    make: "Kenworth",
    model: "W990",
    year: 2024,
    licensePlate: "MO-510887",
    plateState: "MO",
    registrationExpiration: plusDays(285),
    insuranceExpiration: plusDays(255),
    annualInspectionExpiration: plusDays(340),
    currentMileage: 42_110,
    status: "active",
    assignedDriver: null,
    updatedAt: plusDays(-3),
  },
];
