import * as React from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tiny built-in toast. No external deps.
 *
 * Usage:
 *   import { toast, Toaster } from "@/lib/toast";
 *   toast.success("Invoice sent");
 *   toast.info("Coming soon");
 *   toast.error("Couldn't send");
 *
 * Mount `<Toaster />` ONCE at the app root (inside AdminShell).
 *
 * Implementation: module-level singleton holds the current setter from
 * the mounted Toaster. Fire-and-forget — no provider boilerplate, no
 * context plumbing. Good enough for Phase 1; swap for sonner when the
 * app grows.
 */

type Tone = "success" | "info" | "error";
interface ToastMsg {
  id: number;
  tone: Tone;
  message: string;
}

let nextId = 0;
let push: ((m: ToastMsg) => void) | null = null;

function emit(tone: Tone, message: string): void {
  push?.({ id: ++nextId, tone, message });
}

export const toast = {
  success: (msg: string) => emit("success", msg),
  info: (msg: string) => emit("info", msg),
  error: (msg: string) => emit("error", msg),
};

export function Toaster() {
  const [items, setItems] = React.useState<ToastMsg[]>([]);

  React.useEffect(() => {
    push = (m) => {
      setItems((prev) => [...prev, m]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== m.id));
      }, 2600);
    };
    return () => {
      push = null;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "pointer-events-none fixed z-[100] flex flex-col gap-2",
        // Desktop: bottom-right. Mobile: bottom-center, above the tab bar.
        "right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 items-center",
        "md:left-auto md:right-6 md:bottom-6 md:items-end",
      )}
    >
      {items.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}

function ToastItem({ tone, message }: ToastMsg) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "error" ? AlertTriangle : Info;
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-[var(--radius-md)]",
        "border border-[var(--border)] bg-[var(--popover)] pr-4 pl-3 py-2.5",
        "text-[13px] font-medium text-[var(--popover-foreground)]",
        "shadow-[var(--shadow-lg)]",
        "animate-in fade-in-0 slide-in-from-bottom-3 duration-200",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          tone === "success" && "text-[var(--success)]",
          tone === "error" && "text-[var(--danger)]",
          tone === "info" && "text-[var(--primary)]",
        )}
      />
      <span>{message}</span>
    </div>
  );
}
