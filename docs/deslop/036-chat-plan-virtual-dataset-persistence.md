# 036 — Plan virtual-dataset persistence

- **Slug**: `chat-plan-virtual-dataset-persistence`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-036/chat-plan-virtual-dataset-persistence`
- **Depends on**: `033-chat-plan-propose`, `035-chat-plan-step-materialization`.
- **Estimated PR size**: medium — schema column + rehydrate + cache integration, ~400 lines.

## Notes for future you

- Phase 1 should have added a `plan_steps` JSONB column on the virtual-datasets table. If it didn't, **stop and flag to operator** — that's a Phase 1 gap.
- Rehydrate path is what row #003's `SavedDatasetsView` calls when opening a virtual dataset with an embedded plan. Confirm the contract matches.

## What this feature is

Save-as-virtual-dataset persists the full plan (steps, definitions, SQL/Python, parquet blob refs) in a new `plan_steps` JSONB column on the virtual-datasets table. Reopening the virtual dataset rehydrates the plan and re-registers cached parquet blobs via `rehydratePlan` + `loadParquet`.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-virtual-dataset-persistence`.

1. Confirm #033 + #035 have merged. Confirm Phase 1 added the `plan_steps` column.
2. Create the refactor branch.
3. Author the `VirtualDatasetClient` extension (`updatePlan`, `getPlan`), `rehydratePlan`, `loadParquet`.
4. Wire row #003's `SavedDatasetsView` rehydrate path to call into this.

### Files to copy verbatim

```
src/clients/datasets/VirtualDatasetPlanClient.ts (or extend existing VirtualDatasetClient)
src/components/ChatPanel/plan/rehydratePlan.ts
src/components/ChatPanel/plan/loadParquet.ts
```

### Files to surgically edit on `develop`

- `SavedDatasetsView` (from #003) — call rehydrate when `dataset.config.plan_steps` is present.

## Verification

### Automated

```sh
pnpm vitest run src/clients/datasets src/components/ChatPanel/plan
```

### Manual

1. Run a plan. Save as a virtual dataset.
2. Reload. Open the saved virtual dataset via the drawer. Confirm the plan rehydrates with cached step results.

## Risks + things to look out for

- **Stale parquet refs.** If the cached parquet blob is missing (browser clear), the rehydrate must degrade gracefully — show the plan steps, allow re-run, don't crash.

## How to mark this feature completed

Standard ritual.
