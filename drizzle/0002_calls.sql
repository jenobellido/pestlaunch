CREATE TYPE "public"."call_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"recording_path" text NOT NULL,
	"status" "call_status" DEFAULT 'processing' NOT NULL,
	"error" text,
	"employee_name" text,
	"duration_sec" integer,
	"call_type" text,
	"transcript" jsonb,
	"outcome" jsonb,
	"analyses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_tenant_id_created_at_index" ON "calls" USING btree ("tenant_id","created_at" DESC NULLS LAST);