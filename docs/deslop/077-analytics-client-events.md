# 077 — Analytics client events

- **Slug**: `analytics-client-events`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-077/analytics-client-events`
- **Depends on**: `none` directly. Phase 1 added the `usage_analytics_events` schema; this row authors the TS client and wires call sites. **Relocated to Section 0** of `ALL_FEATURES.md` on 2026-06-10 as a cross-cutting prerequisite.
- **Required by**: `#001 async-dataset-import-pipeline` (confirmed 2026-06-10 — `useSaveDataset` imports from `@/lib/analytics/analyticsClient`). Likely required by any feature that emits one of the seven wired event types — surface during each consumer's undrift.
- **Estimated PR size**: medium — 1 client + 7 call-site edits, ~400 lines.

## Notes for future you

- **2026-06-10 — promoted to Section 0 (cross-cutting prerequisite).** The abandoned `/deslop migrate async-dataset-import-pipeline` attempt confirmed that `useSaveDataset.ts` imports from `@/lib/analytics/analyticsClient`, which does not exist on develop. Walk order in `ALL_FEATURES.md` is now: #078 (done) → #083 (in flight) → #061 → **#077 (this row)** → #094 → Section A onwards.
- **Wiring strategy.** Of the seven wired call sites, several live in feature surfaces that haven't migrated yet (dashboard publish/filter/pdf-export, chat message sent / sql generated). Two strategies are possible: (a) land the client + types now and add the call-site wires opportunistically when the consuming feature migrates; (b) wait until all consumers exist on develop and land the client + wires together. **Default to (a)** — ship `analyticsClient.ts` + `analyticsEventTypes.ts` + the call sites that already exist on develop's current code. Each subsequent feature row that brings in a new call site can opportunistically add its own `analyticsClient.write(...)` line during port; it costs one line and removes a follow-up PR.
- `analyticsEventTypes` is a typed allowlist — adding a new event requires updating the type. Don't accept arbitrary strings.
- Wired call sites on `feat/ict4d-demo`: `dataset.imported`, `dashboard.published`, `chat.message_sent`, `chat.sql_generated`, `dashboard.block_added_via_chat`, `dashboard.filter_changed`, `dashboard.pdf_export_opened`. Each lives in the corresponding feature's surface (mostly already authored — wire at the right call site).

## What this feature is

`src/lib/analytics/analyticsClient.ts` writes events to the `usage_analytics_events` Supabase table. `analyticsEventTypes` is a typed allowlist. Seven call sites in the app emit events at the right moments.

## Steps to migrate

**Step 0** — `/deslop undrift analytics-client-events`.

1. Confirm Phase 1 set up the table. If not, surface.
2. Copy the analytics client.
3. Wire the 7 call sites.

### Files to copy verbatim

```
src/lib/analytics/analyticsClient.ts
src/lib/analytics/analyticsEventTypes.ts
```

### Files to surgically edit on `develop`

- 7 specific call sites — search the source branch for `analyticsClient.write(` to find them.

## How to mark this feature completed

Standard ritual.
