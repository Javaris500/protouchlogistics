import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpDown,
  Download,
  Eye,
  FileText,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterChips } from "@/components/data/FilterChips";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExpirationBadge } from "@/components/ui/expiration-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FIXTURE_DOCUMENTS,
  DOC_TYPE_LABELS,
  docCategory,
  type DocCategory,
  type FixtureDocument,
} from "@/lib/fixtures/documents";
import { daysUntil, formatDateShort } from "@/lib/format";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentsPage,
});

type CategoryFilter = "all" | DocCategory;

const PAGE_SIZE = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPage() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c = (cat: DocCategory) =>
      FIXTURE_DOCUMENTS.filter((d) => docCategory(d.type) === cat).length;
    return {
      all: FIXTURE_DOCUMENTS.length,
      driver: c("driver"),
      truck: c("truck"),
      load: c("load"),
    };
  }, []);

  const expirationStats = useMemo(() => {
    const expirable = FIXTURE_DOCUMENTS.filter((d) => d.expirationDate);
    const expired = expirable.filter(
      (d) => d.expirationDate && daysUntil(d.expirationDate) < 0,
    ).length;
    const expiringSoon = expirable.filter(
      (d) =>
        d.expirationDate &&
        daysUntil(d.expirationDate) >= 0 &&
        daysUntil(d.expirationDate) <= 30,
    ).length;
    const compliant = expirable.filter(
      (d) => d.expirationDate && daysUntil(d.expirationDate) > 30,
    ).length;
    return { expired, expiringSoon, compliant, total: expirable.length };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FIXTURE_DOCUMENTS.filter((d) => {
      if (category !== "all" && docCategory(d.type) !== category) return false;
      if (q) {
        const haystack = [
          DOC_TYPE_LABELS[d.type],
          d.fileName,
          d.owner.label,
          d.uploadedBy,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [category, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Compliance"
          title="Documents"
          description="Global document library with expiration tracking. Stay DOT-compliant."
          actions={
            <Button variant="primary" size="md">
              <Upload className="size-4" />
              Upload document
            </Button>
          }
        />
      </div>

      {/* Compliance KPIs */}
      <div className="animate-enter stagger-2 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Expired"
          value={expirationStats.expired}
          sublabel="Needs immediate attention"
          icon={<ShieldAlert />}
          trend={
            expirationStats.expired > 0
              ? {
                  direction: "up",
                  value: `${expirationStats.expired}`,
                  positiveIsGood: false,
                }
              : undefined
          }
        />
        <KpiCard
          label="Expiring Soon"
          value={expirationStats.expiringSoon}
          sublabel="Within 30 days"
          icon={<AlertTriangle />}
        />
        <KpiCard
          label="Compliant"
          value={expirationStats.compliant}
          sublabel="Valid > 30 days"
          icon={<ShieldCheck />}
        />
        <KpiCard
          label="Total Documents"
          value={counts.all}
          sublabel={`${counts.driver} driver · ${counts.truck} truck · ${counts.load} load`}
          icon={<FileText />}
        />
      </div>

      {/* Table card */}
      <Card className="animate-enter stagger-3 gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips<CategoryFilter>
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "driver", label: "Driver", count: counts.driver },
              { value: "truck", label: "Truck", count: counts.truck },
              { value: "load", label: "Load", count: counts.load },
            ]}
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            label="Filter by category"
          />
          <div className="w-full md:w-72">
            <SearchInput
              value={search}
              onValueChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Type, filename, owner…"
            />
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No documents match these filters"
              description="Adjust the filters above or upload a new document."
              action={
                <Button variant="primary" size="sm">
                  <Upload className="size-4" />
                  Upload
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <DocumentsTable rows={pageRows} />
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
    </div>
  );
}

function DocumentsTable({ rows }: { rows: FixtureDocument[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              Document
              <ArrowUpDown className="size-3" aria-hidden />
            </button>
          </TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Expiration</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((doc) => {
          const cat = docCategory(doc.type);
          return (
            <TableRow key={doc.id} className="cursor-pointer">
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileIcon mimeType={doc.mimeType} />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {doc.fileName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      by {doc.uploadedBy}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="muted" className="text-[11px]">
                  {DOC_TYPE_LABELS[doc.type]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <CategoryDot category={cat} />
                  <span className="text-sm">{doc.owner.label}</span>
                </div>
              </TableCell>
              <TableCell>
                {doc.expirationDate ? (
                  <ExpirationBadge date={doc.expirationDate} showDate />
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {formatFileSize(doc.fileSizeBytes)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateShort(doc.createdAt)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="View document"
                >
                  <Eye className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") {
    return <FileText className="size-4 text-[var(--danger)]" />;
  }
  if (mimeType.startsWith("image/")) {
    return <FileText className="size-4 text-[var(--info)]" />;
  }
  return <FileText className="size-4 text-muted-foreground" />;
}

function CategoryDot({ category }: { category: DocCategory }) {
  const color =
    category === "driver"
      ? "bg-[var(--primary)]"
      : category === "truck"
        ? "bg-[var(--info)]"
        : "bg-[var(--success)]";

  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 shrink-0 rounded-full ${color}`}
    />
  );
}
