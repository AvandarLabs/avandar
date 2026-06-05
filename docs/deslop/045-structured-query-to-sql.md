# 045 — Structured query → SQL

- **Slug**: `structured-query-to-sql`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-045/structured-query-to-sql`
- **Depends on**: `none` (but pairs with #044 for full bidirectionality).
- **Estimated PR size**: small — 1 module + 5 unit tests, extracted from `toRawDuckDBQuery`.

## Notes for future you

- This extracts the existing form-to-SQL renderer out of `toRawDuckDBQuery` into a reusable utility. It also renders the new WHERE clause from the recursive filter UI (#046).
- Knex is the SQL builder. Don't switch to template strings — Knex's escaping + DuckDB dialect handling is load-bearing.

## What this feature is

`structuredQueryToSql(query): string` — Knex-based renderer that produces a SQL string from a `StructuredQuery`. Replaces inline SQL generation in the prior `toRawDuckDBQuery`. Also handles WHERE clause rendering for the recursive filter UI introduced in #046.

## Steps to migrate

**Step 0** — `/deslop undrift structured-query-to-sql`.

1. Create the refactor branch.
2. Extract the existing logic from `toRawDuckDBQuery` into the new module.
3. Add WHERE rendering for the new filter shape.

### Files to copy verbatim

```
src/lib/sql/structuredQueryToSql.ts
src/lib/sql/structuredQueryToSql.test.ts
```

### Files to surgically edit on `develop`

- `src/clients/datasets/toRawDuckDBQuery.ts` (or wherever it lives) — replace inline rendering with `structuredQueryToSql`.

## Verification

5 unit tests; manual: run a query in the Data Explorer, confirm SQL output matches.

## How to mark this feature completed

Standard ritual.
