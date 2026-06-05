# 012 — SQL pill rendering

- **Slug**: `sql-pill-rendering`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-012/sql-pill-rendering`
- **Depends on**: `011-codemirror-sql-editor` (the pills are CodeMirror decorations / widgets).
- **Estimated PR size**: medium — ~5–8 files, +500 / −60 lines.

## Notes for future you

- This row layers on top of #011. **Do not** ship pills without the underlying editor.
- Driver commits: `4e85af6`, `6febbcf`, `a01db18`. Commit `4e85af6` also touches viz-settings fieldsets (#010) — scope the pill portion to `AvaSqlBlock/` and the editor decoration files. `a01db18` also touches chat-better-pblock-generation (#021) — scope to pill code only.
- Two pill modes coexist:
  1. **Read-only pills** in `AvaSqlBlock` (the inline display of chat-generated SQL).
  2. **Editable pills** in the live editor — dropdown swaps the column/dataset reference inline.
- The dropdown width was deliberately widened in commit `a01db18` to accommodate long column names. Don't shrink it.

## What this feature is

Inside any rendered or editable SQL block, dataset names and column names appear as visual **pills** rather than raw tokens. Behaviors:

- **`AvaSqlBlock` (read-only)** — pills are non-interactive labels, color-coded by kind (dataset vs column).
- **Editor (interactive)** — clicking a pill opens a dropdown that lets the user swap to a different dataset / column. The dropdown is wide enough for long column names. Pills only render when the underlying token resolves to a known dataset/column in the workspace; unresolved tokens stay as plain text.

Spec: `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md`.

## Steps to migrate

**Step 0** — `/deslop undrift sql-pill-rendering`.

1. Confirm #011 has merged. If not, stop.
2. Create the refactor branch off `develop`.
3. Copy the new pill components verbatim. Add the CodeMirror decoration extension to the editor configuration from #011.
4. Surgically edit `AvaSqlBlock.tsx` to render pills in read-only mode.
5. Run verification.

### Files to copy verbatim

```
src/components/AvaSqlBlock/AvaSqlBlock.tsx (if not present on develop yet)
src/components/AvaSqlBlock/AvaSqlBlock.module.css
src/components/AvaSqlBlock/PillEditPopover.tsx
src/components/SqlEditor/extensions/pillDecorations.ts (or equivalent name in the source branch)
```

(Adjust filenames against the actual source-branch tree; some pill code may sit alongside `SqlEditor.tsx`.)

### Files to surgically edit on `develop`

- `src/components/SqlEditor/SqlEditor.tsx`
  - Wire in the pill-decoration extension. Expose a prop like `pillsEnabled?: boolean` so legacy callers without dataset context can opt out.
- `src/components/AvaSqlBlock/AvaSqlBlock.tsx` — render via `<SqlEditor readOnly pillsEnabled />`.
- Any chat-side caller that renders SQL inline (e.g. `ChatPanel` message renderer that renders `AvaSqlBlock`).

### Files to delete

None.

### Dependency changes

None (CodeMirror packages already added by #011).

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/AvaSqlBlock src/components/SqlEditor
```

### Manual

1. `pnpm dev`.
2. Open the Data Explorer. Type SQL referencing a known dataset + column (e.g. `SELECT customers.email FROM customers`). Confirm the dataset name and the column name render as styled pills.
3. Click the column pill. Confirm a popover opens with a list of columns from the same dataset. Pick a different one — the SQL updates in place.
4. Click the dataset pill. Confirm a popover lets you swap the dataset (and the column pill behind it re-validates against the new dataset).
5. Type a column name that doesn't exist in the dataset. Confirm it stays as plain text (no pill).
6. Open a chat panel that renders a generated SQL block via `AvaSqlBlock`. Confirm pills render as labels (no popover).

## Risks + things to look out for

- **`AvaSqlBlock` uses `key={index}`** in a few spots per react-doctor output. Don't propagate that pattern when rendering pill children — use a stable key (the token's position in the SQL string, or its kind + name).
- **Popover positioning** can fight CodeMirror's scroll container. Use Mantine `Popover` with `withinPortal` to escape the editor's overflow context.
- **Pill resolution race.** The set of known datasets/columns is fetched async. Until resolution completes, all tokens are plain text. Don't flash-render fake pills.

## How to mark this feature completed

When the operator runs `/deslop complete sql-pill-rendering`:

1. Verify the merge with `git merge-base --is-ancestor origin/refactor-012/sql-pill-rendering origin/develop`.
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-012/sql-pill-rendering 2>/dev/null || true`
   - `git push origin --delete refactor-012/sql-pill-rendering`
   - `rm docs/deslop/012-sql-pill-rendering.md`
   - Flip row #12 to `[x] ($MERGE_SHA)`.
   - Update `STATE.md`.
   - Commit `chore(deslop): mark sql-pill-rendering as completed ($MERGE_SHA)` and push.
