# 07 — Integrations & Revenue Strategy

> How ProTouch Logistics turns third-party APIs into dispatcher time saved and
> dollars earned for Gary. Companion doc to the Integrations page at
> `/admin/settings/integrations`.

---

## 1. Why integrations are the product

ProTouch without integrations is a nice-looking TMS. ProTouch **with**
integrations is the dispatcher's AI co-pilot. Every feature that makes Gary
real money — better loads, fewer empty miles, faster pay, lower fuel cost —
depends on pulling live data from someone else's system.

The strategy is:

1. **Own the UI + the logic.** We build the dispatcher's workbench, the
   chat assistant, and the decision rules.
2. **Borrow the data.** We never try to replace DAT's board or Samsara's
   ELD. We ride on top of them.
3. **Keep Gary's keys on Gary's side.** OAuth tokens live server-side and
   are scoped to his org. He clicks "Connect QuickBooks" once; everything
   else is automatic.

---

## 2. Architecture — how a connection works

Every integration follows the same pattern:

```
 ┌───────────────┐    OAuth/API key   ┌─────────────────────┐
 │  Gary (UI)    ├───────────────────►│  ProTouch backend   │
 │ Connect btn   │    once, then      │  (Vercel/Go/etc.)   │
 └───────────────┘    refreshes auto  └──────────┬──────────┘
                                                 │ server-to-server
                                                 │ using Gary's token
                                                 ▼
                                   ┌─────────────────────────────┐
                                   │  Third-party API            │
                                   │  (DAT / QuickBooks / ...)   │
                                   └─────────────────────────────┘
```

Key properties:

- **Credentials never touch the browser.** Gary's access token is stored
  server-side, encrypted at rest, and only used when a request needs it.
- **Webhooks come in, cached reads go out.** Where providers support
  webhooks (Samsara, QuickBooks) we subscribe and push into our DB. For
  the rest (DAT), we poll on a schedule and cache.
- **One toggle per integration.** The Integrations page is the one place
  Gary sees what's connected and the one place he can revoke.
- **Tool calls, not prompt stuffing.** When the AI assistant needs data,
  it calls a registered tool (`get_loads`, `get_driver_hos`) that hits
  the cache/live API. Model never sees raw tokens.

---

## 3. DAT Freight & Analytics — the load board

### Why it matters

DAT is the #1 US freight load board. Carriers use it to find loads;
brokers post there first. It also owns **RateView** — decades of paid-lane
history across ~400K trucks. That's the dataset that makes "market rate
is $2.85/mi" a real number instead of a guess.

### Why it's expensive

50-year network-effect moat. Nobody else has their dataset at that depth.
Their API spend funds infrastructure + subsidizes free broker posting.

### Pricing tiers (ballpark, check with DAT)

| Tier               | ~Cost      | What you get                                       |
|--------------------|------------|----------------------------------------------------|
| DAT One Essential  | ~$45/mo    | Basic board, limited lanes                         |
| DAT One Select     | ~$195/mo   | Full board access                                  |
| DAT One Pro        | ~$495+/mo  | Adds RateView analytics                            |
| **DAT API**        | ~$300–500+/mo | Programmatic access — **this is what we need** |

API access is negotiated, not self-serve. Volume-based overages apply.

### What we pull

- `GET /loads/search` — origin, dest, radius, equipment, weight filters
- `GET /loads/{id}` — full details + broker contact
- `GET /rates/lane` — market rate for a lane (RateView, premium tier)
- `POST /loads/{id}/book-it-now` — one-click booking on certain loads

### What it powers in ProTouch

- **Backhaul suggestions** — scan for loads within N mi of delivery city
- **Rate coaching** — "market is $2.85/mi, broker offered $2.60, counter $2.75"
- **Auto-book shortlist** — Gary's lane preferences pinned; new matches ping him

---

## 4. QuickBooks — the easy one

### Why it matters

Every delivered load should become an invoice. Every paid invoice should
show up as A/R in the dashboard. QuickBooks is the accounting system 80%
of small carriers already use.

### Why it's cheap

Intuit's Developer API is **free**. OAuth 2.0, no per-call fees. Gary
already pays his QBO sub ($35–$235/mo); we ride on top.

### What we pull

- `GET /invoices` — open + paid invoices, aging data
- `GET /customers` — broker list with balances
- `GET /payments` — payment history per broker
- `GET /accounts` — chart of accounts for categorization

### What we push

- `POST /invoice` — auto-create invoice from delivered load, with line
  items (linehaul, fuel surcharge, detention, lumper) + rate con PDF
  attached
- `POST /invoice/send` — email it to the broker
- `POST /payment` — record a payment received

### What it powers in ProTouch

- **Auto-invoicing on delivery** — saves ~1 bookkeeping hour/day
- **Broker aging on dashboard** — who's overdue, how overdue, how much
- **Collections agent** — AI drafts follow-up emails for overdue invoices
- **Factoring decision** — compare "factor now" vs "hold for full" per invoice

### Alternatives

- **Xero** — same free OAuth model, stronger outside the US
- **Axon / Trucking Office / RigBooks** — trucking-specific, smaller APIs

---

## 5. ELD / Telematics — the data spine

### Why this is the single biggest unlock

Every other AI feature improves dramatically with ELD data. Without it,
the app is guessing where trucks are and how much driving time a driver
has left. With it, the app knows everything — continuously.

### Cost to Gary

**$0 extra.** Gary already pays $30–40/truck/month for his ELD; the API
is included with his subscription.

### Top 3 providers

| Provider  | Share        | API             | Notes                              |
|-----------|--------------|-----------------|------------------------------------|
| **Samsara** | #1           | REST + webhooks | Default pick, best docs, OAuth     |
| **Motive**  | #2           | REST + webhooks | Formerly KeepTruckin, good API     |
| **Geotab**  | Enterprise   | SDK-based       | More complex, most granular data   |

### What the ELD already knows

- Truck GPS position + heading + speed (every 1–5 min)
- Engine on/off, idle minutes
- Driver HOS state: driving / on-duty / sleeper / off-duty + time remaining
- Fuel level + odometer
- Diagnostic codes (check-engine events)
- Harsh-brake, speeding, hard-turn events

### What we pull (Samsara example)

- `GET /fleet/vehicles/locations` — live positions
- `GET /fleet/drivers/hos` — HOS state + remaining clocks
- `GET /fleet/vehicles/stats` — fuel, odometer, idle
- Webhooks: `vehicle.speeding`, `driver.hos_violation_imminent`,
  `vehicle.arrived_at_geofence`, `vehicle.engine_fault`

### Features this unlocks in ProTouch

Each of these moves from stubbed fixtures → real behavior the moment the
ELD is connected:

1. **Live Tracking page** — real truck pins, not fixtures
2. **HOS-aware assignment** — never offer Gary a load a driver can't
   legally finish
3. **Auto detention capture** — geofence the shipper; when ELD confirms
   arrival + 2hr elapses, assistant drafts the detention invoice with
   timestamps and photo evidence
4. **Real driver ETAs** — refresh as the truck moves
5. **Fuel & idle report** — per-driver idle cost, coachable
6. **Safety scoring** — roll harsh events into a score; lower scores cut
   insurance premiums 5–15%
7. **Proactive maintenance** — odometer from ELD triggers PM due
8. **Chat context** — "Where's Mike?" → "Mike's on I-40 near Little Rock,
   2h 15m drive time left, Memphis ETA 8:42 PM."

### Integration from Gary's POV

Settings → Integrations → Samsara → Connect → OAuth with his Samsara
creds → done. Trucks populate in seconds. ~30 seconds to set up,
permanent uplift.

---

## 6. Full catalog

### Load boards

| Service    | Cost         | What it does                                   |
|------------|--------------|------------------------------------------------|
| **DAT**       | ~$195+/mo + API fee | Primary load board + market rate data |
| **Truckstop** | ~$149+/mo           | #2 board, cheaper entry                |
| 123Loadboard  | Low-cost            | Budget option, weak for flatbed/reefer |

### Accounting

| Service | Cost | What it does |
|---|---|---|
| **QuickBooks**  | Free API (QBO sub separate) | Invoices, A/R, payments |
| **Xero**        | Free API                     | Alt accounting, stronger outside US |
| Axon            | Paid, trucking-specific     | TMS + accounting bundle |

### Telematics / ELD

| Service | Cost | What it does |
|---|---|---|
| **Samsara** | Included with ELD | Live positions, HOS, fuel, diagnostics |
| **Motive** | Included with ELD  | Same as Samsara, smaller network |
| **Geotab** | Enterprise         | Most granular data, SDK-based integration |

### Fuel cards

| Service | Cost | What it does |
|---|---|---|
| **Comdata**  | Free with card | Real-time transactions + discount routing |
| **EFS**      | Free with card | Broad truckstop coverage |
| **Mudflap**  | Free           | Modern card, better per-gallon rates |
| **AtoB**     | Free           | No-fee fuel card for small fleets |

### Carrier data

| Service | Cost | What it does |
|---|---|---|
| **FMCSA SAFER** | Free (public)  | Broker MC lookup, safety ratings, inspection history |
| **Ansonia**     | $100–300/mo    | Broker creditworthiness — refuse slow-payers |
| RMIS            | Similar        | Alt broker credit data |

### Mapping / Routing / Weather

| Service | Cost | What it does |
|---|---|---|
| **HERE Maps** | Pay-as-you-go | Truck-specific routing (bridge heights, weight) |
| **Mapbox**    | Pay-as-you-go | Custom map visuals, driving/truck profile |
| **NOAA**      | Free          | Weather alerts on active routes |

### Compliance / Safety (future)

- **JJ Keller API** — DVIR, DQ files, drug & alcohol consortium
- **Zonar / Lytx** — dashcam + driver safety scoring
- **HighwayVAB / MyCarrierPackets** — auto-fill broker setup packets

---

## 7. Bundle #1 — "Earn more per mile"

**Components:** DAT + Samsara (ELD) + fuel card (Comdata/Mudflap/AtoB)

**Flow in chat:**

1. Truck 402 delivers in Dallas at 3 PM. Samsara confirms empty, HOS
   shows 6 hrs drive time left.
2. Assistant hits DAT API for loads within 100 mi of Dallas, pickup in
   the next 24 h, van trailer, ≥44K lbs.
3. For each candidate, assistant computes net $/mile = (rate − deadhead
   fuel − tolls − detention risk) / total miles. RateView tells us
   whether $2.60 is above or below market on that lane.
4. Gary sees 3 ranked cards in the chat:
   - **$3,100 Dallas → Memphis**, net $2.38/mi, 94% of market — **Book**
   - **$2,800 Dallas → Little Rock**, net $2.05/mi — **Counter at $2.95**
   - **Skip #3**
5. One tap books. Fuel optimizer overlays 2 discounted stops along the
   route and pushes them to the driver's phone.

**Unit economics — 5-truck fleet, 10K mi/truck/mo:**

- Deadhead 18% → 12% = +3,000 loaded mi/mo × $0.80 marginal = **+$2,400/mo**
- Fuel savings $0.25/gal × 100 gal/day × 5 trucks × 22 days = **+$2,750/mo**
- **Combined ≈ $5,000/mo** from this bundle alone

At 5 trucks: **$60K/yr**. At 15 trucks: **$180K/yr**.

---

## 8. Bundle #2 — "Don't lose money you already earned"

**Components:** QuickBooks + FMCSA SAFER + Ansonia + Samsara (geofence)

**What it does:**

- **Detention capture** — Samsara geofences the shipper. When the truck
  sits past the 2-hr free window, assistant auto-drafts a detention
  invoice with timestamps + photo proof. Most small carriers leave this
  on the table; capturing it is $75–125/hr × dozens of loads/mo.
- **Broker credit vetting** — before Gary books, assistant checks FMCSA
  (DOT safety) + Ansonia (credit score). Refuses risky brokers. Prevents
  non-payment, which is how small fleets die.
- **Collections agent** — QuickBooks A/R aging feeds a daily list. For
  each overdue invoice, assistant drafts a polite follow-up email with
  the invoice attached. Gary approves and sends.
- **Factoring picker** — if Gary factors, assistant compares factor
  rates across his providers and recommends factor-vs-hold per invoice.

**Unit economics:**

- Detention capture: conservatively 4 hrs/week × $100/hr × 5 trucks =
  **+$8K/mo**
- Broker vetting: one bad debt avoided per quarter = **+$3–10K**
- Faster collections: shrink A/R aging from 45d to 30d on $50K A/R =
  freed cash flow

---

## 9. Every way this makes Gary more money

Ranked by highest ROI for a small carrier:

1. **Deadhead backhauls** (DAT + ELD) — every empty mile costs
   $1.50–2/mi. 10–15% deadhead reduction is realistic.
2. **Detention capture** (ELD geofence + QuickBooks) — free money most
   carriers leave on the table.
3. **Broker credit vetting** (FMCSA + Ansonia) — prevents the bad debt
   that kills small fleets.
4. **Fuel stop routing** (fuel card API + mapping) — $0.20–0.40/gal × 100
   gal/day per truck.
5. **Factoring picker** (QuickBooks + factor API) — optimize cash vs
   margin per invoice.
6. **Direct-shipper candidates** (QuickBooks + DAT history) — after
   3–6 months, surface shippers Gary hauled for via brokers 5+ times and
   draft outreach to cut the middleman. How carriers grow $500K → $2M.
7. **Driver retention coach** (ELD HOS + home time) — flag burnout
   trends before drivers give notice. Replacement cost is $5–10K.
8. **Rate negotiation coach** (DAT RateView) — "market is $2.85, counter
   at $2.70."
9. **Auto-invoicing on delivery** (QuickBooks) — saves ~1 hr/day of
   bookkeeping.
10. **Safety score insurance discount** (ELD harsh events) — clean score
    cuts premiums 5–15%.
11. **Proactive maintenance** (ELD odometer) — catches PM before a
    breakdown strands a driver.
12. **Driver-to-load matching** (ELD HOS + DAT) — never assign a load a
    driver can't legally complete.
13. **Seasonality heads-up** (DAT RateView history) — "Produce season
    starts in 3 weeks, rates out of Salinas are up 18% YoY."
14. **IFTA / fuel tax automation** (ELD miles by state + fuel card by
    state) — auto-assembles quarterly filings.
15. **Onboarding AI assist** (for new drivers) — guides them through the
    5-step flow, answers questions, saves Gary review time.

---

## 10. Priority / roadmap

**Phase 1 — demo on fixtures (now, already shipped in UI):**

- Integrations page with all ~16 services listed
- Toggle states are local only
- Connection flow is simulated

**Phase 2 — first real connection (one week):**

- Pick **FMCSA SAFER** first (free, public, no auth) → broker lookup
  works end-to-end. Proves the plumbing.
- Add **QuickBooks** OAuth + invoice push → auto-invoicing live.

**Phase 3 — the data spine (two weeks):**

- **Samsara** OAuth + webhooks → Live Tracking page becomes real, HOS
  appears on driver pages, detention timers start firing.
- Every other feature's quality improves.

**Phase 4 — revenue side (three weeks):**

- **DAT** API contract + backhaul suggestions in chat
- Fuel card of choice (start with Mudflap or AtoB for ease)

**Phase 5 — polish:**

- **Ansonia** for broker credit
- **HERE** or **Mapbox** for truck routing on Live Tracking
- **NOAA** for weather overlays

---

## 11. Open questions

- **DAT API**: do we negotiate directly, or partner through a reseller?
- **ELD choice**: Samsara vs Motive depends on what Gary already uses.
  If he hasn't chosen, Samsara wins on API quality.
- **Factoring**: does Gary currently factor? If yes, which provider?
  Determines how deep the factoring picker goes.
- **QuickBooks online vs desktop**: QBO has a free modern API; Desktop
  requires a middleware (Intuit Web Connector). Confirm which Gary uses.

---

## 12. See also

- `/admin/settings/integrations` — the UI
- `src/lib/fixtures/integrations.ts` — the catalog data model
- `src/routes/admin/settings/integrations.tsx` — the page
- `04-CREATIVE-FEATURES.md` — AI assistant chat widget (where most of
  these integrations surface their value)
