import { Link } from "@tanstack/react-router";
import {
  Building2,
  Package,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type EntityKind = "driver" | "truck" | "broker" | "load";

const KIND_ICON: Record<EntityKind, LucideIcon> = {
  driver: UserRound,
  truck: Truck,
  broker: Building2,
  load: Package,
};

interface BaseProps {
  id: string;
  label: string;
  sublabel?: string;
  mono?: boolean;
  size?: "sm" | "md";
  className?: string;
}

type EntityChipProps = BaseProps & { kind: EntityKind };

/**
 * Inline clickable pill linking to a detail page. Used anywhere we reference
 * another entity from inside a card — driver on a load, truck on a driver,
 * broker on an invoice, etc.
 *
 * Switches on `kind` so the TanStack Router Link stays strictly typed against
 * the param shape per route.
 */
export function EntityChip(props: EntityChipProps) {
  const content = <ChipContent {...props} />;

  switch (props.kind) {
    case "driver":
      return (
        <Link
          to="/admin/drivers/$driverId"
          params={{ driverId: props.id }}
          className={chipClass(props)}
        >
          {content}
        </Link>
      );
    case "truck":
      return (
        <Link
          to="/admin/trucks/$truckId"
          params={{ truckId: props.id }}
          className={chipClass(props)}
        >
          {content}
        </Link>
      );
    case "broker":
      return (
        <Link
          to="/admin/brokers/$brokerId"
          params={{ brokerId: props.id }}
          className={chipClass(props)}
        >
          {content}
        </Link>
      );
    case "load":
      return (
        <Link
          to="/admin/loads/$loadId"
          params={{ loadId: props.id }}
          className={chipClass(props)}
        >
          {content}
        </Link>
      );
  }
}

function chipClass({ size = "md", className }: EntityChipProps): string {
  return cn(
    "group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)]",
    "bg-[var(--background)] transition-colors",
    "hover:border-[var(--primary)]/40 hover:bg-[var(--surface)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
    className,
  );
}

function ChipContent({
  kind,
  label,
  sublabel,
  mono,
  size = "md",
}: EntityChipProps) {
  const Icon = KIND_ICON[kind];
  return (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          "bg-[var(--surface-2)] text-muted-foreground",
          "group-hover:bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface-2))] group-hover:text-[var(--primary)]",
          size === "sm" ? "size-4 [&_svg]:size-2.5" : "size-5 [&_svg]:size-3",
        )}
      >
        <Icon aria-hidden="true" />
      </span>
      <span
        className={cn(
          "truncate leading-none text-[var(--foreground)]",
          mono ? "font-mono font-semibold" : "font-medium",
        )}
      >
        {label}
      </span>
      {sublabel && (
        <span className="truncate text-muted-foreground">· {sublabel}</span>
      )}
    </>
  );
}
