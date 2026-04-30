import { randomUUID } from "node:crypto";

import { createServerFn } from "@tanstack/react-start";
import { get, head } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import {
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  documents,
  driverProfiles,
  loads,
  trucks,
} from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import {
  deleteBlob,
  getSignedUrl,
  uploadDoc,
  type DocOwnerKind,
} from "@/server/storage";
import { env } from "@/server/env";
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from "@/server/errors";
import { record as auditRecord } from "@/server/services/audit.service";

/**
 * Documents — admin server functions. Brief §3.2 priority 4 + §3.5.
 *
 * Polymorphic owner: exactly one of (driverProfileId | truckId | loadId) is
 * non-null. The DB enforces "exactly one" via the
 * `documents_owner_exclusive` CHECK constraint; the type-to-owner *prefix*
 * match (`driver_*` ↔ driverProfileId, etc.) is enforced here per
 * 12-CONTRACTS-LOCK §1.x invariant.
 *
 * Upload route: createDocument accepts FormData (file + metadata) so we can
 * stream multipart bodies from the browser without base64-bloating them
 * through JSON.
 *
 * Download route: 12-CONTRACTS-LOCK §3 caveat — Vercel Blob v2 has no public
 * time-bound signing API. `downloadDocument` re-fetches the private blob
 * server-side using the read-write token and streams it back to the
 * browser. Auth is gated by `adminOnly` middleware.
 */

const DOC_TYPES = [
  "driver_cdl",
  "driver_medical",
  "driver_mvr",
  "driver_drug_test",
  "driver_other",
  "truck_registration",
  "truck_insurance",
  "truck_inspection",
  "truck_other",
  "load_bol",
  "load_rate_confirmation",
  "load_pod",
  "load_lumper_receipt",
  "load_scale_ticket",
  "load_other",
] as const;
const DocTypeZ = z.enum(DOC_TYPES);
type DocTypeValue = (typeof DOC_TYPES)[number];

const OWNER_KINDS = ["driver", "truck", "load"] as const;
const OwnerKindZ = z.enum(OWNER_KINDS);

const EXPIRABLE_DOC_TYPES = new Set<DocTypeValue>([
  "driver_cdl",
  "driver_medical",
  "truck_registration",
  "truck_insurance",
  "truck_inspection",
]);

function ownerKindForDocType(type: DocTypeValue): DocOwnerKind {
  if (type.startsWith("driver_")) return "driver";
  if (type.startsWith("truck_")) return "truck";
  return "load";
}

function ownerIdColumnForKind(kind: DocOwnerKind) {
  switch (kind) {
    case "driver":
      return documents.driverProfileId;
    case "truck":
      return documents.truckId;
    case "load":
      return documents.loadId;
  }
}

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListDocumentsInput = PaginationZ.extend({
  ownerKind: OwnerKindZ.optional(),
  ownerId: z.string().uuid().optional(),
  type: DocTypeZ.optional(),
  expiringWithinDays: z.number().int().min(0).max(365).optional(),
});

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListDocumentsInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const conditions = [];
    if (data.ownerKind && data.ownerId) {
      conditions.push(eq(ownerIdColumnForKind(data.ownerKind), data.ownerId));
    } else if (data.ownerKind) {
      conditions.push(isNotNull(ownerIdColumnForKind(data.ownerKind)));
    }
    if (data.type) conditions.push(eq(documents.type, data.type));
    if (data.expiringWithinDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + data.expiringWithinDays);
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      conditions.push(
        and(
          isNotNull(documents.expirationDate),
          lte(documents.expirationDate, cutoffIso),
        )!,
      );
    }
    if (data.cursor) {
      conditions.push(sql`${documents.createdAt} < ${new Date(data.cursor)}`);
    }

    const rows = await db
      .select()
      .from(documents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(documents.createdAt))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.createdAt.toISOString() : null;

    return {
      documents: page.map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        fileSizeBytes: d.fileSizeBytes,
        mimeType: d.mimeType,
        driverProfileId: d.driverProfileId,
        truckId: d.truckId,
        loadId: d.loadId,
        expirationDate: d.expirationDate,
        notes: d.notes,
        uploadedByUserId: d.uploadedByUserId,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  });

const GetDocumentInput = z.object({ documentId: z.string().uuid() });

export const getDocument = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => GetDocumentInput.parse(data))
  .handler(async ({ data }) => {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, data.documentId),
    });
    if (!doc) throw new NotFoundError("Document");

    const signedUrl = await getSignedUrl(doc.blobKey, 600);

    return {
      document: {
        id: doc.id,
        type: doc.type,
        fileName: doc.fileName,
        fileSizeBytes: doc.fileSizeBytes,
        mimeType: doc.mimeType,
        blobKey: doc.blobKey,
        driverProfileId: doc.driverProfileId,
        truckId: doc.truckId,
        loadId: doc.loadId,
        expirationDate: doc.expirationDate,
        notes: doc.notes,
        uploadedByUserId: doc.uploadedByUserId,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
      signedUrl,
    };
  });

interface CreateDocumentParsed {
  ownerKind: DocOwnerKind;
  ownerId: string;
  type: DocTypeValue;
  expirationDate: string | null;
  notes: string | null;
  file: File;
}

function parseCreateDocumentForm(data: unknown): CreateDocumentParsed {
  if (!(data instanceof FormData)) {
    throw new ValidationError(
      "createDocument expects multipart/form-data input",
    );
  }
  const ownerKindRaw = data.get("ownerKind");
  const ownerIdRaw = data.get("ownerId");
  const typeRaw = data.get("type");
  const expirationRaw = data.get("expirationDate");
  const notesRaw = data.get("notes");
  const fileRaw = data.get("file");

  const ownerKind = OwnerKindZ.parse(ownerKindRaw);
  const ownerId = z.string().uuid().parse(ownerIdRaw);
  const type = DocTypeZ.parse(typeRaw);
  const expirationDate =
    expirationRaw && typeof expirationRaw === "string"
      ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(expirationRaw)
      : null;
  const notes =
    notesRaw && typeof notesRaw === "string" && notesRaw.length > 0
      ? notesRaw
      : null;
  if (!(fileRaw instanceof File)) {
    throw new ValidationError("`file` field is required and must be a File");
  }

  if (ownerKindForDocType(type) !== ownerKind) {
    throw new BusinessRuleError(
      `Document type ${type} cannot be assigned to a ${ownerKind}`,
    );
  }
  if (EXPIRABLE_DOC_TYPES.has(type) && !expirationDate) {
    throw new ValidationError(
      `Document type ${type} requires an expirationDate`,
    );
  }

  return {
    ownerKind,
    ownerId,
    type,
    expirationDate,
    notes,
    file: fileRaw,
  };
}

export const createDocument = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator(parseCreateDocumentForm)
  .handler(async ({ data, context }) => {
    // Validate owner exists before uploading — saves an orphan blob if the
    // ownerId is bogus.
    await assertOwnerExists(data.ownerKind, data.ownerId);

    const upload = await uploadDoc({
      ownerKind: data.ownerKind,
      ownerId: data.ownerId,
      type: data.type,
      file: data.file,
      fileName: data.file.name,
      mimeType: data.file.type,
    });

    return db.transaction(async (tx) => {
      const ownerColumns = ownerColumnsFor(data.ownerKind, data.ownerId);
      const [created] = await tx
        .insert(documents)
        .values({
          type: data.type,
          blobKey: upload.blobKey,
          fileName: data.file.name,
          fileSizeBytes: data.file.size,
          mimeType: data.file.type,
          uploadedByUserId: context.user.id,
          ...ownerColumns,
          expirationDate: data.expirationDate,
          notes: data.notes,
        })
        .returning();
      if (!created) throw new Error("Failed to insert document");

      await auditRecord(
        {
          userId: context.user.id,
          action: "document.uploaded",
          entityType: "document",
          entityId: created.id,
          changes: {
            type: created.type,
            ownerKind: data.ownerKind,
            ownerId: data.ownerId,
            fileName: data.file.name,
          },
        },
        tx,
      );

      return {
        document: {
          id: created.id,
          type: created.type,
          fileName: created.fileName,
          fileSizeBytes: created.fileSizeBytes,
          mimeType: created.mimeType,
          driverProfileId: created.driverProfileId,
          truckId: created.truckId,
          loadId: created.loadId,
          expirationDate: created.expirationDate,
          notes: created.notes,
          uploadedByUserId: created.uploadedByUserId,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      };
    });
  });

interface ReplaceDocumentParsed {
  documentId: string;
  expirationDate: string | null;
  notes: string | null;
  file: File;
}

function parseReplaceDocumentForm(data: unknown): ReplaceDocumentParsed {
  if (!(data instanceof FormData)) {
    throw new ValidationError(
      "replaceDocument expects multipart/form-data input",
    );
  }
  const documentId = z
    .string()
    .uuid()
    .parse(data.get("documentId"));
  const expirationRaw = data.get("expirationDate");
  const notesRaw = data.get("notes");
  const fileRaw = data.get("file");
  const expirationDate =
    expirationRaw && typeof expirationRaw === "string"
      ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(expirationRaw)
      : null;
  const notes =
    notesRaw && typeof notesRaw === "string" && notesRaw.length > 0
      ? notesRaw
      : null;
  if (!(fileRaw instanceof File)) {
    throw new ValidationError("`file` field is required and must be a File");
  }
  return { documentId, expirationDate, notes, file: fileRaw };
}

export const replaceDocument = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator(parseReplaceDocumentForm)
  .handler(async ({ data, context }) => {
    const existing = await db.query.documents.findFirst({
      where: eq(documents.id, data.documentId),
    });
    if (!existing) throw new NotFoundError("Document");

    const ownerKind: DocOwnerKind = existing.driverProfileId
      ? "driver"
      : existing.truckId
        ? "truck"
        : "load";
    const ownerId =
      existing.driverProfileId ?? existing.truckId ?? existing.loadId;
    if (!ownerId) {
      throw new Error("Document has no owner — DB invariant violated");
    }

    if (
      EXPIRABLE_DOC_TYPES.has(existing.type as DocTypeValue) &&
      !data.expirationDate &&
      !existing.expirationDate
    ) {
      throw new ValidationError(
        `Document type ${existing.type} requires an expirationDate`,
      );
    }

    const upload = await uploadDoc({
      ownerKind,
      ownerId,
      type: existing.type,
      file: data.file,
      fileName: data.file.name,
      mimeType: data.file.type,
    });

    const oldBlobKey = existing.blobKey;
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(documents)
        .set({
          blobKey: upload.blobKey,
          fileName: data.file.name,
          fileSizeBytes: data.file.size,
          mimeType: data.file.type,
          expirationDate: data.expirationDate ?? existing.expirationDate,
          notes: data.notes ?? existing.notes,
          uploadedByUserId: context.user.id,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, existing.id))
        .returning();
      if (!row) throw new Error("Failed to update document");

      await auditRecord(
        {
          userId: context.user.id,
          action: "document.replaced",
          entityType: "document",
          entityId: existing.id,
          changes: {
            priorBlobKey: oldBlobKey,
            nextBlobKey: upload.blobKey,
            fileName: data.file.name,
          },
        },
        tx,
      );
      return row;
    });

    // Post-commit blob cleanup. Failure here doesn't roll back the row update.
    try {
      await deleteBlob(oldBlobKey);
    } catch {
      // Orphan blob is collected by the reaper job; not worth surfacing to
      // the user. Audit row above already records the swap.
    }

    return {
      document: {
        id: updated.id,
        type: updated.type,
        fileName: updated.fileName,
        fileSizeBytes: updated.fileSizeBytes,
        mimeType: updated.mimeType,
        driverProfileId: updated.driverProfileId,
        truckId: updated.truckId,
        loadId: updated.loadId,
        expirationDate: updated.expirationDate,
        notes: updated.notes,
        uploadedByUserId: updated.uploadedByUserId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  });

const DeleteDocumentInput = z.object({ documentId: z.string().uuid() });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => DeleteDocumentInput.parse(data))
  .handler(async ({ data, context }) => {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, data.documentId),
    });
    if (!doc) throw new NotFoundError("Document");

    const blobKey = doc.blobKey;
    await db.transaction(async (tx) => {
      await tx.delete(documents).where(eq(documents.id, doc.id));
      await auditRecord(
        {
          userId: context.user.id,
          action: "document.deleted",
          entityType: "document",
          entityId: doc.id,
          changes: { type: doc.type, fileName: doc.fileName },
        },
        tx,
      );
    });

    try {
      await deleteBlob(blobKey);
    } catch {
      // Orphan reaper handles this case.
    }

    return { ok: true as const };
  });

/**
 * Server-mediated download. 12-CONTRACTS-LOCK §3 caveat: private Vercel
 * Blobs need the read-write token to fetch, so we proxy the bytes through
 * the server function (after the adminOnly authz check) instead of handing
 * the raw blob URL to the browser.
 */
const DownloadDocumentInput = z.object({ documentId: z.string().uuid() });

export const downloadDocument = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => DownloadDocumentInput.parse(data))
  .handler(async ({ data }) => {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, data.documentId),
    });
    if (!doc) throw new NotFoundError("Document");

    const blob = await get(doc.blobKey, {
      access: "private",
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      throw new NotFoundError("Document body");
    }

    return new Response(blob.stream, {
      headers: {
        "content-type": doc.mimeType,
        "content-disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  });

async function assertOwnerExists(
  kind: DocOwnerKind,
  id: string,
): Promise<void> {
  if (kind === "driver") {
    const row = await db.query.driverProfiles.findFirst({
      where: and(eq(driverProfiles.id, id), isNull(driverProfiles.deletedAt)),
      columns: { id: true },
    });
    if (!row) throw new NotFoundError("Driver");
    return;
  }
  if (kind === "truck") {
    const row = await db.query.trucks.findFirst({
      where: and(eq(trucks.id, id), isNull(trucks.deletedAt)),
      columns: { id: true },
    });
    if (!row) throw new NotFoundError("Truck");
    return;
  }
  const row = await db.query.loads.findFirst({
    where: and(eq(loads.id, id), isNull(loads.deletedAt)),
    columns: { id: true },
  });
  if (!row) throw new NotFoundError("Load");
}

function ownerColumnsFor(
  kind: DocOwnerKind,
  id: string,
): Pick<
  typeof documents.$inferInsert,
  "driverProfileId" | "truckId" | "loadId"
> {
  if (kind === "driver") return { driverProfileId: id, truckId: null, loadId: null };
  if (kind === "truck") return { driverProfileId: null, truckId: id, loadId: null };
  return { driverProfileId: null, truckId: null, loadId: id };
}

// Suppress unused-warning on `or` if downstream doesn't use the import yet.
void or;

/* ─────────────────────────────────────────────────────────────────────────
   Client-side upload support (Bug 4 fix — bypasses 4.5 MB function limit)

   Flow:
   1. Browser calls requestUploadTokenFn  → server validates auth/owner/type,
      returns a short-lived Vercel Blob client token + destination pathname.
   2. Browser calls upload() from @vercel/blob/client directly — file travels
      from browser straight to Vercel Blob, never through the function body.
   3. Browser calls finalizeDocumentUploadFn → server verifies the blob
      landed, writes the DB record, and records the audit entry.
   ───────────────────────────────────────────────────────────────────────── */

const ALLOWED_CLIENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);

const OWNER_KIND_PATH_MAP: Record<DocOwnerKind, string> = {
  driver: "drivers",
  truck: "trucks",
  load: "loads",
};

function extFor(fileName: string, mimeType: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot >= 0 && dot < fileName.length - 1) return fileName.slice(dot + 1).toLowerCase();
  const slash = mimeType.lastIndexOf("/");
  return slash >= 0 ? mimeType.slice(slash + 1) : "bin";
}

const RequestUploadTokenInput = z.object({
  ownerKind: OwnerKindZ,
  ownerId: z.string().uuid(),
  type: DocTypeZ,
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});

/** Step 1: validate auth + owner, return a scoped Blob client token. */
export const requestUploadTokenFn = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => RequestUploadTokenInput.parse(data))
  .handler(async ({ data }) => {
    if (!ALLOWED_CLIENT_TYPES.has(data.mimeType)) {
      throw new ValidationError(`Unsupported file type: ${data.mimeType}`);
    }
    if (data.fileSizeBytes > 25 * 1024 * 1024) {
      throw new ValidationError("File too large — max 25 MB");
    }
    if (ownerKindForDocType(data.type) !== data.ownerKind) {
      throw new BusinessRuleError(
        `Document type ${data.type} cannot be assigned to a ${data.ownerKind}`,
      );
    }
    await assertOwnerExists(data.ownerKind, data.ownerId);

    const ext = extFor(data.fileName, data.mimeType);
    const pathname = `${OWNER_KIND_PATH_MAP[data.ownerKind]}/${data.ownerId}/${data.type}/${randomUUID()}.${ext}`;

    const token = await generateClientTokenFromReadWriteToken({
      token: env.BLOB_READ_WRITE_TOKEN,
      pathname,
      allowedContentTypes: [data.mimeType],
      maximumSizeInBytes: 25 * 1024 * 1024,
    });

    return { token, pathname };
  });

export interface FinalizeDocumentPayload {
  blobKey: string;
  ownerKind: DocOwnerKind;
  ownerId: string;
  type: DocTypeValue;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  expirationDate: string | null;
  notes: string | null;
}

const FinalizeDocumentInput = z.object({
  blobKey: z.string().url(),
  ownerKind: OwnerKindZ,
  ownerId: z.string().uuid(),
  type: DocTypeZ,
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string().nullable(),
});

/** Step 3: verify blob landed, write DB record and audit entry. */
export const finalizeDocumentUploadFn = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => FinalizeDocumentInput.parse(data))
  .handler(async ({ data, context }) => {
    if (ownerKindForDocType(data.type) !== data.ownerKind) {
      throw new BusinessRuleError(
        `Document type ${data.type} cannot be assigned to a ${data.ownerKind}`,
      );
    }
    if (EXPIRABLE_DOC_TYPES.has(data.type) && !data.expirationDate) {
      throw new ValidationError(`Document type ${data.type} requires an expiration date`);
    }

    try {
      await head(data.blobKey, { token: env.BLOB_READ_WRITE_TOKEN });
    } catch {
      throw new NotFoundError("Uploaded file — upload may not have completed");
    }

    return db.transaction(async (tx) => {
      const ownerColumns = ownerColumnsFor(data.ownerKind, data.ownerId);
      const [created] = await tx
        .insert(documents)
        .values({
          type: data.type,
          blobKey: data.blobKey,
          fileName: data.fileName,
          fileSizeBytes: data.fileSizeBytes,
          mimeType: data.mimeType,
          uploadedByUserId: context.user.id,
          ...ownerColumns,
          expirationDate: data.expirationDate,
          notes: data.notes,
        })
        .returning();
      if (!created) throw new Error("Failed to insert document");

      await auditRecord(
        {
          userId: context.user.id,
          action: "document.uploaded",
          entityType: "document",
          entityId: created.id,
          changes: {
            type: created.type,
            ownerKind: data.ownerKind,
            ownerId: data.ownerId,
            fileName: data.fileName,
          },
        },
        tx,
      );

      return {
        document: {
          id: created.id,
          type: created.type,
          fileName: created.fileName,
          fileSizeBytes: created.fileSizeBytes,
          mimeType: created.mimeType,
          driverProfileId: created.driverProfileId,
          truckId: created.truckId,
          loadId: created.loadId,
          expirationDate: created.expirationDate,
          notes: created.notes,
          uploadedByUserId: created.uploadedByUserId,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      };
    });
  });
