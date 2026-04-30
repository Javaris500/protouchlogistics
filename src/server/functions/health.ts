import { randomUUID } from "node:crypto";

import { createServerFn } from "@tanstack/react-start";
import { del, put } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { env } from "@/server/env";

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

/**
 * Probes Vercel Blob: write a tiny test blob, confirm it with head(), then
 * delete it. Verifies BLOB_READ_WRITE_TOKEN is valid and the store is live.
 * No auth required — the blob is deleted immediately and contains no PII.
 */
export const blobHealthFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    ok: boolean;
    elapsedMs: number;
    error?: string;
  }> => {
    const t0 = Date.now();
    const pathname = `_health/${randomUUID()}.txt`;
    let blobUrl: string | undefined;
    try {
      const result = await put(pathname, "ping", {
        access: "private",
        contentType: "text/plain",
        token: env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
      });
      blobUrl = result.url;
      await del(blobUrl, { token: env.BLOB_READ_WRITE_TOKEN });
      return { ok: true, elapsedMs: Date.now() - t0 };
    } catch (err) {
      if (blobUrl) {
        try {
          await del(blobUrl, { token: env.BLOB_READ_WRITE_TOKEN });
        } catch {
          // best-effort cleanup
        }
      }
      return {
        ok: false,
        elapsedMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
);

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
