ALTER TABLE "tenant_members" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_members" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."member_role";