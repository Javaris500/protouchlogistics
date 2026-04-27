-- Required extensions. Must run before any citext column or trigram index.
-- 02-DATA-MODEL.md §0; brief 09-INFRA-AND-AUTH.md §3.3.
CREATE EXTENSION IF NOT EXISTS "citext";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."cdl_class" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('driver_cdl', 'driver_medical', 'driver_mvr', 'driver_drug_test', 'driver_other', 'truck_registration', 'truck_insurance', 'truck_inspection', 'truck_other', 'load_bol', 'load_rate_confirmation', 'load_pod', 'load_lumper_receipt', 'load_scale_ticket', 'load_other');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'void');--> statement-breakpoint
CREATE TYPE "public"."load_status" AS ENUM('draft', 'assigned', 'accepted', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'at_delivery', 'delivered', 'pod_uploaded', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('load_assigned', 'load_accepted', 'load_status_changed', 'load_delivered', 'document_expiring_60', 'document_expiring_30', 'document_expiring_14', 'document_expiring_7', 'document_expired', 'driver_onboarding_submitted', 'driver_approved', 'driver_rejected', 'invoice_sent', 'invoice_paid', 'invoice_overdue', 'system');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('net_15', 'net_30', 'net_45', 'net_60', 'quick_pay', 'other');--> statement-breakpoint
CREATE TYPE "public"."stop_type" AS ENUM('pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."truck_status" AS ENUM('active', 'in_shop', 'out_of_service');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'driver');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'pending_approval', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"changes" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text,
	"role" "user_role" NOT NULL,
	"status" "user_status" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"last_login_at" timestamp with time zone,
	"first_login_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brokers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"mc_number" text,
	"dot_number" text,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" "citext" NOT NULL,
	"billing_email" "citext",
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state" varchar(2) NOT NULL,
	"zip" text NOT NULL,
	"payment_terms" "payment_terms" NOT NULL,
	"payment_terms_other" text,
	"credit_rating" text,
	"star_rating" smallint DEFAULT 0 NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "document_type" NOT NULL,
	"blob_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"driver_profile_id" uuid,
	"truck_id" uuid,
	"load_id" uuid,
	"expiration_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"dob" date NOT NULL,
	"phone" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state" varchar(2) NOT NULL,
	"zip" text NOT NULL,
	"emergency_contact_name" text NOT NULL,
	"emergency_contact_phone" text NOT NULL,
	"emergency_contact_relation" text NOT NULL,
	"cdl_number" text NOT NULL,
	"cdl_class" "cdl_class" NOT NULL,
	"cdl_state" varchar(2) NOT NULL,
	"cdl_expiration" date NOT NULL,
	"medical_card_expiration" date NOT NULL,
	"hire_date" date NOT NULL,
	"assigned_truck_id" uuid,
	"notes" text,
	"onboarding_state" text,
	"onboarding_started_at" timestamp with time zone,
	"onboarding_completed_at" timestamp with time zone,
	"voice_consent_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_number" text NOT NULL,
	"vin" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"license_plate" text NOT NULL,
	"plate_state" varchar(2) NOT NULL,
	"registration_expiration" date NOT NULL,
	"insurance_expiration" date NOT NULL,
	"annual_inspection_expiration" date NOT NULL,
	"current_mileage" integer NOT NULL,
	"status" "truck_status" NOT NULL,
	"assigned_driver_id" uuid,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "load_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"from_status" "load_status",
	"to_status" "load_status" NOT NULL,
	"changed_by_user_id" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"location_lat" numeric(10, 7),
	"location_lng" numeric(10, 7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "load_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"sequence" smallint NOT NULL,
	"stop_type" "stop_type" NOT NULL,
	"company_name" text,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state" varchar(2) NOT NULL,
	"zip" text NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"arrived_at" timestamp with time zone,
	"departed_at" timestamp with time zone,
	"contact_name" text,
	"contact_phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_number" text NOT NULL,
	"broker_id" uuid NOT NULL,
	"assigned_driver_id" uuid,
	"assigned_truck_id" uuid,
	"status" "load_status" NOT NULL,
	"rate" integer NOT NULL,
	"miles" integer,
	"driver_pay_cents" integer,
	"driver_pay_updated_at" timestamp with time zone,
	"commodity" text NOT NULL,
	"weight" integer,
	"pieces" integer,
	"special_instructions" text,
	"reference_number" text,
	"bol_number" text,
	"created_by_user_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_locations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"driver_profile_id" uuid NOT NULL,
	"load_id" uuid,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"accuracy_meters" real,
	"heading_degrees" real,
	"speed_mps" real,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "display_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_pay_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_profile_id" uuid NOT NULL,
	"load_id" uuid NOT NULL,
	"calculated_amount_cents" integer NOT NULL,
	"adjustments_cents" integer DEFAULT 0 NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"load_id" uuid,
	"description" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"broker_id" uuid NOT NULL,
	"status" "invoice_status" NOT NULL,
	"subtotal_cents" bigint NOT NULL,
	"adjustments_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"paid_amount_cents" bigint,
	"payment_method" text,
	"pdf_url" text,
	"notes" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pod_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"pod_document_id" uuid NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"sent_to_email" text NOT NULL,
	"pdf_key" text NOT NULL,
	"delivery_attempts" integer DEFAULT 1 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "settlement_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_profile_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_cents" bigint NOT NULL,
	"load_count" integer NOT NULL,
	"pdf_url" text NOT NULL,
	"pdf_key" text NOT NULL,
	"email_sent_at" timestamp with time zone,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link_url" text,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_driver_profile_id_driver_profiles_id_fk" FOREIGN KEY ("driver_profile_id") REFERENCES "public"."driver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_assigned_truck_id_trucks_id_fk" FOREIGN KEY ("assigned_truck_id") REFERENCES "public"."trucks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_assigned_driver_id_driver_profiles_id_fk" FOREIGN KEY ("assigned_driver_id") REFERENCES "public"."driver_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_status_history" ADD CONSTRAINT "load_status_history_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_status_history" ADD CONSTRAINT "load_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_broker_id_brokers_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."brokers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_assigned_driver_id_driver_profiles_id_fk" FOREIGN KEY ("assigned_driver_id") REFERENCES "public"."driver_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_assigned_truck_id_trucks_id_fk" FOREIGN KEY ("assigned_truck_id") REFERENCES "public"."trucks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driver_profile_id_driver_profiles_id_fk" FOREIGN KEY ("driver_profile_id") REFERENCES "public"."driver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_tokens" ADD CONSTRAINT "display_tokens_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_pay_records" ADD CONSTRAINT "driver_pay_records_driver_profile_id_driver_profiles_id_fk" FOREIGN KEY ("driver_profile_id") REFERENCES "public"."driver_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_pay_records" ADD CONSTRAINT "driver_pay_records_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_broker_id_brokers_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."brokers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_deliveries" ADD CONSTRAINT "pod_deliveries_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_deliveries" ADD CONSTRAINT "pod_deliveries_pod_document_id_documents_id_fk" FOREIGN KEY ("pod_document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_statements" ADD CONSTRAINT "settlement_statements_driver_profile_id_driver_profiles_id_fk" FOREIGN KEY ("driver_profile_id") REFERENCES "public"."driver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_user_created_idx" ON "audit_log" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "invites_token_key" ON "invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invites_email_idx" ON "invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "brokers_mc_unique" ON "brokers" USING btree ("mc_number") WHERE "brokers"."mc_number" IS NOT NULL AND "brokers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "brokers_company_name_idx" ON "brokers" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "documents_driver_idx" ON "documents" USING btree ("driver_profile_id");--> statement-breakpoint
CREATE INDEX "documents_truck_idx" ON "documents" USING btree ("truck_id");--> statement-breakpoint
CREATE INDEX "documents_load_idx" ON "documents" USING btree ("load_id");--> statement-breakpoint
CREATE INDEX "documents_expiration_idx" ON "documents" USING btree ("expiration_date") WHERE "documents"."expiration_date" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "driver_profiles_cdl_expiration_idx" ON "driver_profiles" USING btree ("cdl_expiration");--> statement-breakpoint
CREATE INDEX "driver_profiles_medical_expiration_idx" ON "driver_profiles" USING btree ("medical_card_expiration");--> statement-breakpoint
CREATE UNIQUE INDEX "trucks_unit_number_key" ON "trucks" USING btree ("unit_number");--> statement-breakpoint
CREATE UNIQUE INDEX "trucks_vin_key" ON "trucks" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "trucks_status_idx" ON "trucks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "load_status_history_load_idx" ON "load_status_history" USING btree ("load_id","changed_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "load_stops_load_sequence_key" ON "load_stops" USING btree ("load_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "loads_load_number_key" ON "loads" USING btree ("load_number");--> statement-breakpoint
CREATE INDEX "loads_assigned_driver_status_idx" ON "loads" USING btree ("assigned_driver_id","status");--> statement-breakpoint
CREATE INDEX "loads_status_created_idx" ON "loads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "loads_broker_idx" ON "loads" USING btree ("broker_id");--> statement-breakpoint
CREATE INDEX "driver_locations_driver_recorded_idx" ON "driver_locations" USING btree ("driver_profile_id","recorded_at" DESC);--> statement-breakpoint
CREATE INDEX "driver_locations_load_recorded_idx" ON "driver_locations" USING btree ("load_id","recorded_at");--> statement-breakpoint
CREATE INDEX "driver_locations_recorded_brin_idx" ON "driver_locations" USING brin ("recorded_at") WITH (pages_per_range=32);--> statement-breakpoint
CREATE UNIQUE INDEX "driver_locations_idem_key" ON "driver_locations" USING btree ("driver_profile_id","load_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "display_tokens_token_key" ON "display_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_pay_records_load_key" ON "driver_pay_records" USING btree ("load_id");--> statement-breakpoint
CREATE INDEX "driver_pay_records_driver_created_idx" ON "driver_pay_records" USING btree ("driver_profile_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "driver_pay_records_unpaid_idx" ON "driver_pay_records" USING btree ("paid_at") WHERE "driver_pay_records"."paid_at" IS NULL;--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_line_items_load_idx" ON "invoice_line_items" USING btree ("load_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_broker_idx" ON "invoices" USING btree ("broker_id");--> statement-breakpoint
CREATE INDEX "invoices_status_due_idx" ON "invoices" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "pod_deliveries_load_idx" ON "pod_deliveries" USING btree ("load_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_statements_driver_period_key" ON "settlement_statements" USING btree ("driver_profile_id","period_start");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at","created_at" DESC);--> statement-breakpoint
-- documents is polymorphic: exactly one of (driver_profile_id, truck_id, load_id) is non-null.
-- Drizzle does not emit cross-column CHECKs from the schema, so the constraint
-- is added explicitly here. Per 02-DATA-MODEL.md §6.
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_exclusive" CHECK (
  ("driver_profile_id" IS NOT NULL)::int +
  ("truck_id" IS NOT NULL)::int +
  ("load_id" IS NOT NULL)::int = 1
);