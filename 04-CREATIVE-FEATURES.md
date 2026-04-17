# ProTouch Logistics — Creative Features & Differentiators

These are the features that separate PTL from McLeod, Samsara Lite, TruckingOffice, and every other dusty TMS. The goal: when Gary shows this to another fleet owner, they say "wait, how does yours do that?"

Each feature below includes scope, tech approach, build effort, and where it touches the data model.

---

## Feature 2 — AI Rate Confirmation Intake

### The problem
Brokers email rate confirmations all day as PDF attachments. Gary currently opens each one, reads pickup/delivery/rate/commodity, and manually creates a load. It's 10 minutes per load. For a 5-truck fleet running 3-5 loads/day, that's 2.5 hours/day of pure data entry.

### The feature
Gary forwards a rate confirmation email to `loads@protouchlogistics.com`. Within 30 seconds, a draft load appears in his admin with fields pre-filled. He reviews, tweaks, assigns a driver, and hits Save.

### Tech approach

**Inbound email → parser pipeline:**

1. Inbound email handled by **Resend's inbound webhook** (or Postmark inbound, if Resend inbound isn't generally available yet — verify at build time)
2. Email arrives at our webhook endpoint: `POST /api/inbound/rate-confirmation`
3. Verify sender is Gary's email (whitelist in env var)
4. Extract PDF attachment(s); reject if no PDF or >10MB
5. Convert PDF to images (first 3 pages) using `pdf-to-img` or `pdfjs-dist`
6. Send images + email body to **Claude API** (claude-sonnet-4-5) with a strict JSON schema prompt
7. Claude returns structured extraction
8. Validate against Zod schema
9. Geocode the pickup/delivery addresses via Google Places
10. Create a `loads` row with `status='draft'` and `metadata.source='email_ai'`
11. Notify Gary in-app: "New load from email — review draft PTL-2026-0157"

### Data the AI extracts

```ts
const RateConfirmationSchema = z.object({
  brokerHint: z.object({
    companyName: z.string().nullable(),
    mcNumber: z.string().nullable(),
    contactEmail: z.string().email().nullable(),
    contactPhone: z.string().nullable(),
  }),
  loadNumber: z.string().nullable(), // broker's load number
  pickup: z.object({
    companyName: z.string().nullable(),
    address: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string(),
    windowStart: z.string().datetime().nullable(),
    windowEnd: z.string().datetime().nullable(),
    appointmentRequired: z.boolean(),
    contactName: z.string().nullable(),
    contactPhone: z.string().nullable(),
  }),
  delivery: z.object({ /* same shape */ }),
  commodity: z.string(),
  weightLbs: z.number().int().nullable(),
  pieces: z.number().int().nullable(),
  rateCents: z.number().int().nonnegative(),
  miles: z.number().int().nullable(),
  specialInstructions: z.string().nullable(),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    fields: z.record(z.string(), z.number().min(0).max(1)),
  }),
});
```

### Broker matching logic

After extraction, try to match to an existing broker:
1. Exact match on `mcNumber`
2. Exact match on normalized `contactEmail`
3. Fuzzy match on `companyName` (trigram similarity via `pg_trgm` extension)
4. If no match: flag the draft as "broker needs selection" — Gary picks from a dropdown or creates new.

### Idempotency + webhook authentication

**Schema addendum:**

```ts
export const ingestedRateConfirmations = pgTable("ingested_rate_confirmations", {
  id: uuid("id").primaryKey().defaultRandom(),
  pdfSha256: text("pdf_sha256").notNull(),
  senderEmail: citext("sender_email").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status", {
    enum: ["processing", "succeeded", "failed", "duplicate"],
  }).notNull(),
  resultLoadId: uuid("result_load_id").references(() => loads.id),
  error: text("error"),
  rawEmailKey: text("raw_email_key"),   // R2 key where original email is archived
}, (table) => ({
  sha256Idx: uniqueIndex("ingested_rate_cons_sha256_idx").on(table.pdfSha256),
}));
```

Unique on `pdfSha256` — an identical PDF re-sent (forward loop, manual resend, broker automation firing twice) hits `ON CONFLICT DO NOTHING` and we log a `duplicate` row.

**Webhook authentication (three gates, not one):**

1. **HMAC signature.** Resend signs every inbound webhook with `RESEND_WEBHOOK_SECRET`. Verify the signature before parsing the body. Reject non-matching with 401.
2. **SPF + DKIM pass.** Resend's payload includes auth results. Require both `spf: pass` AND `dkim: pass` before trusting the `From:` address. A spoofed `From:` header fails DKIM — that's the whole point of DKIM.
3. **Sender whitelist.** After SPF/DKIM pass, check the verified sender against the env-configured whitelist (Gary's email + a short allowlist for common brokers who forward rate cons to Gary's parsing address).

Failing any gate: return 200 OK (don't leak rejection reasons to the sender — attackers learn from rejections) but log the event with reason and drop.

### Build estimate
**3-5 days.** Straight line: email webhook → PDF parse → Claude call → draft load. The gotchas are: OCR failures on scanned PDFs (try Claude's vision first, fall back to Tesseract), edge cases in address parsing, and duplicate prevention (covered above).

### Pricing/scope note
This one's worth pitching as a paid add-on ($1,500-$2,500). Claude API has a per-call cost (~$0.02-0.04 per rate con) that Gary should understand. At 100 loads/month, that's $2-4 in API costs. Worth it.

---

## Feature 3 — Driver Voice Updates

### The problem
Drivers type badly, especially while loading/unloading or in the cab. Status update friction = delayed status updates = Gary doesn't know where his trucks are.

### The feature
On the driver's active-load screen, a prominent **"Hold to Record"** button (press-and-hold, not tap). Driver speaks naturally: "I'm loaded up and heading out of Kansas City, ETA to Dallas tomorrow around 8 AM, shipper wrote on the BOL that the seal number is A7821." The app:

1. Transcribes the audio
2. Extracts structured data (status change, ETA, notes)
3. Updates the load status + ETA
4. Appends the note to the load
5. Plays back a 2-second confirmation tone

### Tech approach

**Recording:**
- `MediaRecorder` API in-browser, records as WebM or MP4
- Max 60 seconds per recording
- Max 10MB file size

**Transcription + extraction:**
- Audio sent to our server: `POST /api/loads/:loadId/voice-update`
- Server sends audio to **Claude API** directly — Claude accepts audio via the messages API, handles transcription + structured extraction in one call
- Fallback: if Claude audio support is unreliable, use **OpenAI Whisper API** for transcription, then Claude for extraction

**Prompt contract:**

```ts
const VoiceUpdateSchema = z.object({
  rawTranscript: z.string(),
  intentClass: z.enum([
    "status_update",
    "eta_update",
    "note_only",
    "issue_report",
    "unclear",
  ]),
  proposedStatus: z.enum([...loadStatuses]).nullable(),
  proposedEta: z.string().datetime().nullable(),
  extractedNote: z.string().nullable(),
  issueFlags: z.array(
    z.enum(["breakdown", "delay", "accident", "detention", "damage", "other"])
  ),
  confidence: z.number().min(0).max(1),
});
```

**UX safeguards:**
- If confidence < 0.7: show the transcript + proposed changes, require driver to confirm before applying
- Any `issueFlags` present → notification to Gary immediately, regardless of confidence
- Always store the raw audio in R2 for 30 days (debugging, driver disputes)
- Voice updates are always logged to `audit_log` with the transcript in `changes.context.voiceTranscript`

### Build estimate
**2-3 days** if Claude's audio input works well out of the box. Add 1-2 days if Whisper fallback needed.

### Privacy note
Driver explicitly opts in when they first use voice. A single consent checkbox: "I understand my voice notes are stored for 30 days and may be reviewed by my employer." Store consent in `driver_profiles.voiceConsentAt`.

---

## Feature 4 — Predictive Document Expiration

### The problem
Standard expiring-doc alerts just nag. The real insight is: will this expiration *matter* for an upcoming load?

### The feature
When the expiration check runs, for each expiring doc we also:

1. Look up the driver's assigned loads in the next 30 days
2. Flag any load whose delivery window falls *after* the expiration
3. In the notification: "Your medical expires March 14. You're scheduled for load PTL-2026-0189 arriving March 17 in Dallas — this load can't be legally completed with an expired medical."
4. For CDL/medical: suggest nearest **DOT-certified clinics** near the driver's home address OR along their route using Google Places search for `"DOT physical clinic"` + location

### Tech approach

**Daily cron (midnight admin TZ), extended:**

```ts
async function runExpirationCheck() {
  const drivers = await getDriversWithExpirationsWithinDays(60);

  for (const driver of drivers) {
    const upcomingLoads = await db.query.loads.findMany({
      where: and(
        eq(loads.assignedDriverId, driver.id),
        gte(
          // delivery window end
          sql`(SELECT MAX(window_end) FROM load_stops WHERE load_id = loads.id)`,
          today
        ),
        notInArray(loads.status, ["completed", "cancelled"])
      ),
      with: { stops: true },
    });

    for (const expiration of driver.expirations) {
      const conflictingLoads = upcomingLoads.filter(
        (l) =>
          maxDeliveryDate(l) > expiration.date &&
          expiration.date < today // already expired, block all
            ? true
            : expiration.type === "medical" || expiration.type === "cdl"
            ? true
            : false
      );

      if (conflictingLoads.length > 0) {
        await createNotification({
          userId: driver.userId,
          type: "document_expiring_" + daysUntil,
          title: "Expiration will conflict with a scheduled load",
          body: composeBodyWithLoadReferences(expiration, conflictingLoads),
          metadata: {
            expirationType: expiration.type,
            expirationDate: expiration.date,
            affectedLoadIds: conflictingLoads.map((l) => l.id),
            suggestedClinics: await findDotClinicsNear(driver.addressCoords),
          },
        });
        // Also notify Gary
        await createNotification({ userId: GARY_USER_ID, ... });
      }
    }
  }
}
```

**Clinic search:**
- Use **Google Places "Text Search"** with query `"DOT physical" near {lat,lng}`
- Cache results per driver+date for 7 days (Places API costs money)
- Return top 5 with name, address, phone, distance, rating

### Build estimate
**1-2 days** on top of the base expiration system.

### UX touch
In the notification, make the clinic suggestions **clickable** — opens a mini map with phone numbers and "Tap to call" on mobile.

---

## Feature 5 — Weekly Driver Settlement Statements

### The problem
Drivers want to know what they're making. Every week. In a format they can screenshot and send to their spouse/accountant. Most small fleets hand over a sloppy pay stub or a Venmo with no detail.

### The feature
Every **Friday at 5:00 PM admin-local**, each active driver gets:
- Email with a beautifully designed PDF attached
- In-app notification with link to the same statement

Contents:
- PTL logo, driver name, pay period (Monday-Sunday of the week ending)
- Each completed load on its own line: load #, pickup city → delivery city, miles, pay amount
- Per-period subtotal, adjustments (with notes), total
- Year-to-date total
- Running load count for the year

### Tech approach

**Cron trigger:**
- Weekly job, Friday 5:00 PM in admin's timezone (stored on `company_settings.timezone`)
- For each active driver:
  1. Query `driver_pay_records` WHERE `createdAt` in current pay period
  2. Query YTD totals
  3. Generate PDF via `@react-pdf/renderer`
  4. Upload to R2 at `settlements/{driverId}/{year}-{weekNumber}.pdf`
  5. Email via Resend with PDF attached
  6. Create in-app notification
  7. Insert into new `settlement_statements` table (see schema addendum below)

### Schema addendum

```ts
export const settlementStatements = pgTable("settlement_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverProfileId: uuid("driver_profile_id").notNull().references(() => driverProfiles.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  totalCents: bigint("total_cents", { mode: "number" }).notNull(),
  loadCount: integer("load_count").notNull(),
  pdfUrl: text("pdf_url").notNull(),
  pdfKey: text("pdf_key").notNull(),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  driverPeriodIdx: uniqueIndex("settlement_statements_driver_period_idx")
    .on(table.driverProfileId, table.periodStart),
}));
```

**Unique constraint on (driver, periodStart)** prevents double-generation if the cron runs twice.

### Build estimate
**1-2 days.** Most of the work is PDF design; the logic is straightforward.

### Nice-to-have
Driver's `/pay` page gets a new "Statements" tab showing all past statements with download links. Adds maybe 2 hours.

---

## Feature 6 — Auto-Email POD to Broker

### The problem
Brokers often require POD (proof of delivery) before they'll release payment. The typical flow: driver delivers → driver photos the BOL → texts it to Gary → Gary emails it to the broker. Hours or days of delay. Slower POD = slower payment.

### The feature
The moment a driver uploads a POD on a load, the system:

1. Assembles a "POD package" PDF:
   - ProTouch Logistics letterhead
   - Load summary (load #, broker's reference #, BOL #)
   - Driver name, truck unit #
   - Pickup info + arrival/departure timestamps
   - Delivery info + arrival timestamp
   - GPS verification map showing driver was AT delivery location
   - Uploaded POD image(s) appended
2. Emails to broker's `billingEmail` (fallback `contactEmail`) with CC to Gary
3. Marks load `pod_uploaded`
4. Logs the send event; retries twice on failure

### Tech approach

**Triggered by document upload:**

```ts
// Server function: confirmLoadDocumentUpload
async function confirmLoadDocumentUpload(input: {...}) {
  const doc = await insertDocument(input);

  if (doc.type === "load_pod") {
    await updateLoadStatus(doc.loadId, "pod_uploaded", {
      changedByUserId: session.userId,
    });
    // Fire-and-forget but tracked
    await queueJob("send_pod_to_broker", { loadId: doc.loadId, podDocumentId: doc.id });
  }

  return doc;
}
```

**Job:**

```ts
async function sendPodToBroker(loadId: string, podDocumentId: string) {
  const load = await db.query.loads.findFirst({
    where: eq(loads.id, loadId),
    with: { broker: true, stops: true, assignedDriver: true, assignedTruck: true },
  });

  const podDoc = await getDocument(podDocumentId);
  const deliveryGps = await getDeliveryLocationProof(loadId);

  const pdfBuffer = await renderPodPackagePdf({ load, podDoc, deliveryGps });
  const pdfKey = await uploadToR2(`pod-packages/${loadId}.pdf`, pdfBuffer);

  await sendEmail({
    to: load.broker.billingEmail ?? load.broker.contactEmail,
    cc: [GARY_EMAIL],
    subject: `POD — Load ${load.loadNumber} — ${load.broker.companyName}`,
    bodyHtml: renderPodEmailHtml(load),
    attachments: [{ filename: `POD_${load.loadNumber}.pdf`, content: pdfBuffer }],
  });

  await db.insert(podDeliveries).values({
    loadId,
    podDocumentId,
    sentAt: new Date(),
    sentToEmail: load.broker.billingEmail ?? load.broker.contactEmail,
    pdfKey,
  });
}
```

### Schema addendum

```ts
export const podDeliveries = pgTable("pod_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").notNull().references(() => loads.id, { onDelete: "cascade" }),
  podDocumentId: uuid("pod_document_id").notNull().references(() => documents.id),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  sentToEmail: text("sent_to_email").notNull(),
  pdfKey: text("pdf_key").notNull(),
  deliveryAttempts: integer("delivery_attempts").notNull().default(1),
  lastError: text("last_error"),
});
```

### Build estimate
**2 days.** The PDF design is the main time cost. Think of it as Gary's branded digital letterhead — it should look like something a $50M fleet would send.

---

## Feature 7 — Broker Scorecard

### The problem
Gary works with 10-50 brokers over time. Some pay in 15 days, some in 60, some dispute every rate con, some are a pleasure. That knowledge lives in Gary's head. When his dispatcher quits, it evaporates.

### The feature
Every broker's detail page has a scorecard panel with:

- **Avg days to pay** (from invoice sent → paid)
- **Payment reliability** (% of invoices paid within terms)
- **Rate consistency** (avg rate per mile)
- **Volume** (loads this year, revenue this year)
- **Recent activity** (loads in last 90 days, last load date)
- **Detention incidents** (any load status history showing >2hr at pickup or delivery)
- **Star rating** (Gary's manual 1-5)
- **Computed letter grade**: A/B/C/D based on a weighted formula

On the brokers **list** page, show the computed grade as a badge next to each broker.

### Tech approach

All data is already captured. We just compute.

**Computed view (don't store; recompute on read, cache with 1-hour TTL):**

```ts
async function getBrokerScorecard(brokerId: string) {
  const [paidInvoices, allInvoices, loads90d, completedLoads, loadsWithDetention] =
    await Promise.all([
      db.query.invoices.findMany({
        where: and(eq(invoices.brokerId, brokerId), eq(invoices.status, "paid")),
      }),
      db.query.invoices.findMany({ where: eq(invoices.brokerId, brokerId) }),
      db.select({ count: count() }).from(loads).where(
        and(eq(loads.brokerId, brokerId), gte(loads.createdAt, ninetyDaysAgo()))
      ),
      db.query.loads.findMany({
        where: and(eq(loads.brokerId, brokerId), eq(loads.status, "completed")),
      }),
      detectDetentionIncidents(brokerId),
    ]);

  const avgDaysToPay = mean(
    paidInvoices.map((i) => daysBetween(i.sentAt!, i.paidAt!))
  );
  const onTimeRate =
    paidInvoices.filter((i) => i.paidAt! <= endOfDay(i.dueDate)).length /
    (paidInvoices.length || 1);
  const avgRatePerMile = meanBy(
    completedLoads.filter((l) => l.miles),
    (l) => l.rate / l.miles!
  );
  // ... etc

  const grade = computeLetterGrade({ avgDaysToPay, onTimeRate, detentionRate, starRating });

  return { avgDaysToPay, onTimeRate, avgRatePerMile, volume, grade, ... };
}
```

**Cache:** Redis optional but not required at 5-driver scale. In-memory LRU cache with 1-hour TTL is fine; recompute is <500ms.

### Build estimate
**1-2 days.** No new tables; all queries, aggregations, and UI.

### UX touch
When Gary's creating a new load and picks a broker, show a tiny inline scorecard next to the selected broker: "Acme Logistics (B+, pays in 31d avg)." Decision-making info at the moment of decision.

---

## Feature 8 — Owner Dashboard (Wall-Mount Mode)

### The problem
Gary runs his company from his desk. When a customer, accountant, spouse, or prospective driver walks in, the app in his browser doesn't scream "$5M trucking operation" — it screams "login screen."

### The feature
A dedicated route `/admin/wall` that renders a full-screen, auto-refreshing dashboard optimized for display on a TV:

- **Big live map** of active drivers (60% of screen)
- **Ticker row** at top: revenue MTD, loads in-progress, loads completed this week, on-time %
- **Active loads list** at side: load #, driver name, status, ETA — one line each, scrolling
- **Footer**: ProTouch logo, date, weather at HQ, current time
- **Auto-refresh** every 15 seconds
- **No login prompts**, no modal dialogs, keeps rendering even if session expires (use a dedicated long-lived "display token")

### Tech approach

**Display token:**
- Gary generates a one-time "display token" from admin settings
- Token is long-lived (90 days), read-only, bound to a single URL path `/admin/wall/{token}`
- Opens without a login screen on the wall TV's browser
- Can be revoked from admin at any time

**Schema:**

```ts
export const displayTokens = pgTable("display_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  name: text("name").notNull(), // "Office TV", "Dispatch Monitor"
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex("display_tokens_token_idx").on(table.token),
}));
```

**Route:**
- `/admin/wall/$token` — no standard auth guard; checks token validity instead
- Server function `getWallData(token)` returns: active driver positions, KPIs, active loads
- Rendered server-side on load; client polls every 15s via TanStack Query

**Design notes:**
- Dark mode only (wall TVs look better dark)
- Large typography (minimum 24px body, 64px KPI numbers)
- Map uses a custom Mapbox style — darker, higher contrast
- No scroll, no interaction expected — everything fits on screen
- "No data" states just fade in with neutral copy

### Build estimate
**2 days.** Mostly a layout exercise; the data queries already exist.

### The magic moment
Gary throws this on a 55" wall-mounted TV in his office. Anyone who walks in thinks ProTouch runs 50 trucks. It also makes Gary feel great about his business every day.

---

## Feature 10 — Conversational Driver Onboarding

### The problem
Most onboarding flows are a wall of 30 fields. Drivers abandon halfway through or submit garbage. Gary then spends 30 minutes on the phone correcting data.

### The feature
One question per screen. Big inputs. Large photo upload with live camera preview for CDL and medical card. Progress bar always visible. Conversational copy ("Hey — what's your legal name as it appears on your CDL?").

Flow:

1. **Welcome screen** — ProTouch logo, "Let's get you on the road. Takes about 5 minutes."
2. **Name**
3. **Date of birth**
4. **Phone number** (with auto-format)
5. **Home address** (Google Places autocomplete)
6. **Emergency contact** (name, phone, relation — single screen)
7. **CDL photo** — live camera with overlay guide for card corners, auto-crop, auto-rotate. Upload or reshoot.
8. **CDL details** — most fields pre-filled from image extraction via Claude vision; driver confirms
9. **Medical card photo** — same camera flow
10. **Medical card expiration** — pre-filled, confirm
11. **Review screen** — all data, one tap to edit any section
12. **Submit** — "Submitted. Gary will review within 24 hours. We'll email you when you're approved."

### Tech approach

**Camera UX:**
- `<input type="file" capture="environment">` for mobile — opens camera directly
- On desktop: drag-drop PDF or image
- After upload: display the image inside a cropping UI with **4-corner handles** (use `react-easy-crop` or similar)
- Auto-detect card edges using browser canvas + simple edge detection, pre-position crop handles
- Driver adjusts if needed, taps confirm

**Image-to-data extraction:**
- After crop confirmed, upload signed URL path, then server calls Claude API with the image
- Claude returns structured CDL data: number, class, state, expiration, name (verify matches entered name), DOB (verify matches entered DOB)
- Pre-fill the next form screen; show a soft "auto-filled from your CDL photo" hint
- Driver must tap each field to confirm, not just hit Next (prevents blind submission of OCR errors)
- **OCR failure path:** Claude calls run async post-upload. The form is *pre-fillable* from OCR but NEVER blocks on it. If Claude is slow, down, or returns low confidence, the driver types the fields manually. Inline spinner: "Reading your photo..." — if it fails or times out after 15s, it disappears silently and the driver keeps typing. Onboarding must never stall on a third-party dependency.

**Progress + save-as-you-go:**
- Every screen transition writes to `driver_profiles` as partial data
- Driver can close tab, come back, resume where they left off
- `driver_profiles.onboardingState` field tracks which step they're on

### Schema addendum

Add to `driver_profiles`:

```ts
onboardingState: text("onboarding_state"), // "name" | "dob" | "phone" | ... | "complete"
onboardingStartedAt: timestamp("onboarding_started_at", { withTimezone: true }),
```

### Validation rules

- **DOB from CDL photo** must match entered DOB (within 1 day tolerance for timezone weirdness) or we flag the mismatch for Gary
- **CDL expiration must be future** or driver cannot submit
- **Medical expiration must be future** or driver cannot submit
- **Phone must be valid US E.164** format after normalization
- **Address must have valid ZIP for state** (use USPS validation or Google Places verified address)

### Build estimate
**2-3 days.** The camera + crop UX is the time sink; the data side is straightforward.

### Don't skip
- **Mobile-first**. 90% of drivers will complete this on their phone.
- **Offline tolerance** — if connection dies, save local state to sessionStorage (the ONE place sessionStorage is okay, and only for in-progress form data, never auth)
- **Accessibility** — camera should be optional. Allow PDF upload as equal-priority path.

---

## Combined build estimate for creative features

| Feature | Days | Risk |
|---|---|---|
| 2. AI rate con intake | 3-5 | Medium (PDF OCR edge cases) |
| 3. Voice updates | 2-3 | Low-Medium (audio API reliability) |
| 4. Predictive expiration | 1-2 | Low |
| 5. Weekly settlements | 1-2 | Low |
| 6. Auto-POD to broker | 2 | Low |
| 7. Broker scorecard | 1-2 | Low |
| 8. Wall dashboard | 2 | Low |
| 10. Conversational onboarding | 2-3 | Medium (camera UX polish) |
| **Total** | **14-21 days** | |

That's on top of the base Phase 1 build. Translation: these features need a real budget conversation with Gary. Recommend packaging 4, 5, 6, 7, 8, 10 into Phase 1 (cheapest, most visible) and pitching 2 + 3 as Phase 1.5 paid add-ons once he's seen the base app working.

---

## AI/Claude API cost projections (for Gary's awareness)

At 5 drivers, 3 loads/day each = ~75 loads/week = ~300/month.

| Feature | Per-unit API cost | Monthly |
|---|---|---|
| Rate con parsing | ~$0.03 | ~$9 |
| Voice updates (avg 3/load) | ~$0.01 | ~$9 |
| CDL/medical OCR (onboarding) | ~$0.05 | <$1 (rare) |
| **Total Claude spend** | | **~$20/month** |

Plus Google Places (~$5/mo at this volume), Mapbox (free tier likely covers), Resend (~$20/mo), Neon/Supabase DB (~$20/mo), R2 storage (~$5/mo).

**All-in infra costs: ~$70/month** at launch. Worth putting in Gary's contract as his responsibility.
