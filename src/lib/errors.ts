/**
 * Client-side error normalizer. Server functions throw `AppError` subclasses
 * (see 05-TECH-CONTRACTS §3) which serialize to `{ ok: false, error: { code, message, details } }`
 * over the wire. TanStack Query exposes the deserialized error on
 * `query.error` — this helper extracts a user-facing message + a dev-only
 * technical blob for QueryBoundary's ErrorState.
 *
 * AuthError from src/server/auth/api.ts (UNAUTHORIZED / FORBIDDEN /
 * INVITE_INVALID / INVITE_EXPIRED) is the same shape — `code` + `message`.
 */

type KnownErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "BUSINESS_RULE_VIOLATED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "INVITE_INVALID"
  | "INVITE_EXPIRED";

interface NormalizedError {
  code?: KnownErrorCode | string;
  message?: string;
}

function asNormalizedError(err: unknown): NormalizedError | null {
  if (typeof err !== "object" || err === null) return null;
  const obj = err as Record<string, unknown>;
  const code = typeof obj.code === "string" ? obj.code : undefined;
  const message = typeof obj.message === "string" ? obj.message : undefined;
  if (!code && !message) return null;
  return { code, message };
}

export function errorMessage(err: unknown): string {
  const e = asNormalizedError(err);
  if (!e) return "Something went wrong. Try again.";

  switch (e.code) {
    case "VALIDATION_FAILED":
      return "Some fields were invalid. Check the form and try again.";
    case "FORBIDDEN":
      return "You don't have access to this action.";
    case "NOT_FOUND":
      return "We couldn't find what you were looking for.";
    case "BUSINESS_RULE_VIOLATED":
      return e.message ?? "That isn't allowed right now.";
    case "RATE_LIMITED":
      return "Too many requests. Try again in a few seconds.";
    case "UNAUTHORIZED":
      return "Your session expired. Sign in again.";
    case "INVITE_INVALID":
    case "INVITE_EXPIRED":
      return "That invite is no longer valid.";
    case "CONFLICT":
      return e.message ?? "That conflicts with existing data.";
    default:
      return e.message ?? "Something went wrong. Try again.";
  }
}

export function errorTechnical(err: unknown): string | undefined {
  if (import.meta.env.PROD) return undefined;
  try {
    if (err instanceof Error) {
      return `${err.name}: ${err.message}\n${err.stack ?? ""}`;
    }
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}
