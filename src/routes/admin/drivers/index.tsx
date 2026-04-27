import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  Truck,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { TableSkeleton } from "@/components/common/Skeleton";
import { ViewSwitcher } from "@/components/common/ViewSwitcher";
import { FilterChips } from "@/components/data/FilterChips";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { InviteDriverDialog } from "@/components/forms/InviteDriverDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DriverStatus } from "@/components/ui/status-pill";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysUntil, formatPhone } from "@/lib/format";
import {
  inviteDriver,
  listDrivers,
  type DriverListItem,
} from "@/server/functions/drivers";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/drivers/")({
  component: DriversListPage,
});

type StatusFilter = "all" | DriverStatus | "expiring";
type ViewMode = "table" | "grid";

const PAGE_SIZE = 10;

function nextExpiration(d: DriverListItem): {
  days: number | null;
  label: "CDL" | "Medical";
  date: string | null;
} {
  const cdlDays = d.cdlExpiration ? daysUntil(d.cdlExpiration) : null;
  const medDays = d.medicalCardExpiration
    ? daysUntil(d.medicalCardExpiration)
    : null;
  if (cdlDays == null && medDays == null) {
    return { days: null, label: "CDL", date: null };
  }
  if (cdlDays != null && (medDays == null || cdlDays <= medDays)) {
    return { days: cdlDays, label: "CDL", date: d.cdlExpiration };
  }
  return { days: medDays!, label: "Medical", date: d.medicalCardExpiration };
}

function isExpiring(d: DriverListItem): boolean {
  const e = nextExpiration(d);
  return e.days != null && e.days <= 30;
}

function DriversListPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("table");
  const [inviteOpen, setInviteOpen] = useState(false);

  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (email: string) => inviteDriver({ data: { email } }),
    onSuccess: (result) => {
      toast.success(
        `Invite sent. URL (until email goes live): ${result.inviteUrl}`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) => {
      toast.error(errorMessage(err));
    },
  });

  const driversQuery = useQuery({
    queryKey: ["admin", "drivers", { filter, search }],
    queryFn: () =>
      listDrivers({
        data: {
          status:
            filter === "all" || filter === "expiring" ? undefined : filter,
          expiringWithinDays: filter === "expiring" ? 30 : undefined,
          search: search.trim() || undefined,
          limit: 200,
          cursor: null,
        },
      }),
  });

  const allRows = driversQuery.data?.drivers ?? [];

  const counts = useMemo(
    () => ({
      all: allRows.length,
      active: allRows.filter((d) => d.status === "active").length,
      pending_approval: allRows.filter((d) => d.status === "pending_approval")
        .length,
      invited: allRows.filter((d) => d.status === "invited").length,
      suspended: allRows.filter((d) => d.status === "suspended").length,
      expiring: allRows.filter(isExpiring).length,
    }),
    [allRows],
  );

  // Server already applies filter+search; client paginates the page.
  const pageRows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Fleet"
        title="Drivers"
        description="Every driver — invites, pending approvals, and per-driver compliance."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="size-4" />
            Invite driver
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips<StatusFilter>
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              {
                value: "pending_approval",
                label: "Pending",
                count: counts.pending_approval,
              },
              { value: "invited", label: "Invited", count: counts.invited },
              {
                value: "suspended",
                label: "Suspended",
                count: counts.suspended,
              },
              {
                value: "expiring",
                label: "Expiring ≤30d",
                count: counts.expiring,
              },
            ]}
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
            label="Filter by status"
          />

          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="flex-1 md:w-72">
              <SearchInput
                value={search}
                onValueChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Name, email, city, CDL…"
              />
            </div>
            <ViewSwitcher<ViewMode>
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Table", icon: List },
                { value: "grid", label: "Grid", icon: LayoutGrid },
              ]}
            />
          </div>
        </div>

        <div className="p-0">
          <QueryBoundary
            query={driversQuery}
            emptyKey="drivers.filter"
            isEmpty={() => pageRows.length === 0}
            skeleton={<TableSkeleton rows={PAGE_SIZE} cols={7} className="m-3" />}
            emptyAction={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            }
          >
            {() =>
              view === "table" ? (
                <>
                  <DriversTable rows={pageRows} />
                  <div className="border-t border-border p-3">
                    <Pagination
                      page={page}
                      pageSize={PAGE_SIZE}
                      total={allRows.length}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              ) : (
                <>
                  <DriversGrid rows={pageRows} />
                  <div className="border-t border-border p-3">
                    <Pagination
                      page={page}
                      pageSize={PAGE_SIZE}
                      total={allRows.length}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              )
            }
          </QueryBoundary>
        </div>
      </Card>

      <InviteDriverDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={async ({ email }) => {
          await inviteMutation.mutateAsync(email);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table view                                                                */
/* -------------------------------------------------------------------------- */

function DriversTable({ rows }: { rows: DriverListItem[] }) {
  const navigate = useNavigate();
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Driver</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Truck</TableHead>
          <TableHead>Next expiration</TableHead>
          <TableHead className="text-right">Loads YTD</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => {
          const exp = nextExpiration(d);
          const expired = exp.days != null && exp.days < 0;
          const soon =
            !expired && exp.days != null && exp.days <= 30;
          const onRowClick = () => {
            if (d.id)
              navigate({
                to: "/admin/drivers/$driverId",
                params: { driverId: d.id },
              });
          };
          const fullName =
            [d.firstName, d.lastName].filter(Boolean).join(" ") || d.email;
          return (
            <TableRow
              key={d.userId}
              className={d.id ? "cursor-pointer" : undefined}
              onClick={onRowClick}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <DriverAvatar
                    first={d.firstName ?? d.email}
                    last={d.lastName ?? ""}
                  />
                  <div className="flex flex-col">
                    {d.id ? (
                      <Link
                        to="/admin/drivers/$driverId"
                        params={{ driverId: d.id }}
                        className="text-sm font-semibold hover:text-[var(--primary)]"
                      >
                        {fullName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold">{fullName}</span>
                    )}
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {d.cdlNumber || "—"}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusPill kind="driver" status={d.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-[12px] leading-snug">
                  <span>{d.phone ? formatPhone(d.phone) : "—"}</span>
                  <span className="text-muted-foreground">{d.email}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {d.city && d.state ? `${d.city}, ${d.state}` : "—"}
              </TableCell>
              <TableCell>
                {d.assignedTruck ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-mono text-[12px] font-semibold">
                    <Truck className="size-3" aria-hidden />
                    {d.assignedTruck.unitNumber}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {exp.days == null ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      expired && "bg-[var(--danger)]/12 text-[var(--danger)]",
                      soon && "bg-[var(--warning)]/18 text-[var(--warning)]",
                      !expired && !soon && "bg-muted text-muted-foreground",
                    )}
                  >
                    {expired ? (
                      <AlertTriangle className="size-3" />
                    ) : (
                      <CalendarClock className="size-3" />
                    )}
                    <span>
                      {exp.label}{" "}
                      {expired
                        ? `expired ${Math.abs(exp.days)}d ago`
                        : `${exp.days}d`}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                {d.loadsThisYear}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DriverAvatar({
  first,
  last,
  size = "sm",
}: {
  first: string;
  last: string;
  size?: "sm" | "lg";
}) {
  const initials = `${first[0] ?? ""}${last[0] ?? ""}`;
  const cls = size === "lg" ? "size-11 text-[14px]" : "size-8 text-[11px]";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/8",
        "font-semibold text-[var(--primary)]",
        "ring-1 ring-[var(--primary)]/20",
        cls,
      )}
    >
      {initials.toUpperCase()}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grid view — driver card                                                   */
/* -------------------------------------------------------------------------- */

function DriversGrid({ rows }: { rows: DriverListItem[] }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((d) => (
        <DriverCard key={d.userId} driver={d} />
      ))}
    </div>
  );
}

function DriverCard({ driver: d }: { driver: DriverListItem }) {
  const exp = nextExpiration(d);
  const expired = exp.days != null && exp.days < 0;
  const soon = !expired && exp.days != null && exp.days <= 30;
  const fullName =
    [d.firstName, d.lastName].filter(Boolean).join(" ") || d.email;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-[var(--background)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-center gap-3">
          <DriverAvatar
            first={d.firstName ?? d.email}
            last={d.lastName ?? ""}
            size="lg"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {fullName}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {d.cdlNumber || "CDL pending"}
            </p>
          </div>
        </div>
        <StatusPill kind="driver" status={d.status} />
      </div>

      <div className="flex items-center justify-between gap-3 border-y border-border bg-muted/30 px-4 py-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">
            <CalendarClock className="size-3" />
            <span>{exp.label} expiration</span>
          </div>
          <div
            className={cn(
              "font-mono text-[15px] font-semibold tabular-nums",
              expired && "text-[var(--danger)]",
              soon && "text-[var(--warning)]",
            )}
          >
            {exp.days == null
              ? "—"
              : expired
                ? "Expired"
                : exp.days === 0
                  ? "Today"
                  : `${exp.days}d`}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {exp.date ?? ""}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-4 py-3 text-[12px]">
        <Row icon={Phone}>{d.phone ? formatPhone(d.phone) : "—"}</Row>
        <Row icon={Mail}>
          <span className="truncate">{d.email}</span>
        </Row>
        <Row icon={MapPin}>
          {d.city && d.state ? `${d.city}, ${d.state}` : "—"}
        </Row>
        <Row icon={Truck}>
          {d.assignedTruck ? (
            <span className="font-mono font-semibold">
              #{d.assignedTruck.unitNumber}
            </span>
          ) : (
            <span className="text-[var(--subtle-foreground)]">
              No truck assigned
            </span>
          )}
        </Row>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5 text-[12px]">
        <span className="font-semibold uppercase tracking-wider text-[var(--subtle-foreground)]">
          Loads YTD
        </span>
        <span className="font-mono text-[13px] font-bold tabular-nums">
          {d.loadsThisYear}
        </span>
      </div>
    </article>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 truncate text-foreground">{children}</span>
    </div>
  );
}
