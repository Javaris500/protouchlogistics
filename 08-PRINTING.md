# ProTouch Logistics — Printing

**Status:** Nice-to-have, not blocking launch
**Primary printer:** Epson WorkForce WF-110 (Gary's portable inkjet)
**Paper:** Letter only
**Users:** Admin only (Gary). Driver-side printing deferred.
**Lock-in:** None — Gary can print to any printer his OS can see. Epson is his default by habit, not by configuration.

---

## 1. Decision summary

Gary wants the option to print from the admin app to his Epson WF-110 (portable inkjet) when needed — invoices, load sheets, pay stubs, etc. He also wants to keep the option of printing to any other printer (office printer, hotel printer, Save as PDF, etc.).

**Approach:** lean on the browser/OS print pipeline. Nothing in the app is Epson-specific. The WF-110 just shows up in the OS print dialog like any other printer.

**Two rails:**

| Rail | Trigger | Reaches |
|---|---|---|
| Main — browser print | Click "Print" in app → OS print dialog | Any printer on Gary's device (WF-110, office printer, home printer, AirPrint, Save as PDF) |
| Bonus — Epson Connect (optional, later) | App emails a PDF to the printer's unique address | WF-110 only |

The bonus rail is additive. It never replaces the main rail.

---

## 2. Architecture

Two output formats, depending on the document:

- **HTML print** — via `window.print()` with a dedicated `@media print` stylesheet. Cheap, good enough for non-money documents (trip sheets, load lists, expiring-docs report).
- **Server-generated PDF** — via `@react-pdf/renderer` (already planned in `01-PROJECT-BRIEF.md` for invoices). Pixel-perfect, used for money documents and anything Gary might archive or send to a broker.

Both formats end up in the OS print dialog. The user picks a printer there.

### New code surface

- `src/lib/print/index.ts` — small facade: `printRoute(path)`, `printPdf(blob, filename)`, `emailToPrinter(pdfBlob)` (later).
- `src/components/print/PrintLayout.tsx` — stripped shell, no sidebar/topbar/actions.
- `src/components/print/` templates — `InvoiceDocument`, `TripSheet`, `PayStub`, `DqfPacket`, `ExpiringDocsReport`. HTML template and `@react-pdf/renderer` template are sibling renderers sharing a data hook, not literally the same component (rpdf uses its own primitives).
- Print-specific routes:
  - `/admin/invoices/$id/print`
  - `/admin/loads/$id/print`
  - `/admin/pay/$periodId/print`
  - `/admin/drivers/$id/dqf`
  - `/admin/documents/expiring/print`
  - Each accepts `?auto=1` to fire the print dialog on mount.
- Server functions (once TanStack Start backend lands):
  - `getInvoicePdf(id)`
  - `getTripSheetPdf(id)`
  - `getPayStubPdf(driverId, periodId)`
  - `getDqfPacketPdf(driverId)` — uses `pdf-lib` to merge CDL + medical card + MVR + drug test PDFs from R2.
  - All run the standard session + role check and write to `audit_log` when a money document is printed.

### Edits to existing code

- `src/routes/admin/loads/$loadId.tsx:136` — replace bare `window.print()` with `printRoute('/admin/loads/<id>/print?auto=1')`. Current call prints the full admin shell, which is wrong.
- `src/routes/admin/invoices/$invoiceId.tsx:148` — same swap; points at the PDF endpoint once backend exists, HTML print route in the meantime.
- `src/routes/admin/settings/integrations.tsx` — add a "Printer" section (see §4).
- Add print entry points on `/admin/pay/$periodId`, driver detail page, documents page.

### Global print CSS

One `@media print` block in `src/index.css` (or `src/styles/print.css`). Responsibilities:

- Hide admin shell (sidebar, topbar, action bars, dropdowns). Use `data-no-print` attribute on chrome elements.
- Neutralize dark-mode background; force black text, white background.
- Reset shadows and decorative color.
- `@page { size: letter; margin: 0.5in; }`
- `print-color-adjust: exact` on elements that must retain color (e.g., status pills on a trip sheet).
- `break-inside: avoid` on table rows and card blocks.

---

## 3. Document inventory

| Document | Source page | Print route / endpoint | Renderer | Priority |
|---|---|---|---|---|
| Load trip sheet | `/admin/loads/$id` | `/admin/loads/$id/print` | HTML print | P1 |
| BOL / POD reprint | `/admin/loads/$id` docs tab | R2 passthrough | Existing PDF | P1 |
| Invoice | `/admin/invoices/$id` | `/admin/invoices/$id/pdf` | `@react-pdf/renderer` | P1 |
| Pay stub / period summary | `/admin/pay/$periodId` | `/admin/pay/$periodId/pdf` | `@react-pdf/renderer` | P2 |
| DQF packet | `/admin/drivers/$id` | `/admin/drivers/$id/dqf.pdf` | `@react-pdf/renderer` + `pdf-lib` | P2 |
| Expiring docs report | `/admin/documents` | `/admin/documents/expiring/print` | HTML print | P2 |
| Load list (selected rows) | `/admin/loads` | HTML print | HTML print | P3 |

Anything not in this table is out of scope for Phase 1.

---

## 4. Settings UI (admin-only)

Under `/admin/settings/integrations` → new "Printer" section:

- **Default printer:** note saying "Your operating system handles this — the app shows your system print dialog." No lock-in.
- **Paper size:** Letter (default). Hint that this can be changed per-job in the OS dialog.
- **Epson Connect (optional):**
  - Off by default.
  - Toggle on → reveals an email field for the WF-110's `@print.epsonconnect.com` address.
  - When on, adds a "Send to Epson" option to Print menus *in addition to* the normal Print button.
- **Test print:** fires a small sample page through the regular browser print flow.

---

## 5. Epson Connect — setup instructions for Gary

Optional. Unlocks two things: printing to the WF-110 from anywhere (without being on the same Wi-Fi), and letting the app auto-print unattended (e.g., new invoice lands → prints automatically).

### Before he starts

- Printer powered on and on his Wi-Fi. If not, run Wi-Fi setup on the printer's built-in screen first.
- Wi-Fi password handy.
- Roughly 10 minutes.

### Steps

1. **Download Epson's setup utility**
   - Go to `epson.com/connect`
   - Click "Set Up" → choose OS (Windows or Mac)
   - Download and run "Epson Connect Printer Setup Utility"

2. **Register the printer**
   - Open the utility. It scans the network and should find the WF-110.
   - Select it, click Next, agree to the license.
   - Choose "Printer Registration."

3. **Create Epson account (or sign in)**
   - Use an email he checks — this is the admin account for the printer.

4. **Turn on Email Print**
   - After registration the utility opens `epsonconnect.com` in the browser.
   - Sign in → "Email Print."
   - Copy the printer's assigned address (looks like `randomstring@print.epsonconnect.com`).
   - **Send this address to the dev team.**

5. **Lock down senders**
   - Still in the Email Print page → "Approved Senders" / "Access Control."
   - Set to "Only approved senders."
   - Add Gary's own email and (later) the app's sending address.

6. **Test**
   - From his own email, attach any PDF.
   - Send to the Epson Connect address, empty subject/body is fine.
   - Printer should print within a minute or two.

### Troubleshooting

- **Printer not found by the utility:** confirm printer and laptop are on the same Wi-Fi network (not guest vs main).
- **Registration fails:** almost always a VPN or firewall on the laptop. Turn VPN off for setup.
- **Test email doesn't print:** check the Epson dashboard under "Print History," and confirm the sending address is in the approved senders list.

### What Gary sends back

- The printer's `@print.epsonconnect.com` address.
- Confirmation the test email printed.

---

## 6. Risks / watch-outs

- **Print fidelity on HTML.** Tailwind + `oklch` colors + shadows do not always print cleanly. Print CSS explicitly strips decorative color and forces black text. Budget ~half a day per template for print QA.
- **rpdf ≠ HTML.** `@react-pdf/renderer` uses its own `View`/`Text`/`StyleSheet` primitives. Plan for sibling renderers sharing a data hook, not a single component.
- **DQF merging.** `@react-pdf/renderer` generates a cover; `pdf-lib` merges the underlying R2 PDFs. Two libs, both already acceptable per the brief.
- **Auth on PDF endpoints.** Every `/pdf` server function runs the standard session + role check. PDF URLs are not publicly guessable.
- **Audit log.** Every print of an invoice or pay stub writes an `audit_log` row. Requirement from the brief, not specific to printing.
- **Epson Connect is not the default path.** Main rail stays browser-native. Epson Connect only enables unattended/remote scenarios later.

---

## 7. Open questions

1. Confirm the document inventory in §3 matches Gary's day-to-day needs.
2. Epson Connect: enroll now and hand over the email, or defer until the automation use-case is real.
3. Driver-side printing: confirmed out of scope for now. Revisit if drivers ask.
