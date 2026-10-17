CREATE TYPE "public"."call_task_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TABLE "call_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"assignee_id" uuid NOT NULL,
	"assigned_by" uuid,
	"title" text NOT NULL,
	"status" "call_task_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "call_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "call_tasks" ADD CONSTRAINT "call_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_tasks" ADD CONSTRAINT "call_tasks_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_tasks" ADD CONSTRAINT "call_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_tasks" ADD CONSTRAINT "call_tasks_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_tasks_tenant_id_assignee_id_index" ON "call_tasks" USING btree ("tenant_id","assignee_id");--> statement-breakpoint
CREATE INDEX "call_tasks_call_id_index" ON "call_tasks" USING btree ("call_id");