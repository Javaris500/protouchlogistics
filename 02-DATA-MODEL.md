# ProTouch Logistics — Data Model & Schema

**Database:** PostgreSQL
**ORM:** Drizzle
**Migrations:** `drizzle-kit` in `/drizzle` — never edit prod DB by hand.

All tables use:
- `id` — `uuid` primary key, `defaultRandom()`
- `createdAt` / `updatedAt` — `timestamptz`, auto-managed
- Soft deletes via `deletedAt` only where explicitly noted (loads, drivers, trucks, brokers). Everything else is hard delete or immutable.

Money is stored as **integer cents** (`integer` or `bigint`). Never float.

---

## 0. Required extensions

The initial migration must enable these PostgreSQL extensions before any schema is created:

```sql
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email columns (users, brokers)
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy broker-name matching for rate-con ingest (Feature 2)
```

Both are available on Neon and Supabase but neither enables them by default. Put these in migration `0000_prelude.sql` before `0001_initial_schema.sql`.

---

## 1. Auth & users

### `users`
The single identity table. Both Gary and drivers live here.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | citext unique | case-insensitive |
| passwordHash | text | Better Auth managed |
| role | enum(`admin`, `driver`) | |
| status | enum(`invited`, `pending_approval`, `active`, `suspended`) | |
| emailVerified | boolean | default false |
| twoFactorEnabled | boolean | admin only in Phase 1 |
| twoFactorSecret | text nullable | encrypted |
| lastLoginAt | timestamptz nullable | |
| firstLoginCompletedAt | timestamptz nullable | set when (a) the bootstrap/invite password has been rotated AND (b) for admins, 2FA is enabled. Middleware `requireAdminReady` blocks the admin app until non-null. See `05-TECH-CONTRACTS.md §4.2`. |
| createdAt, updatedAt | timestamptz | |

**Status lifecycle:**
- Driver: `invited` → (accepts invite, sets password) → `pending_approval` → (Gary approves) → `active` → `suspended`
- Admin: starts at `active`. Created only by `seeds/bootstrap.ts` on first deploy using env vars — no UI signup path exists. Additional admins (Phase 2) would require an admin-only `createAdmin` server function.

### `sessions`
Managed entirely by Better Auth. Do not hand-roll. Durations: admin 7d, driver 30d. HttpOnly, secure, sameSite=lax.

### `invites`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | citext | |
| token | text unique | cryptographically random |
| expiresAt | timestamptz | 7 days default |
| invitedByUserId | uuid FK users | |
| acceptedAt | timestamptz nullable | |
| createdAt | timestamptz | |

### `password_resets`
Managed by Better Auth. Single-use tokens, 1-hour expiration.

---

## 2. Drivers

### `driver_profiles`
One-to-one with `users` where role=driver.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| userId | uuid FK users unique | |
| firstName | text | |
| lastName | text | |
| dob | date | |
| phone | text | E.164 format |
| addressLine1 | text | |
| addressLine2 | text nullable | |
| city | text | |
| state | char(2) | US state code |
| zip | text | |
| emergencyContactName | text | |
| emergencyContactPhone | text | |
| emergencyContactRelation | text | |
| cdlNumber | text | |
| cdlClass | enum(`A`, `B`, `C`) | |
| cdlState | char(2) | |
| cdlExpiration | date | |
| medicalCardExpiration | date | |
| hireDate | date | |
| assignedTruckId | uuid FK trucks nullable | current default truck |
| payModel | enum(`percent_of_rate`, `per_mile`, `flat_per_load`) | |
| payRate | integer | cents; percent_of_rate stores basis points (2500 = 25.00%) |
| notes | text nullable | admin-only |
| onboardingState | text nullable | current parent step: "welcome", "about", "contact", "cdl", "medical", "review", "complete". Sub-screens within cdl/medical tracked client-side via URL `?sub=` param, not in DB. |
| onboardingStartedAt | timestamptz nullable | |
| onboardingCompletedAt | timestamptz nullable | |
| voiceConsentAt | timestamptz nullable | set when driver consents to voice recording (Phase 1.5) |
| approvedAt | timestamptz nullable | |
| approvedByUserId | uuid FK users nullable | |
| deletedAt | timestamptz nullable | |
| createdAt, updatedAt | timestamptz | |

**Pay model semantics:**
- `percent_of_rate`: `payRate` is basis points. Driver pay = `load.rate * payRate / 10000`.
- `per_mile`: `payRate` is cents per mile. Driver pay = `load.miles * payRate`.
- `flat_per_load`: `payRate` is cents. Driver pay = `payRate` per load, regardless of rate or miles.

**Compliance gate:** A driver with `cdlExpiration` or `medicalCardExpiration` in the past cannot be assigned a new load. Enforced at the server function level in `assignLoadToDriver`.

---

## 3. Trucks

### `trucks`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| unitNumber | text unique | e.g. "101", "T-205" |
| vin | text unique | 17-char, validate checksum |
| make | text | |
| model | text | |
| year | integer | |
| licensePlate | text | |
| plateState | char(2) | |
| registrationExpiration | date | |
| insuranceExpiration | date | |
| annualInspectionExpiration | date | |
| currentMileage | integer | |
| status | enum(`active`, `in_shop`, `out_of_service`) | |
| assignedDriverId | uuid FK driver_profiles nullable | |
| notes | text nullable | |
| deletedAt | timestamptz nullable | |
| createdAt, updatedAt | timestamptz | |

Trucks can be assigned to a driver by default, and also overridden per-load.

---

## 4. Brokers

### `brokers`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| companyName | text | |
| mcNumber | text nullable | |
| dotNumber | text nullable | |
| contactName | text | |
| contactPhone | text | |
| contactEmail | citext | |
| billingEmail | citext nullable | where invoices go |
| addressLine1 | text | |
| addressLine2 | text nullable | |
| city | text | |
| state | char(2) | |
| zip | text | |
| paymentTerms | enum(`net_15`, `net_30`, `net_45`, `net_60`, `quick_pay`, `other`) | |
| paymentTermsOther | text nullable | |
| creditRating | text nullable | e.g. "A", "B+" |
| starRating | smallint | 1-5, Gary's internal rating |
| notes | text nullable | |
| deletedAt | timestamptz nullable | |
| createdAt, updatedAt | timestamptz | |

**Driver visibility:** Brokers are NEVER shown to drivers. Enforce in every query that joins loads to brokers — strip broker data if requester is driver.

**Uniqueness:** Partial unique index on `mcNumber` prevents duplicates when two admins (or an admin + the rate-con ingest pipeline) create the same broker simultaneously:

```sql
CREATE UNIQUE INDEX brokers_mc_unique
  ON brokers (mc_number)
  WHERE mc_number IS NOT NULL AND deleted_at IS NULL;
```

No unique constraint on `companyName` — legitimate brokers can share names across regions. Use `mcNumber` as the canonical identifier.

---

## 5. Loads

### `loads`
The core operational table.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| loadNumber | text unique | auto: `PTL-YYYY-####`, resets yearly |
| brokerId | uuid FK brokers | |
| assignedDriverId | uuid FK driver_profiles nullable | |
| assignedTruckId | uuid FK trucks nullable | |
| status | enum (see below) | |
| rate | integer | cents; broker pays this to Gary |
| miles | integer | optional, used for per-mile pay |
| commodity | text | |
| weight | integer nullable | lbs |
| pieces | integer nullable | |
| specialInstructions | text nullable | |
| referenceNumber | text nullable | broker's reference |
| bolNumber | text nullable | bill of lading number |
| createdByUserId | uuid FK users | |
| deletedAt | timestamptz nullable | |
| createdAt, updatedAt | timestamptz | |

### Load status enum
```
draft
assigned
accepted
en_route_pickup
at_pickup
loaded
en_route_delivery
at_delivery
delivered
pod_uploaded
completed
cancelled
```

Transitions are enforced in `updateLoadStatus()`. Drivers can only advance forward. Gary can jump anywhere with a required `reason` field written to audit log.

### `load_stops` (multi-stop-ready)
In Phase 1, every load has exactly 2 stops: sequence=1 (pickup), sequence=2 (delivery). Phase 2 extends this freely.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| loadId | uuid FK loads | cascade delete |
| sequence | smallint | 1, 2, 3, ... |
| stopType | enum(`pickup`, `delivery`) | |
| companyName | text nullable | shipper/consignee name |
| addressLine1 | text | |
| addressLine2 | text nullable | |
| city | text | |
| state | char(2) | |
| zip | text | |
| lat | decimal(10,7) | |
| lng | decimal(10,7) | |
| windowStart | timestamptz | |
| windowEnd | timestamptz | |
| arrivedAt | timestamptz nullable | auto on `at_pickup`/`at_delivery` |
| departedAt | timestamptz nullable | |
| contactName | text nullable | |
| contactPhone | text nullable | |
| notes | text nullable | |
| createdAt, updatedAt | timestamptz | |

Unique constraint on `(loadId, sequence)`.

### `load_status_history`
Immutable log of every status change.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| loadId | uuid FK loads | |
| fromStatus | enum nullable | null for initial |
| toStatus | enum | |
| changedByUserId | uuid FK users | |
| changedAt | timestamptz | |
| reason | text nullable | required on admin override |
| locationLat | decimal(10,7) nullable | captured from device at time of change |
| locationLng | decimal(10,7) nullable | |
| createdAt | timestamptz | |

Indexed on `(loadId, changedAt desc)`.

---

## 6. Documents

### `documents`
Polymorphic document store.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| type | enum (see below) | |
| fileUrl | text | R2 signed URL — never public, always signed |
| fileKey | text | storage key for deletion |
| fileName | text | original filename |
| fileSizeBytes | bigint | |
| mimeType | text | |
| uploadedByUserId | uuid FK users | |
| driverProfileId | uuid FK driver_profiles nullable | |
| truckId | uuid FK trucks nullable | |
| loadId | uuid FK loads nullable | |
| expirationDate | date nullable | only for expirable types |
| notes | text nullable | |
| createdAt, updatedAt | timestamptz | |

### Document type enum
```
driver_cdl
driver_medical
driver_mvr
driver_drug_test
driver_other
truck_registration
truck_insurance
truck_inspection
truck_other
load_bol
load_rate_confirmation
load_pod
load_lumper_receipt
load_scale_ticket
load_other
```

**Rules:**
- Exactly one of `driverProfileId`, `truckId`, `loadId` must be non-null. Drizzle will not emit this from the type definitions — declare the CHECK explicitly in the migration:

  ```sql
  ALTER TABLE documents ADD CONSTRAINT documents_owner_exclusive CHECK (
    (driver_profile_id IS NOT NULL)::int +
    (truck_id IS NOT NULL)::int +
    (load_id IS NOT NULL)::int = 1
  );
  ```

- `driver_*` types require `driverProfileId`.
- `truck_*` types require `truckId`.
- `load_*` types require `loadId`.
- Expirable types (`driver_cdl`, `driver_medical`, `truck_registration`, `truck_insurance`, `truck_inspection`) must have `expirationDate`.

**File upload guardrails:**
- Max 25 MB per file
- Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `image/webp`
- Validated server-side, not just client-side
- URLs are signed, 15-minute TTL, regenerated on each view

---

## 7. GPS Tracking

### `driver_locations`
High-volume write table. Append-only.

| Column | Type | Notes |
|---|---|---|
| id | bigserial | PK (bigint, this table will grow) |
| driverProfileId | uuid FK driver_profiles | |
| loadId | uuid FK loads nullable | |
| lat | decimal(10,7) | |
| lng | decimal(10,7) | |
| accuracyMeters | real nullable | |
| headingDegrees | real nullable | |
| speedMps | real nullable | |
| recordedAt | timestamptz | from device |
| createdAt | timestamptz | server receive time |

**Indexes:**
- `(driverProfileId, recordedAt desc)` — for live position lookup
- `(loadId, recordedAt asc)` — for breadcrumb trail per load
- BRIN index on `recordedAt` — for time-range archival queries
- UNIQUE `(driverProfileId, loadId, recordedAt)` — idempotency. Client retries (spotty cellular is the norm) use `ON CONFLICT DO NOTHING` on insert so a duplicate post doesn't double-write the breadcrumb.

**Retention policy:**
- Raw points: 90 days hot
- After 90 days: downsample to one point per 5 minutes, move to cold storage (or just delete in Phase 1 and tell Gary)
- Phase 1 acceptable: keep everything for 1 year, decide archival in Phase 2
- **Phase 1 ships a `cleanupDriverLocations` cron job as a no-op stub.** Wiring the surface now means Phase 2 flips retention parameters without a deploy. See `05-TECH-CONTRACTS.md` §2 project tree.

**Tracking lifecycle:**
- Client starts posting when load status → `en_route_pickup`
- Client stops posting when load status → `delivered` or `pod_uploaded`
- Posting cadence: every 45 seconds, or every 200m of movement (whichever comes first)
- Client shows visible "Tracking active" badge whenever posting

---

## 8. Invoicing

### `invoices`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| invoiceNumber | text unique | `PTL-INV-YYYY-####` |
| brokerId | uuid FK brokers | |
| status | enum(`draft`, `sent`, `paid`, `overdue`, `void`) | |
| subtotalCents | bigint | sum of load rates |
| adjustmentsCents | bigint | default 0, can be negative |
| totalCents | bigint | subtotal + adjustments |
| issueDate | date | |
| dueDate | date | computed from broker's paymentTerms |
| sentAt | timestamptz nullable | |
| paidAt | timestamptz nullable | |
| paidAmountCents | bigint nullable | |
| paymentMethod | text nullable | "check #1234", "ACH", etc. |
| pdfUrl | text nullable | generated PDF location |
| notes | text nullable | |
| createdByUserId | uuid FK users | |
| createdAt, updatedAt | timestamptz | |

### `invoice_line_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| invoiceId | uuid FK invoices | cascade delete |
| loadId | uuid FK loads nullable | null for manual line items like "detention" |
| description | text | |
| amountCents | bigint | |
| sortOrder | smallint | |
| createdAt | timestamptz | |

**Rules:**
- Only `completed` loads can be added to an invoice
- A load can only appear on one non-void invoice at a time. **Service-layer enforced** via `SELECT ... FOR UPDATE` on `invoice_line_items` joined to non-void `invoices` inside the create-invoice transaction. A partial unique index cannot express this cleanly because it would need to reference another table's `status` — do it in the service, keep the `SELECT FOR UPDATE` block as a standalone helper so every invoice-creation path uses the same lock.
- Once an invoice is `sent`, it cannot be edited (void + recreate)
- `dueDate` auto-calculated from `brokerId.paymentTerms` on creation, overridable

### `driver_pay_records`
Computed at load completion, stored for fast reporting.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| driverProfileId | uuid FK driver_profiles | |
| loadId | uuid FK loads unique | one pay record per load |
| payModel | enum | snapshot at time of completion |
| payRate | integer | snapshot |
| calculatedAmountCents | bigint | |
| adjustmentsCents | bigint | default 0 |
| totalAmountCents | bigint | |
| paidAt | timestamptz nullable | set when Gary marks this record as paid out |
| notes | text nullable | |
| createdAt, updatedAt | timestamptz | |

Snapshot the pay model at completion time so historical changes to the driver's pay setup don't retroactively alter past earnings. `paidAt` is used by the admin pay view to toggle settlement status (unpaid/paid) and by CSV export filtering.

### `settlement_statements`
Weekly PDF settlement statements emailed to drivers every Friday.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| driverProfileId | uuid FK driver_profiles | |
| periodStart | date | Monday of the pay week |
| periodEnd | date | Sunday of the pay week |
| totalCents | bigint | total pay for period |
| loadCount | integer | loads completed in period |
| pdfUrl | text | R2 storage URL |
| pdfKey | text | R2 key for deletion |
| emailSentAt | timestamptz nullable | |
| generatedAt | timestamptz | defaultNow() |

Unique constraint on `(driverProfileId, periodStart)` — prevents double-generation if the cron runs twice.

Indexed on `(driverProfileId, periodStart desc)`.

### `pod_deliveries`
Tracks auto-emailed POD packages sent to brokers.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| loadId | uuid FK loads | cascade delete |
| podDocumentId | uuid FK documents | |
| sentAt | timestamptz | |
| sentToEmail | text | broker email at time of send |
| pdfKey | text | R2 key for assembled POD package PDF |
| deliveryAttempts | integer | default 1, incremented on retry |
| lastError | text nullable | last failure message if any |

Indexed on `(loadId)`.

### `display_tokens`
Long-lived read-only tokens for wall-mount TV dashboards.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| token | text unique | cryptographically random, indexed |
| name | text | e.g. "Office TV", "Dispatch Monitor" |
| createdByUserId | uuid FK users | |
| lastUsedAt | timestamptz nullable | updated on each poll |
| revokedAt | timestamptz nullable | set to revoke access |
| expiresAt | timestamptz | 90-day default TTL |
| createdAt | timestamptz | defaultNow() |

Token validity check: `revokedAt IS NULL AND expiresAt > now()`.

---

## 9. Notifications

### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| userId | uuid FK users | recipient |
| type | enum (see below) | |
| title | text | |
| body | text | |
| linkUrl | text nullable | where to go on click |
| metadata | jsonb nullable | `{loadId, driverId, ...}` |
| readAt | timestamptz nullable | |
| emailSentAt | timestamptz nullable | null if not emailed |
| createdAt | timestamptz | |

### Notification type enum
```
load_assigned
load_accepted
load_status_changed
load_delivered
document_expiring_60
document_expiring_30
document_expiring_14
document_expiring_7
document_expired
driver_onboarding_submitted
driver_approved
driver_rejected
invoice_sent
invoice_paid
invoice_overdue
system
```

**Delivery rules:**
- All notifications land in-app
- Email is sent for: load_assigned (to driver), driver_approved (to driver), driver_rejected (to driver), document_expiring_30/14/7/expired (to Gary), driver_onboarding_submitted (to Gary), load_delivered (to Gary), invoice_paid (to Gary), invoice_overdue (to Gary)
- Daily digest option: Phase 2

---

## 10. Audit log

### `audit_log`
Write-only, immutable.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| userId | uuid FK users nullable | null for system actions |
| action | text | `create`, `update`, `delete`, `assign`, `status_change`, `login`, `approve`, etc. |
| entityType | text | `load`, `driver`, `truck`, `broker`, `invoice`, etc. |
| entityId | uuid nullable | |
| changes | jsonb | `{before, after}` diff or free-form context |
| ipAddress | inet nullable | |
| createdAt | timestamptz | |

**Every mutation writes here.** Wrap in middleware so it's automatic, not opt-in. Gary can view this from `/admin/settings/audit`.

---

## 11. Phase 2 schema readiness (already baked in)

These are already in the Phase 1 schema to avoid Phase 2 migration pain:

- **`load_stops`** supports unlimited stops, Phase 1 just creates 2
- **`users.role` enum** can be extended with `dispatcher` without migration
- **`documents` polymorphic design** can accept new types without schema change
- **`invoice_line_items.loadId` nullable** allows accessorial charges later
- **`driver_pay_records.adjustmentsCents`** allows bonuses, deductions, chargebacks

Phase 2 additions that WILL require migration:
- ELD integration tables (`eld_providers`, `eld_devices`, `hos_logs`)
- Multi-tenancy (`organizations`, `memberships`)
- Customer portal (`customers`, `customer_users`)

---

## 12. Indexing cheat sheet

At minimum, create indexes on:

- `users(email)`
- `sessions(token)`, `sessions(userId, expiresAt)`
- `invites(token)`, `invites(email)`
- `driver_profiles(userId)`, `driver_profiles(cdlExpiration)`, `driver_profiles(medicalCardExpiration)`
- `trucks(unitNumber)`, `trucks(vin)`, `trucks(status)`
- `brokers(companyName)`, UNIQUE `(mcNumber) WHERE mcNumber IS NOT NULL AND deletedAt IS NULL`
- `loads(loadNumber)`, `loads(assignedDriverId, status)`, `loads(status, createdAt desc)`, `loads(brokerId)`
- `load_stops(loadId, sequence)`
- `load_status_history(loadId, changedAt desc)`
- `documents(driverProfileId)`, `documents(truckId)`, `documents(loadId)`, `documents(expirationDate) WHERE expirationDate IS NOT NULL`
- `driver_locations(driverProfileId, recordedAt desc)`, `driver_locations(loadId, recordedAt asc)`, BRIN on `recordedAt`, UNIQUE `(driverProfileId, loadId, recordedAt)` for idempotency
- `invoices(brokerId)`, `invoices(status, dueDate)`
- `invoice_line_items(invoiceId)`, `invoice_line_items(loadId)`
- `driver_pay_records(driverProfileId, createdAt desc)`, `driver_pay_records(paidAt) WHERE paidAt IS NULL`
- `settlement_statements(driverProfileId, periodStart desc)` unique
- `pod_deliveries(loadId)`
- `display_tokens(token)` unique
- `notifications(userId, readAt, createdAt desc)`
- `audit_log(userId, createdAt desc)`, `audit_log(entityType, entityId, createdAt desc)`

---

## 13. Row-level security mindset

Better Auth doesn't use Postgres RLS — enforcement happens in server functions. Rule of thumb:

- **Admin requests:** unfiltered.
- **Driver requests:** EVERY query filters by `driverProfileId = session.driverProfileId`.
- Broker data, rates, and other drivers' info must be stripped before returning to a driver, even if a driver somehow crafts a query.

Write a helper `assertDriverCanAccessLoad(session, loadId)` and call it at the top of every load-related server function. Same for trucks, documents, etc.
