CREATE TYPE "public"."lead_stage" AS ENUM('new', 'contacted', 'booked', 'lost');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"customer_name" text,
	"need" text,
	"price_quoted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_callId_unique" UNIQUE("call_id")
);
--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_tenant_id_stage_index" ON "leads" USING btree ("tenant_id","stage");--> statement-breakpoint
-- Backfill (hand-written): a lead for every analyzed new-customer call, taking the customer
-- name, pest and price from the call's extracted details when present.
INSERT INTO "leads" ("tenant_id", "call_id", "stage", "customer_name", "need", "price_quoted", "created_at", "updated_at")
SELECT c."tenant_id", c."id",
	(CASE WHEN c."outcome"->>'resolution' = 'booked' THEN 'booked' ELSE 'new' END)::"lead_stage",
	(SELECT d->>'value' FROM jsonb_array_elements(c."outcome"->'details') d WHERE d->>'label' = 'Customer name' LIMIT 1),
	(SELECT d->>'value' FROM jsonb_array_elements(c."outcome"->'details') d WHERE d->>'label' = 'Pest' LIMIT 1),
	(SELECT d->>'value' FROM jsonb_array_elements(c."outcome"->'details') d WHERE d->>'label' = 'Price quoted' LIMIT 1),
	c."created_at", now()
FROM "calls" c
WHERE c."call_type" = 'new_customer' AND c."outcome" IS NOT NULL
ON CONFLICT ("call_id") DO NOTHING;
