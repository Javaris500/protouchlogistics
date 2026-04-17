import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, ChevronRight } from "lucide-react";

import { FilterChips } from "@/components/data/FilterChips";
import { SearchInput } from "@/components/data/SearchInput";
import { cn } from "@/lib/utils";
import {
  integrationCategories,
  integrations,
  type Integration,
  type IntegrationCategoryId,
  type IntegrationTag,
} from "@/lib/fixtures/integrations";

export const Route = createFileRoute("/admin/settings/integrations")({
  component: IntegrationsPage,
});

type FilterId = "all" | IntegrationCategoryId;

function IntegrationsPage() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(integrations.map((i) => [i.id, i.enabled])),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return integrations.filter((i) => {
      if (filter !== "all" && i.category !== filter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.by.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const connectedCount = integrations.filter(
    (i) => enabledMap[i.id] ?? i.enabled,
  ).length;

  // Counts per category for the filter chips
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: integrations.length,
    };
    for (const c of integrationCategories) {
      counts[c.id] = integrations.filter((i) => i.category === c.id).length;
    }
    return counts;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Layout owns the PageHeader. Inline sub-meta here: connection count. */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Connect the services ProTouch uses to automate dispatch, billing, and
          driver operations.
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {connectedCount}
          </span>{" "}
          of {integrations.length} connected
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips<FilterId>
          options={[
            { value: "all", label: "All apps", count: categoryCounts.all },
            ...integrationCategories.map((c) => ({
              value: c.id as FilterId,
              label: c.label,
              count: categoryCounts[c.id] ?? 0,
            })),
          ]}
          value={filter}
          onChange={setFilter}
          label="Filter by category"
        />

        <div className="w-full sm:w-[260px]">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search integrations…"
            aria-label="Search integrations"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyResult query={query} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((it) => (
            <IntegrationCard
              key={it.id}
              integration={it}
              enabled={enabledMap[it.id] ?? it.enabled}
              onToggle={(val) => setEnabledMap((m) => ({ ...m, [it.id]: val }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  integration,
  enabled,
  onToggle,
}: {
  integration: Integration;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { name, by, description, priceLabel, status, tags, featured } =
    integration;

  return (
    <div
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-xl",
        "border border-[color-mix(in_oklab,var(--border)_70%,transparent)]",
        "bg-card text-card-foreground shadow-[var(--shadow-sm)]",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
        featured &&
          "ring-1 ring-[color-mix(in_oklab,var(--primary)_30%,transparent)]",
      )}
    >
      {featured && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-80"
        />
      )}

      <div className="flex flex-col gap-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <BrandTile
              initial={integration.initial}
              brandColor={integration.brandColor}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-semibold leading-tight">
                  {name}
                </h3>
                {status === "error" && (
                  <AlertCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-[var(--danger)]"
                  />
                )}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">{by}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Toggle
              checked={enabled}
              onChange={onToggle}
              label={`Toggle ${name}`}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {priceLabel}
            </span>
          </div>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {status === "connected" && (
            <StatusDot tone="success" label="Connected" />
          )}
          {status === "error" && (
            <StatusDot tone="danger" label="Connection error" />
          )}
          {status === "coming-soon" && (
            <StatusDot tone="muted" label="Coming soon" />
          )}
          {tags.map((t) => (
            <TagChip key={t.label} tag={t} />
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[color-mix(in_oklab,var(--border)_60%,transparent)] px-4 py-2.5">
        <button
          type="button"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {enabled ? "Manage" : "Connect"}
        </button>
        <a
          href="#"
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-medium",
            "text-muted-foreground hover:text-foreground transition-colors",
          )}
        >
          View instructions
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function BrandTile({
  initial,
  brandColor,
}: {
  initial: string;
  brandColor: string;
}) {
  // Pick a readable foreground color against the brand bg. For light brand
  // colors (yellow, orange), use near-black so the initials read.
  const fg = isLightHex(brandColor) ? "#111111" : "#ffffff";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center",
        "rounded-[10px] text-[13px] font-bold tracking-tight",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.22)]",
        "ring-1 ring-inset ring-white/10",
      )}
      style={{ backgroundColor: brandColor, color: fg }}
    >
      {initial}
    </span>
  );
}

function isLightHex(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Perceived luminance (ITU-R BT.601).
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.72;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
        checked
          ? "bg-[var(--primary)] shadow-[inset_0_1px_1px_rgba(0,0,0,0.2)]"
          : "bg-[color-mix(in_oklab,var(--muted-foreground)_28%,transparent)]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.28)] transition-transform",
          checked ? "translate-x-[20px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function StatusDot({
  tone,
  label,
}: {
  tone: "success" | "danger" | "muted";
  label: string;
}) {
  const toneMap: Record<typeof tone, { bg: string; fg: string; dot: string }> =
    {
      success: {
        bg: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)]",
        fg: "text-[var(--success)]",
        dot: "bg-[var(--success)]",
      },
      danger: {
        bg: "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]",
        fg: "text-[var(--danger)]",
        dot: "bg-[var(--danger)]",
      },
      muted: {
        bg: "bg-muted",
        fg: "text-muted-foreground",
        dot: "bg-muted-foreground",
      },
    };
  const t = toneMap[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
        "text-[10px] font-semibold uppercase tracking-wider",
        t.bg,
        t.fg,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 rounded-full", t.dot)}
      />
      {label}
    </span>
  );
}

function TagChip({ tag }: { tag: IntegrationTag }) {
  const variantMap: Record<IntegrationTag["variant"], string> = {
    new: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
    upgrade:
      "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color-mix(in_oklab,var(--warning)_85%,var(--foreground))]",
    error:
      "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-[var(--danger)]",
    success:
      "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5",
        "text-[10px] font-semibold uppercase tracking-wider",
        variantMap[tag.variant],
      )}
    >
      {tag.label}
    </span>
  );
}

function EmptyResult({ query }: { query: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed",
        "border-[color-mix(in_oklab,var(--border)_60%,transparent)] bg-muted/20 px-6 py-14 text-center",
      )}
    >
      <p className="text-sm font-medium">No integrations match</p>
      <p className="text-xs text-muted-foreground">
        {query ? `Nothing found for "${query}".` : "Try a different category."}
      </p>
    </div>
  );
}
