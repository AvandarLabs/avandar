# 096 — Data Explorer URL session sync

- **Slug**: `data-explorer-url-session-sync`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-096/data-explorer-url-session-sync`
- **Depends on**: `none` (works against current `develop`'s Data Explorer state shape; #008 / #009 / #010 / #011 / #012 are nice but not required).
- **Estimated PR size**: medium — ~4 new files + 1 modified, +838 LoC.

## Notes for future you

- This is **independent** of the floating-panel preferences from #008. URL sync covers the *query* / *visualization* state (`ds`, `cols`, `agg`, `orderBy`, `orderDir`, `sql`, `vc`, `od`). Panel position / collapse state stays in sessionStorage. Don't try to merge the two stores.
- Single driver commit: `7b738f13` (PTRCK-009 + PTRCK-010). Same SHA also delivers the chart-suite expansion which folds into #009 — when porting, scope strictly to the four new files + the `QueryColumnMultiSelect` edit.
- **All four new files don't exist on `develop`.** This is a clean path-scoped checkout.
- The URL uses **short keys** (`ds`, `cols`, `agg`, etc.) so the query string stays manageable. Don't rename them to long keys — there are deep links out in the wild.
- "Reset clears search params in one navigation so the query string can go bare." — the reset path uses a single `navigate({ search: () => ({}), replace: true })` rather than diffing keys. Preserve that behavior.

## What this feature is

The Data Explorer's working state hydrates from the URL on first load and serializes back to the URL on change, via TanStack Router's `navigate({ replace: true })`. State keys:

- `ds` — open dataset id (canonical) or `vds:<id>` for virtual datasets
- `cols` — selected columns (with `baseId` mapping)
- `agg` — aggregation modes per column
- `orderBy`, `orderDir` — sort spec
- `sql` — raw SQL (only when in manual mode)
- `vc` — visualization config (compressed JSON)
- `od` — open-dataset metadata blob

Hydration is deferred until prerequisite async state (datasets list, dataset metadata, viz config schema) has loaded — `dataExplorerURLHydration` tracks a "hydrate-key" per piece of state to know when it's safe to apply.

`remapColumnsByBaseId` keeps URL-hydrated column refs in sync with fetched dataset metadata (the URL stores `baseId`s; the live state uses `id`s — the remap binds them).

## Steps to migrate

**Step 0** — `/deslop undrift data-explorer-url-session-sync`.

1. Create the refactor branch off `develop`:
   ```sh
   git fetch origin develop
   git checkout -b refactor-096/data-explorer-url-session-sync origin/develop
   ```
2. Copy the four new files verbatim.
3. Surgically edit `QueryColumnMultiSelect` to call `remapColumnsByBaseId`.
4. Surgically edit `DataExplorerApp.tsx` to wire `useDataExplorerURLSync` at mount (first-load hydrate + ongoing sync).
5. Run verification.

### Files to copy verbatim

```
src/views/DataExplorerApp/urlState/DataExplorerURLState.ts
src/views/DataExplorerApp/urlState/dataExplorerURLHydration.ts
src/views/DataExplorerApp/urlState/useDataExplorerURLSync.ts
src/views/DataExplorerApp/urlState/remapColumnsByBaseId.ts
```

(Path layout may differ — `feat/ict4d-demo` may colocate these inline; mirror the source-branch tree exactly.)

### Files to surgically edit on `develop`

- `src/views/DataExplorerApp/DataExplorerApp.tsx`
  - Mount `useDataExplorerURLSync(state, dispatch)` at the top of the component.
  - Replace any inline state-initialization with the hydrated values from the URL on first paint.
  - Wire the "Reset" button (if any) to clear search params in one navigation:
    ```tsx
    navigate({ search: () => ({}), replace: true });
    ```
- `src/views/DataExplorerApp/QueryColumnMultiSelect.tsx`
  - Import `remapColumnsByBaseId`.
  - When the dataset metadata loads, remap the hydrated columns so their `id`s line up with fetched metadata.

### Files to delete

None.

### Dependency changes

None. The implementation uses TanStack Router primitives already installed.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/views/DataExplorerApp/urlState
```

### Manual

1. `pnpm dev`.
2. Open the Data Explorer. Pick a dataset, select 3 columns, change an aggregation, set a sort. Watch the URL query string update on each change.
3. Copy the full URL. Open in a new tab. Confirm the Data Explorer hydrates to the exact same state (dataset, columns, agg, sort).
4. Click "Reset" (or whatever the reset affordance is). Confirm the query string goes bare (`?` not even present, just the path).
5. Open a **virtual dataset** via row #003's drawer. Confirm the URL shows `ds=vds:<id>` and reloading the URL re-opens the virtual dataset with rehydrated SQL.
6. Switch from query-builder mode to raw SQL mode. Confirm `sql` appears in the URL. Switch back — `sql` clears.
7. Manually craft a URL with a stale column reference (e.g. a `baseId` that no longer exists in the dataset). Confirm the Data Explorer doesn't crash — `remapColumnsByBaseId` drops the stale column.

## Risks + things to look out for

- **URL bloat.** The viz-config `vc` field is JSON. For dashboards with rich settings (especially after #009's chart-suite expansion), this can grow large. The implementation uses a compact serializer; don't switch to verbose JSON.
- **Navigation loop.** `replace: true` is critical. Without it, every state change pushes a history entry and the back button gets buried under churn.
- **Hydration timing.** First-paint hydration is gated on async state (datasets list, dataset metadata). The `hydrate-key` mechanism prevents flicker; don't short-circuit it.
- **Virtual dataset rehydrate.** `ds=vds:<id>` triggers the rehydrate path in `SavedDatasetsView` (row #003). If row #003 hasn't landed yet, virtual-dataset URLs may not rehydrate fully — confirm the no-virtual-dataset path doesn't crash.

## How to mark this feature completed

When the operator runs `/deslop complete data-explorer-url-session-sync`:

1. Verify the merge with `git merge-base --is-ancestor origin/refactor-096/data-explorer-url-session-sync origin/develop`.
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - Branch cleanup.
   - `rm docs/deslop/096-data-explorer-url-session-sync.md`.
   - Flip row #96 to `[x] ($MERGE_SHA)`.
   - Update `STATE.md`.
   - Commit `chore(deslop): mark data-explorer-url-session-sync as completed ($MERGE_SHA)` and push.
