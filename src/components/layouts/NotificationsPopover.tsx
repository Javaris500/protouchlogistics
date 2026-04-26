import * as React from "react";
import { Bell } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { EMPTY_COPY } from "@/lib/empty-copy";
import { cn } from "@/lib/utils";

type NotificationKind =
  | "doc_expiring"
  | "doc_expired"
  | "load_delivered"
  | "load_assigned"
  | "driver_onboarding"
  | "invoice_paid"
  | "pay_changed"
  | "system";

interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const SEED: Notification[] = [];

/**
 * Topbar notifications popover. Uses Radix Popover — click outside, Escape,
 * and focus-trap behaviors are handled automatically.
 *
 * Responsive width: shrinks to viewport width minus 1rem on small screens,
 * caps at 22rem on tablet/desktop. Max height caps at 70vh mobile, 28rem
 * desktop so the list never overflows the viewport.
 */
export function NotificationsPopover() {
  const [items] = React.useState<Notification[]>(SEED);
  const unreadCount = items.filter((n) => n.unread).length;

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
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold tracking-tight">
              Notifications
            </h3>
          </div>
        </header>

        <div className="p-3">
          <EmptyState
            title={EMPTY_COPY["notifications.firstTime"].title}
            description={EMPTY_COPY["notifications.firstTime"].description}
            variant={EMPTY_COPY["notifications.firstTime"].variant}
            icon={Bell}
            className="gap-2 border-0 bg-transparent px-2 py-4"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
