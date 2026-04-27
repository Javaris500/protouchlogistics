import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/server/env";
import * as schema from "./schema";

/**
 * Single shared postgres-js client. Drizzle wraps it.
 *
 * Connection pool: postgres-js defaults (max 10) are fine for Phase 1's
 * single Vercel deployment. Bump if we move to per-request connections.
 */
const queryClient = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
