import { customType } from "drizzle-orm/pg-core";

/**
 * Postgres `citext` — case-insensitive text. The extension is enabled in the
 * prelude migration. Used for email columns so `Foo@example.com` and
 * `foo@example.com` collide on UNIQUE constraints.
 */
export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});
