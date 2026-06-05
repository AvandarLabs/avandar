# 002 — App-wide dropzone

- **Slug**: `app-wide-dropzone`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-002/app-wide-dropzone`
- **Depends on**: `001-async-dataset-import-pipeline` (uses `startCsvImport` / `startXlsxImport` via `useLoadManualUploadFile`).
- **Estimated PR size**: ~10 files changed (7 new + 3 modified), ~480 lines added.

## What this feature is

Drop a CSV or XLSX anywhere in the workspace and the dataset-import flow opens immediately. A full-screen `<Dropzone.FullScreen>` from `@mantine/dropzone` (already installed) is mounted globally inside `<ChatPanelProvider>` in `WorkspaceLayout`. When a file is dropped:

1. The full-screen overlay closes.
2. A small confirmation modal asks the user to start the import.
3. On confirm, the standard `ManualUploadView` modal opens with the file pre-loaded — Phase A of the async pipeline runs automatically.

Source: CHECKPOINT 1 (PR #224) in `docs/ict4d-demo/CHECKPOINTS.md`.

## Steps to migrate

**Step 0** — `/deslop undrift app-wide-dropzone` (the skill runs this before the steps below).

1. Create the refactor branch:
   ```sh
   git fetch origin develop
   git checkout -b refactor-002/app-wide-dropzone origin/develop
   ```
2. Copy the new `AppDropzone` component tree verbatim from `feat/ict4d-demo`.
3. Surgically edit `WorkspaceLayout.tsx` to mount `<AppDropzone>` inside `<ChatPanelProvider>` and wrapping `<AppShell>`. Also surgically edit `ManualUploadView` to accept the new optional `initialFile` and `onAfterSave` props.
4. Run verification.

### Files to copy verbatim

These do not exist on `develop`.

```
src/components/AppDropzone/AppDropzone.tsx
src/components/AppDropzone/AppDropzone.module.css
src/components/AppDropzone/AppDropzone.test.tsx
src/components/AppDropzone/onAppDropzoneDrop.ts
src/components/AppDropzone/openFileImportFlow.tsx
src/components/AppDropzone/openFileImportFlow.test.tsx
src/components/AppDropzone/ImportConfirmBody.tsx
```

### Files to surgically edit on `develop`

- `src/components/layouts/RootLayout/WorkspaceLayout.tsx`
  - Add `import { AppDropzone } from "@/components/AppDropzone/AppDropzone"`.
  - Wrap `<AppShell>` with `<AppDropzone>` so the layout looks like:
    ```tsx
    <ChatPanelProvider>
      <AppDropzone>
        <AppShell ...>
          {children}
        </AppShell>
      </AppDropzone>
    </ChatPanelProvider>
    ```
  - The anchor is the existing `<ChatPanelProvider>` block; on `feat/ict4d-demo` this sits at roughly lines 137–150 of `WorkspaceLayout.tsx`. The exact line numbers on `develop` will differ — find the `<ChatPanelProvider>` block and put `<AppDropzone>` directly inside it, wrapping `<AppShell>`.
- `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx`
  - Add optional `initialFile?: File` prop.
  - Add a `useEffect` that auto-parses the file when `initialFile` is provided on mount.
  - Add optional `onAfterSave?: () => void` callback that fires after `useLoadManualUploadFile` finishes the import. Used to close the import modal when triggered from the drop flow (not from in-canvas routing).
  - Preserve the existing `onSaveSuccess` callback (from the dataset-drawer flow, row #3).

### Files to delete

None.

### Dependency changes

None. `@mantine/dropzone` (`^9.2.0`) and `@tabler/icons-react` are already installed.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/AppDropzone
```

All must pass. The `AppDropzone.test.tsx` (4 cases) and `openFileImportFlow.test.tsx` (5 cases) cover the drop → confirm → import-modal flow.

### Manual

1. Start the dev server (`pnpm dev`).
2. Open any workspace page (Data Explorer, Dashboards, etc. — anything mounted under `WorkspaceLayout`).
3. Drag a CSV onto the page from the OS file picker. Confirm the full-screen overlay appears with the green "drop to import" icon.
4. Drop the file. Confirm:
   - The overlay dismisses.
   - A small confirm dialog asks "Import this file?".
   - On confirm, the standard `ManualUploadView` modal opens with the file already loaded (Phase A preview shows columns).
5. Submit the import. Confirm it lands via the async pipeline (`DatasetParseStatusIndicator` should appear briefly in the navbar — that's the row #1 pipeline at work).
6. Drag a non-CSV/XLSX file (e.g. a PDF). Confirm the overlay shows a "reject" state (red X icon) and the drop is refused.
7. Repeat (3)-(5) with an XLSX file to confirm the XLSX path also wires through.

## Risks + things to look out for

- **z-index interplay.** `Dropzone.FullScreen` uses z-index ≥ 9999 when active. If the app has competing drag surfaces (xyflow chat-plan canvas in row #34, Mantine modals, etc.), verify the dropzone reliably wins on file-drag events but doesn't intercept non-file drag interactions (e.g. node drags on xyflow). The CSS in `AppDropzone.module.css` (around lines 31–39) flags the pointer-events toggle that keeps the overlay non-interactive when idle — make sure that comment makes it across.
- **Modal choreography (queueMicrotask).** `openFileImportFlow.tsx` uses `queueMicrotask` so the confirm-modal mounts after the dropzone overlay's exit animation completes. If you reorder the modal-open call, you may re-introduce the opacity-0 bug the original code comment warns about.
- **Race on rapid drops.** Drop → confirm → close → drop again before the first Phase A parse completes. Both `ManualUploadView` mounts coexist with different `initialFile` values; the `useEffect` re-parses on `initialFile` change. The underlying IndexedDB state of the first parse may still settle after the second modal opens. Low risk in practice (large XLSX parses are slow enough that users don't double-drop), but worth keeping in mind during review.

## How to mark this feature completed

When the operator runs `/deslop complete app-wide-dropzone`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-002/app-wide-dropzone origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
   If `NOT-merged`, stop. Do nothing else.
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-002/app-wide-dropzone 2>/dev/null || true`
   - `git push origin --delete refactor-002/app-wide-dropzone`
   - `rm docs/deslop/002-app-wide-dropzone.md`
   - `docs/deslop/ALL_FEATURES.md`: flip row #2 to `[x] ($MERGE_SHA)`.
   - `docs/deslop/STATE.md`: move the entry from `In-flight migrations` to `Completed migrations log`.
   - Commit `chore(deslop): mark app-wide-dropzone as completed ($MERGE_SHA)` and push to `feat/ict4d-demo`.

## Notes for future you

- The `ChatPanelProvider` already exists on `develop`; no migration is needed for it. The dropzone is mounted **inside** that provider so it can call into chat-aware modal helpers if needed in the future, but the current implementation does not reach into chat state.
- Tests use Vitest's DOM environment + `@testing-library/react`. They mock `DataTransfer` for the drop event; no Playwright is involved.
