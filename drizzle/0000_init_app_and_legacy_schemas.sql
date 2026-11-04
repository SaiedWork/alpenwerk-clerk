CREATE SCHEMA "app";
--> statement-breakpoint
CREATE SCHEMA "legacy";
--> statement-breakpoint
CREATE TYPE "app"."audit_actor" AS ENUM('agent', 'human', 'system');--> statement-breakpoint
CREATE TYPE "app"."case_source" AS ENUM('simulator', 'webhook', 'seed');--> statement-breakpoint
CREATE TYPE "app"."case_status" AS ENUM('RECEIVED', 'ANALYZED', 'IDENTIFIED', 'EVALUATED', 'AWAITING_REVIEW', 'EXECUTING', 'VERIFIED', 'REPLY_READY', 'DONE', 'FAILED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "app"."decision" AS ENUM('AUTO_EXECUTE', 'NEEDS_REVIEW', 'REPLY_ONLY');--> statement-breakpoint
CREATE TYPE "app"."event_status" AS ENUM('started', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "app"."intent" AS ENUM('address_change', 'bank_change', 'termination', 'other');--> statement-breakpoint
CREATE TYPE "app"."reply_status" AS ENUM('draft', 'approved', 'simulated_sent', 'rejected');--> statement-breakpoint
CREATE TYPE "app"."review_decision" AS ENUM('approve', 'reject');--> statement-breakpoint
CREATE TYPE "legacy"."mandate_status" AS ENUM('aktiv', 'widerrufen');--> statement-breakpoint
CREATE TYPE "legacy"."policy_status" AS ENUM('aktiv', 'ruhend', 'storniert');--> statement-breakpoint
CREATE TABLE "app"."audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"case_id" uuid,
	"actor" "app"."audit_actor" NOT NULL,
	"action" text NOT NULL,
	"details" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."case_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."case_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"case_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"step" text NOT NULL,
	"status" "app"."event_status" NOT NULL,
	"payload" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "app"."cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"source" "app"."case_source" NOT NULL,
	"status" "app"."case_status" DEFAULT 'RECEIVED' NOT NULL,
	"intent" "app"."intent",
	"confidence" numeric(4, 3),
	"extracted" jsonb,
	"policy_no" text,
	"decision" "app"."decision",
	"reason_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"handling_ms" integer,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."llm_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"response" jsonb NOT NULL,
	"model" text NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."llm_calls" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."llm_calls_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"case_id" uuid,
	"model" text NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cached" boolean NOT NULL,
	"est_cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "app"."replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"template_key" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "app"."reply_status" DEFAULT 'draft' NOT NULL,
	"edited_by_human" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"decision" "app"."review_decision" NOT NULL,
	"note" text,
	"reviewer_label" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."screenshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"step" text NOT NULL,
	"caption" text NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy"."change_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."change_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"policy_id" integer NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy"."customers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"anrede" text NOT NULL,
	"vorname" text NOT NULL,
	"nachname" text NOT NULL,
	"geburtsdatum" date NOT NULL,
	"email" text NOT NULL,
	"strasse" text NOT NULL,
	"hausnr" text NOT NULL,
	"plz" text NOT NULL,
	"ort" text NOT NULL,
	"land" text DEFAULT 'Deutschland' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy"."legacy_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."legacy_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy"."policies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."policies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"policy_no" text NOT NULL,
	"customer_id" integer NOT NULL,
	"produkt" text NOT NULL,
	"status" "legacy"."policy_status" DEFAULT 'aktiv' NOT NULL,
	"beitrag_monatlich" numeric(10, 2) NOT NULL,
	"beginn" date NOT NULL,
	"rueckkaufswert_indikativ" numeric(12, 2) NOT NULL,
	"unwiderrufliche_bezugsberechtigung" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy"."sepa_mandates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."sepa_mandates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customer_id" integer NOT NULL,
	"iban" text NOT NULL,
	"kontoinhaber" text NOT NULL,
	"mandatsref" text NOT NULL,
	"status" "legacy"."mandate_status" DEFAULT 'aktiv' NOT NULL,
	"signed_on" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."audit_log" ADD CONSTRAINT "audit_log_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case_events" ADD CONSTRAINT "case_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."llm_calls" ADD CONSTRAINT "llm_calls_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."replies" ADD CONSTRAINT "replies_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."reviews" ADD CONSTRAINT "reviews_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."screenshots" ADD CONSTRAINT "screenshots_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."change_log" ADD CONSTRAINT "change_log_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "legacy"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."policies" ADD CONSTRAINT "policies_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "legacy"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."sepa_mandates" ADD CONSTRAINT "sepa_mandates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "legacy"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_case_idx" ON "app"."audit_log" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "app"."audit_log" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "case_events_case_seq_idx" ON "app"."case_events" USING btree ("case_id","seq");--> statement-breakpoint
CREATE INDEX "cases_status_idx" ON "app"."cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cases_received_at_idx" ON "app"."cases" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "llm_calls_at_idx" ON "app"."llm_calls" USING btree ("at");--> statement-breakpoint
CREATE INDEX "replies_case_idx" ON "app"."replies" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "reviews_case_idx" ON "app"."reviews" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "screenshots_case_idx" ON "app"."screenshots" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "change_log_policy_idx" ON "legacy"."change_log" USING btree ("policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_users_username_idx" ON "legacy"."legacy_users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "policies_policy_no_idx" ON "legacy"."policies" USING btree ("policy_no");--> statement-breakpoint
CREATE INDEX "policies_customer_idx" ON "legacy"."policies" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sepa_mandates_customer_idx" ON "legacy"."sepa_mandates" USING btree ("customer_id");