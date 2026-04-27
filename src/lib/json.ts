/**
 * Recursive JSON value type. Useful when narrowing Drizzle's `jsonb` columns
 * (which return `unknown`) into a TanStack Start-serializable shape. The
 * Start serializer rejects `unknown` because it can't prove the value is
 * round-trippable.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}
