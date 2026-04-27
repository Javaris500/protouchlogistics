import * as React from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  FileImage,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  uploadOnboardingPhotoFn,
  type UploadOnboardingPhotoResult,
} from "@/server/functions/driver/onboarding";

export type PhotoDocType = "cdl" | "medical";

interface Props {
  label: string;
  docType: PhotoDocType;
  onConfirm: (
    photoKey: string,
    previewUrl: string,
    extracted: UploadOnboardingPhotoResult["extracted"],
  ) => void;
  /** Existing preview to re-display when returning to the screen. */
  existingPreview?: string;
  /** Existing key — when present, component renders confirmed without re-uploading. */
  existingKey?: string;
  /** Optional ceiling on AI calls per onboarding session (warn-only). */
  onAiCall?: () => void;
}

type CaptureState =
  | { kind: "idle" }
  | { kind: "uploading"; previewUrl: string; fileName: string; fileSize: number }
  | { kind: "extracting"; previewUrl: string; fileName: string; fileSize: number }
  | {
      kind: "confirmed";
      previewUrl: string;
      key: string;
      fileName: string;
      fileSize: number;
      extracted: UploadOnboardingPhotoResult["extracted"];
    }
  | {
      kind: "ocr_failed";
      previewUrl: string;
      key: string;
      fileName: string;
      fileSize: number;
    };

const MAX_OCR_RETRIES = 2;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Onboarding photo capture (CDL / medical).
 *
 * Pipeline: file picker → server upload via `uploadOnboardingPhotoFn`
 * (writes to Vercel Blob + runs OCR) → fires `onConfirm` with the blobKey
 * + extracted fields (or null if OCR couldn't read the photo).
 *
 * Retry cap: up to 2 failed OCR attempts in a row drop the user into the
 * manual form fallback — the next screen still has all fields visible.
 * Each upload-with-OCR counts as one AI call (`onAiCall`).
 */
export function PhotoCapture({
  label,
  docType,
  onConfirm,
  existingPreview,
  existingKey,
  onAiCall,
}: Props) {
  const [state, setState] = React.useState<CaptureState>(() =>
    existingKey && existingPreview
      ? {
          kind: "confirmed",
          previewUrl: existingPreview,
          key: existingKey,
          fileName: `${label.toLowerCase().replace(/\s+/g, "-")}.jpg`,
          fileSize: 0,
          extracted: null,
        }
      : { kind: "idle" },
  );
  const [dragOver, setDragOver] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setState({
        kind: "uploading",
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
      });

      try {
        const contentBase64 = await fileToBase64(file);

        setState({
          kind: "extracting",
          previewUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        onAiCall?.();

        const result = await uploadOnboardingPhotoFn({
          data: {
            docType,
            fileName: file.name,
            mimeType: file.type || "image/jpeg",
            contentBase64,
          },
        });

        if (result.extracted) {
          setRetryCount(0);
          setState({
            kind: "confirmed",
            previewUrl,
            key: result.blobKey,
            fileName: file.name,
            fileSize: file.size,
            extracted: result.extracted,
          });
          onConfirm(result.blobKey, previewUrl, result.extracted);
          return;
        }

        // OCR returned null (helper-side retries exhausted).
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        if (nextRetry >= MAX_OCR_RETRIES) {
          // Hard cap hit — accept the photo and let the user fill the form manually.
          setState({
            kind: "confirmed",
            previewUrl,
            key: result.blobKey,
            fileName: file.name,
            fileSize: file.size,
            extracted: null,
          });
          onConfirm(result.blobKey, previewUrl, null);
          toast.info(
            "We saved the photo — please fill in the details by hand.",
          );
          return;
        }

        setState({
          kind: "ocr_failed",
          previewUrl,
          key: result.blobKey,
          fileName: file.name,
          fileSize: file.size,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Upload failed — try again",
        );
        URL.revokeObjectURL(previewUrl);
        setState({ kind: "idle" });
      }
    },
    [docType, onAiCall, onConfirm, retryCount],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const retake = () => setState({ kind: "idle" });

  const skipOcrAndAcceptPhoto = () => {
    if (state.kind !== "ocr_failed") return;
    setState({
      kind: "confirmed",
      previewUrl: state.previewUrl,
      key: state.key,
      fileName: state.fileName,
      fileSize: state.fileSize,
      extracted: null,
    });
    onConfirm(state.key, state.previewUrl, null);
  };

  /* -------------------- CONFIRMED -------------------- */
  if (state.kind === "confirmed") {
    const ocrLabel = state.extracted
      ? "Read OK"
      : existingKey && state.fileSize === 0
        ? "Saved"
        : "Manual entry";
    return (
      <div className="space-y-3">
        <div className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-2)] shadow-[var(--shadow-sm)]">
          <img
            src={state.previewUrl}
            alt={`${label} preview`}
            className="h-60 w-full object-cover"
          />
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[var(--success)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success-foreground)] shadow-[var(--shadow-md)]">
            <Check className="size-3" strokeWidth={3} />
            <span>Uploaded</span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-white">
                  {state.fileName}
                </p>
                {state.fileSize > 0 && (
                  <p className="text-[11px] text-white/70">
                    {formatBytes(state.fileSize)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                <Sparkles className="size-2.5" />
                <span>{ocrLabel}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={retake}
          className="w-full"
        >
          <RotateCcw className="size-4" />
          Retake photo
        </Button>
      </div>
    );
  }

  /* -------------------- OCR FAILED (retry available) -------------------- */
  if (state.kind === "ocr_failed") {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-2)]">
          <img
            src={state.previewUrl}
            alt={`${label} preview`}
            className="h-60 w-full object-cover"
          />
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[var(--warning)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning-foreground)] shadow-[var(--shadow-md)]">
            <AlertTriangle className="size-3" strokeWidth={2.5} />
            <span>Couldn't read</span>
          </div>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)]">
          We couldn't read all the fields off your {label.toLowerCase()}.
          Try a sharper photo, or skip and enter the details by hand.
          ({MAX_OCR_RETRIES - retryCount} retr
          {MAX_OCR_RETRIES - retryCount === 1 ? "y" : "ies"} left.)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={retake}
            className="flex-1"
          >
            <RotateCcw className="size-4" />
            Try another photo
          </Button>
          <Button
            type="button"
            onClick={skipOcrAndAcceptPhoto}
            className="flex-1"
          >
            Enter details manually
          </Button>
        </div>
      </div>
    );
  }

  /* -------------------- UPLOADING / EXTRACTING -------------------- */
  if (state.kind === "uploading" || state.kind === "extracting") {
    const text =
      state.kind === "uploading" ? "Uploading…" : "Reading your photo…";
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-2)]">
          <img
            src={state.previewUrl}
            alt="Uploading preview"
            className="h-60 w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/40 backdrop-blur-[3px]">
            <div className="flex items-center gap-2.5 rounded-full bg-[var(--background)] px-4 py-2 shadow-[var(--shadow-md)]">
              <Loader2 className="size-4 animate-spin text-[var(--primary)]" />
              <span className="text-[13px] font-medium text-[var(--foreground)]">
                {text}
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-[var(--border)]">
            <div className="h-full w-1/3 animate-[photo-progress_900ms_ease-in-out_infinite] bg-[var(--primary)]" />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- IDLE -------------------- */
  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "group relative flex h-56 w-full flex-col items-center justify-center gap-4",
          "overflow-hidden rounded-[var(--radius-lg)] border-2 border-dashed",
          "transition-all duration-200",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)]/18",
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/8 scale-[1.01]"
            : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--primary)]/70 hover:bg-[var(--primary)]/[0.03]",
        )}
      >
        <span aria-hidden className="absolute left-4 top-4 h-5 w-5 border-l-2 border-t-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100" />
        <span aria-hidden className="absolute right-4 top-4 h-5 w-5 border-r-2 border-t-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100" />
        <span aria-hidden className="absolute bottom-4 left-4 h-5 w-5 border-b-2 border-l-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100" />
        <span aria-hidden className="absolute bottom-4 right-4 h-5 w-5 border-b-2 border-r-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100" />

        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full",
            "bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5",
            "text-[var(--primary)] transition-all duration-200",
            "group-hover:scale-110 group-hover:from-[var(--primary)]/25 group-hover:to-[var(--primary)]/10",
          )}
        >
          <Camera className="size-6" strokeWidth={1.75} />
        </div>

        <div className="text-center">
          <p className="text-[16px] font-semibold text-[var(--foreground)]">
            Take a photo
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
            Opens your back camera — or drop a file here
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">
          <span>JPG · PNG · PDF · up to 25 MB</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 py-2 text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <FileImage className="size-3.5" />
        <span>Browse files instead</span>
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onInputChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onInputChange}
        className="hidden"
      />
    </div>
  );
}
