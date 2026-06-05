# 028 — Privacy: isRowDataMessage helper

- **Slug**: `privacy-isrowdatamessage-helper`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-028/privacy-isrowdatamessage-helper`
- **Depends on**: `025-privacy-crossboundary-hmac` (this helper is called server-side inside `crossBoundary`).
- **Estimated PR size**: tiny — 1 file + tests, ~150 lines.

## Notes for future you

- This helper is **server-side** (Supabase edge function). It detects messages that are shaped like raw row data (arrays of objects with consistent keys) so phase 2+ can enforce values-scope rules on them.
- Pure function. No IO. Easy to test.

## What this feature is

`isRowDataMessage(messageBody): boolean` — a heuristic that classifies a chat message body as containing tabular row data (e.g. an array of objects with consistent shape). Used downstream by phase 2+ (discovery clarifications, #032) to apply values-scope enforcement.

## Steps to migrate

**Step 0** — `/deslop undrift privacy-isrowdatamessage-helper`.

1. Confirm #025 has merged.
2. Create the refactor branch.
3. Copy the helper + tests verbatim.
4. Run verification.

### Files to copy verbatim

```
supabase/functions/_shared/privacy/isRowDataMessage.ts
supabase/functions/_shared/privacy/isRowDataMessage.test.ts
```

### Files to surgically edit on `develop`

None — leaf helper.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run supabase/functions/_shared/privacy
```

### Manual

No UI surface yet.

## Risks + things to look out for

- **Heuristic over-classification.** A long array of strings isn't row data; an array of `{k: v}` with one key isn't tabular either. Tests should cover the edge cases — preserve them.

## How to mark this feature completed

Standard ritual.
