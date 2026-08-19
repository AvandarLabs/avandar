# S3·9 rehearsal status

**Branch:** `feat/qetl-s3-9-rehearsal`  
**Stack:** shared local Supabase `avandar` (API 54321, DB 54322, Vite 5173). Env files match. Did not switch, restore, or write production.

## What I queried

Mapped concept **County** (not seed `State`):

| | |
|---|---|
| Concept | `County` (`a11c0001-c0a7-4000-8000-00000000c0a7`) |
| Dataset | `long-us-deaths.csv` (`a4fd4718-1bd5-43e2-b4ae-7ec600d1845f`) |
| Identifier | `UID` (`dataset_column`, `most_frequent`) |
| Label | `Combined_Key` (`most_frequent`) |
| Other attrs | `Province_State`, `Population` (`most_frequent`) |
| Spine | 3342 individuals (distinct `UID`s from the parquet) |

DuckDB against the real parquet (native, ~200ms):

```sql
SELECT * FROM "concept_a11c0001-c0a7-4000-8000-00000000c0a7" LIMIT 5;
```

Rows came back with `external_id`, `Combined_Key`, `Population`, `Province_State`, `UID`.

Filter / group / sort:

```sql
SELECT "Province_State", COUNT(*) AS n
FROM "concept_a11c0001-c0a7-4000-8000-00000000c0a7"
WHERE "Province_State" IS NOT NULL
GROUP BY "Province_State"
ORDER BY n DESC;
```

Texas 256, Georgia 161, Virginia 135, …

Join concept to dataset:

```sql
SELECT c."Province_State", SUM(d.daily_new_deaths) AS deaths
FROM "concept_a11c0001-c0a7-4000-8000-00000000c0a7" c
JOIN "a4fd4718-1bd5-43e2-b4ae-7ec600d1845f" d
  ON CAST(c.external_id AS VARCHAR) = CAST(d.UID AS VARCHAR)
WHERE c."Province_State" IN ('California', 'Texas', 'New York')
GROUP BY c."Province_State"
ORDER BY deaths DESC;
```

California 101159, Texas 93390, New York 77157.

Chart: in Data Explorer, source **County**, group by `Province_State`, chart count. No saved dashboard (public snapshots still out of scope).

## What broke

`generateIndividuals` runs `DROP TABLE; CREATE TABLE AS SELECT … FROM "<datasetId>"` through `WorkspaceQuerySession`. Two gates treated that mutating SQL as unanalyzable:

1. `getQueryDependencies` used `getDatasetIdsFromSqlTableReferences`, which throws `mutating SQL`.
2. `getConceptRelationPlansFromSql` used `extractReferencedRelations`, which is `unsupported` for mutations, then threw.

Generate Individuals never reached DuckDB, so a mapped concept could not get a spine from the UI.

The SELECT / view / join path itself was already wired (`structuredQueryToSql` → `concept_<uuid>` → mediator load). Executed tests over the view already returned rows; the join/filter/group/sort case was added and passes.

## What I fixed

- `DuckDbSqlAnalyzer.getReadDatasetIdsFromSql`: datasets a statement **reads**, including CREATE TABLE AS SELECT.
- `WorkspaceQuerySession.getQueryDependencies` uses that instead of the read-only entry point.
- `getConceptRelationPlansFromSql`: mutating SQL that names no concept view returns `[]` (no ontology reads). Unanalyzable SQL still throws.

## Files changed

- `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.ts`
- `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.test.ts`
- `src/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession.ts`
- `src/clients/qetl/assertWorkspaceRelations/assertWorkspaceRelations.ts` (comment)
- `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts`
- `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.test.ts`
- `src/lib/sql/__tests__/buildConceptViewSql.executed.test.ts`
- `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.test.ts`

Local DB only (not in git): County concept + 3342 individuals.

## Remaining risk

- **Merge + restart `pnpm dev`.** Impl’s running Vite is old code. County is in the shared DB now; after merge, select **County** in workspace Data Explorer.
- `_runConceptQuery` is still in `runStructuredQueryWithMetadata`. Explorer uses SQL when the form is in sync. Out-of-sync form still hits the old assertion path.
- Generate Individuals was not live-clicked here (no UI on this worktree). Staging SQL is now plannable; the click still needs wasm DuckDB + a loaded parquet after merge.
- CREATE TABLE AS SELECT **from a concept view** will not plan that concept (mutating analysis only reports datasets). Not on the demo path.
- `sourceVersion` still dropped on cache write. Unrelated.
- Public/published concept queries still punted.
- wasm may be slower than the 200ms native run. 3342 × four `most_frequent` subqueries on 3.8M rows was fine natively.
- Seed `State` is still empty `manual_entry`. Ignore it for the demo.

## Demo script (after merge, workspace explorer)

1. Log in: `user@avandarlabs.com` / `avandar`, workspace `avandar-labs`.
2. Data Explorer → source **County** → run. Expect ~3342 rows.
3. Group by `Province_State`, chart.
4. Paste the join SQL above into raw SQL and run.
