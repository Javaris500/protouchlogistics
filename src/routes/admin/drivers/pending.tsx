import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  Calendar,
  Check,
  ClipboardCheck,
  MapPin,
  UserCircle2,
  X,
} from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { CardSkeleton } from "@/components/common/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import {
  approveDriver,
  listPendingApprovals,
  rejectDriver,
  type DriverListItem,
} from "@/server/functions/drivers";

export const Route = createFileRoute("/admin/drivers/pending")({
  component: PendingApprovalsPage,
});

function PendingApprovalsPage() {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = React.useState<DriverListItem | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["admin", "drivers", "pending"],
    queryFn: () => listPendingApprovals({ data: { limit: 100, cursor: null } }),
  });

  const approveMutation = useMutation({
    mutationFn: (driverId: string) => approveDriver({ data: { driverId } }),
    onSuccess: (_, driverId) => {
      const driver = pendingQuery.data?.drivers.find((d) => d.id === driverId);
      toast.success(
        `${[driver?.firstName, driver?.lastName].filter(Boolean).join(" ") || "Driver"} approved`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ driverId, reason }: { driverId: string; reason: string }) =>
      rejectDriver({ data: { driverId, reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/drivers">Back to drivers</BackLink>

      <PageHeader
        eyebrow="Drivers"
        title="Pending approvals"
        description="Onboarding submissions awaiting your review. Approve to activate; reject with a reason to send back."
      />

      <QueryBoundary
        query={pendingQuery}
        emptyKey="drivers.pending"
        isEmpty={(d) => d.drivers.length === 0}
        skeleton={<CardSkeleton />}
      >
        {(data) => (
          <div className="flex flex-col gap-3">
            {data.drivers.map((d) => (
              <Card
                key={d.userId}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-sm font-semibold">
                    {(d.firstName?.[0] ?? d.email[0] ?? "").toUpperCase()}
                    {(d.lastName?.[0] ?? "").toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-1">
                    {d.id ? (
                      <Link
                        to="/admin/drivers/$driverId"
                        params={{ driverId: d.id }}
                        className="text-sm font-semibold hover:text-[var(--primary)]"
                      >
                        {[d.firstName, d.lastName].filter(Boolean).join(" ") ||
                          d.email}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold">{d.email}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {d.email}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {d.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {d.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> Submitted{" "}
                        {new Date(d.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {d.cdlClass && (
                        <Badge variant="muted" className="text-[10px]">
                          CDL {d.cdlClass}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
                  {d.id && (
                    <Button
                      variant="outline"
                      size="md"
                      asChild
                      className="w-full sm:w-auto"
                    >
                      <Link
                        to="/admin/drivers/$driverId"
                        params={{ driverId: d.id }}
                      >
                        <UserCircle2 className="size-4" />
                        <span>Review</span>
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full sm:w-auto"
                    onClick={() => setRejecting(d)}
                    disabled={!d.id}
                  >
                    <X className="size-4" />
                    <span>Reject</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                    disabled={!d.id || approveMutation.isPending}
                    onClick={() => {
                      if (d.id) approveMutation.mutate(d.id);
                    }}
                  >
                    <Check className="size-4" />
                    <span>Approve</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(next) => {
          if (!next) setRejecting(null);
        }}
        tone="danger"
        title={
          rejecting
            ? `Reject ${[rejecting.firstName, rejecting.lastName].filter(Boolean).join(" ") || rejecting.email}'s submission?`
            : "Reject submission?"
        }
        description="The driver sees this reason in an email and can resubmit. Keep it specific so they can fix the issue on the next try."
        confirmLabel="Reject submission"
        input={{
          label: "Reason (shown to the driver)",
          placeholder: "e.g. CDL photo was blurry — please re-upload.",
          multiline: true,
          rows: 3,
          required: true,
        }}
        onConfirm={(reason) => {
          if (!rejecting?.id || !reason) return;
          rejectMutation.mutate({ driverId: rejecting.id, reason });
          setRejecting(null);
        }}
      />
    </div>
  );
}
