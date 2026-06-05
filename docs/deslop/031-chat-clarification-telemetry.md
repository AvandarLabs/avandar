# 031 — Clarification telemetry

- **Slug**: `chat-clarification-telemetry`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-031/chat-clarification-telemetry`
- **Depends on**: `026-privacy-audit-log-page` (this row adds a tab to that page), `030-chat-clarification-card-and-bias-check` (sources the events).
- **Estimated PR size**: small — Dexie DB + recorder + sub-tab UI, ~300 lines.

## Notes for future you

- Separate Dexie DB (`AvandarClarificationAuditDB`) from the consent audit DB (#026). Don't share schemas — the two logs answer different questions.
- Metadata-only: no question/answer text bodies — only which variant fired, how long it took, what the user picked.

## What this feature is

A Dexie-backed telemetry log of clarification events. `recordShown(event)` fires when a `ClarificationCard` mounts; `recordOutcome(event, outcome)` fires when the user answers or dismisses. A "Clarifications" sub-tab in the Privacy log page (#026) renders the log.

## Steps to migrate

**Step 0** — `/deslop undrift chat-clarification-telemetry`.

1. Confirm #026 + #030 have merged.
2. Create the refactor branch.
3. Copy the DB + recorder + sub-tab UI.

### Files to copy verbatim

```
src/lib/privacy/audit/AvandarClarificationAuditDB.ts
src/lib/privacy/audit/clarificationRecorder.ts
src/views/PrivacyLogView/ClarificationsTab.tsx
```

### Files to surgically edit on `develop`

- `ClarificationCard` — call `recordShown` / `recordOutcome`.
- `PrivacyLogView` — register the Clarifications sub-tab.

## Verification

### Automated

```sh
pnpm vitest run src/lib/privacy/audit
```

### Manual

Trigger 2–3 clarifications. Navigate to Privacy log → Clarifications. Confirm entries appear with metadata only.

## How to mark this feature completed

Standard ritual.
