# AVA-270 Column Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep chart selections and manual/dashboard filter targets attached to the same columns across metadata refreshes, supported SQL edits, aggregation changes, and dashboard save/reopen.

**Architecture:** Reuse `QueryColumn.Id` with separate source and projection identity lifetimes. Reconcile those identities at query boundaries, then resolve IDs to current SQL expressions or result names only at emission/rendering boundaries. Persist query-scoped result bindings in AvaPage v5, with an explicit legacy state that can be resolved once live schema is available.

**Tech Stack:** Existing TypeScript/React, Mantine, react-querybuilder, Knex, node-sql-parser, DuckDB, TanStack Query, Puck, Zod, Vitest, and Playwright. No new dependencies.

**Spec:** [Approved design and verified red regressions](../2026-10-16-ava-270-assessment.md).

## Global Constraints

- "Reuse `QueryColumn.Id`. Preserve a selected projection's ID when its source metadata or aggregation changes."
- "Separate projections over the same source column must still be able to have distinct IDs."
- "Keep a source catalog independent of `queryColumns`, which contains selected projections."
- "An already-ID-based rule must never fall back to a different column by name."
- "No new filter persistence channel or database schema change is proposed."
- "This refactor does not add support for new SQL constructs or operators."
- "The dashboard typed-literal, remount-state, and missing-column-remapping features remain in their linked follow-up issues."
- "Do not weaken the expected values, disable a test, or treat an expected failure as passing."
- Include manual WHERE/HAVING and global/local dashboard filters. Do not add a new HAVING editor or implement AVA-272, AVA-273, AVA-274, or AVA-278.
- Preserve existing manual typed-value precedence, date handling, mixed-series settings, filter node IDs, focus, debounce, and all/selected/none subscriptions.
- Follow `AGENTS.md`, `docs/rules/typescript.md`, and `docs/rules/testing.md`. Shared imports use `.ts`; public model types use their namespaces. Translate any new visible messages.
- Work in `/Users/juanpablosarmiento/src/worktrees/avandar/refactor/query-column-id`, branch `refactor/query-column-id`. Use `wt` for any worktree operation. No push, merge, PR, or production mutation is authorized by this plan.
- No database setup is needed for model, component, or in-memory DuckDB tests. Before database-dependent E2E setup, follow the isolated Supabase switch procedure in the final validation section.

---

## Starting checkpoint and delivery order

This is a plan, not implementation. At plan preparation, application code is unchanged. The previously executed checkpoint has **775 passing tests and four new ordinary failing tests across 61 files**. Those numbers are recorded evidence, not a new run during planning.

| Existing failure | Required observable result | Turns green |
| --- | --- | --- |
| Reconstructed selected columns discard SUM | Generated SQL still contains the original SUM after metadata reconstruction | Task 1 |
| HAVING alias fails SQL/form round trip | Original and regenerated queries both return North / total 7 | Task 2 |
| Renamed WHERE field still displays Admin2 | Selector displays County and retains Butte / contains | Task 2 |
| Aggregation removes a styled series | Rendered bindings resolve to sum(revenue) and profit with original styles | Task 6 |

Execute Tasks 1 through 6 in order. Tasks 3 through 5 introduce tested, additive boundary helpers. Task 6 switches live chart/dashboard consumers and the saved format together, avoiding an intermediate release that writes IDs into a v4 name-based document. Each task has its own reviewable behavior and test gate. Known failures assigned to later tasks may remain red at an earlier checkpoint; newly broken existing tests may not.

Before Task 1, retain the three regression test files and approved spec in a scoped checkpoint commit if they are still uncommitted. Do not stage unrelated work. Record the four red outcomes before changing production code; use the focused commands in the spec. This preserves a runnable pre-fix acceptance checkpoint.

## File map

All paths are relative to the worktree root. Existing directory entries below identify the affected cohesive module, not permission to refactor unrelated files.

| # | Files and responsibility |
| --- | --- |
| 1 | Modify `shared/models/queries/QueryColumn/QueryColumn.types.ts`, `QueryColumnModule.ts`, and `QueryColumn.ts`: optional explicit output alias. Create `shared/models/queries/QueryColumn/reconcileQueryColumns/reconcileQueryColumns.ts` and its colocated test: source/projection reconciliation. Modify `shared/models/queries/StructuredQuery/StructuredQuery.types.ts`: optional source catalog at legacy ingress. Modify `src/views/DataExplorerApp/DataExplorerStateManager/{DataExplorerStateManager.tsx,DataExplorerAppState.types.ts,dataExplorerStateHelpers.ts}`, `useQueryColumnsForDataSource.ts`, `QueryColumnMultiSelect/QueryColumnMultiSelect.tsx`, and `QueryColumnSingleSelect/QueryColumnSingleSelect.tsx`: one catalog owner and stable selections. |
| 2 | Modify `shared/models/queries/StructuredQuery/QueryFilter.types.ts`, `QueryFilterValidation/`, `pruneFilterColumns/`, `renderFilterRule/`, `renderFilterGroup/`, `structuredQueryToSql/`, and `sqlToStructuredQuery/`: ID predicates, aliases, and per-projection emission. Create `normalizeQueryFilters/normalizeQueryFilters.ts` and its test under the same StructuredQuery directory. Modify `src/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm.tsx`, `QueryForm/QueryFiltersField/`, `SqlQueryView/SqlQueryView.tsx`, `useDataExplorerUrlSync.ts`, and `dataExplorerUrlHydration/`: normalize before prune, ID field values, parser context. |
| 3 | Modify `shared/models/queries/QueryResult/{QueryResult.types.ts,QueryResult.ts}` with additive bound metadata. Create `shared/models/queries/QueryColumnBindings/QueryColumnBindings.ts`, `reconcileResultBindings/reconcileResultBindings.ts`, and `resolveLegacyColumnName/resolveLegacyColumnName.ts`, with colocated tests. Create `src/views/DataExplorerApp/useBoundQueryResult/useBoundQueryResult.ts` and its test: contextual binding outside the raw result cache. |
| 4 | Create `shared/models/vizs/BoundVizConfig/BoundVizConfig.ts`, `bindLegacyVizConfig/bindLegacyVizConfig.ts`, and `resolveVizColumnBindings/resolveVizColumnBindings.ts`, with colocated tests: temporary additive ID config, legacy conversion, and one renderer adapter. Freeze `src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4.types.ts` before changing live config types. |
| 5 | Create `src/views/DashboardApp/DashboardFilterStateManager/resolveDashboardFilterBindings/resolveDashboardFilterBindings.ts` and its test, plus `useDataVizColumnBindings/useDataVizColumnBindings.ts` and its test under `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/`: per-chart targets and schema-before-filter lifecycle. Add executed coverage in `src/lib/sql/__tests__/dashboardFilterBindings.executed.test.ts`. |
| 6 | Modify `shared/models/vizs/` config types, schemas, hydration, conversion, and equality; `src/components/VisualizationContainer/` container/settings; `src/lib/ui/viz/` renderer prop types only where needed; Explorer state/result/save integration; Dashboard DataViz/Filter blocks and custom fields. Add AvaPage v5 migration and wire `shared/models/Dashboard/DashboardConfig/constants.ts` and `src/views/DashboardApp/AvaPage/utils/upgradeAvaPageData.ts`. Exact integration paths are listed under Task 6. |

Tests remain beside their module unless its suite is already split into `__tests__`. Executed DuckDB tests remain under `src/lib/sql/__tests__`, keeping browser dependencies out of Deno-reachable shared tests. Adapt existing fixture factories rather than creating a second imitation state manager.

## Contracts and identity rules

### Source and selected columns

Keep `QueryColumn.T` as the existing wrapper of a DatasetColumn or ConceptAttribute. Add `outputAlias?: string`; `getDerivedColumnName` returns that alias when present, otherwise its current aggregate/base naming rule. Do not encode the source name into an ID.

A source catalog is `readonly QueryColumn.T[]` with no aggregation or output alias. Selected projections are separate wrappers with separate IDs. Their source match is `(Model.getTypedId(dataSource), Model.getTypedId(baseColumn))`, comparing each typed ID by its `__type` and `id` fields, never object reference or label. Add `sourceColumns?: readonly QueryColumn.T[]` to structured-query input for backward compatibility. Normalized runtime queries always populate it when metadata is loaded. Loading and a confirmed empty catalog are different states.

Preserve explicit existing projection IDs first. A reconstructed picker wrapper can inherit a selected projection only when exactly one previous projection refers to that source. Multiple aggregates on one source require explicit IDs or an unambiguous expression match. Preserve aggregation from the authoritative `query.aggregations` map, ordering, and aliases. A source change invalidates old source IDs even when names match.

### Result registry

Define and export these contracts through `QueryColumnBindings.ts` and `QueryResult`:

```ts
export type ProjectionDescriptor = {
  id: QueryColumn.Id;
  identity: "structured" | "sql";
  // Source/model identity plus supported expression, excluding output alias.
  expressionKey: string;
  // Alias-free physical SQL expression, also available in snapshots.
  sqlExpressionKey: string;
  outputName: string;
};

export type ResultBinding = QueryResult.Column & {
  id: QueryColumn.Id;
  expressionKey?: string;
  sqlExpressionKey?: string;
};

export type ResultBindingRegistry = {
  version: 1;
  scopeKey: string;
  sqlKey: string;
  columns: readonly ResultBinding[];
};

export type BindingIssue = {
  target: string;
  reason: "missing" | "ambiguous" | "unsupported";
};

export type BoundResultSchema = {
  registry: ResultBindingRegistry;
  columns: readonly QueryResult.BoundColumn[];
  issues: readonly BindingIssue[];
};
```

`QueryResult.BoundColumn` is `QueryResult.Column & { id: QueryColumn.Id }`. Leave `QueryResult.Column`, Arrow conversion, and low-level query transport name-based. Rows remain keyed by actual SQL output names. A query with a genuine empty schema is different from no completed result.

`scopeKey` identifies the owning Explorer session or saved block, including its auth/workspace/snapshot scope in the runtime cache. Persist the block-owned portion only. `sqlKey` is the exact SQL after trimming surrounding whitespace and one terminal semicolon. Do not perform semantic canonicalization of opaque SQL.

Supported matching, in order:

1. Structured projection ID and its emitted output name, confirmed uniquely in result metadata.
2. A unique supported expression/source key across old and new SQL. Recognize only the parser's existing single-source column, star-expanded column, group-by column, and supported aggregate forms. Exclude aliases from the expression key. Source metadata identities are preferred in `expressionKey`. Also persist `sqlExpressionKey`, derived from the qualified physical relation/column AST, to bridge a structured Explorer save into snapshot-only SQL execution. Match the physical key only when one side lacks model identity, never when two known model identities disagree. Preserve both keys when reconciliation succeeds.
3. For opaque SQL only, reuse a result ID by unique exact output name when both scope and `sqlKey` are unchanged. Reordering does not matter. A changed opaque SQL statement gets new IDs; existing references become unresolved.
4. Legacy ingress alone may use unique exact-name matching, then unique case-insensitive matching. Multiple candidates at either applicable stage are ambiguous. Never choose the first column or an ordinal.

Different expressions over one physical column remain different projections. Two identical expressions can be paired by a unique unchanged alias; simultaneous ambiguous alias changes remain unresolved. A supported alias-only edit preserves identity. An explicit structured aggregation action preserves its projection ID. A freehand aggregate-expression rewrite does not receive speculative lineage matching.

The registry retains only current resolvable outputs. In-memory auth/revision keys namespace the cache around the persisted `scopeKey`; do not rewrite a saved block's scope when switching viewer auth modes. A saved ID target that is absent must not be rebound by name or silently reseeded to an unrelated default. Keep its unresolved status until the existing missing-binding handling can omit it. For invalid/ambiguous output names, do not produce a falsely usable bound column; the table can still show the raw result.

---

## Task 1: Preserve source catalogs and selected projection state

**Interfaces**

Create `reconcileQueryColumns.ts` with:

```ts
export function reconcileSourceColumns(options: {
  sourceKey: QueryDataSource.TypedId;
  previousSourceKey: QueryDataSource.TypedId | undefined;
  previous: readonly QueryColumn.T[];
  incoming: readonly QueryColumn.T[];
}): readonly QueryColumn.T[];

export function reconcileSelectedColumns(options: {
  previous: readonly QueryColumn.T[];
  incoming: readonly QueryColumn.T[];
  aggregations: StructuredQuery.Partial["aggregations"];
}): {
  columns: QueryColumn.T[];
  aggregations: StructuredQuery.Partial["aggregations"];
};
```

Consumes existing model IDs and the aggregation map. Produces the source catalog and selected wrappers consumed by Tasks 2 and 3. Constructors may still allocate IDs for genuinely new wrappers; they are not the lifetime owner.

- [ ] **1. Pin the existing red test and add the collision boundary.** Use the actual provider in `DataExplorerStateManager.columnIdentity.test.tsx`. Preserve its reconstructed-wrapper assertion:

```ts
expect(aggregatedSql).toContain('sum("revenue")');
expect(result.current[0].rawSql).toBe(aggregatedSql);
```

Extend the same fixture with a refreshed `baseColumn.name`, then assert SQL uses the new name with SUM and the selected order-by still addresses that projection. In a separate case, give a new source column the old display name and a different model ID; it must not inherit SUM or ordering. For two projections over one source, select both by their explicit IDs and verify generated SQL retains both aggregate outputs after Task 2 enables per-projection emission; do not put that pending SQL assertion in Task 1's green gate.

- [ ] **2. Run the red test.**

```sh
pnpm exec vitest run \
  src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.columnIdentity.test.tsx \
  -t 'keeps aggregate SQL' --reporter=verbose
```

Expected before implementation: SUM becomes a plain source selection.

- [ ] **3. Implement reconciliation with immutable output.** On an explicit ID match, refresh the base metadata while retaining that ID and map aggregation. Otherwise find source-identity candidates and reuse only a unique candidate. New columns retain their newly allocated ID and default aggregation. Never mutate the passed wrappers.

```ts
const explicit = previous.find((column) => column.id === incomingColumn.id);
const sameSource = previous.filter((column) =>
  column.baseColumn.__type === incomingColumn.baseColumn.__type &&
  column.baseColumn.id === incomingColumn.baseColumn.id,
);
const retained = explicit ?? (sameSource.length === 1 ? sameSource[0] : undefined);
const column = retained
  ? { ...retained, baseColumn: incomingColumn.baseColumn }
  : incomingColumn;
const aggregation = retained ? aggregations[retained.id] : column.aggregation;
```

Use `Model.getTypedId` for source scope and compare its `__type` and `id` fields before this selected-column step. Do not collapse a list of multiple explicit projections into one source-keyed map. When the picker adds a source for the first time, create a projection wrapper with its own ID instead of directly storing the source-catalog wrapper; existing selected wrappers passed to `setColumns` retain their IDs.

- [ ] **4. Make the provider own the canonical source catalog.** `useQueryColumnsForDataSource` loads metadata; reconcile it once into the Explorer provider rather than constructing unrelated catalogs independently for the picker and manual form. Track `{ sourceKey, status: "loading" | "ready", columns }`. Reset the scope on `setDataSource`; ignore late metadata from a previous source. Both form and picker read the reconciled catalog. Preserve the existing selection display and single-select ordering behavior.

- [ ] **5. Run the task gate and commit only its paths.**

```sh
pnpm exec vitest run \
  shared/models/queries/QueryColumn \
  src/views/DataExplorerApp/QueryColumnMultiSelect/remapColumnsByBaseId \
  src/views/DataExplorerApp/QueryColumnSingleSelect \
  src/views/DataExplorerApp/DataExplorerStateManager \
  --reporter=verbose
pnpm exec tsc -b --noEmit
```

Expected: reconstruction test and existing relevant suites pass; the separately documented styled-series test may still fail. Commit message: `refactor(query): preserve source and projection identity`.

## Task 2: Bind manual WHERE/HAVING, preserve aliases, and fix SQL round trips

**Interfaces**

Runtime `QueryFilterRule` replaces `columnName` with `columnId: QueryColumn.Id`; its editing `id`, operator, value, matchCase, and fallback type stay unchanged. `QueryFilterColumnTypes` becomes `Partial<Record<QueryColumn.Id, AvaDataType.T>>`. Define isolated `LegacyQueryFilterRule` and recursive `LegacyQueryFilterGroup` with the previous name-based shape for ingress only. Do not make both target fields optional in runtime rules.

Create `normalizeQueryFilters.ts`:

```ts
export function normalizeQueryFilters(options: {
  filter: QueryFilterGroup | LegacyQueryFilterGroup;
  columns: readonly QueryColumn.T[];
  clause: "where" | "having";
}): {
  filter: QueryFilterGroup;
  issues: readonly { nodeId: string | undefined; reason: "missing" | "ambiguous" }[];
};
```

WHERE receives the full source catalog; HAVING receives selected grouped/aggregate projections. The latter resolves explicit alias, derived output name, or supported aggregate expression uniquely. Existing ID rules are checked only by ID. Missing/ambiguous legacy rules follow existing omission/reporting behavior. Caller must wait for a ready catalog before normalizing or pruning.

Extend `SqlMappingInput` with `previousQuery?: StructuredQuery.Partial` and `sourceColumns?: readonly QueryColumn.T[]`. Keep the existing `sqlToStructuredQuery(input): SqlMappingResult` API and warning result shape. Add a clause-aware expression resolver in `structuredQueryToSql/resolveFilterColumn/resolveFilterColumn.ts`:

```ts
export function resolveFilterColumn(options: {
  columnId: QueryColumn.Id;
  clause: "where" | "having";
  query: StructuredQuery.Partial;
}): { sql: string; dataType: AvaDataType.T } | undefined;
```

Its SQL is generated from quoted model identifiers and the existing aggregate whitelist, never from a free-text filter value. Renderers accept this resolved expression, rather than quoting an aggregate expression as though it were a column name. Caller-supplied live types keep their existing precedence over stored rule types. HAVING uses the aggregate result type: count is bigint, avg is double, min/max preserve the source type, and sum uses its numeric output type. Prefer completed result metadata where available. Add a count-on-text HAVING case to the existing executed suite so a numeric comparison cannot accidentally use text semantics.

- [ ] **1. Run both existing red acceptance tests unchanged.**

```sh
pnpm exec vitest run \
  src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx \
  --reporter=verbose
pnpm test:executed \
  src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts \
  --reporter=verbose
```

Expected: obsolete Admin2 label and DuckDB's invalid HAVING alias binder error. After fixture migration, preserve the same rendered label/value/operator and returned-row assertions.

- [ ] **2. Add only the missing executed semantics.** Extend the current DuckDB fixture, parser datasets, and existing `withDuckDb` harness. Use these SQL/expected-row pairs as the concrete cases:

```sql
SELECT district FROM cases WHERE cnt >= 5;
-- [{ district: "North" }], despite cnt being absent from SELECT.

SELECT district, SUM(cnt) AS total, MAX(cnt) AS peak
FROM cases WHERE cnt >= 2
GROUP BY district HAVING total > 5 AND peak >= 5;
-- [{ district: "North", total: 7, peak: 5 }].
```

For each, execute original SQL, parse it, emit it, and compare both row sets and output column names. Then change the selected total alias to amount through the same projection and expect `{ district: "North", amount: 7, peak: 5 }`. WHERE must still filter input `cnt`. Also rename source `cnt` to `count_value` in both fixture metadata and the DuckDB table without changing its source identity; regenerate and assert the same groups. Introduce an unrelated source with the old name in a separate prune test and verify its rule is omitted/reported, not rebound.

- [ ] **3. Convert the filter boundary and controls atomically.** Normalize legacy ingress before validation/pruning; map live types by ID. In `QueryFiltersField`, use `{ name: column.id, label: column.baseColumn.name }`; adapt `FilterFieldSelector` to separate value from label. Preserve node IDs, nested combinators, `useFilterTreeState`, debounce, and focus. The rename regression must still enter Butte through the real UI before metadata changes. Keep current operator/value matrices; change their fixtures, not their expectations.

- [ ] **4. Preserve aliases and emit projections independently.** Parse and store `outputAlias`, reconcile previous projections by unique expression/source and unchanged alias where necessary, then resolve HAVING aliases and expressions to the same projection ID. Use the aggregation map as the emitter's source of truth. Replace the source-name-keyed `duckDbAggregations` object with one emitted SELECT expression per selected projection.

```ts
const aggregation = query.aggregations[column.id];
const effectiveColumn = { ...column, aggregation };
const outputName = QueryColumn.getDerivedColumnName(effectiveColumn);
const sourceSql = quoteSqlIdentifier(column.baseColumn.name);
const expressionSql = (() => {
  switch (aggregation) {
    case undefined:
    case "none":
    case "group_by":
      return sourceSql;
    case "sum":
    case "avg":
    case "count":
    case "min":
    case "max":
      return `${aggregation}(${sourceSql})`;
  }
})();
const selectionSql = `${expressionSql} as ${quoteSqlIdentifier(outputName)}`;
```

Apply the existing optional timestamp-to-ISO transformation to plain temporal projections before constructing the SELECT alias; the switch above shows the core aggregate selection without duplicating that existing transformation. Extract `buildProjectionExpression(column: QueryColumn.T, aggregation: QueryAggregationType.T | undefined): string` into `structuredQueryToSql/buildProjectionExpression/buildProjectionExpression.ts` for SELECT and HAVING so they cannot disagree. Timestamp display conversion remains on the SELECT side; filtering uses the original typed expression. Maintain current ordering, limits, offsets, joins, and nested-subquery behavior; do not broaden SQL-to-form mapping support. For HAVING on a grouped projection use the quoted base expression; for an aggregate use its generated aggregate expression. This avoids relying on ambiguous SQL alias precedence while retaining aliases in SELECT and ORDER BY.

- [ ] **5. Wire parsing, SQL editing, and URL restoration.** Pass existing query/catalog context when SQL or URL state is reparsed. Fresh URL hydration establishes a new consistent catalog once, then reconciles subsequent reloads. Normalize any existing structured-tree ingress before prune. Preserve partial-mapping warnings for unsupported/ambiguous expressions; do not mark a lossy query fully mapped. Audit existing callers with `rg` for `columnName`, `QueryFilterRule`, `QueryFilterColumnTypes`, and `sqlToStructuredQuery`; update only these filter consumers, including shared/Deno callers if present.

- [ ] **6. Run the task gate and commit.**

```sh
pnpm exec vitest run \
  shared/models/queries/StructuredQuery \
  src/views/DataExplorerApp/QueryForm/QueryFiltersField \
  src/views/DataExplorerApp/dataExplorerUrlHydration \
  src/views/DataExplorerApp/resolveManualQueryForExecution \
  --reporter=dot
pnpm test:executed src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts
pnpm exec tsc -b --noEmit
```

Expected: both existing manual regressions and new source-only/distinct-aggregate cases pass, with all preexisting filter semantics preserved. Commit: `fix(query): bind manual filters to stable source and projection ids`.

## Task 3: Bind completed results without changing raw execution or caching

**Interfaces**

Implement the registry contracts above and add `describeQueryProjections/describeQueryProjections.ts` plus `describeSqlProjections/describeSqlProjections.ts` under `shared/models/queries/QueryColumnBindings/`, each with a colocated test. The former reads selected columns and the authoritative aggregation map. The latter reads the existing SQL parser AST directly, recognizing only the supported single-source shapes listed above. It returns no descriptors for opaque constructs. Both generate unambiguous expression keys from structured tuples, not concatenated unescaped names.

```ts
export function describeQueryProjections(
  query: StructuredQuery.Partial,
): readonly ProjectionDescriptor[];

export function describeSqlProjections(options: {
  sql: string;
  columns: readonly QueryResult.Column[];
}): readonly ProjectionDescriptor[];
```

For raw SQL, fresh descriptor IDs are provisional: reconciliation prefers a previous unique expression match before using a provisional ID. For structured queries, the selected projection ID is authoritative. The `ProjectionDescriptor.identity` discriminant makes that distinction explicit. A star expands only against a known single-source output schema. Duplicate/ambiguous outputs produce issues instead of ordinal matching.

Then implement:

```ts
export function reconcileResultBindings(options: {
  scopeKey: string;
  sqlKey: string;
  columns: readonly QueryResult.Column[];
  projections: readonly ProjectionDescriptor[];
  previous: ResultBindingRegistry | undefined;
}): BoundResultSchema;

export function resolveLegacyColumnName(
  name: string,
  columns: readonly QueryResult.BoundColumn[],
): QueryColumn.Id | undefined;

export function useBoundQueryResult(options: {
  scopeKey: string;
  sqlKey: string;
  resultSqlKey: string | undefined;
  result: QueryResult.T | undefined;
  projections: readonly ProjectionDescriptor[];
  initialRegistry: ResultBindingRegistry | undefined;
}): BoundResultSchema | undefined;
```

`undefined` from the legacy resolver means missing or ambiguous; the calling converter records the specific issue using candidate counts. `resultSqlKey` identifies the execution that produced the result, not whichever SQL happens to be current when a promise resolves. Do not synthesize bindings from a loading `[]`.

- [ ] **1. Add a behavioral binding test, not an ID-allocation test.** Allocate two test IDs using the existing QueryColumn constructor. Persist a registry for `SUM(revenue) AS total` and profit. Reconcile renamed/reordered outputs to amount and profit using the same supported expression key. Assert the saved target reads the current row value:

```ts
const selected = schema.columns.find((column) => column.id === revenue.id);
expect(selected?.name).toBe("amount");
expect({ amount: 7, profit: 3 }[selected!.name as "amount" | "profit"]).toBe(7);
```

Add negative cases where another source returns total, two candidates differ only by case, and opaque SQL changes while preserving a label. In each case an existing target must not read the unrelated value. Cover identical-query reordered outputs and an alias-only supported edit; do not test only that a UUID exists.

- [ ] **2. Run the new suite red.**

```sh
pnpm exec vitest run shared/models/queries/QueryColumnBindings --reporter=verbose
```

The initial missing-module failure only establishes the new test wiring; the behavior assertions must also fail against a deliberately name-only reconciliation while developing the helper.

- [ ] **3. Implement the ordered matching rules.** Match within scope, detect ambiguity before allocating/reusing identities, and match actual output metadata by unique name rather than SELECT ordinal. Reuse registry/object references when schema and bindings are unchanged. Keep raw Arrow rows and metadata intact. Do not add IDs to `duckDbArrowResults.ts` without query context.

```ts
if (previous?.scopeKey !== scopeKey) {
  previous = undefined;
}
const canReuseOpaqueNames = previous?.sqlKey === sqlKey;
// Expression matches require unique candidates on both sides.
// Name-only reuse is restricted to canReuseOpaqueNames or legacy ingress.
```

Here `previous` is a local variable initialized from the immutable options. Allocate a fresh ID only for a genuinely new, uniquely addressable result output.

- [ ] **4. Implement and test the hook's execution guard.** A completed result is bindable only when `resultSqlKey === sqlKey`. Do not publish a stale result from query A after the owner switches to B; do not clear bindings during loading or replace custom configs on an identical refetch. Keep the raw TanStack result cache's existing leading key structure and markers. Carry execution identity alongside query data, not by mutating cached results or appending a changing registry to the raw query key.

- [ ] **5. Run the helper/hook tests and existing query-auth/analytics tests.**

```sh
pnpm exec vitest run \
  shared/models/queries/QueryColumnBindings \
  src/views/DataExplorerApp/useBoundQueryResult \
  src/views/DataExplorerApp/useDataQuery \
  src/views/DataExplorerApp/useDataQueryAnalytics --reporter=dot
pnpm exec tsc -b --noEmit
```

Expected: all pass. The new hook is additive until Task 6; workspace, public, and workspace-published execution remain unchanged. Commit: `refactor(query): add contextual result column bindings`.

## Task 4: Add the ID-to-renderer boundary and freeze legacy chart types

**Interfaces**

Define `BoundVizConfig` as an explicit discriminated union matching existing `VizConfig.T`, replacing only column-bearing strings with `QueryColumn.Id`. Preserve each variant's existing optionality and all non-binding properties. Do not apply a recursive string-to-ID mapped type: labels, colors, formats, and category-value color maps are strings too.

Create a frozen `LegacyVizConfig` from the current name-based shapes in `BoundVizConfig/LegacyVizConfig.types.ts`. It has no imports from mutable live chart configuration types. Renderer config uses this same row-key-shaped union under the alias `ResolvedVizConfig`; this alias describes output, not permission to pass legacy persistence straight to a renderer.

```ts
export function bindLegacyVizConfig(
  config: LegacyVizConfig,
  columns: readonly QueryResult.BoundColumn[],
): { config: BoundVizConfig; issues: readonly BindingIssue[] };

export function resolveVizColumnBindings(
  config: BoundVizConfig,
  columns: readonly QueryResult.BoundColumn[],
): { config: ResolvedVizConfig; issues: readonly BindingIssue[] };
```

A missing required target omits the affected series or clears the optional axis under existing missing-column behavior; the parent config must not seed a replacement merely because an existing bound ID is absent. No new remapping UI.

- [ ] **1. Add one parameterized behavior suite per distinct binding shape.** Cover XY axis + series, scatter pair, bubble triple, radar, pie/funnel name/value, and table pass-through. Use one saved ID that now resolves from revenue to amount, with misleading revenue values still present in the row.

```ts
expect(resolved.config).toMatchObject({
  series: [{ key: "amount", label: "Revenue trend", color: "#123456" }],
});
const row = { amount: 7, revenue: 999 };
expect(row[resolved.config.series[0].key as keyof typeof row]).toBe(7);
```

This assertion belongs in a narrowed XY test fixture. Scatter X and bubble size must each change independently of Y. Retain existing renderer styling/date tests instead of duplicating their matrices. Add a legacy ambiguous-name case that does not pick the first candidate.

- [ ] **2. Run the helper suites red.**

```sh
pnpm exec vitest run \
  shared/models/vizs/bindLegacyVizConfig \
  shared/models/vizs/resolveVizColumnBindings --reporter=verbose
```

- [ ] **3. Implement exhaustive per-variant conversion.** Copy all style properties and rewrite only xAxisKey, series.key, scatter series.xKey, bubble series.sizeKey, radar nameKey, and pie/funnel nameKey/valueKey as applicable. Category colors continue to use category values. Keep resolution centralized, with no fallback-by-name for an ID-based config.

```ts
const column = columns.find((candidate) => candidate.id === series.key);
return column ? { ...series, key: column.name } : undefined;
```

The actual helper uses an ID lookup and the existing exhaustive variant switch; the snippet shows the only permitted direction of runtime conversion. Pair/triple series are usable only when all their required bindings resolve.

- [ ] **4. Freeze historical v4 types.** Replace its current `AvaPageTypes` aliases with the exact v4 root/block/filter/chart shapes. Preserve v1-v4 migration tests. Do not point old migration types at the new bound union or widen every string into `string | QueryColumn.Id`. The standalone `LegacyVizConfig` and the historical v4 type file describe the same legacy shapes, but historical migration modules keep their documented isolation.

- [ ] **5. Run the helper and migration gates, then commit.**

```sh
pnpm exec vitest run \
  shared/models/vizs/bindLegacyVizConfig \
  shared/models/vizs/resolveVizColumnBindings \
  src/views/DashboardApp/AvaPage/migrations --reporter=dot
pnpm exec tsc -b --noEmit
```

Expected: all pass; live charts still use their current integration until Task 6. Commit: `refactor(viz): define stable bindings at the renderer boundary`.

## Task 5: Resolve dashboard filter targets before executing filtered SQL

**Interfaces**

The global filter's `filterId` remains its control/value identity. A chart owns its target map:

```ts
export type DashboardFilterTarget =
  | { kind: "bound"; columnId: QueryColumn.Id }
  | { kind: "legacy"; columnName: string }
  | { kind: "unresolved"; columnName: string; reason: "missing" | "ambiguous" };

export type DashboardFilterTargets = Readonly<Record<string, DashboardFilterTarget>>;

export function resolveDashboardFilterBindings(options: {
  filters: readonly DashboardFilterRecord[];
  targets: DashboardFilterTargets;
  columns: readonly QueryResult.BoundColumn[];
}): {
  targets: DashboardFilterTargets;
  resolvedFilters: readonly DashboardFilterRecord[];
  issues: readonly BindingIssue[];
};
```

The returned name-bearing `resolvedFilters` is a SQL-boundary DTO consumed by the existing wrapper renderer. Runtime target ownership is the ID map. Global filter definitions retain a `columnName` authoring hint because the existing text-input UX needs a name to bind a new subscription; that hint is never used directly to build SQL after binding. Changing the hint explicitly resets affected targets to `legacy`; changing only labels or viewer values does not. Bound targets never fall back to the hint.

A new local filter has `columnId` rather than `columnName`; legacy local definitions are admitted only through the saved-data compatibility envelope in Task 6. Values and IDs remain independent of targets.

Create `useDataVizColumnBindings` with options `{ scopeKey: string; rawSql: string; initialRegistry: ResultBindingRegistry | undefined; auth: StructuredQueryAuth; projections: readonly ProjectionDescriptor[] }`, returning `{ status: "loading" | "ready" | "error"; schema: BoundResultSchema | undefined; error: Error | undefined }`. Import the existing `StructuredQueryAuth` from `src/clients/queries/runStructuredQuery/runStructuredQuery.types.ts`. Its new schema-only runner accepts the same discriminated auth union.

- [ ] **1. Add an executed two-chart test.** Initial legacy hint region binds independently in chart A and B. Reconcile B's supported alias from region to territory, retain its target ID, and apply a global value North. Execute both wrapped queries and assert A returns its North record and B its North record, despite different current aliases. Use different South records so missing or wrong filters fail visibly. Apply a local filter to A and prove B's rows remain unchanged. Exercise all/selected/none using the existing subscription helpers; do not duplicate their complete unit matrix.

```sql
SELECT 'North' AS region, 7 AS amount
UNION ALL SELECT 'South', 3;

SELECT 'North' AS territory, 70 AS amount
UNION ALL SELECT 'South', 30;
```

For this wrapper test, supply the already reconciled registry explicitly; UNION lineage remains opaque. The separate registry test uses a supported single-source query to prove alias identity. Assert returned rows, not merely the wrapper's SQL text.

- [ ] **2. Run the new executed test red.**

```sh
pnpm test:executed src/lib/sql/__tests__/dashboardFilterBindings.executed.test.ts
```

- [ ] **3. Implement target resolution.** Apply the existing subscription selection first. Resolve each chart's legacy target uniquely against its own unfiltered output registry; store the resulting ID. For bound targets look up only that ID and emit the column's current name. Omit unresolved predicates through the existing error/reporting path without substituting a similarly named output. Preserve existing dashboard literal serialization; AVA-273 is separate.

```ts
const column = target.kind === "bound"
  ? columns.find((candidate) => candidate.id === target.columnId)
  : undefined;
const resolved = column ? { ...filter, columnName: column.name } : undefined;
```

Legacy resolution is a separate branch using Task 3's unique resolver. Do not continuously retry an unresolved target on every result/refetch; retry only at explicit query/definition changes or deliberate authoring resolution.

- [ ] **4. Implement schema discovery independently of viewer values.** Validate a persisted registry against its query signature; if unavailable/stale, execute the unfiltered schema query before applying any filters:

```sql
SELECT * FROM (<original SQL without one terminal semicolon>) AS "_ava_schema"
LIMIT 0
```

Use the existing read-query execution service and the same workspace/public/workspace-published auth and snapshot revision. Cache discovery by auth scope, revision, block scope, and normalized raw SQL; never include filter values in that key. Share the discovery result between Puck settings and DataViz render. If discovery fails, use the existing query error surface and do not execute a guessed filtered query. A schema query is internal metadata work and must not emit a second user-query analytics event. Reuse the existing SQL-wrapper trimming logic; do not invent a regex SQL parser.

- [ ] **5. Test lifecycle and run the gate.** Hook tests must prove initial active filters wait for discovery, filter-value changes do not rediscover, stale responses cannot overwrite a newer query's registry, and discovery uses each auth variant with its revision. Table/no-filter rendering may use a completed unfiltered data result to establish the same registry, avoiding unnecessary duplicate execution.

```sh
pnpm exec vitest run \
  src/views/DashboardApp/DashboardFilterStateManager \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizColumnBindings \
  --reporter=dot
pnpm test:executed src/lib/sql/__tests__/dashboardFilterBindings.executed.test.ts
pnpm exec tsc -b --noEmit
```

Expected: all pass. These helpers remain additive until Task 6. Commit: `refactor(dashboard): resolve filter targets within each chart query`.

## Task 6: Switch live consumers and persist bindings in AvaPage v5

**Files and responsibilities**

- `shared/models/vizs/SeriesConfig.ts`, each chart's config types/schema, `VizConfig/`, `applyVizConfigFromQueryResult/`, and query/result hydration helpers: make runtime column slots IDs and compare every slot.
- `src/components/VisualizationContainer/VisualizationContainer.tsx`: central resolution before chart wrappers. `VizSettingsForm/Control/ColumnPickerControl.tsx`, `SeriesList/SeriesList.tsx`, `PairSeriesFieldset/PairSeriesFieldset.tsx`, `BubbleSeriesFieldset/BubbleSeriesFieldset.tsx`, `SeriesAwareVizForm/`, `ScatterChartForm.tsx`, `BubbleChartForm.tsx`, `PieChartForm.tsx`, `FunnelChartForm.tsx`, and `VizSettingsFormBody/`: ID values, current labels.
- `src/views/DataExplorerApp/DataExplorerApp.tsx`, `DataExplorerDrawer/`, `DataExplorerStateManager/`, `useDataQuery/useDataQuery.ts`, and `SaveToDashboardModal/`: attach bound metadata, remember ID configs, pass saved registry.
- `src/clients/queries/runStructuredQuery/runStructuredQuery.types.ts` and `runStructuredQueryWithMetadata.ts`: carry actual execution SQL identity if needed by the hook; preserve shared GIS/auth execution behavior.
- `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx`, the inline `useDataVizDisplayState`/`useDataVizQuery` hooks, `useLocalFilterState.ts`, `DataVizFilters/DataVizFilters.ts`, and `DataVizLocalFilters/`: activate pre-filter registry and ID targets. The remaining file paths in this bullet are in that same inner `DataVizPBlock/` directory.
- `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizPBlockConfig.tsx`, `makeDataVizPBlockStateFromProps/`, `buildPendingDataVizBlock/`: editor defaults, query edits, and config memory.
- `src/views/DashboardApp/AvaPage/pfields/VizConfigPField/`, `LocalFiltersPField/`, `GlobalFilterSubscriptionPField/`; `pblocks/FilterPBlock/`; and `src/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql.ts`: authoring and filter application boundaries.
- `src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock.ts`: save registry and ID config atomically.
- Create `src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV5/{AvaPageDataMigrationV5.ts,AvaPageDataMigrationV5.types.ts,AvaPageDataMigrationV5.test.ts}`. Modify `shared/models/Dashboard/DashboardConfig/constants.ts`, `AvaPage/AvaPage.types.ts`, and `AvaPage/utils/upgradeAvaPageData.ts`: bump 4 to 5 and register migration.
- Create `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveSavedDataVizBindings/{resolveSavedDataVizBindings.ts,resolveSavedDataVizBindings.test.ts}`: pure live-schema compatibility resolver.

**Interfaces and saved representation**

Promote Task 4's bound shapes to the canonical `VizConfig.T`; remove the temporary duplicate `BoundVizConfig` definition, retaining an alias only if it avoids churn during this task. Runtime renderers receive `ResolvedVizConfig`. Runtime controls receive `readonly QueryResult.BoundColumn[]`. In-memory query hydration can derive output names from selected projections before execution, while completed results are authoritative for row names and data types.

A v5 DataViz's binding-sensitive props form this tagged union, alongside its unchanged block ID, NLQuery, title, and other display properties:

```ts
type DataVizBindingProps =
  | {
      bindingVersion: 0;
      vizConfig: LegacyVizConfig;
      localFilters: readonly LegacyLocalFilter[];
      globalFilterSubscription: GlobalFilterSubscription;
    }
  | {
      bindingVersion: 1;
      vizConfig: VizConfig.T;
      columnBindings: ResultBindingRegistry;
      localFilters: readonly LocalFilter[];
      globalFilterSubscription: GlobalFilterSubscription;
      globalFilterTargets: DashboardFilterTargets;
    };
```

`LegacyLocalFilter` is the current local-filter shape frozen with `columnName`; `LocalFilter` keeps its existing fields and replaces that target with `columnId: QueryColumn.Id`. Unresolved legacy local filters remain in the version-0 envelope until fully resolvable; do not partially save a falsely complete version-1 block. Existing bound blocks may retain missing ID references, with issues reported at runtime.

`resolveSavedDataVizBindings(props, schema)` returns `{ props: DataVizBindingProps; runtimeConfig: VizConfig.T; issues: readonly BindingIssue[] }`. Both arguments use the above union and `BoundResultSchema`. It converts resolvable legacy props using Tasks 3-5; if any required legacy target is ambiguous/missing, returns the original stored envelope and a safe runtime config omitting unresolved targets. This preserves unresolved names for later explicit repair without giving runtime filters dual target semantics.

Extend `createDataVizBlock`'s existing options with `columnBindings: ResultBindingRegistry`; its existing `vizConfig` becomes the canonical ID config. A copied block receives a new owner scope key but preserves its self-contained binding IDs. IDs are always looked up within that block registry, never globally.

- [ ] **1. Add save/serialize/reopen behavior tests before cutover.** Extend the existing `createDataVizBlock` and migration suites. Configure a styled series, save, JSON serialize/parse, upgrade, resolve against a renamed supported output, and feed the real adapter. Assert the final renderer key and row value plus label/color/stroke. Add a legacy v4 chart with both local/global filters; after migration and runtime resolution, execute its filtered SQL and assert intended rows. Loading the same legacy document twice must not mutate it or invoke a save callback.

```ts
expect(resolved.config).toMatchObject({
  series: [{ key: "amount", label: "Revenue trend", color: "#123456" }],
});
expect(saveDashboard).not.toHaveBeenCalled();
expect(JSON.stringify(originalSavedDocument)).toBe(originalJson);
```

Use the existing save callback mock at the editor/viewer boundary for the side-effect assertion; a pure helper test alone cannot prove no autosave. Test unique case fallback and ambiguity separately. Preserve all v1-v4 migration fixtures and run the real registered migrator through v5.

- [ ] **2. Implement v5 structural migration.** Synchronously mark v4 DataViz blocks `bindingVersion: 0`; preserve all legacy names, filter values, subscription modes, and nested Puck content. Do not generate IDs, inspect live schema, or execute a query in the migration. Version-5 reruns are no-ops. New empty blocks start as version 1 with an empty registry and no configured targets; query results populate it during authoring. Existing unresolved legacy blocks stay explicitly version 0 inside a v5 page until safely resolved.

```ts
return {
  ...legacyDataVizProps,
  bindingVersion: 0 as const,
};
```

Follow the existing transformProps traversal for content/zones. Implement the migrator's downgrade path: version-0 envelopes unwrap exactly; version-1 IDs resolve to persisted names. If a required ID has no persisted binding, throw a clear migration error rather than fabricating a column name. No database migration or production data rewrite.

- [ ] **3. Switch Explorer charts and settings.** Make schema equality compare IDs, names, types, and order; config equality must include scatter xKey and bubble sizeKey as well as series.key. Hydration preserves existing IDs/styles and only seeds defaults for genuinely unconfigured chart slots, not unresolved prior selections. Update all eight chart families and table metadata. Keep remembered configs per type; a loading result must not prune them.

```ts
const { config: resolvedConfig, issues } = resolveVizColumnBindings(
  vizConfig,
  boundColumns,
);
// Existing chart rendering receives resolvedConfig and the unchanged row data.
```

Update the styled-series red test to inspect this real adapter output, still expecting `sum(revenue)` and `profit` with the original style properties. Add a real-provider scatter-X and bubble-size change assertion so equality guards cannot swallow updates. Existing chart wrapper tests retain their string-row-key fixtures.

- [ ] **4. Switch dashboard render, authoring, and save together.** Establish bindings before `useApplyDashboardFiltersToSql`; apply subscription-specific global targets and local ID targets; then execute filtered SQL. Resolve every viewer/editor ingress to an ID runtime config before calling settings or VisualizationContainer. Persist registry/config/targets through normal authoring changes and explicit save, never through viewer load effects. `VizConfigPField`, the DataViz renderer, and local/global field editors must share the owning block's bindings rather than each allocating independent IDs. Preserve public and workspace-published snapshot revision scopes.

A newly registered global filter in all-mode gets a per-chart legacy target that resolves once. Persist its resolved target through the next normal editor save; viewer-only resolution stays in memory. On a query edit, reconcile the old registry first. A surviving supported alias keeps targets, while an unrelated source or opaque rewrite leaves old bound IDs unresolved. Do not rerun name bootstrap for those bound targets.

- [ ] **5. Finish ingress compatibility.** Audit all `VisualizationContainer`, `createDataVizBlock`, config parser, `QueryFilter`, and DataViz block-construction call sites. The old name-shaped data is legal only at explicit legacy/SQL/render boundaries. Ensure shared/Deno Dashboard readers accept the new JSON schema version without importing browser-only helpers. Preserve raw GIS query result types and existing auth behavior. Remove temporary dual runtime config paths once cutover compiles.

- [ ] **6. Run acceptance and commit.** Run every command in the final validation section. All four initial regressions must now be green. Commit scoped paths after review with `refactor(viz): persist and consume stable column bindings`. Use explicit file paths when staging, never `git add -A`; leave branch-specific Supabase config/environment changes unstaged.

## Final validation and acceptance

- [ ] **Four-bug acceptance floor.** Rerun the two focused commands from the spec. All four tests must pass with their original behavioral meaning. Do not weaken key/style/value/row assertions or remove the red checkpoint from history.
- [ ] **Existing baseline plus new coverage.** Run the spec's full focused Vitest baseline, adding `shared/models/queries/QueryColumn`, `shared/models/queries/QueryColumnBindings`, `src/views/DataExplorerApp/useBoundQueryResult`, `src/views/DataExplorerApp/useDataQuery`, `src/views/DataExplorerApp/dataExplorerUrlHydration`, and the new dashboard helper directories. All previously passing 775 tests must still pass; counts may grow or move as suites are adapted, so report actual counts rather than requiring an artificial exact total.
- [ ] **Real DuckDB behavior.**

```sh
pnpm test:executed src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts
pnpm test:executed src/lib/sql/__tests__/dashboardFilterBindings.executed.test.ts
```

- [ ] **Types/build/shared runtime.**

```sh
pnpm exec tsc -b --noEmit
deno check shared
pnpm build
```

Use the repository's configured Deno import maps/task environment. If the environment cannot run a check, report it as blocked verification, not passing. Do not change dependency versions to make a local validation issue disappear.
- [ ] **Changed-file quality.** Run ESLint and oxfmt check on the explicit changed TS/TSX files, `git diff --check`, and the `react-doctor` skill's changed-code workflow. Load `avandar-code-review` and review the resulting diff, especially identity lifetime, migration boundaries, all column-bearing slots, and non-tautological assertions. Fix relevant regressions before claiming completion.
- [ ] **Browser setup and isolation.** Load `playwright-best-practices` and the repo's E2E rules. Run `ava supabase status` first. If this worktree is not switched, run `ava supabase switch`, recheck green status, and only then run any required DB setup. If `ava` is missing, build with `pnpm build:ava-cli`. Never use/reset the shared develop stack. Do not stage switch-generated config/env changes.
- [ ] **Run existing browser flows one at a time, headless.**

```sh
pnpm test:e2e data-explorer-filters.spec.ts
pnpm test:e2e dataviz-pblock-visualizations.spec.ts
pnpm test:e2e save-to-dashboard-renders-in-editor.spec.ts
```

Before adding a browser test, read these existing specs. Extend the save/reopen case only if it does not already verify saved target values after reopening; drive all feature behavior through UI. Keep the local 45-second timeout ceiling. Restore mutated test data in fixtures/finally. Store screenshots in `.temp/refactor-query-column-id/`.
- [ ] **Finish with evidence.** Report test totals, four-bug outcomes, migration/save/reopen results, build/type/lint outcomes, and any blocked checks. No push or merge. If a local Supabase project was switched, leave it active and tell Pablo to run `ava supabase restore` when finished validating; an explicitly authorized merge requires restoring it first.

## Self-review against the approved spec

| Requirement | Planned coverage |
| --- | --- |
| Stable source/projection lifetime, reload and source collision | Task 1 reconciliation/provider tests; Task 3 result matching |
| Selected aggregation and ordering retained | Tasks 1-2; existing real-provider red test and executed SQL |
| Manual WHERE on unselected source columns | Task 2 full catalog, normalize-before-prune, executed row case |
| HAVING aliases and distinct aggregates | Task 2 alias preservation, per-projection emitter, existing/new executed cases |
| Nested filters, typed values, focus, debounce, URL hydration | Task 2 adapted existing suites and hydration gate |
| Supported raw alias edits, opaque/ambiguous matching limits | Task 3 ordered rules and negative behavior tests |
| Every chart slot, renderer names, type memory and stale responses | Tasks 3-4 boundaries; Task 6 live cutover/provider tests |
| Dashboard per-query targets and schema-before-filter lifecycle | Task 5 executed rows/auth/lifecycle; Task 6 integration |
| v4 compatibility, v5 persistence, no viewer autosave | Task 4 historical types; Task 6 migration/runtime/save tests |
| Save/reopen, public snapshots, existing downstream consumers | Task 6 ingress audit, auth tests and final browser/build gates |
| No dependence on deferred features | Explicit scope exclusions; preserved existing unresolved/literal/value behavior |

No remaining product-scope question blocks this plan. Implementation choices are specified above. If code inspection during execution reveals an additional persisted structured-query ingress, add its explicit compatibility adapter and test within Task 2 rather than silently dropping name-based filters.

## Execution handoff

Choose **subagent-driven execution (recommended)** with `subagent-driven-development`, one task at a time and review gates, or **inline execution** with `executing-plans`, checkpointing after Task 2 and before Task 6. Tasks stay sequential because they share the identity contracts. This handoff completes plan preparation; no application implementation has started.
