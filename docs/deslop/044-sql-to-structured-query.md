# 044 — SQL → structured query

- **Slug**: `sql-to-structured-query`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-044/sql-to-structured-query`
- **Depends on**: `none`
- **Estimated PR size**: small — 1 module + 12 unit tests, ~400 lines.

## Notes for future you

- This row is the **first half** of bidirectional SQL ↔ form sync. The second half is #045 (form → SQL); the wiring is #047 (Data Explorer) and #048 (Dashboards).
- `node-sql-parser` doesn't cover every DuckDB-specific construct; the `unmappedReasons` array surfaces gaps. Don't try to make the mapper exhaustive.
- Spec: `docs/demo-features/sql-parser-filter-ui.md`.

## What this feature is

`sqlToStructuredQuery(sql): { query, isFullyMapped, unmappedReasons }` — projects an arbitrary `SELECT` statement onto the `PartialStructuredQuery` shape used by the query-builder UI. When the SQL contains features the structured form can't represent (subqueries, CTEs, custom DuckDB functions), `isFullyMapped` is false and `unmappedReasons` lists the gaps.

## Steps to migrate

**Step 0** — `/deslop undrift sql-to-structured-query`.

1. Create the refactor branch off `develop`.
2. Copy the module + 12 tests verbatim.
3. Add `node-sql-parser` if not already installed.

### Files to copy verbatim

```
src/lib/sql/sqlToStructuredQuery.ts
src/lib/sql/sqlToStructuredQuery.test.ts
```

### Dependency changes

```
pnpm add node-sql-parser
```

(May already be installed for other features.)

## Verification

`pnpm vitest run src/lib/sql/sqlToStructuredQuery` — 12 tests pass.

## How to mark this feature completed

Standard ritual.
