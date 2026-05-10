import { randomUUID } from "node:crypto";
import { del, head, put } from "@vercel/blob";

import { env } from "@/server/env";

/**
 * Vercel Blob storage helper. Contract §3 surface — `uploadDoc`,
 * `getSignedUrl`, `deleteBlob`. Path convention:
 *
 *   drivers/{driverId}/{type}/{uuid}.{ext}
 *   trucks/{truckId}/{type}/{uuid}.{ext}
 *   loads/{loadId}/{type}/{uuid}.{ext}
 *
 * All blobs use `access: 'private'`. Private blobs require
 * `BLOB_READ_WRITE_TOKEN` to read, so browser-side viewing requires a
 * server-mediated download endpoint (owned by Session 2/3 in their
 * route handlers).
 *
 * `blobKey` returned to callers IS the canonical Vercel Blob URL — it's
 * what `del()` and `head()` accept and what we hand back from
 * `getSignedUrl()`. The path under the host (the "pathname") can be
 * derived via `new URL(blobKey).pathname`.
 */

export type DocOwnerKind = "driver" | "truck" | "load" | "company";

const OWNER_KIND_PATH: Record<DocOwnerKind, string> = {
  driver: "drivers",
  truck: "trucks",
  load: "loads",
  company: "company",
};

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB; matches 02-DATA-MODEL §6.

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);

export interface UploadDocInput {
  ownerKind: DocOwnerKind;
  /** Required for driver/truck/load. Null for company-level docs. */
  ownerId: string | null;
  /**
   * Document type (e.g. `driver_cdl`, `load_bol`). Lives in the
   * `document_type` enum — but the storage helper does not enforce a
   * specific value; whoever calls passes the type through to the path.
   */
  type: string;
  file: File | Buffer;
  fileName: string;
  mimeType: string;
}

export interface UploadDocResult {
  /** The full Vercel Blob URL — store on `documents.blob_key`. */
  blobKey: string;
  /** Same as blobKey for now. Kept separate to match the §3 signature. */
  url: string;
}

function extensionFor(fileName: string, mimeType: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot >= 0 && dot < fileName.length - 1) {
    return fileName.slice(dot + 1).toLowerCase();
  }
  // Fall back to the mime suffix when the source filename has none.
  const slash = mimeType.lastIndexOf("/");
  return slash >= 0 ? mimeType.slice(slash + 1) : "bin";
}

export async function uploadDoc(
  input: UploadDocInput,
): Promise<UploadDocResult> {
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new Error(`Unsupported mime type: ${input.mimeType}`);
  }

  const size =
    input.file instanceof File ? input.file.size : input.file.byteLength;
  if (size > MAX_FILE_BYTES) {
    throw new Error(
      `File too large: ${size} bytes (max ${MAX_FILE_BYTES})`,
    );
  }

  const ext = extensionFor(input.fileName, input.mimeType);
  const pathname =
    input.ownerKind === "company"
      ? `${OWNER_KIND_PATH[input.ownerKind]}/${input.type}/${randomUUID()}.${ext}`
      : `${OWNER_KIND_PATH[input.ownerKind]}/${input.ownerId}/${input.type}/${randomUUID()}.${ext}`;

  const result = await put(pathname, input.file, {
    access: "private",
    contentType: input.mimeType,
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });

  return { blobKey: result.url, url: result.url };
}

/**
 * For Phase 1, returns the canonical blob URL. Reads against this URL
 * require the read-write token (server-only). Session 2/3 wraps this in
 * a server-mediated download endpoint that does the authz check before
 * streaming the bytes.
 *
 * `ttlSeconds` is accepted for forward-compat but currently ignored —
 * Vercel Blob v2 does not yet expose programmatic time-bound signing
 * via the public SDK. When it does, swap this to call it.
 */
export async function getSignedUrl(
  blobKey: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ttlSeconds = 15 * 60,
): Promise<string> {
  return blobKey;
}

export async function deleteBlob(blobKey: string): Promise<void> {
  await del(blobKey, { token: env.BLOB_READ_WRITE_TOKEN });
}

/**
 * Probe whether a blob exists. Useful for the orphan-upload reaper job.
 */
export async function blobExists(blobKey: string): Promise<boolean> {
  try {
    await head(blobKey, { token: env.BLOB_READ_WRITE_TOKEN });
    return true;
  } catch {
    return false;
  }
}
