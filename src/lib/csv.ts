/**
 * Tiny CSV export helper. Used by Analytics ExportButton. Zero deps.
 */

type CsvValue = string | number | boolean | null | undefined;

/**
 * Escape a cell value for CSV. Wraps in quotes if it contains comma, quote,
 * or newline; doubles embedded quotes per RFC 4180.
 */
function escapeCell(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convert an array of objects to a CSV string. Column order comes from the
 * explicit `columns` arg; defaults to keys of the first row.
 */
export function toCsv<T extends Record<string, CsvValue>>(
  rows: T[],
  columns?: { key: keyof T; header: string }[],
): string {
  const first = rows[0];
  if (!first) return "";
  const cols =
    columns ??
    (Object.keys(first) as (keyof T)[]).map((k) => ({
      key: k,
      header: String(k),
    }));
  const header = cols.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((r) => cols.map((c) => escapeCell(r[c.key])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

/**
 * Kick off a browser download of a CSV file. No-op on SSR.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
