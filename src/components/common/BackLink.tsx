import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface BackLinkProps {
  to: LinkProps["to"];
  params?: LinkProps["params"];
  children: React.ReactNode;
  className?: string;
}

/**
 * Small "← Back to Loads" style link shown above a detail page header.
 * Keeps detail pages self-contained and discoverable.
 */
export function BackLink({ to, params, children, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "inline-flex w-fit items-center gap-1.5",
        "text-xs font-medium text-[var(--muted-foreground)]",
        "transition-colors hover:text-[var(--foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-sm",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {children}
    </Link>
  );
}
