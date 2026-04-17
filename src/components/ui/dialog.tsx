import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/* Improvement #3 — softer overlay: 40% black + more blur for frosted-glass */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-[6px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Dialog content. Responsive by default: centered card on sm+ viewports,
 * bottom-anchored sheet on mobile.
 *
 * Improvement #4 — smoother open: translateY + gentle scale, slower curve.
 */
function DialogContent({
  className,
  children,
  size = "md",
  hideClose = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  hideClose?: boolean;
}) {
  const sizeClass: Record<NonNullable<typeof size>, string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    full: "sm:max-w-[min(96vw,1200px)]",
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 grid w-full gap-0",
          "bg-[var(--popover)] text-[var(--popover-foreground)]",
          "shadow-[var(--shadow-lg)]",
          "border border-[var(--border)]",
          /* Mobile: bottom sheet */
          "inset-x-0 bottom-0 rounded-t-[var(--radius-xl)]",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
          "data-[state=open]:duration-350 data-[state=closed]:duration-200",
          /* Desktop (sm+): centered modal with float-up + scale */
          "sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-[var(--radius-xl)]",
          "sm:data-[state=open]:zoom-in-[0.97] sm:data-[state=closed]:zoom-out-[0.97]",
          "sm:data-[state=open]:slide-in-from-top-[3%] sm:data-[state=closed]:slide-out-to-top-[1%]",
          "sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0",
          "max-h-[92dvh] overflow-hidden",
          sizeClass[size],
          className,
        )}
        {...props}
      >
        {children}
        {/* Improvement #9 — smaller, ghost close button with hover ring */}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full",
              "text-[var(--muted-foreground)] opacity-60",
              "transition-all duration-150",
              "hover:bg-[var(--surface-2)] hover:opacity-100 hover:text-[var(--foreground)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
              "disabled:pointer-events-none",
            )}
          >
            <XIcon className="size-3.5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/* Improvement #2 — softer header border: use a lighter opacity */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1.5 px-6 py-5",
        "border-b border-[var(--border)]/60",
        "text-left",
        className,
      )}
      {...props}
    />
  );
}

/* Improvement #1 — no scrollbar: scrollbar-none replaces scrollbar-thin */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex-1 overflow-y-auto px-6 py-5",
        "scrollbar-none",
        className,
      )}
      {...props}
    />
  );
}

/* Improvement #2 — softer footer: lighter border, transparent bg */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 px-6 py-4",
        "border-t border-[var(--border)]/60",
        "bg-[var(--surface)]/50",
        "sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-[var(--muted-foreground)]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
