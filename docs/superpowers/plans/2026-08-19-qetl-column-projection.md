# Column Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The mediator computes the columns a query needs, probes and caches with that set, and stores projected Parquet that preserves row order so a wider follow-up cannot false-hit.

**Architecture:** Needed columns come from SQL plus concept mappings (`getNeededColumnsFromQuery`). Probe both cache tiers with `coversColumns`. On a miss, acquire the union with `growFrom`, copy the blob down to that set (`projectParquetBlob`, no `DISTINCT`), and write what is held. Wrappers may ignore `AcquireRequest.columns`.

**Tech Stack:** TypeScript, Vitest, DuckDB (wasm in app, `@duckdb/node-api` in executed tests), Dexie relation cache, existing `coversColumns`.

**Spec:** `docs/superpowers/specs/2026-08-19-qetl-column-projection-design.md`

## Global Constraints

- TDD: failing test first, watch it fail, then implement.
- `docs/rules/typescript.md` bans `resolve…` / `_resolve…` conversion names. Use `get` / `make` / `to`.
- `probe` is reserved for `RelationCachePort`.
- Functions ≤ 45 lines.
- No Case Manager / ChatPanel / OntologyDesigner UI.
- No destructive git. Do not commit switched `supabase/config.toml` or `.env.development`.
- Demo bias: working projection path. Sheets/HDX may ignore `columns`.
- Stay in `feat/qetl-column-projection`. Do not `cd` into `feat/qetl-impl`.

## File structure

- Modify: `shared/models/relations/RelationCacheKey/RelationCacheKey.ts` — `normalizeColumns`, `unionColumnSets`
- Modify: `shared/models/relations/RelationCacheKey/RelationCacheKey.test.ts`
- Create: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts`
- Create: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`
- Create: `src/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded/getParquetColumnNamesFromNeeded.ts`
- Create: `src/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded/getParquetColumnNamesFromNeeded.test.ts`
- Create: `src/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns.ts`
- Create: `src/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns.test.ts`
- Create: `src/clients/DuckDbClient/projectParquetBlob/projectParquetBlob.ts`
- Create: `src/clients/DuckDbClient/projectParquetBlob/projectParquetBlob.test.ts`
- Modify: `src/clients/DuckDbClient/DuckDbClient.ts` — expose `projectParquetBlob`
- Modify: `src/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache.ts`
- Modify: `src/clients/qetl/QueryMediator/getRelationSources.ts` — `probeRelationCache` coverage
- Modify: `src/clients/qetl/QueryMediator/relationLoading.ts` — keys, growFrom, project, write
- Modify: `src/clients/qetl/QueryMediator/queryRunner.ts` — needed map
- Modify: `src/clients/qetl/QueryMediator/QueryMediator.types.ts` — `AcquiredRelationBytes.columns`
- Create: `src/clients/qetl/QueryMediator/__tests__/relationCacheProjection.test.ts`
- Create: `src/lib/sql/__tests__/projectParquetBlob.executed.test.ts`
- Create: `STATUS.md`

---

### Task 1: `unionColumnSets` and `normalizeColumns`

**Files:**

- Modify: `shared/models/relations/RelationCacheKey/RelationCacheKey.ts`
- Modify: `shared/models/relations/RelationCacheKey/RelationCacheKey.test.ts`

**Interfaces:**

- Consumes: `coversColumns` (already exported)
- Produces: `normalizeColumns(columns: readonly string[] | "all"): readonly string[] | "all"`; `unionColumnSets(left, right): readonly string[] | "all"`

- [ ] **Step 1: Write the failing tests**

Append to `RelationCacheKey.test.ts`, import the new names:

```ts
describe("normalizeColumns", () => {
  it("sorts and deduplicates a finite set, preserving case", () => {
    expect(normalizeColumns(["b", "a", "b", "A"])).toEqual(["A", "a", "b"]);
  });

  it("leaves 'all' alone", () => {
    expect(normalizeColumns("all")).toBe("all");
  });
});

describe("unionColumnSets", () => {
  it("returns 'all' when either side is 'all'", () => {
    expect(unionColumnSets("all", ["a"])).toBe("all");
    expect(unionColumnSets(["a"], "all")).toBe("all");
    expect(unionColumnSets("all", "all")).toBe("all");
  });

  it("sorts and deduplicates two finite sets, preserving case", () => {
    expect(unionColumnSets(["b"], ["a", "b"])).toEqual(["a", "b"]);
    expect(unionColumnSets(["A"], ["a"])).toEqual(["A", "a"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run shared/models/relations/RelationCacheKey/RelationCacheKey.test.ts`

Expected: FAIL, `normalizeColumns` / `unionColumnSets` are not exported.

- [ ] **Step 3: Implement**

In `RelationCacheKey.ts`:

```ts
/** Sorts and deduplicates a finite column set. `"all"` is unchanged. */
export function normalizeColumns(
  columns: readonly string[] | "all",
): readonly string[] | "all" {
  if (columns === "all") {
    return "all";
  }
  return [...new Set(columns)].sort();
}

/**
 * The column set that covers both sides. `"all"` absorbs anything; two
 * finite sets are sorted and deduplicated.
 */
export function unionColumnSets(
  left: readonly string[] | "all",
  right: readonly string[] | "all",
): readonly string[] | "all" {
  if (left === "all" || right === "all") {
    return "all";
  }
  return normalizeColumns([...left, ...right]);
}
```

Keep each function well under 45 lines. DexieRelationCache's private `_normalizeColumns` can later call `normalizeColumns`; not required in this task.

- [ ] **Step 4: Re-run tests**

Run: `pnpm exec vitest run shared/models/relations/RelationCacheKey/RelationCacheKey.test.ts`

Expected: PASS.

---

### Task 2: `getNeededColumnsFromQuery`

**Files:**

- Create: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts`
- Create: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`

**Interfaces:**

- Consumes: `ConceptRelationPlan`, `DuckDbSqlAnalyzer` tokenizer (`getSqlTokens`, `isKeywordToken`, `getKeywordIndex`, `getParenthesisDepths`), `unionColumnSets`, `normalizeColumns`
- Produces: `getNeededColumnsFromQuery({ rawSql, datasetIds, conceptRelations }): Record<string, readonly string[] | "all">`

A missing dataset id always gets `"all"` (fail wide).

- [ ] **Step 1: Write the failing tests**

```ts
/** Pins needed-column attribution from SQL and from concept plans. */

import { describe, expect, it } from "vitest";
import { getNeededColumnsFromQuery } from "@/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;

const CONCEPT_PLAN: ConceptRelationPlan = {
  ref: { kind: "concept", id: CONCEPT_ID },
  contributingDatasetIds: [DATASET_ID],
  externalIds: ["p1"],
  attributeColumns: [
    {
      kind: "dataset_column",
      attributeName: "age",
      selectColumnName: "age_years",
      datasetId: DATASET_ID,
      primaryKeyColumnName: "person_id",
      valuePickerRuleType: "first",
      isArray: false,
    },
  ],
};

describe("getNeededColumnsFromQuery", () => {
  it("takes identifier plus attribute columns from a concept plan even when the SQL names no dataset", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [CONCEPT_PLAN],
      }),
    ).toEqual({ [DATASET_ID]: ["age_years", "person_id"] });
  });

  it("reads an explicit select list from a single-dataset query", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT "status", "case_id" FROM "${DATASET_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: ["case_id", "status"] });
  });

  it("fails wide to 'all' for SELECT *", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT * FROM "${DATASET_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: "all" });
  });

  it("fails wide to 'all' when the SQL is not a readable statement", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: "not sql",
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: "all" });
  });

  it("unions SQL columns with concept columns for the same dataset", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT "status" FROM "${DATASET_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [CONCEPT_PLAN],
      })[DATASET_ID],
    ).toEqual(["age_years", "person_id", "status"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.test.ts`

Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

Keep helpers private and short.

`getNeededColumnsFromQuery.ts`:

- `_getConceptColumnsByDatasetId(plans)`: for each `dataset_column` attribute, union `selectColumnName` and `primaryKeyColumnName` into that dataset. Skip `unmapped`.
- `_getSqlColumnsByDatasetId(rawSql)`: tokenize. If analysis is not `read`, or a `*` appears at depth 0 in the select list (between SELECT and FROM), return a sentinel that the combiner treats as `"all"` for every dataset the SQL names (and, when analysis fails, for none — the combiner then fills remaining `datasetIds` with `"all"`).
- Collect identifiers at depth 0 in SELECT (skip the identifier after `AS`), plus WHERE / JOIN / GROUP / HAVING / ORDER. `table.col` binds to `table` when it is one of the SQL's dataset ids. Unqualified names bind only if the statement names exactly one dataset; otherwise fail wide for those datasets.
- Combiner: for each `datasetIds` entry, `unionColumnSets(sqlSet ?? [], conceptSet ?? [])`, empty → `"all"`. `SELECT *` / fail-wide SQL sets sqlSet to `"all"` for named datasets.

Use `DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql`. Catch throws from `getDatasetIdsFromSqlTableReferences` rather than calling the throwing helper: use `getDuckDbSqlAnalysisFromSql` and branch on `kind`.

Quote-stripped identifier values from the tokenizer are the column names (already unquoted).

- [ ] **Step 4: Re-run tests**

Expected: PASS.

---

### Task 3: Map query names to Parquet `originalName`

**Files:**

- Create: `src/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded/getParquetColumnNamesFromNeeded.ts`
- Create: `src/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded/getParquetColumnNamesFromNeeded.test.ts`

**Interfaces:**

- Consumes: `DatasetColumn.T` (`name`, `originalName`), `normalizeColumns`
- Produces: `getParquetColumnNamesFromNeeded({ needed, datasetColumns }): readonly string[] | "all"`

- [ ] **Step 1: Write the failing tests**

```ts
it("maps a renamed view name to originalName", () => {
  expect(
    getParquetColumnNamesFromNeeded({
      needed: ["display_status"],
      datasetColumns: [{ name: "display_status", originalName: "status" }],
    }),
  ).toEqual(["status"]);
});

it("keeps originalName when the query already used it", () => {
  expect(
    getParquetColumnNamesFromNeeded({
      needed: ["status"],
      datasetColumns: [{ name: "display_status", originalName: "status" }],
    }),
  ).toEqual(["status"]);
});

it("returns 'all' when needed is 'all'", () => {
  expect(
    getParquetColumnNamesFromNeeded({
      needed: "all",
      datasetColumns: [{ name: "a", originalName: "a" }],
    }),
  ).toBe("all");
});

it("stores 'all' when the finite set names every originalName", () => {
  expect(
    getParquetColumnNamesFromNeeded({
      needed: ["a", "b"],
      datasetColumns: [
        { name: "a", originalName: "a" },
        { name: "b", originalName: "b" },
      ],
    }),
  ).toBe("all");
});

it("passes unknown names through", () => {
  expect(
    getParquetColumnNamesFromNeeded({
      needed: ["ghost"],
      datasetColumns: [{ name: "a", originalName: "a" }],
    }),
  ).toEqual(["ghost"]);
});
```

Use the smallest DatasetColumn-shaped objects the function needs (`name` + `originalName`). Do not mock a full model if a narrow input type will do: define the param as `readonly { name: string; originalName: string }[]`.

- [ ] **Step 2: Run to verify fail**

Run: `pnpm exec vitest run src/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded/getParquetColumnNamesFromNeeded.test.ts`

- [ ] **Step 3: Implement**

`"all"` in → `"all"` out. Otherwise map each needed name: find a column where `name === needed || originalName === needed`, use `originalName`, else keep the name. Then `normalizeColumns`. If every schema `originalName` is in the result, return `"all"`. Empty schema: do not collapse to `"all"` (would lie); return the finite set.

- [ ] **Step 4: Re-run tests** — PASS.

---

### Task 4: In-memory cache fake implements `coversColumns` and `growFrom`

**Files:**

- Modify: `src/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache.ts`
- Create: `src/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache.test.ts`

**Interfaces:**

- Consumes: `coversColumns`, `normalizeColumns` from RelationCacheKey
- Produces: same `RelationCachePort`, but probe hits only on coverage; misses include `growFrom` when a live narrower entry exists

- [ ] **Step 1: Write the failing tests**

```ts
it("serves a subset of a cached finite set", async () => {
  const cache = createInMemoryRelationCache();
  await cache.write(_makeWrite({ columns: ["a", "b"] }));
  const { hits, misses } = await cache.probe([_makeKey({ columns: ["a"] })]);
  expect(hits).toHaveLength(1);
  expect(misses).toHaveLength(0);
});

it("misses a wider request and offers growFrom", async () => {
  const cache = createInMemoryRelationCache();
  await cache.write(_makeWrite({ columns: ["a"] }));
  const { hits, misses } = await cache.probe([
    _makeKey({ columns: ["a", "b"] }),
  ]);
  expect(hits).toHaveLength(0);
  expect(misses[0]?.growFrom?.columns).toEqual(["a"]);
});

it("serves any request from a cached 'all' entry", async () => {
  const cache = createInMemoryRelationCache();
  await cache.write(_makeWrite({ columns: "all" }));
  const { hits } = await cache.probe([_makeKey({ columns: ["a"] })]);
  expect(hits).toHaveLength(1);
});
```

Copy `_makeKey` / `_makeWrite` shapes from `DexieRelationCache.test.ts` (principal + dataset relation + columns). Use the same PRINCIPAL_KEY string the mediator tests use.

- [ ] **Step 2: Run to verify the subset test currently fails or the growFrom test fails** (today every stored entry is treated as a hit regardless of columns).

- [ ] **Step 3: Implement**

Store `write.columns` via `normalizeColumns`. `probe`: if no entry, miss with `growFrom: undefined`. If entry exists and `coversColumns(entry.columns, key.columns)`, hit. Else miss with `growFrom: entry`. `readPayload` unchanged. Update the file's doc comment: it now implements superset reuse.

- [ ] **Step 4: Re-run** — PASS. Also run `src/clients/qetl/QueryMediator/__tests__/relationCacheOrdering.test.ts` to confirm existing `"all"` seeds still hit.

---

### Task 5: Queryable-tier column coverage

**Files:**

- Create: `src/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns.ts`
- Create: `src/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns.test.ts`
- Modify: `src/clients/qetl/QueryMediator/getRelationSources.ts` — `probeRelationCache`

**Interfaces:**

- Produces: `rememberQueryableColumns(datasetId, columns)`, `forgetQueryableColumns(datasetId)`, `getQueryableColumns(datasetId): readonly string[] | "all" | undefined`
- `probeRelationCache(datasetIds, neededByDatasetId)`: miss if absent from DuckDB; miss if present but `coversColumns(loaded, needed)` is false; loaded defaults to `"all"` when the sidecar has no entry

- [ ] **Step 1: Write sidecar tests**

```ts
it("remembers a finite set until forgotten", () => {
  rememberQueryableColumns(DATASET_ID, ["a", "b"]);
  expect(getQueryableColumns(DATASET_ID)).toEqual(["a", "b"]);
  forgetQueryableColumns(DATASET_ID);
  expect(getQueryableColumns(DATASET_ID)).toBeUndefined();
});
```

Write `probeRelationCache` tests in the same file or in `getRelationSources` tests. Mock `DuckDbClient.getTableOrViewNames`. After remember `["a"]`, names include DATASET_ID, needed `["a","b"]` → still in the returned miss list. Needed `["a"]` → omitted. No sidecar + name present + needed `["a"]` → omitted (backward compatible `"all"`).

Export a `_resetQueryableRelationColumnsForTests` only if tests need isolation; prefer `forgetQueryableColumns` in `beforeEach` for the ids used. A module-level `clearQueryableRelationColumns()` for tests is acceptable if kept `*.test.ts`-only via calling a documented `clearQueryableRelationColumns` export used exclusively by tests — prefer `beforeEach` that forgets known ids to avoid a test-only production export.

Add `clearQueryableRelationColumns()` as a real function used by tests and by any future DuckDB reset. Document it as clearing the sidecar.

- [ ] **Step 2: Fail, then implement sidecar + change `probeRelationCache` signature.**

Callers of `probeRelationCache` will not compile until Task 6. That is expected if you change the signature now: either keep a default `needed = "all"` for every id when the second arg is omitted, or update `queryRunner` in the same task with a temporary `"all"` map so the tree typechecks.

**Do this:** second argument required. In this task, update `queryRunner.ts` to pass `"all"` for every dependency (temporary). Task 6 replaces that with the real map.

- [ ] **Step 3: Run**

`pnpm exec vitest run src/clients/qetl/QueryMediator/queryableRelationColumns src/clients/qetl/QueryMediator/__tests__/relationCacheOrdering.test.ts src/clients/qetl/QueryMediator/QueryMediator.coordination.test.ts src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts`

Expected: PASS (temporary `"all"` preserves current behaviour).

---

### Task 6: `projectParquetBlob`

**Files:**

- Create: `src/clients/DuckDbClient/projectParquetBlob/projectParquetBlob.ts`
- Create: `src/clients/DuckDbClient/projectParquetBlob/projectParquetBlob.test.ts`
- Modify: `src/clients/DuckDbClient/DuckDbClient.ts` — public method that delegates
- Modify: `src/clients/DuckDbClient/duckDbClientOperations.ts` — add `projectParquetBlob` only if extracted units need it; otherwise keep it on the client class only

**Interfaces:**

- Produces: `projectParquetBlob({ parquetBlob, columns, datasetDuckDbLease }): Promise<Blob>`
- SQL: `SELECT "c1", "c2" FROM read_parquet('$file$')` with `returnType: "parquet"` and `TRUSTED_INTERNAL_SQL`. No DISTINCT, GROUP BY, or ORDER BY.
- File name: `ava_proj_<uuid>` (not a RelationRef).

- [ ] **Step 1: Unit test with mocked DuckDB**

Mock `DuckDbClient.runRawQuery` and `getDb` (or pass operations). Assert:

1. The SQL starts with `SELECT` and contains the quoted column names and `read_parquet`.
2. The SQL does not contain `DISTINCT`, `GROUP BY`, or `ORDER BY`.
3. `runRawQuery` is called with `returnType: "parquet"`.
4. Empty `columns` throws before any DuckDB call.

`quoteSqlIdentifier` from `@avandar/utils/sql` (or `@utils/sql`).

- [ ] **Step 2: Fail, implement**

Implementation sketch using existing client ops (same pattern as `loadParquetIntoDuckDb`):

```ts
export async function projectParquetBlob(
  options: Readonly<{
    client: DuckDbClientOperations;
    parquetBlob: Blob;
    columns: readonly string[];
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<Blob> {
  if (options.columns.length === 0) {
    throw new Error("projectParquetBlob requires at least one column");
  }
  const fileName = `ava_proj_${uuid()}`;
  const db = await options.client.getDb();
  const blob =
    options.parquetBlob.type === MIMEType.APPLICATION_PARQUET
      ? options.parquetBlob
      : new Blob([options.parquetBlob], { type: MIMEType.APPLICATION_PARQUET });
  await registerParquetFile({ db, tableName: fileName, blob });
  try {
    const selectList = options.columns
      .map((column) => quoteSqlIdentifier(column))
      .join(", ");
    return await options.client.runRawQuery(
      `SELECT ${selectList} FROM read_parquet('$fileName$')`,
      {
        datasetDuckDbLease: options.datasetDuckDbLease,
        params: { fileName },
        returnType: "parquet",
        [TRUSTED_INTERNAL_SQL]: true,
      },
    );
  } finally {
    await db.dropFile(fileName);
  }
}
```

Keep under 45 lines; extract `_parquetBlobWithType` if needed.

Expose on `DuckDbClient`:

```ts
async projectParquetBlob(options: Omit<..., "client">): Promise<Blob> {
  return await projectParquetBlob({ ...options, client: this.#getOperations() });
}
```

- [ ] **Step 3: Re-run unit test** — PASS.

---

### Task 7: Thread needed columns through the runner and relation loading

**Files:**

- Modify: `src/clients/qetl/QueryMediator/QueryMediator.types.ts` — `AcquiredRelationBytes` gains `columns: readonly string[] | "all"`
- Modify: `src/clients/qetl/QueryMediator/queryRunner.ts`
- Modify: `src/clients/qetl/QueryMediator/relationLoading.ts`
- Create: `src/clients/qetl/QueryMediator/__tests__/relationCacheProjection.test.ts`

**Interfaces:**

- Consumes: Tasks 2–6
- Produces: probe/acquire/write using per-dataset column sets; projection on finite acquire sets; sidecar remember on load

- [ ] **Step 1: Write mediator tests first** (new file, same mock harness as `relationCacheOrdering.test.ts`)

Use `rawSql: `SELECT "a", "b" FROM "${DATASET_ID}"`` and mock `getQueryDependencies` to return `[DATASET_ID]`. Spy on registry acquire by mocking `createDefaultRegistry` / wrapper is heavy; simpler: seed the in-memory cache and assert `acquire` is not reached via `datasetGetAllMock` as today's ordering tests do, plus inspect `relationCache` writes.

Tests:

1. **Subset served by `"all"` cache.** Seed `columns: "all"`. Run `SELECT "a" FROM "<id>"`. `datasetGetAllMock` not called. Positive control: empty cache, same SQL, `datasetGetAllMock` is called.

2. **Finite cache does not serve a wider query.** Seed `columns: ["a"]`. Run `SELECT "a", "b" FROM "<id>"`. `datasetGetAllMock` is called (miss). After a successful fetch, `stored` columns cover `["a","b"]` (union). This requires mocking wrapper acquire to return a blob and mocking `projectParquetBlob` / `DuckDbClient.projectParquetBlob` to return that blob (or a distinct projected blob).

3. **Queryable sidecar blocks a wider follow-up.** `getTableOrViewNames` returns `[DATASET_ID]`, `rememberQueryableColumns(DATASET_ID, ["a"])`. Run `SELECT "a", "b"`. Storage is probed (datasetGetAll called if storage also misses).

Mock `DuckDbClient.projectParquetBlob` in this file to identity-return the input blob so jsdom tests do not boot wasm.

- [ ] **Step 2: Run to verify fail** (still probing `"all"`).

- [ ] **Step 3: Implement wiring**

`queryRunner._runLeasedQuery`:

1. `neededByDatasetId = getNeededColumnsFromQuery({ rawSql, datasetIds: queryDependencies, conceptRelations })`.
2. Fetch `DatasetColumnClient` **only if some value is finite**. Map through `getParquetColumnNamesFromNeeded`. Skip the client when every value is `"all"` (keeps the no-dataset-read cache-hit path).
3. `probeRelationCache(queryDependencies, neededByDatasetId)`.
4. Pass the needed map into `probeStorageRelationCache` and `fetchRelationBytes` / `loadRelationBytes`.

`relationLoading.ts`:

- Replace `_toWholeDatasetCacheKey` with `_toDatasetCacheKey({ datasetId, principalKey, columns })`.
- `probeStorageRelationCache`: probe those keys. Hits unchanged. Misses: return `{ uncachedDatasetIds, growFromByDatasetId }` or fold grow-from into fetch options.
- `_fetchRelationSource`: `acquire({ ref, columns: acquireSet })` where `acquireSet = unionColumnSets(needed, growFrom?.columns ?? [])`. If `acquireSet !== "all"`, `heldBlob = await DuckDbClient.projectParquetBlob({ parquetBlob, columns: acquireSet, datasetDuckDbLease })`. Return `{ datasetId, parquetBlob: heldBlob, columns: acquireSet }`.
- `loadRelationBytes`: `write({ columns: relation.columns, payload })`. `rememberQueryableColumns(datasetId, relation.columns)`.

When `acquireSet === "all"`, skip projection.

If `getParquetColumnNamesFromNeeded` collapsed the set to `"all"`, skip projection and write `"all"`.

- [ ] **Step 4: Run mediator tests + ordering + concepts + coordination**

```
pnpm exec vitest run \
  src/clients/qetl/QueryMediator/__tests__/relationCacheProjection.test.ts \
  src/clients/qetl/QueryMediator/__tests__/relationCacheOrdering.test.ts \
  src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts \
  src/clients/qetl/QueryMediator/QueryMediator.coordination.test.ts \
  src/clients/qetl/QueryMediator/getNeededColumnsFromQuery \
  src/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded \
  src/clients/qetl/QueryMediator/queryableRelationColumns \
  src/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache.test.ts \
  shared/models/relations/RelationCacheKey/RelationCacheKey.test.ts
```

Expected: PASS.

Update `AcquiredRelationBytes` call sites in tests that construct the type.

---

### Task 8: Executed projection proof + STATUS

**Files:**

- Create: `src/lib/sql/__tests__/projectParquetBlob.executed.test.ts`
- Create: `STATUS.md`

This test proves the SQL contract against real DuckDB (node-api), not wasm. It does **not** have to import `projectParquetBlob.ts` (that module talks wasm). Duplicate the SELECT list shape: `SELECT "a", "b" FROM …` with no DISTINCT.

- [ ] **Step 1: Write the executed test** (it will pass against DuckDB even before wasm wiring; it still pins the contract)

```ts
it("keeps row count and order when projecting two of three columns", async () => {
  await withDuckDb(async (connection) => {
    await connection.run(
      "CREATE TABLE src AS SELECT * FROM (VALUES (1,'x'), (2,'y'), (2,'z')) t(id, label, extra)",
    );
    await connection.run("COPY src TO 'src.parquet' (FORMAT PARQUET)");
    await connection.run(
      `COPY (SELECT id, label FROM read_parquet('src.parquet')) TO 'out.parquet' (FORMAT PARQUET)`,
    );
    const src = await connection.runAndReadAll(
      "SELECT id, label FROM read_parquet('src.parquet')",
    );
    const out = await connection.runAndReadAll(
      "SELECT * FROM read_parquet('out.parquet')",
    );
    expect(out.getRowObjects()).toEqual(src.getRowObjects());
    expect(Object.keys(out.getRowObjects()[0] ?? {}).sort()).toEqual([
      "id",
      "label",
    ]);
  });
});
```

If COPY-to-relative-path is disallowed in the harness, use `CREATE TABLE out AS SELECT id, label FROM src` and compare. The invariant is: no DISTINCT, same row count, same order, fewer columns.

- [ ] **Step 2: Run** `pnpm test:executed src/lib/sql/__tests__/projectParquetBlob.executed.test.ts`

- [ ] **Step 3: Write `STATUS.md`**

```md
# Lane F status

Column projection is in the mediator. Probe, acquire, and cache use
per-dataset column sets. Wrappers may still ignore `AcquireRequest.columns`;
the mediator projects the held blob before write. `ava_rows_` still supplies
`file_row_number`; projected files keep source row order (no DISTINCT).

Superset reuse: `"all"` serves a subset; a finite entry does not serve a
wider request; a partial miss acquires the union.

Ready to merge into `feat/qetl-impl`.
```

---

## Self-review

**Spec coverage:** needed columns (T2), parquet name mapping (T3), queryable coverage (T5), storage probe + growFrom + write (T4, T7), projection + row order (T6, T8), in-memory fake (T4), exit criteria (T7 tests 1–3, T8). Sheets/HDX ignore: no wrapper changes. Entity-key sort: omitted on purpose. UI: untouched.

**Placeholders:** none.

**Types:** `AcquiredRelationBytes.columns` is what `write` stores. `probeRelationCache(datasetIds, neededByDatasetId)` is the Task 5 signature Task 7 fills with real maps.
