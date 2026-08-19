# QETL column projection in the mediator - design

**Status:** Ready to implement
**Date:** 2026-08-19
**Lane:** F (`HANDOFF.md` on `feat/qetl-column-projection`)
**Merge back into:** `feat/qetl-impl`
**Parents:** `docs/superpowers/specs/2026-08-18-qetl-relation-cache-design.md`
(section 10), `docs/superpowers/specs/2026-08-18-qetl-concept-relations-design.md`
(section 4.6, `first` / `ava_rows_`)

> Code blocks in this document are illustrative. The repository is the
> authority on every signature.

---

## 1. Problem

`AcquireRequest.columns` and Dexie's `coversColumns` / `growFrom` already exist.
The mediator never uses them.

`src/clients/qetl/QueryMediator/relationLoading.ts` builds every storage key
and every `acquire` / `write` with `columns: "all"` (`_toWholeDatasetCacheKey`,
the acquire around line 315, the write around line 388). The queryable-tier
probe (`probeRelationCache`) only asks whether a DuckDB table *exists*, not
whether it holds the columns this query needs.

So every query pays for whole-relation Parquet, and if we ever did store a
projected blob, a later wider query would false-hit the queryable tier.

The motivating case is already structured: a concept relation reads the
identifier column plus one column per requested attribute from each
contributing dataset. That is two columns of a ten-column file, not ten.

`first` / `most_frequent` still need a stable row order after projection.
Spec 3 hangs that on `ava_rows_<datasetId>` over
`read_parquet(..., file_row_number=true)`. Projection must not shuffle rows
and must not strip the entity-key column the correlated subquery joins on.

## 2. Scope

**In**

1. Compute the column set each dataset relation actually needs, from the SQL
   and from concept attribute mappings.
2. Probe, acquire, and cache with that set instead of `"all"`.
3. Keep Dexie's superset-reuse rule true at the mediator: an `"all"` (or
   wider) entry serves a subset; a subset must not serve a wider request;
   a partial miss acquires the union and supersedes.
4. Materialize a projected Parquet blob that preserves physical row order and
   always includes the concept entity-key column when one exists.
5. Teach the queryable-tier probe the same coverage rule, so a projected
   DuckDB table cannot silently serve a wider query.

**Out**

- Case Manager / ChatPanel / OntologyDesigner UI.
- Forcing Sheets or HDX wrappers to project at the source. They may keep
  ignoring `AcquireRequest.columns`. The mediator still records and serves
  what it *holds*.
- Entity-key `ORDER BY` at materialization. Include the key columns; do not
  sort. Physical file order plus `ava_rows_` is enough for `first`.
- Column attribution for arbitrary raw SQL. Unanalyzable SQL, `SELECT *`,
  and joins that need name resolution all fail wide to `"all"`.
- Public snapshot cache (`LocalPublicDatasetRelationCache` stays `"all"`).

## 3. Approaches

**A. Mediator projects after acquire (recommended).** Wrappers keep today's
contract: they may ignore `columns` and return every column. After a miss, the
mediator copies the acquired blob down to the needed set (no `DISTINCT`, no
`ORDER BY`) and writes *that* to the storage tier. Wrappers still receive the
requested columns so a later Parquet-at-source COPY is a local change.

- Plus: one path for every wrapper; cache holds the subset; demo works even
  when Sheets returns everything.
- Minus: first fetch of a remote Parquet still downloads the whole file.

**B. Push projection into `DatasetParquetWrapper` via `COPY (SELECT ...)`.**
Closer to spec 2 section 10.2, and DuckDB can skip unread Parquet column
chunks on a file-backed blob. Sheets/HDX still ignore `columns`, so the
mediator must still know what was *held*, and still project those wrappers.

- Plus: byte savings on the Parquet path.
- Minus: two projection sites; wrappers that ignore `columns` still need A.

**C. Change only the cache key, keep storing `"all"`.** Probe would start
using `coversColumns`, and an `"all"` entry would serve a subset. The cache
would never hold a subset, so a follow-up that needs more columns would
always hit, and the done criterion ("acquires/caches that subset") would
fail.

Lane F takes **A**. Pass `columns` through to `acquire` anyway (B's seam,
unused by Sheets/HDX). Do not implement B's COPY-at-source in this lane.

## 4. Column sets

A column set is `readonly string[] | "all"`, same type as
`RelationCacheKey.columns`. Names are case-sensitive, sorted, deduplicated.
`"all"` means every column the source has, not "we have not thought about it".

**Union.** `"all"` absorbs anything. Two finite sets concatenate, dedupe, and
sort. This is `unionColumnSets` next to `coversColumns` in
`RelationCacheKey.ts`.

**Parquet names, not view names.** Cached bytes are the Parquet file, whose
headers are `DatasetColumn.originalName`. DuckDB views then apply
`columnReplacements` (`originalName` → `name`). Concept SQL and Data Explorer
SQL speak `name`. Before probe, acquire, project, or write, map each needed
name through the dataset's columns: a match on `name` or `originalName`
becomes `originalName`. Unknown names pass through; DuckDB fails loud if the
file does not have them.

When a finite set equals every `originalName` the schema declares, store
`"all"` rather than the enumeration.

## 5. Needed columns

```ts
function getNeededColumnsFromQuery(options: {
  rawSql: string;
  datasetIds: readonly Dataset.Id[];
  conceptRelations: readonly ConceptRelationPlan[];
}): Record<Dataset.Id, readonly string[] | "all">;
```

Every id in `datasetIds` (the expanded query dependencies) gets an entry.
Empty result is not representable: missing information fails wide to `"all"`.

**Concept contributors.** For each `dataset_column` attribute on a planned
concept, union `selectColumnName` and `primaryKeyColumnName` into that
dataset's set. Unmapped attributes contribute nothing. This is the ontology
path: the SQL names `concept_<uuid>`, not the contributing datasets, so SQL
attribution cannot see them.

**SQL.** Tokenize with `DuckDbSqlAnalyzer`'s tokenizer.

- `SELECT *` (including `SELECT * EXCLUDE`) → `"all"` for every dataset the
  statement names.
- A star-free select list, plus identifiers in `WHERE` / `JOIN ON` /
  `GROUP BY` / `HAVING` / `ORDER BY`, become needed names. Skip `AS` aliases.
  A `table.column` qualifier binds to that table when it is a dataset id.
  Unqualified names bind only when the statement names exactly one dataset;
  otherwise fail wide.
- Unsafe, mutating, or unanalyzable SQL → `"all"` for every dataset id in
  `datasetIds`. This is the one place the spec fails open, and it is safe
  in that direction: a superset satisfies a subset.

**Combine.** Per dataset, union the SQL set with the concept set. `"all"`
wins. A dataset that is only a concept contributor and never appears in SQL
keeps the concept set. A dataset that appears in neither (should not happen
once dependencies are expanded) is `"all"`.

Do not name this `resolveNeededColumns`. Conversion/lookup names use `get` /
`make` / `to`; `resolve…` is banned.

## 6. Two-tier probe

The runner still probes queryable, then storage, then acquires. Each probe
now carries a per-dataset column set.

**Queryable tier.** `probeRelationCache` takes the needed map. A table that
is absent is a miss. A table that is present is a hit only when
`coversColumns(loaded, needed)` is true.

Loaded columns come from an in-memory sidecar (`queryableRelationColumns`)
written in `loadRelationBytes` and left stale on drop: `getTableOrViewNames`
is still the existence check, so a dropped table cannot hit. A present table
with no sidecar entry is treated as `"all"`, which is today's behaviour and
keeps existing tests that mock table names without going through load.

A finite sidecar never covers a request for `"all"`. That is how a projected
DuckDB table refuses a later `SELECT *`.

**Storage tier.** `_toWholeDatasetCacheKey` becomes `_toDatasetCacheKey` and
takes `columns`. `probeStorageRelationCache` probes with those keys.

Hits are unchanged (read payload, touch, load). Misses now matter: a miss
with `growFrom` acquires `unionColumnSets(needed, growFrom.columns)` instead
of the needed set alone. A miss with no `growFrom` acquires `needed`.

The in-memory fake used by mediator tests currently treats every entry as
`"all"` and never returns `growFrom`. It must implement `coversColumns` and
`growFrom` or it will green tests Dexie would fail. That is called out in its
own comment today.

## 7. Acquire, project, write

```
needed     = getNeededColumnsFromQuery(...)
acquireSet = union(needed, growFrom.columns)   // growFrom absent → needed
blob       = wrapper.acquire({ ref, columns: acquireSet })
held       = acquireSet === "all"
             ? blob
             : makeProjectedParquetFromBlob({ blob, columns: acquireSet })
write({ columns: heldColumns, payload: held })
rememberQueryableColumns(datasetId, heldColumns)
loadParquet(held)
```

`heldColumns` is `acquireSet`, or `"all"` when `acquireSet` enumerates the
whole schema.

**Projection COPY.** Register the acquired blob under an `ava_proj_…` file
name (not a RelationRef, so the analyzer does not treat it as a dataset).
Run, as trusted internal SQL, `SELECT <cols> FROM read_parquet('<file>')`
with `returnType: "parquet"`. No `DISTINCT`, no `GROUP BY`, no `ORDER BY`.
DuckDB preserves scan order, so the new file's physical `file_row_number`
matches the source file's row order. Then drop the temp file.

Do not persist `file_row_number` as a data column. Spec 3's public view is
`SELECT *` without that option; putting the column in the blob would leak it
into every explorer `SELECT *`. `ava_rows_` keeps adding it at read time.

If a requested column is missing, DuckDB throws. Do not catch that into
`"all"`.

Wrappers that ignore `columns` still return every column. The mediator
projects anyway, so the cache holds the subset. The stored `columns` field
is what is held, never what was asked.

## 8. Error handling

- Fail wide (`"all"`) when column attribution is incomplete.
- Fail closed (throw) when a named column is absent from the file.
- A storage write failure still does not fail the query; the bytes are in
  hand. Same log line as today.
- Authorization is unchanged and still runs before any probe.

## 9. Testing

Behaviour, not structure. Each claim below must be able to go red if the
implementation drops it.

1. `unionColumnSets`: `"all"` absorbs; finite union sorts and dedupes;
   case is preserved (`A` and `a` stay distinct).
2. Concept contributor: a plan that reads `status` keyed on `case_id` from
   dataset D yields `{ [D]: ["case_id", "status"] }` (sorted) even when the
   SQL is `SELECT * FROM "concept_<uuid>"`.
3. `SELECT "a", "b" FROM "<datasetId>"` yields those two names; `SELECT *`
   yields `"all"`; unanalyzable SQL yields `"all"`.
4. In-memory fake: cached `["a","b"]` serves `["a"]`, misses `["a","c"]` with
   `growFrom.columns === ["a","b"]`, misses `"all"` with `growFrom`.
5. Mediator: a storage entry of `"all"` serves a two-column query (no
   `acquire`). A two-column entry does not serve a three-column query
   (`acquire` is called, write supersedes, one live entry).
6. Queryable: a sidecar of `["a","b"]` plus a present DuckDB table does not
   skip storage when the query needs `"all"` or `["c"]`.
7. Projection: a three-column blob projected to two columns has two columns
   and the same row count as the source (no `DISTINCT`). Physical order is
   unchanged: `first` over `ava_rows_` returns the same value as on the
   unprojected file. Executed DuckDB, not a mock.

Positive controls sit beside every `not.toHaveBeenCalled`: a query that
*should* miss must still call `acquire`.

## 10. Exit criteria

- A workspace-explorer query whose SQL names two columns acquires and caches
  those two (plus the entity key if a concept contributor), or `"all"` when
  attribution fails wide, and never a silent other set.
- A follow-up query that needs a column the cache does not hold does not get
  a storage hit or a queryable hit. It acquires the union and leaves one
  live entry.
- A follow-up that needs a subset of a cached set is served from cache;
  `acquire` is not called.
- `SELECT *` on a dataset still does not return `file_row_number`.
- Sheets/HDX wrappers may still ignore `columns`.
- No Case Manager / ChatPanel / OntologyDesigner UI change.

## 11. Files

```text
shared/models/relations/RelationCacheKey/
  RelationCacheKey.ts                 + unionColumnSets, normalizeColumns
  RelationCacheKey.test.ts

src/clients/DuckDbClient/
  projectParquetBlob/
    projectParquetBlob.ts             COPY SELECT, no DISTINCT, preserve order
    projectParquetBlob.test.ts        unit, mocks DuckDB file ops

src/clients/qetl/QueryMediator/
  getNeededColumnsFromQuery/
    getNeededColumnsFromQuery.ts
    getNeededColumnsFromQuery.test.ts
  getParquetColumnNamesFromNeeded/
    getParquetColumnNamesFromNeeded.ts
    getParquetColumnNamesFromNeeded.test.ts
  queryableRelationColumns/
    queryableRelationColumns.ts
    queryableRelationColumns.test.ts
  relationLoading.ts                  keys, growFrom, project, write held columns
  getRelationSources.ts               probeRelationCache coverage
  queryRunner.ts                      thread the needed map
  __tests__/relationCacheOrdering.test.ts
  __tests__/relationCacheProjection.test.ts

src/clients/qetl/RelationCache/__tests__/
  createInMemoryRelationCache.ts      coversColumns + growFrom

src/lib/sql/__tests__/
  projectParquetBlob.executed.test.ts
```

`DatasetParquetWrapper` keeps ignoring `columns`. No UI files.
