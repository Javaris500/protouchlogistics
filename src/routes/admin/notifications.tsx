import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck, Filter } from "lucide-react";

import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
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
              disabled
              onClick={() => toast.success("All notifications marked read")}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          </>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <EmptyBoard />
        </TabsContent>
        <TabsContent value="unread" className="mt-4">
          <EmptyBoard />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <EmptyBoard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyBoard() {
  return (
    <EmptyState
      icon={Bell}
      title={EMPTY_COPY["notifications.firstTime"].title}
      description={EMPTY_COPY["notifications.firstTime"].description}
      variant={EMPTY_COPY["notifications.firstTime"].variant}
    />
  );
}
