# Plugins Slice 1b, Part B: Derived Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Data Explorer toolbar command add computed columns to the explorer's current query, with Undo, and ship the epidemiology plugin's Incidence per 100k and Rolling average commands on top of it.

**Architecture:** A plugin calls `avandar.dataExplorer.addColumns([{ name, expression, inputs }])`. The host, inside the lazily loaded command runner, checks each expression with `node-sql-parser`, binds its `{placeholder}`s to quoted column names, and wraps the SQL behind the invoked-on result in a CTE that keeps row order. A `DataExplorerBridge`, lent by the Data Explorer to each toolbar invocation, puts the wrapped SQL in the SQL editor in one state action, keeps the existing columns on their column IDs so the chart survives, and shows an Undo notification that restores a snapshot of the query and chart state. The epidemiology plugin builds the expressions (Byar confidence intervals, `RANGE` window averages) as pure functions, tested against real DuckDB.

**Tech Stack:** TypeScript, React 19, Mantine 9 (`@mantine/notifications`, `@mantine/modals`), `node-sql-parser` 5, Lingui 6, Vitest and Testing Library, `@duckdb/node-api` for executed tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`, "Part B: derived columns", "Incidence per 100k", "Rolling average", "Manifest changes", "Tests", and "Acceptance" items 2 and 3. Part A's plan is `docs/superpowers/plans/2026-11-07-plugins-1b-part-a-viz-types.md`.

**Branch:** `feat/plugins-columns`, in the worktree created from `origin/demo/measles`. It merges into `demo/measles`, never `develop`, and only when Pablo asks.

---

## Before you start

- Work in the `feat/plugins-columns` worktree. Commit each task by path. Never stage `supabase/config.toml`.
- Never run `pnpm install --lockfile-only`. Part B adds no dependency, so `pnpm-lock.yaml` must not change.
- `git diff` uses an external diff tool in this repo. Pass `--no-ext-diff` when counting or grepping diff output.
- Kill every process you start. No artificial CPU load, no background loops. Other worktrees share this machine and its Docker.
- Before any database-backed command (the E2E specs), run `ava supabase status` and confirm this worktree is on its own switched project. If it is not, run `ava supabase switch`, then `pnpm fns:update-env`. Never restart Docker or stop another project's stack.
- Run E2E specs one at a time, never the full suite.
- The translation catalogs go stale from Task 2 until Task 17 runs `pnpm i18n:extract`. `pnpm i18n:check` is expected to fail in between.
- Naming: exported functions are `make[Target]From[Source]`, `get[Target]From[Source]`, `is...`, or `assert...`. Private `_` helpers may use `_build...` (allowed by `docs/rules/typescript.md`), never `_resolve...`. No em dashes in code, comments, docs, or copy.

## Decisions made while planning

These refine the spec. Where they differ, this plan wins.

1. **The Data Explorer lends a bridge, not state.** `PluginMenuSlot` takes an optional `getDataExplorerBridge`, called at click time next to `getContext`, and the runner threads it to `makePluginApi`. `avandar.dataExplorer` exists only for `dataExplorer.toolbar` invocations that have a bridge. The plugin-visible `context` stays plain data.
2. **The SQL to wrap is the result's `executedSql`.** It is the SQL behind the rows and columns the plugin saw. Every manual-form edit already writes `rawSql`, so for nearly every result it equals the explorer's savable SQL. When the result on screen has changed by the time `addColumns` runs, the call rejects with the existing `InvalidHandle` code.
3. **Applying is one state action, `applyDerivedColumnsSql`.** It sets `rawSql`, marks the form out of sync (the drawer's "Form is an approximation" badge says so), stamps a new analytics trigger `plugin_command`, clears `nlPrompt` (the prompt no longer describes the SQL), and does not parse the SQL: the wrapped SQL does not parse in the `postgresql` dialect, so a parse would only overwrite the form with a lossy approximation.
4. **Existing columns keep their column IDs.** Without help, every column of the wrapped query gets a new ID (the SQL key changed and the CTE has no projections), and the user's chart points at columns that no longer exist. `applyDerivedColumnsSql` re-keys the current column bindings to the wrapped SQL, and `useQueryResultColumnBindings` prefers a seed registry whose key matches the SQL it is binding. Pass-through columns then match by name and keep their IDs. Undo restores the original bindings the same way.
5. **Undo restores a snapshot.** `DerivedColumnsSnapshot` holds `rawSql`, `query`, `isStructuredQueryInSync`, `sqlSyncWarnings`, `vizConfig`, `columnBindings`, `sourceCatalog`, and `nlPrompt`. Undo applies it only while the explorer still holds the wrapped SQL; after a later change it shows a warning instead of clobbering newer work.
6. **Expression check: two parser dialects, then QETL.** `node-sql-parser`'s `postgresql` dialect rejects `RANGE BETWEEN INTERVAL 6 DAY PRECEDING`, and only `snowflake` accepts it, so the check tries `postgresql` then `snowflake`. It is a shape check (exactly one scalar or window expression, no `FROM`, no subquery, no `;` or comments). The query engine's fail-closed SQL analyzer remains the security boundary.
7. **`avandar.ui.closeModal()` is new.** The spec's commands collect input in a modal, then change the query underneath it. The modal closes itself on success through this small API rather than the host closing modals as a side effect of `addColumns`.
8. **`addColumns` resolves to the final names.** `AddColumnsResult.columnNames` reports the names after `_2`, `_3` clash suffixes, so a plugin can mention them. Clashes compare case-insensitively, because DuckDB would otherwise rename a case-only clash to `name:1`.
9. **Rolling-average names are slugged.** `<value>_<n>d_avg` must match `^[a-z][a-z0-9_]*$`, and a source column such as `New Cases` does not, so the plugin slugs the value column's name first (`new_cases_7d_avg`).
10. **`query:addColumns` is declared, not enforced,** like `data:context` in 1a. The spec's non-goals defer enforcement to the Milestone 2 broker.
11. **`SegmentedControl` joins `@avandar/plugin-ui`.** Both modals need a two-way choice (population column or fixed number; days or weeks).
12. **Rule over handoff on private helper names.** The handoff said never `_build`, but `docs/rules/typescript.md` explicitly allows `_build...` for private helpers, and project rules win.
13. **Small choices the drafts made, all tested.** A negative case count gives NULL bounds, because DuckDB fails the whole query on `sqrt` of a negative number. The rolling average's group-by offers any column except the value and date columns, since district and FIPS codes are often numbers. The two modals share three helpers under `plugins/epidemiology/src/derivedColumns/`. `notifyDerivedColumnsAdded` hides an open notification before showing a new one, because Mantine ignores a second `show` with the same id and would drop the second Undo.
14. **Tests that need two files go in `__tests__/`.** A function with a unit test and an executed test keeps both in `<function>/__tests__/`, because `docs/rules/testing.md` allows one test file per directory outside `__tests__/`. Plugin executed tests open their own DuckDB instance: the plugin import rule rejects the repo's `withDuckDb` helper.

## Task index

| # | Task | Area |
| --- | --- | --- |
| 1 | SDK: `DerivedColumn`, `AddColumnsResult`, `avandar.dataExplorer`, `ui.closeModal`, `InvalidExpression` | SDK, host |
| 2 | Manifest: `query:addColumns` permission and its line on the plugin card | Manifest, settings |
| 3 | plugin-ui: export `SegmentedControl` | plugin-ui |
| 4 | `assertSingleSqlExpression` | Host, lazy |
| 5 | `makeDerivedColumnsSqlFromColumns` | Host, lazy |
| 6 | Bridge type, `addColumnsForInvocation`, and threading the bridge to `makePluginApi` | Host |
| 7 | Data Explorer state: `plugin_command` trigger, `applyDerivedColumnsSql`, `restoreDerivedColumnsSnapshot` | Data Explorer |
| 8 | Column bindings keep their IDs when the explorer wraps its SQL | Data Explorer |
| 9 | Data Explorer: `useDataExplorerPluginBridge`, the Undo notification, and `DataExplorerApp` wiring | Data Explorer |
| 10 | Epidemiology: `makeColumnNameSlugFromName` | Plugin |
| 11 | Epidemiology: `makeIncidenceColumnsFromOptions` and Byar intervals | Plugin |
| 12 | Epidemiology: `makeRollingAverageColumnFromOptions` | Plugin |
| 13 | Epidemiology: `IncidenceModal` | Plugin |
| 14 | Epidemiology: `RollingAverageModal` | Plugin |
| 15 | Epidemiology: manifest commands, permission, locale strings, and `definePlugin` wiring | Plugin |
| 16 | `docs/plugin-authoring.md`: `addColumns` | Docs |
| 17 | Extract and compile the translation catalogs | i18n |
| 18 | E2E: Incidence per 100k, then the rate plot draws its whiskers | E2E |
| 19 | Final verification, every check on its own | All |

Tasks 1 to 9 are ordered by dependency. Tasks 10 to 12 depend only on Task 1. Tasks 13 and 14 need Tasks 1, 3, and 10 to 12. Task 15 needs 13 and 14. Run them in order anyway: one implementer at a time keeps the shared worktree clean.

## How the plan was verified

Each task was drafted and applied in a scratch worktree, run red then green, type-checked, linted, and committed there. The host tasks ran on `origin/demo/measles` at `6915c456e`, the base this branch now sits on. The epidemiology tasks ran on `17d250246` on top of a scaffold holding Tasks 1 to 3's types; every Part A file they touch is identical on both bases. Task 18 (E2E) was never run, and the modals were tested only against a fake `AvandarApi`.

---

## Tasks

### Task 1: SDK: `DerivedColumn`, `AddColumnsResult`, `avandar.dataExplorer`, `ui.closeModal`, `InvalidExpression`

**Files:**
- Modify: `packages/web/plugin-sdk/src/PluginApi.types.ts`
- Modify: `packages/web/plugin-sdk/src/index.ts`
- Modify: `packages/web/plugin-sdk/src/PluginError/PluginError.ts`
- Modify: `src/lib/plugins/makePluginApi/makePluginApi.tsx`
- Test: `src/lib/plugins/makePluginApi/makePluginApi.test.tsx`
- Modify: `plugins/epidemiology/src/index.test.tsx`
- Modify: `plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx`

**Context:** The SDK gains the two types `avandar.dataExplorer.addColumns` takes and returns, the optional `dataExplorer` member (only Task 6 fills it), the required `ui.closeModal`, and the `InvalidExpression` error code. Because `closeModal` is required, `makePluginApi` must implement it in this task or type-check breaks: Mantine's `modals.open` returns the modal's id, so the UI API remembers the last id this invocation opened and `closeModal` closes only that one. Widening the type also breaks the two hand-built `AvandarApi` fakes in the plugin's tests; the type-checker lists them (Step 6), and they get `closeModal: vi.fn()`. The type-only changes have no behavior to test on their own, so the red step is the `closeModal` test. Plugin-sdk tests run through its own package (`packages/**` is excluded from the root Vitest run).

- [ ] **Step 1: Write the failing `closeModal` tests**

In `src/lib/plugins/makePluginApi/makePluginApi.test.tsx`, import `waitFor`:

```tsx
// before
import { act, cleanup, render, screen } from "@/test-utils";
// after
import { act, cleanup, render, screen, waitFor } from "@/test-utils";
```

and add these two tests directly above `it("names the modal's close button", ...)`:

```tsx
  it("closes the modal the invocation opened", async () => {
    render(<ModalsProvider>{null}</ModalsProvider>);
    const api = _makeApiFromRows();
    act(() => {
      api.ui.openModal({ title: "Details", content: <p>modal body</p> });
    });
    await screen.findByText("modal body");

    act(() => {
      api.ui.closeModal();
    });

    await waitFor(() => {
      expect(screen.queryByText("modal body")).not.toBeInTheDocument();
    });
  });

  it("leaves open a modal another invocation opened", async () => {
    render(<ModalsProvider>{null}</ModalsProvider>);
    act(() => {
      _makeApiFromRows().ui.openModal({
        title: "Other",
        content: <p>other body</p>,
      });
    });
    await screen.findByText("other body");

    act(() => {
      _makeApiFromRows().ui.closeModal();
    });

    expect(screen.getByText("other body")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run src/lib/plugins/makePluginApi/makePluginApi.test.tsx`
Expected: FAIL, `Tests  2 failed | 14 passed (16)`, with `TypeError: api.ui.closeModal is not a function` and `TypeError: _makeApiFromRows(...).ui.closeModal is not a function`.

- [ ] **Step 3: Add the SDK types**

In `packages/web/plugin-sdk/src/PluginApi.types.ts`, add the two types directly above `/** Values interpolated into an ICU message. */`:

```ts
/** One computed column for `avandar.dataExplorer.addColumns`. */
export type DerivedColumn = Readonly<{
  /** Lowercase snake case, matching `^[a-z][a-z0-9_]*$`. */
  name: string;
  /**
   * One SQL scalar or window expression. `{placeholder}`s name keys of
   * `inputs`.
   */
  expression: string;
  /** Placeholder to the name of a column in the invoked-on result. */
  inputs: Readonly<Record<string, string>>;
}>;

/** What `avandar.dataExplorer.addColumns` resolves to. */
export type AddColumnsResult = Readonly<{
  /**
   * The names the columns were added under, after `_2`, `_3` clash suffixes,
   * in input order.
   */
  columnNames: readonly string[];
}>;
```

and replace the end of `AvandarApi`:

```ts
// before
  ui: Readonly<{
    openModal: (options: PluginOverlayOptions) => void;
    openDrawer: (options: PluginOverlayOptions) => void;
    notify: (options: PluginNotifyOptions) => void;
  }>;
  i18n: Readonly<{
    t: (key: string, values?: TranslationValues) => string;
  }>;
}>;
```

```ts
// after
  ui: Readonly<{
    openModal: (options: PluginOverlayOptions) => void;
    /**
     * Closes the modal this invocation opened last. Does nothing when it
     * opened none or that modal is already closed.
     */
    closeModal: () => void;
    openDrawer: (options: PluginOverlayOptions) => void;
    notify: (options: PluginNotifyOptions) => void;
  }>;
  i18n: Readonly<{
    t: (key: string, values?: TranslationValues) => string;
  }>;
  /**
   * Changes the Data Explorer query the command was invoked on. Present only
   * for commands run from the `dataExplorer.toolbar` slot.
   */
  dataExplorer?: Readonly<{
    /**
     * Adds computed columns to the query, reruns it, and offers the user
     * Undo. Rejects with a `PluginError`: `InvalidExpression` for a column
     * the host cannot add, `InvalidHandle` when the user changed the query
     * since invoking the command.
     */
    addColumns: (
      columns: readonly DerivedColumn[],
    ) => Promise<AddColumnsResult>;
  }>;
}>;
```

In `packages/web/plugin-sdk/src/index.ts`, export both types (alphabetical):

```ts
// before
export type {
  AvandarApi,
  CommandHandler,
  DataExplorerToolbarContext,
  FetchRowsOptions,
```

```ts
// after
export type {
  AddColumnsResult,
  AvandarApi,
  CommandHandler,
  DataExplorerToolbarContext,
  DerivedColumn,
  FetchRowsOptions,
```

- [ ] **Step 4: Add the `InvalidExpression` code**

In `packages/web/plugin-sdk/src/PluginError/PluginError.ts`:

```ts
// before
 * - `InvalidHandle`: the call named a `QueryHandle` the host does not know.
 * - `LoadFailed`: the plugin's code or data could not be loaded.
 * - `CommandFailed`: a command handler, or SDK code it called, threw.
 */
export type PluginErrorCode =
  | "PermissionDenied"
  | "InvalidHandle"
  | "LoadFailed"
  | "CommandFailed";
```

```ts
// after
 * - `InvalidHandle`: the call named a `QueryHandle` the host does not know,
 *   or the Data Explorer no longer shows the result the command was invoked
 *   on.
 * - `LoadFailed`: the plugin's code or data could not be loaded.
 * - `CommandFailed`: a command handler, or SDK code it called, threw.
 * - `InvalidExpression`: `avandar.dataExplorer.addColumns` got a column it
 *   cannot add: a bad name, a placeholder with no input, an input naming a
 *   column the result does not have, an expression that is not exactly one
 *   SQL scalar or window expression, or an empty list.
 */
export type PluginErrorCode =
  | "PermissionDenied"
  | "InvalidHandle"
  | "LoadFailed"
  | "CommandFailed"
  | "InvalidExpression";
```

- [ ] **Step 5: Implement `closeModal` in `makePluginApi`**

In `src/lib/plugins/makePluginApi/makePluginApi.tsx`, inside `_makeUiApi`:

```tsx
// before
  const isFromCurrentHost = (): boolean => {
    return PluginDrawerStore.getGeneration() === hostGeneration;
  };
  return {
    openModal: ({ title, content }) => {
      if (!isFromCurrentHost()) {
        return;
      }
      modals.open({
        title,
        size: "lg",
        children: wrapContent(content),
        closeButtonProps: { "aria-label": t`Close` },
      });
    },
    openDrawer: ({ title, content }) => {
```

```tsx
// after
  const isFromCurrentHost = (): boolean => {
    return PluginDrawerStore.getGeneration() === hostGeneration;
  };
  // The id of the modal this invocation opened last, which `closeModal`
  // closes. Other invocations' modals are never touched.
  let lastModalId: string | undefined;
  return {
    openModal: ({ title, content }) => {
      if (!isFromCurrentHost()) {
        return;
      }
      lastModalId = modals.open({
        title,
        size: "lg",
        children: wrapContent(content),
        closeButtonProps: { "aria-label": t`Close` },
      });
    },
    closeModal: () => {
      if (lastModalId !== undefined) {
        modals.close(lastModalId);
        lastModalId = undefined;
      }
    },
    openDrawer: ({ title, content }) => {
```

Run: `pnpm vitest run src/lib/plugins/makePluginApi/makePluginApi.test.tsx`
Expected: PASS, `Tests  16 passed (16)`.

- [ ] **Step 6: Let the type-checker list the fakes, then fix them**

Run: `pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: exactly the two fakes:

```
plugins/epidemiology/src/index.test.tsx(27,5): error TS2741: Property 'closeModal' is missing in type ...
plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx(56,5): error TS2741: Property 'closeModal' is missing in type ...
```

In `plugins/epidemiology/src/index.test.tsx`:

```tsx
// before
    ui: { openModal, openDrawer: vi.fn(), notify: vi.fn() },
// after
    ui: {
      openModal,
      closeModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
    },
```

In `plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx`:

```tsx
// before
    ui: { openModal: vi.fn(), openDrawer: vi.fn(), notify: vi.fn() },
// after
    ui: {
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
    },
```

Run: `pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: no output.

- [ ] **Step 7: Run the SDK and plugin tests, format, and lint**

Run: `pnpm --filter @avandar/plugin-sdk test`
Expected: `Test Files  5 passed (5)`, `Tests  47 passed (47)`.

Run: `pnpm vitest run plugins/epidemiology/src/index.test.tsx plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx`
Expected: `Test Files  2 passed (2)`, `Tests  21 passed (21)`.

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore packages/web/plugin-sdk/src/PluginApi.types.ts packages/web/plugin-sdk/src/PluginError/PluginError.ts packages/web/plugin-sdk/src/index.ts src/lib/plugins/makePluginApi/makePluginApi.tsx src/lib/plugins/makePluginApi/makePluginApi.test.tsx plugins/epidemiology/src/index.test.tsx plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx && pnpm exec eslint packages/web/plugin-sdk/src src/lib/plugins/makePluginApi plugins/epidemiology/src/index.test.tsx plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx`
Expected: `Finished in ...ms on 7 files` and no ESLint output.

- [ ] **Step 8: Commit**

```bash
git add packages/web/plugin-sdk/src/PluginApi.types.ts \
  packages/web/plugin-sdk/src/PluginError/PluginError.ts \
  packages/web/plugin-sdk/src/index.ts \
  src/lib/plugins/makePluginApi/makePluginApi.tsx \
  src/lib/plugins/makePluginApi/makePluginApi.test.tsx \
  plugins/epidemiology/src/index.test.tsx \
  plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): add the derived column SDK types and ui.closeModal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Manifest: `query:addColumns` permission and its line on the plugin card

**Files:**
- Modify: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`
- Test: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection.tsx`
- Test: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`

**Context:** `PLUGIN_PERMISSIONS` gains `query:addColumns`. Like `data:context`, it is declared and shown to admins but not enforced at runtime. Nothing in the database constrains granted permissions (`granted_permissions` is a plain text array), so no migration is needed. `PluginDataAccessSection` describes each permission through an exhaustive `matchLiteral`, so it needs the new line; the copy is a placeholder Pablo will replace. `PluginDataAccessSection` has no test file; `PluginDetails.test.tsx` renders it and already tests the `data:context` line, so the new test goes there. `docs/plugin-authoring.md` line 158 still says `data:context` is the only accepted value; the documentation task updates it.

- [ ] **Step 1: Write the failing schema test**

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`, add above `it("rejects a permission this schema version does not support", ...)`:

```ts
  it("accepts the query:addColumns permission", () => {
    const result = PluginManifestSchema.parse({
      ..._makeValidManifest(),
      permissions: ["data:context", "query:addColumns"],
    });
    expect(result.permissions).toEqual(["data:context", "query:addColumns"]);
  });
```

- [ ] **Step 2: Write the failing plugin card test**

In `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`, add above `it("says its charts see only their own rows when the plugin adds chart types", ...)`:

```tsx
  it("describes the query:addColumns permission in plain language", async () => {
    await _renderExpandedDetails(
      _makeManifest({
        hasToolbarCommand: true,
        hasChartTypes: false,
        permissions: ["data:context", "query:addColumns"],
      }),
    );

    expect(
      screen.getByText(
        "Add calculated columns to a Data Explorer query when you run one of its tools",
      ),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run both and confirm they fail**

Run: `pnpm --filter @avandar/plugin-manifest exec vitest run src/PluginManifest/PluginManifestSchema.test.ts`
Expected: FAIL, `Tests  1 failed | 55 passed (56)`, a `ZodError` with `"message": "Invalid input: expected \"data:context\""`.

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`
Expected: FAIL, `Tests  1 failed | 12 passed (13)`, `Error: No matching value found for input: query:addColumns`.

- [ ] **Step 4: Add the permission**

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`:

```ts
// before
/** Permissions a manifest may request in this version of the schema. */
export const PLUGIN_PERMISSIONS = ["data:context"] as const;
```

```ts
// after
/**
 * Permissions a manifest may request in this version of the schema.
 * `data:context` lets a command read the rows of the result it was invoked
 * on, and `query:addColumns` lets a Data Explorer toolbar command add
 * computed columns to that result's query.
 */
export const PLUGIN_PERMISSIONS = ["data:context", "query:addColumns"] as const;
```

- [ ] **Step 5: Describe it on the plugin card**

In `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection.tsx`:

```tsx
// before
      text: matchLiteral(permission, {
        "data:context": t`A query result's rows, only when you run one of its tools on that result`,
      }),
```

```tsx
// after
      text: matchLiteral(permission, {
        "data:context": t`A query result's rows, only when you run one of its tools on that result`,
        "query:addColumns": t`Add calculated columns to a Data Explorer query when you run one of its tools`,
      }),
```

- [ ] **Step 6: Run the tests and checks**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: `Test Files  9 passed (9)`, `Tests  157 passed (157)`.

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`
Expected: `Tests  13 passed (13)`.

Run: `pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: no output.

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection.tsx src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx && pnpm exec eslint packages/shared/plugin-manifest/src/PluginManifest src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails`
Expected: `Finished in ...ms on 4 files` and no ESLint output.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts \
  packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts \
  src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection.tsx \
  src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): add the query:addColumns permission

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: plugin-ui: export `SegmentedControl`

**Files:**
- Modify: `packages/web/plugin-ui/src/index.ts`
- Modify: `packages/web/plugin-ui/README.md`
- Modify: `docs/plugin-authoring.md`
- Modify: `docs/avandar-packages.md`

**Context:** Both epidemiology modals pick between options with a segmented control (population source, rate base, window unit). `@avandar/plugin-ui` is the only UI plugins may import, so it re-exports Mantine's `SegmentedControl`, in alphabetical order (`SegmentedControl` sorts before `Select`). Nothing else pins the export list: there is no export snapshot or export test, `verify:packages` packs and type-checks the tarball without listing names, and the plugin ESLint allowlist matches the package name, not its members. Three docs list the components, so they gain the name. A test that only checks the export exists would restate the type system (`docs/rules/testing.md`), so this task has no red step: the epidemiology modal tests exercise it.

- [ ] **Step 1: Export it**

In `packages/web/plugin-ui/src/index.ts`:

```ts
// before
  NumberInput,
  Select,
// after
  NumberInput,
  SegmentedControl,
  Select,
```

- [ ] **Step 2: List it in the package README**

In `packages/web/plugin-ui/README.md`:

```md
<!-- before -->
| `Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`, `NumberInput`, `Select`, `SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`, `Title` | Components | Re-exported from Mantine with Avandar's theme |
<!-- after -->
| `Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`, `NumberInput`, `SegmentedControl`, `Select`, `SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`, `Title` | Components | Re-exported from Mantine with Avandar's theme |
```

- [ ] **Step 3: List it in the plugin authoring guide**

In `docs/plugin-authoring.md`, replace the paragraph that starts "Build plugin UI only from":

```md
<!-- before -->
Build plugin UI only from `@avandar/plugin-ui`: `Alert`, `Badge`, `Button`,
`Divider`, `Group`, `Loader`, `NumberInput`, `Select`, `SimpleGrid`, `Stack`,
`Table`, `Text`, `TextInput`, and `Title`, and draw component charts only from
`@avandar/plugin-ui/charts`. Every API call is async or fire-and-forget and
passes serializable data, with three exceptions: the synchronous `i18n.t`, the
React `content` of `openModal` and `openDrawer`, and chart components, which
are React components too.
```

```md
<!-- after -->
Build plugin UI only from `@avandar/plugin-ui`: `Alert`, `Badge`, `Button`,
`Divider`, `Group`, `Loader`, `NumberInput`, `SegmentedControl`, `Select`,
`SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`, and `Title`, and draw
component charts only from `@avandar/plugin-ui/charts`. Every API call is async
or fire-and-forget and passes serializable data, with three exceptions: the
synchronous `i18n.t`, the React `content` of `openModal` and `openDrawer`, and
chart components, which are React components too.
```

- [ ] **Step 4: List it in the packages overview**

In `docs/avandar-packages.md`, under the `@avandar/plugin-ui` heading:

```md
<!-- before -->
The components plugin UI may render. Re-exports a small set of Mantine
components (`Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`,
`NumberInput`, `Select`, `SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`,
`Title`). Its `@avandar/plugin-ui/charts` entry re-exports a curated set of
Recharts components plus `useChartTheme`, for plugin chart components.
```

```md
<!-- after -->
The components plugin UI may render. Re-exports a small set of Mantine
components (`Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`,
`NumberInput`, `SegmentedControl`, `Select`, `SimpleGrid`, `Stack`, `Table`,
`Text`, `TextInput`, `Title`). Its `@avandar/plugin-ui/charts` entry
re-exports a curated set of Recharts components plus `useChartTheme`, for
plugin chart components.
```

- [ ] **Step 5: Check the package**

Run: `pnpm --filter @avandar/plugin-ui type-check && pnpm --filter @avandar/plugin-ui test`
Expected: `tsc --noEmit` with no errors, then `Test Files  1 passed (1)`, `Tests  6 passed (6)`.

Run: `pnpm exec eslint packages/web/plugin-ui/src/index.ts && pnpm exec oxfmt --ignore-path .oxfmtignore --check packages/web/plugin-ui/src/index.ts`
Expected: no ESLint output, then `All matched files use the correct format.`

- [ ] **Step 6: Commit**

```bash
git add packages/web/plugin-ui/src/index.ts packages/web/plugin-ui/README.md \
  docs/plugin-authoring.md docs/avandar-packages.md
git commit -m "$(cat <<'EOF'
feat(plugin-ui): export SegmentedControl

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `assertSingleSqlExpression`

**Files:**
- Create: `src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.ts`
- Test: `src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.test.ts`

**Context:** A plugin's expression is spliced into the Data Explorer's SQL, so the host must prove it can only add a column. The function rejects `;`, `--`, and `/*` before parsing (they could end the expression or hide text from the parser), then parses `SELECT <expression>` with `node-sql-parser`. It tries the `postgresql` dialect first and falls back to `snowflake`, because `postgresql` rejects `RANGE BETWEEN INTERVAL 6 DAY PRECEDING`, which the rolling average needs. It accepts only one `select` statement with one column that is not `*` and has no alias, no clause (`FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `WITH`, `LIMIT`, a set operation), and no nested `select` anywhere in the column. `groupby` is typed as an object with `columns` but is `null` at runtime, and `limit` can be `null` in some dialects, so both are read null-safely. It lives under `src/lib/plugins/derivedColumns/`, which only the lazily loaded runner reaches.

- [ ] **Step 1: Write the failing test**

`src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.test.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import { assertSingleSqlExpression } from "@/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression";

/**
 * The `PluginError` code `assertSingleSqlExpression` throws for `expression`,
 * undefined when it accepts it, or `"not a PluginError"` for any other throw.
 */
function _getThrownCode(expression: string): string | undefined {
  try {
    assertSingleSqlExpression(expression);
    return undefined;
  } catch (error) {
    return error instanceof PluginError ? error.code : "not a PluginError";
  }
}

describe("assertSingleSqlExpression", () => {
  it("accepts arithmetic that divides through NULLIF", () => {
    expect(
      _getThrownCode(`"case_count" * 100000.0 / NULLIF("pop_2024", 0)`),
    ).toBeUndefined();
  });

  it("accepts a CASE expression that calls power and sqrt", () => {
    expect(
      _getThrownCode(
        `CASE WHEN "cases" = 0 THEN 0 ELSE "cases" * power(1 - 1 / (9.0 * "cases") - 1.96 / (3.0 * sqrt("cases")), 3) END`,
      ),
    ).toBeUndefined();
  });

  it("accepts a window over a date range with PARTITION BY", () => {
    expect(
      _getThrownCode(
        `avg("cases") OVER (PARTITION BY "borough" ORDER BY "date" RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)`,
      ),
    ).toBeUndefined();
  });

  it("accepts a window over a date range without PARTITION BY", () => {
    expect(
      _getThrownCode(
        `avg("cases") OVER (ORDER BY "date" RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)`,
      ),
    ).toBeUndefined();
  });

  it.each([
    ["a statement separator", `"a"; DROP TABLE t`],
    ["a line comment", `"a" -- comment`],
    ["a block comment", `"a" /* comment */`],
    ["a subquery", `(SELECT 1)`],
    ["a subquery inside arithmetic", `"a" + (SELECT max("x") FROM t)`],
    ["a FROM clause", `"a" FROM t`],
    ["a WHERE clause", `"a" WHERE 1 = 1`],
    ["a GROUP BY clause", `"a" GROUP BY 1`],
    ["a HAVING clause", `count(*) HAVING count(*) > 1`],
    ["an ORDER BY clause", `"a" ORDER BY 1`],
    ["a LIMIT clause", `"a" LIMIT 1`],
    ["a UNION", `"a" UNION SELECT 1`],
    ["two expressions", `"a", "b"`],
    ["an alias", `"a" AS b`],
    ["a star", `*`],
    ["an empty string", ``],
    ["text that is not SQL", `)(*& not sql`],
  ])("rejects %s with InvalidExpression", (_label, expression) => {
    expect(_getThrownCode(expression)).toBe("InvalidExpression");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/derivedColumns/assertSingleSqlExpression`
Expected: FAIL, `Error: Failed to resolve import "@/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression"`.

- [ ] **Step 3: Implement it**

`src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { Parser } from "node-sql-parser";
import type { AST, Select } from "node-sql-parser";

/**
 * Text that could end the expression early or hide what follows it from the
 * parser. Rejected before parsing, even inside a string literal.
 */
const FORBIDDEN_SQL_TOKENS = [";", "--", "/*"] as const;

/**
 * The parser dialects tried in order. `postgresql` reads most DuckDB
 * expressions, and `snowflake` reads the window frames `postgresql` rejects,
 * such as `RANGE BETWEEN INTERVAL 6 DAY PRECEDING`.
 */
const PARSER_DATABASES = ["postgresql", "snowflake"] as const;

function _parseSqlOrUndefined(
  sql: string,
  database: (typeof PARSER_DATABASES)[number],
): AST | AST[] | undefined {
  try {
    return new Parser().astify(sql, { database });
  } catch {
    return undefined;
  }
}

function _hasNestedSelect(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some(_hasNestedSelect);
  }
  if (typeof node !== "object" || node === null) {
    return false;
  }
  return (
    ("type" in node && node.type === "select") ||
    Object.values(node).some(_hasNestedSelect)
  );
}

function _isStarColumn(column: unknown): boolean {
  if (typeof column !== "object" || column === null || !("expr" in column)) {
    return false;
  }
  const { expr } = column;
  return (
    typeof expr === "object" &&
    expr !== null &&
    "column" in expr &&
    expr.column === "*"
  );
}

function _hasClause(select: Select): boolean {
  return (
    select.from !== null ||
    select.where !== null ||
    (select.groupby?.columns ?? null) !== null ||
    select.having !== null ||
    select.orderby !== null ||
    select.with !== null ||
    select._next !== undefined ||
    select.set_op !== undefined ||
    (select.limit?.value.length ?? 0) > 0
  );
}

function _isSingleExpressionSelect(parsed: AST | AST[]): boolean {
  const statements = Array.isArray(parsed) ? parsed : [parsed];
  const [statement] = statements;
  if (statements.length !== 1 || statement?.type !== "select") {
    return false;
  }
  const [column] = statement.columns;
  return (
    statement.columns.length === 1 &&
    !_isStarColumn(column) &&
    !column?.as &&
    !_hasClause(statement) &&
    !_hasNestedSelect(statement.columns)
  );
}

/**
 * Throws `PluginError("InvalidExpression")` unless `expression` is exactly
 * one SQL scalar or window expression: no alias, no clause, no subquery, no
 * second expression, and no `;` or comment. Used before a plugin's
 * expression is spliced into the Data Explorer's SQL, so it can only add a
 * column and never change what the query reads.
 */
export function assertSingleSqlExpression(expression: string): void {
  if (
    FORBIDDEN_SQL_TOKENS.some((token) => {
      return expression.includes(token);
    })
  ) {
    throw new PluginError(
      "InvalidExpression",
      `The expression must not contain ";", "--", or "/*": ${expression}`,
    );
  }
  const sql = `SELECT ${expression}`;
  const parsed = PARSER_DATABASES.reduce<AST | AST[] | undefined>(
    (result, database) => {
      return result ?? _parseSqlOrUndefined(sql, database);
    },
    undefined,
  );
  if (parsed === undefined || !_isSingleExpressionSelect(parsed)) {
    throw new PluginError(
      "InvalidExpression",
      `The expression must be one SQL scalar or window expression, with no alias, clause, or subquery: ${expression}`,
    );
  }
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm vitest run src/lib/plugins/derivedColumns/assertSingleSqlExpression`
Expected: PASS, `Tests  21 passed (21)`.

- [ ] **Step 5: Format, lint, and type-check**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.ts src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.test.ts && pnpm exec eslint src/lib/plugins/derivedColumns/assertSingleSqlExpression && pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: `Finished in ...ms on 2 files`, no ESLint output, and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.ts \
  src/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): check that a derived column is one SQL expression

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `makeDerivedColumnsSqlFromColumns`

**Files:**
- Create: `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns.ts`
- Test: `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts`
- Test: `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts`

**Context:** This builds the SQL `addColumns` runs. It validates each column (name pattern, every input names an existing column, every `{placeholder}` bound), replaces each placeholder with the column's quoted identifier through `quoteSqlIdentifier` from `@avandar/utils/sql` (embedded `"` doubled), checks the result with `assertSingleSqlExpression` (Task 4), and picks free names: compared lowercase against the existing columns and the names added before it, the first clash gets `_2`, then `_3`. The base SQL goes through `normalizeSqlForSubquery`, which drops a trailing `;` and comments that would otherwise comment out the wrapper's `)`. The wrapper numbers the base rows with `row_number() OVER ()` and orders by that number at the end, so a window column cannot reorder the result, and `EXCLUDE (__ava_row)` hides the number. The module has a unit test and an executed test, so both go in `__tests__/`. The executed test runs the SQL in DuckDB through `withDuckDb` and proves the row order and the hidden row number; removing `ORDER BY __ava_row` from the wrapper turns it red.

- [ ] **Step 1: Write the failing unit test**

`src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import type { DerivedColumn } from "@avandar/plugin-sdk";

const BASE_SQL = `SELECT "borough", "cases", "pop" FROM "nyc"`;

const EXISTING_COLUMN_NAMES = ["borough", "cases", "pop"];

const RATE_COLUMN: DerivedColumn = {
  name: "rate",
  expression: "{cases} * 100000.0 / NULLIF({population}, 0)",
  inputs: { cases: "cases", population: "pop" },
};

function _makeSqlFromColumns(
  columns: readonly DerivedColumn[],
  existingColumnNames: readonly string[] = EXISTING_COLUMN_NAMES,
): Readonly<{ sql: string; columnNames: readonly string[] }> {
  return makeDerivedColumnsSqlFromColumns({
    baseSql: BASE_SQL,
    existingColumnNames,
    columns,
  });
}

/**
 * The `PluginError` code `makeDerivedColumnsSqlFromColumns` throws for
 * `columns`, undefined when it does not throw.
 */
function _getThrownCode(columns: readonly DerivedColumn[]): string | undefined {
  try {
    _makeSqlFromColumns(columns);
    return undefined;
  } catch (error) {
    return error instanceof PluginError ? error.code : "not a PluginError";
  }
}

describe("makeDerivedColumnsSqlFromColumns", () => {
  it("wraps the base SQL and appends each column in order", () => {
    const { sql } = _makeSqlFromColumns([
      RATE_COLUMN,
      { name: "double_cases", expression: "{c} * 2", inputs: { c: "cases" } },
    ]);

    expect(sql).toBe(
      [
        "WITH ava_source AS (",
        "  SELECT *, row_number() OVER () AS __ava_row FROM (",
        `SELECT "borough", "cases", "pop" FROM "nyc"`,
        "  )",
        ")",
        "SELECT * EXCLUDE (__ava_row),",
        `  ("cases" * 100000.0 / NULLIF("pop", 0)) AS "rate",`,
        `  ("cases" * 2) AS "double_cases"`,
        "FROM ava_source",
        "ORDER BY __ava_row",
      ].join("\n"),
    );
  });

  it("quotes an input column whose name has spaces and a double quote", () => {
    const { sql } = _makeSqlFromColumns(
      [{ name: "doubled", expression: "{c} * 2", inputs: { c: 'case "n" 1' } }],
      ['case "n" 1'],
    );

    expect(sql).toContain(`  ("case ""n"" 1" * 2) AS "doubled"`);
  });

  it("drops a trailing semicolon and line comment from the base SQL", () => {
    const { sql } = makeDerivedColumnsSqlFromColumns({
      baseSql: `  SELECT * FROM "nyc"; -- every borough\n`,
      existingColumnNames: EXISTING_COLUMN_NAMES,
      columns: [RATE_COLUMN],
    });

    expect(sql).toContain(`FROM (\nSELECT * FROM "nyc"\n  )\n)`);
  });

  it("returns the added names in input order", () => {
    const { columnNames } = _makeSqlFromColumns([
      RATE_COLUMN,
      { name: "double_cases", expression: "{c} * 2", inputs: { c: "cases" } },
    ]);

    expect(columnNames).toEqual(["rate", "double_cases"]);
  });

  it("suffixes _2 to a name an existing column has in another case", () => {
    const { sql, columnNames } = _makeSqlFromColumns(
      [RATE_COLUMN],
      [...EXISTING_COLUMN_NAMES, "Rate"],
    );

    expect(columnNames).toEqual(["rate_2"]);
    expect(sql).toContain(`AS "rate_2"`);
  });

  it("suffixes _3 when the _2 name is taken too", () => {
    const { columnNames } = _makeSqlFromColumns(
      [RATE_COLUMN],
      [...EXISTING_COLUMN_NAMES, "rate", "rate_2"],
    );

    expect(columnNames).toEqual(["rate_3"]);
  });

  it("suffixes a name that an earlier added column took", () => {
    const { columnNames } = _makeSqlFromColumns([RATE_COLUMN, RATE_COLUMN]);

    expect(columnNames).toEqual(["rate", "rate_2"]);
  });

  it.each([
    ["an uppercase letter", "Rate"],
    ["a leading digit", "1rate"],
    ["a hyphen", "rate-x"],
    ["an empty string", ""],
  ])("rejects a name with %s", (_label, name) => {
    expect(_getThrownCode([{ ...RATE_COLUMN, name }])).toBe(
      "InvalidExpression",
    );
  });

  it("rejects a placeholder with no input", () => {
    expect(
      _getThrownCode([{ ...RATE_COLUMN, inputs: { cases: "cases" } }]),
    ).toBe("InvalidExpression");
  });

  it("rejects an input naming a column the result does not have", () => {
    expect(
      _getThrownCode([
        { ...RATE_COLUMN, inputs: { cases: "cases", population: "people" } },
      ]),
    ).toBe("InvalidExpression");
  });

  it("rejects an empty column list", () => {
    expect(_getThrownCode([])).toBe("InvalidExpression");
  });

  it("rejects an expression that is not a single SQL expression", () => {
    expect(
      _getThrownCode([
        {
          name: "leak",
          expression: "{c} FROM secrets",
          inputs: { c: "cases" },
        },
      ]),
    ).toBe("InvalidExpression");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns`
Expected: FAIL, `Error: Failed to resolve import "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns"`.

- [ ] **Step 3: Implement it**

`src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import {
  normalizeSqlForSubquery,
  quoteSqlIdentifier,
} from "@avandar/utils/sql";
import { assertSingleSqlExpression } from "@/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression";
import type { DerivedColumn } from "@avandar/plugin-sdk";

/** The names a derived column may take: lowercase snake case. */
const COLUMN_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** A `{placeholder}` in an expression, capturing the key it names. */
const PLACEHOLDER_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

function _buildExpressionSql(
  column: DerivedColumn,
  existingColumnNames: ReadonlySet<string>,
): string {
  if (!COLUMN_NAME_PATTERN.test(column.name)) {
    throw new PluginError(
      "InvalidExpression",
      `Column name "${column.name}" must be lowercase letters, digits, and underscores, starting with a letter.`,
    );
  }
  Object.values(column.inputs).forEach((inputColumnName) => {
    if (!existingColumnNames.has(inputColumnName)) {
      throw new PluginError(
        "InvalidExpression",
        `Column "${column.name}" reads "${inputColumnName}", which this query result does not have.`,
      );
    }
  });
  const expressionSql = column.expression.replace(
    PLACEHOLDER_PATTERN,
    (_placeholder, key: string) => {
      const inputColumnName = Object.hasOwn(column.inputs, key)
        ? column.inputs[key]
        : undefined;
      if (inputColumnName === undefined) {
        throw new PluginError(
          "InvalidExpression",
          `Column "${column.name}" uses {${key}}, which its inputs do not bind.`,
        );
      }
      return quoteSqlIdentifier(inputColumnName);
    },
  );
  assertSingleSqlExpression(expressionSql);
  return expressionSql;
}

function _buildFreeName(
  name: string,
  takenNames: ReadonlySet<string>,
  suffix: number = 1,
): string {
  const candidate = suffix === 1 ? name : `${name}_${suffix}`;
  return takenNames.has(candidate.toLowerCase())
    ? _buildFreeName(name, takenNames, suffix + 1)
    : candidate;
}

function _buildAddedColumns(
  columns: readonly DerivedColumn[],
  existingColumnNames: readonly string[],
): Array<{ name: string; expressionSql: string }> {
  const existingNameSet = new Set(existingColumnNames);
  const takenNames = new Set(
    existingColumnNames.map((name) => {
      return name.toLowerCase();
    }),
  );
  return columns.map((column) => {
    const expressionSql = _buildExpressionSql(column, existingNameSet);
    // Names are lowercase, so the free name can join the lowercased set as is.
    const name = _buildFreeName(column.name, takenNames);
    takenNames.add(name);
    return { name, expressionSql };
  });
}

/**
 * Makes the SQL that adds `columns` to the result of `baseSql`, plus the
 * names the columns were added under (a name already in the result, compared
 * case-insensitively, gets `_2`, then `_3`, and so on). Each `{placeholder}`
 * becomes the quoted identifier of the column its input names. A row number
 * keeps the base query's row order, which a window expression would
 * otherwise change.
 *
 * Throws `PluginError("InvalidExpression")` for an empty list, a bad name, an
 * unbound placeholder, an input naming a column not in
 * `existingColumnNames`, or an expression that is not exactly one SQL
 * expression. Used by `addColumnsForInvocation` for
 * `avandar.dataExplorer.addColumns`.
 */
export function makeDerivedColumnsSqlFromColumns(
  options: Readonly<{
    baseSql: string;
    existingColumnNames: readonly string[];
    columns: readonly DerivedColumn[];
  }>,
): Readonly<{ sql: string; columnNames: readonly string[] }> {
  const { baseSql, existingColumnNames, columns } = options;
  if (columns.length === 0) {
    throw new PluginError(
      "InvalidExpression",
      "addColumns needs at least one column.",
    );
  }
  const addedColumns = _buildAddedColumns(columns, existingColumnNames);
  const sql = [
    "WITH ava_source AS (",
    "  SELECT *, row_number() OVER () AS __ava_row FROM (",
    normalizeSqlForSubquery(baseSql),
    "  )",
    ")",
    "SELECT * EXCLUDE (__ava_row),",
    addedColumns
      .map(({ name, expressionSql }) => {
        return `  (${expressionSql}) AS ${quoteSqlIdentifier(name)}`;
      })
      .join(",\n"),
    "FROM ava_source",
    "ORDER BY __ava_row",
  ].join("\n");
  return {
    sql,
    columnNames: addedColumns.map((addedColumn) => {
      return addedColumn.name;
    }),
  };
}
```

- [ ] **Step 4: Run the unit test and confirm it passes**

Run: `pnpm vitest run src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns`
Expected: PASS, `Tests  15 passed (15)`. (The root Vitest config excludes `*.executed.test.ts`, so this runs only the unit test.)

- [ ] **Step 5: Write the executed test**

`src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";

/**
 * Three days of cases, returned newest first, so a window ordered by day runs
 * against the base query's row order.
 */
const BASE_SQL = `
  SELECT *
  FROM (VALUES
    (1, DATE '2024-01-01', 10),
    (2, DATE '2024-01-02', 20),
    (3, DATE '2024-01-03', 30)
  ) AS cases_by_day(id, day, cases)
  ORDER BY day DESC;
`;

const { sql: DERIVED_SQL } = makeDerivedColumnsSqlFromColumns({
  baseSql: BASE_SQL,
  existingColumnNames: ["id", "day", "cases"],
  columns: [
    {
      name: "cases_2d_avg",
      expression:
        "avg({cases}) OVER (ORDER BY {day} RANGE BETWEEN INTERVAL 1 DAY PRECEDING AND CURRENT ROW)",
      inputs: { cases: "cases", day: "day" },
    },
  ],
});

describe("makeDerivedColumnsSqlFromColumns in DuckDB", () => {
  it("keeps the base query's row order when a window column is added", async () => {
    const rows = await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(DERIVED_SQL);
      return reader.getRowObjectsJson();
    });

    expect(
      rows.map((row) => {
        return [row.id, row.cases_2d_avg];
      }),
    ).toEqual([
      [3, 25],
      [2, 15],
      [1, 10],
    ]);
  });

  it("returns the base columns and the added column, without the row number", async () => {
    const columnNames = await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(DERIVED_SQL);
      return reader.columnNames();
    });

    expect(columnNames).toEqual(["id", "day", "cases", "cases_2d_avg"]);
  });
});
```

- [ ] **Step 6: Run it in DuckDB**

Run: `pnpm test:executed src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts`
Expected: PASS, `Tests  2 passed (2)`. To see it guard the order, delete the `"ORDER BY __ava_row",` line from the implementation and rerun: `keeps the base query's row order when a window column is added` fails. Restore the line.

- [ ] **Step 7: Format, lint, and type-check**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns.ts src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts && pnpm exec eslint src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns && pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: `Finished in ...ms on 3 files`, no ESLint output, and no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns.ts \
  src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts \
  src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): wrap the Data Explorer SQL with derived columns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Bridge type, `addColumnsForInvocation`, and threading the bridge to `makePluginApi`

**Files:**
- Create: `src/lib/plugins/DataExplorerBridge.types.ts`
- Create: `src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.ts`
- Test: `src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.test.ts`
- Modify: `src/lib/plugins/makePluginApi/makePluginApi.tsx`
- Test: `src/lib/plugins/makePluginApi/makePluginApi.test.tsx`
- Modify: `src/lib/plugins/runPluginCommand/runPluginCommand.ts`
- Test: `src/lib/plugins/runPluginCommand/runPluginCommand.test.ts`
- Modify: `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.tsx`
- Test: `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx`
- Modify: `src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.ts`
- Test: `src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.test.tsx`

**Context:** The Data Explorer lends each toolbar invocation a `DataExplorerBridge`: the SQL behind the invoked-on result and a function that applies new SQL (Task 9 builds it). `addColumnsForInvocation` implements `addColumns` on top of it: no base SQL, or an apply that returns false because the user changed the query, throws `PluginError("InvalidHandle")`; an invalid column throws `InvalidExpression` from Task 5 before anything is applied. The bridge travels with the context: `PluginMenuSlot` takes an optional `getDataExplorerBridge` and calls it once per click, right after `getContext`; `usePluginCommandRunner` now takes an options object (its only callers are `PluginMenuSlot` and its own test); `runPluginCommand` and `makePluginApi` take an optional `dataExplorerBridge`. `makePluginApi` sets `dataExplorer` only for a `dataExplorer.toolbar` context with a bridge, and wraps `addColumns` in `async` so a throw reaches the plugin as a rejection. Everything under `src/lib/plugins/derivedColumns/` is imported only by `makePluginApi`, which stays behind the dynamic import in `loadRunPluginCommand`; the bridge file is type-only.

- [ ] **Step 1: Create the bridge type**

`src/lib/plugins/DataExplorerBridge.types.ts`:

```ts
/**
 * What the Data Explorer lends one toolbar command invocation so
 * `avandar.dataExplorer.addColumns` can change its query.
 *
 * Built by `useDataExplorerPluginBridge` when a command is clicked, carried
 * by `PluginMenuSlot`, `usePluginCommandRunner`, and `runPluginCommand` to
 * `makePluginApi`, and used by `addColumnsForInvocation`.
 */
export type DataExplorerBridge = Readonly<{
  /**
   * The SQL behind the result the command was invoked on, or undefined when
   * there is none.
   */
  baseSql: string | undefined;

  /**
   * Puts `sql` in the SQL editor, runs it, and offers Undo. Returns false,
   * changing nothing, when the explorer no longer shows the result the
   * command was invoked on.
   */
  applyDerivedColumnsSql: (
    options: Readonly<{ sql: string; columnNames: readonly string[] }>,
  ) => boolean;
}>;
```

- [ ] **Step 2: Write the failing `addColumnsForInvocation` test**

`src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.test.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { addColumnsForInvocation } from "@/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type {
  DataExplorerToolbarContext,
  DerivedColumn,
  QueryHandle,
} from "@avandar/plugin-sdk";

const CONTEXT: DataExplorerToolbarContext = {
  slotId: "dataExplorer.toolbar",
  queryHandle: "handle" as QueryHandle,
  columns: [
    { name: "cases", dataType: "bigint" },
    { name: "rate", dataType: "double" },
  ],
  rowCount: 2,
};

const RATE_COLUMN: DerivedColumn = {
  name: "rate",
  expression: "{cases} * 2",
  inputs: { cases: "cases" },
};

function _makeBridge(
  options: Readonly<{ baseSql?: string | undefined; isApplied?: boolean }> = {},
): DataExplorerBridge & {
  applyDerivedColumnsSql: ReturnType<typeof vi.fn>;
} {
  return {
    baseSql: "baseSql" in options ? options.baseSql : `SELECT * FROM "t"`,
    applyDerivedColumnsSql: vi.fn(() => {
      return options.isApplied ?? true;
    }),
  };
}

/**
 * The `PluginError` code `addColumnsForInvocation` throws with `bridge`,
 * undefined when it does not throw.
 */
function _getThrownCode(options: {
  bridge: DataExplorerBridge;
  columns?: readonly DerivedColumn[];
}): string | undefined {
  try {
    addColumnsForInvocation({
      context: CONTEXT,
      bridge: options.bridge,
      columns: options.columns ?? [RATE_COLUMN],
    });
    return undefined;
  } catch (error) {
    return error instanceof PluginError ? error.code : "not a PluginError";
  }
}

describe("addColumnsForInvocation", () => {
  it("applies the wrapped base SQL through the bridge", () => {
    const bridge = _makeBridge();

    addColumnsForInvocation({
      context: CONTEXT,
      bridge,
      columns: [RATE_COLUMN],
    });

    expect(bridge.applyDerivedColumnsSql).toHaveBeenCalledWith({
      sql: expect.stringContaining(`SELECT * FROM "t"\n`),
      columnNames: ["rate_2"],
    });
  });

  it("names the columns after the invoked-on result's columns", () => {
    const result = addColumnsForInvocation({
      context: CONTEXT,
      bridge: _makeBridge(),
      columns: [RATE_COLUMN],
    });

    expect(result.columnNames).toEqual(["rate_2"]);
  });

  it("throws InvalidHandle when the explorer has no SQL", () => {
    expect(
      _getThrownCode({ bridge: _makeBridge({ baseSql: undefined }) }),
    ).toBe("InvalidHandle");
  });

  it("throws InvalidHandle when the explorer no longer shows the result", () => {
    expect(_getThrownCode({ bridge: _makeBridge({ isApplied: false }) })).toBe(
      "InvalidHandle",
    );
  });

  it("applies nothing when a column is invalid", () => {
    const bridge = _makeBridge();

    const code = _getThrownCode({
      bridge,
      columns: [{ ...RATE_COLUMN, inputs: { cases: "deaths" } }],
    });

    expect(code).toBe("InvalidExpression");
    expect(bridge.applyDerivedColumnsSql).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Write the failing `makePluginApi` tests**

In `src/lib/plugins/makePluginApi/makePluginApi.test.tsx`, import the bridge type after the `@/test-utils` import:

```tsx
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
```

replace `_makeApiFromRows`, giving the context two columns and an optional bridge, and add `_makeBridge` after it:

```tsx
// before
function _makeApiFromRows(): AvandarApi {
  const context: DataExplorerToolbarContext = {
    slotId: "dataExplorer.toolbar",
    queryHandle: QueryHandleRegistry.getOrCreate(ROWS),
    columns: [],
    rowCount: ROWS.length,
  };
  return makePluginApi({
    pluginName: "Test plugin",
    context,
    workspace: { id: "w", slug: "w", locale: "es" },
    messages: { en: { greeting: "Hello" }, es: { greeting: "Hola" } },
  });
}
```

```tsx
// after
function _makeApiFromRows(dataExplorerBridge?: DataExplorerBridge): AvandarApi {
  const context: DataExplorerToolbarContext = {
    slotId: "dataExplorer.toolbar",
    queryHandle: QueryHandleRegistry.getOrCreate(ROWS),
    columns: [
      { name: "x", dataType: "bigint" },
      { name: "y", dataType: "varchar" },
    ],
    rowCount: ROWS.length,
  };
  return makePluginApi({
    pluginName: "Test plugin",
    context,
    workspace: { id: "w", slug: "w", locale: "es" },
    messages: { en: { greeting: "Hello" }, es: { greeting: "Hola" } },
    dataExplorerBridge,
  });
}

function _makeBridge(): DataExplorerBridge & {
  applyDerivedColumnsSql: ReturnType<typeof vi.fn>;
} {
  return {
    baseSql: `SELECT * FROM "t"`,
    applyDerivedColumnsSql: vi.fn(() => {
      return true;
    }),
  };
}
```

and add these tests above `it("names the modal's close button", ...)`:

```tsx
  it("adds columns through the Data Explorer bridge", async () => {
    const bridge = _makeBridge();
    const api = _makeApiFromRows(bridge);

    const result = await api.dataExplorer?.addColumns([
      { name: "double_x", expression: "{x} * 2", inputs: { x: "x" } },
    ]);

    expect(result).toEqual({ columnNames: ["double_x"] });
    expect(bridge.applyDerivedColumnsSql).toHaveBeenCalledTimes(1);
  });

  it("rejects addColumns with InvalidExpression for an invalid column", async () => {
    const api = _makeApiFromRows(_makeBridge());

    await expect(api.dataExplorer?.addColumns([])).rejects.toMatchObject({
      code: "InvalidExpression",
    });
  });

  it("gives no dataExplorer API to an invocation without a bridge", () => {
    expect(_makeApiFromRows().dataExplorer).toBeUndefined();
  });
```

- [ ] **Step 4: Write the failing `runPluginCommand` test**

In `src/lib/plugins/runPluginCommand/runPluginCommand.test.ts`, add above `it("reports no failure when the handler completes", ...)`:

```ts
  it("gives the handler a dataExplorer API that applies through the bridge", async () => {
    const applyDerivedColumnsSql = vi.fn(() => {
      return true;
    });
    await runPluginCommand({
      plugin: PLUGIN,
      pluginName: "Test",
      commandId: "hello",
      context: { ...CONTEXT, columns: [{ name: "x", dataType: "bigint" }] },
      workspace: WORKSPACE,
      dataExplorerBridge: {
        baseSql: `SELECT * FROM "t"`,
        applyDerivedColumnsSql,
      },
      loadCode: async () => {
        return _makeCodeModuleFromCommands({
          hello: async (avandar) => {
            await avandar.dataExplorer?.addColumns([
              { name: "double_x", expression: "{x} * 2", inputs: { x: "x" } },
            ]);
          },
        });
      },
    });

    expect(applyDerivedColumnsSql).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 5: Update the `usePluginCommandRunner` test to the options object and add a bridge test**

In `src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.test.tsx`, import the bridge type after the `@/test-utils` import:

```tsx
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
```

add a bridge fixture above `const ITEM = {`:

```tsx
const BRIDGE: DataExplorerBridge = {
  baseSql: "SELECT 1",
  applyDerivedColumnsSql: () => {
    return true;
  },
};
```

in both existing tests, change the hook call:

```tsx
// before
        return usePluginCommandRunner(() => {
          return CONTEXT;
        });
// after
        return usePluginCommandRunner({
          getContext: () => {
            return CONTEXT;
          },
        });
```

and add above `it("clears the running key once the command finishes", ...)`:

```tsx
  it("runs the command with the bridge it builds when the command runs", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    const getDataExplorerBridge = vi.fn(() => {
      return BRIDGE;
    });
    const { result } = renderHook(
      () => {
        return usePluginCommandRunner({
          getContext: () => {
            return CONTEXT;
          },
          getDataExplorerBridge,
        });
      },
      { wrapper: TestProviders },
    );
    expect(getDataExplorerBridge).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.run(ITEM);
    });

    expect(mocks.runPluginCommand).toHaveBeenCalledWith(
      expect.objectContaining({ dataExplorerBridge: BRIDGE }),
    );
  });
```

- [ ] **Step 6: Write the failing `PluginMenuSlot` tests**

In `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx`, import the bridge type after the `@/test-utils` import:

```tsx
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
```

add a mock to the hoisted `mocks`:

```tsx
// before
    getContext: vi.fn(),
  };
});
// after
    getContext: vi.fn(),
    getDataExplorerBridge: vi.fn(),
  };
});
```

add a bridge fixture above `const SLOT_ID = "dataExplorer.toolbar";`:

```tsx
const BRIDGE: DataExplorerBridge = {
  baseSql: "SELECT 1",
  applyDerivedColumnsSql: () => {
    return true;
  },
};
```

pass it in `_renderSlotWithItems`:

```tsx
// before
      facts={{ rowCount: 1 }}
    />,
// after
      getDataExplorerBridge={mocks.getDataExplorerBridge}
      facts={{ rowCount: 1 }}
    />,
```

reset it in `beforeEach`:

```tsx
// before
    mocks.getContext.mockReturnValue(CONTEXT);
  });
// after
    mocks.getContext.mockReturnValue(CONTEXT);
    mocks.getDataExplorerBridge.mockReset();
    mocks.getDataExplorerBridge.mockReturnValue(BRIDGE);
  });
```

and add above `it("loads the runner when a command is clicked", ...)`:

```tsx
  it("does not build the Data Explorer bridge when the slot renders", () => {
    _renderSlotWithItems({ itemCount: 2 });

    expect(mocks.getDataExplorerBridge).not.toHaveBeenCalled();
  });

  it("runs the clicked command with the Data Explorer bridge it builds", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    _renderSlotWithItems({ itemCount: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.runPluginCommand).toHaveBeenCalledWith(
        expect.objectContaining({ dataExplorerBridge: BRIDGE }),
      );
    });
    expect(mocks.getDataExplorerBridge).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 7: Run them and confirm they fail**

Run: `pnpm vitest run src/lib/plugins/makePluginApi src/lib/plugins/runPluginCommand src/lib/plugins/PluginMenuSlot src/lib/plugins/derivedColumns/addColumnsForInvocation`
Expected: FAIL, `Test Files  5 failed | 1 passed (6)`, `Tests  6 failed | 58 passed (64)`: `addColumnsForInvocation.test.ts` fails to resolve its import; `adds columns through the Data Explorer bridge` gets `expected undefined to deeply equal { columnNames: [ 'double_x' ] }`; the rejection test gets `You must provide a Promise to expect() when using .rejects, not 'undefined'`; the `runPluginCommand` test sees the bridge called 0 times; both `usePluginCommandRunner` tests that run a command throw `TypeError: getContext is not a function`; and the `PluginMenuSlot` bridge test never sees `dataExplorerBridge`.

- [ ] **Step 8: Implement `addColumnsForInvocation`**

`src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type {
  AddColumnsResult,
  DataExplorerToolbarContext,
  DerivedColumn,
} from "@avandar/plugin-sdk";

/** Why a stale or empty explorer rejects `addColumns`, for the plugin. */
const STALE_RESULT_MESSAGE =
  "This query result is no longer available. Run the command again.";

/**
 * Implements `avandar.dataExplorer.addColumns` for one toolbar invocation:
 * wraps the SQL behind the invoked-on result with `columns`, hands it to the
 * Data Explorer through `bridge`, and returns the names the columns were
 * added under. Called by `makePluginApi`.
 *
 * Throws `PluginError("InvalidExpression")` for a column it cannot add, and
 * `PluginError("InvalidHandle")` when the explorer has no SQL or no longer
 * shows the result the command was invoked on.
 */
export function addColumnsForInvocation(
  options: Readonly<{
    context: DataExplorerToolbarContext;
    bridge: DataExplorerBridge;
    columns: readonly DerivedColumn[];
  }>,
): AddColumnsResult {
  const { context, bridge, columns } = options;
  if (bridge.baseSql === undefined) {
    throw new PluginError("InvalidHandle", STALE_RESULT_MESSAGE);
  }
  const { sql, columnNames } = makeDerivedColumnsSqlFromColumns({
    baseSql: bridge.baseSql,
    existingColumnNames: context.columns.map((column) => {
      return column.name;
    }),
    columns,
  });
  if (!bridge.applyDerivedColumnsSql({ sql, columnNames })) {
    throw new PluginError("InvalidHandle", STALE_RESULT_MESSAGE);
  }
  return { columnNames };
}
```

- [ ] **Step 9: Give `makePluginApi` the `dataExplorer` API**

In `src/lib/plugins/makePluginApi/makePluginApi.tsx`, add the imports:

```tsx
// before
import { fetchRowsForInvocation } from "@/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { PluginErrorBoundary } from "@/lib/plugins/PluginErrorBoundary/PluginErrorBoundary";
import type {
```

```tsx
// after
import { addColumnsForInvocation } from "@/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation";
import { fetchRowsForInvocation } from "@/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { PluginErrorBoundary } from "@/lib/plugins/PluginErrorBoundary/PluginErrorBoundary";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type {
```

add this helper directly above `function _makeUiApi(`:

```tsx
function _makeDataExplorerApi(
  context: PluginInvocationContext,
  bridge: DataExplorerBridge | undefined,
): AvandarApi["dataExplorer"] {
  if (context.slotId !== "dataExplorer.toolbar" || bridge === undefined) {
    return undefined;
  }
  return {
    // `async` turns a thrown `PluginError` into a rejected promise, which is
    // how a plugin receives it.
    addColumns: async (columns) => {
      return addColumnsForInvocation({ context, bridge, columns });
    },
  };
}
```

extend the `makePluginApi` docstring:

```tsx
// before
 * switch cannot open a modal or a drawer in the next workspace.
 *
// after
 * switch cannot open a modal or a drawer in the next workspace. Its
 * `dataExplorer` is set only for a Data Explorer toolbar invocation that came
 * with a `dataExplorerBridge`.
 *
```

take the option:

```tsx
// before
    messages: PluginMessages;
  }>,
): AvandarApi {
  const { pluginName, context, workspace, messages } = options;
```

```tsx
// after
    messages: PluginMessages;
    dataExplorerBridge?: DataExplorerBridge;
  }>,
): AvandarApi {
  const { pluginName, context, workspace, messages, dataExplorerBridge } =
    options;
```

and set the member:

```tsx
// before
    i18n: {
      t: makePluginTranslator({ locale: workspace.locale, messages }),
    },
  };
  return api;
```

```tsx
// after
    i18n: {
      t: makePluginTranslator({ locale: workspace.locale, messages }),
    },
    dataExplorer: _makeDataExplorerApi(context, dataExplorerBridge),
  };
  return api;
```

- [ ] **Step 10: Pass the bridge through `runPluginCommand`**

In `src/lib/plugins/runPluginCommand/runPluginCommand.ts`, import the type after the `makePluginApi` import:

```ts
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
```

add the option:

```ts
// before
    workspace: AvandarApi["workspace"];
    loadCode: (
// after
    workspace: AvandarApi["workspace"];

    /** What a Data Explorer toolbar command changes its query through. */
    dataExplorerBridge?: DataExplorerBridge;
    loadCode: (
```

and hand it to `makePluginApi`:

```ts
// before
      workspace,
      messages: codeModule.messages,
    });
// after
      workspace,
      messages: codeModule.messages,
      dataExplorerBridge: options.dataExplorerBridge,
    });
```

- [ ] **Step 11: Build the bridge per run in `usePluginCommandRunner`**

In `src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.ts`, import the type above the `PluginMenuItem` import:

```ts
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
```

replace the lazy runner's signature (four options, so they get a named type):

```ts
// before
function _runCommandWithLazyRunner(options: {
  item: PluginMenuItem;
  context: PluginInvocationContext;
  workspace: { id: string; slug: string; locale: string };
}): Promise<PluginCommandFailure | undefined> {
  const { item, context, workspace } = options;
  return loadRunPluginCommand().then(
    (runCommand) => {
      return runCommand({
        plugin: item.plugin,
        pluginName: item.pluginName,
        commandId: item.commandId,
        context,
        workspace,
        loadCode: PluginModuleCache.loadCode,
      });
```

```ts
// after
type LazyCommandRun = Readonly<{
  item: PluginMenuItem;
  context: PluginInvocationContext;
  dataExplorerBridge: DataExplorerBridge | undefined;
  workspace: { id: string; slug: string; locale: string };
}>;

function _runCommandWithLazyRunner(
  options: LazyCommandRun,
): Promise<PluginCommandFailure | undefined> {
  const { item, context, dataExplorerBridge, workspace } = options;
  return loadRunPluginCommand().then(
    (runCommand) => {
      return runCommand({
        plugin: item.plugin,
        pluginName: item.pluginName,
        commandId: item.commandId,
        context,
        workspace,
        dataExplorerBridge,
        loadCode: PluginModuleCache.loadCode,
      });
```

change the hook's docstring and signature:

```ts
// before
 * finished yet, so a slot can show it as loading. Each run builds its
 * invocation context with `getContext` at that moment, and nothing runs when
 * there is no `getContext`.
 */
export function usePluginCommandRunner(
  getContext: (() => PluginInvocationContext) | undefined,
): Readonly<{
```

```ts
// after
 * finished yet, so a slot can show it as loading. Each run builds its
 * invocation context with `getContext`, and its Data Explorer bridge with
 * `getDataExplorerBridge` when there is one, at that moment. Nothing runs
 * when there is no `getContext`.
 */
export function usePluginCommandRunner(
  options: Readonly<{
    getContext: (() => PluginInvocationContext) | undefined;
    getDataExplorerBridge?: (() => DataExplorerBridge) | undefined;
  }>,
): Readonly<{
```

and build the bridge right after the context:

```ts
// before
  const run = async (item: PluginMenuItem): Promise<void> => {
    if (getContext === undefined) {
      return;
    }
    const context = getContext();
    setRunningKey(item.key);
    let failure: PluginCommandFailure | undefined;
    try {
      failure = await _runCommandWithLazyRunner({
        item,
        context,
        workspace: {
```

```ts
// after
  const run = async (item: PluginMenuItem): Promise<void> => {
    const { getContext, getDataExplorerBridge } = options;
    if (getContext === undefined) {
      return;
    }
    const context = getContext();
    const dataExplorerBridge = getDataExplorerBridge?.();
    setRunningKey(item.key);
    let failure: PluginCommandFailure | undefined;
    try {
      failure = await _runCommandWithLazyRunner({
        item,
        context,
        dataExplorerBridge,
        workspace: {
```

- [ ] **Step 12: Take the getter in `PluginMenuSlot`**

In `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.tsx`, import the type above the `PluginMenuItem` import:

```tsx
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
```

add the prop:

```tsx
// before
  getContext: (() => PluginInvocationContext) | undefined;

  /** The slot's current facts, which the plugins' `when` conditions read. */
```

```tsx
// after
  getContext: (() => PluginInvocationContext) | undefined;

  /**
   * Builds what a Data Explorer toolbar command changes its query through.
   * The slot calls it once per click, right after `getContext`.
   */
  getDataExplorerBridge?: (() => DataExplorerBridge) | undefined;

  /** The slot's current facts, which the plugins' `when` conditions read. */
```

and pass it to the runner:

```tsx
// before
export function PluginMenuSlot({
  slotId,
  getContext,
  facts,
}: Props): JSX.Element | null {
  const items = usePluginMenuItems({ slotId, facts });
  const { runningKey, run } = usePluginCommandRunner(getContext);
```

```tsx
// after
export function PluginMenuSlot({
  slotId,
  getContext,
  getDataExplorerBridge,
  facts,
}: Props): JSX.Element | null {
  const items = usePluginMenuItems({ slotId, facts });
  const { runningKey, run } = usePluginCommandRunner({
    getContext,
    getDataExplorerBridge,
  });
```

- [ ] **Step 13: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/makePluginApi src/lib/plugins/runPluginCommand src/lib/plugins/PluginMenuSlot src/lib/plugins/derivedColumns/addColumnsForInvocation`
Expected: PASS, `Test Files  6 passed (6)`, `Tests  69 passed (69)`.

- [ ] **Step 14: Format, lint, type-check, and confirm the runner code stays lazy**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore src/lib/plugins/DataExplorerBridge.types.ts src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.ts src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.test.ts src/lib/plugins/makePluginApi/makePluginApi.tsx src/lib/plugins/makePluginApi/makePluginApi.test.tsx src/lib/plugins/runPluginCommand/runPluginCommand.ts src/lib/plugins/runPluginCommand/runPluginCommand.test.ts src/lib/plugins/PluginMenuSlot/PluginMenuSlot.tsx src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.ts src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.test.tsx && pnpm exec eslint src/lib/plugins && pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: `Finished in ...ms on 11 files`, no ESLint output, and no type errors.

Run: `grep -rln 'derivedColumns/\|makePluginApi/makePluginApi"' src --include='*.ts' --include='*.tsx' | grep -v test`
Expected: exactly `src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.ts`, `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns.ts`, `src/lib/plugins/runPluginCommand/runPluginCommand.ts`, and `src/lib/plugins/makePluginApi/makePluginApi.tsx` (in any order).

- [ ] **Step 15: Commit**

```bash
git add src/lib/plugins/DataExplorerBridge.types.ts \
  src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.ts \
  src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.test.ts \
  src/lib/plugins/makePluginApi/makePluginApi.tsx \
  src/lib/plugins/makePluginApi/makePluginApi.test.tsx \
  src/lib/plugins/runPluginCommand/runPluginCommand.ts \
  src/lib/plugins/runPluginCommand/runPluginCommand.test.ts \
  src/lib/plugins/PluginMenuSlot/PluginMenuSlot.tsx \
  src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx \
  src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.ts \
  src/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): give toolbar commands avandar.dataExplorer.addColumns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Data Explorer state: `plugin_command` trigger, `applyDerivedColumnsSql`, `restoreDerivedColumnsSnapshot`

**Files:**
- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts`
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts`
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx`
- Test: `src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.derivedColumns.test.tsx`

**Context:** Applying derived columns is a new origin for a Data Explorer run, so `QueryAnalyticsTrigger` gains `plugin_command` (TypeScript only: the analytics payload is JSON with no database constraint, and `UserQueryAnalyticsTrigger` picks it up through its `Exclude`). Widening the union breaks nothing: the type-checker reports no new error, and the one other reader, `runQueryPrerequisite`, lists the triggers it counts and correctly does not count a plugin's run. `applyDerivedColumnsSql` puts the SQL in place without parsing it, marks the form out of sync, keeps the chart, and moves the column bindings to the new SQL key (`normalizeSqlForSubquery(sql)`) so Task 8 can keep the passed-through columns' IDs. `restoreDerivedColumnsSnapshot` puts back the `DerivedColumnsSnapshot` taken before applying. The neighbouring state tests drive the real manager through its `Provider` and are `.tsx`, so this one does too.

- [ ] **Step 1: Write the failing state test**

`src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.derivedColumns.test.tsx`:

```tsx
/**
 * A plugin command that adds derived columns puts wrapped SQL in the
 * explorer, and its Undo puts back what was there before. This drives the real
 * `DataExplorerStateManager` through its `Provider` and `useContext`, so the
 * action wiring is covered too.
 */
import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { makeDerivedColumnsSnapshotFromState } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

const BASE_SQL = `SELECT "borough", "cases" FROM "nyc";`;

const WRAPPED_SQL = [
  "WITH ava_source AS (",
  "  SELECT *, row_number() OVER () AS __ava_row FROM (",
  `SELECT "borough", "cases" FROM "nyc"`,
  "  )",
  ")",
  "SELECT * EXCLUDE (__ava_row),",
  `  ("cases" * 2) AS "double_cases"`,
  "FROM ava_source",
  "ORDER BY __ava_row",
].join("\n");

const BOROUGH_ID = "borough-id" as QueryColumn.Id;
const CASES_ID = "cases-id" as QueryColumn.Id;

const BAR_CONFIG: AvaVizConfig.T = {
  vizType: "bar",
  xAxisKey: BOROUGH_ID,
  series: [{ renderAs: "bar", key: CASES_ID }],
  layout: "group",
  withLegend: true,
};

const BINDINGS: QueryResultColumnBindingRegistry = {
  version: 1,
  scopeKey: "scope",
  sqlKey: normalizeSqlForSubquery(BASE_SQL),
  columns: [
    { id: BOROUGH_ID, name: "borough", dataType: "varchar" },
    { id: CASES_ID, name: "cases", dataType: "bigint" },
  ],
};

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

/**
 * Renders the state manager with raw SQL, a bar chart, column bindings for
 * that SQL, a prompt, and a last result, as after a chat-generated query ran.
 */
function _renderStateManagerWithResult(): RenderHookResult<
  ReturnType<typeof DataExplorerStateManager.useContext>,
  unknown
> {
  const rendered = renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    { wrapper: _wrapper },
  );
  act(() => {
    const dispatch = rendered.result.current[1];
    dispatch.setQueryTrigger("chat_generated");
    dispatch.setRawSql(BASE_SQL);
    dispatch.setNlPrompt("cases by borough");
    dispatch.setVizConfig(BAR_CONFIG);
    dispatch.setColumnBindings(BINDINGS);
    dispatch.syncVizFromQueryResult(BINDINGS.columns);
  });
  return rendered;
}

describe("Data Explorer derived columns", () => {
  it("puts the derived columns SQL in the explorer", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].rawSql).toBe(WRAPPED_SQL);
  });

  it("stamps the run as a plugin command", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].queryTrigger).toBe("plugin_command");
  });

  it("marks the structured query out of sync with the SQL", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].isStructuredQueryInSync).toBe(false);
  });

  it("clears the last result, the URL chart, and the prompt", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].lastResultColumns).toBeUndefined();
    expect(result.current[0].pendingUrlVizConfig).toBeUndefined();
    expect(result.current[0].nlPrompt).toBeUndefined();
  });

  it("keeps the chart config", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].vizConfig).toEqual(BAR_CONFIG);
  });

  it("re-keys the column bindings to the derived columns SQL", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].columnBindings).toEqual({
      ...BINDINGS,
      sqlKey: normalizeSqlForSubquery(WRAPPED_SQL),
    });
  });

  it("restores the SQL, chart, bindings, and prompt from a snapshot", () => {
    const { result } = _renderStateManagerWithResult();
    const snapshot = makeDerivedColumnsSnapshotFromState(result.current[0]);
    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });
    act(() => {
      result.current[1].setVizConfig({ vizType: "table" });
    });

    act(() => {
      result.current[1].restoreDerivedColumnsSnapshot(snapshot);
    });

    expect(result.current[0]).toMatchObject({
      rawSql: BASE_SQL,
      vizConfig: BAR_CONFIG,
      columnBindings: BINDINGS,
      nlPrompt: "cases by borough",
      queryTrigger: "plugin_command",
      lastResultColumns: undefined,
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.derivedColumns.test.tsx`
Expected: FAIL, `Tests  7 failed (7)`, each with `TypeError: result.current[1].applyDerivedColumnsSql is not a function`.

- [ ] **Step 3: Add the trigger**

In `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`:

```ts
// before
/**
 * What caused a query to run.
 *
 * `dataset_opened` covers opening a saved dataset from the Data Explorer
 * drawer. `block_render` is what dashboard blocks and viz-config previews
 * report, since neither has a user-initiated trigger: they run whenever their
 * SQL changes.
 */
export type QueryAnalyticsTrigger =
  | "sql_submit"
  | "structured_change"
  | "chat_generated"
  | "url_hydration"
  | "dataset_opened"
  | "block_render";
```

```ts
// after
/**
 * What caused a query to run.
 *
 * `dataset_opened` covers opening a saved dataset from the Data Explorer
 * drawer. `plugin_command` covers a plugin command changing the Data
 * Explorer's SQL, such as one that adds computed columns, and the Undo that
 * puts the earlier SQL back. `block_render` is what dashboard blocks and
 * viz-config previews report, since neither has a user-initiated trigger:
 * they run whenever their SQL changes.
 */
export type QueryAnalyticsTrigger =
  | "sql_submit"
  | "structured_change"
  | "chat_generated"
  | "url_hydration"
  | "dataset_opened"
  | "plugin_command"
  | "block_render";
```

- [ ] **Step 4: Add the snapshot type**

In `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts`, add directly above `export const INITIAL_DATA_EXPLORER_STATE`:

```ts
/**
 * The part of the Data Explorer state a plugin command's derived columns
 * replace: the SQL, the structured query and its sync flags, the chart, the
 * column bindings, the source columns, and the prompt. Taken by
 * `useDataExplorerPluginBridge` before it applies the derived columns SQL, and
 * passed back to `restoreDerivedColumnsSnapshot` when the user clicks Undo.
 */
export type DerivedColumnsSnapshot = Pick<
  DataExplorerAppState,
  | "rawSql"
  | "query"
  | "isStructuredQueryInSync"
  | "sqlSyncWarnings"
  | "vizConfig"
  | "columnBindings"
  | "sourceCatalog"
  | "nlPrompt"
>;
```

- [ ] **Step 5: Add `makeDerivedColumnsSnapshotFromState`**

In `src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts`, widen the type import:

```ts
// before
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
// after
import type {
  DataExplorerAppState,
  DerivedColumnsSnapshot,
} from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
```

and append to the end of the file:

```ts
/**
 * Takes the part of the state that applying derived columns SQL replaces, so
 * Undo can put it back. Called by `useDataExplorerPluginBridge` right before
 * it dispatches `applyDerivedColumnsSql`.
 */
export function makeDerivedColumnsSnapshotFromState(
  state: DataExplorerAppState,
): DerivedColumnsSnapshot {
  return {
    rawSql: state.rawSql,
    query: state.query,
    isStructuredQueryInSync: state.isStructuredQueryInSync,
    sqlSyncWarnings: state.sqlSyncWarnings,
    vizConfig: state.vizConfig,
    columnBindings: state.columnBindings,
    sourceCatalog: state.sourceCatalog,
    nlPrompt: state.nlPrompt,
  };
}
```

- [ ] **Step 6: Add the two actions**

In `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx`, add the import:

```tsx
// before
import { setValue } from "@avandar/utils";
// after
import { setValue } from "@avandar/utils";
import { normalizeSqlForSubquery } from "@avandar/utils/sql";
```

widen the type import:

```tsx
// before
import type {
  DataExplorerAppState,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
// after
import type {
  DataExplorerAppState,
  DerivedColumnsSnapshot,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
```

and add these two actions directly above the `setSqlSyncState` action (whose docstring starts `Mark the sync flag without changing any other state.`):

```tsx
    /**
     * Runs the SQL a plugin command built to add derived columns to the
     * current result. Keeps the chart, and moves the column bindings to the
     * new SQL so the columns it passes through keep their IDs. Does not parse
     * the SQL, so the structured query stays as it was, out of sync.
     */
    applyDerivedColumnsSql: (
      state: DataExplorerAppState,
      sql: string,
    ): DataExplorerAppState => {
      const { columnBindings } = state;
      return {
        ...state,
        rawSql: sql,
        queryTrigger: "plugin_command",
        isStructuredQueryInSync: false,
        lastResultColumns: undefined,
        pendingUrlVizConfig: undefined,
        nlPrompt: undefined,
        columnBindings: columnBindings
          ? { ...columnBindings, sqlKey: normalizeSqlForSubquery(sql) }
          : undefined,
      };
    },

    /**
     * Puts back what `applyDerivedColumnsSql` replaced, from a snapshot taken
     * before it ran, and runs that query again. Used by the Undo action of the
     * derived columns notification.
     */
    restoreDerivedColumnsSnapshot: (
      state: DataExplorerAppState,
      snapshot: DerivedColumnsSnapshot,
    ): DataExplorerAppState => {
      return {
        ...state,
        ...snapshot,
        queryTrigger: "plugin_command",
        lastResultColumns: undefined,
        pendingUrlVizConfig: undefined,
      };
    },

```

- [ ] **Step 7: Run the tests and checks**

Run: `pnpm vitest run src/views/DataExplorerApp/DataExplorerStateManager`
Expected: PASS, `Test Files  7 passed (7)`, `Tests  39 passed (39)`.

Run: `pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: no output.

Run: `deno check shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`
Expected: `Check shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` and no error (a deprecation warning about `experimentalDecorators` is expected).

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.derivedColumns.test.tsx && pnpm exec eslint shared/analytics/AnalyticsEvents src/views/DataExplorerApp/DataExplorerStateManager`
Expected: `Finished in ...ms on 5 files` and no ESLint output.

- [ ] **Step 8: Commit**

```bash
git add shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts \
  src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts \
  src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts \
  src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx \
  src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.derivedColumns.test.tsx
git commit -m "$(cat <<'EOF'
feat(data-explorer): apply and undo a plugin's derived columns SQL

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Column bindings keep their IDs when the explorer wraps its SQL

**Files:**
- Modify: `src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.ts`
- Test: `src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.test.ts`

**Context:** The wrapped SQL has a `WITH` and a subquery, so `makeProjectionDescriptorsFromSql` gives it no descriptors and `reconcileQueryResultColumnBindings` binds each result column by name, reusing an earlier ID only when the earlier registry's `sqlKey` equals the new SQL's. Task 7 re-keys the state's bindings to the wrapped SQL, but `_getSchema` prefers the hook's own previous bindings (still keyed to the base SQL) over `initialRegistry`, so every column would get a new ID and the chart and filters would lose their columns. The fix: when `initialRegistry` is keyed to this SQL and the previous bindings are not, bind against `initialRegistry`. In every other case the order is unchanged. The same rule makes Undo keep the base IDs, because the restored snapshot's bindings are keyed to the base SQL. `DataExplorerApp` is the hook's only caller and keeps `state.columnBindings` equal to the hook's last registry, so the new branch runs only after `applyDerivedColumnsSql` or `restoreDerivedColumnsSnapshot`.

- [ ] **Step 1: Write the failing tests**

In `src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.test.ts`, add above `describe("useQueryResultColumnBindings", () => {`:

```ts
const BASE_SQL = `SELECT "borough", "cases" FROM "nyc"`;
const WRAPPED_SQL = [
  "WITH ava_source AS (",
  "  SELECT *, row_number() OVER () AS __ava_row FROM (",
  BASE_SQL,
  "  )",
  ")",
  "SELECT * EXCLUDE (__ava_row),",
  `  ("cases" * 2) AS "double_cases"`,
  "FROM ava_source",
  "ORDER BY __ava_row",
].join("\n");

function _optionsFromSql(
  sql: string,
  columnNames: readonly string[],
): UseQueryResultColumnBindingsOptions {
  const columns = columnNames.map((name) => {
    return { name, dataType: "bigint" as const };
  });
  return {
    scopeKey: "owner",
    sqlKey: sql,
    resultSqlKey: sql,
    result: { ...QueryResult.makeEmpty(), columns, data: [], numRows: 0 },
    projections: makeProjectionDescriptorsFromSql({ sql, columns }),
    initialRegistry: undefined,
  };
}

```

and add at the end of the `describe` block:

```ts
  it("keeps pass-through column IDs when seeded with bindings re-keyed to wrapped SQL", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _optionsFromSql(BASE_SQL, ["borough", "cases"]),
    });
    const baseRegistry = result.current?.registry;
    const [boroughId, casesId] = (result.current?.columns ?? []).map(
      (column) => {
        return column.id;
      },
    );

    rerender({
      ..._optionsFromSql(WRAPPED_SQL, ["borough", "cases", "double_cases"]),
      initialRegistry: baseRegistry && { ...baseRegistry, sqlKey: WRAPPED_SQL },
    });

    const wrappedIds = result.current?.columns.map((column) => {
      return column.id;
    });
    expect(wrappedIds?.slice(0, 2)).toEqual([boroughId, casesId]);
  });

  it("gives a column the wrapped SQL adds an ID of its own", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _optionsFromSql(BASE_SQL, ["borough", "cases"]),
    });
    const baseRegistry = result.current?.registry;
    const baseIds = (result.current?.columns ?? []).map((column) => {
      return column.id;
    });

    rerender({
      ..._optionsFromSql(WRAPPED_SQL, ["borough", "cases", "double_cases"]),
      initialRegistry: baseRegistry && { ...baseRegistry, sqlKey: WRAPPED_SQL },
    });

    const addedId = result.current?.columns[2]?.id;
    expect(addedId).toBeDefined();
    expect(baseIds).not.toContain(addedId);
  });

  it("gives wrapped SQL fresh IDs when the seed is keyed to other SQL", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _optionsFromSql(BASE_SQL, ["borough", "cases"]),
    });
    const baseRegistry = result.current?.registry;
    const boroughId = result.current?.columns[0]?.id;

    rerender({
      ..._optionsFromSql(WRAPPED_SQL, ["borough", "cases", "double_cases"]),
      initialRegistry: baseRegistry,
    });

    expect(result.current?.columns[0]?.id).not.toBe(boroughId);
  });
```

- [ ] **Step 2: Run them and confirm the first fails**

Run: `pnpm vitest run src/views/DataExplorerApp/useQueryResultColumnBindings`
Expected: FAIL, `Tests  1 failed | 8 passed (9)`: `keeps pass-through column IDs when seeded with bindings re-keyed to wrapped SQL` fails with `AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]`. The other two new tests pin behavior that already holds and must keep holding.

- [ ] **Step 3: Prefer a seed keyed to this SQL**

In `src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.ts`, inside `_getSchema`:

```ts
// before
  const schema = reconcileQueryResultColumnBindings({
    ...options,
    sqlKey,
    columns: options.result.columns,
    previous: previous?.registry ?? options.initialRegistry,
  });
```

```ts
// after
  // A seed keyed to this SQL wins over earlier bindings keyed to other SQL.
  // The Data Explorer re-keys its bindings that way when it wraps its SQL,
  // so the columns the wrapper passes through keep their IDs.
  const isSeedForThisSql =
    options.initialRegistry?.sqlKey === sqlKey &&
    previous?.registry.sqlKey !== sqlKey;
  const schema = reconcileQueryResultColumnBindings({
    ...options,
    sqlKey,
    columns: options.result.columns,
    previous: isSeedForThisSql
      ? options.initialRegistry
      : (previous?.registry ?? options.initialRegistry),
  });
```

- [ ] **Step 4: Run the tests and checks**

Run: `pnpm vitest run src/views/DataExplorerApp/useQueryResultColumnBindings`
Expected: PASS, `Tests  9 passed (9)`.

Run: `pnpm vitest run src/views/DataExplorerApp`
Expected: PASS, no failures.

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.ts src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.test.ts && pnpm exec eslint src/views/DataExplorerApp/useQueryResultColumnBindings && pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: `Finished in ...ms on 2 files`, no ESLint output, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.ts \
  src/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings.test.ts
git commit -m "$(cat <<'EOF'
fix(data-explorer): keep column IDs when the explorer wraps its SQL

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Data Explorer: `useDataExplorerPluginBridge`, the Undo notification, and `DataExplorerApp` wiring

**Files:**
- Create: `src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.tsx`
- Test: `src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.test.tsx`
- Create: `src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.ts`
- Test: `src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.test.tsx`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx`
- Test: `src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx`

**Context:** The bridge hook captures `executedSql` when a command is clicked as the `baseSql`. Commands are async and Undo fires later, so `applyDerivedColumnsSql` and Undo read the latest `executedSql` and state through a ref, updated in a layout effect. Applying returns false, dispatching nothing, once the explorer shows a result of different SQL (or none, mid-run); otherwise it snapshots the state (Task 7), dispatches `applyDerivedColumnsSql`, and shows the notification. Undo restores the snapshot only while `rawSql` is still the applied SQL, and otherwise warns. The warning copy lives in a `_` helper that uses `t` from `@lingui/core/macro`, so the hook never passes `t` to a helper (`docs/rules/i18n.md`). The notification follows `offerOfflineChatFallback`: a fixed id, a message with a Mantine `Button`, and `t` from `@lingui/core/macro` because it is not a component; it hides any open notification with its id first, since Mantine ignores `show` for an id already on screen. The integration test renders the real `DataExplorerApp` with the harness `explorerUrlChartRestore.integration.test.tsx` uses (`useDataQuery` mocked to answer each SQL with a fixed result, charts and the drawer stubbed), and replaces `PluginMenuSlot` with a button that calls the real `addColumnsForInvocation` with the slot's `getContext` and `getDataExplorerBridge`. That is the cheapest level that still runs the wiring this task adds, Task 8's bindings, and the real notification; plugin loading and `makePluginApi` are already covered by Task 6. Its column ID assertion fails if Task 8 is reverted.

- [ ] **Step 1: Write the failing notification test**

`src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.test.tsx`:

```tsx
import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@/test-utils";
import { notifyDerivedColumnsAdded } from "@/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded";

const COLUMN_NAMES = ["incidence_per_100k", "incidence_per_100k_lower"];

function _renderNotification(onUndo: () => void = vi.fn()): void {
  render(<div />);
  act(() => {
    notifyDerivedColumnsAdded({ columnNames: COLUMN_NAMES, onUndo });
  });
}

describe("notifyDerivedColumnsAdded", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      notifications.clean();
    });
  });

  it("lists the added column names", async () => {
    _renderNotification();

    expect(
      await screen.findByText(
        "Added incidence_per_100k, incidence_per_100k_lower",
      ),
    ).toBeInTheDocument();
  });

  it("calls onUndo when Undo is clicked", async () => {
    const onUndo = vi.fn();
    _renderNotification(onUndo);

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("hides the notification when Undo is clicked", async () => {
    _renderNotification();

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(screen.queryByText("Columns added")).not.toBeInTheDocument();
    });
  });

  it("replaces the notification of an earlier command", async () => {
    _renderNotification();
    await screen.findByText(
      "Added incidence_per_100k, incidence_per_100k_lower",
    );

    act(() => {
      notifyDerivedColumnsAdded({
        columnNames: ["cases_7d_avg"],
        onUndo: vi.fn(),
      });
    });

    expect(await screen.findByText("Added cases_7d_avg")).toBeInTheDocument();
    expect(screen.getAllByText("Columns added")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/views/DataExplorerApp/notifyDerivedColumnsAdded`
Expected: FAIL, `Error: Failed to resolve import "@/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded"`.

- [ ] **Step 3: Implement the notification**

`src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.tsx`:

```tsx
import { t } from "@lingui/core/macro";
import { Button, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

/**
 * One id for every derived columns notification, so a newer one replaces the
 * one before it and only the latest Undo is offered.
 */
const NOTIFICATION_ID = "data-explorer-derived-columns";

/**
 * Tells the user which columns a plugin command added to the Data Explorer
 * query, with an Undo button that hides the notification and calls `onUndo`.
 * Replaces the notification of an earlier command. Called by
 * `useDataExplorerPluginBridge` after it applies the derived columns SQL.
 */
export function notifyDerivedColumnsAdded(
  options: Readonly<{ columnNames: readonly string[]; onUndo: () => void }>,
): void {
  const { columnNames, onUndo } = options;
  const columnList = columnNames.join(", ");
  // Mantine ignores `show` while a notification with the same id is open.
  notifications.hide(NOTIFICATION_ID);
  notifications.show({
    id: NOTIFICATION_ID,
    title: t`Columns added`,
    message: (
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{t`Added ${columnList}`}</Text>
        <Button
          size="compact-sm"
          variant="light"
          onClick={() => {
            notifications.hide(NOTIFICATION_ID);
            onUndo();
          }}
        >
          {t`Undo`}
        </Button>
      </Stack>
    ),
    autoClose: 10_000,
    withCloseButton: true,
  });
}
```

Run: `pnpm vitest run src/views/DataExplorerApp/notifyDerivedColumnsAdded`
Expected: PASS, `Tests  4 passed (4)`. Without the first `notifications.hide(NOTIFICATION_ID)`, `replaces the notification of an earlier command` fails.

- [ ] **Step 4: Write the failing bridge hook test**

`src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.test.tsx`:

```tsx
import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it } from "vitest";
import {
  TestProviders,
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useDataExplorerPluginBridge } from "@/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge";
import type { ReactNode } from "react";

const BASE_SQL = `SELECT "borough", "cases" FROM "nyc"`;
const WRAPPED_SQL = `WITH ava_source AS (SELECT 1) SELECT * FROM ava_source`;
const COLUMN_NAMES = ["double_cases"];

type HookProps = { executedSql: string | undefined };

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <TestProviders>
      <DataExplorerStateManager.Provider>
        {children}
      </DataExplorerStateManager.Provider>
    </TestProviders>
  );
}

/**
 * Renders the hook beside the explorer state it reads and writes, starting
 * from `executedSql`.
 */
function _renderBridgeHook(executedSql: string | undefined) {
  return renderHook(
    (props: HookProps) => {
      return {
        getBridge: useDataExplorerPluginBridge(props),
        state: DataExplorerStateManager.useState(),
        dispatch: DataExplorerStateManager.useDispatch(),
      };
    },
    { wrapper: _wrapper, initialProps: { executedSql } },
  );
}

type BridgeHookResult = ReturnType<typeof _renderBridgeHook>;

/** Renders the hook on an explorer whose SQL is `BASE_SQL`, as after a run. */
function _renderBridge(): BridgeHookResult {
  const rendered = _renderBridgeHook(BASE_SQL);
  act(() => {
    rendered.result.current.dispatch.setRawSql(BASE_SQL);
  });
  return rendered;
}

function _applyWrappedSql(rendered: BridgeHookResult): boolean {
  const bridge = rendered.result.current.getBridge?.();
  let isApplied = false;
  act(() => {
    isApplied =
      bridge?.applyDerivedColumnsSql({
        sql: WRAPPED_SQL,
        columnNames: COLUMN_NAMES,
      }) ?? false;
  });
  return isApplied;
}

describe("useDataExplorerPluginBridge", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      notifications.clean();
    });
  });

  it("offers no bridge while there is no result", () => {
    const { result } = _renderBridgeHook(undefined);

    expect(result.current.getBridge).toBeUndefined();
  });

  it("gives the bridge the SQL of the result on screen when it is built", () => {
    const rendered = _renderBridge();

    expect(rendered.result.current.getBridge?.().baseSql).toBe(BASE_SQL);
  });

  it("applies the SQL when the explorer still shows the invoked-on result", () => {
    const rendered = _renderBridge();

    const isApplied = _applyWrappedSql(rendered);

    expect(isApplied).toBe(true);
    expect(rendered.result.current.state.rawSql).toBe(WRAPPED_SQL);
  });

  it("changes nothing when the explorer shows a newer result", () => {
    const rendered = _renderBridge();
    const bridge = rendered.result.current.getBridge?.();
    rendered.rerender({ executedSql: `SELECT "cases" FROM "nyc"` });

    let isApplied = true;
    act(() => {
      isApplied =
        bridge?.applyDerivedColumnsSql({
          sql: WRAPPED_SQL,
          columnNames: COLUMN_NAMES,
        }) ?? true;
    });

    expect(isApplied).toBe(false);
    expect(rendered.result.current.state.rawSql).toBe(BASE_SQL);
  });

  it("lists the added columns in a notification", async () => {
    const rendered = _renderBridge();

    _applyWrappedSql(rendered);

    expect(await screen.findByText("Added double_cases")).toBeInTheDocument();
  });

  it("puts the earlier SQL back when Undo is clicked", async () => {
    const rendered = _renderBridge();
    _applyWrappedSql(rendered);

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    expect(rendered.result.current.state.rawSql).toBe(BASE_SQL);
  });

  it("warns and keeps the newer SQL when Undo comes after another change", async () => {
    const rendered = _renderBridge();
    _applyWrappedSql(rendered);
    act(() => {
      rendered.result.current.dispatch.setRawSql("SELECT 2");
    });

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(screen.getByText("Nothing to undo")).toBeInTheDocument();
    });
    expect(rendered.result.current.state.rawSql).toBe("SELECT 2");
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `pnpm vitest run src/views/DataExplorerApp/useDataExplorerPluginBridge`
Expected: FAIL, `Error: Failed to resolve import "@/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge"`.

- [ ] **Step 6: Implement the bridge hook**

`src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.ts`:

```ts
import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { t } from "@lingui/core/macro";
import { useLayoutEffect, useMemo, useRef } from "react";
import { notifyWarning } from "@/utils/notifications/notify";
import { makeDerivedColumnsSnapshotFromState } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { notifyDerivedColumnsAdded } from "@/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { RefObject } from "react";

type Dispatch = ReturnType<typeof DataExplorerStateManager.useDispatch>;

/**
 * The explorer as of the latest render. Commands are async and Undo fires
 * later, so the bridge reads these instead of the values it was built with.
 */
type LatestExplorer = Readonly<{
  executedSql: string | undefined;
  state: DataExplorerAppState;
}>;

function _warnNothingToUndo(): void {
  notifyWarning({
    title: t`Nothing to undo`,
    message: t`The query changed after the columns were added.`,
  });
}

function _makeBridgeFromBaseSql(
  options: Readonly<{
    baseSql: string;
    latestRef: RefObject<LatestExplorer>;
    dispatch: Dispatch;
  }>,
): DataExplorerBridge {
  const { baseSql, latestRef, dispatch } = options;
  return {
    baseSql,
    applyDerivedColumnsSql: ({ sql, columnNames }) => {
      const { executedSql, state } = latestRef.current;
      if (
        executedSql === undefined ||
        normalizeSqlForSubquery(executedSql) !==
          normalizeSqlForSubquery(baseSql)
      ) {
        return false;
      }
      const snapshot = makeDerivedColumnsSnapshotFromState(state);
      dispatch.applyDerivedColumnsSql(sql);
      notifyDerivedColumnsAdded({
        columnNames,
        onUndo: () => {
          if (latestRef.current.state.rawSql === sql) {
            dispatch.restoreDerivedColumnsSnapshot(snapshot);
          } else {
            _warnNothingToUndo();
          }
        },
      });
      return true;
    },
  };
}

/**
 * Builds what the Data Explorer lends a toolbar plugin command so
 * `avandar.dataExplorer.addColumns` can add columns to its query. The getter
 * captures the result on screen when the command is clicked. Applying
 * returns false, changing nothing, once the explorer shows another result.
 * Undefined while there is no result to run on.
 *
 * Used by `DataExplorerApp`, which passes the getter to `PluginMenuSlot`.
 */
export function useDataExplorerPluginBridge(
  options: Readonly<{
    /**
     * `executedSql` of the result on screen, or undefined while there is
     * none or a run is in flight.
     */
    executedSql: string | undefined;
  }>,
): (() => DataExplorerBridge) | undefined {
  const { executedSql } = options;
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const latestRef = useRef<LatestExplorer>({ executedSql, state });
  useLayoutEffect(() => {
    latestRef.current = { executedSql, state };
  }, [executedSql, state]);

  return useMemo(() => {
    if (executedSql === undefined) {
      return undefined;
    }
    return () => {
      return _makeBridgeFromBaseSql({
        baseSql: executedSql,
        latestRef,
        dispatch,
      });
    };
  }, [executedSql, dispatch]);
}
```

Run: `pnpm vitest run src/views/DataExplorerApp/useDataExplorerPluginBridge`
Expected: PASS, `Tests  7 passed (7)`.

- [ ] **Step 7: Write the failing integration test**

`src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx`:

```tsx
/**
 * A Data Explorer toolbar command that adds derived columns: the explorer runs
 * the wrapped SQL, and the notification's Undo restores the SQL and the chart
 * config from before the command.
 *
 * This renders the real `DataExplorerApp`, state manager, bridge hook, and
 * notification, and calls the real `addColumnsForInvocation` from a stand-in
 * for `PluginMenuSlot`. Loading and running plugin code is covered by the
 * `runPluginCommand` and `makePluginApi` tests, so the stand-in skips it.
 * `useDataQuery` echoes the SQL it is asked to run, as a completed run would.
 */
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import {
  TestProviders,
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@/test-utils";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { PluginInvocationContext } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type DataQueryOptions = {
  rawSql: string | undefined;
};

type FakeSlotProps = {
  getContext: (() => PluginInvocationContext) | undefined;
  getDataExplorerBridge?: (() => DataExplorerBridge) | undefined;
};

const BASE_SQL = `SELECT "quarter", "revenue" FROM "sales"`;

const DOUBLE_REVENUE = {
  name: "double_revenue",
  expression: "{revenue} * 2",
  inputs: { revenue: "revenue" },
};

const { sql: WRAPPED_SQL } = makeDerivedColumnsSqlFromColumns({
  baseSql: BASE_SQL,
  existingColumnNames: ["quarter", "revenue"],
  columns: [DOUBLE_REVENUE],
});

const BASE_COLUMNS = [
  { name: "quarter", dataType: "varchar" },
  { name: "revenue", dataType: "double" },
];

const RESULTS_BY_SQL = new Map<string, unknown>([
  [
    BASE_SQL,
    {
      id: "base-result",
      columns: BASE_COLUMNS,
      data: [{ quarter: "Q1", revenue: 10 }],
      numRows: 1,
      executedSql: BASE_SQL,
    },
  ],
  [
    WRAPPED_SQL,
    {
      id: "wrapped-result",
      columns: [
        ...BASE_COLUMNS,
        { name: "double_revenue", dataType: "double" },
      ],
      data: [{ quarter: "Q1", revenue: 10, double_revenue: 20 }],
      numRows: 1,
      executedSql: WRAPPED_SQL,
    },
  ],
]);

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme" };
    },
  };
});
vi.mock("@/views/DataExplorerApp/useDataExplorerUrlSync", () => {
  return {
    useDataExplorerUrlSync: () => {
      return undefined;
    },
  };
});
vi.mock(
  "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit",
  () => {
    return {
      useSyncLargeDatasetAutoLimit: () => {
        return undefined;
      },
    };
  },
);
vi.mock("@/views/DataExplorerApp/useDataQuery/useDataQuery", () => {
  return {
    useDataQuery: (options: DataQueryOptions) => {
      const result =
        options.rawSql === undefined
          ? undefined
          : RESULTS_BY_SQL.get(options.rawSql);
      return [
        result,
        false,
        { isError: false, isSuccess: result !== undefined, dataUpdatedAt: 1 },
      ];
    },
  };
});
vi.mock("@/lib/plugins/PluginMenuSlot/PluginMenuSlot", async () => {
  const { addColumnsForInvocation } =
    await import("@/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation");
  return {
    PluginMenuSlot: ({ getContext, getDataExplorerBridge }: FakeSlotProps) => {
      return (
        <button
          type="button"
          disabled={
            getContext === undefined || getDataExplorerBridge === undefined
          }
          onClick={() => {
            if (getContext && getDataExplorerBridge) {
              addColumnsForInvocation({
                context: getContext(),
                bridge: getDataExplorerBridge(),
                columns: [
                  {
                    name: "double_revenue",
                    expression: "{revenue} * 2",
                    inputs: { revenue: "revenue" },
                  },
                ],
              });
            }
          }}
        >
          Double revenue
        </button>
      );
    },
  };
});
vi.mock("@/lib/ui/viz/BarChart/BarChart", () => {
  return {
    BarChart: () => {
      return <output data-testid="bar-chart" />;
    },
  };
});
vi.mock("@/lib/ui/viz/LineChart/LineChart", () => {
  return {
    LineChart: () => {
      return <output data-testid="line-chart" />;
    },
  };
});
vi.mock("@/components/layouts/AppSlate/AppSlate", () => {
  return {
    AppSlate: ({ children }: { children: ReactNode }) => {
      return <div>{children}</div>;
    },
  };
});
vi.mock("@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer", () => {
  return {
    DataExplorerDrawer: () => {
      return null;
    },
  };
});
vi.mock(
  "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu",
  () => {
    return {
      DataExplorerSaveMenu: () => {
        return null;
      },
    };
  },
);
vi.mock("@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal", () => {
  return {
    OpenDatasetModal: () => {
      return null;
    },
  };
});

/** Mounts the explorer and exposes its state and actions to the test. */
function _renderExplorer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <TestProviders>
            <QueryClientProvider client={queryClient}>
              <ChatPanelStateManager.Provider>
                <DataExplorerStateManager.Provider>
                  {children}
                  <DataExplorerApp
                    urlSearch={EMPTY_EXPLORER_URL_SEARCH}
                    navigate={() => {}}
                  />
                </DataExplorerStateManager.Provider>
              </ChatPanelStateManager.Provider>
            </QueryClientProvider>
          </TestProviders>
        );
      },
    },
  );
}

/**
 * Renders the explorer on `BASE_SQL` with a bar chart of revenue by quarter
 * bound to the result's column IDs.
 */
async function _renderExplorerWithBarChart(): Promise<
  ReturnType<typeof _renderExplorer>
> {
  const session = _renderExplorer();
  act(() => {
    session.result.current[1].setRawSql(BASE_SQL);
  });
  await waitFor(() => {
    expect(session.result.current[0].lastResultColumns).toHaveLength(2);
  });
  const [quarter, revenue] = session.result.current[0].lastResultColumns ?? [];
  act(() => {
    session.result.current[1].setVizConfig({
      vizType: "bar",
      layout: "group",
      withLegend: true,
      xAxisKey: quarter?.id,
      series: revenue ? [{ renderAs: "bar", key: revenue.id }] : [],
    });
  });
  await screen.findByTestId("bar-chart");
  return session;
}

afterEach(() => {
  cleanup();
  act(() => {
    notifications.clean();
  });
});

function _getColumnIds(
  session: ReturnType<typeof _renderExplorer>,
): Array<string | undefined> {
  return (session.result.current[0].lastResultColumns ?? []).map((column) => {
    return column.id;
  });
}

it("runs the wrapped SQL and keeps the chart on the same columns", async () => {
  const session = await _renderExplorerWithBarChart();
  const chartBefore = session.result.current[0].vizConfig;
  const columnIdsBefore = _getColumnIds(session);

  fireEvent.click(
    await screen.findByRole("button", { name: "Double revenue" }),
  );

  await waitFor(() => {
    expect(
      session.result.current[0].lastResultColumns?.map((column) => {
        return column.name;
      }),
    ).toEqual(["quarter", "revenue", "double_revenue"]);
  });
  expect(session.result.current[0].rawSql).toBe(WRAPPED_SQL);
  expect(_getColumnIds(session).slice(0, 2)).toEqual(columnIdsBefore);
  expect(session.result.current[0].vizConfig).toEqual(chartBefore);
});

it("restores the SQL and chart config from before the command on Undo", async () => {
  const session = await _renderExplorerWithBarChart();
  const chartBefore = session.result.current[0].vizConfig;
  fireEvent.click(
    await screen.findByRole("button", { name: "Double revenue" }),
  );
  await waitFor(() => {
    expect(session.result.current[0].lastResultColumns).toHaveLength(3);
  });
  act(() => {
    session.result.current[1].setActiveVizType("line");
  });

  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

  await waitFor(() => {
    expect(session.result.current[0].rawSql).toBe(BASE_SQL);
  });
  expect(session.result.current[0].vizConfig).toEqual(chartBefore);
});
```

- [ ] **Step 8: Run it and confirm it fails**

Run: `pnpm vitest run src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx`
Expected: FAIL, `Tests  2 failed (2)`: the stand-in button stays disabled because `DataExplorerApp` passes no `getDataExplorerBridge`, so `runs the wrapped SQL ...` gets `expected [ 'quarter', 'revenue' ] to deeply equal [ 'quarter', 'revenue', …(1) ]` and `restores the SQL ...` gets `expected [ ... ] to have a length of 3 but got 2`.

- [ ] **Step 9: Wire the bridge into `DataExplorerApp`**

In `src/views/DataExplorerApp/DataExplorerApp.tsx`, add the import:

```tsx
// before
import { useDataExplorerPluginContext } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";
// after
import { useDataExplorerPluginBridge } from "@/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge";
import { useDataExplorerPluginContext } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";
```

build the bridge after the plugin context:

```tsx
// before
  const pluginContext = useDataExplorerPluginContext({
    queryResults,
    isLoadingResults,
  });
```

```tsx
// after
  const pluginContext = useDataExplorerPluginContext({
    queryResults,
    isLoadingResults,
  });
  const pluginBridge = useDataExplorerPluginBridge({
    executedSql: isLoadingResults ? undefined : queryResults?.executedSql,
  });
```

and pass it to the slot:

```tsx
// before
            getContext={pluginContext.getContext}
            facts={pluginContext.facts}
// after
            getContext={pluginContext.getContext}
            getDataExplorerBridge={pluginBridge}
            facts={pluginContext.facts}
```

- [ ] **Step 10: Run the tests and checks**

Run: `pnpm vitest run src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx`
Expected: PASS, `Tests  2 passed (2)`.

Run: `pnpm vitest run src/views/DataExplorerApp src/lib/plugins`
Expected: PASS, `Test Files  78 passed (78)`, `Tests  582 passed (582)`.

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataExplorerApp/DataExplorerApp.tsx src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.tsx src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.test.tsx src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.ts src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.test.tsx && pnpm exec eslint src/views/DataExplorerApp && pnpm exec tsc -b --noEmit 2>&1 | grep "error TS"`
Expected: `Finished in ...ms on 6 files`, no ESLint output, and no type errors.

- [ ] **Step 11: Check the bundle budget**

Run: `pnpm check:plugin-bundle`
Expected: `✓ built in ...` and no `Plugin bundle check failed:` line. With Tasks 1 to 9 the host measured 39,276 bytes against a 39,600 byte budget.

- [ ] **Step 12: Commit**

```bash
git add src/views/DataExplorerApp/DataExplorerApp.tsx \
  src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx \
  src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.tsx \
  src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.test.tsx \
  src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.ts \
  src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.test.tsx
git commit -m "$(cat <<'EOF'
feat(data-explorer): let toolbar commands add columns, with Undo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Epidemiology: `makeColumnNameSlugFromName`

**Files:**
- Create: `plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName.ts`
- Test: `plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName.test.ts`

**Context:** `avandar.dataExplorer.addColumns` accepts only names matching
`^[a-z][a-z0-9_]*$` (contract 7), and the rolling average names its column
after the value column (`cases_7d_avg`), whose name can be anything a query
returns (`New Cases`, `2024`, `Població`). This helper (contract 14) turns any
name into one the host accepts: lowercase, each run of other characters to one
underscore, trimmed, `c_` before a leading digit, and `value` when nothing is
left. Plugin code style: block-bodied arrows, extensionless relative imports,
explicit return types, no loops. Nothing here depends on the host tasks.

- [ ] **Step 1: Write the failing test**

`plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeColumnNameSlugFromName } from "./makeColumnNameSlugFromName";

describe("makeColumnNameSlugFromName", () => {
  it("keeps a name that is already lowercase snake case", () => {
    expect(makeColumnNameSlugFromName("case_count")).toBe("case_count");
  });

  it("lowercases letters", () => {
    expect(makeColumnNameSlugFromName("Cases")).toBe("cases");
  });

  it("turns each run of other characters into one underscore", () => {
    expect(makeColumnNameSlugFromName("New cases - (7d)")).toBe("new_cases_7d");
  });

  it("trims underscores from both ends", () => {
    expect(makeColumnNameSlugFromName("__cases__")).toBe("cases");
    expect(makeColumnNameSlugFromName("  Cases!  ")).toBe("cases");
  });

  it("drops letters outside a to z", () => {
    expect(makeColumnNameSlugFromName("Població")).toBe("poblaci");
  });

  it("prefixes c_ when the slug starts with a digit", () => {
    expect(makeColumnNameSlugFromName("2024 cases")).toBe("c_2024_cases");
  });

  it("returns value when nothing is left", () => {
    expect(makeColumnNameSlugFromName("")).toBe("value");
    expect(makeColumnNameSlugFromName("%%%")).toBe("value");
  });

  it.each(["Case Count", "7-day", "___", "Ünïcödé", "a1_B2"])(
    "makes a name the host accepts from %j",
    (name) => {
      expect(makeColumnNameSlugFromName(name)).toMatch(/^[a-z][a-z0-9_]*$/);
    },
  );
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName`
Expected: FAIL, `Error: Failed to resolve import "./makeColumnNameSlugFromName" from "plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName.test.ts". Does the file exist?`

- [ ] **Step 3: Implement it**

`plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName.ts`:

```ts
/** What a name with no letters or digits becomes. */
const EMPTY_SLUG = "value";

/**
 * Makes a column name the Data Explorer accepts for an added column
 * (`^[a-z][a-z0-9_]*$`) from any column name, so a command can name its
 * output after an input, such as `cases_7d_avg` from "Cases". It lowercases,
 * turns each run of characters outside a to z and 0 to 9 into one underscore,
 * trims underscores from the ends, and prefixes `c_` when the result starts
 * with a digit. A name with nothing left becomes `value`.
 */
export function makeColumnNameSlugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (slug === "") {
    return EMPTY_SLUG;
  }
  return /^[a-z]/.test(slug) ? slug : `c_${slug}`;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName`
Expected: PASS, `Tests  12 passed (12)`.

- [ ] **Step 5: Format, type-check, and lint**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore plugins/epidemiology/src/derivedColumns && pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: oxfmt prints `Finished in ...`; tsc and eslint exit 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName.ts \
  plugins/epidemiology/src/derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): slug column names for derived epidemiology columns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Epidemiology: `makeIncidenceColumnsFromOptions` and Byar intervals

**Files:**
- Create: `plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions.ts`
- Test: `plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.test.ts`
- Test: `plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.executed.test.ts`

**Context:** The "Incidence per 100k" command adds three `DerivedColumn`s
(contract 1) named after the base: `incidence_per_<1k|10k|100k|1m>`, `_lower`,
and `_upper` (contract 14). The rate is the spec's own example,
`{cases} * 100000.0 / NULLIF({population}, 0)`. The bounds are Byar's
approximation from the spec, in cases, then scaled the same way, so a missing
or zero population makes all three NULL. The lower bound is 0 at zero cases
(the formula divides by zero there, and DuckDB gives `Infinity`, so a `CASE`
handles it), and a negative count gets NULL bounds because DuckDB fails the
query on `sqrt` of a negative number (deviation 3). Decimal literals (`9.0`,
`3.0`, `1.96`, `100000.0`) keep the arithmetic in floating point, and the
executed test checks that `BIGINT` inputs give `DOUBLE` columns and a
non-truncated quotient. A fixed population is written into the SQL as a
number, and only `{cases}` is an input. The executed test (contract 15, real
DuckDB through `@duckdb/node-api`) cannot import `withDuckDb` from `tests/`
(deviation 2), so it opens its own database. Both test files live in
`__tests__/` because a directory holds at most one test file outside it
(deviation 1). The exact Poisson reference values were computed by bisection
on the Poisson CDF and cross-checked against the chi-square relation
(Facts discovered 8).

- [ ] **Step 1: Write the failing unit test**

`plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions";
import type {
  IncidenceBase,
  PopulationSource,
} from "../makeIncidenceColumnsFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";

const POPULATION_COLUMN: PopulationSource = {
  kind: "column",
  columnName: "pop_2024",
};

function _makeColumns(
  options: Readonly<{ population?: PopulationSource; base?: IncidenceBase }>,
): readonly DerivedColumn[] {
  return makeIncidenceColumnsFromOptions({
    casesColumn: "case_count",
    population: options.population ?? POPULATION_COLUMN,
    base: options.base ?? 100_000,
  });
}

function _getPlaceholderNames(expression: string): string[] {
  return [...expression.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(
    (match) => {
      return match[1] ?? "";
    },
  );
}

describe("makeIncidenceColumnsFromOptions", () => {
  it.each([
    [1_000, "incidence_per_1k"],
    [10_000, "incidence_per_10k"],
    [100_000, "incidence_per_100k"],
    [1_000_000, "incidence_per_1m"],
  ] as const)("names the columns after a base of %i", (base, rateName) => {
    const names = _makeColumns({ base }).map((column) => {
      return column.name;
    });
    expect(names).toEqual([rateName, `${rateName}_lower`, `${rateName}_upper`]);
  });

  it("writes the rate as cases times the base over the population", () => {
    const [rate] = _makeColumns({});
    expect(rate?.expression).toBe(
      "{cases} * 100000.0 / NULLIF({population}, 0)",
    );
  });

  it.each([1_000, 10_000, 100_000, 1_000_000] as const)(
    "scales all three columns by a base of %i as a decimal literal",
    (base) => {
      _makeColumns({ base }).forEach((column) => {
        expect(column.expression).toContain(
          `* ${base}.0 / NULLIF({population}, 0)`,
        );
      });
    },
  );

  it("binds cases and a population column as inputs", () => {
    _makeColumns({}).forEach((column) => {
      expect(column.inputs).toEqual({
        cases: "case_count",
        population: "pop_2024",
      });
    });
  });

  it("binds every placeholder an expression uses", () => {
    [POPULATION_COLUMN, { kind: "fixed", value: 8_336_817 } as const].forEach(
      (population) => {
        _makeColumns({ population }).forEach((column) => {
          _getPlaceholderNames(column.expression).forEach((name) => {
            expect(Object.keys(column.inputs)).toContain(name);
          });
        });
      },
    );
  });

  it("writes a fixed population into the expressions as a number", () => {
    const columns = _makeColumns({
      population: { kind: "fixed", value: 8_336_817 },
    });
    columns.forEach((column) => {
      expect(column.expression).toContain("NULLIF(8336817, 0)");
      expect(column.expression).not.toContain("{population}");
      expect(column.inputs).toEqual({ cases: "case_count" });
    });
  });

  it("uses decimal literals in the Byar bounds", () => {
    const [, lower, upper] = _makeColumns({});
    [lower, upper].forEach((column) => {
      expect(column?.expression).toContain("9.0 * ");
      expect(column?.expression).toContain("1.96 / (3.0 * sqrt(");
    });
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a fixed population of %s",
    (value) => {
      expect(() => {
        _makeColumns({ population: { kind: "fixed", value } });
      }).toThrow(RangeError);
    },
  );
});
```

- [ ] **Step 2: Write the failing executed test**

`plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.executed.test.ts`:

```ts
import { DuckDBInstance } from "@duckdb/node-api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions";
import type {
  IncidenceBase,
  PopulationSource,
} from "../makeIncidenceColumnsFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Runs the incidence expressions in real DuckDB, the engine the Data Explorer
 * runs them in. Plugin files cannot import the repo's executed-test harness
 * under `tests/`, so this file opens its own in-memory database.
 *
 * Reference values. Exact Poisson 95% limits (Garwood, 1936): the lower limit
 * L solves P(X >= a | L) = 0.025 and the upper limit U solves
 * P(X <= a | U) = 0.025, equal to chi2(0.025, 2a) / 2 and
 * chi2(0.975, 2a + 2) / 2, listed to 5 significant figures. Byar's
 * approximation of them is as given in Rothman and Boice, Epidemiologic
 * Analysis with a Programmable Calculator (1979), listed to 4 significant
 * figures. All values are in cases.
 */
const REFERENCE_LIMITS = [
  { cases: 0, exact: [0, 3.6889], byar: [0, 3.668] },
  { cases: 1, exact: [0.025318, 5.5716], byar: [0.01307, 5.564] },
  { cases: 5, exact: [1.6235, 11.668], byar: [1.611, 11.67] },
  { cases: 10, exact: [4.7954, 18.39], byar: [4.787, 18.39] },
  { cases: 20, exact: [12.217, 30.888], byar: [12.21, 30.89] },
  { cases: 100, exact: [81.364, 121.63], byar: [81.36, 121.6] },
] as const;

/**
 * How far Byar's limits may sit from the exact ones, in cases. The largest
 * gaps in the table are 0.021 cases, at the upper limit for 0 cases, and
 * 0.012 cases, at the lower limits for 1 and 5 cases.
 */
const BYAR_TOLERANCE_IN_CASES = 0.025;

/** Case counts and populations, typed as the Data Explorer reads them. */
const FIXTURE_SQL = `
  CREATE TABLE boroughs AS SELECT * FROM (VALUES
    ('no population', 12::BIGINT, NULL::BIGINT),
    ('zero population', 12, 0),
    ('one in three', 1, 3),
    ('ten in 250k', 10, 250000),
    ('negative', -1, 100000),
    ('a0', 0, 100000),
    ('a1', 1, 100000),
    ('a5', 5, 100000),
    ('a10', 10, 100000),
    ('a20', 20, 100000),
    ('a100', 100, 100000)
  ) AS t(borough, case_count, pop_2024);
`;

type IncidenceRow = Readonly<{
  rate: number | null;
  lower: number | null;
  upper: number | null;
}>;

let instance: DuckDBInstance;
let connection: DuckDBConnection;

function _getNumberFromValue(value: unknown): number | null {
  if (value === null || typeof value === "number") {
    return value;
  }
  throw new Error(`Expected a DOUBLE or NULL, got ${String(value)}`);
}

/** Replaces each placeholder with its input column, quoted as the host does. */
function _getSqlFromColumn(column: DerivedColumn): string {
  return column.expression.replace(
    /\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_match, name: string) => {
      return `"${(column.inputs[name] ?? "").replaceAll('"', '""')}"`;
    },
  );
}

async function _readRows(
  options: Readonly<{ population: PopulationSource; base: IncidenceBase }>,
): Promise<Map<string, IncidenceRow>> {
  const [rate, lower, upper] = makeIncidenceColumnsFromOptions({
    casesColumn: "case_count",
    ...options,
  }).map(_getSqlFromColumn);
  const reader = await connection.runAndReadAll(
    `SELECT borough, ${rate} AS rate, ${lower} AS lower, ${upper} AS upper
     FROM boroughs`,
  );
  return new Map(
    reader.getRowObjects().map((row) => {
      return [
        String(row.borough),
        {
          rate: _getNumberFromValue(row.rate),
          lower: _getNumberFromValue(row.lower),
          upper: _getNumberFromValue(row.upper),
        },
      ];
    }),
  );
}

function _readColumnRows(
  base: IncidenceBase = 100_000,
): Promise<Map<string, IncidenceRow>> {
  return _readRows({
    population: { kind: "column", columnName: "pop_2024" },
    base,
  });
}

function _toFourSignificantFigures(value: number | null | undefined): number {
  return Number((value ?? Number.NaN).toPrecision(4));
}

beforeAll(async () => {
  instance = await DuckDBInstance.create(":memory:");
  connection = await instance.connect();
  await connection.run(FIXTURE_SQL);
});

afterAll(() => {
  connection.closeSync();
  instance.closeSync();
});

describe("makeIncidenceColumnsFromOptions executed", () => {
  it.each(["no population", "zero population"])(
    "gives NULL in all three columns for the row with %s",
    async (borough) => {
      const rows = await _readColumnRows();
      expect(rows.get(borough)).toEqual({
        rate: null,
        lower: null,
        upper: null,
      });
    },
  );

  it("gives a lower bound of 0 at zero cases", async () => {
    const row = (await _readColumnRows()).get("a0");
    expect(row?.rate).toBe(0);
    expect(row?.lower).toBe(0);
  });

  it("gives the exact rate for the chosen base", async () => {
    const rows = await _readColumnRows(1_000);
    expect(rows.get("ten in 250k")?.rate).toBe(0.04);
  });

  it("divides whole-number columns without truncating", async () => {
    const rows = await _readColumnRows(1_000);
    expect(rows.get("one in three")?.rate).toBeCloseTo(333.3333, 4);
  });

  it("returns DOUBLE columns for BIGINT inputs", async () => {
    const [rate, lower, upper] = makeIncidenceColumnsFromOptions({
      casesColumn: "case_count",
      population: { kind: "column", columnName: "pop_2024" },
      base: 100_000,
    }).map(_getSqlFromColumn);
    const reader = await connection.runAndReadAll(
      `SELECT ${rate}, ${lower}, ${upper} FROM boroughs`,
    );
    expect(reader.columnTypes().map(String)).toEqual([
      "DOUBLE",
      "DOUBLE",
      "DOUBLE",
    ]);
  });

  it("gives NULL bounds for a negative case count instead of failing", async () => {
    const row = (await _readColumnRows()).get("negative");
    expect(row).toEqual({ rate: -1, lower: null, upper: null });
  });

  it.each(REFERENCE_LIMITS)(
    "gives Byar's limits for $cases cases",
    async ({ cases, byar }) => {
      const row = (await _readColumnRows()).get(`a${cases}`);
      expect(row?.rate).toBe(cases);
      expect(_toFourSignificantFigures(row?.lower)).toBe(byar[0]);
      expect(_toFourSignificantFigures(row?.upper)).toBe(byar[1]);
    },
  );

  it.each(REFERENCE_LIMITS)(
    "stays within the tolerance of the exact limits for $cases cases",
    async ({ cases, exact }) => {
      const row = (await _readColumnRows()).get(`a${cases}`);
      expect(
        Math.abs((row?.lower ?? Number.NaN) - exact[0]),
      ).toBeLessThanOrEqual(BYAR_TOLERANCE_IN_CASES);
      expect(
        Math.abs((row?.upper ?? Number.NaN) - exact[1]),
      ).toBeLessThanOrEqual(BYAR_TOLERANCE_IN_CASES);
    },
  );

  it("divides by a fixed population written into the SQL", async () => {
    const rows = await _readRows({
      population: { kind: "fixed", value: 250_000 },
      base: 1_000,
    });
    expect(rows.get("ten in 250k")?.rate).toBe(0.04);
    expect(rows.get("no population")?.rate).toBe(0.048);
  });
});
```

- [ ] **Step 3: Run both and confirm they fail**

Run: `pnpm vitest run plugins/epidemiology/src/incidence`
Expected: FAIL, `Error: Failed to resolve import "../makeIncidenceColumnsFromOptions" from "plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.test.ts". Does the file exist?`

Run: `pnpm test:executed plugins/epidemiology`
Expected: FAIL, `Error: Cannot find module '../makeIncidenceColumnsFromOptions' imported from '.../plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.executed.test.ts'`.

- [ ] **Step 4: Implement it**

`plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions.ts`:

```ts
import type { DerivedColumn } from "@avandar/plugin-sdk";

/** How many people an incidence rate is expressed per. */
export type IncidenceBase = 1_000 | 10_000 | 100_000 | 1_000_000;

/**
 * Where an incidence rate's population comes from: a numeric column of the
 * result, one value per row, or one fixed number for every row, such as a
 * city's census population.
 */
export type PopulationSource =
  | Readonly<{ kind: "column"; columnName: string }>
  | Readonly<{ kind: "fixed"; value: number }>;

/** The part of each column name that says which base it uses. */
const BASE_NAME_SUFFIXES: Record<IncidenceBase, string> = {
  1_000: "1k",
  10_000: "10k",
  100_000: "100k",
  1_000_000: "1m",
};

/** The normal quantile for a two-sided 95% interval. */
const Z_95 = "1.96";

/**
 * Byar's lower limit, in cases. Zero cases has a lower limit of 0, and a
 * negative count has none, since DuckDB fails a query that takes the square
 * root of a negative number.
 */
const BYAR_LOWER_CASES_SQL = [
  "CASE WHEN {cases} < 0 THEN NULL WHEN {cases} = 0 THEN 0.0",
  `ELSE {cases} * power(1.0 - 1.0 / (9.0 * {cases}) - ${Z_95} / (3.0 * sqrt({cases})), 3) END`,
].join(" ");

/** Byar's upper limit, in cases. A negative count has none. */
const BYAR_UPPER_CASES_SQL = [
  "CASE WHEN {cases} < 0 THEN NULL",
  `ELSE ({cases} + 1) * power(1.0 - 1.0 / (9.0 * ({cases} + 1)) + ${Z_95} / (3.0 * sqrt({cases} + 1)), 3) END`,
].join(" ");

function _getPopulationSqlFromSource(population: PopulationSource): string {
  if (population.kind === "column") {
    return "{population}";
  }
  if (!Number.isFinite(population.value) || population.value <= 0) {
    throw new RangeError(
      `A fixed population must be a positive number, not ${population.value}`,
    );
  }
  return String(population.value);
}

function _getInputsFromOptions(
  options: Readonly<{ casesColumn: string; population: PopulationSource }>,
): Record<string, string> {
  const { casesColumn, population } = options;
  return population.kind === "column"
    ? { cases: casesColumn, population: population.columnName }
    : { cases: casesColumn };
}

/**
 * Makes the three columns the "Incidence per 100k" command adds: the rate
 * per `base` people and the lower and upper limits of its 95% confidence
 * interval, from Byar's approximation of the exact Poisson interval. They are
 * named after the base, such as `incidence_per_100k`,
 * `incidence_per_100k_lower`, and `incidence_per_100k_upper`.
 *
 * A row with a missing or zero population gets NULL in all three. A fixed
 * population is written into the SQL as a number and must be positive.
 */
export function makeIncidenceColumnsFromOptions(
  options: Readonly<{
    casesColumn: string;
    population: PopulationSource;
    base: IncidenceBase;
  }>,
): readonly DerivedColumn[] {
  const { base } = options;
  const name = `incidence_per_${BASE_NAME_SUFFIXES[base]}`;
  // The decimal base keeps the arithmetic in floating point, so whole-number
  // columns never divide as integers.
  const scale = `* ${base}.0 / NULLIF(${_getPopulationSqlFromSource(options.population)}, 0)`;
  const inputs = _getInputsFromOptions(options);
  return [
    { name, expression: `{cases} ${scale}`, inputs },
    {
      name: `${name}_lower`,
      expression: `(${BYAR_LOWER_CASES_SQL}) ${scale}`,
      inputs,
    },
    {
      name: `${name}_upper`,
      expression: `(${BYAR_UPPER_CASES_SQL}) ${scale}`,
      inputs,
    },
  ];
}
```

The two `ELSE` template lines are longer than 80 characters. ESLint accepts
them (the repo's `max-len` ignores strings and template literals), and
splitting the formula would make it harder to check against the spec.

- [ ] **Step 5: Run both and confirm they pass**

Run: `pnpm vitest run plugins/epidemiology/src/incidence`
Expected: PASS, `Tests  17 passed (17)`.

Run: `pnpm test:executed plugins/epidemiology`
Expected: PASS, `Test Files  1 passed (1)`, `Tests  20 passed (20)`.

- [ ] **Step 6: Format, type-check, and lint**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore plugins/epidemiology/src/incidence && pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: oxfmt prints `Finished in ...`; tsc and eslint exit 0 with no output.

- [ ] **Step 7: Commit**

```bash
git add plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions.ts \
  plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.test.ts \
  plugins/epidemiology/src/incidence/makeIncidenceColumnsFromOptions/__tests__/makeIncidenceColumnsFromOptions.executed.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): make incidence rate columns with Byar intervals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Epidemiology: `makeRollingAverageColumnFromOptions`

**Files:**
- Create: `plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions.ts`
- Test: `plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/__tests__/makeRollingAverageColumnFromOptions.test.ts`
- Test: `plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/__tests__/makeRollingAverageColumnFromOptions.executed.test.ts`

**Context:** The "Rolling average" command adds one column (contract 14):
`<slug(value)>_<n>d_avg` or `_<n>w_avg` (Task 10's slug), with
`avg({value}) OVER ([PARTITION BY {group} ]ORDER BY {date} RANGE BETWEEN INTERVAL <days - 1> DAY PRECEDING AND CURRENT ROW)`,
where days is the size, or the size times 7 for weeks. A `RANGE` window over a
date reaches back by date, not by row, so a missing day does not stretch it,
and every row whose date is inside the window counts. The executed test proves
that in DuckDB on a series with a gap (A has no row on 2024-01-04, so its
3-day window on 2024-01-05 averages only 3 and 5), on two groups, on week
windows, without a group-by column (every row in the window counts), and over
a `TIMESTAMP` column. The host parses this expression only with its
`snowflake` fallback (Facts discovered 5). Test placement and the DuckDB setup
follow Task 11.

- [ ] **Step 1: Write the failing unit test**

`plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/__tests__/makeRollingAverageColumnFromOptions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions";
import type { RollingWindow } from "../makeRollingAverageColumnFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";

function _makeColumn(
  options: Readonly<{
    valueColumn?: string;
    window?: RollingWindow;
    groupByColumn?: string;
  }>,
): DerivedColumn {
  return makeRollingAverageColumnFromOptions({
    valueColumn: options.valueColumn ?? "cases",
    dateColumn: "report_date",
    window: options.window ?? { size: 7, unit: "day" },
    groupByColumn: options.groupByColumn,
  });
}

describe("makeRollingAverageColumnFromOptions", () => {
  it.each([
    [{ size: 7, unit: "day" }, "cases_7d_avg"],
    [{ size: 14, unit: "day" }, "cases_14d_avg"],
    [{ size: 2, unit: "week" }, "cases_2w_avg"],
  ] as const)("names a %o window %s", (window, name) => {
    expect(_makeColumn({ window }).name).toBe(name);
  });

  it("slugs the value column's name", () => {
    expect(_makeColumn({ valueColumn: "New Cases" }).name).toBe(
      "new_cases_7d_avg",
    );
    expect(_makeColumn({ valueColumn: "2024" }).name).toBe("c_2024_7d_avg");
  });

  it.each([
    [{ size: 1, unit: "day" }, "INTERVAL 0 DAY"],
    [{ size: 7, unit: "day" }, "INTERVAL 6 DAY"],
    [{ size: 1, unit: "week" }, "INTERVAL 6 DAY"],
    [{ size: 2, unit: "week" }, "INTERVAL 13 DAY"],
  ] as const)(
    "reaches back the window minus one day for %o",
    (window, text) => {
      expect(_makeColumn({ window }).expression).toContain(
        `RANGE BETWEEN ${text} PRECEDING AND CURRENT ROW`,
      );
    },
  );

  it("partitions by the group-by column when there is one", () => {
    const column = _makeColumn({ groupByColumn: "borough" });
    expect(column.expression).toBe(
      "avg({value}) OVER (PARTITION BY {group} ORDER BY {date} " +
        "RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)",
    );
    expect(column.inputs).toEqual({
      value: "cases",
      date: "report_date",
      group: "borough",
    });
  });

  it("omits PARTITION BY without a group-by column", () => {
    const column = _makeColumn({});
    expect(column.expression).toBe(
      "avg({value}) OVER (ORDER BY {date} " +
        "RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)",
    );
    expect(column.inputs).toEqual({ value: "cases", date: "report_date" });
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects a window size of %s", (size) => {
    expect(() => {
      _makeColumn({ window: { size, unit: "day" } });
    }).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Write the failing executed test**

`plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/__tests__/makeRollingAverageColumnFromOptions.executed.test.ts`:

```ts
import { DuckDBInstance } from "@duckdb/node-api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions";
import type { RollingWindow } from "../makeRollingAverageColumnFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Runs the rolling average expression in real DuckDB, the engine the Data
 * Explorer runs it in. Plugin files cannot import the repo's executed-test
 * harness under `tests/`, so this file opens its own in-memory database.
 */
const FIXTURE_SQL = `
  CREATE TABLE borough_cases AS SELECT * FROM (VALUES
    ('A', DATE '2024-01-01', 1::BIGINT),
    ('A', DATE '2024-01-02', 2),
    ('A', DATE '2024-01-03', 3),
    ('A', DATE '2024-01-05', 5),
    ('B', DATE '2024-01-01', 10),
    ('B', DATE '2024-01-02', 20),
    ('B', DATE '2024-01-03', 30),
    ('B', DATE '2024-01-04', 40),
    ('B', DATE '2024-01-05', 50)
  ) AS t(borough, report_date, cases);

  CREATE TABLE daily_cases AS
    SELECT
      report_date,
      CAST(report_date AS TIMESTAMP) + INTERVAL 9 HOUR AS reported_at,
      day_offset + 1 AS cases
    FROM (
      SELECT
        day_offset,
        DATE '2024-01-01' + CAST(day_offset AS INTEGER) AS report_date
      FROM range(0, 15) AS t(day_offset)
    );
`;

let instance: DuckDBInstance;
let connection: DuckDBConnection;

/** Replaces each placeholder with its input column, quoted as the host does. */
function _getSqlFromColumn(column: DerivedColumn): string {
  return column.expression.replace(
    /\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_match, name: string) => {
      return `"${(column.inputs[name] ?? "").replaceAll('"', '""')}"`;
    },
  );
}

/**
 * Runs the column over `table` and returns its value per row, keyed by the
 * row's `key` SQL, such as `borough || ' ' || report_date`.
 */
async function _readAverages(
  options: Readonly<{
    table: string;
    key: string;
    dateColumn?: string;
    window: RollingWindow;
    groupByColumn?: string;
  }>,
): Promise<Map<string, number>> {
  const column = makeRollingAverageColumnFromOptions({
    valueColumn: "cases",
    dateColumn: options.dateColumn ?? "report_date",
    window: options.window,
    groupByColumn: options.groupByColumn,
  });
  const reader = await connection.runAndReadAll(
    `SELECT CAST(${options.key} AS VARCHAR) AS row_key,
       ${_getSqlFromColumn(column)} AS average
     FROM ${options.table}`,
  );
  return new Map(
    reader.getRowObjects().map((row) => {
      return [String(row.row_key), Number(row.average)];
    }),
  );
}

function _readBoroughAverages(
  groupByColumn: string | undefined,
): Promise<Map<string, number>> {
  return _readAverages({
    table: "borough_cases",
    key: "borough || ' ' || report_date",
    window: { size: 3, unit: "day" },
    groupByColumn,
  });
}

beforeAll(async () => {
  instance = await DuckDBInstance.create(":memory:");
  connection = await instance.connect();
  await connection.run(FIXTURE_SQL);
});

afterAll(() => {
  connection.closeSync();
  instance.closeSync();
});

describe("makeRollingAverageColumnFromOptions executed", () => {
  it("averages only the dates inside the window when a day is missing", async () => {
    const averages = await _readBoroughAverages("borough");
    // A has no row on 2024-01-04, so its 3-day window on 2024-01-05 holds
    // 2024-01-03 and 2024-01-05 only. A row-count window would reach back to
    // 2024-01-02 and give 3.33.
    expect(averages.get("A 2024-01-05")).toBe(4);
  });

  it("averages each group on its own", async () => {
    const averages = await _readBoroughAverages("borough");
    expect(
      ["01", "02", "03", "05"].map((day) => {
        return averages.get(`A 2024-01-${day}`);
      }),
    ).toEqual([1, 1.5, 2, 4]);
    expect(
      ["01", "02", "03", "04", "05"].map((day) => {
        return averages.get(`B 2024-01-${day}`);
      }),
    ).toEqual([10, 15, 20, 30, 40]);
  });

  it("averages every row in the window without a group-by column", async () => {
    const averages = await _readBoroughAverages(undefined);
    // 2024-01-03 to 2024-01-05 across both boroughs: 3, 5, 30, 40, and 50.
    expect(averages.get("B 2024-01-05")).toBe(25.6);
  });

  it.each([
    [1, "2024-01-10", 7],
    [1, "2024-01-15", 12],
    [2, "2024-01-15", 8.5],
  ])(
    "averages a %i-week window ending %s over the days in it",
    async (size, day, average) => {
      const averages = await _readAverages({
        table: "daily_cases",
        key: "report_date",
        window: { size, unit: "week" },
      });
      expect(averages.get(day)).toBe(average);
    },
  );

  it("reaches back whole days from a timestamp column", async () => {
    const averages = await _readAverages({
      table: "daily_cases",
      key: "report_date",
      dateColumn: "reported_at",
      window: { size: 7, unit: "day" },
    });
    expect(averages.get("2024-01-10")).toBe(7);
  });
});
```

- [ ] **Step 3: Run both and confirm they fail**

Run: `pnpm vitest run plugins/epidemiology/src/rollingAverage`
Expected: FAIL, `Error: Failed to resolve import "../makeRollingAverageColumnFromOptions" from "plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/__tests__/makeRollingAverageColumnFromOptions.test.ts". Does the file exist?`

Run: `pnpm test:executed plugins/epidemiology/src/rollingAverage`
Expected: FAIL, `Error: Cannot find module '../makeRollingAverageColumnFromOptions' imported from '.../makeRollingAverageColumnFromOptions.executed.test.ts'`.

- [ ] **Step 4: Implement it**

`plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions.ts`:

```ts
import { makeColumnNameSlugFromName } from "../../derivedColumns/makeColumnNameSlugFromName/makeColumnNameSlugFromName";
import type { DerivedColumn } from "@avandar/plugin-sdk";

/** How far back a rolling average reaches, such as 7 days or 2 weeks. */
export type RollingWindow = Readonly<{ size: number; unit: "day" | "week" }>;

const DAYS_PER_UNIT = { day: 1, week: 7 } as const;

/** The part of the column name that says the window's unit. */
const UNIT_NAME_SUFFIXES = { day: "d", week: "w" } as const;

/**
 * Makes the column the "Rolling average" command adds: the average of
 * `valueColumn` over the window ending at each row's date, such as
 * `cases_7d_avg` for 7 days of `cases`. With a group-by column, each group
 * is averaged on its own.
 *
 * The window is a date range, not a row count, so a missing day does not
 * stretch it, and every row with a date inside it counts. That fits a result
 * with one row per date, or per date and group.
 */
export function makeRollingAverageColumnFromOptions(
  options: Readonly<{
    valueColumn: string;
    dateColumn: string;
    window: RollingWindow;
    groupByColumn: string | undefined;
  }>,
): DerivedColumn {
  const { valueColumn, dateColumn, window: rollingWindow } = options;
  const { size, unit } = rollingWindow;
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(
      `A rolling window must be a whole number of at least 1, not ${size}`,
    );
  }
  const precedingDays = size * DAYS_PER_UNIT[unit] - 1;
  const partition =
    options.groupByColumn === undefined ? "" : "PARTITION BY {group} ";
  return {
    name: `${makeColumnNameSlugFromName(valueColumn)}_${size}${UNIT_NAME_SUFFIXES[unit]}_avg`,
    expression:
      `avg({value}) OVER (${partition}ORDER BY {date} ` +
      `RANGE BETWEEN INTERVAL ${precedingDays} DAY PRECEDING AND CURRENT ROW)`,
    inputs:
      options.groupByColumn === undefined
        ? { value: valueColumn, date: dateColumn }
        : {
            value: valueColumn,
            date: dateColumn,
            group: options.groupByColumn,
          },
  };
}
```

`window` is destructured as `rollingWindow` so it does not shadow the DOM
global.

- [ ] **Step 5: Run both and confirm they pass**

Run: `pnpm vitest run plugins/epidemiology/src/rollingAverage`
Expected: PASS, `Tests  14 passed (14)`.

Run: `pnpm test:executed plugins/epidemiology`
Expected: PASS, `Test Files  2 passed (2)`, `Tests  27 passed (27)` (Task 11's 20 plus 7).

- [ ] **Step 6: Format, type-check, and lint**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore plugins/epidemiology/src/rollingAverage && pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: oxfmt prints `Finished in ...`; tsc and eslint exit 0 with no output.

- [ ] **Step 7: Commit**

```bash
git add plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions.ts \
  plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/__tests__/makeRollingAverageColumnFromOptions.test.ts \
  plugins/epidemiology/src/rollingAverage/makeRollingAverageColumnFromOptions/__tests__/makeRollingAverageColumnFromOptions.executed.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): make a rolling average column over a date range window

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Epidemiology: `IncidenceModal`

**Files:**
- Create: `plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.ts`
- Test: `plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.test.ts`
- Create: `plugins/epidemiology/src/derivedColumns/useAddColumns.ts`
- Create: `plugins/epidemiology/src/derivedColumns/AddColumnsFooter.tsx`
- Create: `plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.tsx`
- Create: `plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.types.ts`
- Create: `plugins/epidemiology/src/incidence/IncidenceModal/IncidenceForm.tsx`
- Create: `plugins/epidemiology/src/incidence/IncidenceModal/useIncidenceForm.ts`
- Create: `plugins/epidemiology/src/incidence/IncidenceModal/PopulationFields.tsx`
- Create: `plugins/epidemiology/src/incidence/IncidenceModal/RateBaseControl.tsx`
- Test: `plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.test.tsx`
- Modify: `plugins/epidemiology/locales/en.json` (adds the modal's strings)

**Context:** The modal follows `RegressionModal/`: a top-level
`IncidenceModal` reads `useAvandar().context.columns` and shows a yellow
`Alert` instead of the form when `avandar.dataExplorer` is undefined or the
result has no numeric column (contract 14). The form asks for the cases column
(numeric `Select`, default the first numeric column), the population as a
`SegmentedControl` ("Column" / "Fixed number") with a numeric `Select`
(default the second numeric column) or a `NumberInput` (min 1), and the rate
base as a `SegmentedControl` of 1,000 / 10,000 / 100,000 (default) /
1,000,000, written through the ICU `{base, number}` so it follows the
workspace locale. With one numeric column it starts on "Fixed number". "Add
columns" stays disabled until a fixed population is a number of at least 1
(Mantine's `min` clamps only on blur). Submitting calls
`avandar.dataExplorer.addColumns(makeIncidenceColumnsFromOptions(...))`, then
`avandar.ui.closeModal()`; a rejection shows `incidence.failed` with the error
message in a red `Alert` and keeps the modal open. The submit, close, and
error state live in `useAddColumns`, and the alert plus button in
`AddColumnsFooter`, both shared with Task 14. Form state lives in
`useIncidenceForm`, so each function stays under 45 lines and the population
fields share one `PopulationInput` value. `getColumnNamesFromColumns` filters
columns by type: numeric is `bigint` and `double`, and temporal is `date` and
`timestamp` (a `time` cannot be ordered by a day range, and the toolbar's
`dateColumnCount` counts the same two). The tests build a fake `AvandarApi`
as `RegressionModal.test.tsx` does, plus `ui.closeModal` and
`dataExplorer.addColumns` (contract 1), and translate with the real
`locales/en.json`, which is why this task adds the modal strings (Facts
discovered 7).

- [ ] **Step 1: Write the failing test for `getColumnNamesFromColumns`**

`plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getColumnNamesFromColumns,
  NUMERIC_DATA_TYPES,
  TEMPORAL_DATA_TYPES,
} from "./getColumnNamesFromColumns";
import type { DataExplorerToolbarContext } from "@avandar/plugin-sdk";

const COLUMNS: DataExplorerToolbarContext["columns"] = [
  { name: "borough", dataType: "varchar" },
  { name: "cases", dataType: "bigint" },
  { name: "report_date", dataType: "date" },
  { name: "rate", dataType: "double" },
  { name: "reported_at", dataType: "timestamp" },
  { name: "onset_time", dataType: "time" },
];

describe("getColumnNamesFromColumns", () => {
  it("gets whole-number and decimal columns as numeric, in result order", () => {
    expect(
      getColumnNamesFromColumns({
        columns: COLUMNS,
        dataTypes: NUMERIC_DATA_TYPES,
      }),
    ).toEqual(["cases", "rate"]);
  });

  it("gets date and timestamp columns as temporal, but not time of day", () => {
    expect(
      getColumnNamesFromColumns({
        columns: COLUMNS,
        dataTypes: TEMPORAL_DATA_TYPES,
      }),
    ).toEqual(["report_date", "reported_at"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns`
Expected: FAIL, `Error: Failed to resolve import "./getColumnNamesFromColumns" from "plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.test.ts". Does the file exist?`

- [ ] **Step 3: Implement `getColumnNamesFromColumns`**

`plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.ts`:

```ts
import type {
  DataExplorerToolbarContext,
  PluginColumnDataType,
} from "@avandar/plugin-sdk";

/** The column types a numeric column picker offers. */
export const NUMERIC_DATA_TYPES: readonly PluginColumnDataType[] = [
  "bigint",
  "double",
];

/**
 * The column types a date column picker offers: the types a date range
 * window can order by. A time of day has no date, so it is left out.
 */
export const TEMPORAL_DATA_TYPES: readonly PluginColumnDataType[] = [
  "date",
  "timestamp",
];

/**
 * Gets the names of the result columns whose type is one of `dataTypes`, in
 * result order, so a command's form can offer only the columns a field
 * accepts, such as the numeric columns for a case count.
 */
export function getColumnNamesFromColumns(
  options: Readonly<{
    columns: DataExplorerToolbarContext["columns"];
    dataTypes: readonly PluginColumnDataType[];
  }>,
): string[] {
  const { columns, dataTypes } = options;
  return columns
    .filter((column) => {
      return dataTypes.includes(column.dataType);
    })
    .map((column) => {
      return column.name;
    });
}
```

Run: `pnpm vitest run plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns`
Expected: PASS, `Tests  2 passed (2)`.

- [ ] **Step 4: Write the failing modal test**

`plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.test.tsx`:

```tsx
import {
  AvandarProvider,
  makePluginTranslator,
  PluginError,
} from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import englishMessages from "../../../locales/en.json";
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import { IncidenceModal } from "./IncidenceModal";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

type Column = AvandarApi["context"]["columns"][number];
type AddColumns = NonNullable<AvandarApi["dataExplorer"]>["addColumns"];

const BOROUGH_COLUMNS: readonly Column[] = [
  { name: "borough", dataType: "varchar" },
  { name: "case_count", dataType: "bigint" },
  { name: "pop_2024", dataType: "bigint" },
  { name: "deaths", dataType: "bigint" },
];

function _renderModal(
  options: Readonly<{
    columns?: readonly Column[];
    addColumns?: AddColumns;
    hasDataExplorer?: boolean;
  }>,
): { addColumns: ReturnType<typeof vi.fn>; closeModal: () => void } {
  const addColumns = vi.fn(
    options.addColumns ??
      (() => {
        return Promise.resolve({ columnNames: [] });
      }),
  );
  const closeModal = vi.fn();
  const api: AvandarApi = {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: options.columns ?? BOROUGH_COLUMNS,
      rowCount: 5,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: { fetchRows: vi.fn() },
    ui: {
      openModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
      closeModal,
    },
    dataExplorer:
      options.hasDataExplorer === false ? undefined : { addColumns },
    i18n: {
      t: makePluginTranslator({
        locale: "en-US",
        messages: { en: englishMessages },
      }),
    },
  };
  render(
    <MantineProvider>
      <AvandarProvider api={api}>
        <IncidenceModal />
      </AvandarProvider>
    </MantineProvider>,
  );
  return { addColumns, closeModal };
}

function _pickOption(selectLabel: string, optionName: string): void {
  fireEvent.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = screen.getByRole("listbox", {
    name: selectLabel,
    hidden: true,
  });
  fireEvent.click(
    within(listbox).getByRole("option", { name: optionName, hidden: true }),
  );
}

function _clickRadio(groupName: string, optionName: string): void {
  const group = screen.getByRole("radiogroup", { name: groupName });
  fireEvent.click(within(group).getByRole("radio", { name: optionName }));
}

function _clickAdd(): void {
  fireEvent.click(screen.getByRole("button", { name: "Add columns" }));
}

describe("IncidenceModal", () => {
  it("defaults to the first two numeric columns and a rate per 100,000", () => {
    _renderModal({});
    expect(screen.getByRole("combobox", { name: "Cases column" })).toHaveValue(
      "case_count",
    );
    expect(
      screen.getByRole("combobox", { name: "Population column" }),
    ).toHaveValue("pop_2024");
    expect(screen.getByRole("radio", { name: "100,000" })).toBeChecked();
  });

  it("adds the rate and interval columns for the chosen columns, then closes", async () => {
    const { addColumns, closeModal } = _renderModal({});
    _clickAdd();
    await waitFor(() => {
      expect(closeModal).toHaveBeenCalledTimes(1);
    });
    expect(addColumns).toHaveBeenCalledWith(
      makeIncidenceColumnsFromOptions({
        casesColumn: "case_count",
        population: { kind: "column", columnName: "pop_2024" },
        base: 100_000,
      }),
    );
  });

  it("adds columns per the chosen base over a fixed population", async () => {
    const { addColumns } = _renderModal({});
    _clickRadio("Population", "Fixed number");
    fireEvent.change(screen.getByRole("textbox", { name: "Population size" }), {
      target: { value: "8336817" },
    });
    _clickRadio("Rate per", "1,000");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledWith(
        makeIncidenceColumnsFromOptions({
          casesColumn: "case_count",
          population: { kind: "fixed", value: 8_336_817 },
          base: 1_000,
        }),
      );
    });
  });

  it("adds columns for a cases column the user picks", async () => {
    const { addColumns } = _renderModal({});
    _pickOption("Cases column", "deaths");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledTimes(1);
    });
    expect(addColumns.mock.calls[0]?.[0]?.[0]?.inputs).toEqual({
      cases: "deaths",
      population: "pop_2024",
    });
  });

  it("starts on a fixed population when there is one numeric column", () => {
    _renderModal({
      columns: [
        { name: "borough", dataType: "varchar" },
        { name: "case_count", dataType: "bigint" },
      ],
    });
    expect(screen.getByRole("radio", { name: "Fixed number" })).toBeChecked();
    expect(
      screen.getByRole("textbox", { name: "Population size" }),
    ).toBeInTheDocument();
  });

  it("disables Add columns until the fixed population is at least 1", () => {
    _renderModal({});
    _clickRadio("Population", "Fixed number");
    const addButton = screen.getByRole("button", { name: "Add columns" });
    expect(addButton).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Population size" }), {
      target: { value: "1" },
    });
    expect(addButton).toBeEnabled();
  });

  it("shows why the columns were not added and stays open", async () => {
    const { closeModal } = _renderModal({
      addColumns: () => {
        return Promise.reject(
          new PluginError(
            "InvalidHandle",
            "This query result is no longer available. Run the command again.",
          ),
        );
      },
    });
    _clickAdd();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not add the columns: This query result is no longer available. Run the command again.",
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add columns" })).toBeEnabled();
  });

  it("explains that a numeric column is needed when there is none", () => {
    _renderModal({ columns: [{ name: "borough", dataType: "varchar" }] });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This command needs a numeric column of case counts.",
    );
    expect(
      screen.queryByRole("button", { name: "Add columns" }),
    ).not.toBeInTheDocument();
  });

  it("explains that columns can be added only in the Data Explorer without its API", () => {
    _renderModal({ hasDataExplorer: false });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Columns can be added only to a query result in the Data Explorer.",
    );
    expect(
      screen.queryByRole("button", { name: "Add columns" }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/incidence/IncidenceModal`
Expected: FAIL, `Error: Failed to resolve import "./IncidenceModal" from "plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.test.tsx". Does the file exist?`

- [ ] **Step 6: Add the modal strings**

In `plugins/epidemiology/locales/en.json`, replace the last two lines

```json
  "viz.ratePlot.empty": "No rows have a numeric rate to plot."
}
```

with

```json
  "viz.ratePlot.empty": "No rows have a numeric rate to plot.",
  "incidence.description": "Adds three columns: the rate, and the lower and upper limits of its 95% confidence interval.",
  "incidence.casesColumn": "Cases column",
  "incidence.population": "Population",
  "incidence.population.column": "Column",
  "incidence.population.fixed": "Fixed number",
  "incidence.populationColumn": "Population column",
  "incidence.populationSize": "Population size",
  "incidence.base": "Rate per",
  "incidence.base.option": "{base, number}",
  "incidence.add": "Add columns",
  "incidence.noNumericColumns": "This command needs a numeric column of case counts.",
  "incidence.unavailable": "Columns can be added only to a query result in the Data Explorer. Run a query there, then try again.",
  "incidence.failed": "Could not add the columns: {message}"
}
```

- [ ] **Step 7: Add the shared submit hook and footer**

`plugins/epidemiology/src/derivedColumns/useAddColumns.ts`:

```ts
import { useAvandar } from "@avandar/plugin-sdk";
import { useState } from "react";
import type { DerivedColumn } from "@avandar/plugin-sdk";

/**
 * What `useAddColumns` gives a command's form: whether columns are being
 * added, why the last attempt failed, and the function that adds them.
 */
type AddColumnsState = Readonly<{
  isAdding: boolean;

  /** The reason the last attempt failed, or undefined when it has not. */
  errorMessage: string | undefined;

  /**
   * Adds the columns `makeColumns` returns to the Data Explorer query the
   * command was invoked on, then closes the modal. On a failure, including
   * one thrown by `makeColumns`, it keeps the modal open and sets
   * `errorMessage`.
   */
  addColumns: (makeColumns: () => readonly DerivedColumn[]) => Promise<void>;
}>;

/**
 * Adds computed columns from a command's modal through
 * `avandar.dataExplorer.addColumns`, and closes the modal once they are
 * added. Call it from a form's submit button, for example the incidence
 * command's "Add columns" button.
 */
export function useAddColumns(): AddColumnsState {
  const avandar = useAvandar();
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const addColumns = async (
    makeColumns: () => readonly DerivedColumn[],
  ): Promise<void> => {
    const { dataExplorer } = avandar;
    // The modals render no form without the Data Explorer API.
    if (dataExplorer === undefined) {
      return;
    }
    setIsAdding(true);
    setErrorMessage(undefined);
    try {
      await dataExplorer.addColumns(makeColumns());
      avandar.ui.closeModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAdding(false);
    }
  };
  return { isAdding, errorMessage, addColumns };
}
```

`plugins/epidemiology/src/derivedColumns/AddColumnsFooter.tsx`:

```tsx
import { Alert, Button } from "@avandar/plugin-ui";
import type { ReactNode } from "react";

type Props = {
  buttonLabel: string;

  /** Why the last attempt failed, translated, or undefined when it has not. */
  errorText: string | undefined;
  isAdding: boolean;
  isDisabled: boolean;
  onAdd: () => void;
};

/**
 * The end of a form that adds columns to the Data Explorer query: why the
 * last attempt failed, if it did, and the button that adds the columns. Use
 * it under a command's fields, for example the incidence command's.
 */
export function AddColumnsFooter(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.errorText === undefined ? null : (
        <Alert color="red">{props.errorText}</Alert>
      )}
      <Button
        loading={props.isAdding}
        disabled={props.isDisabled}
        onClick={props.onAdd}
      >
        {props.buttonLabel}
      </Button>
    </>
  );
}
```

- [ ] **Step 8: Implement the modal**

`plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.types.ts`:

```ts
import type { PopulationSource } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";

/**
 * The population fields of the incidence form as the user left them: which
 * source is chosen, the chosen column, and the fixed population as typed (a
 * number, or "" while empty). `useIncidenceForm` turns it into a
 * `PopulationSource` once it is valid.
 */
export type PopulationInput = {
  kind: PopulationSource["kind"];
  columnName: string;
  size: number | string;
};
```

`plugins/epidemiology/src/incidence/IncidenceModal/useIncidenceForm.ts`:

```ts
import { useState } from "react";
import { useAddColumns } from "../../derivedColumns/useAddColumns";
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import type {
  IncidenceBase,
  PopulationSource,
} from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import type { PopulationInput } from "./IncidenceModal.types";

/** The incidence form's values, their setters, and the add action. */
type IncidenceFormState = Readonly<{
  casesColumn: string;
  setCasesColumn: (columnName: string) => void;
  populationInput: PopulationInput;
  setPopulationInput: (populationInput: PopulationInput) => void;
  base: IncidenceBase;
  setBase: (base: IncidenceBase) => void;

  /** True while the population is invalid, such as an empty fixed number. */
  isAddDisabled: boolean;
  isAdding: boolean;
  errorMessage: string | undefined;
  onAdd: () => void;
}>;

function _getPopulationSourceFromInput(
  populationInput: PopulationInput,
): PopulationSource | undefined {
  const { kind, columnName, size } = populationInput;
  if (kind === "column") {
    return { kind, columnName };
  }
  return typeof size === "number" && Number.isFinite(size) && size >= 1
    ? { kind, value: size }
    : undefined;
}

/**
 * Holds the incidence form's values and adds its columns. A population
 * column is chosen by default when the result has a second numeric column,
 * and a fixed number otherwise. `IncidenceForm` is its only caller.
 */
export function useIncidenceForm(
  options: Readonly<{
    initialCasesColumn: string;
    initialPopulationColumn: string | undefined;
  }>,
): IncidenceFormState {
  const { initialCasesColumn, initialPopulationColumn } = options;
  const { isAdding, errorMessage, addColumns } = useAddColumns();
  const [casesColumn, setCasesColumn] = useState(initialCasesColumn);
  const [populationInput, setPopulationInput] = useState<PopulationInput>({
    kind: initialPopulationColumn === undefined ? "fixed" : "column",
    columnName: initialPopulationColumn ?? initialCasesColumn,
    size: "",
  });
  const [base, setBase] = useState<IncidenceBase>(100_000);
  const population = _getPopulationSourceFromInput(populationInput);
  const onAdd = (): void => {
    if (population === undefined) {
      return;
    }
    void addColumns(() => {
      return makeIncidenceColumnsFromOptions({ casesColumn, population, base });
    });
  };
  return {
    casesColumn,
    setCasesColumn,
    populationInput,
    setPopulationInput,
    base,
    setBase,
    isAddDisabled: population === undefined,
    isAdding,
    errorMessage,
    onAdd,
  };
}
```

`plugins/epidemiology/src/incidence/IncidenceModal/PopulationFields.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import {
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@avandar/plugin-ui";
import { useId } from "react";
import type { PopulationInput } from "./IncidenceModal.types";
import type { ReactNode } from "react";

type Props = {
  numericColumnNames: readonly string[];
  value: PopulationInput;
  onChange: (value: PopulationInput) => void;
};

/**
 * Where the population comes from, a numeric column or a fixed number, and
 * the field for whichever is chosen. `IncidenceForm` owns the values.
 */
export function PopulationFields(props: Readonly<Props>): ReactNode {
  const { value, onChange } = props;
  const t = useT();
  const labelId = useId();
  return (
    <Stack gap="xs">
      <Text id={labelId} size="sm" fw={500}>
        {t("incidence.population")}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        value={value.kind}
        data={[
          { value: "column", label: t("incidence.population.column") },
          { value: "fixed", label: t("incidence.population.fixed") },
        ]}
        onChange={(kind) => {
          onChange({ ...value, kind: kind === "fixed" ? "fixed" : "column" });
        }}
      />
      {value.kind === "column" ? (
        <Select
          label={t("incidence.populationColumn")}
          data={props.numericColumnNames}
          value={value.columnName}
          allowDeselect={false}
          onChange={(columnName) => {
            onChange({ ...value, columnName: columnName ?? value.columnName });
          }}
        />
      ) : (
        <NumberInput
          label={t("incidence.populationSize")}
          min={1}
          allowNegative={false}
          value={value.size}
          onChange={(size) => {
            onChange({ ...value, size });
          }}
        />
      )}
    </Stack>
  );
}
```

`plugins/epidemiology/src/incidence/IncidenceModal/RateBaseControl.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { SegmentedControl, Stack, Text } from "@avandar/plugin-ui";
import { useId } from "react";
import type { IncidenceBase } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import type { ReactNode } from "react";

type Props = {
  base: IncidenceBase;
  onBaseChange: (base: IncidenceBase) => void;
};

/** The rate bases the user can pick, smallest first. */
const RATE_BASES: readonly IncidenceBase[] = [
  1_000, 10_000, 100_000, 1_000_000,
];

/**
 * The rate base picker: how many people the rate is expressed per, written
 * in the workspace's number format. `IncidenceForm` owns the value.
 */
export function RateBaseControl(props: Readonly<Props>): ReactNode {
  const t = useT();
  const labelId = useId();
  return (
    <Stack gap="xs">
      <Text id={labelId} size="sm" fw={500}>
        {t("incidence.base")}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        value={String(props.base)}
        data={RATE_BASES.map((base) => {
          return {
            value: String(base),
            label: t("incidence.base.option", { base }),
          };
        })}
        onChange={(value) => {
          const base = RATE_BASES.find((rateBase) => {
            return String(rateBase) === value;
          });
          if (base !== undefined) {
            props.onBaseChange(base);
          }
        }}
      />
    </Stack>
  );
}
```

`plugins/epidemiology/src/incidence/IncidenceModal/IncidenceForm.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { Select, Stack, Text } from "@avandar/plugin-ui";
import { AddColumnsFooter } from "../../derivedColumns/AddColumnsFooter";
import { PopulationFields } from "./PopulationFields";
import { RateBaseControl } from "./RateBaseControl";
import { useIncidenceForm } from "./useIncidenceForm";
import type { ReactNode } from "react";

type Props = {
  numericColumnNames: readonly string[];
  initialCasesColumn: string;

  /** Undefined when the result has one numeric column. */
  initialPopulationColumn: string | undefined;
};

/**
 * The cases, population, and rate base fields, and the button that adds the
 * incidence columns. `IncidenceModal` renders it once the result has a
 * numeric column.
 */
export function IncidenceForm(props: Readonly<Props>): ReactNode {
  const t = useT();
  const form = useIncidenceForm(props);
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {t("incidence.description")}
      </Text>
      <Select
        label={t("incidence.casesColumn")}
        data={props.numericColumnNames}
        value={form.casesColumn}
        allowDeselect={false}
        onChange={(columnName) => {
          if (columnName !== null) {
            form.setCasesColumn(columnName);
          }
        }}
      />
      <PopulationFields
        numericColumnNames={props.numericColumnNames}
        value={form.populationInput}
        onChange={form.setPopulationInput}
      />
      <RateBaseControl base={form.base} onBaseChange={form.setBase} />
      <AddColumnsFooter
        buttonLabel={t("incidence.add")}
        errorText={
          form.errorMessage === undefined
            ? undefined
            : t("incidence.failed", { message: form.errorMessage })
        }
        isAdding={form.isAdding}
        isDisabled={form.isAddDisabled}
        onAdd={form.onAdd}
      />
    </Stack>
  );
}
```

`plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.tsx`:

```tsx
import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert } from "@avandar/plugin-ui";
import {
  getColumnNamesFromColumns,
  NUMERIC_DATA_TYPES,
} from "../../derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns";
import { IncidenceForm } from "./IncidenceForm";
import type { ReactNode } from "react";

/**
 * The content of the "Incidence per 100k" command's modal. The user picks a
 * numeric cases column, a population (a numeric column or a fixed number),
 * and a rate base, and the command adds the rate and its 95% confidence
 * interval to the Data Explorer query as three columns. Without a numeric
 * column, or outside the Data Explorer, it explains why instead.
 */
export function IncidenceModal(): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const numericColumnNames = getColumnNamesFromColumns({
    columns: avandar.context.columns,
    dataTypes: NUMERIC_DATA_TYPES,
  });
  const [firstColumn, secondColumn] = numericColumnNames;
  if (avandar.dataExplorer === undefined) {
    return <Alert color="yellow">{t("incidence.unavailable")}</Alert>;
  }
  if (firstColumn === undefined) {
    return <Alert color="yellow">{t("incidence.noNumericColumns")}</Alert>;
  }
  return (
    <IncidenceForm
      numericColumnNames={numericColumnNames}
      initialCasesColumn={firstColumn}
      initialPopulationColumn={secondColumn}
    />
  );
}
```

- [ ] **Step 9: Run the modal test and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/incidence/IncidenceModal`
Expected: PASS, `Tests  9 passed (9)`.

- [ ] **Step 10: Format, type-check, lint, and run every plugin test**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore plugins/epidemiology/src && pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: oxfmt prints `Finished in ...`; tsc and eslint exit 0 with no output.

Run: `pnpm vitest run plugins/epidemiology`
Expected: PASS, `Test Files  17 passed (17)`, `Tests  178 passed (178)`.

- [ ] **Step 11: Commit**

```bash
git add plugins/epidemiology/locales/en.json \
  plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.ts \
  plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.test.ts \
  plugins/epidemiology/src/derivedColumns/useAddColumns.ts \
  plugins/epidemiology/src/derivedColumns/AddColumnsFooter.tsx \
  plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.tsx \
  plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.test.tsx \
  plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.types.ts \
  plugins/epidemiology/src/incidence/IncidenceModal/IncidenceForm.tsx \
  plugins/epidemiology/src/incidence/IncidenceModal/useIncidenceForm.ts \
  plugins/epidemiology/src/incidence/IncidenceModal/PopulationFields.tsx \
  plugins/epidemiology/src/incidence/IncidenceModal/RateBaseControl.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): add the incidence modal to the epidemiology plugin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Epidemiology: `RollingAverageModal`

**Files:**
- Create: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.tsx`
- Create: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.types.ts`
- Create: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageForm.tsx`
- Create: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/useRollingAverageForm.ts`
- Create: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/ColumnPickers.tsx`
- Create: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/WindowFields.tsx`
- Test: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.test.tsx`
- Modify: `plugins/epidemiology/locales/en.json` (adds the modal's strings)

**Context:** Same shape as Task 13, reusing `getColumnNamesFromColumns`,
`useAddColumns`, and `AddColumnsFooter`. The form asks for the value column
(numeric, default the first), the date column (`date` or `timestamp`, default
the first), the window as a `NumberInput` (min 1, whole numbers, default 7)
plus a days/weeks `SegmentedControl`, and an optional, clearable group-by
`Select`. **Group-by offers every result column except the chosen value and
date columns,** not only text columns: the spec puts no type on it (unlike the
epicurve's text-only "Stack by"), and group keys such as a district number or
a FIPS code often arrive as numbers. A group-by column that later becomes the
value or date column is dropped rather than sent. The modal shows the spec's
note that the command expects one row per date, or per date and group. The
yellow alert shows when `avandar.dataExplorer` is undefined or the result
lacks a numeric or a date column. "Add column" stays disabled until the window
is a whole number of at least 1.

- [ ] **Step 1: Write the failing test**

`plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.test.tsx`:

```tsx
import {
  AvandarProvider,
  makePluginTranslator,
  PluginError,
} from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import englishMessages from "../../../locales/en.json";
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions";
import { RollingAverageModal } from "./RollingAverageModal";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

type Column = AvandarApi["context"]["columns"][number];
type AddColumns = NonNullable<AvandarApi["dataExplorer"]>["addColumns"];

const DAILY_COLUMNS: readonly Column[] = [
  { name: "borough", dataType: "varchar" },
  { name: "report_date", dataType: "date" },
  { name: "cases", dataType: "bigint" },
  { name: "district_id", dataType: "bigint" },
];

function _renderModal(
  options: Readonly<{
    columns?: readonly Column[];
    addColumns?: AddColumns;
    hasDataExplorer?: boolean;
  }>,
): { addColumns: ReturnType<typeof vi.fn>; closeModal: () => void } {
  const addColumns = vi.fn(
    options.addColumns ??
      (() => {
        return Promise.resolve({ columnNames: [] });
      }),
  );
  const closeModal = vi.fn();
  const api: AvandarApi = {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: options.columns ?? DAILY_COLUMNS,
      rowCount: 30,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: { fetchRows: vi.fn() },
    ui: {
      openModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
      closeModal,
    },
    dataExplorer:
      options.hasDataExplorer === false ? undefined : { addColumns },
    i18n: {
      t: makePluginTranslator({
        locale: "en-US",
        messages: { en: englishMessages },
      }),
    },
  };
  render(
    <MantineProvider>
      <AvandarProvider api={api}>
        <RollingAverageModal />
      </AvandarProvider>
    </MantineProvider>,
  );
  return { addColumns, closeModal };
}

function _openOptions(selectLabel: string): HTMLElement {
  fireEvent.click(screen.getByRole("combobox", { name: selectLabel }));
  return screen.getByRole("listbox", { name: selectLabel, hidden: true });
}

function _pickOption(selectLabel: string, optionName: string): void {
  fireEvent.click(
    within(_openOptions(selectLabel)).getByRole("option", {
      name: optionName,
      hidden: true,
    }),
  );
}

function _setWindowSize(value: string): void {
  fireEvent.change(screen.getByRole("textbox", { name: "Window" }), {
    target: { value },
  });
}

function _clickAdd(): void {
  fireEvent.click(screen.getByRole("button", { name: "Add column" }));
}

describe("RollingAverageModal", () => {
  it("defaults to the first numeric and date columns, 7 days, and no group", () => {
    _renderModal({});
    expect(screen.getByRole("combobox", { name: "Value column" })).toHaveValue(
      "cases",
    );
    expect(screen.getByRole("combobox", { name: "Date column" })).toHaveValue(
      "report_date",
    );
    expect(screen.getByRole("textbox", { name: "Window" })).toHaveValue("7");
    expect(screen.getByRole("radio", { name: "Days" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Group by" })).toHaveValue("");
  });

  it("adds a 7-day average of the default columns, then closes", async () => {
    const { addColumns, closeModal } = _renderModal({});
    _clickAdd();
    await waitFor(() => {
      expect(closeModal).toHaveBeenCalledTimes(1);
    });
    expect(addColumns).toHaveBeenCalledWith([
      makeRollingAverageColumnFromOptions({
        valueColumn: "cases",
        dateColumn: "report_date",
        window: { size: 7, unit: "day" },
        groupByColumn: undefined,
      }),
    ]);
  });

  it("adds a 2-week average grouped by the chosen column", async () => {
    const { addColumns } = _renderModal({});
    _setWindowSize("2");
    fireEvent.click(screen.getByRole("radio", { name: "Weeks" }));
    _pickOption("Group by", "borough");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledWith([
        makeRollingAverageColumnFromOptions({
          valueColumn: "cases",
          dateColumn: "report_date",
          window: { size: 2, unit: "week" },
          groupByColumn: "borough",
        }),
      ]);
    });
  });

  it("offers every column but the value and date columns to group by", () => {
    _renderModal({});
    const options = within(_openOptions("Group by")).getAllByRole("option", {
      hidden: true,
    });
    expect(
      options.map((option) => {
        return option.textContent;
      }),
    ).toEqual(["borough", "district_id"]);
  });

  it("drops a group-by column once it becomes the value column", async () => {
    const { addColumns } = _renderModal({});
    _pickOption("Group by", "district_id");
    _pickOption("Value column", "district_id");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledTimes(1);
    });
    expect(addColumns.mock.calls[0]?.[0]?.[0]?.inputs).toEqual({
      value: "district_id",
      date: "report_date",
    });
  });

  it("disables Add column until the window is a whole number of at least 1", () => {
    _renderModal({});
    const addButton = screen.getByRole("button", { name: "Add column" });
    _setWindowSize("0");
    expect(addButton).toBeDisabled();
    _setWindowSize("");
    expect(addButton).toBeDisabled();
    _setWindowSize("3");
    expect(addButton).toBeEnabled();
  });

  it("says the command expects one row per date, or per date and group", () => {
    _renderModal({});
    expect(
      screen.getByText(
        /expects one row per date, or one row per date and group/,
      ),
    ).toBeInTheDocument();
  });

  it("shows why the column was not added and stays open", async () => {
    const { closeModal } = _renderModal({
      addColumns: () => {
        return Promise.reject(
          new PluginError(
            "InvalidHandle",
            "This query result is no longer available. Run the command again.",
          ),
        );
      },
    });
    _clickAdd();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not add the column: This query result is no longer available. Run the command again.",
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
  });

  it("explains that a numeric and a date column are needed when one is missing", () => {
    _renderModal({
      columns: [
        { name: "borough", dataType: "varchar" },
        { name: "cases", dataType: "bigint" },
      ],
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This command needs a numeric column and a date column.",
    );
    expect(
      screen.queryByRole("button", { name: "Add column" }),
    ).not.toBeInTheDocument();
  });

  it("explains that columns can be added only in the Data Explorer without its API", () => {
    _renderModal({ hasDataExplorer: false });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Columns can be added only to a query result in the Data Explorer.",
    );
    expect(
      screen.queryByRole("button", { name: "Add column" }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/rollingAverage/RollingAverageModal`
Expected: FAIL, `Error: Failed to resolve import "./RollingAverageModal" from "plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.test.tsx". Does the file exist?`

- [ ] **Step 3: Add the modal strings**

In `plugins/epidemiology/locales/en.json`, replace the last two lines

```json
  "incidence.failed": "Could not add the columns: {message}"
}
```

with

```json
  "incidence.failed": "Could not add the columns: {message}",
  "rollingAverage.description": "Adds a column with the average of a value over the days up to each row's date.",
  "rollingAverage.valueColumn": "Value column",
  "rollingAverage.dateColumn": "Date column",
  "rollingAverage.window": "Window",
  "rollingAverage.windowUnit": "Window unit",
  "rollingAverage.windowUnit.day": "Days",
  "rollingAverage.windowUnit.week": "Weeks",
  "rollingAverage.groupByColumn": "Group by",
  "rollingAverage.groupByColumn.none": "None",
  "rollingAverage.oneRowPerDate": "This command expects one row per date, or one row per date and group. Every row in the window counts, including rows that share a date.",
  "rollingAverage.add": "Add column",
  "rollingAverage.missingColumns": "This command needs a numeric column and a date column.",
  "rollingAverage.unavailable": "Columns can be added only to a query result in the Data Explorer. Run a query there, then try again.",
  "rollingAverage.failed": "Could not add the column: {message}"
}
```

- [ ] **Step 4: Implement the modal**

`plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.types.ts`:

```ts
import type { RollingWindow } from "../makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions";

/**
 * The rolling average form's column pickers as the user left them.
 * `groupByColumn` is undefined when no group-by column is chosen.
 */
export type RollingAverageColumnsInput = {
  valueColumn: string;
  dateColumn: string;
  groupByColumn: string | undefined;
};

/**
 * The rolling average form's window fields as the user left them: the size
 * as typed (a number, or "" while empty) and the unit.
 */
export type RollingWindowInput = {
  size: number | string;
  unit: RollingWindow["unit"];
};
```

`plugins/epidemiology/src/rollingAverage/RollingAverageModal/useRollingAverageForm.ts`:

```ts
import { useState } from "react";
import { useAddColumns } from "../../derivedColumns/useAddColumns";
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions";
import type {
  RollingAverageColumnsInput,
  RollingWindowInput,
} from "./RollingAverageModal.types";

/** The rolling average form's values, their setters, and the add action. */
type RollingAverageFormState = Readonly<{
  /**
   * The chosen columns. A group-by column that became the value or date
   * column is dropped.
   */
  columnsInput: RollingAverageColumnsInput;
  setColumnsInput: (columnsInput: RollingAverageColumnsInput) => void;

  /** Every result column except the chosen value and date columns. */
  groupByColumnNames: string[];
  windowInput: RollingWindowInput;
  setWindowInput: (windowInput: RollingWindowInput) => void;

  /** True until the window size is a whole number of at least 1. */
  isAddDisabled: boolean;
  isAdding: boolean;
  errorMessage: string | undefined;
  onAdd: () => void;
}>;

const INITIAL_WINDOW_INPUT: RollingWindowInput = { size: 7, unit: "day" };

/**
 * The columns a group-by column can be, which are all but the chosen value
 * and date columns, and the chosen columns without a group-by column that is
 * no longer one of them.
 */
function _buildGroupByChoices(
  options: Readonly<{
    columnNames: readonly string[];
    chosenColumns: RollingAverageColumnsInput;
  }>,
): Readonly<{
  groupByColumnNames: string[];
  columnsInput: RollingAverageColumnsInput;
}> {
  const { columnNames, chosenColumns } = options;
  const groupByColumnNames = columnNames.filter((columnName) => {
    return (
      columnName !== chosenColumns.valueColumn &&
      columnName !== chosenColumns.dateColumn
    );
  });
  const groupByColumn = groupByColumnNames.find((columnName) => {
    return columnName === chosenColumns.groupByColumn;
  });
  return {
    groupByColumnNames,
    columnsInput: { ...chosenColumns, groupByColumn },
  };
}

/**
 * Holds the rolling average form's values and adds its column. The window
 * starts at 7 days with no group-by column. `RollingAverageForm` is its only
 * caller.
 */
export function useRollingAverageForm(
  options: Readonly<{
    columnNames: readonly string[];
    initialValueColumn: string;
    initialDateColumn: string;
  }>,
): RollingAverageFormState {
  const { isAdding, errorMessage, addColumns } = useAddColumns();
  const [chosenColumns, setColumnsInput] = useState<RollingAverageColumnsInput>(
    {
      valueColumn: options.initialValueColumn,
      dateColumn: options.initialDateColumn,
      groupByColumn: undefined,
    },
  );
  const [windowInput, setWindowInput] = useState(INITIAL_WINDOW_INPUT);
  const { groupByColumnNames, columnsInput } = _buildGroupByChoices({
    columnNames: options.columnNames,
    chosenColumns,
  });
  const size = typeof windowInput.size === "number" ? windowInput.size : 0;
  const onAdd = (): void => {
    void addColumns(() => {
      return [
        makeRollingAverageColumnFromOptions({
          ...columnsInput,
          window: { size, unit: windowInput.unit },
        }),
      ];
    });
  };
  return {
    columnsInput,
    setColumnsInput,
    groupByColumnNames,
    windowInput,
    setWindowInput,
    isAddDisabled: !Number.isInteger(size) || size < 1,
    isAdding,
    errorMessage,
    onAdd,
  };
}
```

`plugins/epidemiology/src/rollingAverage/RollingAverageModal/ColumnPickers.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { Select, Stack } from "@avandar/plugin-ui";
import type { RollingAverageColumnsInput } from "./RollingAverageModal.types";
import type { ReactNode } from "react";

type Props = {
  numericColumnNames: readonly string[];
  dateColumnNames: readonly string[];

  /** Every result column except the chosen value and date columns. */
  groupByColumnNames: readonly string[];
  value: RollingAverageColumnsInput;
  onChange: (value: RollingAverageColumnsInput) => void;
};

/**
 * The value, date, and optional group-by column pickers of the rolling
 * average form. `RollingAverageForm` owns the chosen columns.
 */
export function ColumnPickers(props: Readonly<Props>): ReactNode {
  const { value, onChange } = props;
  const t = useT();
  return (
    <Stack gap="xs">
      <Select
        label={t("rollingAverage.valueColumn")}
        data={props.numericColumnNames}
        value={value.valueColumn}
        allowDeselect={false}
        onChange={(valueColumn) => {
          if (valueColumn !== null) {
            onChange({ ...value, valueColumn });
          }
        }}
      />
      <Select
        label={t("rollingAverage.dateColumn")}
        data={props.dateColumnNames}
        value={value.dateColumn}
        allowDeselect={false}
        onChange={(dateColumn) => {
          if (dateColumn !== null) {
            onChange({ ...value, dateColumn });
          }
        }}
      />
      <Select
        label={t("rollingAverage.groupByColumn")}
        placeholder={t("rollingAverage.groupByColumn.none")}
        data={props.groupByColumnNames}
        value={value.groupByColumn ?? null}
        clearable
        onChange={(groupByColumn) => {
          onChange({ ...value, groupByColumn: groupByColumn ?? undefined });
        }}
      />
    </Stack>
  );
}
```

`plugins/epidemiology/src/rollingAverage/RollingAverageModal/WindowFields.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { Group, NumberInput, SegmentedControl } from "@avandar/plugin-ui";
import type { RollingWindowInput } from "./RollingAverageModal.types";
import type { ReactNode } from "react";

type Props = {
  value: RollingWindowInput;
  onChange: (value: RollingWindowInput) => void;
};

/**
 * The rolling window's size and its unit, days or weeks.
 * `RollingAverageForm` owns the values.
 */
export function WindowFields({ value, onChange }: Readonly<Props>): ReactNode {
  const t = useT();
  return (
    <Group align="flex-end" grow>
      <NumberInput
        label={t("rollingAverage.window")}
        min={1}
        allowDecimal={false}
        allowNegative={false}
        value={value.size}
        onChange={(size) => {
          onChange({ ...value, size });
        }}
      />
      <SegmentedControl
        aria-label={t("rollingAverage.windowUnit")}
        value={value.unit}
        data={[
          { value: "day", label: t("rollingAverage.windowUnit.day") },
          { value: "week", label: t("rollingAverage.windowUnit.week") },
        ]}
        onChange={(unit) => {
          onChange({ ...value, unit: unit === "week" ? "week" : "day" });
        }}
      />
    </Group>
  );
}
```

`plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageForm.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import { AddColumnsFooter } from "../../derivedColumns/AddColumnsFooter";
import { ColumnPickers } from "./ColumnPickers";
import { useRollingAverageForm } from "./useRollingAverageForm";
import { WindowFields } from "./WindowFields";
import type { ReactNode } from "react";

type Props = {
  /** Every result column, in result order, for the group-by picker. */
  columnNames: readonly string[];
  numericColumnNames: readonly string[];
  dateColumnNames: readonly string[];
  initialValueColumn: string;
  initialDateColumn: string;
};

/**
 * The column pickers, the window fields, and the button that adds the
 * rolling average column. `RollingAverageModal` renders it once the result
 * has a numeric and a date column.
 */
export function RollingAverageForm(props: Readonly<Props>): ReactNode {
  const t = useT();
  const form = useRollingAverageForm(props);
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {t("rollingAverage.description")}
      </Text>
      <ColumnPickers
        numericColumnNames={props.numericColumnNames}
        dateColumnNames={props.dateColumnNames}
        groupByColumnNames={form.groupByColumnNames}
        value={form.columnsInput}
        onChange={form.setColumnsInput}
      />
      <WindowFields value={form.windowInput} onChange={form.setWindowInput} />
      <Text size="sm" c="dimmed">
        {t("rollingAverage.oneRowPerDate")}
      </Text>
      <AddColumnsFooter
        buttonLabel={t("rollingAverage.add")}
        errorText={
          form.errorMessage === undefined
            ? undefined
            : t("rollingAverage.failed", { message: form.errorMessage })
        }
        isAdding={form.isAdding}
        isDisabled={form.isAddDisabled}
        onAdd={form.onAdd}
      />
    </Stack>
  );
}
```

`plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.tsx`:

```tsx
import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert } from "@avandar/plugin-ui";
import {
  getColumnNamesFromColumns,
  NUMERIC_DATA_TYPES,
  TEMPORAL_DATA_TYPES,
} from "../../derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns";
import { RollingAverageForm } from "./RollingAverageForm";
import type { ReactNode } from "react";

/**
 * The content of the "Rolling average" command's modal. The user picks a
 * numeric value column, a date column, a window in days or weeks, and an
 * optional group-by column, and the command adds the rolling average to the
 * Data Explorer query as one column. Without a numeric and a date column, or
 * outside the Data Explorer, it explains why instead.
 */
export function RollingAverageModal(): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const { columns } = avandar.context;
  const numericColumnNames = getColumnNamesFromColumns({
    columns,
    dataTypes: NUMERIC_DATA_TYPES,
  });
  const dateColumnNames = getColumnNamesFromColumns({
    columns,
    dataTypes: TEMPORAL_DATA_TYPES,
  });
  const [firstNumericColumn] = numericColumnNames;
  const [firstDateColumn] = dateColumnNames;
  if (avandar.dataExplorer === undefined) {
    return <Alert color="yellow">{t("rollingAverage.unavailable")}</Alert>;
  }
  if (firstNumericColumn === undefined || firstDateColumn === undefined) {
    return <Alert color="yellow">{t("rollingAverage.missingColumns")}</Alert>;
  }
  return (
    <RollingAverageForm
      columnNames={columns.map((column) => {
        return column.name;
      })}
      numericColumnNames={numericColumnNames}
      dateColumnNames={dateColumnNames}
      initialValueColumn={firstNumericColumn}
      initialDateColumn={firstDateColumn}
    />
  );
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/rollingAverage/RollingAverageModal`
Expected: PASS, `Tests  10 passed (10)`.

- [ ] **Step 6: Format, type-check, lint, and run every plugin test**

Run: `pnpm exec oxfmt --ignore-path .oxfmtignore plugins/epidemiology/src && pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: oxfmt prints `Finished in ...`; tsc and eslint exit 0 with no output.

Run: `pnpm vitest run plugins/epidemiology`
Expected: PASS, `Test Files  18 passed (18)`, `Tests  188 passed (188)`.

- [ ] **Step 7: Commit**

```bash
git add plugins/epidemiology/locales/en.json \
  plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.tsx \
  plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.test.tsx \
  plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.types.ts \
  plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageForm.tsx \
  plugins/epidemiology/src/rollingAverage/RollingAverageModal/useRollingAverageForm.ts \
  plugins/epidemiology/src/rollingAverage/RollingAverageModal/ColumnPickers.tsx \
  plugins/epidemiology/src/rollingAverage/RollingAverageModal/WindowFields.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): add the rolling average modal to the epidemiology plugin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Epidemiology: manifest commands, permission, locale strings, and `definePlugin` wiring

**Files:**
- Modify: `plugins/epidemiology/ava.yaml` (permission, two commands, two menu entries)
- Modify: `plugins/epidemiology/locales/en.json` (two command titles)
- Modify: `plugins/epidemiology/src/index.tsx` (two command handlers)
- Test: `plugins/epidemiology/src/index.test.tsx` (replaced: the three commands as one `it.each`)

**Context:** The manifest declares `query:addColumns` (contract 3; the
manifest schema accepts it once the host task adds it to
`PLUGIN_PERMISSIONS`), and the two commands with the spec's `when`
conditions and contract 14's icons: `percentage` (`IconPercentage`) and
`chart-line` (`IconChartLine`), both in `@tabler/icons-react`. The entry opens
each modal under its translated title. The entry test's fake gains
`ui.closeModal`, `dataExplorer`, and a `date` column so all three modals render
their forms. Adding the permission hides the plugin's contributions in
workspaces that installed it before, until a settings admin approves it
(spec "Permission approval"). Three commands can now match one result, and
more than two collapse into the "Plugins" menu (Facts discovered 6).

- [ ] **Step 1: Write the failing entry test**

Replace `plugins/epidemiology/src/index.test.tsx` with:

```tsx
import { AvandarProvider } from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import plugin from "./index";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

function _makeApi(openModal: AvandarApi["ui"]["openModal"]): AvandarApi {
  return {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: [
        { name: "age", dataType: "bigint" },
        { name: "weight", dataType: "double" },
        { name: "visit_date", dataType: "date" },
      ],
      rowCount: 5,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({ rows: [], isTruncated: false });
      }),
    },
    ui: {
      openModal,
      openDrawer: vi.fn(),
      notify: vi.fn(),
      closeModal: vi.fn(),
    },
    dataExplorer: {
      addColumns: vi.fn(() => {
        return Promise.resolve({ columnNames: [] });
      }),
    },
    i18n: {
      t: (key) => {
        return `translated:${key}`;
      },
    },
  };
}

describe("the epidemiology plugin", () => {
  it.each([
    ["regression.linear", "regression.linear.title", "modal.fit"],
    ["incidence.rate", "incidence.title", "incidence.add"],
    ["rolling.average", "rollingAverage.title", "rollingAverage.add"],
  ])(
    "opens the %s modal under its translated title",
    (commandId, titleKey, buttonKey) => {
      const openModal = vi.fn();
      const api = _makeApi(openModal);
      void plugin.commands[commandId]?.(api);
      expect(openModal).toHaveBeenCalledTimes(1);
      const [options] = openModal.mock.calls[0] as Parameters<
        AvandarApi["ui"]["openModal"]
      >;
      expect(options.title).toBe(`translated:${titleKey}`);
      render(
        <MantineProvider>
          <AvandarProvider api={api}>{options.content}</AvandarProvider>
        </MantineProvider>,
      );
      expect(
        screen.getByRole("button", { name: `translated:${buttonKey}` }),
      ).toBeInTheDocument();
    },
  );

  it("draws the epicurve chart type with the epicurve transform", () => {
    expect(plugin.vizTypes.epicurve?.transform).toBe(makeEpicurveFromRows);
  });

  it("draws the rate-plot chart type with the RatePlot component", () => {
    expect(plugin.vizTypes["rate-plot"]?.Component).toBe(RatePlot);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/index.test.tsx`
Expected: FAIL, `Tests  2 failed | 3 passed (5)`. The `incidence.rate` and
`rolling.average` cases report `AssertionError: expected "spy" to be called 1 times, but got 0 times`.

- [ ] **Step 3: Wire the commands**

Replace `plugins/epidemiology/src/index.tsx` with:

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { IncidenceModal } from "./incidence/IncidenceModal/IncidenceModal";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";
import { RegressionModal } from "./RegressionModal/RegressionModal";
import { RollingAverageModal } from "./rollingAverage/RollingAverageModal/RollingAverageModal";

// A plugin entry exports its definition, not a component, so there is nothing
// for fast refresh to track.
// eslint-disable-next-line react-refresh/only-export-components
export default definePlugin({
  commands: {
    "regression.linear": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("regression.linear.title"),
        content: <RegressionModal />,
      });
    },
    "incidence.rate": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("incidence.title"),
        content: <IncidenceModal />,
      });
    },
    "rolling.average": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("rollingAverage.title"),
        content: <RollingAverageModal />,
      });
    },
  },
  vizTypes: {
    epicurve: { transform: makeEpicurveFromRows },
    "rate-plot": { Component: RatePlot },
  },
});
```

Run: `pnpm vitest run plugins/epidemiology/src/index.test.tsx`
Expected: PASS, `Tests  5 passed (5)`.

- [ ] **Step 4: Declare the permission and the commands**

In `plugins/epidemiology/ava.yaml`, replace

```yaml
permissions:
  - data:context
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
  menus:
    dataExplorer.toolbar:
      - command: regression.linear
        when:
          numericColumnCount: { gte: 2 }
```

with

```yaml
permissions:
  - data:context
  - query:addColumns
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
    - id: incidence.rate
      title: "%incidence.title%"
      icon: percentage
    - id: rolling.average
      title: "%rollingAverage.title%"
      icon: chart-line
  menus:
    dataExplorer.toolbar:
      - command: regression.linear
        when:
          numericColumnCount: { gte: 2 }
      - command: incidence.rate
        when:
          numericColumnCount: { gte: 1 }
      - command: rolling.average
        when:
          all:
            - dateColumnCount: { gte: 1 }
            - numericColumnCount: { gte: 1 }
```

(`vizTypes` below it is unchanged.)

- [ ] **Step 5: Add the command titles**

In `plugins/epidemiology/locales/en.json`, insert
`  "incidence.title": "Incidence per 100k",` on the line before
`  "incidence.description": ...`, and
`  "rollingAverage.title": "Rolling average",` on the line before
`  "rollingAverage.description": ...`. The new keys, in file order, are:

```json
  "incidence.title": "Incidence per 100k",
  "rollingAverage.title": "Rolling average",
```

- [ ] **Step 6: Run every epidemiology and Vite plugin test**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins plugins/epidemiology`
Expected: PASS, `Test Files  21 passed (21)`, `Tests  220 passed (220)`
(18 plugin files with 190 tests, and 3 Vite plugin files with 30).

Run: `pnpm test:executed plugins/epidemiology`
Expected: PASS, `Test Files  2 passed (2)`, `Tests  27 passed (27)`.

- [ ] **Step 7: Validate the plugin with the CLI**

Run: `pnpm --filter @avandar/ava-cli build && node apps/ava-cli/dist/main.cjs plugin validate epidemiology`
Expected: the build prints `Build success`, then:

```text
🔎 Validating plugins/epidemiology...
  Checking ava.yaml, locales, icons, and dependencies...
  Running tsc...
  Running eslint...
✅ plugins/epidemiology is valid.
```

A failure at the first check that names `permissions` means the host task
adding `query:addColumns` to `PLUGIN_PERMISSIONS` has not landed.

- [ ] **Step 8: Confirm the plugin code stays out of the app's startup chunks**

Run: `pnpm check:plugin-bundle`
Expected: exit 0 after `✓ built in ...` (about 45 s). It fails, naming the
module, if any new plugin file lands in a chunk the app loads without the
plugin.

- [ ] **Step 9: Commit**

```bash
git add plugins/epidemiology/ava.yaml \
  plugins/epidemiology/locales/en.json \
  plugins/epidemiology/src/index.tsx \
  plugins/epidemiology/src/index.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): add incidence and rolling average commands to epidemiology

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: `docs/plugin-authoring.md`: `addColumns`

**Files:**
- Modify: `docs/plugin-authoring.md` (the epidemiology tree and the test note in section 2; the `permissions` row in section 3; two rows in the API table in section 5; a new "## 6. Add columns to the Data Explorer query"; renumber "## 6."-"## 10." to "## 7."-"## 11."; the plugin-ui component list in the allowlist section; the permissions rule at the end)

**Context:** The guide's style is numbered imperative `##` sections, no
`###`, short paragraphs, `| Key | Rule |` tables, and fenced examples. The new
section goes right after "5. Write the command", because adding columns is
something a command does, and before the chart type sections. Section 7's
"(see the next section)" still points at "Draw a chart type", and nothing in
the repo links to a section number (only `AGENTS.md` and
`docs/avandar-packages.md` link to the file), so renumbering is safe. The
facts come from contracts 1, 2, 3, 7, 11, and 12, the spec's "Part B" and
"Permission approval" sections, the host's "Review new permissions" button
(`usePluginActionCopy.ts`), and Tasks 10 to 15.

- [ ] **Step 1: Update the epidemiology tree and the test note in section 2**

Replace

```text
  index.tsx                                  the plugin entry
  index.test.tsx
  epicurve/                                  the epicurve chart type
```

with

```text
  index.tsx                                  the plugin entry
  index.test.tsx
  derivedColumns/                            shared by the column commands
    AddColumnsFooter.tsx
    useAddColumns.ts
    getColumnNamesFromColumns/
      getColumnNamesFromColumns.ts
      getColumnNamesFromColumns.test.ts
    makeColumnNameSlugFromName/
      makeColumnNameSlugFromName.ts
      makeColumnNameSlugFromName.test.ts
  epicurve/                                  the epicurve chart type
```

Replace

```text
  getNumberFromCellValue/
    getNumberFromCellValue.ts
    getNumberFromCellValue.test.ts
```

with

```text
  getNumberFromCellValue/
    getNumberFromCellValue.ts
    getNumberFromCellValue.test.ts
  incidence/                                 the "Incidence per 100k" command
    makeIncidenceColumnsFromOptions/
      makeIncidenceColumnsFromOptions.ts
      __tests__/
        makeIncidenceColumnsFromOptions.test.ts
        makeIncidenceColumnsFromOptions.executed.test.ts
    IncidenceModal/
      IncidenceModal.tsx
      IncidenceModal.test.tsx
      IncidenceModal.types.ts
      IncidenceForm.tsx
      PopulationFields.tsx
      RateBaseControl.tsx
      useIncidenceForm.ts
```

Then replace the end of the tree and the line after it,

````markdown
    makeStatisticTextFromNumber/
      makeStatisticTextFromNumber.ts
      makeStatisticTextFromNumber.test.ts
```

Plugin tests run with the repo's Vitest setup (`pnpm vitest run plugins/<name>`).
````

with

````markdown
    makeStatisticTextFromNumber/
      makeStatisticTextFromNumber.ts
      makeStatisticTextFromNumber.test.ts
  rollingAverage/                            the "Rolling average" command
    makeRollingAverageColumnFromOptions/
      makeRollingAverageColumnFromOptions.ts
      __tests__/
        makeRollingAverageColumnFromOptions.test.ts
        makeRollingAverageColumnFromOptions.executed.test.ts
    RollingAverageModal/
      RollingAverageModal.tsx
      RollingAverageModal.test.tsx
      RollingAverageModal.types.ts
      RollingAverageForm.tsx
      ColumnPickers.tsx
      WindowFields.tsx
      useRollingAverageForm.ts
```

Plugin tests run with the repo's Vitest setup (`pnpm vitest run plugins/<name>`).
Tests named `*.executed.test.ts` run SQL in real DuckDB instead, with
`pnpm test:executed plugins/<name>`. They cannot import the repo's
executed-test helpers under `tests/`, because no plugin file may import from
outside its folder, so they open their own database with
`DuckDBInstance.create(":memory:")` from `@duckdb/node-api`.
````

- [ ] **Step 2: Update the `permissions` row in section 3**

Replace

```markdown
| `permissions` | A list. `data:context` is the only accepted value |
```

with

```markdown
| `permissions` | A list of `data:context` and `query:addColumns` (see the API table in section 5) |
```

- [ ] **Step 3: Add two rows to the API table in section 5**

After the row that starts ``| `avandar.ui.notify({ title?, message, color? })` ``, insert:

```markdown
| `avandar.ui.closeModal()` | Closes the modal this invocation opened last. Does nothing when it opened none, or the user already closed it | none |
| `avandar.dataExplorer.addColumns(columns)` | Adds computed columns to the Data Explorer query the command was invoked on, and resolves `{ columnNames }`. `avandar.dataExplorer` is undefined outside a Data Explorer toolbar command (see section 6) | `query:addColumns` |
```

- [ ] **Step 4: Renumber the sections after section 5**

Rename, from the bottom up: `## 10. Validate` to `## 11. Validate`,
`## 9. Stay within the import allowlist` to `## 10. Stay within the import allowlist`,
`## 8. Translate plugin strings` to `## 9. Translate plugin strings`,
`## 7. Draw a chart type` to `## 8. Draw a chart type`, and
`## 6. Declare a chart type` to `## 7. Declare a chart type`.

- [ ] **Step 5: Add the new section 6**

Insert the following immediately before `## 7. Declare a chart type` (after
section 5's closing `RowCount` example block):

`````markdown
## 6. Add columns to the Data Explorer query

A Data Explorer toolbar command can add computed columns to the query it was
invoked on, such as an incidence rate or a rolling average. The columns are
part of the query, so they can be charted, filtered, and saved to a dashboard
like any other column. Declare `query:addColumns` in the manifest's
`permissions` and call `avandar.dataExplorer.addColumns`:

```ts
const result = await avandar.dataExplorer?.addColumns([
  {
    name: "incidence_per_100k",
    expression: "{cases} * 100000.0 / NULLIF({population}, 0)",
    inputs: { cases: "case_count", population: "pop_2024" },
  },
]);
```

`avandar.dataExplorer` is defined only for a command run from the
`dataExplorer.toolbar` slot while a result is on screen. Check it before you
use it, and tell the user why nothing can be added when it is undefined.

Each column is a `DerivedColumn` from `@avandar/plugin-sdk`:

| Field | Rule |
| --- | --- |
| `name` | Lowercase snake case: a letter, then lowercase letters, digits, and underscores (`^[a-z][a-z0-9_]*$`) |
| `expression` | One SQL scalar or window expression in DuckDB's dialect, such as `{cases} * 2` or `avg({value}) OVER (ORDER BY {date})`. No `SELECT`, subquery, alias, `;`, `--`, or `/*` |
| `inputs` | Maps each `{placeholder}` in `expression` to the name of a column in the result the command was invoked on, as `avandar.context.columns` lists it |

Never paste a column name into `expression`. Write a placeholder, a letter or
underscore followed by letters, digits, and underscores in braces, and bind it
in `inputs`. Avandar replaces it with the column's quoted identifier, so a
column named `Case count` or `a"b` works without any quoting on your side.
Write number literals with a decimal point, such as `100000.0` or `9.0`, where
a division must not truncate.

When a name is already taken, by a result column or by an earlier column in
the same call, compared without case, Avandar adds `_2`, then `_3`, and so on.
`addColumns` resolves `{ columnNames }`: the names the columns were added
under, in the order you passed them. A command that calls `addColumns` again
on its own output should read these names rather than assume its own.

Avandar then:

1. Wraps the SQL behind the result, whether it was typed or built from the
   query builder, so every row keeps its order:

   ```sql
   WITH ava_source AS (
     SELECT *, row_number() OVER () AS __ava_row FROM (
   <the query's SQL>
     )
   )
   SELECT * EXCLUDE (__ava_row),
     (<expression>) AS "<name>"
   FROM ava_source
   ORDER BY __ava_row
   ```

2. Puts the wrapped SQL in the SQL editor and runs it. The query builder no
   longer matches the SQL, and the Data Explorer says so as it does for any
   edited SQL.
3. Shows a "Columns added" notification that lists the new columns, with an
   **Undo** button. Undo restores the SQL and the chart settings from before
   the command. If the user changed the query in the meantime, Undo changes
   nothing and says so.

`addColumns` resolves once the wrapped SQL is in the editor and running. If
the SQL then fails, for example because DuckDB rejects the expression for a
column's type, the Data Explorer shows the query error as it does for any
query, and Undo still restores the query from before. "Save to dashboard"
saves the wrapped SQL like any other SQL.

`addColumns` rejects with a `PluginError` and changes nothing when:

| `code` | When |
| --- | --- |
| `InvalidExpression` | The list is empty, a `name` breaks the rule above, a placeholder has no `inputs` entry, an input names a column the result does not have, or an `expression` is not exactly one scalar or window expression |
| `InvalidHandle` | The Data Explorer no longer shows the result the command was invoked on, for example because the user ran another query while the command's modal was open. The message asks the user to run the command again |

A command that opens a modal and adds columns from its form should await
`addColumns`, then call `avandar.ui.closeModal()` to close the modal. On a
rejection, keep the modal open and show the error's `message` in it, so the
user can change a field and try again. The epidemiology plugin's incidence
and rolling average commands work this way (`src/derivedColumns/useAddColumns.ts`).
`````

- [ ] **Step 6: Confirm Task 3 already listed `SegmentedControl`**

Task 3 added `SegmentedControl` to the plugin UI list in this file. Do not edit it again.

Run: `grep -c "NumberInput\`, \`SegmentedControl\`" docs/plugin-authoring.md`
Expected: `1`.

- [ ] **Step 7: Extend the permissions rule**

In "## Rules to keep in mind", replace

```markdown
  enforce them: bundled plugins run in-process. Declare `data:context`
  whenever the plugin calls `fetchRows`, so the manifest states what the
  plugin does.
```

with

```markdown
  enforce them: bundled plugins run in-process. Declare `data:context`
  whenever the plugin calls `fetchRows`, and `query:addColumns` whenever it
  calls `avandar.dataExplorer.addColumns`, so the manifest states what the
  plugin does. Adding a permission to a plugin that workspaces already
  installed hides its contributions there until a settings admin approves
  it under "Review new permissions" in Settings → Plugins.
```

- [ ] **Step 8: Check the result**

Run: `grep -n "^## " docs/plugin-authoring.md`
Expected:

```text
23:## 1. Create the plugin
48:## 2. Lay out the code
161:## 3. Write the manifest
213:## 4. Decide when a command shows
256:## 5. Write the command
320:## 6. Add columns to the Data Explorer query
407:## 7. Declare a chart type
471:## 8. Draw a chart type
638:## 9. Translate plugin strings
662:## 10. Stay within the import allowlist
689:## 11. Validate
714:## Rules to keep in mind
```

Run: `grep -c $'\xe2\x80\x94' docs/plugin-authoring.md` (counts em dashes)
Expected: `0`.

Run: `git diff --no-ext-diff --stat`
Expected: one file changed, about 140 insertions and 8 deletions (the drafted run, which also listed `SegmentedControl` here, showed 145 and 10).

- [ ] **Step 9: Commit**

```bash
git add docs/plugin-authoring.md
git commit -m "$(cat <<'EOF'
docs(plugins): document avandar.dataExplorer.addColumns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Extract and compile the translation catalogs

**Files:**
- Modify: `src/i18n/locales/*/messages.po` (8 locales: `ar`, `en`, `es`, `fr`, `pt`, `sw`, `zh-Hans`, `zh-Hant`; extracted)
- Modify: `src/i18n/locales/*/messages.ts` (compiled; never hand-edited)

**Context:** Tasks 2 and 9 add host strings through Lingui: the plugin card's `query:addColumns` line, "Columns added", "Added {columnList}", "Undo", "Nothing to undo", and "The query changed after the columns were added.". "Undo" already exists in every catalog (the PDF annotation toolbar uses it) and keeps its translations, so 5 ids are new. `lingui.config.ts` extracts from `src`, `shared`, and `packages/web`, so the epidemiology plugin's `locales/en.json` strings are not part of these catalogs. Non-English catalogs get the new ids with empty `msgstr`, which fall back to English at runtime; filling them is `pnpm translations`, outside this plan. `pnpm i18n:check` passes only after the extracted catalogs are committed.

- [ ] **Step 1: Extract**

Run: `pnpm i18n:extract`
Expected: `✔ Done`, then a "Catalog statistics" table in which every locale has the same "Total count" (`2510` in the scratch run, up from `2505`) and each non-English locale shows `5` missing. (`Undo` already existed, so 5 of the 6 strings are new.)

- [ ] **Step 2: Confirm the new host strings were picked up**

Run: `grep -c 'msgid "Columns added"' src/i18n/locales/en/messages.po && grep -c 'msgid "Nothing to undo"' src/i18n/locales/en/messages.po`
Expected: `1` and `1`.

Run: `git diff --no-ext-diff src/i18n/locales/en/messages.po | grep -E '^\+msgid'`
Expected: exactly these five lines, in any order:

```
+msgid "Columns added"
+msgid "Add calculated columns to a Data Explorer query when you run one of its "
+msgid "The query changed after the columns were added."
+msgid "Nothing to undo"
+msgid "Added {columnList}"
```

(The permission line wraps onto a `"tools"` continuation line in the `.po` file.)

Run: `git status --short src/i18n/locales`
Expected: the 8 `messages.po` files listed as modified.

- [ ] **Step 3: Compile**

Run: `pnpm i18n:compile`
Expected: `Compiling message catalogs…` then `Done in ...`.

Run: `git status --short src/i18n/locales | wc -l`
Expected: `16`, a `messages.po` and a `messages.ts` per locale.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/ar/messages.po src/i18n/locales/ar/messages.ts \
  src/i18n/locales/en/messages.po src/i18n/locales/en/messages.ts \
  src/i18n/locales/es/messages.po src/i18n/locales/es/messages.ts \
  src/i18n/locales/fr/messages.po src/i18n/locales/fr/messages.ts \
  src/i18n/locales/pt/messages.po src/i18n/locales/pt/messages.ts \
  src/i18n/locales/sw/messages.po src/i18n/locales/sw/messages.ts \
  src/i18n/locales/zh-Hans/messages.po src/i18n/locales/zh-Hans/messages.ts \
  src/i18n/locales/zh-Hant/messages.po src/i18n/locales/zh-Hant/messages.ts
git commit -m "$(cat <<'EOF'
chore(i18n): extract and compile the derived column strings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Confirm the catalog check passes**

Run: `pnpm i18n:check`
Expected: the extract table, then exit 0 with no diff output.

---

### Task 18: E2E: Incidence per 100k, then the rate plot draws its whiskers

**Files:**
- Create: `tests/e2e/plugins-epidemiology-incidence.spec.ts`

**Context:** Spec E2E item (2) and acceptance items 2 and 3, through the UI
only (`docs/rules/e2e-testing.md`): install the plugin in Settings → Plugins,
open a literal-SQL result (the five boroughs, case counts, and 2020 census
populations), run "Incidence per 100k" from the toolbar with the modal's
defaults (`cases` over `population`, per 100,000), and expect the three new
column headers and the "Columns added" notification. It then clicks that
notification's **Undo**, expects the incidence columns gone and the original
columns back, and runs the command again: this covers Undo in a few lines
while the notification is certainly on screen (it closes after 10 seconds).
Finally it switches the chart to "Rate plot" through the chart type picker,
binds rate, lower, and upper to the incidence columns (picking the chart type
fills the required label column with `borough` and the required rate column
with the first numeric column, `cases`, so the rate is re-picked), and expects
one `.recharts-errorBar` per borough. That class is Recharts' own and already
the selector `RatePlot.test.tsx` uses, so `ratePlot/` gets no test id. The
result has no date column, so only "Linear regression" and "Incidence per
100k" match the toolbar and both stay buttons (Facts discovered 6). Column
headers are located with `exact: true` because `incidence_per_100k` is a
prefix of the bound columns. The admin client only reads the workspace id and,
in `finally`, deletes the install row this spec created, as
`plugins-epidemiology-regression.spec.ts` does. Nothing is saved, so there is
nothing else to clean up. The per-test timeout stays at the config default of
45 seconds locally. **Not verified:** see "Not verified" 1 for every locator
this spec assumes.

- [ ] **Step 1: Write the spec**

`tests/e2e/plugins-epidemiology-incidence.spec.ts`:

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

/**
 * Case counts and 2020 census populations for New York City's five boroughs.
 * Every population is above zero, so every row gets both interval bounds and
 * the rate plot draws one whisker per borough.
 */
const BOROUGH_SQL =
  "SELECT * FROM (VALUES " +
  "('Bronx', 120, 1472654), " +
  "('Brooklyn', 240, 2736074), " +
  "('Manhattan', 90, 1694251), " +
  "('Queens', 150, 2405464), " +
  "('Staten Island', 15, 495747)" +
  ") AS t(borough, cases, population)";
const BOROUGH_COUNT = 5;
const RATE_COLUMN = "incidence_per_100k";
const PLUGIN_ID = "avandar.epidemiology";

function _getPluginCard(page: Page): Locator {
  return page.getByRole("region", { name: "Epidemiology" });
}

function _getColumnHeader(
  options: Readonly<{ page: Page; columnName: string }>,
): Locator {
  return options.page.getByRole("columnheader", {
    name: options.columnName,
    exact: true,
  });
}

async function _installPlugin(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/settings/plugins`);
  const card = _getPluginCard(page);
  await expect(card.getByText("Not installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await card.getByRole("button", { name: "Install", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Install Epidemiology?" })
    .getByRole("button", { name: "Install", exact: true })
    .click();
  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/**
 * Runs "Incidence per 100k" from the toolbar with the modal's defaults:
 * `cases` over `population`, per 100,000. Returns the notification that
 * lists the added columns.
 */
async function _addIncidenceColumns(page: Page): Promise<Locator> {
  await page
    .getByRole("button", { name: "Incidence per 100k" })
    .click({ timeout: MEDIUM_WAIT });
  const dialog = page.getByRole("dialog", { name: "Incidence per 100k" });
  await dialog.getByRole("button", { name: "Add columns" }).click();
  await expect(dialog).toBeHidden({ timeout: SHORT_WAIT });
  await expect(
    _getColumnHeader({ page, columnName: `${RATE_COLUMN}_upper` }),
  ).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  const notification = page
    .getByRole("alert")
    .filter({ hasText: "Columns added" });
  await expect(notification).toContainText(`${RATE_COLUMN}_upper`);
  return notification;
}

/** Picks a result column in one of the chart settings' column pickers. */
async function _pickColumn(
  options: Readonly<{ page: Page; settingLabel: string; columnName: string }>,
): Promise<void> {
  const { page, settingLabel, columnName } = options;
  await page.getByRole("combobox", { name: settingLabel }).click();
  await page.getByRole("option", { name: columnName, exact: true }).click();
}

/** Switches the chart to the rate plot and binds the incidence columns. */
async function _drawRatePlot(page: Page): Promise<void> {
  await openDataExplorerDrawerTab({ page, tab: "visualizations" });
  const vizTypeSelect = page.getByRole("combobox", {
    name: /visualization type/i,
  });
  await vizTypeSelect.click();
  await page
    .getByRole("option", { name: "Rate plot", exact: true })
    .click({ timeout: MEDIUM_WAIT });
  await expect(vizTypeSelect).toHaveValue("Rate plot", { timeout: SHORT_WAIT });
  // Picking the chart type fills the required label column with `borough`.
  await _pickColumn({
    page,
    settingLabel: "Rate column",
    columnName: RATE_COLUMN,
  });
  await _pickColumn({
    page,
    settingLabel: "Lower bound column",
    columnName: `${RATE_COLUMN}_lower`,
  });
  await _pickColumn({
    page,
    settingLabel: "Upper bound column",
    columnName: `${RATE_COLUMN}_upper`,
  });
}

test.describe("Epidemiology plugin incidence", () => {
  test("incidence columns from the toolbar draw a rate plot with a whisker per borough", async ({
    page,
    e2eWorkerDb,
  }) => {
    const supabaseAdminClient = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient,
      slug: workspaceSlug,
    });
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _installPlugin({ page, workspaceSlug });
      // The `?sql=` deep link stands in for typing the query: the editor is
      // not what this spec covers, and the command is still driven by clicks.
      await page.goto(
        `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(BOROUGH_SQL)}`,
      );
      await dismissBlockingOverlays(page);
      await expect(
        _getColumnHeader({ page, columnName: "population" }),
      ).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      const firstNotification = await _addIncidenceColumns(page);
      await expect(
        _getColumnHeader({ page, columnName: RATE_COLUMN }),
      ).toBeVisible();
      await expect(
        _getColumnHeader({ page, columnName: `${RATE_COLUMN}_lower` }),
      ).toBeVisible();
      await firstNotification.getByRole("button", { name: "Undo" }).click();
      await expect(
        _getColumnHeader({ page, columnName: RATE_COLUMN }),
      ).toHaveCount(0, {
        timeout: MEDIUM_WAIT,
      });
      await expect(
        _getColumnHeader({ page, columnName: "population" }),
      ).toBeVisible();

      await _addIncidenceColumns(page);
      await _drawRatePlot(page);
      await expect(page.locator(".recharts-errorBar")).toHaveCount(
        BOROUGH_COUNT,
        { timeout: MEDIUM_WAIT },
      );
    } finally {
      // Removes only the install this spec made through Settings.
      await supabaseAdminClient
        .from("plugin_installations")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("plugin_id", PLUGIN_ID);
    }
  });
});
```

- [ ] **Step 2: Lint and type-check the spec**

Run: `pnpm exec eslint tests/e2e/plugins-epidemiology-incidence.spec.ts`
Expected: exit 0, no output.

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit`
Expected: no error in `tests/e2e/plugins-epidemiology-incidence.spec.ts`. On
`origin/demo/measles` `17d250246` it reports one unrelated pre-existing error
(Facts discovered 12).

- [ ] **Step 3: Confirm the worktree runs on its own Supabase project, then run the spec on its own**

Run: `ava supabase status`
Expected: a green first line reporting this worktree on its switched project.
If it is yellow, run `ava supabase switch` (then `pnpm fns:update-env`) and
re-check. Stop any `pnpm dev` on this worktree's Vite port.

Run: `pnpm test:e2e plugins-epidemiology-incidence.spec.ts`
Expected: `1 passed`, well under 45 seconds. Run it a second time and expect
`1 passed` again: a leftover install would fail the first step at
"Not installed". Not run while drafting.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/plugins-epidemiology-incidence.spec.ts
git commit -m "$(cat <<'EOF'
test(plugins): cover incidence columns drawn as a rate plot with whiskers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
### Task 19: Final verification, every check on its own

**Files:**
- None, unless `pnpm format` changes files (Step 1) or the bundle budget needs raising (Step 12).

**Context:** Every check CI and the spec's acceptance rely on, one at a time so a failure names its check. Four things differ from Part A's Task 28. `deno.json` now excludes `packages/**/dist/`, so a `dist` left by `verify:packages` no longer breaks Deno and nothing needs deleting. `pnpm type-check` already fails on the base at `supabase/functions/open-data/requestParquetCache/requestParquetCache.test.ts:237` (TS2345); if that is its only error, Step 3 passes. `pnpm desktop:sqlite:check-migrations` already reports drift on the base for a migration Part B did not add. And the host bundle sits 324 bytes under its budget after Task 9, so Step 12 says how to re-measure. The E2E specs, the only checks that touch the database, run only after `ava supabase status` confirms this worktree is on its own switched project. When a step fails, fix the cause in the task that owns it, commit the fix there, and rerun the step. Do not run `ava supabase restore` and do not merge: tell the user the branch is ready and that they run `ava supabase restore` when they finish validating it.

- [ ] **Step 1: Format**

Run: `pnpm format`
Expected: `Formatting N changed file(s)...` (N is about 2,300: the script diffs against `origin/develop`, which `demo/measles` is far ahead of) and exit 0, with `git status --short` showing no tracked changes afterwards. Exit 2 means the formatters changed files: review `git diff --no-ext-diff`, then commit them by path:

```bash
git add <each file pnpm format changed>
git commit -m "$(cat <<'EOF'
chore(plugins): format the derived column changes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: exit 0 (about 75 seconds). ESLint and Stylelint print no errors. The trailing React Doctor report is informational (`|| true`) and lists pre-existing warnings, such as `socket/low-supply-chain-score` on `package.json`.

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: `tsc -b` and the video producer checks pass, then `deno check` fails with one error only, `TS2345 [ERROR]: Argument of type ... is not assignable to parameter of type 'ParquetCacheAnswer'` at `supabase/functions/open-data/requestParquetCache/requestParquetCache.test.ts:237:39`. That error is on the base branch. Any other error is this branch's to fix. Once the base fixes it, expect exit 0.

- [ ] **Step 4: Frontend tests**

Run: `pnpm test:frontend`
Expected: `Test Files  N passed (N)` with no failures (about 3.5 minutes). The scratch run with Tasks 1 to 9 and 17 on `6915c456e` printed `Test Files  1056 passed (1056)` and `Tests  7782 passed | 2 skipped | 2 todo (7786)`.

- [ ] **Step 5: Package tests**

Run: `pnpm --filter "./packages/**" test`
Expected: all 13 packages print `Test Files ... passed` and `Done`, with no failures. Among them, `@avandar/plugin-manifest` runs 157 tests, `@avandar/plugin-sdk` 47, and `@avandar/plugin-ui` 6.

- [ ] **Step 6: Executed tests for the new SQL**

Run: `pnpm test:executed src/lib/plugins/derivedColumns plugins/epidemiology`
Expected: every `*.executed.test.ts` under those two paths passes. In the scratch worktree, with only Task 5's file present, it printed `Test Files  1 passed (1)` and `Tests  2 passed (2)`; the epidemiology tasks add the rolling average file.

- [ ] **Step 7: Catalog check**

Run: `pnpm i18n:check`
Expected: the extract table, then exit 0 with no diff.

- [ ] **Step 8: CLI tests**

Run: `pnpm test:ava-cli`
Expected: `Test Files  83 passed (83)`, `Tests  711 passed (711)`.

- [ ] **Step 9: Validate the plugin**

Run: `pnpm --filter @avandar/ava-cli build && node apps/ava-cli/dist/main.cjs plugin validate epidemiology`
Expected: ends with `✅ plugins/epidemiology is valid.`

- [ ] **Step 10: Verify the packages**

Run: `pnpm verify:packages`
Expected: the publint section lists `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, and `@avandar/plugin-ui` as `ok`, the arethetypeswrong section lists `avandar-plugin-manifest-0.1.0.tgz ok`, `avandar-plugin-sdk-0.1.0.tgz ok`, and `avandar-plugin-ui-0.1.0.tgz ok`, and the run ends with `All packages verified.` No `dist` cleanup is needed afterwards: `deno.json` excludes `packages/**/dist/`.

- [ ] **Step 11: Desktop SQLite migrations**

Run: `pnpm desktop:sqlite:check-migrations`
Expected: on the current base it exits 1, reports `drift detected`, and lists one file: `+ 20261109032546_individuals_assignment.gen.sql (regenerated but not committed)`. That migration is already on `demo/measles` and Part B adds none, so that one line is expected; any other drifted file is this branch's to fix. Once the base commits the generated file, expect `[check-sqlite-migrations] clean: no drift`.

- [ ] **Step 12: Plugin bundle check**

Run: `pnpm check:plugin-bundle`
Expected: `✓ built in ...` and no line starting `Plugin bundle check failed:`.

If the only failure is the budget line (`The plugin host adds N bytes to chunks the app can load without any plugin, over its 39600 byte budget.`), the epidemiology tasks pushed the host past the budget, which had 320 bytes of headroom after Task 9 (39,280 measured against 39,000 + 600 for the one bundled plugin). In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts`, set `HOST_BUDGET_BYTES` to N minus 600, rounded up to the next 1,000, plus 2,000, and update its docstring's measured value:

```ts
/**
 * Rendered bytes of host code a workspace without plugins may load. Measured
 * at <N - 600> bytes with plugin charts drawing in the Data Explorer and on
 * dashboards and the Data Explorer bridge for derived columns, rounded up to
 * the next 1,000 bytes, plus 2,000 of headroom.
 */
export const HOST_BUDGET_BYTES = <the new value>;
```

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle && pnpm check:plugin-bundle`
Expected: the check's own tests pass (they are written against `HOST_BUDGET_BYTES`), then the bundle check passes. Commit:

```bash
git add scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts
git commit -m "$(cat <<'EOF'
chore(plugins): re-measure the plugin host bundle budget

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

Any other failure is a real leak (for example a static import of `src/lib/plugins/derivedColumns/`): fix the import instead.

- [ ] **Step 13: Confirm the database switch**

Run: `ava supabase status`
Expected: a green first line, this worktree on its own switched project. If yellow, run `ava supabase switch` and re-check. Stop any `pnpm dev` on this worktree's Vite port.

- [ ] **Step 14: The regression E2E spec**

Run: `pnpm test:e2e plugins-epidemiology-regression.spec.ts`
Expected: `1 passed`.

- [ ] **Step 15: The epicurve E2E spec**

Run: `pnpm test:e2e plugins-epidemiology-epicurve.spec.ts`
Expected: `1 passed`.

- [ ] **Step 16: The incidence E2E spec**

Run: `pnpm test:e2e plugins-epidemiology-incidence.spec.ts`
Expected: `1 passed`.

- [ ] **Step 17: Confirm a clean tree**

Run: `git status --short`
Expected: no tracked changes other than the switch's own `supabase/config.toml` and `.env.development` edits, which must never be staged or committed.

---

## Known risks

1. **Bundle budget headroom is about 324 bytes.** After Tasks 1 to 9 the host measured 39,276 bytes against 39,600 (`HOST_BUDGET_BYTES` 39,000 plus 600 per bundled plugin). Task 15's two manifest commands may cross it. If Task 19's bundle check fails only on the budget line, re-measure and raise the budget as Task 19 says. Any other failure is a real leak.
2. **The E2E spec (Task 18) never ran.** Its locators are assumptions: the toolbar button and dialog names, the notification's `role="alert"`, the rate plot's combobox names, and `.recharts-errorBar` for whiskers. Expect to adjust selectors on its first run.
3. **The modals never ran against the real host.** Task 18 is their first end-to-end exercise.
4. **Three commands crowd the toolbar.** With more than two matching commands, all collapse into one "Plugins" menu. A result with two numeric columns and a date matches all three epidemiology commands. The E2E picks a result without a date column to keep buttons.
5. **Expressions may not contain `;`, `--`, or `/*`,** even inside a quoted identifier. A result column whose name holds one of those can never be an `addColumns` input. Acceptable for now. Noted in the docs (Task 16).
6. **DuckDB-WASM was not exercised.** Executed tests use `@duckdb/node-api` 1.5.5. The app uses `@duckdb/duckdb-wasm` 1.33.1-dev20.0. The window and `EXCLUDE` syntax is the same engine, but Task 18 is the first browser run.
7. **Known failures on the base, not Part B.** `pnpm type-check` fails at `supabase/functions/open-data/requestParquetCache/requestParquetCache.test.ts:237` (TS2345). `pnpm desktop:sqlite:check-migrations` reports drift for `20261109032546_individuals_assignment.gen.sql`. Task 19 expects both.
8. **Re-approval after deploy.** Adding `query:addColumns` hides the epidemiology plugin's contributions in the demo workspace until a settings admin approves the new permission in Settings → Plugins.
9. **Base drift.** `demo/measles` moves several times a day. Rebase before merging. Part B adds no migration, so migration ordering is not a concern unless that changes.

## Copy for Pablo

New host strings (Lingui): the plugin card line for `query:addColumns` ("Add calculated columns to a Data Explorer query when you run one of its tools"), the notification title "Columns added", its message "Added {columnList}", the reused "Undo", and the stale-Undo warning "Nothing to undo" / "The query changed after the columns were added."

New plugin strings, in `plugins/epidemiology/locales/en.json`:

| Key | English |
| --- | --- |
| `incidence.title` | Incidence per 100k |
| `incidence.description` | Adds three columns: the rate, and the lower and upper limits of its 95% confidence interval. |
| `incidence.casesColumn` | Cases column |
| `incidence.population` | Population |
| `incidence.population.column` | Column |
| `incidence.population.fixed` | Fixed number |
| `incidence.populationColumn` | Population column |
| `incidence.populationSize` | Population size |
| `incidence.base` | Rate per |
| `incidence.base.option` | `{base, number}` |
| `incidence.add` | Add columns |
| `incidence.noNumericColumns` | This command needs a numeric column of case counts. |
| `incidence.unavailable` | Columns can be added only to a query result in the Data Explorer. Run a query there, then try again. |
| `incidence.failed` | Could not add the columns: {message} |
| `rollingAverage.title` | Rolling average |
| `rollingAverage.description` | Adds a column with the average of a value over the days up to each row's date. |
| `rollingAverage.valueColumn` | Value column |
| `rollingAverage.dateColumn` | Date column |
| `rollingAverage.window` | Window |
| `rollingAverage.windowUnit` | Window unit |
| `rollingAverage.windowUnit.day` | Days |
| `rollingAverage.windowUnit.week` | Weeks |
| `rollingAverage.groupByColumn` | Group by |
| `rollingAverage.groupByColumn.none` | None |
| `rollingAverage.oneRowPerDate` | This command expects one row per date, or one row per date and group. Every row in the window counts, including rows that share a date. |
| `rollingAverage.add` | Add column |
| `rollingAverage.missingColumns` | This command needs a numeric column and a date column. |
| `rollingAverage.unavailable` | Columns can be added only to a query result in the Data Explorer. Run a query there, then try again. |
| `rollingAverage.failed` | Could not add the column: {message} |

Alternatives for the most visible strings:

| Key | Current | Alternatives |
| --- | --- | --- |
| `incidence.title` | Incidence per 100k | "Incidence rate with 95% CI"; "Add incidence rate"; "Rate per population" |
| `rollingAverage.title` | Rolling average | "Add rolling average"; "Moving average over time"; "Smooth with a rolling average" |
| `incidence.add` | Add columns | "Add rate columns"; "Add incidence columns"; "Calculate rates" |
| `rollingAverage.add` | Add column | "Add rolling average"; "Add average column"; "Calculate average" |
| Card line | Add calculated columns to a Data Explorer query when you run one of its tools | "Adds calculated columns to your Data Explorer query when you run one of its tools. You can undo it."; "Changes your Data Explorer query to add calculated columns, only when you run one of its tools" |

Optional: `plugin.description` does not mention the new commands. A possible update: "Outbreak analysis for case data. Chart cases over time as an epidemic curve, add incidence rates and rolling averages to a query, compare rates between groups with confidence intervals, and fit a linear regression to a query result."
