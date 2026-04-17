import * as React from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  DollarSign,
  FileCheck2,
  PackageCheck,
  Truck,
  UserCheck,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationKind =
  | "doc_expiring"
  | "doc_expired"
  | "load_delivered"
  | "load_assigned"
  | "driver_onboarding"
  | "invoice_paid"
  | "system";

interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

// Mock data — replace with server-function fetch once backend lands.
const SEED: Notification[] = [
  {
    id: "n1",
    kind: "doc_expired",
    title: "Medical card expired",
    body: "Sara Chen's medical expired 2 days ago. She can't be assigned new loads.",
    time: "2h ago",
    unread: true,
  },
  {
    id: "n2",
    kind: "load_delivered",
    title: "Load PTL-2026-0141 delivered",
    body: "Marcus delivered to Chicago. POD uploaded automatically and sent to broker.",
    time: "3h ago",
    unread: true,
  },
  {
    id: "n3",
    kind: "driver_onboarding",
    title: "Tyrone Hill submitted onboarding",
    body: "CDL photo, medical, and profile ready for your review.",
    time: "5h ago",
    unread: true,
  },
  {
    id: "n4",
    kind: "invoice_paid",
    title: "Invoice INV-2026-0038 paid",
    body: "CH Robinson paid $285,000 by ACH — 14 days early.",
    time: "1d ago",
    unread: false,
  },
  {
    id: "n5",
    kind: "doc_expiring",
    title: "Registration expiring in 30 days",
    body: "Truck #102 needs renewal by May 22. Fine starts at $50/day after.",
    time: "2d ago",
    unread: false,
  },
  {
    id: "n6",
    kind: "load_assigned",
    title: "Load PTL-2026-0145 assigned",
    body: "Jordan accepted the St. Louis → Memphis run for Monday morning.",
    time: "3d ago",
    unread: false,
  },
];

const ICONS: Record<
  NotificationKind,
  React.ComponentType<{ className?: string }>
> = {
  doc_expiring: FileCheck2,
  doc_expired: AlertTriangle,
  load_delivered: PackageCheck,
  load_assigned: Truck,
  driver_onboarding: UserCheck,
  invoice_paid: DollarSign,
  system: Bell,
};

const ICON_TONES: Record<NotificationKind, string> = {
  doc_expiring: "bg-[var(--warning)]/15 text-[var(--warning)]",
  doc_expired: "bg-[var(--danger)]/12 text-[var(--danger)]",
  load_delivered: "bg-[var(--success)]/12 text-[var(--success)]",
  load_assigned: "bg-[var(--info)]/12 text-[var(--info)]",
  driver_onboarding: "bg-[var(--primary)]/12 text-[var(--primary)]",
  invoice_paid: "bg-[var(--success)]/12 text-[var(--success)]",
  system: "bg-muted text-[var(--muted-foreground)]",
};

/**
 * Topbar notifications popover. Uses Radix Popover — click outside, Escape,
 * and focus-trap behaviors are handled automatically.
 *
 * Responsive width: shrinks to viewport width minus 1rem on small screens,
 * caps at 22rem on tablet/desktop. Max height caps at 70vh mobile, 28rem
 * desktop so the list never overflows the viewport.
 */
export function NotificationsPopover() {
  const [items, setItems] = React.useState<Notification[]>(SEED);
  const unreadCount = items.filter((n) => n.unread).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markOneRead = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--primary)] ring-2 ring-[var(--background)]"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn("w-[min(calc(100vw-1rem),22rem)] p-0", "overflow-hidden")}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold tracking-tight">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--primary)]/15 px-1.5 text-[11px] font-bold tabular-nums text-[var(--primary)]">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          )}
        </header>

        {/* Body */}
        {items.length === 0 ? (
          <EmptyBody />
        ) : (
          <ul className="scrollbar-thin max-h-[70vh] divide-y divide-border overflow-y-auto sm:max-h-[28rem]">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onClick={() => markOneRead(n.id)}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification: n,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const Icon = ICONS[n.kind];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group flex w-full items-start gap-3 px-4 py-3 text-left",
          "transition-colors duration-100",
          "hover:bg-muted/60 focus:outline-none focus-visible:bg-muted/60",
          n.unread && "bg-[var(--primary)]/[0.035]",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            ICON_TONES[n.kind],
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-[13px] leading-snug",
                n.unread
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            >
              {n.title}
            </p>
            {n.unread && (
              <span
                aria-label="Unread"
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--primary)]"
              />
            )}
          </div>
          <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {n.body}
          </p>
          <p className="pt-1 text-[11px] text-[var(--subtle-foreground)]">
            {n.time}
          </p>
        </div>
      </button>
    </li>
  );
}

function EmptyBody() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bell className="size-4" />
      </div>
      <p className="text-[13px] font-medium text-foreground">
        You're all caught up.
      </p>
      <p className="text-[12px] text-muted-foreground">
        New updates will show up here.
      </p>
    </div>
  );
}
