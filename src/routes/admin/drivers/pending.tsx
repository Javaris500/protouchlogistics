import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  ClipboardCheck,
  MapPin,
  UserCircle2,
  X,
} from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/admin/drivers/pending")({
  component: PendingApprovalsPage,
});

const PENDING = [
  {
    id: "dr_p1",
    firstName: "Devon",
    lastName: "Walker",
    email: "devon.walker@example.com",
    city: "Fort Worth, TX",
    submittedAt: "2 hours ago",
    cdlClass: "A",
    medicalCardExpiration: "2026-09-14",
  },
  {
    id: "dr_p2",
    firstName: "Rashad",
    lastName: "Bennett",
    email: "rashad.b@example.com",
    city: "Memphis, TN",
    submittedAt: "Yesterday",
    cdlClass: "A",
    medicalCardExpiration: "2027-03-02",
  },
];

function PendingApprovalsPage() {
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
            title="You're all caught up"
            description="New onboarding submissions will appear here."
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
                  onClick={() => {
                    const reason = window.prompt(
                      `Reject ${d.firstName} ${d.lastName}'s submission? Enter a reason the driver will see:`,
                    );
                    if (!reason) return;
                    toast.error(`${d.firstName} ${d.lastName} rejected`);
                  }}
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
    </div>
  );
}
