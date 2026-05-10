-- Company-level documents: docs not tied to a specific driver/truck/load
-- (MC authority, W-9, liability/cargo insurance certs, etc.).
--
-- Two changes:
--   1. New `company_*` values on the document_type enum.
--   2. Relax the documents_owner_exclusive CHECK from "exactly one owner FK
--      non-null" to "at most one", so a row with all three FKs null is
--      allowed (a company-level doc).

ALTER TYPE "public"."document_type" ADD VALUE 'company_mc_authority';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'company_operating_authority';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'company_w9';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'company_liability_insurance';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'company_cargo_insurance';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'company_other';--> statement-breakpoint

ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_owner_exclusive";--> statement-breakpoint

ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_exclusive" CHECK (
  ("driver_profile_id" IS NOT NULL)::int +
  ("truck_id" IS NOT NULL)::int +
  ("load_id" IS NOT NULL)::int <= 1
);