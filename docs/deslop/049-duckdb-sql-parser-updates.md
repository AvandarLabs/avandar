# 049 — DuckDB SQL parser updates

- **Slug**: `duckdb-sql-parser-updates`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-049/duckdb-sql-parser-updates`
- **Depends on**: `044-sql-to-structured-query`.
- **Estimated PR size**: tiny — config / mapping table, ~50–100 lines.

## Notes for future you

- Driver commit: `673419e`. Same commit also touches the async import pipeline (#001) — scope to parser portion only.
- The mapping is data, not code. New DuckDB built-ins land here over time.

## What this feature is

Updates the `node-sql-parser` config / DuckDB dialect mapping so DuckDB-specific SQL (e.g. `LIST_VALUE`, `STRUCT_PACK`, `*::TYPE` casts) parses correctly into the structured-query shape.

## Steps to migrate

**Step 0** — `/deslop undrift duckdb-sql-parser-updates`.

1. Confirm #044 has merged.
2. Apply the parser config updates from commit `673419e`.

### Files to surgically edit on `develop`

- `src/lib/sql/sqlToStructuredQuery.ts` (or co-located config file) — add the new mappings.

## How to mark this feature completed

Standard ritual.
