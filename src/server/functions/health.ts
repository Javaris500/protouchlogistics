import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";

/**
 * Diagnostic only. Probes DB connectivity from the Vercel function with a
 * short timeout so we can distinguish "DB unreachable" from "auth bug" when
 * sign-in hangs. Returns connection time + server timestamp on success;
 * surfaces the postgres error message + elapsed ms on failure.
 *
 * Safe to leave in — no PII, no writes, no auth required.
 */
/**
 * No-op POST — used to test whether ANY POST server function hangs, or only
 * the auth ones. Returns immediately with the body it received.
 */
export const echoPostFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ ping: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    return { pong: data.ping, at: Date.now() };
  });

export const dbHealthFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    ok: boolean;
    elapsedMs: number;
    serverTime?: string;
    error?: string;
  }> => {
    const t0 = Date.now();
    try {
      const result = await Promise.race([
        db.execute(sql`select now() as ts`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("db-timeout-8s")), 8_000),
        ),
      ]);
      const rows = result as unknown as Array<{ ts: string | Date }>;
      const ts = rows[0]?.ts;
      return {
        ok: true,
        elapsedMs: Date.now() - t0,
        serverTime: ts ? String(ts) : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        elapsedMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
);
