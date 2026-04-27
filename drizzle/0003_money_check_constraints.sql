-- Money safety: defense in depth. App-layer Zod validation already rejects
-- negative amounts; these CHECKs make the database the second line so a
-- buggy code path can't insert -$500 of driver pay.
--
-- Phase 1 production hardening — added 2026-04-26.

ALTER TABLE "loads"
  ADD CONSTRAINT "loads_rate_nonneg_check"
    CHECK ("rate" >= 0);

ALTER TABLE "loads"
  ADD CONSTRAINT "loads_driver_pay_nonneg_check"
    CHECK ("driver_pay_cents" IS NULL OR "driver_pay_cents" >= 0);

ALTER TABLE "loads"
  ADD CONSTRAINT "loads_miles_nonneg_check"
    CHECK ("miles" IS NULL OR "miles" >= 0);

ALTER TABLE "loads"
  ADD CONSTRAINT "loads_weight_nonneg_check"
    CHECK ("weight" IS NULL OR "weight" >= 0);

ALTER TABLE "loads"
  ADD CONSTRAINT "loads_pieces_nonneg_check"
    CHECK ("pieces" IS NULL OR "pieces" >= 0);

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_subtotal_nonneg_check"
    CHECK ("subtotal_cents" >= 0);

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_total_nonneg_check"
    CHECK ("total_cents" >= 0);

ALTER TABLE "invoice_line_items"
  ADD CONSTRAINT "invoice_line_items_amount_nonneg_check"
    CHECK ("amount_cents" >= 0);

ALTER TABLE "driver_pay_records"
  ADD CONSTRAINT "driver_pay_records_calculated_nonneg_check"
    CHECK ("calculated_amount_cents" >= 0);

ALTER TABLE "driver_pay_records"
  ADD CONSTRAINT "driver_pay_records_total_nonneg_check"
    CHECK ("total_amount_cents" >= 0);

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_file_size_positive_check"
    CHECK ("file_size_bytes" > 0);
