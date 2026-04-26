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
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/admin/drivers/pending")({
  component: PendingApprovalsPage,
});

interface PendingDriver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  submittedAt: string;
  cdlClass: string;
  medicalCardExpiration: string;
}

const PENDING: PendingDriver[] = [];

function PendingApprovalsPage() {
  const [rejecting, setRejecting] = React.useState<PendingDriver | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/drivers">Back to drivers</BackLink>

      <PageHeader
        eyebrow="Drivers"
        title="Pending approvals"
        description="Onboarding submissions awaiting your review. Approve to activate; reject with a reason to send back."
      />

      {PENDING.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={ClipboardCheck}
            variant={EMPTY_COPY["drivers.pending"].variant}
            title={EMPTY_COPY["drivers.pending"].title}
            description={EMPTY_COPY["drivers.pending"].description}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {PENDING.map((d) => (
            <Card
              key={d.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-sm font-semibold">
                  {d.firstName[0]}
                  {d.lastName[0]}
                </div>
                <div className="flex flex-col gap-1">
                  <Link
                    to="/admin/drivers/$driverId"
                    params={{ driverId: d.id }}
                    className="text-sm font-semibold hover:text-[var(--primary)]"
                  >
                    {d.firstName} {d.lastName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {d.email}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> {d.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" /> Submitted {d.submittedAt}
                    </span>
                    <Badge variant="muted" className="text-[10px]">
                      CDL {d.cdlClass}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
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
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => setRejecting(d)}
                >
                  <X className="size-4" />
                  <span>Reject</span>
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    toast.success(
                      `${d.firstName} ${d.lastName} approved — email sent`,
                    );
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

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(next) => {
          if (!next) setRejecting(null);
        }}
        tone="danger"
        title={
          rejecting
            ? `Reject ${rejecting.firstName} ${rejecting.lastName}'s submission?`
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
          if (!rejecting) return;
          toast.error(`${rejecting.firstName} ${rejecting.lastName} rejected`);
          void reason;
          setRejecting(null);
        }}
      />
    </div>
  );
}
