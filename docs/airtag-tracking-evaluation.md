# AirTag Tracking Evaluation

**Question:** Can we track drivers using AirTags?

**Short answer:** No, not in any way that works for what Gary needs. AirTags are the wrong tool for fleet tracking.

---

## Why AirTags don't work for this

1. **No API.** Apple doesn't expose AirTag location data to third-party apps. The only way to see an AirTag is inside Apple's Find My app on an Apple device. You cannot pipe that into the `/admin/tracking` page. This alone kills it.

2. **Not real-time.** AirTags don't have GPS or a cell radio. They piggyback on nearby iPhones in Apple's Find My network. On a highway with sparse traffic, updates can be 30+ minutes apart. On rural interstates at 2am, you might get nothing for hours. The spec calls for 20-second refresh — AirTags can't deliver that even in theory.

3. **Anti-stalking alerts will fire.** iOS and Android both detect "unknown AirTag traveling with you" and notify the person. Drivers will get a phone alert saying they're being tracked within hours. Even with consent, this creates a terrible UX and legal ambiguity.

4. **No speed, heading, or accuracy data.** The `driver_locations` schema has `headingDegrees`, `speedMps`, `accuracyMeters`. AirTags report none of that.

5. **Tied to one iCloud account.** Whoever's Apple ID the AirTag is registered to is the only one who sees it. No multi-user dashboard, no role-based access, no audit log.

---

## What's already planned is the right answer

The spec uses **browser geolocation on the driver's phone** — `navigator.geolocation.watchPosition()` running in the driver-facing web app, posting to the `postLocation` server function every 45 seconds. That gives:

- Real GPS (meters, not "somewhere on this highway")
- Speed + heading + accuracy for free
- Works on any phone the driver already has
- Driver explicitly grants permission — no stalking alerts
- Full control over cadence, retention, and who sees what

**Cost:** $0 per driver. AirTags are $29 each plus Apple ecosystem lock-in, and they still don't solve the problem.

---

## Hardware alternative (Phase 2+)

The real alternative to phone-based tracking is a **dedicated telematics unit**:

- Samsara
- Geotab
- Motive (formerly KeepTruckin)
- Cheaper OBD-II dongles

These have their own cell radio, report every few seconds, and expose an API that can be pulled into the dashboard. For 5 drivers at launch, the phone-based approach is sufficient and already in the plan.

---

## Recommendation

Stick with the browser geolocation flow in `03-ROUTES-AND-FEATURES.md` §2.5. Do not spend time evaluating AirTags further.

## Comparison table

| Capability | AirTag | Phone geolocation (planned) | Telematics unit (Phase 2+) |
|---|---|---|---|
| Third-party API access | No | Yes (own app) | Yes |
| Update frequency | Minutes to hours | 45s / 200m | 5-30s |
| GPS accuracy | N/A (BLE crowdsourced) | ~5-20m | ~2-5m |
| Speed / heading | No | Yes | Yes |
| Anti-stalking alerts | Yes (blocker) | No | No |
| Works with existing hardware | No | Yes (driver's phone) | No (requires install) |
| Cost per driver | $29 + iCloud dependency | $0 | $20-50/mo subscription |
| Multi-user dashboard | No | Yes | Yes |
