import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import { toCsv, downloadCsv } from "@/lib/csv";
import {
  Columns3,
  Download,
  List,
  MapPin,
  PackagePlus,
  Plus,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ViewSwitcher } from "@/components/common/ViewSwitcher";
import { FilterChips } from "@/components/data/FilterChips";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { SortButton } from "@/components/data/SortButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoadStatus } from "@/components/ui/status-pill";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FIXTURE_LOADS, type FixtureLoad } from "@/lib/fixtures/loads";
import { formatDateShort, formatMoneyCents } from "@/lib/format";

export const Route = createFileRoute("/admin/loads/")({
  component: LoadsListPage,
});

type StatusFilter = "all" | "active" | "draft" | "completed" | "cancelled";

const STATUS_GROUPS: Record<StatusFilter, ReadonlySet<LoadStatus>> = {
  all: new Set<LoadStatus>([
    "draft",
    "assigned",
    "accepted",
    "en_route_pickup",
    "at_pickup",
    "loaded",
    "en_route_delivery",
    "at_delivery",
    "delivered",
    "pod_uploaded",
    "completed",
    "cancelled",
  ]),
  active: new Set<LoadStatus>([
    "assigned",
    "accepted",
    "en_route_pickup",
    "at_pickup",
    "loaded",
    "en_route_delivery",
    "at_delivery",
    "delivered",
    "pod_uploaded",
  ]),
  draft: new Set<LoadStatus>(["draft"]),
  completed: new Set<LoadStatus>(["completed"]),
  cancelled: new Set<LoadStatus>(["cancelled"]),
};

const PAGE_SIZE = 10;

type ViewMode = "table" | "board";

/** Board columns — logical groupings of the load status flow. */
const BOARD_COLUMNS: {
  id: string;
  label: string;
  statuses: LoadStatus[];
  tone: "neutral" | "info" | "primary" | "success" | "danger";
}[] = [
  { id: "draft", label: "Draft", statuses: ["draft"], tone: "neutral" },
  {
    id: "dispatched",
    label: "Dispatched",
    statuses: ["assigned", "accepted"],
    tone: "info",
  },
  {
    id: "in_transit",
    label: "In transit",
    statuses: [
      "en_route_pickup",
      "at_pickup",
      "loaded",
      "en_route_delivery",
      "at_delivery",
    ],
    tone: "primary",
  },
  {
    id: "delivered",
    label: "Delivered",
    statuses: ["delivered", "pod_uploaded", "completed"],
    tone: "success",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    statuses: ["cancelled"],
    tone: "danger",
  },
];

function LoadsListPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [broker, setBroker] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("table");

  const brokerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of FIXTURE_LOADS) map.set(l.broker.id, l.broker.companyName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FIXTURE_LOADS.filter((l) => {
      if (!STATUS_GROUPS[status].has(l.status)) return false;
      if (broker !== "all" && l.broker.id !== broker) return false;
      if (q) {
        const haystack = [
          l.loadNumber,
          l.referenceNumber ?? "",
          l.pickup.city,
          l.delivery.city,
          l.driver ? `${l.driver.firstName} ${l.driver.lastName}` : "",
          l.broker.companyName,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [status, broker, search]);

  const counts = useMemo(() => {
    const compute = (filter: StatusFilter) =>
      FIXTURE_LOADS.filter((l) => STATUS_GROUPS[filter].has(l.status)).length;
    return {
      all: FIXTURE_LOADS.length,
      active: compute("active"),
      draft: compute("draft"),
      completed: compute("completed"),
      cancelled: compute("cancelled"),
    };
  }, []);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Dispatch"
        title="Loads"
        description="All loads. Filter by status, broker, or search by load, reference, or city."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                const csv = toCsv(
                  filtered.map((l) => ({
                    load_number: l.loadNumber,
                    status: l.status,
                    broker: l.broker.companyName,
                    pickup: `${l.pickup.city}, ${l.pickup.state}`,
                    delivery: `${l.delivery.city}, ${l.delivery.state}`,
                    driver: l.driver
                      ? `${l.driver.firstName} ${l.driver.lastName}`
                      : "",
                    truck: l.truck?.unitNumber ?? "",
                    rate_cents: l.rateCents,
                    miles: l.miles ?? "",
                    reference: l.referenceNumber ?? "",
                  })),
                );
                if (!csv) {
                  toast.info("Nothing to export with current filters");
                  return;
                }
                downloadCsv(
                  `loads-${new Date().toISOString().slice(0, 10)}`,
                  csv,
                );
                toast.success(`Exported ${filtered.length} loads`);
              }}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button asChild variant="primary" size="md">
              <Link to="/admin/loads/new">
                <Plus className="size-4" />
                New load
              </Link>
            </Button>
          </>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips<StatusFilter>
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "draft", label: "Draft", count: counts.draft },
              {
                value: "completed",
                label: "Completed",
                count: counts.completed,
              },
              {
                value: "cancelled",
                label: "Cancelled",
                count: counts.cancelled,
              },
            ]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            label="Filter by status"
          />
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Select
              value={broker}
              onValueChange={(v) => {
                setBroker(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 min-w-0 md:min-w-[160px]">
                <SelectValue placeholder="Broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brokers</SelectItem>
                {brokerOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 md:w-72">
              <SearchInput
                value={search}
                onValueChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Load #, ref, city, driver…"
              />
            </div>
            <ViewSwitcher<ViewMode>
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Table", icon: List },
                { value: "board", label: "Board", icon: Columns3 },
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={PackagePlus}
              title="No loads match these filters"
              description="Adjust the filters above or create a new load to get started."
              action={
                <Button variant="primary" size="sm">
                  <Plus className="size-4" />
                  New load
                </Button>
              }
            />
          </div>
        ) : view === "table" ? (
          <>
            <LoadsTable rows={pageRows} />
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
          <LoadsBoard rows={filtered} />
        )}
      </Card>
    </div>
  );
}

function LoadsTable({ rows }: { rows: FixtureLoad[] }) {
  const navigate = useNavigate();
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>
            <SortButton>Load</SortButton>
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Lane</TableHead>
          <TableHead>Pickup</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-right">Miles</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((l) => (
          <TableRow
            key={l.id}
            className="cursor-pointer"
            onClick={() =>
              navigate({
                to: "/admin/loads/$loadId",
                params: { loadId: l.id },
              })
            }
          >
            <TableCell>
              <div className="flex flex-col">
                <Link
                  to="/admin/loads/$loadId"
                  params={{ loadId: l.id }}
                  className="font-mono text-sm font-semibold hover:text-[var(--primary)]"
                >
                  {l.loadNumber}
                </Link>
                {l.referenceNumber && (
                  <span className="text-[11px] text-muted-foreground">
                    ref {l.referenceNumber}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <StatusPill kind="load" status={l.status} />
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {l.pickup.city}, {l.pickup.state}
                <span className="mx-1.5 text-muted-foreground">→</span>
                {l.delivery.city}, {l.delivery.state}
              </span>
              <div className="text-[11px] text-muted-foreground">
                {l.commodity}
              </div>
            </TableCell>
            <TableCell className="text-sm">
              {formatDateShort(l.pickup.windowStart)}
            </TableCell>
            <TableCell>
              {l.driver ? (
                <div className="flex items-center gap-2">
                  <DriverAvatar
                    first={l.driver.firstName}
                    last={l.driver.lastName}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {l.driver.firstName} {l.driver.lastName}
                    </span>
                    {l.truck && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Truck className="size-3" aria-hidden />
                        {l.truck.unitNumber}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Unassigned
                </span>
              )}
            </TableCell>
            <TableCell className="text-sm">{l.broker.companyName}</TableCell>
            <TableCell className="text-right font-mono text-sm tabular-nums">
              {formatMoneyCents(l.rateCents)}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
              {l.miles ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
/*  Board view — Kanban-style columns grouped by status flow                  */
/* -------------------------------------------------------------------------- */

function LoadsBoard({ rows }: { rows: FixtureLoad[] }) {
  // Bucket loads into their board column based on status.
  const buckets = useMemo(() => {
    const map = new Map<string, FixtureLoad[]>();
    for (const col of BOARD_COLUMNS) map.set(col.id, []);
    for (const l of rows) {
      const col = BOARD_COLUMNS.find((c) => c.statuses.includes(l.status));
      if (col) map.get(col.id)?.push(l);
    }
    return map;
  }, [rows]);

  // Always show all 5 columns in Kanban flow order. When the viewport is
  // narrow enough that columns would get cramped, the container scrolls
  // horizontally — with the scrollbar visually hidden (trackpad / swipe /
  // keyboard scroll all still work). Above lg the columns share the width
  // equally and no scrolling occurs.
  return (
    <div className="scrollbar-none overflow-x-auto p-4 [scroll-padding-inline:1rem]">
      <div
        className={cn(
          "grid gap-3",
          // At and above lg, columns share the available width equally.
          // Below lg, each column takes 240px minimum which forces scroll.
          "grid-cols-[repeat(5,minmax(240px,1fr))]",
        )}
      >
        {BOARD_COLUMNS.map((col) => {
          const items = buckets.get(col.id) ?? [];
          return <BoardColumn key={col.id} column={col} items={items} />;
        })}
      </div>
    </div>
  );
}

type ColumnTone = (typeof BOARD_COLUMNS)[number]["tone"];

const TONE_DOT: Record<ColumnTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-[var(--info)]",
  primary: "bg-[var(--primary)]",
  success: "bg-[var(--success)]",
  danger: "bg-[var(--danger)]",
};

const TONE_ACCENT: Record<ColumnTone, string> = {
  neutral: "bg-[var(--border-strong)]",
  info: "bg-[var(--info)]",
  primary: "bg-[var(--primary)]",
  success: "bg-[var(--success)]",
  danger: "bg-[var(--danger)]",
};

function BoardColumn({
  column,
  items,
}: {
  column: (typeof BOARD_COLUMNS)[number];
  items: FixtureLoad[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              TONE_DOT[column.tone],
            )}
          />
          <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
            {column.label}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full",
            "bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground",
          )}
        >
          {items.length}
        </span>
      </div>

      {/* Column body — solid surface, clean border, generous padding */}
      <div
        className={cn(
          "flex min-h-[240px] flex-1 flex-col gap-2 p-2",
          "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]",
        )}
      >
        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-2 py-6 text-center text-[11px] italic text-[var(--subtle-foreground)]">
            No loads
          </div>
        ) : (
          items.map((l) => <BoardCard key={l.id} load={l} tone={column.tone} />)
        )}
      </div>
    </div>
  );
}

function BoardCard({ load: l, tone }: { load: FixtureLoad; tone: ColumnTone }) {
  const driverLabel = l.driver
    ? `${l.driver.firstName[0]}. ${l.driver.lastName}`
    : null;

  return (
    <Link
      to="/admin/loads/$loadId"
      params={{ loadId: l.id }}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden",
        "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)]",
        "px-3 py-2.5 pl-[14px]",
        "transition-[transform,box-shadow,border-color] duration-150",
        "hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
      )}
    >
      {/* Left accent strip tying card to its column tone */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-2 left-1 w-[3px] rounded-full",
          TONE_ACCENT[tone],
          "opacity-70 transition-opacity group-hover:opacity-100",
        )}
      />

      {/* Header: load # + rate */}
      <div className="flex items-start justify-between gap-2">
        <span className="truncate font-mono text-[13px] font-bold tracking-tight text-foreground">
          {l.loadNumber}
        </span>
        <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-foreground">
          {formatMoneyCents(l.rateCents)}
        </span>
      </div>

      {/* Broker */}
      <div className="-mt-2 truncate text-[11px] text-muted-foreground">
        {l.broker.companyName}
      </div>

      {/* Lane — origin → destination with vertical connector */}
      <div className="flex gap-2.5">
        <div aria-hidden="true" className="flex flex-col items-center py-1">
          <span className="size-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--background)]" />
          <span className="my-0.5 w-px flex-1 bg-[var(--border-strong)]" />
          <span className="size-1.5 rounded-full bg-[var(--primary)]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 text-[11px] leading-tight">
          <span className="truncate font-medium text-foreground">
            {l.pickup.city}, {l.pickup.state}
          </span>
          <span className="truncate text-muted-foreground">
            {l.delivery.city}, {l.delivery.state}
          </span>
        </div>
      </div>

      {/* Footer: driver + truck */}
      <div className="-mx-3 -mb-2.5 flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2">
        {driverLabel && l.driver ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <DriverAvatar first={l.driver.firstName} last={l.driver.lastName} />
            <span className="truncate text-[11px] font-medium text-foreground">
              {driverLabel}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-medium italic text-[var(--subtle-foreground)]">
            Unassigned
          </span>
        )}
        {l.truck && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1",
              "rounded-full bg-muted px-1.5 py-0.5",
              "text-[10px] font-semibold text-muted-foreground",
            )}
          >
            <Truck className="size-3" aria-hidden />
            <span className="font-mono">{l.truck.unitNumber}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
