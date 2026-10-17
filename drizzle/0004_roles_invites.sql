CREATE TABLE "tenant_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role_id" uuid NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "tenant_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_roles_tenantId_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
ALTER TABLE "tenant_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD COLUMN "role_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "employee_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_role_id_tenant_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."tenant_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_roles" ADD CONSTRAINT "tenant_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_invites_tenant_id_index" ON "tenant_invites" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_roles_tenant_id_index" ON "tenant_roles" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_role_id_tenant_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."tenant_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill (hand-written): give every existing tenant the default roles (same as
-- DEFAULT_ROLES in core/tenancy/permissions.ts), point members at them, copy display names.
INSERT INTO "tenant_roles" ("tenant_id", "name", "permissions", "is_owner")
SELECT t."id", r."name", r."permissions", r."is_owner"
FROM "tenants" t
CROSS JOIN (VALUES
	('Owner', ARRAY['calls.upload','calls.view_all','calls.assign','calls.delete','team.manage','roles.manage','company.manage','modules.manage']::text[], true),
	('Manager', ARRAY['calls.upload','calls.view_all','calls.assign','calls.delete','team.manage']::text[], false),
	('Rep', ARRAY['calls.upload']::text[], false)
) AS r("name", "permissions", "is_owner")
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "tenant_members" m SET "role_id" = r."id"
FROM "tenant_roles" r
WHERE r."tenant_id" = m."tenant_id"
	AND r."name" = CASE m."role" WHEN 'owner' THEN 'Owner' WHEN 'manager' THEN 'Manager' ELSE 'Rep' END;--> statement-breakpoint
UPDATE "tenant_members" m SET "display_name" = COALESCE(NULLIF(u."raw_user_meta_data"->>'full_name', ''), split_part(u."email", '@', 1))
FROM "auth"."users" u
WHERE u."id" = m."user_id";
