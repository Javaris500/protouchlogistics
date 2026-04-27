import { gateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import { get } from "@vercel/blob";
import { z } from "zod";

import { env } from "@/server/env";

/**
 * AI Gateway client for OCR. Contract §4 surface — `extractCdl` and
 * `extractMedicalCard`. Both call Claude Haiku 4.5 via the Vercel AI
 * Gateway (provider/model string, not a hard-bound provider package).
 *
 * Failure model: 2 attempts, then `null`. Caller is expected to fall back
 * to a manual form on null.
 *
 * Cost guardrail: callers track per-onboarding-session call count and
 * warn if it exceeds 4. The helper itself does not maintain that counter
 * because it has no notion of a "session" — that's a UX boundary, not an
 * infra one.
 */

const MODEL_ID = "anthropic/claude-haiku-4-5";
const MAX_ATTEMPTS = 2;

const CdlSchema = z.object({
  number: z
    .string()
    .min(1)
    .describe("The CDL license number, exactly as printed."),
  class: z
    .enum(["A", "B", "C"])
    .describe("The CDL class, single letter."),
  state: z
    .string()
    .length(2)
    .describe("Two-letter US state code, uppercase, e.g. 'TX'."),
  expiration: z
    .string()
    .describe("Expiration date in ISO 8601 (YYYY-MM-DD)."),
});

const MedicalCardSchema = z.object({
  expiration: z
    .string()
    .describe("Medical card expiration date in ISO 8601 (YYYY-MM-DD)."),
});

export type CdlExtraction = z.infer<typeof CdlSchema>;
export type MedicalCardExtraction = z.infer<typeof MedicalCardSchema>;

/**
 * Stream the blob server-side into a Uint8Array. Private blobs require the
 * BLOB_READ_WRITE_TOKEN, so this only works on the server.
 */
async function readBlobBytes(blobKey: string): Promise<Uint8Array> {
  const result = await get(blobKey, {
    access: "private",
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Failed to read blob: ${blobKey}`);
  }
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return buf;
}

async function extractWithRetries<T>(
  blobKey: string,
  schema: z.ZodSchema<T>,
  prompt: string,
  label: string,
): Promise<T | null> {
  let image: Uint8Array;
  try {
    image = await readBlobBytes(blobKey);
  } catch (err) {
    console.warn(`[ai] ${label}: blob read failed`, err);
    return null;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { object } = await generateObject({
        model: gateway(MODEL_ID),
        schema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image },
            ],
          },
        ],
      });
      return object;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        console.warn(`[ai] ${label}: failed after ${attempt} attempt(s)`, err);
        return null;
      }
    }
  }
  return null;
}

export async function extractCdl(
  blobKey: string,
): Promise<CdlExtraction | null> {
  return extractWithRetries(
    blobKey,
    CdlSchema,
    "Extract the following fields from this Commercial Driver's License (CDL) image: license number, class (A, B, or C), issuing state (2-letter US code), and expiration date (YYYY-MM-DD). Return only what is clearly visible on the card. If a field is unreadable, do not guess — return null for the entire response (the schema will reject partial results, which is the desired behavior).",
    "extractCdl",
  );
}

export async function extractMedicalCard(
  blobKey: string,
): Promise<MedicalCardExtraction | null> {
  return extractWithRetries(
    blobKey,
    MedicalCardSchema,
    "Extract the expiration date from this DOT medical examiner's certificate (medical card) image, in YYYY-MM-DD format. If the date is unreadable, do not guess.",
    "extractMedicalCard",
  );
}
