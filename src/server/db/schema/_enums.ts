import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "driver"]);

export const userStatus = pgEnum("user_status", [
  "invited",
  "pending_approval",
  "active",
  "suspended",
]);

export const cdlClass = pgEnum("cdl_class", ["A", "B", "C"]);

export const truckStatus = pgEnum("truck_status", [
  "active",
  "in_shop",
  "out_of_service",
]);

export const paymentTerms = pgEnum("payment_terms", [
  "net_15",
  "net_30",
  "net_45",
  "net_60",
  "quick_pay",
  "other",
]);

export const loadStatus = pgEnum("load_status", [
  "draft",
  "assigned",
  "accepted",
  "en_route_pickup",
  "at_pickup",
  "loaded",
  "en_route_delivery",
  "at_delivery",
  "delivered",
  "pod_uploaded",
  "completed",
  "cancelled",
]);

export const stopType = pgEnum("stop_type", ["pickup", "delivery"]);

export const documentType = pgEnum("document_type", [
  "driver_cdl",
  "driver_medical",
  "driver_mvr",
  "driver_drug_test",
  "driver_other",
  "truck_registration",
  "truck_insurance",
  "truck_inspection",
  "truck_other",
  "load_bol",
  "load_rate_confirmation",
  "load_pod",
  "load_lumper_receipt",
  "load_scale_ticket",
  "load_other",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
]);

export const notificationType = pgEnum("notification_type", [
  "load_assigned",
  "load_accepted",
  "load_status_changed",
  "load_delivered",
  "document_expiring_60",
  "document_expiring_30",
  "document_expiring_14",
  "document_expiring_7",
  "document_expired",
  "driver_onboarding_submitted",
  "driver_approved",
  "driver_rejected",
  "invoice_sent",
  "invoice_paid",
  "invoice_overdue",
  "system",
]);
