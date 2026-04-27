import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { AuthError, requireDriver } from "@/server/auth/api";
import { extractCdl, extractMedicalCard } from "@/server/ai";
import { uploadDoc } from "@/server/storage";
import type { CdlExtraction, MedicalCardExtraction } from "@/server/ai";

/**
 * Server functions for the onboarding flow's photo capture step.
 *
 * Onboarding context: the signed-in user has role='driver' but no
 * `driver_profiles` row yet — the profile is created by
 * `submitOnboardingProfile` at the end of the flow. So `requireDriver`
 * resolves SessionUser with driverId=null. We use the userId as the
 * temporary owner namespace in the blob path; the resulting blobKey is
 * recorded in the onboarding draft and re-attached to a `documents` row
 * once the driverProfile is created.
 *
 * Doing this avoids a schema change for a "draft profile" row while
 * keeping the blob path stable across submission (the URL doesn't move).
 */

const UploadInput = z.object({
  docType: z.enum(["cdl", "medical"]),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  /** base64-encoded contents of the photo. Capped at 25 MB by the storage helper. */
  contentBase64: z.string().min(1),
});

export interface UploadOnboardingPhotoResult {
  blobKey: string;
  /** Extraction result, or null if OCR failed (caller falls back to manual form). */
  extracted: CdlExtraction | MedicalCardExtraction | null;
}

/**
 * Upload an onboarding photo (CDL or medical card) and run OCR against it.
 * Returns the blobKey (recorded on the onboarding draft) plus the OCR
 * extraction (or null on failure — caller renders manual form fields).
 *
 * The OCR helper internally retries up to 2× on transient errors. Caller
 * is responsible for capping user-driven re-uploads (the brief: 2 retries
 * before forcing the manual form).
 */
export const uploadOnboardingPhotoFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UploadInput.parse(data))
  .handler(async ({ data }): Promise<UploadOnboardingPhotoResult> => {
    const req = getRequest();
    if (!req) throw new AuthError("UNAUTHORIZED", "No request context");
    const sessionUser = await requireDriver(req.headers);

    const buf = Buffer.from(data.contentBase64, "base64");

    const docType =
      data.docType === "cdl" ? "driver_cdl" : "driver_medical";

    const { blobKey } = await uploadDoc({
      ownerKind: "driver",
      // Use userId as the namespace before the driverProfile exists; the
      // blob URL is stable across the eventual document-row insertion.
      ownerId: sessionUser.id,
      type: docType,
      file: buf,
      fileName: data.fileName,
      mimeType: data.mimeType,
    });

    const extracted =
      data.docType === "cdl"
        ? await extractCdl(blobKey)
        : await extractMedicalCard(blobKey);

    return { blobKey, extracted };
  });
