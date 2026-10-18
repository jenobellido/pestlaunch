ALTER TABLE "calls" ADD COLUMN "review" jsonb;--> statement-breakpoint
-- Backfill (hand-written): existing Manager roles get the new calls.review permission,
-- matching DEFAULT_ROLES in core/tenancy/permissions.ts.
UPDATE "tenant_roles" SET "permissions" = array_append("permissions", 'calls.review')
WHERE "name" = 'Manager' AND NOT "is_owner" AND NOT ('calls.review' = ANY("permissions"));
