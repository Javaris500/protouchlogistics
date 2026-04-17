import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  Building2,
  CreditCard,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/brokers/$brokerId")({
  component: BrokerDetailPage,
});

function BrokerDetailPage() {
  const { brokerId } = Route.useParams();

  // Placeholder — no brokers fixture yet. Swapped for real data on wire-up.
  const broker = {
    id: brokerId,
    companyName: "CH Robinson",
    mcNumber: "123456",
    dotNumber: "7654321",
    contactName: "Jane Dispatcher",
    contactEmail: "dispatch@chrobinson.com",
    billingEmail: "billing@chrobinson.com",
    contactPhone: "(555) 123-4567",
    paymentTerms: "net_30",
    status: "active" as const,
    grade: "A" as const,
  };

  const scorecard = {
    avgDaysToPay: 31,
    onTimeRate: 0.92,
    avgRatePerMile: 285,
    loadsYtd: 47,
    revenueYtdCents: 128500_00,
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/brokers">Back to brokers</BackLink>

      <PageHeader
        eyebrow="Broker"
        title={
          <span className="inline-flex items-center gap-3">
            <span>{broker.companyName}</span>
            <GradeBadge grade={broker.grade} />
          </span>
        }
        description={`MC ${broker.mcNumber} · DOT ${broker.dotNumber} · ${termsLabel(broker.paymentTerms)}`}
        actions={
          <>
            <Button variant="outline" size="md">
              <Pencil className="size-4" /> Edit
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Broker actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Mail /> Send credit check
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <Trash2 /> Archive broker
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="loads">Loads</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gap-0 p-5 lg:col-span-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Building2 className="size-3.5" /> Contact
              </div>
              <Separator className="my-3" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Field label="Primary contact" value={broker.contactName} />
                <Field label="Phone" value={broker.contactPhone} mono />
                <Field label="Contact email" value={broker.contactEmail} />
                <Field label="Billing email" value={broker.billingEmail} />
              </dl>
            </Card>

            <Card className="gap-0 p-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <CreditCard className="size-3.5" /> Terms
              </div>
              <Separator className="my-3" />
              <dl className="flex flex-col gap-3">
                <Field
                  label="Payment terms"
                  value={termsLabel(broker.paymentTerms)}
                />
                <Field label="Status" value="Active" />
              </dl>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scorecard" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Award />}
              label="Grade"
              value={broker.grade}
              sublabel="overall"
            />
            <Kpi
              icon={<CreditCard />}
              label="Avg days to pay"
              value={`${scorecard.avgDaysToPay}d`}
              sublabel={`${Math.round(scorecard.onTimeRate * 100)}% on-time`}
            />
            <Kpi
              icon={<Building2 />}
              label="Avg rate / mile"
              value={`$${(scorecard.avgRatePerMile / 100).toFixed(2)}`}
              sublabel="last 90 days"
            />
            <Kpi
              icon={<Phone />}
              label="Volume YTD"
              value={String(scorecard.loadsYtd)}
              sublabel={`$${(scorecard.revenueYtdCents / 100).toLocaleString()}`}
            />
          </div>
        </TabsContent>

        <TabsContent value="loads" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-sm font-medium">Loads hauled for this broker</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Filtered to this broker. Jump to any load detail.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-sm font-medium">Invoice history</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Paid, outstanding, overdue invoices for this broker.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card className="gap-2 p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">
          {icon}
        </span>
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {sublabel && (
        <div className="text-[11px] text-muted-foreground">{sublabel}</div>
      )}
    </Card>
  );
}

function GradeBadge({ grade }: { grade: "A" | "B" | "C" | "D" }) {
  const tone =
    grade === "A"
      ? "success"
      : grade === "B"
        ? "primary"
        : grade === "C"
          ? "warning"
          : "muted";
  return <Badge variant={tone}>Grade {grade}</Badge>;
}

function termsLabel(terms: string): string {
  switch (terms) {
    case "quickpay":
      return "QuickPay";
    case "net_15":
      return "Net 15";
    case "net_30":
      return "Net 30";
    case "net_45":
      return "Net 45";
    case "net_60":
      return "Net 60";
    default:
      return terms;
  }
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
