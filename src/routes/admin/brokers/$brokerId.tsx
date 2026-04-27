import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AlertTriangle,
  Award,
  Building2,
  Clock,
  CreditCard,
  DollarSign,
  Mail,
  MoreHorizontal,
  Package,
  Pencil,
  Receipt,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/errors";
import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntityChip } from "@/components/common/EntityChip";
import { KeyStatStrip } from "@/components/common/KeyStatStrip";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { CardSkeleton } from "@/components/common/Skeleton";
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
import { formatMoneyCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteBroker,
  getBroker,
  updateBroker,
  type BrokerGrade,
} from "@/server/functions/brokers";
import { FormDialog } from "@/components/common/FormDialog";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PAYMENT_TERMS_LABEL: Record<string, string> = {
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  quick_pay: "QuickPay",
  other: "Other",
};

function gradeTone(
  grade: BrokerGrade,
): "success" | "primary" | "warning" | "muted" {
  if (grade === "A") return "success";
  if (grade === "B") return "primary";
  if (grade === "C") return "warning";
  return "muted";
}

function formatRatePerMile(cents: number): string {
  if (cents === 0) return "—";
  return `$${(cents / 100).toFixed(2)}/mi`;
}

export const Route = createFileRoute("/admin/brokers/$brokerId")({
  component: BrokerDetailPage,
});

function BrokerDetailPage() {
  const { brokerId } = Route.useParams();
  const queryClient = useQueryClient();
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const brokerQuery = useQuery({
    queryKey: ["admin", "broker", brokerId],
    queryFn: () => getBroker({ data: { brokerId } }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => deleteBroker({ data: { brokerId } }),
    onSuccess: () => {
      toast.success("Broker archived");
      queryClient.invalidateQueries({ queryKey: ["admin", "brokers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      updateBroker({ data: { brokerId, patch: patch as never } }),
    onSuccess: () => {
      toast.success("Broker updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "broker", brokerId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "brokers"] });
      setEditOpen(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/brokers">Back to brokers</BackLink>

      <QueryBoundary
        query={brokerQuery}
        skeleton={<CardSkeleton />}
        errorTitle="Couldn't load broker"
      >
        {(detail) => {
          const broker = detail.broker;
          const recentLoads = detail.recentLoads;
          const brokerInvoices = detail.invoices;
          const scorecard = detail.scorecard;
          return (
            <>
              <section className="animate-enter stagger-1 flex flex-col gap-5">
                <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                  <GradeEmblem grade={broker.grade} />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        {broker.companyName}
                      </h1>
                      <StarRating rating={broker.starRating} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {broker.mcNumber && (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-3" /> MC{" "}
                          <span className="font-mono text-foreground">
                            {broker.mcNumber}
                          </span>
                        </span>
                      )}
                      {broker.dotNumber && (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-3" /> DOT{" "}
                          <span className="font-mono text-foreground">
                            {broker.dotNumber}
                          </span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="size-3" />{" "}
                        {PAYMENT_TERMS_LABEL[broker.paymentTerms] ??
                          broker.paymentTerms}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setEditOpen(true)}
                    >
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
                        <DropdownMenuItem
                          onSelect={() =>
                            toast.success("Credit check request sent")
                          }
                        >
                          <Mail /> Send credit check
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/invoices/new">
                            <Receipt /> New invoice
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="danger"
                          onSelect={() => setArchiveOpen(true)}
                        >
                          <Trash2 /> Archive broker
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>

                <KeyStatStrip
                  stats={[
                    {
                      label: "Avg days to pay",
                      value:
                        scorecard.avgDaysToPay > 0
                          ? `${scorecard.avgDaysToPay}d`
                          : "—",
                      sublabel:
                        scorecard.onTimeRate > 0
                          ? `${Math.round(scorecard.onTimeRate * 100)}% on-time`
                          : "no payments yet",
                      mono: true,
                      emphasis: true,
                    },
                    {
                      label: "Avg rate / mi",
                      value: formatRatePerMile(scorecard.avgRatePerMileCents),
                      sublabel: "last 90 days",
                      mono: true,
                    },
                    {
                      label: "Volume YTD",
                      value: scorecard.loadsYtd.toLocaleString(),
                      sublabel: formatMoneyCents(scorecard.revenueYtdCents),
                      mono: true,
                    },
                    {
                      label: "Detention",
                      value: `${scorecard.detention90d}`,
                      sublabel: "incidents · 90d",
                      mono: true,
                    },
                  ]}
                />
              </section>

              <Tabs
                defaultValue="overview"
                className="animate-enter stagger-2"
              >
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
                  <TabsTrigger value="loads">
                    Loads
                    {recentLoads.length > 0 && (
                      <Badge variant="muted" className="ml-1 text-[10px]">
                        {recentLoads.length}+
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="invoices">
                    Invoices
                    {brokerInvoices.length > 0 && (
                      <Badge variant="muted" className="ml-1 text-[10px]">
                        {brokerInvoices.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Panel
                      icon={Building2}
                      title="Contact"
                      className="lg:col-span-2"
                    >
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <Field
                          label="Primary contact"
                          value={broker.contactName}
                        />
                        <Field
                          label="Phone"
                          value={broker.contactPhone}
                          mono
                        />
                        <Field
                          label="Contact email"
                          value={broker.contactEmail}
                        />
                        <Field
                          label="Billing email"
                          value={broker.billingEmail ?? "—"}
                        />
                      </dl>
                    </Panel>

                    <Panel icon={CreditCard} title="Terms">
                      <dl className="flex flex-col gap-3">
                        <Field
                          label="Payment terms"
                          value={
                            PAYMENT_TERMS_LABEL[broker.paymentTerms] ??
                            broker.paymentTerms
                          }
                        />
                        <Field
                          label="Status"
                          value={broker.deletedAt ? "Archived" : "Active"}
                        />
                        <Field
                          label="Avg days to pay"
                          value={
                            scorecard.avgDaysToPay > 0
                              ? `${scorecard.avgDaysToPay} days`
                              : "—"
                          }
                          mono
                        />
                      </dl>
                    </Panel>

                    {recentLoads.length > 0 && (
                      <Panel
                        icon={Package}
                        title="Recent loads"
                        className="lg:col-span-3"
                        trailing={
                          <Button asChild variant="ghost" size="sm">
                            <Link to="/admin/loads">View all →</Link>
                          </Button>
                        }
                      >
                        <ul className="flex flex-wrap gap-2">
                          {recentLoads.slice(0, 6).map((l) => (
                            <li key={l.id}>
                              <EntityChip
                                kind="load"
                                id={l.id}
                                label={l.loadNumber}
                                sublabel={l.commodity}
                                mono
                              />
                            </li>
                          ))}
                        </ul>
                      </Panel>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="scorecard" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ScorecardMetric
                      icon={Award}
                      label="Overall grade"
                      value={broker.grade}
                      sublabel={`${broker.starRating}/5 stars`}
                      isGradeCard
                    />
                    <ScorecardMetric
                      icon={Clock}
                      label="Avg days to pay"
                      value={
                        scorecard.avgDaysToPay > 0
                          ? `${scorecard.avgDaysToPay}d`
                          : "—"
                      }
                      sublabel={`Terms: ${PAYMENT_TERMS_LABEL[broker.paymentTerms] ?? broker.paymentTerms}`}
                    />
                    <ScorecardMetric
                      icon={DollarSign}
                      label="On-time payment rate"
                      value={
                        scorecard.onTimeRate > 0
                          ? `${Math.round(scorecard.onTimeRate * 100)}%`
                          : "—"
                      }
                      sublabel="last 12 months"
                    />
                    <ScorecardMetric
                      icon={TrendingUp}
                      label="Avg rate per mile"
                      value={formatRatePerMile(scorecard.avgRatePerMileCents)}
                      sublabel="last 90 days"
                    />
                    <ScorecardMetric
                      icon={Package}
                      label="Volume YTD"
                      value={scorecard.loadsYtd.toLocaleString()}
                      sublabel={`${formatMoneyCents(scorecard.revenueYtdCents)} revenue`}
                    />
                    <ScorecardMetric
                      icon={AlertTriangle}
                      label="Detention incidents"
                      value={scorecard.detention90d.toString()}
                      sublabel="≥2hr waits · last 90 days"
                      warning={scorecard.detention90d > 2}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="loads" className="mt-4">
                  {recentLoads.length === 0 ? (
                    <EmptyCard
                      icon={Package}
                      title="No loads yet"
                      description={`Once you dispatch a load for ${broker.companyName}, it'll show up here.`}
                    />
                  ) : (
                    <Card className="gap-0 p-0">
                      <ul className="divide-y divide-border">
                        {recentLoads.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                          >
                            <div className="flex min-w-0 flex-col">
                              <Link
                                to="/admin/loads/$loadId"
                                params={{ loadId: l.id }}
                                className="font-mono text-sm font-semibold hover:text-[var(--primary)]"
                              >
                                {l.loadNumber}
                              </Link>
                              <span className="truncate text-[11px] text-muted-foreground">
                                {l.commodity}
                              </span>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-0.5">
                              <span className="font-mono text-sm font-semibold tabular-nums">
                                {formatMoneyCents(l.rate)}
                              </span>
                              {l.miles && (
                                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                  {l.miles.toLocaleString()} mi
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="invoices" className="mt-4">
                  {brokerInvoices.length === 0 ? (
                    <EmptyCard
                      icon={Receipt}
                      title="No invoices with this broker"
                      description="Generated invoices for this broker will appear here, grouped by payment status."
                      action={
                        <Button asChild variant="outline" size="sm">
                          <Link to="/admin/invoices/new">
                            <Receipt className="size-3.5" /> Create invoice
                          </Link>
                        </Button>
                      }
                    />
                  ) : (
                    <Card className="gap-0 p-0">
                      <ul className="divide-y divide-border">
                        {brokerInvoices.map((inv) => (
                          <li
                            key={inv.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                          >
                            <div className="flex min-w-0 flex-col">
                              <Link
                                to="/admin/invoices/$invoiceId"
                                params={{ invoiceId: inv.id }}
                                className="font-mono text-sm font-semibold hover:text-[var(--primary)]"
                              >
                                {inv.invoiceNumber}
                              </Link>
                              <span className="text-[11px] text-muted-foreground">
                                {inv.issueDate}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-semibold tabular-nums">
                                {formatMoneyCents(inv.totalCents)}
                              </span>
                              <Badge variant="muted" className="text-[10px]">
                                {inv.status}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              <ConfirmDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                tone="danger"
                title={`Archive ${broker.companyName}?`}
                description="New loads can't be assigned to archived brokers. Existing loads and invoices stay intact. You can un-archive from the brokers list later."
                confirmLabel="Archive broker"
                onConfirm={() => {
                  archiveMutation.mutate();
                  setArchiveOpen(false);
                }}
              />
              <EditBrokerDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                broker={broker}
                onSubmit={async (patch) => {
                  await updateMutation.mutateAsync(patch);
                }}
                isSubmitting={updateMutation.isPending}
              />
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

interface EditBrokerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker: {
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    billingEmail: string | null;
    paymentTerms: string;
    notes: string | null;
  };
  onSubmit: (
    patch: Partial<{
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      billingEmail: string | null;
      paymentTerms:
        | "net_15"
        | "net_30"
        | "net_45"
        | "net_60"
        | "quick_pay"
        | "other";
      notes: string | null;
    }>,
  ) => Promise<void>;
  isSubmitting: boolean;
}

function EditBrokerDialog({
  open,
  onOpenChange,
  broker,
  onSubmit,
  isSubmitting,
}: EditBrokerDialogProps) {
  const [contactName, setContactName] = React.useState(broker.contactName);
  const [contactEmail, setContactEmail] = React.useState(broker.contactEmail);
  const [contactPhone, setContactPhone] = React.useState(broker.contactPhone);
  const [billingEmail, setBillingEmail] = React.useState(broker.billingEmail ?? "");
  const [paymentTerms, setPaymentTerms] = React.useState<string>(
    broker.paymentTerms,
  );
  const [notes, setNotes] = React.useState(broker.notes ?? "");

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setContactName(broker.contactName);
      setContactEmail(broker.contactEmail);
      setContactPhone(broker.contactPhone);
      setBillingEmail(broker.billingEmail ?? "");
      setPaymentTerms(broker.paymentTerms);
      setNotes(broker.notes ?? "");
    }
  }, [open, broker]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit broker"
      description="Update contact info, payment terms, or notes."
      icon={<Pencil className="size-5" />}
      isSubmitting={isSubmitting}
      submitLabel={isSubmitting ? "Saving…" : "Save changes"}
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          billingEmail: billingEmail.trim() || null,
          paymentTerms: paymentTerms as
            | "net_15"
            | "net_30"
            | "net_45"
            | "net_60"
            | "quick_pay"
            | "other",
          notes: notes.trim() || null,
        });
      }}
    >
      <FormField label="Contact name" required>
        <Input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Contact email" required>
        <Input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Contact phone" required>
        <Input
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Billing email (optional)">
        <Input
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
        />
      </FormField>
      <FormField label="Payment terms" required>
        <Select value={paymentTerms} onValueChange={setPaymentTerms}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net_15">Net 15</SelectItem>
            <SelectItem value="net_30">Net 30</SelectItem>
            <SelectItem value="net_45">Net 45</SelectItem>
            <SelectItem value="net_60">Net 60</SelectItem>
            <SelectItem value="quick_pay">Quick pay</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Notes (optional)">
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormField>
    </FormDialog>
  );
}

function GradeEmblem({ grade }: { grade: BrokerGrade }) {
  const tone = gradeTone(grade);
  const palette =
    tone === "success"
      ? "bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-[var(--success)] ring-[var(--success)]/30"
      : tone === "primary"
        ? "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] ring-[var(--primary)]/30"
        : tone === "warning"
          ? "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] text-[var(--warning)] ring-[var(--warning)]/30"
          : "bg-muted text-muted-foreground ring-[var(--border-strong)]";

  return (
    <div
      aria-label={`Grade ${grade}`}
      className={cn(
        "flex size-16 shrink-0 flex-col items-center justify-center rounded-xl sm:size-20",
        "ring-2 ring-inset",
        palette,
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">
        Grade
      </span>
      <span className="font-mono text-3xl font-black leading-none sm:text-4xl">
        {grade}
      </span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating} of 5 stars`}
      className="inline-flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < rating
              ? "fill-[var(--primary)] text-[var(--primary)]"
              : "text-[var(--border-strong)]",
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ScorecardMetric({
  icon: Icon,
  label,
  value,
  sublabel,
  isGradeCard,
  warning,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  isGradeCard?: boolean;
  warning?: boolean;
}) {
  return (
    <Card
      className={cn(
        "gap-2 p-5",
        isGradeCard &&
          "border-[var(--primary)]/30 bg-[color-mix(in_oklab,var(--primary)_5%,var(--background))]",
        warning &&
          "border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--warning)_4%,var(--background))]",
      )}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-md [&_svg]:size-3.5",
            isGradeCard
              ? "bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--primary)]"
              : warning
                ? "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)]"
                : "bg-muted",
          )}
        >
          <Icon />
        </span>
        {label}
      </div>
      <div
        className={cn(
          "font-bold leading-none tracking-tight",
          isGradeCard
            ? "font-mono text-5xl text-[var(--primary)]"
            : "text-2xl tabular-nums",
        )}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[11px] text-muted-foreground">{sublabel}</div>
      )}
    </Card>
  );
}

function Panel({
  icon: Icon,
  title,
  trailing,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="size-3.5" /> {title}
        </div>
        {trailing}
      </div>
      <Separator className="my-3" />
      {children}
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

function EmptyCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]">
        <Icon className="size-5 text-[var(--primary)]" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        {description}
      </p>
      {action}
    </Card>
  );
}
