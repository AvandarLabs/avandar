# Offline chat SQL hardening

Small WebLLM models invent table/column names and non-DuckDB syntax. The offline
pipeline applies **deterministic repair** after each SQL generation pass and
before the optional LLM fix pass.

## Pipeline order

1. **Analyze** (JSON) — optional `tableName` when the model picks a valid UUID.
2. **Resolve dataset** (code) — match user prompt to `LONG_us_deaths.csv` etc.
3. **SQL pass** — narrowed schema + required `FROM` for resolved dataset.
4. **Repair** (`repairOfflineGeneratedSql`) — dictionary, parse/remap, coerce.
5. **Execute** DuckDB (`tryExecuteOfflineSql`).
6. **Repair again** with `executionError` — fuzzy column remap from binder errors.
7. **LLM fix pass** — only if execution still fails.

`forceFromTableToDatasetId` runs whenever a resolved/open dataset id is known: any
`FROM "…"` / `JOIN "…"` that is not a workspace table id is rewritten (covers empty
schema cache + model inventing `covid_deaths`).

Prime the schema cache by using cloud chat once while online, or open the target
dataset in Data Explorer before going offline.

## Schema truncation

`truncateSchemaForOffline` caps columns for context size. Dataset **labels must stay**
in the schema even when column metadata is empty; otherwise `resolveOfflineDataset`
and `forceFromTableToDatasetId` have nothing to match and repair leaves names like
`covid_deaths` unchanged.

## Modules

| Module                                    | Role                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `offlineSqlHallucinationSubstitutions.ts` | Dictionary: backticks→quotes, `TOP`→`LIMIT`, quote bare `FROM`, strip catalog tables, trailing `;` |
| `repairOfflineColumnFromError.ts`         | Column alias dictionary (`country`→`Country/Region`, etc.) + Fuse fallback                         |
| `resolveOfflineDataset.ts`                | Token heuristics, then Fuse on prompt; open dataset tie-break                                      |
| `fuseMatchOfflineDataset.ts`              | Shared Fuse.js dataset name match (`includeScore: true`)                                           |
| `matchOfflineDatasetTable.ts`             | Exact + token heuristics + Fuse on SQL table refs; forbidden system tables                         |
| `stripOfflineSqlTableNamespaces.ts`       | Drops `schema.table` qualifiers (string + AST `db`) before dataset matching                        |
| `repairOfflineGeneratedSql.ts`            | Orchestrates substitutions → strip namespaces → parse/remap → sqlify → coerce                      |
| `repairOfflineColumnFromError.ts`         | Maps `Referenced column "x" not found` to nearest schema column                                    |
| `narrowOfflineSchema.ts`                  | Sends one dataset to the SQL prompt                                                                |

## Parser notes

Uses `node-sql-parser` with `{ database: "postgresql" }` (same as
`sqlToStructuredQuery`). Remaps `FROM` / `JOIN` table strings only; subqueries
are left unchanged in v1.

## What we do not fix deterministically

- Multi-table JOIN disambiguation beyond per-table remap
- CTEs, window functions, invalid DuckDB functions
- Subjective filter values (still need cloud or user clarification)
