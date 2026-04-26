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

export const FIXTURE_DOCUMENTS: FixtureDocument[] = [];
