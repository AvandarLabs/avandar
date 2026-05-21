# SQL Pills, Viz Settings, and Column Resilience — Design

**Date:** 2026-05-21
**Branch:** `feat/ict4d-demo`
**Author:** Pablo (via Claude)

## Motivation

Four related improvements to the chat/viz UX:

1. Viz settings panels lead with axis controls, but users naturally pick series first; sections are also visually flat.
2. SQL "pills" (dataset/column chips) live inside `SqlEditor` but the chat panel's markdown ` ```sql ` blocks render via Prism without pills.
3. SQL outside the chat panel is read-only; users want to tweak the generated SQL inline (including swapping columns/datasets via pills).
4. When query results change, viz settings can hold stale series/axis references that silently render no data.

## Feature 1 — Viz settings: series-first + fieldsets

**Affected:** `SeriesAwareVizForm.tsx`, `PieChartForm.tsx`, `FunnelChartForm.tsx`, `ScatterChartForm.tsx`, `BubbleChartForm.tsx`.

**Order in every form:**

1. **Series** fieldset (legend = "Series" or "Value" for pie/funnel)
2. **X axis** fieldset (legend = "X axis" — only for forms with an x-axis)
3. **Chart settings** fieldset (legend = "Chart settings") — render-as toggles, titles, legend, stack mode, etc.

**Implementation:** Wrap each section in Mantine `<Fieldset legend=…>`. No content/logic changes — purely structural reordering and grouping.

## Feature 2 — `AvaSqlBlock`

**New file:** `src/components/AvaSqlBlock/AvaSqlBlock.tsx`.

**API:**

```ts
type AvaSqlBlockProps = {
  value: string;
  catalog?: SqlDisplayCatalog;       // optional override; defaults via useSqlDisplayCatalog
  readOnly?: boolean;
  onChange?: (next: string) => void; // required when !readOnly
  minRows?: number;
  "data-testid"?: string;
};
```

**Render paths:**

- `readOnly` (no `onChange`) → renders a `<pre><code>` block of `<span>` text + `<span class="sqlPill …">` pills, computed from `buildSqlDisplaySegments(value, catalog)`. No CodeMirror. Cheap to instantiate many times in chat markdown.
- editable (`onChange` provided) → wraps the existing `SqlEditor` with the CodeMirror pill extension. `readOnly` may be passed explicitly to render a non-editable CodeMirror; default behavior is "editable iff `onChange` is provided AND `readOnly` !== true".

**Migrations to `AvaSqlBlock`:**

- `src/components/ChatPanel/PlanFlowView/PlanStepSqlCode.tsx`
- `src/views/DataExplorerApp/SqlQueryView/SqlQueryView.tsx`
- `src/components/SqlEditor/SqlQueryEditPanel.tsx`
- `src/views/DataExplorerApp/GeneratedPromptBadge/GeneratedPromptBadge.tsx`
- `src/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField.tsx`

**Chat panel:** In `MarkdownTextPart.tsx`, override the `code` component so fenced blocks with `language-sql` or `language-duckdb` render via `<AvaSqlBlock readOnly value={code}>`. Other languages stay on Prism via `SyntaxHighlighter`.

## Feature 3 — Editable pills

**Affected:** `src/lib/sql/createSqlDisplayExtension.ts`, `SqlPillWidget`.

When the editor is **editable** (not `readOnly`):

- Pills render with a small chevron-down icon next to the label.
- Click on the pill opens a Mantine `Popover` with a `Combobox` listing options:
  - **Dataset pills** → all datasets from `SqlDisplayCatalog`.
  - **Column pills** → columns of the dataset whose alias is in scope at the token's position. Scope is derived from the surrounding `FROM`/`JOIN` clauses using a lightweight extension of `buildSqlDisplaySegments` that returns alias-to-dataset bindings.
- Selecting an option dispatches a CodeMirror transaction replacing the token's text in place, which triggers `onChange` → upstream state updates → all consumers refresh.

**Error state:** If a column token cannot be resolved to a dataset that's in scope (e.g., user changed the dataset and stale columns remain), the pill renders with the `sqlPill--error` modifier (red border/text) and the editor shows a small inline message below with a count of out-of-scope columns. The SQL can still be edited freely; the error is non-blocking.

## Feature 4 — Resilient viz column resolution

**Investigation needed:** Hydration logic in `applyVizConfigFromQueryResult` and `hydrateXYSeriesFromQueryResult` already prunes by `name` and drops stale keys. The user-reported bug means either (a) renderers read from cached columns before hydration runs, or (b) a separate code path bypasses hydration.

**Plan:**

1. Reproduce the bug: bar chart with `count` series → ask AI to add a column → observe whether bars disappear despite a new `count` column existing.
2. Add a small helper `resolveSeriesColumnKey(key, columns) -> string | undefined`:
   - exact match by name → return it
   - case-insensitive match by name → return matched canonical name (and surface a console.debug)
   - otherwise → return `undefined` (caller drops the key)
3. Audit every read of `series[i].key` / `xAxisKey` / `nameKey` / `valueKey` against `columns`. Use the helper or rely on `applyVizConfigFromQueryResult` running first.
4. Ensure `applyVizConfigFromQueryResult` runs on every query-result change *before* the chart renders, and that the cleared/hydrated config is what gets persisted to the dashboard.
5. If a key cannot be resolved post-hydration, it's already dropped — confirm via test that the viz settings UI no longer shows ghost references.

**Tests:**

- Hydration: same-name-different-id preserves series; missing column drops series; case-insensitive name match resolves.
- UI regression: viz settings panel never displays a series whose key is absent from current `columns`.

## Testing strategy

**TDD red/green (Vitest):**

- `AvaSqlBlock`
  - Read-only mode renders pills for known tokens and plain spans elsewhere.
  - Editable mode calls `onChange` on text edit.
  - Editable mode calls `onChange` with a token-swapped string when a pill option is selected.
  - Out-of-scope column pill renders in error state and surfaces an inline message.
- `buildSqlDisplaySegments` scope binding helper
  - Resolves column → dataset alias for `FROM x AS y` and `JOIN z`.
- `resolveSeriesColumnKey`
  - id → name → undefined fallback ladder.
- Hydration regression
  - Same-name-different-id preserves; missing column drops.
- Viz settings forms
  - Series fieldset renders first; legends present for X axis and Chart settings.

**Manual smoke (Playwright MCP):**

- Log in as `user@avandarlabs.com` / `avandar`.
- Viz settings: open a bar chart, screenshot section order. `~/Downloads/viz-fieldsets/`.
- AvaSqlBlock chat: prompt the assistant to emit SQL referencing known datasets/columns; screenshot pills in chat message. `~/Downloads/avasqlblock-chat/`.
- Editable pills: in Data Explorer, open a generated query, click a column pill, swap to a different column, verify SQL text updates. `~/Downloads/editable-pills/`.
- Column resilience: build a bar chart with `count` series, ask AI to add a column, verify bars still render. `~/Downloads/column-resilience/`.

## Out of scope

- Schema migrations or storage changes for viz configs.
- Multi-statement / CTE scope analysis beyond simple `FROM`/`JOIN` aliasing.
- Markdown rendering for non-SQL languages.
