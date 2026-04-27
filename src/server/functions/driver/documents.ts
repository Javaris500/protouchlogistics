import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { documents, driverProfiles } from "@/server/db/schema";
import { uploadDoc } from "@/server/storage";
import { requireDriverContext } from "./_helpers";

export interface DriverDocument {
  id: string;
  type: (typeof documents.$inferSelect)["type"];
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  blobKey: string;
  expirationDate: string | null;
  createdAt: string;
}

export const listDriverDocumentsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DriverDocument[]> => {
    const { driverId } = await requireDriverContext();
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.driverProfileId, driverId))
      .orderBy(desc(documents.createdAt));

    return rows.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      blobKey: d.blobKey,
      expirationDate: d.expirationDate,
      createdAt: d.createdAt.toISOString(),
    }));
  },
);

const ReplaceInput = z.object({
  type: z.enum(["driver_cdl", "driver_medical"]),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  contentBase64: z.string().min(1),
  /** Optional expiration date — ISO YYYY-MM-DD. CDL/medical require this. */
  expirationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * Replace a driver-owned document. Inserts a new documents row (history is
 * preserved — we do not delete the old one) and, when given an expiration
 * date for CDL/medical, mirrors it onto driver_profiles so the dashboard
 * expiration warnings stay accurate.
 */
export const replaceDriverDocumentFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ReplaceInput.parse(data))
  .handler(async ({ data }) => {
    const { sessionUser, driverId } = await requireDriverContext();

    const buf = Buffer.from(data.contentBase64, "base64");
    const { blobKey } = await uploadDoc({
      ownerKind: "driver",
      ownerId: driverId,
      type: data.type,
      file: buf,
      fileName: data.fileName,
      mimeType: data.mimeType,
    });

    const inserted = await db
      .insert(documents)
      .values({
        type: data.type,
        blobKey,
        fileName: data.fileName,
        fileSizeBytes: buf.byteLength,
        mimeType: data.mimeType,
        uploadedByUserId: sessionUser.id,
        driverProfileId: driverId,
        expirationDate: data.expirationDate ?? null,
      })
      .returning();
    const doc = inserted[0];
    if (!doc) throw new Error("Insert failed");

    if (data.expirationDate) {
      const patch =
        data.type === "driver_cdl"
          ? { cdlExpiration: data.expirationDate, updatedAt: new Date() }
          : { medicalCardExpiration: data.expirationDate, updatedAt: new Date() };
      await db
        .update(driverProfiles)
        .set(patch)
        .where(eq(driverProfiles.id, driverId));
    }

    return {
      id: doc.id,
      blobKey,
      fileName: doc.fileName,
      type: doc.type,
      expirationDate: doc.expirationDate,
    };
  });
