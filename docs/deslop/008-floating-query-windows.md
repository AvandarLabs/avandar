# 008 — Floating query windows

- **Slug**: `floating-query-windows`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-008/floating-query-windows`
- **Depends on**: `none` (the floating-window infrastructure is self-contained; rows #10 / #11 / #96 plug content into it but don't gate it).
- **Estimated PR size**: ~7 files changed, +643 / −404 lines.

## Notes for future you

- This row provides the **container**. Rows #10 (`viz-settings-fieldsets`) and #11 (`codemirror-sql-editor`) provide the **content** that lives inside the windows. They can land in any order — the floating window will render whatever child you pass it. Until #11 lands, the SQL tab inside Query Details may use a plain textarea or the pre-existing SQL editor on `develop`; that's fine.
- The Data Explorer URL session sync from row #96 is **independent** of panel state. URL serialization covers `ds`, `cols`, `sql`, etc. — not floating-window position/collapse. Don't try to merge the two storage stores.
- The standalone `Drawer` wrapper at `packages/web/ui/src/Drawer/` ships with row #3 (`dataset-drawer`), not here.

## What this feature is

Replaces the static left-sidebar that held **Query Details** (Manual + SQL editor) and **Visualization Settings** in the Data Explorer with two draggable, collapsible floating windows on top of the canvas. Each window:

- Opens from a toolbar button (`openOriginRef`-driven morph animation from the button position).
- Can be dragged around the canvas.
- Can be collapsed to a header-only bar.
- Can be closed independently.
- Persists open / collapsed / position state per panel in `sessionStorage` (no URL serialization — that's row #96's territory).

z-index = **250** — below Mantine modals/dropdowns (300), above the app shell (200). The two windows mount in `DataExplorerApp.tsx` and contain `<QueryDetailsBody>` and the existing `<VizSettingsForm>` respectively.

The "Query Details" panel uses a tabbed Manual/SQL interface inside (`QueryDetailsBody`); the SQL tab is a read-only `<SqlQueryView>` with an Edit affordance that flips into editable mode (where the CodeMirror editor from row #11 lives, once that row lands).

Source: CHECKPOINT 1 (PR #228) at `docs/ict4d-demo/CHECKPOINTS.md`.

## Steps to migrate

**Step 0** — `/deslop undrift floating-query-windows` (the skill runs this before the steps below).

1. Create the refactor branch:
   ```sh
   git fetch origin develop
   git checkout -b refactor-008/floating-query-windows origin/develop
   ```
2. Copy the new `FloatingPanel/`, `QueryDetailsBody/`, `SqlQueryView/`, and `dataExplorerPanelPreferences.ts` files verbatim.
3. Surgically edit `DataExplorerApp.tsx` — replace the sidebar tree with two `<FloatingPanel>` mounts, hook up `useDisclosure` for each (open + collapsed), and wire `sessionStorage` persistence via `dataExplorerPanelPreferences`.
4. Add the floating-window z-index constant to `Theme.ts` (250 — verify it slots between app-shell 200 and Mantine modal 300).
5. Delete the old `src/views/DataExplorerApp/QueryDetailsPanel/` sidebar files (they no longer have a mount point).
6. Run verification.

### Files to copy verbatim

```
src/components/FloatingPanel/FloatingPanel.tsx
src/components/FloatingPanel/FloatingPanel.module.css
src/components/FloatingPanel/useFloatingPanelDismiss.ts
src/components/FloatingPanel/useFloatingPanelMorphTransition.ts
src/views/DataExplorerApp/QueryDetailsBody/QueryDetailsBody.tsx
src/views/DataExplorerApp/SqlQueryView/SqlQueryView.tsx
src/views/DataExplorerApp/dataExplorerPanelPreferences.ts
```

### Files to surgically edit on `develop`

- `src/views/DataExplorerApp/DataExplorerApp.tsx`
  - Remove the sidebar mount (look for the import of `QueryDetailsPanel` and the JSX that holds the static left-edge panel).
  - Add panel-preference state at the top of the component:
    ```tsx
    const [panelPreferences, setPanelPreferences] = useState<DataExplorerPanelPreferences>(
      () => readDataExplorerPanelPreferences(),
    );
    ```
  - Add `useDisclosure` (or equivalent) state for `isQueryDetailsOpened`, `isQueryDetailsCollapsed`, `isSettingsOpened`, `isSettingsCollapsed`.
  - Add `useRef` for the toolbar buttons used as morph origins: `queryPanelButtonRef`, `settingsPanelButtonRef`.
  - Mount the two floating panels near the bottom of the render tree:
    ```tsx
    <FloatingPanel
      title={t`Query Details`}
      opened={isQueryDetailsOpened}
      collapsed={isQueryDetailsCollapsed}
      openOriginRef={queryPanelButtonRef}
      onClose={() => setQueryDetailsOpened(false)}
      onToggleCollapse={...}
      onPositionChange={(p) => persistPosition("queryDetails", p)}
      initialPosition={panelPreferences.queryDetails?.position ?? QUERY_DETAILS_INITIAL_POSITION}
      width={QUERY_DETAILS_WIDTH}
    >
      <QueryDetailsBody />
    </FloatingPanel>

    <FloatingPanel
      title={t`Visualization Settings`}
      opened={isSettingsOpened}
      collapsed={isSettingsCollapsed}
      openOriginRef={settingsPanelButtonRef}
      ...
      initialPosition={panelPreferences.settings?.position ?? SETTINGS_INITIAL_POSITION}
      width={SETTINGS_WIDTH}
    >
      <VizSettingsForm />
    </FloatingPanel>
    ```
  - Wire the toolbar buttons (the ones that opened the sidebar before) to `openQueryDetails` / `openSettings`. Attach the refs.
- `src/config/Theme/Theme.ts`
  - Add the z-index constant `floatingPanel: 250` to the theme's z-index table (or whatever the equivalent constant naming convention is on `develop`).

### Files to delete

```
src/views/DataExplorerApp/QueryDetailsPanel/
```

(The whole sidebar directory — verify it exists on `develop` and was the host of the old static panel. If your `develop` revision uses a different name for the sidebar holder, delete that one instead.)

### Dependency changes

None. The implementation uses Mantine's native `FloatingWindow` (`@mantine/core@^9.2.0`, already installed). No `react-rnd` / `react-draggable` / `re-resizable` is added.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run \
  src/components/FloatingPanel \
  src/views/DataExplorerApp
```

All must pass. There are no dedicated Playwright specs for this feature; QA is manual.

### Manual

1. `pnpm dev`.
2. Open the Data Explorer.
3. Confirm there is **no** static left sidebar — the canvas runs edge-to-edge.
4. Click the "Show query details" toolbar button. Confirm the Query Details window morphs in from the button position, sits at z-index above the canvas but below any modal you can open.
5. Drag the window around. Confirm position updates smoothly and persists across page refresh (sessionStorage).
6. Click the collapse caret in the header. Confirm the window collapses to header-only. Click again to expand.
7. Close the window via the `×` button. Confirm it dismisses.
8. Switch between the Manual and SQL tabs inside `QueryDetailsBody`. Confirm tab state persists while the window stays open. On the SQL tab, confirm the read-only SQL view renders and the Edit affordance is wired (it'll be a no-op or basic editor until row #11 lands the CodeMirror editor).
9. Repeat steps 4–7 for the Visualization Settings window (right toolbar button). Confirm both windows can be open at the same time without z-index fights.
10. Open a Mantine modal on top (e.g. the dataset-open modal from row #3). Confirm the modal stacks **above** the floating windows.
11. Refresh the tab. Confirm panel state (open/collapsed/position) restores from sessionStorage. Open in a new tab — sessionStorage is per-tab so the new tab should start with defaults.
12. Narrow the viewport to ≤ 640 px. Confirm windows don't escape the viewport boundary — Mantine's `useFloatingWindow` should clamp them. UX tightness on mobile is acceptable; full mobile polish is not in scope.

## Risks + things to look out for

- **z-index hierarchy.** 250 is intentional. If a sub-component inside the floating window opens a popover/dropdown (e.g. a Mantine `Select` or `Menu`), its portal z-index must end up above 250. Mantine handles this via its own z-index table — verify the `Theme.ts` table is consistent.
- **Drag listener stability.** `FloatingPanel.tsx` (around lines 102–127 on the source branch) has a comment about Mantine's `useFloatingWindow` listing every `initialPosition.*` field + `onPositionChange` in its deps array. The workaround is forwarding callbacks via refs and freezing `initialPosition` while the panel is mounted. **Don't refactor this away.**
- **Morph transition with `openOriginRef`.** When the trigger button is removed from the DOM (e.g. toolbar conditionally hides it) between mount and panel-open, the morph animation breaks. The current code tolerates a missing ref by falling back to no animation, but watch for regressions if you rewire the toolbar.
- **sessionStorage unavailable.** Server-side rendering or strict privacy mode disables sessionStorage. The code falls back to in-memory state — non-fatal. Verify the SSR (if any) doesn't throw.
- **Initial position assumes desktop viewport.** `QUERY_DETAILS_INITIAL_POSITION = { top: 140, left: 32 }`. On very narrow viewports the window will spawn off-canvas until Mantine clamps. Don't try to fix this here — it's a follow-up polish.

## How to mark this feature completed

When the operator runs `/deslop complete floating-query-windows`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-008/floating-query-windows origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-008/floating-query-windows 2>/dev/null || true`
   - `git push origin --delete refactor-008/floating-query-windows`
   - `rm docs/deslop/008-floating-query-windows.md`
   - `docs/deslop/ALL_FEATURES.md`: flip row #8 to `[x] ($MERGE_SHA)`.
   - `docs/deslop/STATE.md`: move the entry from `In-flight migrations` to `Completed migrations log`.
   - Commit `chore(deslop): mark floating-query-windows as completed ($MERGE_SHA)` and push to `feat/ict4d-demo`.
