import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  Check,
  Clock,
  FileText,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Printer,
  Truck,
  Upload,
  User,
  XCircle,
} from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FIXTURE_LOADS } from "@/lib/fixtures/loads";
import { formatDateShort, formatMoneyCents } from "@/lib/format";

export const Route = createFileRoute("/admin/loads/$loadId")({
  loader: ({ params }) => {
    const load = FIXTURE_LOADS.find((l) => l.id === params.loadId);
    if (!load) throw notFound();
    return { load };
  },
  component: LoadDetailPage,
});

function LoadDetailPage() {
  const { load } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/loads">Back to loads</BackLink>

      <PageHeader
        eyebrow="Load"
        title={
          <span className="inline-flex items-center gap-3">
            <span className="font-mono">{load.loadNumber}</span>
            <StatusPill kind="load" status={load.status} />
          </span>
        }
        description={
          load.referenceNumber
            ? `Broker reference: ${load.referenceNumber}`
            : undefined
        }
        actions={
          <>
            <Button variant="outline" size="md">
              <Pencil className="size-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More actions"
                  className="rounded-md"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Load actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Check /> Mark delivered
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Upload /> Upload POD
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Printer /> Print rate con
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <XCircle /> Cancel load
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">Status history</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <StopCard
                kind="pickup"
                city={load.pickup.city}
                state={load.pickup.state}
                window={`${formatDateShort(load.pickup.windowStart)} — ${formatDateShort(load.pickup.windowEnd)}`}
              />
              <StopCard
                kind="delivery"
                city={load.delivery.city}
                state={load.delivery.state}
                window={`${formatDateShort(load.delivery.windowStart)} — ${formatDateShort(load.delivery.windowEnd)}`}
              />
              <Card className="gap-0 p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Package className="size-3.5" /> Cargo
                </div>
                <Separator className="my-3" />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <Field label="Commodity" value={load.commodity} />
                  <Field
                    label="Weight"
                    value={
                      load.weight ? `${load.weight.toLocaleString()} lbs` : "—"
                    }
                  />
                  <Field
                    label="Pieces"
                    value={load.pieces ? String(load.pieces) : "—"}
                  />
                  <Field
                    label="Miles"
                    value={
                      load.miles ? `${load.miles.toLocaleString()} mi` : "—"
                    }
                  />
                </dl>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card className="gap-0 p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Building2 className="size-3.5" /> Broker & rate
                </div>
                <Separator className="my-3" />
                <div className="flex flex-col gap-3">
                  <Field label="Broker" value={load.broker.companyName} />
                  <Field
                    label="Line-haul"
                    value={formatMoneyCents(load.rateCents)}
                    mono
                  />
                </div>
              </Card>

              <Card className="gap-0 p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Truck className="size-3.5" /> Assignment
                </div>
                <Separator className="my-3" />
                <div className="flex flex-col gap-3">
                  <Field
                    label="Driver"
                    value={
                      load.driver
                        ? `${load.driver.firstName} ${load.driver.lastName}`
                        : "Unassigned"
                    }
                  />
                  <Field
                    label="Truck"
                    value={load.truck ? `Unit ${load.truck.unitNumber}` : "—"}
                    mono
                  />
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Rate confirmation, BOL, POD</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Documents attached to this load will appear here. Upload via the
              load actions menu.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTimeline />
        </TabsContent>

        <TabsContent value="tracking" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <MapPin className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Breadcrumb map</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Full breadcrumb trail for this load appears once GPS data is
              available. Wires to Mapbox.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StopCard({
  kind,
  city,
  state,
  window,
}: {
  kind: "pickup" | "delivery";
  city: string;
  state: string;
  window: string;
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <MapPin className="size-3.5" />
        {kind === "pickup" ? "Pickup" : "Delivery"}
      </div>
      <Separator className="my-3" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold">
            {city}, {state}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3" /> {window}
          </span>
        </div>
        <Badge variant="muted" className="shrink-0">
          {kind === "pickup" ? "Origin" : "Destination"}
        </Badge>
      </div>
    </Card>
  );
}

function HistoryTimeline() {
  const entries = [
    { at: "2h ago", who: "Gary Tavel", action: "assigned → accepted" },
    { at: "5h ago", who: "Gary Tavel", action: "draft → assigned" },
    { at: "Yesterday", who: "Gary Tavel", action: "Load created" },
  ];
  return (
    <Card className="gap-0 p-0">
      <ul className="divide-y divide-border">
        {entries.map((e, i) => (
          <li key={i} className="flex items-start gap-4 px-5 py-4">
            <div className="mt-1 size-2 rounded-full bg-[var(--primary)]" />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium">{e.action}</span>
              <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="size-3" /> {e.who}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" /> {e.at}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-sm tabular-nums" : "text-sm"}>
        {value}
      </dd>
    </div>
  );
}
