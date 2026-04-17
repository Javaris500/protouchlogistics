import * as React from "react";
import {
  Camera,
  FileImage,
  Loader2,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  /** Called when an image is "uploaded" with a placeholder key. Phase 1 stub. */
  onConfirm: (photoKey: string, previewUrl: string) => void;
  /** Existing preview to re-display (e.g., returning to the screen). */
  existingPreview?: string;
  /** Existing key — when present, component renders in confirmed state. */
  existingKey?: string;
}

type CaptureState =
  | { kind: "idle" }
  | {
      kind: "uploading";
      previewUrl: string;
      fileName: string;
      fileSize: number;
    }
  | {
      kind: "confirmed";
      previewUrl: string;
      key: string;
      fileName: string;
      fileSize: number;
    };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Phase 1 photo capture — premium UI without a real R2 pipeline.
 *
 * When Better Auth + TanStack Start land, wire:
 *   - requestUploadUrl → signed PUT to R2
 *   - confirmDocumentUpload server function
 *   - async Claude OCR kickoff (updates form fields downstream)
 *
 * For now: URL.createObjectURL preview, 900ms fake upload, placeholder key.
 */
export function PhotoCapture({
  label,
  onConfirm,
  existingPreview,
  existingKey,
}: Props) {
  const [state, setState] = React.useState<CaptureState>(() =>
    existingKey && existingPreview
      ? {
          kind: "confirmed",
          previewUrl: existingPreview,
          key: existingKey,
          fileName: `${label.toLowerCase().replace(/\s+/g, "-")}.jpg`,
          fileSize: 0,
        }
      : { kind: "idle" },
  );
  const [dragOver, setDragOver] = React.useState(false);

  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setState({
      kind: "uploading",
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
    });

    // TODO Phase 1.5: replace with real signed-PUT upload + server confirmation.
    window.setTimeout(() => {
      const fakeKey = `dev-${Date.now()}`;
      setState({
        kind: "confirmed",
        previewUrl,
        key: fakeKey,
        fileName: file.name,
        fileSize: file.size,
      });
      onConfirm(fakeKey, previewUrl);
    }, 900);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so picking the same file twice re-triggers the event.
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const retake = () => setState({ kind: "idle" });

  /* -------------------- CONFIRMED -------------------- */
  if (state.kind === "confirmed") {
    return (
      <div className="space-y-3">
        <div className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-2)] shadow-[var(--shadow-sm)]">
          <img
            src={state.previewUrl}
            alt={`${label} preview`}
            className="h-60 w-full object-cover"
          />
          {/* Top badge */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[var(--success)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success-foreground)] shadow-[var(--shadow-md)]">
            <Check className="size-3" strokeWidth={3} />
            <span>Uploaded</span>
          </div>
          {/* Bottom gradient + metadata */}
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
                <span>Reading…</span>
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

  /* -------------------- UPLOADING -------------------- */
  if (state.kind === "uploading") {
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
                Uploading…
              </span>
            </div>
          </div>
          {/* Progress shimmer */}
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
        {/* Decorative corner brackets */}
        <span
          aria-hidden
          className="absolute left-4 top-4 h-5 w-5 border-l-2 border-t-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute right-4 top-4 h-5 w-5 border-r-2 border-t-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute bottom-4 left-4 h-5 w-5 border-b-2 border-l-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute bottom-4 right-4 h-5 w-5 border-b-2 border-r-2 border-[var(--border-strong)] opacity-60 transition-opacity group-hover:opacity-100"
        />

        {/* Icon */}
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

        {/* Label */}
        <div className="text-center">
          <p className="text-[16px] font-semibold text-[var(--foreground)]">
            Take a photo
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
            Opens your back camera — or drop a file here
          </p>
        </div>

        {/* Tiny hint */}
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
