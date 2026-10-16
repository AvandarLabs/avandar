# AVA-270: column identity refactor specification and assessment

Issue: [AVA-270](https://linear.app/avandar/issue/AVA-270/p81-refactor-introduce-querycolumnid-key-axesseriesfilters-by-id-not)

Inspected: 2026-10-16, starting at commit `5ae60463f` on `develop`.
Working branch: `refactor/query-column-id`.
Status: design approved, including manual-query WHERE/HAVING filters.
Pablo requested a verified red-test checkpoint before implementation on
2026-10-16. Four behavioral regression tests have been added and fail against
the existing implementation. No application code has been changed.

## What the issue is asking for

Give a column an identity independent of its current SQL name, then use that
identity for chart axes, series, and filter targets. Names remain necessary
for labels, row access, and SQL generation, but should not decide whether an
existing selection still refers to the same column.

The confirmed scope includes chart axes and series, dashboard global/local
filters, and manual-query WHERE/HAVING filters. Manual filters are a required
part of this refactor.

The ticket's opening instruction is stale: `QueryColumnId` already exists as
`UUID<"QueryColumn">`, exposed as `QueryColumn.Id`. Structured queries already
key `orderByColumn` and `aggregations` by that ID. The work is to make identity
stable and carry it through the consumers still using names.

The issue has no comments or attachments. Its description says it blocks P8.4,
P8.5, and P8.9, although Linear's formal `blocks` relation is empty.

## Current behavior and affected code

Paths below are relative to the repository root.

| Area | Current behavior and required change |
| --- | --- |
| Column creation | Construction and SQL parsing generate fresh random IDs. Preserve identity across metadata reloads, SQL/form synchronization, and URL restoration. Keep distinct projections distinguishable. |
| Result metadata | Columns carry only a name and data type. Attach identity using query context, with a mapping to the actual SQL/row name. |
| Chart models | Axis and series keys are strings. Migrate all column-bearing slots across bar, line, area, radar, scatter, bubble, pie, and funnel. Table has no selected axes. |
| Reconciliation | Hydration compares names, sometimes ignoring case, then prunes or reseeds selections. Compare identities and preserve settings when a column changes name. |
| Settings and rendering | Pickers use names as values; chart libraries use those strings to read rows. Use ID-valued options with readable labels and resolve row keys at one rendering boundary. |
| Explorer state | Several representations of a query are rebuilt independently. Carry consistent identities through actions, remembered chart configs, and schema comparisons. |
| Dashboard filters | Global and local filters store a SQL column name. Store target identities and resolve each subscribed chart's output name before generating SQL. |
| Saved dashboards | Saved blocks carry raw SQL and chart config without a binding registry. Persist bindings and migrate existing AvaPage version 4 JSON safely. |
| Manual filters | Migrate WHERE/HAVING rules, type lookups, controls, pruning, SQL parsing, and SQL generation to stable IDs. Preserve the distinction between source predicates and aggregate/grouped predicates. |

Main source locations:

- Identity: `shared/models/queries/QueryColumn/QueryColumnModule.ts`
  and `shared/models/queries/QueryResult/QueryResult.types.ts`.
- SQL parsing: `shared/models/queries/StructuredQuery/sqlToStructuredQuery/`.
- Result conversion: `src/clients/DuckDbClient/duckDbArrowResults.ts`.
- Chart configs, series, and hydration: `shared/models/vizs/`.
- Settings: `src/components/VisualizationContainer/VizSettingsForm/`.
- Chart wrappers: `src/lib/ui/viz/`.
- Explorer state: `src/views/DataExplorerApp/DataExplorerStateManager/`.
- Dashboard binding models: `DataVizFilters.ts`, `FilterPBlock.tsx`, and
  `DashboardFilterStateManager.ts` under `src/views/DashboardApp/`.
- Dashboard SQL: `src/views/DashboardApp/DashboardFilterStateManager/`.
- Saving: `src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/`.
- JSON migration: `src/views/DashboardApp/AvaPage/migrations/`.
- Manual filters: `shared/models/queries/StructuredQuery/QueryFilter.types.ts`.
- Filter validation, pruning, and SQL rendering: `QueryFilterValidation/`,
  `pruneFilterColumns/`, `renderFilterGroup/`, and `renderFilterRule/` under
  `shared/models/queries/StructuredQuery/`.
- Clause emission: `structuredQueryToSql/applyFilters.ts` and
  `structuredQueryToSql/applyHaving/` under that same query directory.
- Manual filter controls and tree conversion:
  `src/views/DataExplorerApp/QueryForm/QueryFiltersField/`.
- Source-column loading and URL restoration:
  `src/views/DataExplorerApp/useQueryColumnsForDataSource.ts` and
  `src/views/DataExplorerApp/useDataExplorerUrlSync.ts`.

Important distinction: a filter's own `id` or `filterId` identifies the filter
control and its viewer value. It is not a column ID. Several different filters
can target the same column and must retain independent state.

## Why this helps

Today a series targeting `revenue` can be removed when the same selected
column becomes `sum(revenue)`. If other series survive, that series disappears;
if all disappear, default seeding may create a replacement without its color,
label, or other custom settings. Conversely, a different source returning a
column also called `revenue` can be mistaken for the original selection.
The series-loss case is now reproduced through the real Explorer state
manager. The other verified failures are listed below. These are automated
state/component and executed-SQL reproductions, not manual browser runs.

Stable bindings let the application distinguish a renamed column, a removed
column, and an unrelated column with the same label. They provide a common
place to obtain the column's current name and type. This enables reliable
re-querying and saving, and gives the dependent issues a sound reference to
work with.

| Follow-up | What AVA-270 enables | Work that remains in that issue |
| --- | --- | --- |
| [AVA-273 / P8.4](https://linear.app/avandar/issue/AVA-273) | Resolve a filter target to its actual data type. | Emit correct numeric, boolean, and date literals. |
| [AVA-274 / P8.5](https://linear.app/avandar/issue/AVA-274) | Keep a target stable while a local filter control remounts. | Persist or stabilize the viewer's selected filter value. |
| [AVA-278 / P8.9](https://linear.app/avandar/issue/AVA-278) | Recognize an unresolved binding without confusing it with a rename. | Explain missing columns and let the user remap them. |

IDs alone do not recover lineage from arbitrary SQL. They also do not restore
local `useState` after unmount, or implement a remapping interface.

## Approved design

Pablo approved this design under the Superpowers brainstorming workflow.

| Approach | Trade-off | Assessment |
| --- | --- | --- |
| Change string types or derive IDs from names alone | Small diff, but renames and same-name collisions remain. Random IDs per execution also lose bindings. | Does not satisfy the issue. |
| Stable binding registry at query/application boundaries | Explicit identity lifetime, ID-based consumers, and name resolution only at SQL/render boundaries. Requires persistence compatibility. | Recommended. |
| General SQL lineage engine for every expression and query shape | Could recognize more arbitrary rewrites, but requires a much larger parser and semantic model. | Beyond this issue. |

### Identity lifetime

Reuse `QueryColumn.Id`. Preserve a selected projection's ID when its source
metadata or aggregation changes. Separate projections over the same source
column must still be able to have distinct IDs. Do not key solely by name,
array position, or source-column ID without projection context.

At the boundary with SQL execution, associate the actual result name and type
with the projection's ID. The low-level Arrow converter cannot establish
source lineage by itself. SQL/form synchronization must reconcile existing
projections instead of discarding their identities on each parse.

For raw SQL, persist query-scoped result bindings and reuse them when the
projection can be matched unambiguously. A supported alias-only change should
preserve identity when the expression/source establishes that it is the same
projection. When SQL is opaque to the parser, do not promise arbitrary rename
recovery or infer identity from ordinal position. The implementation plan must
define the supported matching rules and keep ambiguous results unresolved.

### Consumers and saved data

Use IDs in chart configs and picker values. Resolve them to current row keys
in a shared adapter near `VisualizationContainer`, preserving chart settings,
labels, date handling, and mixed-series behavior. Avoid independently
implementing resolution in each renderer.

Persist result-binding metadata with a DataViz block so saving and reopening
does not create unrelated IDs. Use the existing AvaPage JSON migrator for
structural compatibility and a separate runtime resolution step where live
result columns are required. A synchronous migration cannot look up a schema
it does not have. Legacy name matching must be unique; ambiguous matches must
not silently bind to the first candidate. Keep the migration idempotent and
avoid turning a load into an unsolicited persisted edit.

The registry must be available before applying dashboard filters. The current
flow constructs filtered SQL before executing the query, so trying to obtain
the registry only from that filtered result creates a dependency cycle.
Persisted bindings or unfiltered schema discovery must break that cycle.

### Filter scope

Pablo confirmed that dashboard global/local filters and the newer manual-query
WHERE/HAVING filters are all in scope. The shared binding model must distinguish
what each predicate addresses.

| Filter context | Binding and SQL contract |
| --- | --- |
| Manual WHERE | Resolve an ID against the current source-column catalog, including columns absent from SELECT. Use the source column's current SQL name and type before grouping. |
| Manual HAVING | Resolve an ID against the intended aggregate or grouped-column binding. Use the current supported aggregate expression or alias and its result type after grouping. |
| Dashboard global/local | Resolve an output binding within each target chart's query. Apply it to the wrapper query over that chart's output. |

Source-column bindings and selected projections may refer to the same physical
column but represent different targets. Keep a source catalog independent of
`queryColumns`, which contains selected projections. Removing a column from
SELECT must not invalidate a WHERE rule while that source column still exists.
Changing a selected projection's aggregation must not retarget a WHERE rule to
the aggregated value. Distinct aggregate projections over the same source
must remain distinguishable for HAVING.

### Manual-filter contract

Use `QueryColumn.Id` for the rule's column binding and retain the existing
rule/group node IDs for editing identity. Bindings come from the appropriate
source or projection catalog for the clause. Names remain presentation and SQL
boundary data. ID membership must drive pruning, so a source rename preserves
the rule and an unrelated same-named column does not inherit it.

Key live column-type lookups and query-builder field values by binding ID,
while displaying current column names. Preserve nested AND/OR grouping,
operators, values, match-case state, debounced commits, and input focus. The
existing tests for these behaviors should be adapted and retained rather than
duplicated. Validation and SQL rendering must resolve the same binding and use
its live type with the existing type-precedence behavior.

SQL-to-form parsing must resolve WHERE references against source metadata and
HAVING references against aggregate/grouped metadata. A supported aggregate
expression and its alias must resolve to the same intended target. Form-to-SQL
generation resolves those IDs back to the correct clause-specific expression;
an ID must never be emitted as a SQL identifier. Continue reporting unsupported
or ambiguous SQL through the existing partial-mapping warnings. This refactor
does not add support for new SQL constructs or operators.

Normalize legacy name-based filter trees at their ingress boundary before
ID-based validation or pruning. Resolve names only within the correct source
or projection scope, preserving node IDs, grouping, values, and match-case
state. Missing targets follow the existing pruning/reporting path; ambiguous
matches remain unresolved and are reported rather than attached arbitrarily.
An already-ID-based rule must never fall back to a different column by name.
URL restoration currently reconstructs filters from raw SQL, so verify that
path as well as any existing ingress that accepts structured filter trees.
No new filter persistence channel or database schema change is proposed.

### Dashboard-filter contract

Global filters currently broadcast a name to all subscribed charts. To retain
that behavior with query-scoped IDs, each subscribed chart needs its own target
binding. Resolve an existing name-based subscription once against that chart's
output schema and persist the mapping. Do not assume two unrelated query
results can share one projection UUID simply because both contain `region`.
New and changed queries require the same binding resolution boundary. The
column-selection UX is tracked separately in AVA-272.

The dashboard typed-literal, remount-state, and missing-column-remapping
features remain in their linked follow-up issues. Preserving the manual
filter system's existing typed-value semantics is required here.

## Existing coverage worth keeping

| Coverage | Evidence and decision |
| --- | --- |
| Chart reconciliation | Tests beside the result reconciliation, name resolution, and hydration helpers cover defaults, stale keys, case fallback, and re-query. Extend identity cases without duplicating defaults. |
| Conversion and memory | Viz conversion, the real-provider Explorer memory suite, and DataViz block-state tests cover settings preservation. Adapt their fixtures. |
| Rendering and forms | Renderer-prop, series-aware, pair, pie/funnel, and descriptor-form tests cover styling and controls. Add focused binding-boundary cases. |
| Filter values and SQL | Dashboard SQL wrapper, manual operator/value/validation/rendering, and filter round-trip suites provide substantial coverage. Keep it. |
| Executed SQL | The structured-query executed suite checks actual rows in in-memory DuckDB. Reuse its harness for identity-to-SQL regressions. |
| Save and migration | Block creation and AvaPage V1-V4 tests cover current serialization. Add binding persistence and legacy compatibility. |
| Browser flow | Existing filter, dashboard visualization, and save-to-dashboard specs cover user flows. Run individually; extend save/reopen coverage only where the new format requires it. |

Useful existing test anchors:

- `shared/models/vizs/applyVizConfigFromQueryResult/`
- `shared/models/vizs/VizConfig/VizConfigs.convertVizConfig.test.ts`
- `src/views/DataExplorerApp/DataExplorerStateManager/__tests__/`
- `src/lib/ui/viz/SeriesRenderer.props.test.tsx`
- `shared/models/queries/StructuredQuery/filterRoundTrip.test.ts`
- `shared/models/queries/StructuredQuery/pruneFilterColumns/`
- `src/views/DataExplorerApp/QueryForm/QueryFiltersField/`
- `src/views/DataExplorerApp/dataExplorerUrlHydration/`
- `src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts`
- `tests/e2e/data-explorer-filters.spec.ts`
- `tests/e2e/dataviz-pblock-visualizations.spec.ts`
- `tests/e2e/save-to-dashboard-renders-in-editor.spec.ts`

Two coverage limitations matter. The older
`DataExplorerStateManager.test.ts` defines a local imitation of the sync reducer
and calls the production reconciliation helper from it. It does not verify
the actual action or its equality guards. Use the real provider pattern from
the newer chart-memory suite instead. Also, `DataVizPBlock.test.tsx` mocks
`VisualizationContainer`; its chart-type assertions do not prove that an ID
resolves to the correct row values.

## Verified current bugs and required green acceptance

These bugs are in the approved AVA-270 scope itself. They do not depend on
AVA-273's dashboard literal typing, AVA-274's remount state, or AVA-278's
missing-column UI. All four new tests are ordinary enabled tests, deliberately
red. None uses `it.fails`, `skip`, or an assertion that merely checks an ID.

| Bug | Verified current failure | Required behavior after the refactor |
| --- | --- | --- |
| Styled series disappears on aggregation change | Changing revenue to SUM removes its custom line series while the profit bar survives. | Keep both series bound to the correct outputs and retain the revenue label, color, mark, and stroke width. |
| Reconstructed selected columns lose aggregation | Rebuilding a wrapper for the same source column changes generated SQL from SUM(revenue) to plain revenue. | Preserve the configured aggregate SQL when the column picker supplies reconstructed metadata. |
| Manual WHERE control keeps an obsolete target name | After entering Butte, renaming the same source column from Admin2 to County leaves the selector showing Admin2. | Show County for the same target while retaining the predicate value and operator. |
| HAVING alias breaks SQL/form round trip | Valid SUM(cnt) AS total with HAVING total > 5 executes before parsing, but regenerated SQL raises a DuckDB binder error for total. | The round trip returns the same North / total 7 row with the same output alias and WHERE/HAVING semantics. |

The first two tests drive the real `DataExplorerStateManager.Provider` and its
actions. They do not reproduce the reducer in test code. The manual-filter
test edits the real control, commits its value, and then supplies renamed
metadata with the original column identities. It also reorders the available
columns, so choosing the first option cannot satisfy the assertion. The SQL
test executes both the original and regenerated SQL against real in-memory
DuckDB data. The original succeeds and the parser reports a full mapping;
the failure is specifically the regenerated query, not test setup.

Test locations:

- `src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.columnIdentity.test.tsx`
- `src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx`
- `src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts`

Focused red/green commands:

```sh
pnpm exec vitest run \
  src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.columnIdentity.test.tsx \
  src/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField.test.tsx \
  --reporter=verbose

pnpm test:executed \
  src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts \
  --reporter=verbose
```

Acceptance requires all four new tests to turn green and the existing focused
baseline below to remain green. The complete selected coverage is now 779
tests across 61 files. Adapt fixture construction when the column-binding
representation changes, but preserve these behavioral assertions. Do not
weaken the expected values, disable a test, or treat an expected failure as
passing. These tests establish the current-bug acceptance floor; they do not
replace persistence/migration checks required by the new representation.

The chart regression also checks the target keys, so merely retaining a stale
`revenue` key cannot make it green. Once configs store IDs, assert the same
resolved output targets (`sum(revenue)` and `profit`) through the rendering
adapter, alongside the existing style assertions. Independent review caught
and closed this gap before the checkpoint.

## Additional regression coverage during implementation

Beyond the four implemented reproductions above, these are candidate cases
to assess while implementing. Extend existing coverage only where needed.
Each has an observable failure beyond the existence or type of an ID.

| Priority | Behavior to prove | Suitable test boundary |
| --- | --- | --- |
| 1 | A styled series keeps its color, label, mark, and correct values when the same projection is renamed or its aggregation changes. | Hydration plus the shared render adapter; cover each distinct key shape with parameterized fixtures. |
| 1 | An unrelated column with the old display name does not inherit an existing binding. Reordering or adding columns does not move a binding. | Binding reconciliation plus actual Explorer actions. |
| 1 | A metadata reload and SQL/form round trip preserve selected columns, ordering, and aggregation behavior. | Real Explorer provider and parser/column reconstruction boundary. Do not merely compare UUID strings. |
| 1 | Saving, serializing, reopening, and executing a DataViz block resolve the same configured columns and preserve styling. | Existing save/block/migration suites; one browser save/reopen flow if needed. |
| 1 | A legacy name-based saved chart/filter remains usable after migration. Unique case fallback works; ambiguous names never select an arbitrary target; loading twice is stable. | Migration plus runtime binding resolution, rather than a migration snapshot alone. |
| 1 | A global filter targets the intended output in two subscribed charts even when the charts use different aliases. Local filters stay confined to their block. | Filter binding plus SQL executed against a small in-memory DuckDB fixture, asserting returned rows. |
| 2 | Changes to scatter X and bubble size bindings reach state and rendering even when the Y binding is unchanged. | Real state-manager actions plus render adapter. Current equality checks compare only series `key`, so this refactor must account for every column-bearing field. |
| 2 | A selection survives an in-flight empty schema and identical refetches do not replace user settings. | Result-sync/provider integration. Distinguish loading from a genuinely changed result. |
| 1 | WHERE on a non-selected source column returns the same intended rows after a source rename or SELECT change. | Executed SQL against a small fixture with an unrelated same-named column available to expose incorrect rebinding. |
| 1 | HAVING returns the intended groups after an aggregate alias changes, while a WHERE predicate on the same source still filters input rows. | Executed SQL with values that produce different results for WHERE and HAVING; include distinct aggregates over the same source where supported. |
| 1 | SQL/form and URL round trips preserve the meaning of nested manual filters and their aggregate targets. | Parser/emitter and existing hydration suites, with returned-row assertions for representative queries. |
| 1 | Renaming a source retains its manual filter; replacing that source with an unrelated same-named column reports/removes the stale rule. | ID-based pruning plus real form/state integration. Preserve surviving rule values and node identity. |

Do not add tests that only assert that an ID exists, is a string/UUID, or is
copied to another object. Do not duplicate the existing operator/style/default
matrices. The migration changes the representation, so behavior assertions
should remain recognizable while fixtures change.

## Verified baseline and execution readiness

Both command groups ran successfully during the initial assessment, before
test edits. They were rerun after adding the four regressions:

| Command group | Original baseline | Red checkpoint |
| --- | --- | --- |
| Focused Vitest model, form, renderer, state, dashboard, filter, and migration suites | 59 files, 765 passed | 60 files, 765 passed, 3 new tests failed |
| Executed structured-query SQL suite | 1 file, 10 passed | 1 file, 10 passed, 1 new test failed |
| Total | 775 passed | 775 passed, 4 expected failures |

`pnpm exec tsc -b --noEmit`, ESLint on the three changed test files, formatter
checks, and `git diff --check` pass. The red test outcomes are behavioral
assertion failures, not compilation or import failures.

Focused baseline command:

```sh
pnpm exec vitest run \
  shared/models/vizs \
  shared/models/queries/StructuredQuery \
  src/components/VisualizationContainer \
  src/lib/ui/viz \
  src/views/DataExplorerApp/DataExplorerStateManager \
  src/views/DataExplorerApp/QueryColumnMultiSelect/remapColumnsByBaseId \
  src/views/DataExplorerApp/QueryForm/QueryFiltersField \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock \
  src/views/DashboardApp/AvaPage/pblocks/FilterPBlock \
  src/views/DashboardApp/DashboardFilterStateManager \
  src/views/DashboardApp/AvaPage/migrations \
  src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock \
  --reporter=dot
```

Executed SQL baseline command:

```sh
pnpm test:executed \
  src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts \
  --reporter=dot
```

No E2E tests or build were run. No Supabase stack was started, switched, or
modified. The executed suite uses an in-memory DuckDB database.
Worktree setup reported an `arrow2csv` bin-link warning, but both initial
baseline runs exited successfully. No dependency versions were changed.

After this requested red checkpoint, use Superpowers writing-plans to turn
the approved scope into implementation tasks. Start with the identity lifetime and
observable rename/source-collision regressions, then wire chart consumers,
manual WHERE/HAVING parsing and generation, dashboard filters, and saved data.
Include the source-only WHERE and aggregate HAVING executed regressions in the
required implementation checks. Validate TypeScript/Deno consumers, affected lint and React diagnostics,
and the relevant E2E files one at a time. Follow the isolated local Supabase
workflow before any E2E setup that needs a database. No database schema change
is currently proposed.

Scope decision resolved: manual WHERE/HAVING filters are included alongside
dashboard global/local filters. There are no remaining scope questions.
The stable-binding design is approved. The application implementation remains
pending; the next step must make the verified red tests green.
