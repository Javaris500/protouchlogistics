import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  Gauge,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Truck,
  UserPlus,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ViewSwitcher } from "@/components/common/ViewSwitcher";
import { FilterChips } from "@/components/data/FilterChips";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { AddTruckDialog } from "@/components/forms/AddTruckDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { ExpirationBadge } from "@/components/ui/expiration-badge";
import type { TruckStatus } from "@/components/ui/status-pill";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FIXTURE_TRUCKS, type FixtureTruck } from "@/lib/fixtures/trucks";
import { daysUntil } from "@/lib/format";

export const Route = createFileRoute("/admin/trucks/")({
  component: TrucksListPage,
});

type StatusFilter = "all" | TruckStatus | "expiring";

const PAGE_SIZE = 10;

/** A truck is "expiring soon" if any doc expires within 30 days. */
function isExpiring(t: FixtureTruck): boolean {
  const dates = [
    t.registrationExpiration,
    t.insuranceExpiration,
    t.annualInspectionExpiration,
  ];
  return dates.some((d) => {
    const days = daysUntil(d);
    return days <= 30;
  });
}

type ViewMode = "table" | "grid";

function TrucksListPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("table");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FIXTURE_TRUCKS.filter((t) => {
      if (filter === "expiring") {
        if (!isExpiring(t)) return false;
      } else if (filter !== "all" && t.status !== filter) {
        return false;
      }
      if (q) {
        const haystack = [
          t.unitNumber,
          t.vin,
          t.make,
          t.model,
          String(t.year),
          t.licensePlate,
          t.assignedDriver
            ? `${t.assignedDriver.firstName} ${t.assignedDriver.lastName}`
            : "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filter, search]);

  const counts = useMemo(
    () => ({
      all: FIXTURE_TRUCKS.length,
      active: FIXTURE_TRUCKS.filter((t) => t.status === "active").length,
      in_shop: FIXTURE_TRUCKS.filter((t) => t.status === "in_shop").length,
      out_of_service: FIXTURE_TRUCKS.filter(
        (t) => t.status === "out_of_service",
      ).length,
      expiring: FIXTURE_TRUCKS.filter(isExpiring).length,
    }),
    [],
  );

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Fleet"
        title="Trucks"
        description="Every tractor and trailer. Track assignments, registration, insurance, and annual inspection expirations."
        actions={
          <Button variant="primary" size="md" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add truck
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips<StatusFilter>
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "in_shop", label: "In shop", count: counts.in_shop },
              {
                value: "out_of_service",
                label: "Out of service",
                count: counts.out_of_service,
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
                placeholder="Unit #, VIN, make, driver…"
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

        {pageRows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Truck}
              title="No trucks match these filters"
              description="Adjust the filters above or add a new truck to the fleet."
              action={
                <Button variant="primary" size="sm">
                  <Plus className="size-4" />
                  Add truck
                </Button>
              }
            />
          </div>
        ) : view === "table" ? (
          <>
            <TrucksTable rows={pageRows} />
            <div className="border-t border-border p-3">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <>
            <TrucksGrid rows={pageRows} />
            <div className="border-t border-border p-3">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      <AddTruckDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function TrucksTable({ rows }: { rows: FixtureTruck[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Unit</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>VIN</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned driver</TableHead>
          <TableHead>Registration</TableHead>
          <TableHead>Insurance</TableHead>
          <TableHead>Inspection</TableHead>
          <TableHead className="text-right">Mileage</TableHead>
          <TableHead className="w-[52px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id} className="cursor-pointer">
            <TableCell>
              <Link
                to="/admin/trucks/$truckId"
                params={{ truckId: t.id }}
                className="font-mono text-sm font-semibold hover:text-[var(--primary)]"
              >
                {t.unitNumber}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {t.year} {t.make} {t.model}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t.licensePlate} · {t.plateState}
                </span>
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {t.vin}
            </TableCell>
            <TableCell>
              <StatusPill kind="truck" status={t.status} />
            </TableCell>
            <TableCell>
              {t.assignedDriver ? (
                <div className="flex items-center gap-2">
                  <DriverAvatar
                    first={t.assignedDriver.firstName}
                    last={t.assignedDriver.lastName}
                  />
                  <span className="text-sm">
                    {t.assignedDriver.firstName} {t.assignedDriver.lastName}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-[var(--primary)]"
                >
                  <UserPlus className="size-3" aria-hidden />
                  Assign
                </button>
              )}
            </TableCell>
            <TableCell>
              <ExpirationBadge date={t.registrationExpiration} />
            </TableCell>
            <TableCell>
              <ExpirationBadge date={t.insuranceExpiration} />
            </TableCell>
            <TableCell>
              <ExpirationBadge date={t.annualInspectionExpiration} />
            </TableCell>
            <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
              {t.currentMileage.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              <TruckRowActions truck={t} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TruckRowActions({ truck }: { truck: FixtureTruck }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for truck ${truck.unitNumber}`}
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Unit {truck.unitNumber}</DropdownMenuLabel>
        <DropdownMenuItem>
          <Pencil />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <UserPlus />
          Assign driver
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={truck.status === "in_shop"}>
          <Wrench />
          Move to shop
        </DropdownMenuItem>
        <DropdownMenuItem disabled={truck.status === "out_of_service"}>
          <XCircle />
          Out of service
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">
          <Trash2 />
          Retire truck
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DriverAvatar({ first, last }: { first: string; last: string }) {
  const initials = `${first[0] ?? ""}${last[0] ?? ""}`;
  return (
    <div
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
    >
      {initials}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grid view — visual card per truck                                         */
/* -------------------------------------------------------------------------- */

function TrucksGrid({ rows }: { rows: FixtureTruck[] }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((t) => (
        <TruckCard key={t.id} truck={t} />
      ))}
    </div>
  );
}

function TruckCard({ truck: t }: { truck: FixtureTruck }) {
  const nextExp = nextExpirationLabel(t);
  const urgent = nextExp.days <= 30;

  return (
    <Link
      to="/admin/trucks/$truckId"
      params={{ truckId: t.id }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-[var(--background)]",
        "transition-all duration-150",
        "border-border hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]",
      )}
    >
      {/* Top accent bar follows status tone */}
      <div
        className={cn(
          "h-1 w-full",
          t.status === "active" && "bg-[var(--success)]",
          t.status === "in_shop" && "bg-[var(--warning)]",
          t.status === "out_of_service" && "bg-[var(--danger)]",
        )}
      />

      <div className="flex flex-col gap-4 p-4">
        {/* Header — unit + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)] text-muted-foreground">
              <Truck className="size-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 leading-tight">
              <span className="font-mono text-[15px] font-bold tracking-tight text-foreground">
                #{t.unitNumber}
              </span>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {t.year} {t.make} {t.model}
              </p>
            </div>
          </div>
          <StatusPill kind="truck" status={t.status} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 border-y border-border py-3">
          <StatBlock
            icon={Gauge}
            label="Mileage"
            value={t.currentMileage.toLocaleString()}
            suffix="mi"
          />
          <StatBlock
            icon={CalendarClock}
            label={`${nextExp.label} exp.`}
            value={
              nextExp.days < 0
                ? "Expired"
                : nextExp.days === 0
                  ? "Today"
                  : `${nextExp.days}d`
            }
            tone={nextExp.days < 0 ? "danger" : urgent ? "warning" : "neutral"}
          />
        </div>

        {/* Driver + plate */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <UserRound className="size-3.5" />
            {t.assignedDriver ? (
              <span className="font-medium text-foreground">
                {t.assignedDriver.firstName} {t.assignedDriver.lastName}
              </span>
            ) : (
              <span className="text-[var(--subtle-foreground)]">
                Unassigned
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-mono text-[11px]">{t.licensePlate}</span>
            <span className="text-[var(--subtle-foreground)]">·</span>
            <span className="font-mono text-[11px]">{t.plateState}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  suffix,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix?: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">
        <Icon className="size-3" />
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "font-mono text-[15px] font-semibold tabular-nums",
          tone === "danger" && "text-[var(--danger)]",
          tone === "warning" && "text-[var(--warning)]",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-[11px] font-normal text-[var(--subtle-foreground)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function nextExpirationLabel(t: FixtureTruck): {
  label: "Registration" | "Insurance" | "Inspection";
  days: number;
} {
  const items = [
    { label: "Registration" as const, date: t.registrationExpiration },
    { label: "Insurance" as const, date: t.insuranceExpiration },
    { label: "Inspection" as const, date: t.annualInspectionExpiration },
  ];
  const now = Date.now();
  const withDays = items.map((i) => ({
    ...i,
    days: Math.floor(
      (new Date(i.date).getTime() - now) / (1000 * 60 * 60 * 24),
    ),
  }));
  const sorted = withDays.sort((a, b) => a.days - b.days);
  // Safe: items array is non-empty by construction.
  return sorted[0] ?? { label: "Registration", days: 0 };
}
