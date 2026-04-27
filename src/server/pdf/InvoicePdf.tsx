import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

/**
 * Invoice PDF — server-rendered with @react-pdf/renderer.
 *
 * Letter size, 0.5in margins. Plain typography (no embedded fonts) so it
 * renders identically across hosts without bundling font binaries.
 *
 * Phase 1: matches what Gary needs to send a broker — header, broker info,
 * load list, totals, payment terms, footer. Phase 2 can layer in branding
 * (logo upload, accent color, custom footer text).
 */

const styles = StyleSheet.create({
  page: {
    padding: 36, // 0.5in @ 72dpi
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  brandSub: {
    fontSize: 9,
    color: "#64748b",
  },
  invoiceMeta: {
    alignItems: "flex-end",
  },
  invoiceLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#64748b",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    fontSize: 9,
    marginBottom: 2,
  },
  metaKey: {
    color: "#64748b",
    width: 80,
    textAlign: "right",
    paddingRight: 8,
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  billToBlock: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  billToLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#64748b",
    marginBottom: 6,
  },
  billToCompany: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  billToLine: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 1,
  },
  table: {
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colDescription: {
    flex: 1,
  },
  colAmount: {
    width: 100,
    textAlign: "right",
  },
  totalsBlock: {
    marginLeft: "auto",
    width: 240,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#475569",
  },
  totalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  totalLabelFinal: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  totalValueFinal: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  notesBlock: {
    marginTop: 24,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#cbd5e1",
  },
  notesLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#64748b",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
  },
});

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const PAYMENT_TERMS_LABEL: Record<string, string> = {
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  quick_pay: "Quick pay (7 days)",
  other: "Other",
};

export interface InvoicePdfData {
  company: {
    name: string;
    timezone?: string | null;
  };
  invoice: {
    invoiceNumber: string;
    status: string;
    issueDate: string;
    dueDate: string;
    subtotalCents: number;
    adjustmentsCents: number;
    totalCents: number;
    notes: string | null;
  };
  broker: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    billingEmail: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zip: string;
    paymentTerms: string;
    mcNumber: string | null;
  };
  lineItems: Array<{
    description: string;
    amountCents: number;
  }>;
}

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const { company, invoice, broker, lineItems } = data;

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={company.name}
    >
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{company.name}</Text>
            <Text style={styles.brandSub}>Logistics &amp; dispatch</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceLabel}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Issued</Text>
              <Text style={styles.metaValue}>{invoice.issueDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Due</Text>
              <Text style={styles.metaValue}>{invoice.dueDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Terms</Text>
              <Text style={styles.metaValue}>
                {PAYMENT_TERMS_LABEL[broker.paymentTerms] ?? broker.paymentTerms}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToBlock}>
          <Text style={styles.billToLabel}>Bill to</Text>
          <Text style={styles.billToCompany}>{broker.companyName}</Text>
          {broker.mcNumber && (
            <Text style={styles.billToLine}>MC# {broker.mcNumber}</Text>
          )}
          <Text style={styles.billToLine}>
            {broker.contactName} · {broker.billingEmail ?? broker.contactEmail}
          </Text>
          <Text style={styles.billToLine}>{broker.addressLine1}</Text>
          {broker.addressLine2 && (
            <Text style={styles.billToLine}>{broker.addressLine2}</Text>
          )}
          <Text style={styles.billToLine}>
            {broker.city}, {broker.state} {broker.zip}
          </Text>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>
              Amount
            </Text>
          </View>
          {lineItems.map((li, idx) => {
            const isLast = idx === lineItems.length - 1;
            return (
              <View
                key={idx}
                style={isLast ? styles.tableRowLast : styles.tableRow}
              >
                <Text style={styles.colDescription}>{li.description}</Text>
                <Text style={styles.colAmount}>{fmt(li.amountCents)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(invoice.subtotalCents)}</Text>
          </View>
          {invoice.adjustmentsCents !== 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Adjustments</Text>
              <Text style={styles.totalValue}>
                {fmt(invoice.adjustmentsCents)}
              </Text>
            </View>
          )}
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total due</Text>
            <Text style={styles.totalValueFinal}>
              {fmt(invoice.totalCents)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{company.name}</Text>
          <Text>
            Invoice {invoice.invoiceNumber} ·{" "}
            <Text>
              page <Text render={({ pageNumber }) => `${pageNumber}`} />
            </Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
