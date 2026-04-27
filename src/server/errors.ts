/**
 * Server-side error hierarchy. Per 05-TECH-CONTRACTS §3 — every server
 * function throws a subclass of `AppError`. The wire layer (TanStack Start
 * server-fn boundary) serializes these to a `{ ok:false, error:{ code, message } }`
 * envelope; client-side `src/lib/errors.ts` normalizes it for UI display.
 *
 * Note: Session 1 already ships `AuthError` from `src/server/auth/api.ts` for
 * UNAUTHORIZED / FORBIDDEN / INVITE_*. We don't reuse it as the base because
 * it predates this file and isn't a subclass — instead, keep both in
 * circulation (admin handlers throw `ForbiddenError` here; auth itself keeps
 * throwing `AuthError`). Both shapes share `code` + `message`, and the client
 * normalizer handles them identically.
 */

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "BUSINESS_RULE_VIOLATED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this resource") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_FAILED", message, 400, details);
    this.name = "ValidationError";
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("BUSINESS_RULE_VIOLATED", message, 422, details);
    this.name = "BusinessRuleError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFLICT", message, 409, details);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number, message?: string) {
    super(
      "RATE_LIMITED",
      message ?? `Too many requests. Try again in ${retryAfterSeconds}s.`,
      429,
      { retryAfterSeconds },
    );
    this.name = "RateLimitError";
  }
}
