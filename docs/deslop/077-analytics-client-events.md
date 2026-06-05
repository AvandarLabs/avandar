# 077 — Analytics client events

- **Slug**: `analytics-client-events`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-077/analytics-client-events`
- **Depends on**: `none` directly. Phase 1 added the `usage_analytics_events` schema; this row authors the TS client and wires call sites.
- **Estimated PR size**: medium — 1 client + 7 call-site edits, ~400 lines.

## Notes for future you

- `analyticsEventTypes` is a typed allowlist — adding a new event requires updating the type. Don't accept arbitrary strings.
- Wired call sites: `dataset.imported`, `dashboard.published`, `chat.message_sent`, `chat.sql_generated`, `dashboard.block_added_via_chat`, `dashboard.filter_changed`, `dashboard.pdf_export_opened`. Each lives in the corresponding feature's surface (mostly already authored — wire at the right call site).

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
