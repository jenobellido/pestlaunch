import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/core/config/env";
import * as schema from "./schema";

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

// prepare: false is required by Supabase's transaction pooler in production.
const client = globalForDb.pgClient ?? postgres(serverEnv.DATABASE_URL, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle({ client, schema, casing: "snake_case" });
