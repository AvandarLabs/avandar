# 035 — Plan step materialization

- **Slug**: `chat-plan-step-materialization`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-035/chat-plan-step-materialization`
- **Depends on**: `033-chat-plan-propose`.
- **Estimated PR size**: small — Dexie DB + cleanup helpers, ~300 lines.

## Notes for future you

- **No OPFS.** The spec is explicit: persist step results in Dexie keyed by `(planId, stepId)`. Don't introduce OPFS during this migration.
- Cleanup is explicit: every `Close` / replace-plan / new `proposePlan` clears the table for that planId. There is no garbage-collection sweep.

## What this feature is

Each step's result (rows / parquet blob) is persisted in `planStepStorage.ts` (Dexie), keyed by `(planId, stepId)`. Lifecycle: written on step success, read on canvas re-render, cleared on plan replace / Close / new `proposePlan`. No OPFS, no Supabase storage.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-step-materialization`.

1. Confirm #033 has merged.
2. Create the refactor branch.
3. Copy the Dexie store + cleanup helpers.
4. Wire `planExecutor` (from #033) to persist on success and `PlanStateManager` to call cleanup on lifecycle events.

### Files to copy verbatim

```
src/components/ChatPanel/plan/planStepStorage.ts
src/components/ChatPanel/plan/planStepStorage.test.ts
```

### Files to surgically edit on `develop`

- `planExecutor` — call `planStepStorage.write` on success.
- `PlanStateManager` — call `planStepStorage.clearByPlanId` on lifecycle events.

## Verification

### Automated

```sh
pnpm vitest run src/components/ChatPanel/plan/planStepStorage
```

### Manual

1. Trigger a plan, let it run.
2. Refresh the page. Confirm step results re-render from Dexie.
3. Close the plan. Inspect Dexie — confirm the planId's rows are gone.

## How to mark this feature completed

Standard ritual.
