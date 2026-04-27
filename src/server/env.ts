/**
 * Typed environment access. Throws at module load if a required key is missing,
 * which is intentional — the app should not boot in a half-configured state.
 *
 * Add new keys here, not in callers, so the surface stays surveyable.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV ?? "development") as
    | "development"
    | "production"
    | "test",

  DATABASE_URL: required("DATABASE_URL"),

  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: optional("BETTER_AUTH_URL"),

  BLOB_READ_WRITE_TOKEN: required("BLOB_READ_WRITE_TOKEN"),
  AI_GATEWAY_API_KEY: required("AI_GATEWAY_API_KEY"),

  ADMIN_SEED_EMAIL: required("ADMIN_SEED_EMAIL"),
  ADMIN_SEED_PASSWORD: required("ADMIN_SEED_PASSWORD"),
} as const;

export type Env = typeof env;
