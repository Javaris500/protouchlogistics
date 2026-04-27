import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { getSession } from "@/server/auth/api";
import { RateLimitError } from "@/server/errors";

/**
 * Per-user (falling back to per-IP) rate-limit middleware for server fns.
 * The motivating use case is paid AI endpoints — `uploadOnboardingPhotoFn`
 * spends real money on every call (Claude Haiku via Vercel AI Gateway), so
 * a logged-in session shouldn't be able to spam it.
 *
 * Bucket store: in-memory `Map`. Per 05-TECH-CONTRACTS §5, this is
 * single-replica only — every Vercel function instance keeps its own
 * counter, so a 20/hour limit becomes 20×N if we ever scale horizontally.
 * Swap to Upstash Redis or a Postgres-backed counter before that happens.
 *
 * Eviction: a 60s timer clears expired buckets so the Map can't grow
 * unbounded. `.unref()` so it doesn't keep the Node process alive.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}

interface UserRateLimitOptions {
  /** Bucket key prefix — pick something stable so different endpoints don't share counters. */
  prefix: string;
  /** Max calls allowed in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Rate-limit by session userId; if no session, fall back to client IP so
 * unauthenticated abuse is also bounded. Returns the same `RateLimitError`
 * (HTTP 429 on the wire) once a bucket is exhausted, with `retryAfterSeconds`
 * in `details` so callers can surface a friendly toast.
 */
export function userRateLimit(opts: UserRateLimitOptions) {
  return createMiddleware({ type: "function" }).server(async ({ next }) => {
    const req = getRequest();
    if (!req) {
      // No request context = nothing we can key off of. Fail closed.
      throw new RateLimitError(60, "No request context");
    }

    const session = await getSession(req.headers).catch(() => null);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      "anon";
    const key = session
      ? `${opts.prefix}:user:${session.id}`
      : `${opts.prefix}:ip:${ip}`;

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    if (bucket.count >= opts.limit) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      throw new RateLimitError(retryAfterSeconds);
    }
    bucket.count++;
    return next();
  });
}
