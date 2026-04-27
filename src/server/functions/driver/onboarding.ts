import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { AuthError, getSession } from "@/server/auth/api";
import { extractCdl, extractMedicalCard } from "@/server/ai";
import { db } from "@/server/db";
import {
  documents,
  driverProfiles,
  onboardingDrafts,
  users,
} from "@/server/db/schema";
import { uploadDoc } from "@/server/storage";
import type { CdlExtraction, MedicalCardExtraction } from "@/server/ai";

/**
 * Server-side onboarding state. The user is signed in (role='driver') but
 * does not yet have a `driver_profiles` row — that's created at submission
 * time. While the flow is in progress, partial state lives in
 * `onboarding_drafts` (one row per user). Photos are uploaded to Vercel
 * Blob immediately (so OCR can run), but their `documents` rows are
 * deferred until submission too because of the polymorphic
 * `documents_owner_exclusive` CHECK on the documents table.
 */

/* ---------------------------------------------------------------- */
/* Types                                                            */
/* ---------------------------------------------------------------- */

const FileMetaSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
});

const AddressSchema = z.object({
  line1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(1),
});

const EmergencySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relation: z.string().min(1),
});

const OnboardingDataSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    phone: z.string().min(1),
    address: AddressSchema,
    emergency: EmergencySchema,

    cdlPhotoKey: z.string().optional(),
    cdlFile: FileMetaSchema.optional(),
    cdlNumber: z.string().min(1),
    cdlClass: z.enum(["A", "B", "C"]),
    cdlState: z.string().length(2),
    cdlExpiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    medicalPhotoKey: z.string().optional(),
    medicalFile: FileMetaSchema.optional(),
    medicalExpiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .passthrough();

/* ---------------------------------------------------------------- */
/* Helpers                                                          */
/* ---------------------------------------------------------------- */

async function requireOnboardingUser() {
  const req = getRequest();
  if (!req) throw new AuthError("UNAUTHORIZED", "No request context");
  // Onboarding accepts any signed-in user without a driver_profile. That
  // covers two cases:
  //   1. New driver who just signed up (role='driver', no profile yet)
  //   2. Gary signing up to also drive (role='admin', no profile yet)
  // Once a driver_profile exists, /onboarding redirects elsewhere — see
  // the route-level gate.
  const session = await getSession(req.headers);
  if (!session) throw new AuthError("UNAUTHORIZED", "Not signed in");
  return session;
}

/* ---------------------------------------------------------------- */
/* Photo upload + OCR                                               */
/* ---------------------------------------------------------------- */

const DocTypeSchema = z.enum(["cdl", "medical"]);

interface UploadOnboardingPhotoParsed {
  docType: "cdl" | "medical";
  file: File;
}

/**
 * Parse a multipart/form-data body. Pre-prod fix #4: previous version sent
 * the file as base64-in-JSON, inflating the body by 33% and tripping
 * Vercel function body limits on real phone-camera photos. Now the browser
 * sends the raw file via FormData, no encoding round-trip.
 */
function parseUploadOnboardingPhotoForm(
  data: unknown,
): UploadOnboardingPhotoParsed {
  if (!(data instanceof FormData)) {
    throw new Error("uploadOnboardingPhotoFn expects multipart/form-data");
  }
  const docType = DocTypeSchema.parse(data.get("docType"));
  const fileRaw = data.get("file");
  if (!(fileRaw instanceof File)) {
    throw new Error("`file` field is required and must be a File");
  }
  return { docType, file: fileRaw };
}

export interface UploadOnboardingPhotoResult {
  blobKey: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  /** Extraction result, or null if OCR failed (caller falls back to manual form). */
  extracted: CdlExtraction | MedicalCardExtraction | null;
}

/**
 * Upload an onboarding photo (CDL or medical card) and run OCR against it.
 * Returns the blobKey + file metadata (which the client stores on the
 * draft so submitOnboardingProfileFn can later create the documents row)
 * plus the OCR extraction (or null on failure — caller renders manual
 * form fields).
 *
 * The OCR helper internally retries up to 2× on transient errors. The
 * client caps user-driven re-uploads at 2 before forcing the manual form.
 *
 * Body shape: multipart/form-data with fields `docType` ("cdl" | "medical")
 * and `file` (the binary). No base64 round-trip.
 */
export const uploadOnboardingPhotoFn = createServerFn({ method: "POST" })
  .inputValidator(parseUploadOnboardingPhotoForm)
  .handler(async ({ data }): Promise<UploadOnboardingPhotoResult> => {
    const sessionUser = await requireOnboardingUser();

    const docType = data.docType === "cdl" ? "driver_cdl" : "driver_medical";

    const { blobKey } = await uploadDoc({
      ownerKind: "driver",
      // Use userId as the namespace before the driverProfile exists; the
      // blob URL is stable across submitOnboardingProfileFn.
      ownerId: sessionUser.id,
      type: docType,
      file: data.file,
      fileName: data.file.name,
      mimeType: data.file.type,
    });

    const extracted =
      data.docType === "cdl"
        ? await extractCdl(blobKey)
        : await extractMedicalCard(blobKey);

    return {
      blobKey,
      fileName: data.file.name,
      mimeType: data.file.type,
      fileSizeBytes: data.file.size,
      extracted,
    };
  });

/* ---------------------------------------------------------------- */
/* Draft get / patch                                                */
/* ---------------------------------------------------------------- */

type FileMeta = {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

export interface OnboardingDraftData {
  firstName?: string;
  lastName?: string;
  dob?: string;
  phone?: string;
  address?: { line1: string; city: string; state: string; zip: string };
  emergency?: { name: string; phone: string; relation: string };
  cdlPhotoKey?: string;
  cdlFile?: FileMeta;
  cdlNumber?: string;
  cdlClass?: "A" | "B" | "C";
  cdlState?: string;
  cdlExpiration?: string;
  medicalPhotoKey?: string;
  medicalFile?: FileMeta;
  medicalExpiration?: string;
}

/**
 * Read the current onboarding draft for the signed-in user. Returns the
 * stored `data` JSON or null if no draft row exists yet.
 */
export const getOnboardingDraftFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardingDraftData | null> => {
    const sessionUser = await requireOnboardingUser();

    const row = await db.query.onboardingDrafts.findFirst({
      where: eq(onboardingDrafts.userId, sessionUser.id),
    });
    return (row?.data as OnboardingDraftData | undefined) ?? null;
  },
);

const PatchInput = z.object({
  /** Partial OnboardingData. Server merges with whatever is currently stored. */
  patch: z.record(z.string(), z.unknown()),
});

/**
 * Merge `patch` into the user's onboarding draft. Upserts the row if it
 * doesn't exist yet. Always merges shallowly — nested objects (`address`,
 * `emergency`, file metadata) are replaced wholesale by the patch, not
 * deep-merged. Caller passes the full sub-object when changing one field.
 */
export const patchOnboardingDraftFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PatchInput.parse(data))
  .handler(async ({ data }) => {
    const sessionUser = await requireOnboardingUser();

    const existing = await db.query.onboardingDrafts.findFirst({
      where: eq(onboardingDrafts.userId, sessionUser.id),
    });

    const merged = {
      ...((existing?.data as Record<string, unknown>) ?? {}),
      ...data.patch,
    };

    await db
      .insert(onboardingDrafts)
      .values({ userId: sessionUser.id, data: merged })
      .onConflictDoUpdate({
        target: onboardingDrafts.userId,
        set: { data: merged, updatedAt: new Date() },
      });

    return { ok: true as const };
  });

/* ---------------------------------------------------------------- */
/* Submit                                                           */
/* ---------------------------------------------------------------- */

export interface SubmitOnboardingProfileResult {
  driverProfileId: string;
}

/**
 * Final step of onboarding. Reads the draft, validates it has every
 * NOT-NULL field driver_profiles requires, creates the driver_profiles
 * row, creates documents rows for any uploaded blobs (CDL + medical),
 * updates users.name to `firstName lastName` (per contract §1.x), then
 * deletes the draft.
 *
 * Throws if the draft is missing required fields — the review screen
 * gates on UI completeness but the server still validates.
 */
export const submitOnboardingProfileFn = createServerFn({
  method: "POST",
}).handler(async (): Promise<SubmitOnboardingProfileResult> => {
  const sessionUser = await requireOnboardingUser();

  // Idempotency guard. A double-tap on the review-page submit (or a network
  // retry) would otherwise hit the `driver_profiles_user_id_key` unique
  // constraint and surface a raw Postgres error. If the user already has a
  // profile, return it — the second click is a no-op from the user's POV.
  // Pre-prod fix #3 from sprint-docs/16-PRE-PROD-FIXES.md.
  const existingProfile = await db.query.driverProfiles.findFirst({
    where: eq(driverProfiles.userId, sessionUser.id),
    columns: { id: true },
  });
  if (existingProfile) {
    return { driverProfileId: existingProfile.id };
  }

  const draftRow = await db.query.onboardingDrafts.findFirst({
    where: eq(onboardingDrafts.userId, sessionUser.id),
  });
  if (!draftRow) {
    throw new Error("No onboarding draft to submit");
  }

  const parsed = OnboardingDataSchema.safeParse(draftRow.data);
  if (!parsed.success) {
    throw new Error(
      `Onboarding draft incomplete: ${parsed.error.issues
        .map((i) => i.path.join(".") || "(root)")
        .join(", ")}`,
    );
  }
  const draft = parsed.data;

  const today = new Date().toISOString().slice(0, 10);

  // Admins onboarding themselves as drivers (Gary's dual-role case) auto-approve:
  // their users.status is already 'active' and they don't need to approve themselves
  // from /admin/drivers/pending. Drivers signing up the normal way stay in the
  // pending_approval queue.
  const isAdminOnboardingSelf = sessionUser.role === "admin";

  return db.transaction(async (tx) => {
    const insertedProfile = await tx
      .insert(driverProfiles)
      .values({
        userId: sessionUser.id,
        firstName: draft.firstName,
        lastName: draft.lastName,
        dob: draft.dob,
        phone: draft.phone,
        addressLine1: draft.address.line1,
        city: draft.address.city,
        state: draft.address.state,
        zip: draft.address.zip,
        emergencyContactName: draft.emergency.name,
        emergencyContactPhone: draft.emergency.phone,
        emergencyContactRelation: draft.emergency.relation,
        cdlNumber: draft.cdlNumber,
        cdlClass: draft.cdlClass,
        cdlState: draft.cdlState,
        cdlExpiration: draft.cdlExpiration,
        medicalCardExpiration: draft.medicalExpiration,
        // hireDate is admin-set at approval time, but the column is NOT NULL.
        // Default to submission date — admin can edit later.
        hireDate: today,
        onboardingState: "complete",
        onboardingCompletedAt: new Date(),
        approvedAt: isAdminOnboardingSelf ? new Date() : null,
        approvedByUserId: isAdminOnboardingSelf ? sessionUser.id : null,
      })
      .returning({ id: driverProfiles.id });
    const profile = insertedProfile[0];
    if (!profile) throw new Error("driver_profiles insert failed");

    const docRows: Array<typeof documents.$inferInsert> = [];
    if (draft.cdlPhotoKey && draft.cdlFile) {
      docRows.push({
        type: "driver_cdl",
        blobKey: draft.cdlPhotoKey,
        fileName: draft.cdlFile.fileName,
        fileSizeBytes: draft.cdlFile.fileSizeBytes,
        mimeType: draft.cdlFile.mimeType,
        uploadedByUserId: sessionUser.id,
        driverProfileId: profile.id,
        expirationDate: draft.cdlExpiration,
      });
    }
    if (draft.medicalPhotoKey && draft.medicalFile) {
      docRows.push({
        type: "driver_medical",
        blobKey: draft.medicalPhotoKey,
        fileName: draft.medicalFile.fileName,
        fileSizeBytes: draft.medicalFile.fileSizeBytes,
        mimeType: draft.medicalFile.mimeType,
        uploadedByUserId: sessionUser.id,
        driverProfileId: profile.id,
        expirationDate: draft.medicalExpiration,
      });
    }
    if (docRows.length > 0) {
      await tx.insert(documents).values(docRows);
    }

    // Contract §1.x: populate users.name with the real legal name once
    // the about-step (and now the full submission) is in.
    await tx
      .update(users)
      .set({
        name: `${draft.firstName} ${draft.lastName}`.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, sessionUser.id));

    await tx
      .delete(onboardingDrafts)
      .where(eq(onboardingDrafts.userId, sessionUser.id));

    return { driverProfileId: profile.id };
  });
});
