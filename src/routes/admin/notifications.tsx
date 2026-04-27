import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck, Filter } from "lucide-react";

import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { CardSkeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeFromNow } from "@/lib/format";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/functions/notifications";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () =>
      listNotifications({ data: { unreadOnly: false, limit: 100, cursor: null } }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: ({ count }) => {
      toast.success(`${count} notification${count === 1 ? "" : "s"} marked read`);
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const markOneMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead({ data: { notificationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const all = notificationsQuery.data?.notifications ?? [];
  const unread = all.filter((n) => !n.readAt);

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
              disabled={
                unread.length === 0 || markAllMutation.isPending
              }
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          </>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread{unread.length > 0 ? ` (${unread.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <QueryBoundary
            query={notificationsQuery}
            isEmpty={(d) => d.notifications.length === 0}
            emptyKey="notifications.firstTime"
            skeleton={<CardSkeleton />}
          >
            {() => (
              <NotificationList
                items={all}
                onMarkRead={(id) => markOneMutation.mutate(id)}
              />
            )}
          </QueryBoundary>
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <QueryBoundary
            query={notificationsQuery}
            isEmpty={() => unread.length === 0}
            emptyKey="notifications.firstTime"
            skeleton={<CardSkeleton />}
          >
            {() => (
              <NotificationList
                items={unread}
                onMarkRead={(id) => markOneMutation.mutate(id)}
              />
            )}
          </QueryBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationListItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

function NotificationList({
  items,
  onMarkRead,
}: {
  items: NotificationListItem[];
  onMarkRead: (id: string) => void;
}) {
  return (
    <Card className="gap-0 p-0">
      <ul className="divide-y divide-border">
        {items.map((n) => (
          <li
            key={n.id}
            className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={
                  "mt-1 flex size-8 shrink-0 items-center justify-center rounded-md " +
                  (n.readAt
                    ? "bg-muted text-muted-foreground"
                    : "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]")
                }
              >
                <Bell className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {n.body}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatRelativeFromNow(n.createdAt)}
                </span>
              </div>
            </div>
            {!n.readAt && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkRead(n.id)}
              >
                Mark read
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
