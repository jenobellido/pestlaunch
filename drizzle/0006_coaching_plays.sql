CREATE TYPE "public"."play_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TABLE "coaching_plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assignee_id" uuid NOT NULL,
	"assigned_by" uuid,
	"title" text NOT NULL,
	"detail" text,
	"status" "play_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "coaching_plays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "coaching_plays" ADD CONSTRAINT "coaching_plays_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_plays" ADD CONSTRAINT "coaching_plays_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_plays" ADD CONSTRAINT "coaching_plays_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coaching_plays_tenant_id_assignee_id_index" ON "coaching_plays" USING btree ("tenant_id","assignee_id");--> statement-breakpoint
-- Backfill (hand-written): existing Manager roles get the new coaching.manage permission,
-- matching DEFAULT_ROLES in core/tenancy/permissions.ts.
UPDATE "tenant_roles" SET "permissions" = array_append("permissions", 'coaching.manage')
WHERE "name" = 'Manager' AND NOT "is_owner" AND NOT ('coaching.manage' = ANY("permissions"));
