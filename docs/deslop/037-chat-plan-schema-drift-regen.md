# 037 — Phase 4: schema drift + regen

- **Slug**: `chat-plan-schema-drift-regen`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-037/chat-plan-schema-drift-regen`
- **Depends on**: `033-chat-plan-propose`.
- **Estimated PR size**: medium — ~6 files, +600 lines.

## Notes for future you

- `isSchemaDrift` is a **strict** comparator — any column rename / type change / removal counts. Don't loosen it.
- `findAffectedDownstream` is a BFS over the plan DAG to find every step whose dependencies need rerun.
- The regen loop caps at **2 attempts per step** to prevent runaway model spend.

## What this feature is

When upstream data shifts (column removed/renamed/retyped), the plan canvas detects drift via `isSchemaDrift` (strict). `findAffectedDownstream` walks the DAG to find every step needing rerun. The backend endpoint `POST /chat/:workspaceId/regenerate-plan` forces a `regenerateSteps` tool call. The frontend regen loop attempts each affected step up to 2 times before surfacing failure.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-schema-drift-regen`.

1. Confirm #033 has merged.
2. Create the refactor branch.
3. Copy the drift detector + DAG BFS + regen endpoint + client regen loop.

### Files to copy verbatim

```
src/components/ChatPanel/plan/isSchemaDrift.ts
src/components/ChatPanel/plan/findAffectedDownstream.ts
src/components/ChatPanel/plan/regenLoop.ts
supabase/functions/chat/regeneratePlan.ts (or co-located handler)
```

### Files to surgically edit on `develop`

- The chat edge function router — wire the regen endpoint.
- `PlanStateManager` — trigger regen loop on drift detection.

## Verification

### Automated + manual: standard. The drift case is hard to QA without a multi-day data refresh; simulate by mutating a column name in DuckDB between two `proposePlan` cycles.

## How to mark this feature completed

Standard ritual.
