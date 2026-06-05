# 003 — Dataset drawer (Saved / Import tabs)

- **Slug**: `dataset-drawer`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-003/dataset-drawer`
- **Depends on**: `001-async-dataset-import-pipeline` (the Import tab embeds `DataImportTabs` which uses `startCsvImport` / `startXlsxImport`).
- **Estimated PR size**: ~8 files changed (7 new + 1 modified), ~609 lines added.

## What this feature is

Replaces the imperative Mantine `modals.open(...)` "Open Dataset" call in the Data Explorer with a declarative component, tabbed into **Saved datasets** and **Import**. The Saved tab lists the workspace's saved + virtual datasets with filter, delete, and rehydrate-on-open. The Import tab embeds the new `DataImportTabs` (from row #1) so users can import a fresh file without leaving the Data Explorer.

The component is currently implemented as a Mantine `Modal` despite the row's name being "dataset-drawer". The original PR (#229) was authored as a Drawer with slide-from-bottom transitions (commits `2ce199a`, `09c24af`), but the live state on `feat/ict4d-demo` has been refactored back to a centered Modal. See "Notes for future you" — the row description in `ALL_FEATURES.md` is slightly stale and reviewers may flag it.

Source: CHECKPOINT 1 (PR #229) at `docs/ict4d-demo/CHECKPOINTS.md`.

## Steps to migrate

**Step 0** — `/deslop undrift dataset-drawer` (the skill runs this before the steps below).

1. Create the refactor branch:
   ```sh
   git fetch origin develop
   git checkout -b refactor-003/dataset-drawer origin/develop
   ```
2. Copy the new component tree verbatim.
3. Surgically edit `DataExplorerApp.tsx` to swap the inline `modals.open(...)` call for the new `<OpenDatasetModal>` component plus a `useDisclosure` state hook. Wire the "Open" toolbar button to `openOpenDatasetModal`.
4. Preserve the per-virtual-dataset "Save" menu item that depends on `state.openDataset.virtualDatasetId`.
5. Run verification.

### Files to copy verbatim

```
src/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal.tsx
src/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal.module.css
src/views/DataExplorerApp/OpenDatasetDrawer/SavedDatasetsView.tsx
src/views/DataExplorerApp/OpenDatasetDrawer/ImportDatasetView.tsx
src/views/DataExplorerApp/OpenDatasetDrawer/datasetPreviewSQL.ts
packages/web/ui/src/Drawer/Drawer.tsx
packages/web/ui/src/Drawer/Drawer.module.css
```

(The folder name `OpenDatasetDrawer/` is preserved even though the component inside is `OpenDatasetModal`. The folder is the logical home for the feature.)

### Files to surgically edit on `develop`

- `src/views/DataExplorerApp/DataExplorerApp.tsx`
  - **Add state hook** (near top of the component, around the other `useDisclosure` calls):
    ```tsx
    const [isOpenDatasetModalOpen, { open: openOpenDatasetModal, close: closeOpenDatasetModal }] =
      useDisclosure(false);
    ```
  - **Wire toolbar button** — replace the old `modals.open({...})` call site (look for `title: "Open Dataset"` or a button labelled `<Trans>Open</Trans>`) with:
    ```tsx
    <Button onClick={openOpenDatasetModal}>
      <Trans>Open</Trans>
    </Button>
    ```
  - **Mount the component** near the bottom of the render tree:
    ```tsx
    <OpenDatasetModal
      opened={isOpenDatasetModalOpen}
      onClose={closeOpenDatasetModal}
      onOpen={(info, rawSQL) => {
        dispatch.setRawSql(rawSQL);
        dispatch.setOpenDataset(info);
        closeOpenDatasetModal();
      }}
    />
    ```
  - **Preserve / port the per-virtual-dataset Save menu item** — the menu currently lives near the "Open" button. Port the guard:
    ```tsx
    {state.openDataset.virtualDatasetId ? (
      <Menu.Item
        disabled={!state.rawSQL || isSavingOver}
        onClick={() => {
          const virtualDatasetId = state.openDataset?.virtualDatasetId;
          if (!state.rawSQL || !virtualDatasetId) return;
          saveOverDataset({ id: virtualDatasetId, data: { rawSQL: state.rawSQL } });
        }}
      >
        <Trans>Save — {state.openDataset.name}</Trans>
      </Menu.Item>
    ) : null}
    ```

### Files to delete

None on `develop`. (No standalone old "Open Dataset modal" file exists today — the dialog is opened via `modals.open` inline.)

### Dependency changes

None. The feature uses already-installed libs:

- `@mantine/core` (Modal, Tabs)
- `@mantine/hooks` (useDisclosure, useDebouncedValue)
- The internal `@ui` Tabs wrapper

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run \
  src/views/DataExplorerApp/OpenDatasetDrawer \
  packages/web/ui/src/Drawer
```

All must pass.

### Manual

1. `pnpm dev`.
2. Open the Data Explorer in a workspace.
3. Click the "Open" toolbar button. Confirm the new tabbed modal opens with **Saved** and **Import** tabs.
4. **Saved tab** — confirm:
   - The list shows the workspace's saved datasets + virtual datasets.
   - Filtering works.
   - Selecting a saved dataset opens it in the canvas and the modal closes.
   - Selecting a **virtual dataset** opens its rehydrated SQL/plan in the canvas (this is the rehydrate path that couples to row #36).
5. **Import tab** — confirm:
   - The new `DataImportTabs` (from row #1) renders with its three sub-tabs (Upload, Connectors, Open data).
   - Importing a small CSV here completes via the async pipeline and the modal closes (`onAfterSave` callback from row #2).
6. **Save over a virtual dataset** — confirm:
   - With a virtual dataset open, the "Save" menu item appears and is disabled when there's no `rawSQL`.
   - Saving updates the virtual dataset row in Supabase.
7. **Save over a non-virtual dataset** — confirm the "Save" menu item does **not** appear (the guard only enables it for `virtualDatasetId`).

## Risks + things to look out for

- **Naming inconsistency.** Folder is `OpenDatasetDrawer/`, component is `OpenDatasetModal`. The row name (`dataset-drawer`) implies a Drawer; the current implementation is a Modal. Don't "fix" this in the migration — preserve the on-disk state of `feat/ict4d-demo`. A follow-up rename can happen on `develop` once the migration lands.
- **Slide-from-bottom transition variants** mentioned in the feature row are **not** present in the current `feat/ict4d-demo` state. The original commits `2ce199a` / `09c24af` shipped a Drawer with bottom-anchored transitions, but a later refactor swapped it back to a Modal. Reviewers may ask "where's the bottom slide?". Answer: gone, intentionally — the row description in `ALL_FEATURES.md` is stale.
- **Virtual-dataset plan rehydration.** `SavedDatasetsView` calls `VirtualDatasetClient.getOne()` and `rehydratePlan()` for virtual datasets that have an embedded plan. If row #36 (`chat-plan-virtual-dataset-persistence`) hasn't landed yet, virtual datasets without plans should still open as raw SQL — the rehydrate path is only invoked when `dataset.config.plan_steps` exists. Verify the no-plan code path during review.
- **Other Drawer instances on the canvas.** The custom `Drawer` wrapper accepts a `boundary` prop for portal-scoping. The Data Explorer doesn't currently use it, so the modal portals into `document.body`. If a future feature mounts another Mantine Drawer at the same z-index, watch for portal collisions.
- **Keyboard / focus.** Mantine `Modal` provides focus trap + escape-to-close + click-outside dismiss by default. Don't override these.

## How to mark this feature completed

When the operator runs `/deslop complete dataset-drawer`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-003/dataset-drawer origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-003/dataset-drawer 2>/dev/null || true`
   - `git push origin --delete refactor-003/dataset-drawer`
   - `rm docs/deslop/003-dataset-drawer.md`
   - `docs/deslop/ALL_FEATURES.md`: flip row #3 to `[x] ($MERGE_SHA)`.
   - `docs/deslop/STATE.md`: move the entry from `In-flight migrations` to `Completed migrations log`.
   - Commit `chore(deslop): mark dataset-drawer as completed ($MERGE_SHA)` and push to `feat/ict4d-demo`.

## Notes for future you

- The original PR #229 was titled `add-dataset-drawer-K0E1O` and it shipped as a Drawer. Commits `2ce199a` and `09c24af` are the slide-from-bottom transition commits. A later refactor (somewhere between then and the `feat/ict4d-demo` HEAD this plan was authored against) swapped the Drawer for a Modal. If you bisect the source branch you'll see the Drawer phase, but the migration target is the current Modal state.
- Soft dependency on row #36 (`chat-plan-virtual-dataset-persistence`): the rehydrate path is only exercised when a virtual dataset has `plan_steps` saved on its `dataset.config`. Without row #36, virtual datasets exist but their plans don't persist — the drawer opens them as raw SQL with no plan, which is fine.
- The `@ui` Tabs wrapper used inside the modal is the internal Avandar Tabs primitive, not the Mantine one. It already exists on `develop`.
