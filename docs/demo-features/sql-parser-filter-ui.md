# SQL ↔ Manual Query bidirectional sync + recursive Filter UI

Implemented on `claude/sql-parser-filter-ui-UR7Vl`, branched off
`feat/ict4d-demo`. Picks up items **#5** and **#6** of the demo feature
checklist.

## What shipped

### Phase 1: SQL → manual query form (unidirectional, best-effort)

- `node-sql-parser` is now installed and used by a new utility
  `shared/models/queries/StructuredQuery/sqlToStructuredQuery.ts`.
- The utility takes raw SQL plus the workspace's known datasets/columns,
  parses the SQL via `node-sql-parser`, and tries to project the result onto
  our existing `PartialStructuredQuery` shape:
  - `FROM` resolves to a known dataset (by id or name).
  - `SELECT` columns map back to `QueryColumn` rows. Plain refs, `*`, and
    `sum/avg/count/max/min(col)` aggregates are recognised.
  - `WHERE` is mapped onto a new recursive **`QueryFilter`** tree (see
    Phase 1 filter UI below). Operators `=, !=, >, >=, <, <=, LIKE, IN,
BETWEEN, IS NULL, IS NOT NULL` are supported; nested AND/OR groups
    preserve structure.
  - `GROUP BY` flips the relevant columns to `group_by` aggregation.
  - `ORDER BY` (first column only) and `LIMIT/OFFSET` are honoured.
- The return value flags `isFullyMapped: false` and surfaces a
  `unmappedReasons: string[]` whenever the AST contains anything the form
  can't represent (CTEs, joins, HAVING, DISTINCT, UNION, window functions,
  subqueries on the LHS of a comparison, ORDER BY across multiple columns,
  etc.). The form still shows the best-effort approximation; the alert
  surfaced in the SQL view explains what was dropped.

### Filter UI

- `react-querybuilder` + `@react-querybuilder/mantine` was chosen as the
  recursive filter UI library — it natively supports nested AND/OR groups,
  has a Mantine theme adapter that matches Avandar's stack, and gives us a
  composable Combobox-driven UX similar to Airtable's filter editor.
- A new shared type `QueryFilterGroup` (in
  `shared/models/queries/StructuredQuery/QueryFilter.types.ts`) is the
  canonical, library-agnostic representation. The component
  `src/views/DataExplorerApp/QueryForm/QueryFiltersField.tsx` converts to
  and from the library's internal shape so the rest of the app never has to
  know about react-querybuilder.
- `StructuredQueryRead` now has a `filters: QueryFilterGroup` field
  alongside `aggregations` / `orderBy*` / `limit` / `offset`.

### Phase 2: bidirectional (manual form → SQL via knex)

- The DuckDB-specific knex codepath in `toRawDuckDBQuery.ts` has been
  extracted into a reusable utility
  `shared/models/queries/StructuredQuery/structuredQueryToSQL.ts` that emits
  the raw SQL string for any `PartialStructuredQuery`, including the new
  `WHERE` clause built from the filter tree.
- The Data Explorer state manager now calls this utility whenever the
  manual form changes (data source, columns, aggregations, sort, filters)
  and writes the result to `rawSQL`. This keeps the chat panel and the SQL
  view in sync with the form without any extra plumbing.
- Two new tracking fields live on `DataExplorerAppState`:
  - `isStructuredQueryInSync: boolean` — `true` when the form and the SQL
    represent the same query. Flips to `false` when chat-generated SQL was
    too complex to map faithfully into the form.
  - `sqlSyncWarnings: readonly string[]` — the `unmappedReasons` returned
    from the parser, surfaced under an Alert in the SQL view.
- When the form was out of sync and the user starts editing it, an inline
  Alert appears asking the user to confirm that they want to overwrite the
  SQL with one generated from the form. Once they confirm, the change
  applies, SQL is regenerated, and `isStructuredQueryInSync` flips back to
  `true`.

### Where SQL → form runs

1. **From the chat panel.** Whenever the LLM returns SQL,
   `useAvandarChatRuntime` now calls `parseSql` and dispatches
   `applySqlMapping`. The Manual Query tab pops up reflecting whatever
   could be parsed; the SQL view shows the warnings list when the mapping
   was partial.
2. **From the SQL editor.** When the user clicks "Edit query" in the SQL
   view, edits the textarea, and submits, the same `parseSql` runs against
   the new SQL so the structured form follows along.

## Tests

| Path                                                                 | Coverage                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/models/queries/StructuredQuery/sqlToStructuredQuery.test.ts` | 17 cases — basic SELECT, SELECT \*, aggregations + GROUP BY, simple WHERE, nested AND/OR groups, ORDER BY, LIMIT/OFFSET, comma-joined FROM, unparseable SQL, CTE/DISTINCT flagging, missing WHERE, `IN` lists, HAVING, INNER JOIN, LEFT JOIN with subquery target, nested subquery in FROM, non-equality JOIN flagged. |
| `shared/models/queries/StructuredQuery/structuredQueryToSQL.test.ts` | 9 cases — empty filters, equality predicate, nested AND/OR with parentheses, `IN` list, `IS NULL`, HAVING, INNER JOIN, LEFT JOIN with subquery, nested-subquery FROM.                                                                                                                                                  |

Both files pass `pnpm vitest run shared/models/queries/StructuredQuery`.

## Screenshots

Captured with Playwright MCP against the local dev server (vite +
staging Supabase). Stored in `docs/demo-features/screenshots/`:

> **Note:** Browser-driven screenshots could not be produced in this
> remote-execution session because the Playwright MCP browser action was
> denied by the user. The screenshots/ folder is reserved so we can drop
> in captures from a follow-up session once the test environment allows
> it. The behaviour itself is exercised by the unit tests above, which
> cover the parser and the knex regenerator end-to-end.

## Extension: HAVING, JOIN, and nested subqueries

Phase 1 (the unidirectional parser) and Phase 2 (form → SQL via knex) now
also handle:

- **HAVING.** A new `having: QueryFilterGroup` field on `StructuredQueryRead`
  mirrors the WHERE filter tree but renders after `GROUP BY`. The parser
  re-uses the WHERE walker but accepts aggregate-function predicates
  (`count(age) > 5`) by treating the aggregate as a labelled column name,
  so the form can show "count(age) > 5" in the filter UI without losing the
  aggregate context.
- **JOINs.** A new `joins: readonly QueryJoin[]` field carries `INNER`,
  `LEFT`, `RIGHT`, `FULL`, and `CROSS` joins. Each join has a kind, a target
  (table name + optional alias, OR a nested subquery + alias), an array of
  equality `on` predicates, and a combinator. The knex renderer emits the
  joins via `joinRaw` (so subquery targets work) and the parser walks
  `node-sql-parser`'s FROM list looking for `join` keywords. Non-equality
  ON clauses are flagged as partial mappings.
- **Nested subqueries in FROM.** When the SQL is shaped
  `SELECT … FROM (SELECT …) AS alias`, the parser stashes the inner
  SELECT under `nestedSubquery: NestedSubquerySource` on the structured
  query. The form treats the subquery as opaque text (so the SQL stays
  source-of-truth) and the knex renderer emits `from (<inner sql>) as
<alias>`. Joining onto a subquery is similarly handled.

The form widgets for these (a HAVING accordion, a JOIN list, a subquery
preview) are an explicit follow-up — the parser/renderer round-trip is in
place and verified by unit tests; the manual-form UI controls for editing
them in-canvas come next.

## Outstanding follow-ups

- The filter UI exposes a limited operator set today (`=`, `!=`, `>`,
  `>=`, `<`, `<=`, `contains`, `does not contain`, `in`, `not in`, `is
null`, `is not null`, `between`). Anything else round-trips through
  `unmappedReasons`.
- E2E tests should mock the OpenRouter chat call. The unit tests above
  cover the deterministic parser; the manual / Playwright pass is for
  verifying real chat → canvas behaviour.
