# ProTouch Logistics — Driver Onboarding Flow

Source of truth for the driver onboarding experience. This is the first impression Gary's drivers have of the platform — it sets the tone for everything else. If this screen feels cheap, nothing that follows recovers.

**Related docs:**
- `01-PROJECT-BRIEF.md` — branding, color palette
- `02-DATA-MODEL.md` §2 — `driver_profiles` schema, `onboardingState` field
- `03-ROUTES-AND-FEATURES.md` §2.1 — the invite → onboarding → approval workflow
- `04-CREATIVE-FEATURES.md` Feature 10 — conversational onboarding
- `05-TECH-CONTRACTS.md` §9.2 — server functions that power each step

---

## 1. Context

Driver clicks the invite email on their phone → lands on `/invite/$token` → sets password → gets dropped into `/onboarding/welcome`. They complete the flow, hit submit, land on `/onboarding/pending` while Gary reviews, then get notified when they're approved.

**Who we're designing for:** a 30-60 year old commercial driver, thumb-typing on an Android or iPhone, possibly in a truck cab, possibly in a noisy environment, possibly interrupted. Not tech-averse but not tech-enthusiastic. Wants to be done and driving.

**Success metric:** a new driver completes the flow end-to-end in ≤ 5 minutes of active time with no support calls to Gary.

---

## 2. Principles

1. **One question per screen.** Never more than one decision at a time.
2. **Camera before typing.** OCR pre-fills; driver confirms. Typing is the fallback.
3. **Save on every Next.** Tab-close, app-switch, Face ID prompt — resume on the same screen.
4. **Forward-only until review.** No step-stepper jump buttons. Back arrow always works.
5. **Bottom-anchored primary button.** Sticky to the bottom of the viewport, thumb-reachable.
6. **Motion is light.** Slide-left on forward, fade on back. `prefers-reduced-motion` → no slides.
7. **Inline validation.** Checked on blur, shown under the field, never as a toast.
8. **Copy is conversational, not corporate.** "What's your legal name?" not "Legal Name (required)".
9. **No logos or dashboards while onboarding.** The only branding is a small `PTL` mark top-left. Don't rush the user into the full UI.
10. **Offline-tolerant.** If the network drops mid-step, the Next button shows "Retry" not a red toast.

---

## 3. The flow (5 steps)

```
/onboarding/welcome            Welcome + "Takes about 3 minutes"
/onboarding/about              Step 1: name, DOB, phone
/onboarding/contact            Step 2: home address + emergency contact
/onboarding/cdl                Step 3: CDL — photo → confirm details (2 sub-screens, 1 route)
/onboarding/medical            Step 4: medical card — photo → confirm expiration (2 sub-screens, 1 route)
/onboarding/review             Step 5: review everything, submit
/onboarding/pending            Post-submit: "Gary will review"
```

Progress bar shows **5 parent steps** — drivers see "Step 2 of 5," not a count to 10. Steps 3 and 4 use a multistep-form pattern internally: two sub-screens (photo → confirm details) that transition smoothly within the same route, but count as a single step in the progress indicator. Each sub-screen still saves incrementally so mid-step interruptions resume cleanly.

Each parent path maps 1:1 to a value of `driver_profiles.onboardingState`. The `beforeLoad` guard on every onboarding route reads that field and redirects to the current step — a driver who hits `/onboarding/medical` without finishing `/onboarding/cdl` gets bounced back.

---

## 4. Screen-by-screen

### 4.1 Welcome (`/onboarding/welcome`)

**Layout:** PTL logo centered, 40% down the viewport. Below: greeting. Below: single primary button.

**Copy:**
> **Welcome to ProTouch.**
> Let's get you set up. Takes about 5 minutes — you can pause and come back if you need to.

**Primary button:** "Let's go"

**No skip, no back.**

---

### 4.2 Step 1: About you (`/onboarding/about`)

Three short fields on one screen, stacked vertically. Each validates on blur. Next is disabled until all three are valid.

**Copy (screen header):**
> **Let's start with the basics.**

**Fields:**
- **First name** — `autocomplete="given-name"`, `autocapitalize="words"`, required
- **Last name** — `autocomplete="family-name"`, `autocapitalize="words"`, required
- **Date of birth** — native `<input type="date">` on mobile; 18+, before today, after 1920
- **Mobile phone** — `type="tel"`, mask `(###) ###-####`, stored as E.164

**Helper (under header):**
> *Use your legal name exactly as it appears on your CDL.*

**Inline errors:** "You must be at least 18 to drive commercially." / "That doesn't look like a valid US phone number."

---

### 4.3 Step 2: Contact (`/onboarding/contact`)

Two logical sections on one screen with a visual divider. Address first (single Places input that expands into tiles), emergency contact below.

**Copy (screen header):**
> **How do we reach you?**

**Section 1 — Home address:**
- Google Places Autocomplete input using `GOOGLE_PLACES_BROWSER_KEY` (restrict: `country: "us"`, `types: ["address"]`)
- On selection, expands into 4 read-only tiles: street, city, state, ZIP
- Below the tiles: small "Not quite? Edit manually" link reveals editable fields

**Section 2 — Emergency contact** (subheader: *"Who should we call in an emergency?"*):
- Contact name (`autocapitalize="words"`)
- Contact phone (same mask as 4.2)
- Relationship (select: Spouse, Parent, Sibling, Child, Friend, Other)

**Validation:** address fully populated AND all three emergency fields valid before Next enables.

---

### 4.4 Step 3: CDL (`/onboarding/cdl`)

Two sub-screens, one route. Sub-screen is driven by a URL search param: `?sub=photo` → `?sub=details`. The progress bar stays at **Step 3 of 5** across both.

**Sub-screen A — Photo (`?sub=photo`):**

> **Let's photograph your CDL.**
> Lay it flat in good light. Get all 4 corners in the frame.

- Primary: **Take photo** → triggers `<input type="file" accept="image/*" capture="environment">` (opens back camera on mobile)
- Secondary (text link): **Upload from files instead** (no `capture` attr)
- After capture: 4-corner crop UI (`react-easy-crop`). Auto-detect card edges via canvas, pre-position handles.
- Driver confirms crop → upload to R2 via signed PUT (`05-TECH-CONTRACTS.md` §10) → sub-screen advances to `?sub=details` AND kicks off async Claude OCR in the background. Does NOT wait for OCR.
- Fallback: PDF upload accepted, OCR skipped.

**Sub-screen B — Confirm details (`?sub=details`):**

Header banner:
- If OCR succeeded: *"We filled these in from your photo. Tap anything that's wrong."*
- If OCR failed or timed out (15s): *"Couldn't read your photo — enter the details below."*
- While OCR pending: inline *"Reading your photo..."* spinner next to the header

Fields (vertical stack):
1. CDL number — `autocapitalize="characters"`, min 5 chars
2. Class — segmented control: A / B / C (big buttons)
3. Issuing state — US state select, default to home-address state
4. Expiration date — must be in the future
5. DOB on card — only shown if OCR flagged a mismatch with the entered DOB

**Mismatch banner (yellow, non-blocking):** *"The date on your CDL doesn't match what you entered. Gary will need to confirm."* Flags the record for approval review but does not block submit.

**Form state:** both sub-screens share a single TanStack Form instance for Step 3. Photo upload writes its key + OCR result into that form state; the details sub-screen reads pre-filled values from the same form. The final Next (on the details sub-screen) is what advances to Step 4.

---

### 4.5 Step 4: Medical card (`/onboarding/medical`)

Same two-sub-screen pattern as Step 3. `?sub=photo` → `?sub=details`.

**Sub-screen A — Photo:**
> **Now your medical card.**
> Same deal — flat surface, good light, all 4 corners.

Same camera/crop/upload/OCR pipeline as CDL.

**Sub-screen B — Confirm expiration:**
> **When does your medical expire?**

Single field: expiration date (pre-filled by OCR when available).

**Hard block:** expired medical → *"Your medical card has expired. You'll need a new one before you can drive. Reach out to Gary."* Next is disabled.

---

### 4.6 Step 5: Review (`/onboarding/review`)

Single scrolling page. Each of the previous four steps is rendered as a card with an "Edit" link top-right that jumps back to that step.

**Cards:**
1. About you — name, DOB, phone
2. Contact — home address, emergency contact
3. CDL — thumbnail + all 5 fields
4. Medical card — thumbnail + expiration

**Primary button (sticky at the bottom):** "Submit for approval"

**Below the button, small text:**
> *Gary will review within 24 hours. We'll email you as soon as you're approved.*

Tapping Submit:
1. Sets `driver_profiles.onboardingState = "complete"`
2. Sets `driver_profiles.onboardingCompletedAt = now()`
3. Sets `users.status = "pending_approval"`
4. Fires the `driver_onboarding_submitted` notification to Gary
5. Redirects to `/onboarding/pending`

---

### 4.7 Pending (`/onboarding/pending`)

**Copy:**
> **You're all set.**
> Gary's reviewing your info. We'll email you the moment you're approved — usually within 24 hours.

**No primary button.** A small secondary link: "Sign out."

If Gary approves while this tab is open, poll every 30 seconds or use a live query that redirects the tab to `/dashboard` on approval.

---

## 5. Forms — patterns & rules

### 5.1 Field layout

- Label above the input, left-aligned, `text-sm font-medium`
- Input: 52px tall (touch-friendly), 16px base font-size (prevents iOS auto-zoom)
- Rounded-lg, 1px border, `stone-300` default → `primary` on focus
- Error state: border-danger + error message below in `text-sm text-danger`
- Helper text (optional): below the label, above the input, `text-sm text-muted`

**Do not use placeholder-as-label.** It disappears the moment the driver starts typing, and no one remembers what the field was for.

### 5.2 Keyboards (mobile)

| Field | `inputmode` / `type` |
|---|---|
| Phone | `type="tel"` |
| ZIP | `inputmode="numeric"` |
| Dates | `type="date"` |
| CDL number | `inputmode="text"` + `autocapitalize="characters"` |
| Name | `autocapitalize="words"` |
| Address search | `inputmode="text"` |

### 5.3 Autofill hints

Every field that could be autofilled gets the right `autocomplete` attribute. iOS + Android keyboard bars will suggest saved data and cut typing in half:

| Field | `autocomplete` |
|---|---|
| First name | `given-name` |
| Last name | `family-name` |
| DOB | `bday` |
| Phone | `tel-national` |
| Street | `street-address` |
| City | `address-level2` |
| State | `address-level1` |
| ZIP | `postal-code` |

### 5.4 Validation

- **On blur** for format checks (phone, ZIP, date range)
- **On submit** for required checks
- **Server-side always**, even after client validation — the Zod schema lives in `src/server/schemas/drivers.ts` and is imported by the client form via TanStack Form's `validators.onChange: zodValidator(schema)`
- Error messages: specific and actionable. "That doesn't look like a valid US phone number" not "Invalid."
- Never more than one error per field at a time. Fix-the-first-error is the mental model.

### 5.5 Submit button behavior

- Disabled until the screen's fields are valid
- On tap: shows spinner inside the button, disables the button, fires the save
- On success: advances to the next screen
- On network failure: button text changes to "Retry" with an explanatory line beneath: *"Couldn't save. Check your connection and try again."*

The button itself is the loading indicator. No full-screen spinner, no blocking overlay.

---

## 6. Camera + OCR

### 6.1 Camera UX

- Mobile: `<input type="file" accept="image/*" capture="environment">` — tapping it opens the back camera directly on iOS and Android, no permission prompt for Safari, a one-time prompt for Chrome.
- Desktop: drag-drop zone, or click to choose file. Accept image OR PDF.
- After capture: 4-corner adjustable crop using `react-easy-crop`. Auto-detect card edges using a simple canvas-based edge detection pass, pre-position the handles. Driver can drag corners if wrong.

### 6.2 Crop → upload → OCR pipeline

```
1. Driver confirms crop
2. Canvas exports a JPEG (quality 0.85, max 2000px longest edge)
3. Client calls requestUploadUrl(type: "driver_cdl", mimeType: "image/jpeg", size)
4. Client PUTs directly to R2
5. Client calls confirmDocumentUpload({ fileKey, type: "driver_cdl", driverProfileId })
6. Server inserts the documents row and returns
7. Client advances to the next screen IMMEDIATELY — does NOT wait for OCR
8. Server kicks off an async Claude call in the background
9. When OCR finishes (typically 2-4s), it patches driver_profiles with the extracted fields
10. The next screen (cdl-details) subscribes to that profile row and re-renders with pre-filled values when they arrive
```

**Timeout:** if OCR hasn't finished 15 seconds after the driver lands on `/onboarding/cdl-details`, the soft "Reading your photo..." banner disappears and the driver types manually. No blocking modal, no error.

### 6.3 Privacy + retention

Original image is stored in R2 as a `documents` row (type `driver_cdl`). Driver can see it in their `/documents` page after onboarding. Gary sees it during approval. Nobody else.

OCR results are stored as plain columns on `driver_profiles` — we do NOT cache the Claude response text beyond what we use.

---

## 7. Transitions & motion

**Forward navigation** (Next button tapped):
- Current screen slides left 100% of viewport width, opacity fade to 0
- Next screen slides in from the right at the same time
- Duration: 220ms, ease-out
- Uses `framer-motion` `AnimatePresence` with a route key

**Back navigation** (Back arrow tapped):
- Cross-fade, 160ms. No slide.
- We don't mirror the forward slide because it trains drivers to flick-swipe between screens, which they can't actually do.

**Reduced motion** (`@media (prefers-reduced-motion: reduce)`):
- All slides replaced with 120ms opacity fades
- No scale, no parallax, no staggered content

**Loading states inside a screen:**
- Skeleton blocks for content (like the Places suggestions)
- Button spinners for submits
- Inline `...` spinner for async OCR
- Never a full-screen spinner during onboarding — breaks the flow

**Micro-interactions:**
- Checkmark animation on the review screen cards when a section has a valid value (draws in over 300ms on first render, static thereafter)
- Haptic tick on mobile (`navigator.vibrate(10)`) when advancing to the next screen — iOS Safari silently ignores this; Android feels the nudge

---

## 8. Save-as-you-go

Every Next button hits a `saveOnboardingStep` server function:

```ts
saveOnboardingStep({
  step: "phone",                 // current onboardingState value
  data: { phone: "+15551234567" },
  nextStep: "address",           // where we're going
})
```

Server:
1. Validates `data` against the step's Zod schema
2. Merges into `driver_profiles`
3. Sets `onboardingState = nextStep`
4. Returns the updated profile

Client:
1. Optimistically advances to the next screen on Next tap
2. Rolls back (shows "Retry" on the button) if the save fails

**Resumption:** the onboarding layout's `beforeLoad` reads `driver_profiles.onboardingState` on every navigation. If the driver hits `/onboarding/phone` but the state says `cdl_photo`, they get redirected to `/onboarding/cdl-photo`. Hard link sharing doesn't let you skip steps.

---

## 9. Error states

| Type | Treatment |
|---|---|
| Field validation | Red border + error under field. Blocks submit. |
| Network failure on save | Button text → "Retry". Line beneath: "Couldn't save. Check your connection." |
| OCR timeout | Silent. Banner on next screen disappears; driver types manually. |
| Photo upload failure | Inline error above photo preview: "Upload failed. Try again or switch to file upload." |
| Invalid invite token (hitting onboarding without auth) | Redirect to `/login` with a flash: "Your invite has expired. Reach out to Gary." |
| Account suspended mid-flow | Redirect to `/login` with a flash. |

No modals. No toasts for errors during onboarding — they're interruptive and disappear before a driver can read them.

---

## 10. Accessibility

- Every input has a visible `<label>` (not `aria-label`-only)
- Focus states are visible on keyboard navigation — 2px `primary` ring, `ring-offset-2`
- Tab order matches visual order (no `tabindex` hacks)
- Error messages are tied to fields with `aria-describedby` and announced on blur via `aria-live="polite"`
- Color contrast: minimum AA for all body text, AAA for error text
- Touch targets ≥ 44×44 px (iOS HIG minimum)
- Dynamic text sizing respected — use `rem` units, never fix `px` on font-size
- Camera flow has an equal-priority "upload a PDF instead" path for drivers who can't or won't use the camera

---

## 11. Tech implementation notes

### 11.1 Routes

File-based routes under `src/routes/onboarding/`:

```
onboarding/
  route.tsx            # layout + beforeLoad (require auth + redirect to current step)
  welcome.tsx
  about.tsx            # Step 1: name, DOB, phone
  contact.tsx          # Step 2: home + emergency contact
  cdl.tsx              # Step 3: sub-screens via ?sub=photo | details
  medical.tsx          # Step 4: sub-screens via ?sub=photo | details
  review.tsx           # Step 5
  pending.tsx          # Post-submit
```

### 11.2 Shared components

- `<OnboardingShell>` — logo top-left, progress bar, scroll area, sticky bottom action bar
- `<OnboardingProgress>` — 5-segment bar, animates between positions
- `<OnboardingFooter>` — sticky bottom row: Next button + dev-only Skip (see §15)
- `<OnboardingField>` — label + input + error + helper wrapper
- `<PrimaryButton>` — bottom-anchored CTA with loading and retry states
- `<PhotoCapture>` — camera → crop → upload component shared by CDL + medical
- `<PlacesAutocomplete>` — Google Places widget wrapper

### 11.3 Form library

TanStack Form with Zod resolvers per `05-TECH-CONTRACTS.md` §8. One schema per parent step:

```ts
// src/server/schemas/onboarding.ts
export const OnboardingAboutSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dob: z.coerce.date().refine(isAtLeast18, "You must be at least 18"),
  phone: PhoneE164Schema,
});

export const OnboardingContactSchema = z.object({
  address: AddressSchema,
  emergency: z.object({
    name: z.string().min(1).max(200),
    phone: PhoneE164Schema,
    relation: z.enum(["spouse", "parent", "sibling", "child", "friend", "other"]),
  }),
});

export const OnboardingCdlSchema = z.object({
  photoDocumentId: z.string().uuid(),
  cdlNumber: z.string().min(5).max(50),
  cdlClass: z.enum(["A", "B", "C"]),
  cdlState: UsStateSchema,
  cdlExpiration: z.coerce.date().refine((d) => d > new Date(), "Expiration must be in the future"),
  cdlDobMismatch: z.boolean().optional(),
});

export const OnboardingMedicalSchema = z.object({
  photoDocumentId: z.string().uuid(),
  medicalExpiration: z.coerce.date().refine((d) => d > new Date(), "Medical card has expired"),
});
```

### 11.4 Progress bar

5 equal segments at the top of the shell, just under the logo. Fill progresses one segment at a time as each parent step completes. Sub-screens within a step do NOT move the bar. Animates with `transition-[width] duration-300 ease-out`.

### 11.5 State sync

Source of truth is `driver_profiles.onboardingState` + the profile columns. Each step owns one TanStack Form instance for the whole step (shared across sub-screens in CDL + medical). Save fires on each parent-step Next; sub-screen transitions are client-only until the final sub-screen commits.

---

## 12. Copy voice

Rules for every piece of text:

- **Second person, casual.** "What's your legal name?" not "Enter your legal name."
- **Contractions are fine.** "We'll" not "We will."
- **No exclamation points.** Driver isn't a toddler.
- **No jokes, no puns, no emoji in copy.** This is a professional tool.
- **Never "please."** It reads servile. "Take a photo of your CDL" not "Please take a photo."
- **No corporate words.** "Submit" is fine; "finalize" is not. "Your info" not "your information." "Done" not "complete."
- **Error messages are specific.** "That doesn't look like a valid US phone number" not "Invalid input."

A quick voice test: if Gary wouldn't say it out loud to a new driver, don't put it on the screen.

---

## 13. Definition of done

An onboarding screen is not shippable until:

- [ ] Works on iOS Safari (iPhone SE viewport minimum)
- [ ] Works on Android Chrome (360px width minimum)
- [ ] Works on desktop Chrome/Firefox/Safari
- [ ] Dark + light mode both tested
- [ ] Reduced-motion mode tested
- [ ] Keyboard navigation works (desktop)
- [ ] VoiceOver walk-through makes sense (at least one screen reader pass per ship)
- [ ] Server function has a Zod schema and is audit-logged
- [ ] `onboardingState` advances correctly; refresh lands you on the right screen
- [ ] Back button is visually consistent
- [ ] Network-failure path tested (devtools offline)
- [ ] Copy is final (no "TODO", no Lorem Ipsum)
- [ ] Analytics event fires (`onboarding.step_completed`, step name as prop) — used for drop-off tracking

---

## 15. Dev skip button

Every step screen renders a **Skip** link in the footer next to the Next button, **only when `import.meta.env.DEV === true`**. Tapping it:

1. Fills the step's form with realistic fake data (`first_name = "Test"`, `phone = "+15555550123"`, stock address, etc.)
2. Advances to the next parent step
3. Logs `[DEV] skipped step: about` to the console

For the CDL and medical photo sub-screens, Skip also sets a placeholder `photoDocumentId` so the review screen renders without a real upload.

Gated by `import.meta.env.DEV` so Vite tree-shakes it out of the production bundle. Never ships to drivers.

---

## 14. Open questions

Need Gary's call on these before we finalize:

1. **Minimum driver age.** Spec says 18; Gary may require 21 for interstate.
2. **MVR + drug test uploads during onboarding?** Currently deferred to post-approval per `02-DATA-MODEL.md` document types. Confirm this is OK — some fleets require them upfront.
3. **Can a driver skip the emergency contact step?** Spec treats it as required. Gary may want it optional.
4. **Pay info on onboarding?** Right now Gary sets pay model + rate on the driver profile himself, post-approval. Confirm drivers don't need to see or agree to pay terms in onboarding.
5. **SSN or tax info (W-9 / 1099 context)?** Not in Phase 1 scope but worth confirming with Gary that we don't need to collect it during onboarding.
