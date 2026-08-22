# Manual query filters, correctness and usability - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (designed with Claude)
**Date:** 2026-08-17
**Findings this responds to:**
`docs/superpowers/2026-08-17-manual-query-filters-review.md` (F1 to F16, U1 to
U19, M1 to M14)
**Related code:**
`src/views/DataExplorerApp/QueryForm/QueryFiltersField/`,
`src/views/DataExplorerApp/QueryForm/ManualQueryForm/`,
`src/views/DataExplorerApp/QueryColumnMultiSelect/`,
`src/views/DataExplorerApp/DataExplorerStateManager/`,
`shared/models/queries/StructuredQuery/` (`QueryFilter.types.ts`,
`structuredQueryToSql/applyFilters.ts`, `structuredQueryToSql/applyHaving.ts`,
`sqlToStructuredQuery/parseFilterClauses.ts`)

## 1. Scope

### 1.1 What this delivers

A filter panel whose predicates are correct, whose state is trustworthy, and
which a person can read and type into. **One delivery, not phased.** The work is
ordered by root cause (section 4), because that is the order in which the fixes
unblock each other, but nothing here ships on its own:

1. **R1 node identity** and the commit model, which is what makes the panel
   typeable and therefore testable by hand at all.
2. **R2 combinator display**, so the panel states its own logic.
3. **R3 the operator catalog**: type-aware operators, one SQL renderer for
   `WHERE` and `HAVING`, array-encoded list values, substring functions instead of
   patterns, typed literals, and SQL round-trip parity.
4. **R4 the validity gate** and every error surface.
5. **R5 column scope**: filters over any dataset column, with reconciliation when
   the data source changes.
6. **The layout redesign**: rule row, hierarchy, dropdowns, scroll ownership,
   in both hosts.
7. **The test net**: unit, round-trip, component regression, and the row-count
   end-to-end battery.

### 1.2 What this deliberately does not deliver

- **HAVING / aggregate filters** (F10, M14). The model already carries a
  `having: QueryFilterGroup` and this delivery renders it through the same
  renderer, but exposing a UI for it needs its own surface and design pass.
- **Relative date operators** (M11, "in the last N days", "this month"). They
  need a value shape beyond scalar-or-array (`{n, unit}`), their own editor, and
  their own round-trip rules, and they make a saved query non-deterministic over
  time, which interacts with dashboard snapshots. Worth doing next, on its own.
- **Distinct-value picker for `in`** (M12). Needs a `select distinct` per column
  plus caching. The chip editor built here is the foundation for it.
- **Epoch-millisecond date columns** (F9). The real fix belongs in CSV type
  detection (detect epoch millis, store as `timestamp`) rather than teaching the
  filter UI to convert. Separate spec, separate blast radius.
- **Grid filters versus query filters** (F16). The AG Grid per-column funnels
  stay functional and unreconciled for now. Deciding their fate is a product
  question, section 13.
- **Result column ordering** (F14) and the import-page label collision (U19).
  Unrelated to filters, tracked separately.

## 2. Goals and non-goals

**Goals**

1. Every predicate the UI can express produces SQL that means what the label
   says, verified by row counts against a known fixture.
2. A person can type a multi-character value, read which column a rule targets,
   and see whether rules are ANDed or ORed, without hovering, scrolling, or
   guessing.
3. The grid never disagrees with the panel. What is shown is what is applied,
   and anything not applied is named.
4. Every failure has a surface. No empty grid without an explanation.
5. Whatever the form generates, the form can read back. No operator that makes
   our own SQL look unrepresentable in SQL mode.

**Non-goals**

- Reimplementing the query-builder tree. `react-querybuilder` 8.x stays; most of
  what we need is configuration we are not currently passing.
- Changing the `StructuredQuery` model version. All changes here are additive and
  read-tolerant.
- Filter capability parity with a full BI tool (window functions, subquery `IN`,
  cross-column comparisons).

## 3. Decisions

| #   | Decision                                                                                                                                                 | Rationale                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Filters may reference any column in the dataset**, not only the columns selected for display                                                           | Removes F7 (a rule whose column was deselected kept filtering invisibly) and the "add columns first" gate. Matches what people expect from a query builder: what you filter on and what you display are separate choices |
| D2  | **Text comparison is case-insensitive by default**, with a per-rule `Match case` toggle                                                                  | The reported expectation. Applies uniformly to `=`, `!=`, `in`, `contains`, `starts with`, `ends with` and their negations, so there is one rule to learn instead of per-operator trivia                                 |
| D3  | **Debounced execution, gated on rule completeness and validity**                                                                                         | Keeps the live feel while killing the query-per-keystroke, the `col = ''` query fired the instant a rule is added, and the empty-grid flash                                                                              |
| D4  | **Custom rule row rendered inside react-querybuilder**                                                                                                   | The library keeps owning tree logic (add, remove, nest, combinators, SQL parse hooks). We replace only the rendered controls. Avoids reimplementing grouping while giving full control of layout                         |
| D5  | List values (`in`, `not_in`, `between`) are **arrays in the model**, with a tolerant reader that still accepts today's comma-joined strings              | Fixes F4 without a model version bump. `react-querybuilder`'s `listsAsArrays` produces arrays natively                                                                                                                   |
| D6  | Legacy `like` / `not_like` operator ids are **kept and rendered exactly as today** (raw pattern, case-sensitive), and are never produced by the UI again | Saved queries and dashboards keep their current meaning. New rules use explicit `contains` / `starts_with` / `ends_with`. No migration, no silent re-interpretation                                                      |
| D7  | One SQL renderer serves both `WHERE` and `HAVING`                                                                                                        | Today `applyFilters` (knex) and `applyHaving` (string building) implement operators twice, which is exactly how F15-style drift happens                                                                                  |
| D8  | Every operator in the catalog **must round-trip** through `sqlToStructuredQuery`                                                                         | Otherwise adding operators makes SQL mode flag our own generated SQL as an approximation. Enforced by a table-driven test over the catalog, not by discipline                                                            |
| D9  | Incomplete or invalid rules are **excluded from the query and named in the UI**, never silently dropped and never run                                    | The current mix (drop `between`, run `= ''`, run `= NULL`, or leave stale results) is the trust bug behind F5 and F8                                                                                                     |

## 4. Root causes

Thirty-five findings, five causes. This is the map the delivery order in
section 10 follows.

**R1. Node identity is regenerated on every change.**
`QueryFiltersField` derives the library's tree from our model with
`useMemo(() => _convertGroupFromInternal(value), [value])`, and
`_convertRuleFromInternal` produces a fresh object with no `id`. Every edit hands
`QueryBuilder` a tree of new nodes, React unmounts the focused input, and the
next keystroke lands on `<body>`.
Causes F2 (one character per click), and makes F12 worse.

**R2. Combinator values are cased differently from the library's options.**
Our tree stores `AND` / `OR`; the library's default combinator options are keyed
`and` / `or`. The Mantine `Select` finds no matching option, so it renders an
empty string forever, at every nesting level.
Causes F3.

**R3. Operators are a flat, type-blind list translated by hand into two
renderers.**
`_OPERATOR_TO_INTERNAL` collapses `contains`, `beginsWith` and `endsWith` onto a
single `like`, and `notBetween` onto `between`. `applyFilters` then passes the
raw value to `LIKE` with no wildcards, splits list values on commas, and binds
everything as a string.
Causes F1, F4, F11, F15, and most of M1 to M14 being absent.

**R4. There is no gate between "the user edited a rule" and "run SQL".**
`onChange` goes straight to `setFilters`, which regenerates raw SQL in
`_applyQueryChange`, which changes the `useDataQuery` key, which runs DuckDB.
Nothing asks whether the rule is complete or type-valid first. Note that the
error is already captured: `DataExplorerApp` copies `dataQuery.error` into
`state.lastQueryError`, but the only consumer is the AI chat panel's
`RegenerateErrorBanner`, so with the chat closed the user sees nothing.
Causes F5, F8, F12, and the `= NULL` and `col = ''` artifacts.

**R5. Filters are keyed to the displayed columns.**
`QueryFiltersField` receives `columns={queryColumns}`, so the field list is the
SELECT list. Deselect a column and its rule survives with an empty field but a
live predicate; switch data source and the whole tree points at a table that
lacks those columns.
Causes F6, F7, U17.

## 5. The filter model: operators and values

### 5.1 Operator catalog

A single exported catalog in
`shared/models/queries/StructuredQuery/QueryFilterOperator.ts` is the source of
truth for: the internal id, the user-visible label, which `AvaDataType` values it
applies to, the value shape it needs, and how it renders to SQL. The UI derives
its operator dropdown from it; the renderer derives its SQL from it; the SQL
parser is tested against it.

Type facets come from `AvaDataType` (already `varchar`, `bigint`, `double`,
`time`, `date`, `timestamp`, `boolean`) via the existing
`AvaDataType.isText` / `isNumeric` / `isTemporal` helpers. Both branches of
`QueryColumnRead["baseColumn"]` (`DatasetColumnRead` and
`ConceptAttributeModel["Read"]`) expose `dataType`, so no new plumbing is needed
to know a column's type.

In the SQL column, `ci(x)` means `lower(x)` when the rule is case-insensitive
(the default per D2) and plain `x` when `Match case` is on. Temporal values are
rendered as `CAST(:v AS DATE)` or `CAST(:v AS TIMESTAMP)`, numeric values as bare
numbers, and text as quoted strings (see "Typed literals" below).

| Internal id                    | Label                              | Types             | Value            | SQL                                                                 |
| ------------------------------ | ---------------------------------- | ----------------- | ---------------- | ------------------------------------------------------------------- |
| `=`                            | is / equals (temporal: `on`)       | all               | scalar           | text: `ci(col) = ci(:v)`; other: `col = :v`                         |
| `!=`                           | is not (temporal: `not on`)        | all               | scalar           | text: `ci(col) <> ci(:v)`; other: `col <> :v`                       |
| `>`                            | greater than (temporal: `after`)   | numeric, temporal | scalar           | `col > :v`                                                          |
| `>=`                           | at least (temporal: `on or after`) | numeric, temporal | scalar           | `col >= :v`                                                         |
| `<`                            | less than (temporal: `before`)     | numeric, temporal | scalar           | `col < :v`                                                          |
| `<=`                           | at most (temporal: `on or before`) | numeric, temporal | scalar           | `col <= :v`                                                         |
| `contains`                     | contains                           | text              | scalar           | `contains(ci(col), ci(:v))`                                         |
| `not_contains`                 | does not contain                   | text              | scalar           | `NOT contains(ci(col), ci(:v))`                                     |
| `starts_with`                  | starts with                        | text              | scalar           | `starts_with(ci(col), ci(:v))`                                      |
| `not_starts_with`              | does not start with                | text              | scalar           | `NOT starts_with(ci(col), ci(:v))`                                  |
| `ends_with`                    | ends with                          | text              | scalar           | `ends_with(ci(col), ci(:v))`                                        |
| `not_ends_with`                | does not end with                  | text              | scalar           | `NOT ends_with(ci(col), ci(:v))`                                    |
| `in`                           | is any of                          | all               | array, 1+        | text: `ci(col) IN (ci(:a), ...)`; other: `col IN (:a, ...)`         |
| `not_in`                       | is none of                         | all               | array, 1+        | text: `ci(col) NOT IN (ci(:a), ...)`; other: `col NOT IN (:a, ...)` |
| `between`                      | is between                         | numeric, temporal | array, exactly 2 | `col BETWEEN :a AND :b`                                             |
| `not_between`                  | is not between                     | numeric, temporal | array, exactly 2 | `col NOT BETWEEN :a AND :b`                                         |
| `is_null`                      | has no value                       | all               | none             | `col IS NULL`                                                       |
| `is_not_null`                  | has a value                        | all               | none             | `col IS NOT NULL`                                                   |
| `is_blank`                     | is blank                           | text              | none             | `coalesce(trim(col), '') = ''`                                      |
| `is_not_blank`                 | is not blank                       | text              | none             | `coalesce(trim(col), '') <> ''`                                     |
| `is_true`                      | is true                            | boolean           | none             | `col IS TRUE`                                                       |
| `is_false`                     | is false                           | boolean           | none             | `col IS FALSE`                                                      |
| `matches_regex`                | matches regex                      | text              | scalar           | `regexp_matches(col, :v)`                                           |
| `not_matches_regex`            | does not match regex               | text              | scalar           | `NOT regexp_matches(col, :v)`                                       |
| `like` (legacy, read-only)     | (not offered)                      | text              | scalar           | `col LIKE :v`                                                       |
| `not_like` (legacy, read-only) | (not offered)                      | text              | scalar           | `col NOT LIKE :v`                                                   |

The `Match case` toggle lives on the rule as `matchCase?: boolean`, absent
meaning case-insensitive, and is rendered only for text columns. It does not
apply to `matches_regex`: case sensitivity there belongs in the pattern itself
(DuckDB supports the inline `(?i)` flag), and the toggle is hidden for those two
operators.

All of these are documented DuckDB behavior: `contains`, `starts_with`,
`ends_with`, `lower`, `trim` on the text-functions page; `regexp_matches(string,
pattern)` on the regular expressions page; `LIKE` and `ILIKE` on the
pattern-matching page.

### 5.1.1 Why substring functions instead of `ILIKE` patterns

The obvious rendering for `contains` is `col ILIKE '%value%'`, with the user's
own `%` and `_` escaped and an `ESCAPE` clause. That was the first design, and
`node-sql-parser` (the parser behind `sqlToStructuredQuery`, run with
`database: "postgresql"`) rejects it, which would break D8 for every text
operator. Verified against the installed `node-sql-parser` 5.x:

| SQL form                                                                    | Parses                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------- |
| `"c" ILIKE '%x%'`                                                           | yes                                                      |
| `"c" NOT ILIKE '%x%'`                                                       | yes                                                      |
| `"c" ILIKE '%x!%y%' ESCAPE '!'`                                             | yes                                                      |
| `"c" ILIKE '%x%' ESCAPE '\'`                                                | **no** (a backslash-only string literal fails the lexer) |
| `"c" GLOB 'x*'`                                                             | **no** (operator unknown to the grammar)                 |
| `contains("c", 'x')`, `starts_with`, `ends_with`, with or without `lower()` | yes                                                      |
| `NOT contains("c", 'x')`                                                    | yes (`unary_expr` wrapping a `function`)                 |
| `regexp_matches("c", '^x')`, `NOT regexp_matches(...)`                      | yes                                                      |
| `"c" IS TRUE`, `"c" IS FALSE`, `"c" IS NOT TRUE`                            | yes (`IS` with a `bool` right side)                      |
| `"c" NOT BETWEEN 1 AND 2`                                                   | yes                                                      |
| `lower("c") IN (lower('a'))`, `NOT IN`                                      | yes                                                      |
| `coalesce(trim("c"), '') = ''` and `<> ''`                                  | yes                                                      |
| `"c" > CAST('2020-01-01' AS DATE)`, `AS TIMESTAMP`, `DATE '2020-01-01'`     | yes                                                      |
| `"c" > 1000` (unquoted number)                                              | yes                                                      |

Two consequences, both improvements:

1. **The substring functions remove the escaping problem instead of managing
   it.** With `contains(col, '50%')` the `%` is a literal character, so the
   second half of F1 (a user value containing `%` silently acting as a wildcard)
   cannot happen, and there is no escape character to double-escape or to leak
   into the value.
2. **`GLOB` is dropped from the catalog.** It cannot round-trip, and
   `matches_regex` covers the same need.

The cost is that the SQL tab shows `contains(lower("Admin2"), lower('san'))`
rather than `"Admin2" ILIKE '%san%'`. Acceptable: it is still readable, and it is
honest about the case folding, which the `ILIKE` form hides.

Users who genuinely want wildcard patterns have `matches_regex`, and existing
saved rules that were authored as raw `LIKE` patterns keep working through the
legacy operator ids (D6).

**Typed literals.** Numeric values bind as bare numbers, temporal values as
`CAST(:v AS DATE)` or `AS TIMESTAMP` per the column's type, text as quoted
strings. This is F11.

The renderer learns the column's type from the rule itself
(`columnDataType`, see 5.2), with an optional
`columnTypes: Record<string, AvaDataType.T>` override for callers that have live
dataset columns to hand. Precedence is `columnTypes[name] ?? rule.columnDataType
?? text`, and the text fallback is exactly today's behavior (quoted string,
implicit cast), so nothing regresses for rules saved before this change.

Storing the type on the rule matters because of D1: a filter may reference a
column that is not in `queryColumns`, so `structuredQueryToSql` cannot derive
every type from the query it is given, and threading a dataset-wide map through
`runStructuredQuery`, `_regenerateRawSqlFromQuery`, and both dashboard callers
would put loading state in a reducer. A self-describing rule keeps the renderer
pure and keeps saved queries renderable even if a dataset's column list later
changes. The `columnTypes` override exists so a deliberate type change on a
column (`DatasetColumn.dataType` is user-editable) wins over the stale hint.

### 5.2 Value encoding

`QueryFilterRule` gains three optional fields and tightens one contract:

```ts
type QueryFilterRule = {
  type: "rule";
  /** Stable identity, generated on creation, persisted. See 6.1. */
  id?: string;
  columnName: string;
  /**
   * The column's `AvaDataType` at authoring time, used to render typed
   * literals and to pick the operator list. A live `columnTypes` map overrides
   * it; absent both, the renderer treats the column as text.
   */
  columnDataType?: AvaDataType.T;
  operator: QueryFilterOperator;
  /**
   * Scalar operators: a primitive. `in` / `not_in`: a non-empty array.
   * `between` / `not_between`: exactly two elements. Null-ish operators:
   * null. Comma-joined strings are still accepted on read (legacy).
   */
  value: string | number | boolean | null | ReadonlyArray<string | number>;
  /** Text operators only. Absent means case-insensitive. */
  matchCase?: boolean;
};
```

No version bump: all three new fields are optional, and the array form is already
in the declared type. The tolerant reader lives in one place, the value accessor
used by the renderer and the validator, so the comma-splitting fallback exists
once instead of being reimplemented in `applyFilters`, `applyHaving`, and the UI.

`react-querybuilder` produces this natively once configured: `listsAsArrays`
makes the `in` and `between` editors emit arrays instead of comma-joined
strings, and `parseNumbers` makes numeric editors emit numbers.

### 5.3 Validation and completeness

Two pure predicates next to the types, used by both the UI and the renderer:

- `isFilterRuleComplete(rule)`: scalar operators need a non-empty value; list
  operators need at least one item; `between` needs two; null-ish and boolean
  operators need nothing.
- `validateFilterRule(rule, columnType)`: returns `ok` or a reason code
  (`operatorNotAllowedForType`, `valueNotANumber`, `valueNotADate`,
  `betweenNeedsTwoValues`, `regexDoesNotCompile`, `columnNotFound`).

Per D9 the consequences are uniform:

- Incomplete or invalid rules are **excluded** from generated SQL.
- Each excluded rule is marked inline in the panel with its reason.
- The panel header and the area above the grid show "N filters applied" plus
  "M not applied" when M is greater than zero.
- A group whose rules are all excluded contributes nothing, as today.

This replaces four inconsistent behaviors: the dropped incomplete `between`, the
`col = ''` on a fresh rule, the `col = NULL` on a cleared value, and the `in`
whose cleared value left stale results on screen.

### 5.4 SQL to form parity

`parseFilterClauses` gains the inverse of every catalog entry. The AST shapes are
those verified in 5.1.1:

- A `function` node named `contains` / `starts_with` / `ends_with` whose first
  argument is a column reference (optionally wrapped in `lower`) and whose second
  is a string literal (wrapped in `lower` when the first is) maps to that operator
  with `matchCase` set from whether the `lower` wrappers are present. A
  `unary_expr` with operator `NOT` around one of those maps to the negated id.
- `binary_expr` with operator `IS` and a `bool` right side maps to `is_true` /
  `is_false`; `IS NOT` with a bool inverts it. The existing `IS` branch only
  handles a `null` right side today, so this is an extension, not a rewrite.
- `NOT BETWEEN` maps to `not_between` (today it falls through to
  `whereUnsupportedOperator`).
- `regexp_matches(col, literal)` and its `NOT` wrapper map to `matches_regex` /
  `not_matches_regex`.
- `coalesce(trim(col), '') = ''` and `<> ''` map to `is_blank` / `is_not_blank`.
- `lower(col)` on the left of `=`, `<>`, `IN`, `NOT IN` with `lower(...)` literals
  on the right maps to the plain operator with `matchCase` false; the same
  operators without `lower` map with `matchCase` true.
- A `cast` node or a `date` literal on the right of a comparison unwraps to the
  scalar value, so temporal rules round-trip.
- `LIKE` / `NOT LIKE` continue to map to the legacy `like` / `not_like` ids,
  unchanged, which is what keeps hand-written or previously saved pattern SQL
  working (D6).

Unrecognised shapes keep reporting the existing `whereUnsupportedOperator` and
`whereNonLiteralComparison` reasons, so SQL mode still degrades to the
approximation badge rather than silently dropping predicates.

D8 makes this testable rather than aspirational: one table-driven test iterates
the catalog, renders SQL for a synthetic rule, parses it back, and asserts the
tree is identical. Any operator added without a parse rule fails that test.

While in this file, delete the dead `notBetween: "between"` and
`beginsWith|endsWith: "like"` entries from the UI's translation table (F15); the
catalog ids are now one-to-one, so the table itself mostly disappears.

## 6. State ownership and the commit model

### 6.1 Stable identity

Two changes, both small, that together fix F2:

1. Filter nodes carry an `id`, generated once when the node is created and
   preserved by the conversion functions in both directions. The library is
   given `idGenerator` so ids it creates match our format.
2. `QueryFiltersField` holds the library tree in local state for the duration of
   an editing session, and treats the incoming `value` prop as an external
   source that only replaces local state when it differs structurally (Reset,
   Open saved query, SQL to form mapping, data source change). A serialized
   signature comparison is enough; the ids make it stable.

Point 2 is also what makes the debounce possible: while the user types, the
library tree is authoritative and nothing has been committed upward yet.

### 6.2 Commit timing

- Typing in a value input commits after 300 ms of quiet.
- Structural edits (add or remove rule, add or remove group, change column,
  change operator, change combinator, toggle `Match case`) commit immediately.
- Blur and `Enter` commit immediately.
- Committing means calling `onChange` with our model tree, which reaches
  `setFilters`, regenerates SQL, and re-runs the query, exactly as today.
- A commit whose rule set is unchanged after exclusion (D9) does not change the
  generated SQL, so no query runs. This is what stops the `col = ''` query on a
  fresh rule.

### 6.3 Combinator display

Pass explicit combinators with uppercase names so the value in our model matches
an option:

```tsx
combinators={[
  { name: "AND", label: t`And` },
  { name: "OR", label: t`Or` },
]}
```

Also pass `showCombinatorsBetweenRules` so the combinator renders in the gutter
between rules instead of only in the group header. That fixes F3 and U6 in one
move: the operator becomes visible exactly where the logic happens, and the
first row of the group stops carrying a control that looks like it belongs to the
parent.

### 6.4 Field-change behavior

The library's `resetOnFieldChange` defaults to `true`, which is F13: switching a
rule's column silently discards the operator and value. Set it to `false` and
handle the type transition ourselves: keep the operator and value when the new
column has the same type facet (text to text, numeric to numeric, temporal to
temporal), otherwise reset the operator to the type's default and clear the
value, and say so inline. Also set `getDefaultOperator` per type facet, and give
new rules the first column in a stable, dataset-ordered field list rather than
whatever the current list order produces.

## 7. Column scope and reconciliation

Per D1 the filter field list is the dataset's columns, not the SELECT list.

**Shared column source.** `QueryColumnMultiSelect` already loads every column
for a data source (`DatasetColumnClient.useGetAll` filtered by `dataset_id`,
`ConceptAttributeClient.useGetAll` filtered by `concept_id`, mapped through
`QueryColumn.makeFromDatasetColumn` / `makeFromConceptAttribute`). Extract that
into `useQueryColumnsForDataSource(dataSourceId)` and consume it from both the
multi-select and `ManualQueryForm`, so the two lists cannot drift.

**Panel gating.** `ManualQueryForm` currently hides the aggregations group when
`queryColumns.length === 0` and passes `queryColumns` to the filters group. After
this change the filters group depends on `dataSource`, not on `queryColumns`. Its
empty state becomes "Select a data source to add filters", and the current
"Add columns to the query above to start defining filters" copy is retired
(U17).

**Reconciliation on data source change.** `useManualQueryDataSourceChange` gains
a filter step: keep rules whose `columnName` exists in the new source (matched by
name, since that is what the rule stores), drop the rest, and surface one line
naming what was dropped ("2 filters removed: they referenced columns not in
<dataset>"). This is F6, and it is better than either today's behavior (run them
and fail) or a blanket clear.

**Deselecting a displayed column** no longer affects filters at all, which is the
point of D1. The new risk is the inverse of F7: the grid can be filtered by a
column the user cannot see. That is what the "N filters applied" summary above
the grid is for, and it should name the columns involved on hover or expand.

## 8. Feedback and error surfaces

1. **Query error state in the results area.** Wire `state.lastQueryError` to the
   grid's empty state so a failed query reads as an error, not as zero rows, with
   the DuckDB message and a disclosure for the failing SQL. `useDataQuery`
   already returns the error object and `DataExplorerApp` already stores it; only
   the surface is missing. The dashboard host needs the equivalent in its query
   panel (`NLQueryPField`) and in `DataVizPBlock`.
2. **Inline rule messages** from `validateFilterRule`, rendered under the
   offending control, with the rule visually marked as not applied.
3. **Applied-filter summary** in the panel header and above the grid, per D9 and
   section 7.
4. **Type hints in the value editor**: placeholder text per operator and type
   (`YYYY-MM-DD` for dates, `Lower bound` / `Upper bound` for `between`, `Add a
value` for the `in` chip editor), so the list and date cases stop being
   guesswork (U11).

## 9. Rule row and tree layout

Two hosts, one component: the Data Explorer drawer renders `ManualQueryForm`
with `layout="columns"`, the dashboard query panel renders it with the default
`layout="stacked"` and a much narrower container. Everything below must hold in
both, so sizes are expressed as minimums and flex behavior, never fixed widths.

**Rule row.** One row per rule at container widths above roughly 520 px:
`[combinator gutter] [column] [operator] [value] [match case] [remove]`. The
column control gets the largest share and the value control flexes; the operator
control is sized to its longest label. Below that width the row wraps to two
lines (column and operator, then value and actions) rather than one control per
line. This replaces the current three-to-four stacked rows per rule (U5).

**Readability.** Control text goes to 13 to 14 px (U3). The column control gets
`text-overflow: ellipsis` and must render from the start of the string, not
scrolled to the tail, plus a `title` tooltip with the full name (U1). Dropdown
menus are sized to their content with a minimum around 320 px and are allowed to
exceed the trigger width, with two-line wrapping and tooltips for long names
(U2). Every control gets a visible label or an in-control placeholder, and the
`title`-only pattern that produced the axe `label-title-only` violation across 11
nodes goes away (U4).

**Popover placement.** Dropdowns flip above the trigger when they would overflow
the drawer, cap their height to the available space with internal scrolling, and
stay inside the drawer bounds, so `is null` and `between` are reachable from a
rule near the bottom (U14).

**Hierarchy.** Nested groups indent 12 to 16 px and carry a 2 px left accent
rail per depth level, on a neutral surface rather than another layer of
translucent blue over blue (U7). Rules are separated by a divider or alternating
background with 8 to 12 px of vertical padding, so two rules cannot read as six
loose controls (U6).

**Actions.** `+ Rule` and `+ Group` become subtle (light or outline, smaller),
and remove becomes a ghost icon button (16 px icon, red on hover) with a real
`aria-label`, separated from the add buttons (U8, U9). Removing a group that
contains rules asks for confirmation or offers undo. The `between` editor gets an
`and` separator or `From` / `To` labels (U10). List values render as removable
chips that wrap, which is also what makes long `in` lists readable (U12).

**Scroll ownership.** The filter tree gets its own scroll area with the group
header (combinator and add buttons) sticky, instead of sharing one scroll
container with Source, Aggregations, and Sort & limit. The drawer's default
height rises when filters exist, and the 7 px resize separator gains a visible
grip and a larger hit area (U13). The four-panel grid rebalances so Filters is
the widest column and `Sort & limit` stops orphaning onto a second row next to a
grey void (U15). The `Overwrite SQL?` banner compacts to a single line with
inline actions (U16).

**i18n.** Every label above goes through `useLingui` `t` macros, including the
operator labels in the catalog, which is why the catalog exposes label keys
rather than baked strings.

## 10. Delivery order

One delivery. The order below is a dependency order, not a release schedule:
each item is easier or safer once the one above it exists. The implementation
plan (`docs/superpowers/plans/2026-08-17-manual-query-filters.md`) breaks these
into tasks.

| Order | Work                                                                                                                                                                                           | Root cause | Findings closed                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------ |
| 1     | Stable node ids, local library state, debounce and commit rules (6.1, 6.2)                                                                                                                     | R1         | F2, F12                                    |
| 2     | Explicit uppercase combinators plus `showCombinatorsBetweenRules` (6.3)                                                                                                                        | R2         | F3, U6                                     |
| 3     | Operator catalog with type facets; one renderer for `WHERE` and `HAVING`; substring functions for text matching; typed literals; array values with tolerant reader (5.1, 5.1.1, 5.2, D5 to D7) | R3         | F1, F4, F11, F15, M1 to M9                 |
| 4     | SQL to form parity for every catalog entry, with the round-trip test (5.4, D8)                                                                                                                 | R3         | F15                                        |
| 5     | `isFilterRuleComplete`, `validateFilterRule`, exclusion semantics, inline messages, applied-filter summary (5.3, 8.2, 8.3, D9)                                                                 | R4         | F5 (partly), F8                            |
| 6     | Query error surface in the results area and both dashboard hosts (8.1)                                                                                                                         | R4         | F5                                         |
| 7     | Shared column hook, any-dataset-column scope, panel gating, reconciliation on data source change (section 7)                                                                                   | R5         | F6, F7, U17                                |
| 8     | Typed value editors: number, date, boolean, chips for lists (8.4)                                                                                                                              | R3         | U11, U12                                   |
| 9     | Rule row, hierarchy, actions, dropdown placement, scroll ownership, panel rebalance, in both hosts (section 9)                                                                                 | layout     | U1 to U5, U7 to U10, U13 to U16            |
| 10    | Field-change behavior and stable default column ordering (6.4)                                                                                                                                 | R1, R3     | F13                                        |
| 11    | Test net: unit, literal-value handling, round-trip, component regression, row-count end to end (section 11)                                                                                    | all        | regression protection for all of the above |

Items 3 and 4 are one unit of work in practice: an operator added without a
parse rule fails the round-trip test, which is the point of D8. Item 9 depends on
item 8 only for the value-editor slots; the rest of the layout work is
independent and can proceed in parallel.

## 11. Testing

**Unit, `shared/models/queries/StructuredQuery/`**

- Catalog to SQL, one case per operator, for both WHERE and HAVING, asserting the
  exact rendered predicate (extends the existing
  `structuredQueryToSql.test.ts`).
- Literal-value handling: values containing `%`, `_`, `\`, `'`, and a comma, asserting literal
  matching and correct `ESCAPE` emission.
- Typed literals: numeric columns bind numbers, temporal columns emit casts, text
  binds strings, and the no-`columnTypes` fallback keeps today's output.
- Tolerant reader: comma-joined legacy values, arrays, single values, empty
  arrays.
- `isFilterRuleComplete` and `validateFilterRule` truth tables.
- **Round-trip property test** over the whole catalog, per D8.
- Legacy `like` / `not_like` render unchanged, and a fixture of a v1
  comma-encoded saved query still produces the same SQL it does today.

**Component, `QueryFiltersField`**

- Typing a multi-character value into a rule keeps focus and lands every
  character. This is the F2 regression test and it should fail against today's
  code.
- The combinator control displays `And` / `Or` and switching it changes the
  emitted tree (F3).
- An incomplete rule emits no query; completing it emits one; clearing it stops
  filtering rather than leaving stale results (F8, D9).
- Changing a rule's column across type facets resets the operator; within a facet
  it does not (F13).
- Deselecting a displayed column leaves filters untouched (D1).
- Switching data source drops only the rules whose columns are absent, and
  reports them (F6).

**End to end, `tests/e2e`**

Turn the review's verification matrix into a fixture-driven spec against
`tests/data/california-covid-sample/california-covid-sample.csv`: a table of
(filter tree, expected row count) covering the 28 cases that pass today plus the
`contains` cases that do not, asserted through the grid's row summary. That
converts a one-off manual review into a permanent regression net, and it is the
only layer that would have caught F1.

**Manual, both hosts**

Every layout change verified in the Data Explorer drawer (`layout="columns"`) and
the dashboard query panel (`layout="stacked"`, narrow), at 900 px and 1280 px
widths, with screenshots in `.temp/` per the repo's browser rules.

## 12. Risks

- **Two hosts, one component.** `ManualQueryForm` renders in the dashboard as
  well as the Data Explorer. A layout change that looks right in the drawer can
  break the narrow stacked panel. Mitigation: the width-driven wrapping rule in
  section 9 and the manual matrix in section 11.
- **Persisted queries.** `StructuredQuery` is versioned and stored in dashboards,
  GIS map layers, and Data Explorer URL state. Every change here is additive and
  read-tolerant by design (D5, D6), and the fixture test in section 11 pins that
  down. A regression here silently changes what a saved dashboard shows, which is
  the worst failure mode in this spec.
- **Library version drift.** `package.json` declares `^8.16.1` while the
  installed tree is `react-querybuilder` 8.20.2. The props this design relies on
  (`listsAsArrays`, `parseNumbers`, `idGenerator`, `showCombinatorsBetweenRules`,
  `resetOnFieldChange`, `getOperators`, `getValueEditorType`, `controlElements`)
  were verified against 8.20.2. Pin the range before relying on them.
- **Case-insensitivity as a default** changes result sets for new filters only,
  since legacy `like` rules keep their semantics. Users who currently type
  wildcards by hand into `contains` will find them matched literally. That is
  the intended fix, but it belongs in the release note.
- **Shared local Supabase.** The stack is shared across worktrees; a
  `pnpm db:reset` elsewhere wipes uploaded datasets mid-test. Bring your own
  fixtures in the e2e layer rather than relying on hand-uploaded data.

## 13. Deferred and open questions

Nothing below blocks this delivery.

1. **`is_blank` semantics.** This spec renders it as
   `coalesce(trim(col), '') = ''`, that is null, empty, or whitespace, with
   `is_null` still available for strict null. CSV import turns empty cells into
   NULL, so a strict `col = ''` would have looked broken. Confirm the label copy
   ("is blank" versus "is empty") so `is_null` and `is_blank` are not confused.
2. **Case-insensitive equality.** D2 applies the default to `=` and `in` as well
   as the pattern operators, on consistency grounds. If exact identity matching
   is more valuable for `=`, flip that one and keep the toggle.
3. **HAVING surface** (F10, M14): a separate "Filters on results" section under
   Aggregations, or aggregate entries in the same field list.
4. **Epoch-millisecond date columns** (F9): fix in CSV type detection, which
   means a re-parse path for existing datasets.
5. **Grid filters** (F16): keep, remove, or promote into the query tree.
6. **Result column order** (F14).
7. **Whether filtering should offer columns from joined sources** once `joins`
   are exposed in the manual form. The catalog is column-name keyed, so joins
   will need qualified names.
8. **`length` predicates** (M13). Left out because the value's type stops being
   the column's type (a number on a text column), which the value-editor
   resolution in 8.4 does not model. Revisit with relative dates, which have the
   same shape problem.
9. **Reorder and clone rules** (`enableDragAndDrop`, `showCloneButtons`). Both
   are library flags, but drag targets need the layout from section 9 to settle
   first.

## Document maintenance

Update this spec when the operator catalog changes, when the value encoding
changes, or when a decision in section 3 is revisited. The findings document
(`docs/superpowers/2026-08-17-manual-query-filters-review.md`) is the evidence
base and should not be edited; add new findings there only with fresh
reproduction.
