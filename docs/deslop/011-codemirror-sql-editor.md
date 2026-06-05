# 011 — CodeMirror SQL editor

- **Slug**: `codemirror-sql-editor`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-011/codemirror-sql-editor`
- **Depends on**: `none` (independent of #008 / #009 / #010, even though it commonly lives inside the floating Query Details window from #008).
- **Estimated PR size**: medium — ~3–6 files, +600 / −80 lines, plus `@codemirror/*` deps.

## Notes for future you

- This row introduces the **editor primitive**; row #012 (`sql-pill-rendering`) renders dataset/column pills **inside** this editor. They must land in this order: #011 → #012. Don't try to fold them — the editor is reusable beyond the pill use case (e.g. raw SQL on virtual datasets, the dashboard SQL block).
- The `@codemirror/*` package family is a noticeable bundle-size hit (~150 KB gzipped). Confirm Vite chunk-splitting still puts CodeMirror on its own lazy chunk. If `react-doctor` flags `prefer-dynamic-import` on the CodeMirror import, the canonical fix is `lazy(() => import("./SqlEditor"))` at the top-level call site, not at the leaf component.
- Driver commit: `314f8a9`. The SQL-pills design spec at `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md` is the canonical UX reference.

## What this feature is

Replaces the previous `<Textarea>`-based SQL input in the Data Explorer with a CodeMirror 6-based editor. Adds:

- Syntax highlighting (SQL grammar).
- Bracket / quote matching.
- Line numbers.
- Auto-indent.
- Read-only mode for inline display (e.g. inside `AvaSqlBlock`).

The editor is the host for the inline dataset/column pills introduced by row #012, but the editor itself works without those pills — pills are a layer on top.

Spec: `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md`.

## Steps to migrate

**Step 0** — `/deslop undrift codemirror-sql-editor`.

1. Create the refactor branch:
   ```sh
   git fetch origin develop
   git checkout -b refactor-011/codemirror-sql-editor origin/develop
   ```
2. Add `@codemirror/*` dependencies (see `Dependency changes` below).
3. Copy the new `SqlEditor` component tree verbatim.
4. Surgically swap the old `<Textarea>`-based SQL input in `DataExplorerApp.tsx` (and any other call site) for `<SqlEditor>`.
5. Run verification.

### Files to copy verbatim

```
src/components/SqlEditor/SqlEditor.tsx
src/components/SqlEditor/SqlEditor.module.css
src/components/SqlEditor/SqlEditor.test.tsx (if present)
```

Other co-located helpers in `src/components/SqlEditor/` (theme config, extension setup).

### Files to surgically edit on `develop`

- Wherever the old `<Textarea>` SQL input lives on `develop` — typically `src/views/DataExplorerApp/DataExplorerApp.tsx` and/or `src/views/DataExplorerApp/SqlQueryView/SqlQueryView.tsx` (the latter ships in row #008). Replace the textarea with `<SqlEditor value={...} onChange={...} readOnly={...} />`.
- If `develop` has an `AvaSqlBlock` (the read-only inline display), point it at `<SqlEditor readOnly />` so we have a single editor primitive.

### Files to delete

None directly — the old `<Textarea>` was inline, not its own file.

### Dependency changes

```
pnpm add @codemirror/state @codemirror/view @codemirror/lang-sql @codemirror/commands @codemirror/language @codemirror/autocomplete
```

(Exact set may include `@codemirror/search`, `@codemirror/theme-one-dark` if used. Mirror what `feat/ict4d-demo`'s `package.json` ships.)

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/SqlEditor
```

### Manual

1. `pnpm dev`.
2. Open the Data Explorer. Open the SQL tab in Query Details.
3. Confirm the editor renders with SQL syntax highlighting and line numbers.
4. Type SQL — `SELECT * FROM foo;`. Confirm bracket / quote matching.
5. Toggle the read-only state (if the UI exposes one). Confirm the editor is uneditable but still highlighted.
6. Confirm bundle size hasn't ballooned: `pnpm build` and inspect the chunk graph. CodeMirror should be in its own lazy chunk.

## Risks + things to look out for

- **Bundle-size regression.** Without lazy-loading, CodeMirror adds ~150 KB to the main bundle. Verify via `pnpm build` and chunk inspection.
- **Controlled-input drift.** CodeMirror's `value`/`onChange` semantics aren't a 1:1 swap for `<Textarea>` — the editor maintains its own internal state and pushes changes via the `EditorView` update listener. Wrap with care to avoid render loops.
- **Theme integration.** The editor needs a Mantine-themed look in light + dark mode. If the source branch ships a theme bridge file (`SqlEditorTheme.ts` or similar), copy it over.

## How to mark this feature completed

When the operator runs `/deslop complete codemirror-sql-editor`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-011/codemirror-sql-editor origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-011/codemirror-sql-editor 2>/dev/null || true`
   - `git push origin --delete refactor-011/codemirror-sql-editor`
   - `rm docs/deslop/011-codemirror-sql-editor.md`
   - Flip row #11 to `[x] ($MERGE_SHA)`.
   - Update `STATE.md`.
   - Commit `chore(deslop): mark codemirror-sql-editor as completed ($MERGE_SHA)` and push.
