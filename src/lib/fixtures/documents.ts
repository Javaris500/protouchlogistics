/**
 * Fixture documents for frontend development. Replace with server-function
 * data once the backend contracts in 05-TECH-CONTRACTS.md §9.6 are wired up.
 */

export type DocType =
  | "driver_cdl"
  | "driver_medical"
  | "driver_mvr"
  | "driver_drug_test"
  | "driver_other"
  | "truck_registration"
  | "truck_insurance"
  | "truck_inspection"
  | "truck_other"
  | "load_bol"
  | "load_rate_confirmation"
  | "load_pod"
  | "load_lumper_receipt"
  | "load_scale_ticket"
  | "load_other";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  driver_cdl: "CDL",
  driver_medical: "Medical card",
  driver_mvr: "MVR",
  driver_drug_test: "Drug test",
  driver_other: "Other (driver)",
  truck_registration: "Registration",
  truck_insurance: "Insurance",
  truck_inspection: "Annual inspection",
  truck_other: "Other (truck)",
  load_bol: "BOL",
  load_rate_confirmation: "Rate confirmation",
  load_pod: "POD",
  load_lumper_receipt: "Lumper receipt",
  load_scale_ticket: "Scale ticket",
  load_other: "Other (load)",
};

export type DocCategory = "driver" | "truck" | "load";

export function docCategory(type: DocType): DocCategory {
  if (type.startsWith("driver_")) return "driver";
  if (type.startsWith("truck_")) return "truck";
  return "load";
}

export interface FixtureDocument {
  id: string;
  type: DocType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedBy: string;
  /** Who or what this doc belongs to */
  owner: {
    kind: DocCategory;
    id: string;
    label: string;
  };
  expirationDate: string | null;
  createdAt: string;
}

const now = new Date();
const d = (offsetDays: number) => {
  const x = new Date(now);
  x.setDate(x.getDate() + offsetDays);
  x.setHours(12, 0, 0, 0);
  return x.toISOString();
};

export const FIXTURE_DOCUMENTS: FixtureDocument[] = [
  // Driver docs — Jordan Reeves
  {
    id: "doc_01",
    type: "driver_cdl",
    fileName: "reeves_cdl_front.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 2_400_000,
    uploadedBy: "Jordan Reeves",
    owner: { kind: "driver", id: "dr_01", label: "Jordan Reeves" },
    expirationDate: d(45),
    createdAt: d(-60),
  },
  {
    id: "doc_02",
    type: "driver_medical",
    fileName: "reeves_medical_card.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 850_000,
    uploadedBy: "Jordan Reeves",
    owner: { kind: "driver", id: "dr_01", label: "Jordan Reeves" },
    expirationDate: d(12),
    createdAt: d(-60),
  },
  {
    id: "doc_03",
    type: "driver_mvr",
    fileName: "reeves_mvr_2026.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 420_000,
    uploadedBy: "Gary Tavel",
    owner: { kind: "driver", id: "dr_01", label: "Jordan Reeves" },
    expirationDate: d(320),
    createdAt: d(-30),
  },
  // Driver docs — Marcus Holloway
  {
    id: "doc_04",
    type: "driver_cdl",
    fileName: "holloway_cdl.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 1_100_000,
    uploadedBy: "Marcus Holloway",
    owner: { kind: "driver", id: "dr_02", label: "Marcus Holloway" },
    expirationDate: d(180),
    createdAt: d(-45),
  },
  {
    id: "doc_05",
    type: "driver_medical",
    fileName: "holloway_medical.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 1_800_000,
    uploadedBy: "Marcus Holloway",
    owner: { kind: "driver", id: "dr_02", label: "Marcus Holloway" },
    expirationDate: d(-3),
    createdAt: d(-200),
  },
  // Driver docs — Terrell Mason
  {
    id: "doc_06",
    type: "driver_cdl",
    fileName: "mason_cdl_scan.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 950_000,
    uploadedBy: "Terrell Mason",
    owner: { kind: "driver", id: "dr_03", label: "Terrell Mason" },
    expirationDate: d(25),
    createdAt: d(-90),
  },
  {
    id: "doc_07",
    type: "driver_medical",
    fileName: "mason_medical.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 720_000,
    uploadedBy: "Terrell Mason",
    owner: { kind: "driver", id: "dr_03", label: "Terrell Mason" },
    expirationDate: d(90),
    createdAt: d(-90),
  },
  // Truck docs
  {
    id: "doc_08",
    type: "truck_registration",
    fileName: "truck_101_registration.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 600_000,
    uploadedBy: "Gary Tavel",
    owner: { kind: "truck", id: "tr_01", label: "Truck 101" },
    expirationDate: d(200),
    createdAt: d(-120),
  },
  {
    id: "doc_09",
    type: "truck_insurance",
    fileName: "fleet_insurance_2026.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 3_200_000,
    uploadedBy: "Gary Tavel",
    owner: { kind: "truck", id: "tr_01", label: "Truck 101" },
    expirationDate: d(8),
    createdAt: d(-350),
  },
  {
    id: "doc_10",
    type: "truck_inspection",
    fileName: "truck_101_annual_inspection.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 1_500_000,
    uploadedBy: "Gary Tavel",
    owner: { kind: "truck", id: "tr_01", label: "Truck 101" },
    expirationDate: d(55),
    createdAt: d(-310),
  },
  {
    id: "doc_11",
    type: "truck_registration",
    fileName: "truck_t205_reg.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 580_000,
    uploadedBy: "Gary Tavel",
    owner: { kind: "truck", id: "tr_02", label: "Truck T-205" },
    expirationDate: d(150),
    createdAt: d(-100),
  },
  {
    id: "doc_12",
    type: "truck_insurance",
    fileName: "truck_t205_insurance.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 2_800_000,
    uploadedBy: "Gary Tavel",
    owner: { kind: "truck", id: "tr_02", label: "Truck T-205" },
    expirationDate: d(-10),
    createdAt: d(-365),
  },
  // Load docs
  {
    id: "doc_13",
    type: "load_rate_confirmation",
    fileName: "ptl_2026_0142_ratecon.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 340_000,
    uploadedBy: "Gary Tavel",
    owner: { kind: "load", id: "ld_01", label: "PTL-2026-0142" },
    expirationDate: null,
    createdAt: d(-2),
  },
  {
    id: "doc_14",
    type: "load_bol",
    fileName: "ptl_2026_0142_bol.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 4_100_000,
    uploadedBy: "Jordan Reeves",
    owner: { kind: "load", id: "ld_01", label: "PTL-2026-0142" },
    expirationDate: null,
    createdAt: d(-1),
  },
  {
    id: "doc_15",
    type: "load_pod",
    fileName: "ptl_2026_0139_pod.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 3_500_000,
    uploadedBy: "Jordan Reeves",
    owner: { kind: "load", id: "ld_04", label: "PTL-2026-0139" },
    expirationDate: null,
    createdAt: d(-3),
  },
];
