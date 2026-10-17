import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  // Core tables plus each module's own tables.
  schema: ["./core/db/schema.ts", "./modules/*/server/schema.ts"],
  out: "./drizzle",
  casing: "snake_case",
  schemaFilter: ["public"],
  entities: { roles: { provider: "supabase" } },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
