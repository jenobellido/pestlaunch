import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/core/config/env";
import * as schema from "./schema";

function connect() {
  // prepare: false is required by Supabase's transaction pooler in production.
  const client = postgres(serverEnv.DATABASE_URL, { prepare: false });
  return drizzle({ client, schema, casing: "snake_case" });
}
type Db = ReturnType<typeof connect>;

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Db };

/**
 * The database, connected on first use rather than at import, so `next build` (which loads
 * route modules) doesn't need DATABASE_URL.
 */
export const db: Db = new Proxy({} as Db, {
  get(_, key) {
    const real = (globalForDb.db ??= connect());
    const value = Reflect.get(real, key, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
