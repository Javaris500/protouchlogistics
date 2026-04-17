import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  CircleDollarSign,
  FileWarning,
  Filter,
  Truck,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

type NotificationTone = "primary" | "warning" | "danger" | "success" | "info";

interface NotificationEntry {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  unread: boolean;
  icon: LucideIcon;
  tone: NotificationTone;
  link?: { to: string; label: string };
}

const NOTIFICATIONS: NotificationEntry[] = [
  {
    id: "n_01",
    title: "Driver submission ready for review",
    body: "Devon Walker completed onboarding. Review CDL and medical card.",
    timestamp: "12 min ago",
    unread: true,
    icon: UserPlus,
    tone: "primary",
    link: { to: "/admin/drivers/pending", label: "Review submissions" },
  },
  {
    id: "n_02",
    title: "Medical card expires in 14 days",
    body: "Jordan Reeves — medical expires Apr 30. Suggested clinic in Dallas.",
    timestamp: "2 hours ago",
    unread: true,
    icon: FileWarning,
    tone: "warning",
    link: { to: "/admin/drivers", label: "Open driver" },
  },
  {
    id: "n_03",
    title: "Invoice paid: PTL-INV-2026-0012",
    body: "CH Robinson paid $7,250.00 via ACH. Marked paid.",
    timestamp: "Yesterday",
    unread: false,
    icon: CircleDollarSign,
    tone: "success",
    link: { to: "/admin/invoices", label: "View invoice" },
  },
  {
    id: "n_04",
    title: "POD uploaded — PTL-2026-0139",
    body: "Marcus Holloway uploaded POD. Emailed to CH Robinson.",
    timestamp: "Yesterday",
    unread: false,
    icon: Truck,
    tone: "info",
  },
];

function NotificationsPage() {
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Everything that needs your attention, in one place."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => toast.info("Filter panel — coming soon")}
            >
              <Filter className="size-4" /> Filter
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => toast.success("All notifications marked read")}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          </>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All
            {unreadCount > 0 && (
              <Badge variant="primary" className="ml-1 h-4 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <NotificationList items={NOTIFICATIONS} />
        </TabsContent>
        <TabsContent value="unread" className="mt-4">
          <NotificationList items={NOTIFICATIONS.filter((n) => n.unread)} />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <NotificationList
            items={NOTIFICATIONS.filter(
              (n) => n.tone === "warning" || n.tone === "danger",
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({ items }: { items: NotificationEntry[] }) {
  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-16">
        <Bell className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">You're all caught up</p>
      </Card>
    );
  }
  return (
    <Card className="gap-0 p-0">
      <ul className="divide-y divide-border">
        {items.map((n) => (
          <NotificationRow key={n.id} entry={n} />
        ))}
      </ul>
    </Card>
  );
}

function NotificationRow({ entry }: { entry: NotificationEntry }) {
  const Icon = entry.icon;
  return (
    <li
      className={cn(
        "flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-2)]/60",
        entry.unread && "bg-[var(--surface-2)]/30",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          toneBg(entry.tone),
        )}
      >
        <Icon className={cn("size-4", toneFg(entry.tone))} />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold">{entry.title}</span>
          <div className="flex shrink-0 items-center gap-2">
            {entry.unread && (
              <span
                aria-label="Unread"
                className="h-2 w-2 rounded-full bg-[var(--primary)]"
              />
            )}
            <span className="text-[11px] text-muted-foreground">
              {entry.timestamp}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{entry.body}</p>
        {entry.link && (
          <Link
            to={entry.link.to}
            className="mt-1 w-fit text-[11px] font-semibold text-[var(--primary)] hover:underline"
          >
            {entry.link.label} →
          </Link>
        )}
      </div>
    </li>
  );
}

function toneBg(tone: NotificationTone): string {
  switch (tone) {
    case "primary":
      return "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]";
    case "warning":
      return "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)]";
    case "danger":
      return "bg-[color-mix(in_oklab,var(--danger)_12%,transparent)]";
    case "success":
      return "bg-[color-mix(in_oklab,var(--success)_14%,transparent)]";
    case "info":
      return "bg-[color-mix(in_oklab,var(--info)_12%,transparent)]";
  }
}

function toneFg(tone: NotificationTone): string {
  switch (tone) {
    case "primary":
      return "text-[var(--primary)]";
    case "warning":
      return "text-[var(--warning)]";
    case "danger":
      return "text-[var(--danger)]";
    case "success":
      return "text-[var(--success)]";
    case "info":
      return "text-[var(--info)]";
  }
}
