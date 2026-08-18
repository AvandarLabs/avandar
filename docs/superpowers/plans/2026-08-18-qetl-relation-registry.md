# QETL Relation Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `datasets.source_type` match statements with a registry of typed source wrappers, so datasets, concepts and future APIs are one abstraction.

**Architecture:** A `RelationRef` names anything queryable. A `SourceWrapper` says how to fetch one kind of ref and declares its `RelationCapabilities`. A `RelationRegistry` maps ref to wrapper. `QueryMediator` (today `QetlClient`) dispatches on declared capability instead of on `source_type`. Behaviour change is **zero**: every existing source keeps its current behaviour, including Google Sheets throwing.

**Tech Stack:** TypeScript, `ts-pattern`, Vitest (jsdom project plus a new node project), `@duckdb/node-api`, DuckDB-Wasm, Dexie.

**Spec:** `docs/superpowers/specs/2026-08-18-qetl-relation-registry-design.md`

---

## Read this before trusting any code block

**The TypeScript in this plan is illustrative, not verified.** It was written
from type names checked against the repo, but the blocks themselves were never
compiled. A parallel session found them wrong in at least five places: incorrect
`vi.mock` specifiers (the real `DatasetClient` is one directory deeper than
sketched), a Task 7 fixture that violates this plan's own registration
invariant, **Task 11's `ConceptWrapper` capabilities declaring
`wholeRelationAcquirable: "yes"` with no `acquire`, which trips that same
invariant and made the registry throw at construction**,
`ConceptAttribute.dataType` being `AvaDataType` rather than `DuckDbDataType`,
and `structuredQueryToSql` fixtures that need real `Dataset` and
`DatasetColumn` models instead of object literals.

Note the pattern: **two of the five are the plan contradicting its own stated
invariant.** Treat an apparent conflict between a sample and a rule stated in
prose as the sample being wrong.

**The repository is the authority.** Read the real types before writing, and
treat a divergence between this plan and the code as the plan being wrong.
Report the divergence rather than bending the code to match.

## Conventions this plan follows

Read these before Task 1. They are enforced by `docs/rules/typescript.md` and
`docs/rules/testing.md`, and by the `avandar-code-review` skill.

- **Anything under `shared/` is Deno-reachable, so every import must carry its
  `.ts` extension.** Code under `src/` must not.
- `type`, never `interface`. `undefined`, never `null`. String literal unions,
  never enums. Named exports, never default.
- Non-exported top-level helpers are prefixed `_`.
- JSDoc on every exported symbol. Comments wrap at 80 characters and describe
  the present, never the past.
- **Do not write tests that restate the type system** (`docs/rules/testing.md`).
  A test asserting a field exists on a type is a plan failure; the compiler owns
  that. Test behaviour.
- Split test files live in `__tests__/`.
- **Naming correction, found during Task 2 dispatch.** `shared/models/` exposes
  types through **namespace merging**, not a `T`-suffixed alias. See
  `shared/models/ontology/Concept/Concept.ts`, which exports
  `ConceptModule as Concept` alongside `export namespace Concept` declaring
  `T` and `Id`. So the type is **`RelationRef.T`** and the functions are
  `RelationRef.toTableName` / `RelationRef.fromTableName`, all from one
  `RelationRef` symbol. Wherever a code sample below writes `RelationRefT`,
  read `RelationRef.T`, and import the single `RelationRef` symbol rather than
  two.

**Commands:**

| Purpose | Command |
|---|---|
| Frontend tests (jsdom) | `pnpm test:frontend <pattern>` |
| Executed tests (node, after Task 1) | `pnpm test:executed <pattern>` |
| Type check | `pnpm type-check` |

---

## File structure

| File | Responsibility |
|---|---|
| `vitest.executed.config.ts` | Second Vitest project, `environment: "node"` |
| `shared/models/relations/RelationRef/RelationRef.ts` | The ref union, and ref ↔ table-name conversion |
| `shared/models/relations/RelationCapabilities/RelationCapabilities.types.ts` | The twelve capability fields |
| `shared/models/relations/RelationSchema/RelationSchema.types.ts` | Columns without rows |
| `shared/models/relations/SourceWrapper/SourceWrapper.types.ts` | Wrapper interface, request and context types |
| `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types.ts` | Extended: `read` analysis carries `relations` |
| `src/clients/qetl/wrappers/extractReferencedRelations/` | Adapter: analysis → refs, throw → `unsupported` |
| `src/clients/qetl/RelationRegistry/RelationRegistry.ts` | Ref → wrapper resolution |
| `src/clients/qetl/wrappers/DatasetParquetWrapper/` | `csv_file`, `xlsx_file`, `open_data` |
| `src/clients/qetl/wrappers/VirtualDatasetWrapper/` | `virtual` |
| `src/clients/qetl/wrappers/GoogleSheetsWrapper/` | `google_sheets`: declares capabilities, still throws |
| `src/clients/qetl/wrappers/ConceptWrapper/` | `concept`: delegates to `AttributeAssertionClient` |
| `src/clients/qetl/QetlClient/getRelationSources.ts` | Renamed from `qetlDiceExtractors.ts`, registry-driven |

**Landing order rationale:** the harness (Task 1) and the types (Tasks 2 to 4)
are additive and land first. Characterization tests (Task 5) come **before** any
behaviour-bearing edit. Wrappers (Tasks 8 to 11) are added while the old match
statement still runs, so nothing breaks mid-plan. The cutover is Task 12 and the
renames are Task 13, last, once everything is green.

---

## Task 1: Executed test harness

Nothing else in this plan, or in specs 2 through 6, can assert that a query
returns the right rows until this exists. `vite.config.ts:207` sets
`environment: "jsdom"` for everything, and DuckDB-Wasm cannot run there.

**Files:**
- Modify: `package.json`
- Create: `vitest.executed.config.ts`
- Modify: `vite.config.ts` (exclude the executed pattern from the jsdom project)
- Create: `src/lib/sql/__tests__/harness.executed.test.ts`
- Modify: `scripts/runAllTests.sh`

- [ ] **Step 1: Install the Node DuckDB driver**

```bash
pnpm add -D @duckdb/node-api
```

- [ ] **Step 2: Write the failing harness test**

Create `src/lib/sql/__tests__/harness.executed.test.ts`. This test exists to
prove the harness can execute SQL and read rows back, which is the capability
every later task depends on.

```ts
import { DuckDBInstance } from "@duckdb/node-api";
import { describe, expect, it } from "vitest";

describe("executed test harness", () => {
  it("runs SQL against a real DuckDB and reads rows back", async () => {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    const reader = await connection.runAndReadAll(
      "SELECT 1 AS one, 'two' AS two",
    );

    expect(reader.getRowObjects()).toEqual([{ one: 1, two: "two" }]);
  });

  it("supports the DuckDB-only syntax our SQL uses", async () => {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    const reader = await connection.runAndReadAll(`
      SELECT * EXCLUDE (b) FROM (SELECT 1 AS a, 2 AS b)
    `);

    expect(reader.getRowObjects()).toEqual([{ a: 1 }]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run --config vitest.executed.config.ts`
Expected: FAIL, cannot resolve config file `vitest.executed.config.ts`.

- [ ] **Step 4: Create the Node project config**

Create `vitest.executed.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest project for tests that execute real SQL. Separate from the default
 * jsdom project because DuckDB cannot run under jsdom.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.executed.test.ts"],
    exclude: ["node_modules/**", "apps/**", "packages/**", "tests/e2e/**"],
  },
});
```

If `vite-tsconfig-paths` is not already a dependency, resolve the `@/` and `$/`
aliases by copying the `resolve.alias` block from `vite.config.ts:190-201`
instead of adding a plugin.

- [ ] **Step 5: Exclude executed tests from the jsdom project**

In `vite.config.ts`, add to the existing `test.exclude` array (currently at
`:209-216`), so a single `vitest run` does not try to run Node tests in jsdom:

```ts
      exclude: [
        ...defaultExclude,
        "tests/e2e/**/*.spec.ts",
        "**/*.executed.test.ts",
        ".agents/**",
        ".claude/**",
        "apps/**",
        "packages/**",
      ],
```

- [ ] **Step 6: Add the script**

In `package.json` `scripts`, after `"test:frontend"`:

```json
    "test:executed": "vitest run --config vitest.executed.config.ts",
```

- [ ] **Step 7: Run both projects to verify they pass and do not overlap**

Run: `pnpm test:executed`
Expected: PASS, 2 tests.

Run: `pnpm test:frontend harness`
Expected: PASS with **0 test files matched**, proving the jsdom project ignores
executed tests.

- [ ] **Step 8: Add to the full suite**

In `scripts/runAllTests.sh`, add `pnpm test:executed` alongside the existing
`pnpm test:frontend` invocation, matching the script's existing style.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts vitest.executed.config.ts \
  scripts/runAllTests.sh src/lib/sql/__tests__/harness.executed.test.ts
git commit -m "test(qetl): add executed test harness with @duckdb/node-api"
```

---

## Task 2: `RelationRef`

**Files:**
- Create: `shared/models/relations/RelationRef/RelationRef.ts`
- Test: `shared/models/relations/RelationRef/RelationRef.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/models/relations/RelationRef/RelationRef.test.ts`. Note the
`.ts` extensions on imports: this is `shared/`, which Deno reads.

```ts
import { describe, expect, it } from "vitest";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";

const DATASET_ID = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as DatasetId;
const CONCEPT_ID = "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1" as ConceptId;

describe("RelationRef", () => {
  it("keeps a dataset's table name as its bare id, so stored SQL keeps working", () => {
    expect(RelationRef.toTableName({ kind: "dataset", id: DATASET_ID })).toBe(
      DATASET_ID,
    );
  });

  it("reads a bare uuid back as a dataset", () => {
    expect(RelationRef.fromTableName(DATASET_ID)).toEqual({
      kind: "dataset",
      id: DATASET_ID,
    });
  });

  it("round-trips a concept through a prefixed table name", () => {
    const ref = { kind: "concept", id: CONCEPT_ID } as const;
    const tableName = RelationRef.toTableName(ref);

    expect(tableName).toBe(`concept_${CONCEPT_ID}`);
    expect(RelationRef.fromTableName(tableName)).toEqual(ref);
  });

  it("returns undefined for a name it does not own", () => {
    expect(RelationRef.fromTableName("not_a_relation")).toBeUndefined();
    expect(RelationRef.fromTableName("concept_nope")).toBeUndefined();
  });

  it("treats two refs of different kinds with the same uuid as distinct", () => {
    const asDataset = RelationRef.toTableName({
      kind: "dataset",
      id: DATASET_ID,
    });
    const asConcept = RelationRef.toTableName({
      kind: "concept",
      id: DATASET_ID as unknown as ConceptId,
    });

    expect(asDataset).not.toBe(asConcept);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend RelationRef`
Expected: FAIL, cannot resolve `$/models/relations/RelationRef/RelationRef.ts`.

- [ ] **Step 3: Implement `RelationRef`**

Create `shared/models/relations/RelationRef/RelationRef.ts`:

```ts
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";

/**
 * A reference to something queryable, independent of what backs it. `kind` is
 * the discriminant the relation registry dispatches on.
 */
export type RelationRefT =
  | { kind: "dataset"; id: DatasetId }
  | { kind: "concept"; id: ConceptId };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONCEPT_PREFIX = "concept_" as const;

/**
 * A dataset's table name is its bare id, with no prefix, so every stored
 * dashboard SQL string and bookmarked `?sql=` URL keeps resolving. Only kinds
 * added after datasets take a prefix, which makes a bare uuid always a dataset.
 */
function _toTableName(ref: RelationRefT): string {
  switch (ref.kind) {
    case "dataset": {
      return ref.id;
    }
    case "concept": {
      return `${CONCEPT_PREFIX}${ref.id}`;
    }
  }
}

/** Reads a DuckDB table name back into a ref, or `undefined` if we do not own it. */
function _fromTableName(tableName: string): RelationRefT | undefined {
  if (UUID_PATTERN.test(tableName)) {
    return { kind: "dataset", id: tableName as DatasetId };
  }
  if (tableName.startsWith(CONCEPT_PREFIX)) {
    const id = tableName.slice(CONCEPT_PREFIX.length);
    return UUID_PATTERN.test(id) ?
        { kind: "concept", id: id as ConceptId }
      : undefined;
  }
  return undefined;
}

/** Converts between a relation reference and the name SQL uses for it. */
export const RelationRef = {
  toTableName: _toTableName,
  fromTableName: _fromTableName,
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend RelationRef`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add shared/models/relations/RelationRef
git commit -m "feat(qetl): add RelationRef and table-name conversion"
```

---

## Task 3: `RelationCapabilities` and `RelationSchema`

Pure type declarations, so there is no behavioural test. Per
`docs/rules/testing.md`, do **not** write a test asserting these fields exist.
Task 7 tests capabilities where they carry behaviour: that every registered
wrapper declares one.

**Files:**
- Create: `shared/models/relations/RelationCapabilities/RelationCapabilities.types.ts`
- Create: `shared/models/relations/RelationSchema/RelationSchema.types.ts`

- [ ] **Step 1: Write `RelationCapabilities.types.ts`**

```ts
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";

/** The smallest thing one call to a source can fetch. */
export type AcquisitionUnit =
  | { kind: "whole-relation" }
  | { kind: "whole-range"; positionalSubranges: boolean }
  | { kind: "paged"; pageParam: string };

/** Who shares a source's rate limit. Project-global is the dangerous case. */
export type QuotaScope =
  | { kind: "none" }
  | { kind: "per-host"; host: string }
  | { kind: "project-global"; readsPerMinute: number }
  | { kind: "per-user"; readsPerMinute: number };

/**
 * What a source can and cannot be asked. The negative declarations carry the
 * weight: `rowIdentity: "none"` is what makes combining two partial fetches
 * from that source provably unsound, by declaration rather than by argument.
 */
export type RelationCapabilities = {
  /**
   * How many relations one `RelationRef` exposes. A dataset or a concept is
   * one; a Google spreadsheet is many, one per named tab.
   */
  relations: "single" | "named-tabs" | "tables";

  /** The smallest thing one call can fetch. Not what we want; what it gives. */
  acquisitionUnit: AcquisitionUnit;

  /** Whether a filter can be sent to the source, so it returns fewer rows. */
  predicatePushdown: "none" | "equality" | "range" | "full";

  /** Whether the source can compute an aggregate rather than return rows. */
  aggregatePushdown: boolean;

  /** Whether the whole relation can be fetched. `probe` when it is per-resource. */
  wholeRelationAcquirable: "yes" | "no" | "probe";

  /** Hard row ceiling per call, which forces paging. */
  maxRowsPerCall: number | "unbounded";

  /** Hard byte ceiling per call. Sheets caps bytes where CKAN caps rows. */
  maxBytesPerCall: number | "unbounded";

  /** A cheap token that says the source changed, without refetching it. */
  freshnessSignal: "none" | "version-token" | "etag" | "modified-time";

  /** A per-row id stable across fetches. Without one, no delta and no union. */
  rowIdentity: "none" | "positional" | "stable-key";

  /** Whether several calls building one result see a single snapshot. */
  multiCallAtomicity: boolean;

  /** Who shares the rate limit. */
  quotaScope: QuotaScope;

  /** OAuth or API scopes actually granted, if any. */
  grantedScope: readonly string[];
};

/** A source version token, compared for equality and never parsed. */
export type SourceVersion = string;

export type { DuckDbDataType };
```

- [ ] **Step 2: Write `RelationSchema.types.ts`**

```ts
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";

/** One column of a relation, without any of its rows. */
export type RelationColumn = {
  name: string;
  dataType: DuckDbDataType;
};

/** A relation's columns, resolved without acquiring its rows. */
export type RelationSchema = {
  columns: readonly RelationColumn[];
};
```

- [ ] **Step 3: Type check**

Run: `pnpm type-check`
Expected: PASS. If `DuckDbDataTypes.ts` does not export `DuckDbDataType`,
confirm the exported name with
`grep -n "export type" shared/models/datasets/DatasetColumn/DuckDbDataTypes.ts`
and use that name.

- [ ] **Step 4: Commit**

```bash
git add shared/models/relations/RelationCapabilities shared/models/relations/RelationSchema
git commit -m "feat(qetl): declare RelationCapabilities and RelationSchema types"
```

---

## Task 4: `SourceWrapper`

**Files:**
- Create: `shared/models/relations/SourceWrapper/SourceWrapper.types.ts`

- [ ] **Step 1: Write the interface**

`acquire` and `pushDown` are both optional. Which one a wrapper implements is
what its capability record declares, so the mediator narrows on the record and
the compiler then guarantees the method exists. Asking a source to do something
it cannot do is unrepresentable rather than a runtime throw.

```ts
import type { ILogger } from "@avandar/logger";
import type { UnknownRow } from "$/models/queries/QueryResult/QueryResult.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type {
  RelationCapabilities,
  SourceVersion,
} from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef.ts";
import type { RelationSchema } from "$/models/relations/RelationSchema/RelationSchema.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

/**
 * Ambient identity and services a wrapper needs. Injected, never imported, so
 * this module stays free of Avandar's auth and of any client singleton.
 */
export type WrapperContext = {
  workspaceId: Workspace.Id;
  logger: ILogger;
};

/** One relation's bytes, ready to load into the queryable relation cache. */
export type AcquiredRelation = {
  ref: RelationRefT;
  parquetBlob: Blob;
  sourceVersion: SourceVersion | undefined;
};

/** A request to fetch a relation's rows. */
export type AcquireRequest<TRef extends RelationRefT = RelationRefT> = {
  ref: TRef;
  /**
   * The columns the caller needs, or `all`. A wrapper that can project at the
   * source should; the rest may ignore this and return every column, which is
   * always correct because a returned superset satisfies the request.
   */
  columns: readonly string[] | "all";
};

/** A request for the source itself to answer a query. */
export type PushDownRequest<TRef extends RelationRefT = RelationRefT> = {
  ref: TRef;
  sql: string;
};

/**
 * How one kind of source is asked for data. Wiederhold's wrapper: it translates
 * to and from one source's native, capability-limited interface, and knows
 * nothing about caching or authorization.
 */
export type SourceWrapper<TRef extends RelationRefT = RelationRefT> = {
  /** Stable identifier for logs, telemetry and the quota counter. */
  readonly name: string;

  /** What this source can and cannot be asked. */
  readonly capabilities: RelationCapabilities;

  /** Whether this wrapper handles the given reference. */
  handles: (ref: RelationRefT) => ref is TRef;

  /** The relation's columns, without acquiring its rows. */
  describe: (ref: TRef, ctx: WrapperContext) => Promise<RelationSchema>;

  /** A token that changes when the source changes. */
  readFreshness?: (ref: TRef, ctx: WrapperContext) => Promise<SourceVersion>;

  /** Fetch rows. Present only when the capabilities declare acquisition. */
  acquire?: (
    req: AcquireRequest<TRef>,
    ctx: WrapperContext,
  ) => Promise<AcquiredRelation>;

  /** Ask the source to answer. Present only when pushdown is declared. */
  pushDown?: (
    req: PushDownRequest<TRef>,
    ctx: WrapperContext,
  ) => Promise<QueryResult.T<UnknownRow>>;
};
```

- [ ] **Step 2: Type check**

Run: `pnpm type-check`
Expected: PASS. If `QueryResult.ts` does not export `UnknownRow`, import it from
`@/clients/DuckDbClient/DuckDbClient` in the wrapper implementations instead and
drop it from this shared type by declaring
`pushDown?: (...) => Promise<QueryResult.T<Record<string, unknown>>>`.

- [ ] **Step 3: Commit**

```bash
git add shared/models/relations/SourceWrapper
git commit -m "feat(qetl): declare the SourceWrapper interface"
```

---

## Task 5: Characterize the current source dispatch

**Do this before any behaviour-bearing edit.** `getDiceExtractors` has no direct
test. A characterization test records what the code does now, including what is
wrong, so a refactor that changes behaviour fails loudly.

**Files:**
- Create: `src/clients/qetl/QetlClient/__tests__/qetlDiceExtractors.characterization.test.ts`

- [ ] **Step 1: Read the code under test**

Read `src/clients/qetl/QetlClient/qetlDiceExtractors.ts` in full, in particular
`_getExtractorsForSourceType` at `:107` and `getDiceExtractors` at `:138`. Note
that each `_get*Extractors` helper calls a different source client
(`CsvFileDatasetClient`, `XlsxFileDatasetClient`, `VirtualDatasetClient`,
`OpenDataDatasetClient`) through `withCache(AvaQueryClient).withEnsureQueryData()`.

- [ ] **Step 2: Write the characterization test**

Mock the dataset clients, then assert the shape `getDiceExtractors` returns for
each source type, and that `google_sheets` throws.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const CSV_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const SHEETS_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const VIRTUAL_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;

const { datasetGetAllMock, csvGetAllMock, virtualGetAllMock } = vi.hoisted(
  () => {
    return {
      datasetGetAllMock: vi.fn(),
      csvGetAllMock: vi.fn(),
      virtualGetAllMock: vi.fn(),
    };
  },
);

function _withCacheChain(getAll: ReturnType<typeof vi.fn>) {
  return {
    withCache: () => {
      return { withEnsureQueryData: () => ({ getAll }) };
    },
  };
}

vi.mock("@/clients/datasets/DatasetClient", () => {
  return { DatasetClient: _withCacheChain(datasetGetAllMock) };
});
vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return { CsvFileDatasetClient: _withCacheChain(csvGetAllMock) };
});
vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return { VirtualDatasetClient: _withCacheChain(virtualGetAllMock) };
});

function _dataset(id: Dataset.Id, sourceType: Dataset.T["sourceType"]) {
  return { id, name: `dataset-${id}`, sourceType } as Dataset.T;
}

describe("getDiceExtractors characterization", () => {
  beforeEach(() => {
    vi.resetModules();
    datasetGetAllMock.mockReset();
    csvGetAllMock.mockReset();
    virtualGetAllMock.mockReset();
  });

  it("pairs a csv dataset with its source record", async () => {
    datasetGetAllMock.mockResolvedValue([_dataset(CSV_ID, "csv_file")]);
    csvGetAllMock.mockResolvedValue([{ datasetId: CSV_ID }]);

    const { getDiceExtractors } = await import(
      "@/clients/qetl/QetlClient/qetlDiceExtractors"
    );

    await expect(getDiceExtractors([CSV_ID])).resolves.toEqual([
      {
        sourceType: "csv_file",
        dataset: expect.objectContaining({ id: CSV_ID }),
        sourceDataset: { datasetId: CSV_ID },
      },
    ]);
  });

  it("pairs a virtual dataset with its source record", async () => {
    datasetGetAllMock.mockResolvedValue([_dataset(VIRTUAL_ID, "virtual")]);
    virtualGetAllMock.mockResolvedValue([{ datasetId: VIRTUAL_ID }]);

    const { getDiceExtractors } = await import(
      "@/clients/qetl/QetlClient/qetlDiceExtractors"
    );

    await expect(getDiceExtractors([VIRTUAL_ID])).resolves.toEqual([
      {
        sourceType: "virtual",
        dataset: expect.objectContaining({ id: VIRTUAL_ID }),
        sourceDataset: { datasetId: VIRTUAL_ID },
      },
    ]);
  });

  it("throws for google sheets, which is the behaviour to preserve", async () => {
    datasetGetAllMock.mockResolvedValue([
      _dataset(SHEETS_ID, "google_sheets"),
    ]);

    const { getDiceExtractors } = await import(
      "@/clients/qetl/QetlClient/qetlDiceExtractors"
    );

    await expect(getDiceExtractors([SHEETS_ID])).rejects.toThrow(
      "Google Sheets extraction is not supported yet",
    );
  });

  it("returns nothing for no dependencies", async () => {
    datasetGetAllMock.mockResolvedValue([]);

    const { getDiceExtractors } = await import(
      "@/clients/qetl/QetlClient/qetlDiceExtractors"
    );

    await expect(getDiceExtractors([])).resolves.toEqual([]);
  });
});
```

- [ ] **Step 3: Run it**

Run: `pnpm test:frontend qetlDiceExtractors`
Expected: PASS, 4 tests. **If a test fails, the mock is wrong, not the code.**
Fix the mock until the tests describe the code as it is. Adjust the mocked
module paths to the real import specifiers in `qetlDiceExtractors.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/clients/qetl/QetlClient/__tests__/qetlDiceExtractors.characterization.test.ts
git commit -m "test(qetl): characterize source dispatch before refactor"
```

---

## Task 6: Extend `DuckDbSqlAnalyzer` to return `RelationRef[]`

The analyzer already ignores UUID string literals, scopes CTE aliases, separates
mutation targets from reads, tolerates `QUALIFY` and `EXCLUDE`, and fails closed.
**Do not rewrite it.** Only the return type changes, so it can name a concept.

**Files:**
- Modify: `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types.ts`
- Modify: `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.ts`
- Test: `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.test.ts`. Read the
existing tests first and match their helper style.

```ts
  it("returns a prefixed concept table as a concept relation", () => {
    const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
      `SELECT * FROM "concept_9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1"`,
    );

    expect(analysis).toEqual({
      kind: "read",
      relations: [
        {
          kind: "concept",
          id: "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1",
        },
      ],
    });
  });

  it("returns a bare uuid table as a dataset relation", () => {
    const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
      `SELECT * FROM "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6"`,
    );

    expect(analysis).toEqual({
      kind: "read",
      relations: [
        { kind: "dataset", id: "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" },
      ],
    });
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend DuckDbSqlAnalyzer`
Expected: FAIL on both new tests, because the analysis carries `datasetIds`,
not `relations`. **Every pre-existing test in this file must still pass**; if
one fails, stop and re-read the change.

- [ ] **Step 3: Widen the token recognizer**

The analyzer currently accepts only bare-UUID table tokens. In
`src/lib/sql/DuckDbSqlAnalyzer/duckDbSqlIdentifiers.ts`, find the UUID check
that decides whether a token is a dataset table and widen it to accept a
`concept_`-prefixed uuid as well, returning the ref rather than the id string.
Use `RelationRef.fromTableName` so the encoding lives in exactly one place:

```ts
import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
```

- [ ] **Step 4: Rename the analysis field**

In `DuckDbSqlAnalyzer.types.ts`, change the `read` variant from
`datasetIds: string[]` to `relations: RelationRefT[]`, and change the
`unsafe` and `mutating` variants' id arrays the same way. Follow the compiler:
`pnpm type-check` lists every site.

- [ ] **Step 5: Keep the dataset-only entry point working**

`WorkspaceQetlClient.ts:118-125` and `PublicQetlClient` call
`getDatasetIdsFromSqlTableReferences` and expect `Dataset.Id[]`. Keep that
function, implemented over the new field, so this task changes no caller:

```ts
/** Returns UUID table sources, rejecting incomplete or mutating analysis. */
function _getDatasetIdsFromSqlTableReferences(sql: string): string[] {
  return _getRelationsFromSqlTableReferences(sql)
    .filter((ref) => {
      return ref.kind === "dataset";
    })
    .map((ref) => {
      return ref.id;
    });
}
```

Add `getRelationsFromSqlTableReferences` to the exported `DuckDbSqlAnalyzer`
object beside it, with the same fail-closed `throw`.

- [ ] **Step 6: Run the full analyzer suite**

Run: `pnpm test:frontend DuckDbSqlAnalyzer`
Expected: PASS, 24 tests (the 22 that existed plus the 2 added).

- [ ] **Step 7: Commit**

```bash
git add src/lib/sql/DuckDbSqlAnalyzer shared/models/relations
git commit -m "feat(qetl): analyze SQL into RelationRefs, not just dataset ids"
```

---

## Task 7: `RelationRegistry`

**Files:**
- Create: `src/clients/qetl/RelationRegistry/RelationRegistry.ts`
- Test: `src/clients/qetl/RelationRegistry/RelationRegistry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createRelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type {
  RelationRefT,
} from "$/models/relations/RelationRef/RelationRef";
import type { SourceWrapper } from "$/models/relations/SourceWrapper/SourceWrapper.types";

const CAPABILITIES = {
  relations: "single",
  acquisitionUnit: { kind: "whole-relation" },
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",
  freshnessSignal: "none",
  rowIdentity: "positional",
  multiCallAtomicity: true,
  quotaScope: { kind: "none" },
  grantedScope: [],
} satisfies RelationCapabilities;

function _fakeWrapper(kind: RelationRefT["kind"]): SourceWrapper {
  return {
    name: `fake-${kind}`,
    capabilities: CAPABILITIES,
    handles: (ref): ref is RelationRefT => {
      return ref.kind === kind;
    },
    describe: vi.fn(),
  };
}

const DATASET_REF = {
  kind: "dataset",
  id: "11111111-1111-4111-8111-111111111111",
} as RelationRefT;

const CONCEPT_REF = {
  kind: "concept",
  id: "22222222-2222-4222-8222-222222222222",
} as RelationRefT;

describe("RelationRegistry", () => {
  it("resolves a ref to the wrapper that handles it", () => {
    const registry = createRelationRegistry([
      _fakeWrapper("dataset"),
      _fakeWrapper("concept"),
    ]);

    expect(registry.resolve(CONCEPT_REF)?.name).toBe("fake-concept");
  });

  it("returns undefined rather than throwing for an unhandled ref", () => {
    const registry = createRelationRegistry([_fakeWrapper("dataset")]);

    expect(registry.resolve(CONCEPT_REF)).toBeUndefined();
  });

  it("separates resolved from unresolved so callers can ask for clarification", () => {
    const registry = createRelationRegistry([_fakeWrapper("dataset")]);

    const result = registry.resolveAll([DATASET_REF, CONCEPT_REF]);

    expect(result.resolved).toHaveLength(1);
    expect(result.unresolved).toEqual([CONCEPT_REF]);
  });

  it("rejects two wrappers claiming the same kind, which is a wiring bug", () => {
    expect(() => {
      return createRelationRegistry([
        _fakeWrapper("dataset"),
        _fakeWrapper("dataset"),
      ]);
    }).toThrow(/already registered/i);
  });

  it("gives every registered wrapper a capability declaration", () => {
    const registry = createRelationRegistry([
      _fakeWrapper("dataset"),
      _fakeWrapper("concept"),
    ]);

    for (const wrapper of registry.wrappers()) {
      expect(wrapper.capabilities.predicatePushdown).toBeDefined();
      expect(wrapper.capabilities.rowIdentity).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend RelationRegistry`
Expected: FAIL, cannot resolve `createRelationRegistry`.

- [ ] **Step 2a: Add the capability/method consistency invariant**

Added after the Tasks 3+4 review. `capabilities` and the `acquire` / `pushDown`
methods are **independent fields**, so nothing stops a wrapper declaring
`predicatePushdown: "full"` while omitting `pushDown`, or declaring
`wholeRelationAcquirable: "yes"` while omitting `acquire`. A type-level fix
(making `SourceWrapper` a discriminated union) would force every wrapper,
including the ones that declare "none", to thread a variant tag through, which
is real complexity for a mostly documentary benefit.

Assert it at **registration** instead, where it is one check covering every
wrapper, and where a wiring bug surfaces at startup rather than mid-query:

```ts
function _assertCapabilitiesMatchMethods(wrapper: SourceWrapper): void {
  const { capabilities, name } = wrapper;
  if (capabilities.predicatePushdown !== "none" && !wrapper.pushDown) {
    throw new Error(
      `Wrapper '${name}' declares predicatePushdown ` +
        `'${capabilities.predicatePushdown}' but implements no pushDown.`,
    );
  }
  if (capabilities.wholeRelationAcquirable !== "no" && !wrapper.acquire) {
    throw new Error(
      `Wrapper '${name}' declares wholeRelationAcquirable ` +
        `'${capabilities.wholeRelationAcquirable}' but implements no acquire.`,
    );
  }
}
```

Add two tests to the registry suite: a wrapper declaring pushdown without a
`pushDown` method throws, and one declaring acquirability without `acquire`
throws. Both messages must name the offending wrapper.

- [ ] **Step 3: Implement the registry**

```ts
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef";
import type { SourceWrapper } from "$/models/relations/SourceWrapper/SourceWrapper.types";

/** A ref paired with the wrapper that handles it. */
export type ResolvedRelation = {
  ref: RelationRefT;
  wrapper: SourceWrapper;
};

/** Refs that resolved, and refs no wrapper claimed. */
export type ResolvedRelations = {
  resolved: readonly ResolvedRelation[];
  unresolved: readonly RelationRefT[];
};

/** Maps a relation reference to the wrapper that knows how to fetch it. */
export type RelationRegistry = {
  resolve: (ref: RelationRefT) => SourceWrapper | undefined;
  resolveAll: (refs: readonly RelationRefT[]) => ResolvedRelations;
  wrappers: () => readonly SourceWrapper[];
};

/**
 * Builds a registry from an explicit wrapper list. Construction is injected
 * rather than module-level so a test can build a registry of one fake wrapper.
 */
export function createRelationRegistry(
  wrappers: readonly SourceWrapper[],
): RelationRegistry {
  const claimedKinds = new Set<string>();
  for (const wrapper of wrappers) {
    for (const kind of ["dataset", "concept"] as const) {
      if (!wrapper.handles({ kind, id: _PROBE_ID } as RelationRefT)) {
        continue;
      }
      if (claimedKinds.has(kind)) {
        throw new Error(
          `Relation kind '${kind}' is already registered; two wrappers ` +
            `claim it, which makes resolution order load-bearing.`,
        );
      }
      claimedKinds.add(kind);
    }
  }

  return {
    resolve: (ref) => {
      return wrappers.find((wrapper) => {
        return wrapper.handles(ref);
      });
    },

    resolveAll: (refs) => {
      const resolved: ResolvedRelation[] = [];
      const unresolved: RelationRefT[] = [];
      for (const ref of refs) {
        const wrapper = wrappers.find((candidate) => {
          return candidate.handles(ref);
        });
        if (wrapper) {
          resolved.push({ ref, wrapper });
        } else {
          unresolved.push(ref);
        }
      }
      return { resolved, unresolved };
    },

    wrappers: () => {
      return wrappers;
    },
  };
}

/** Probe id used only to ask a wrapper which kinds it claims. */
const _PROBE_ID = "00000000-0000-4000-8000-000000000000";
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend RelationRegistry`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/RelationRegistry
git commit -m "feat(qetl): add RelationRegistry resolving refs to wrappers"
```

---

## Task 8: `extractReferencedRelations` adapter

**Files:**
- Create: `src/clients/qetl/wrappers/extractReferencedRelations/extractReferencedRelations.ts`
- Test: `src/clients/qetl/wrappers/extractReferencedRelations/extractReferencedRelations.test.ts`

- [ ] **Step 1: Write the failing test**

The analyzer's own 22 tests already cover CTE aliases, string literals, mutation
targets and DuckDB syntax. **Do not duplicate them.** Test only the adapter's
two jobs: convert an analysis into refs, and convert a `throw` into
`unsupported` and never an empty list.

```ts
import { describe, expect, it } from "vitest";
import { extractReferencedRelations } from "@/clients/qetl/wrappers/extractReferencedRelations/extractReferencedRelations";

const DATASET_ID = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6";
const CONCEPT_ID = "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1";

describe("extractReferencedRelations", () => {
  it("returns the relations a read statement touches", () => {
    const result = extractReferencedRelations(
      `SELECT * FROM "${DATASET_ID}" JOIN "concept_${CONCEPT_ID}" USING (id)`,
    );

    expect(result).toEqual({
      outcome: "ok",
      relations: [
        { kind: "dataset", id: DATASET_ID },
        { kind: "concept", id: CONCEPT_ID },
      ],
    });
  });

  it("reports unsupported for a mutating statement, never an empty list", () => {
    const result = extractReferencedRelations(
      `CREATE TABLE "${DATASET_ID}" AS SELECT 1`,
    );

    expect(result.outcome).toBe("unsupported");
    expect(result).not.toHaveProperty("relations");
  });

  it("reports unsupported for SQL it cannot analyze safely", () => {
    const result = extractReferencedRelations(`SELECT * FROM read_csv(?)`);

    expect(result.outcome).toBe("unsupported");
  });

  it("reports unsupported for an empty statement", () => {
    expect(extractReferencedRelations("").outcome).toBe("unsupported");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend extractReferencedRelations`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Implement the adapter**

An empty relation list must never be the answer to "analysis failed". An empty
list reads as "this statement touches nothing", so the authorization check spec
2 adds would pass and cached rows would be served with no access check at all.

```ts
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef";

/**
 * The relations a statement reads, or `unsupported` when they cannot be
 * determined. There is deliberately no third case: a caller that cannot learn
 * what a statement touches must refuse to run it.
 */
export type ExtractReferencedRelationsResult =
  | { outcome: "ok"; relations: readonly RelationRefT[] }
  | { outcome: "unsupported"; reason: string };

/**
 * Converts DuckDB SQL into the relations it reads. Fails closed: any statement
 * the analyzer cannot fully account for is `unsupported`, never an empty list,
 * because an empty list would let an access check pass vacuously.
 */
export function extractReferencedRelations(
  sql: string,
): ExtractReferencedRelationsResult {
  try {
    return {
      outcome: "ok",
      relations: DuckDbSqlAnalyzer.getRelationsFromSqlTableReferences(sql),
    };
  } catch (error) {
    return {
      outcome: "unsupported",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend extractReferencedRelations`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/wrappers/extractReferencedRelations
git commit -m "feat(qetl): add extractReferencedRelations, failing closed"
```

---

## Task 9: `DatasetParquetWrapper`

Covers `csv_file`, `xlsx_file` and `open_data`: the three source types whose
rows already arrive as Parquet. Behaviour must be identical to the
`_getCsvExtractors` / `_getXlsxExtractors` / `_getOpenDataExtractors` path.

**Files:**
- Create: `src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.ts`
- Test: `src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createDatasetParquetWrapper } from "@/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef";

const DATASET_REF = {
  kind: "dataset",
  id: "11111111-1111-4111-8111-111111111111",
} as RelationRefT;

const CONCEPT_REF = {
  kind: "concept",
  id: "22222222-2222-4222-8222-222222222222",
} as RelationRefT;

describe("DatasetParquetWrapper", () => {
  it("handles dataset refs and not concept refs", () => {
    const wrapper = createDatasetParquetWrapper();

    expect(wrapper.handles(DATASET_REF)).toBe(true);
    expect(wrapper.handles(CONCEPT_REF)).toBe(false);
  });

  it("declares no pushdown, so the mediator acquires instead of asking", () => {
    const wrapper = createDatasetParquetWrapper();

    expect(wrapper.capabilities.predicatePushdown).toBe("none");
    expect(wrapper.capabilities.wholeRelationAcquirable).toBe("yes");
    expect(wrapper.pushDown).toBeUndefined();
    expect(wrapper.acquire).toBeDefined();
  });

  it("returns every column when the request asks for all of them", async () => {
    const fetchParquet = vi.fn().mockResolvedValue(new Blob(["parquet"]));
    const wrapper = createDatasetParquetWrapper({ fetchParquet });

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      { workspaceId: "w" as never, logger: console as never },
    );

    expect(acquired.ref).toEqual(DATASET_REF);
    expect(fetchParquet).toHaveBeenCalledWith(DATASET_REF);
  });

  it("ignores a column subset for now, which is sound because a superset satisfies it", async () => {
    const fetchParquet = vi.fn().mockResolvedValue(new Blob(["parquet"]));
    const wrapper = createDatasetParquetWrapper({ fetchParquet });

    await wrapper.acquire!(
      { ref: DATASET_REF, columns: ["a"] },
      { workspaceId: "w" as never, logger: console as never },
    );

    expect(fetchParquet).toHaveBeenCalledWith(DATASET_REF);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend DatasetParquetWrapper`
Expected: FAIL, cannot resolve `createDatasetParquetWrapper`.

- [ ] **Step 3: Implement the wrapper**

Read `_getCsvExtractors`, `_getXlsxExtractors` and `_getOpenDataExtractors` in
`qetlDiceExtractors.ts` and `qetlFactLoading.ts` first, and route `fetchParquet`
to whatever those already call so behaviour does not change. Inject
`fetchParquet` so the test above needs no client mocks.

```ts
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";

type DatasetRef = Extract<RelationRefT, { kind: "dataset" }>;

const CAPABILITIES = {
  relations: "single",
  acquisitionUnit: { kind: "whole-relation" },
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",
  freshnessSignal: "none",
  rowIdentity: "positional",
  multiCallAtomicity: true,
  quotaScope: { kind: "none" },
  grantedScope: [],
} satisfies RelationCapabilities;

type Options = {
  fetchParquet?: (ref: DatasetRef) => Promise<Blob>;
};

/**
 * Acquires the dataset source types whose rows already exist as Parquet:
 * `csv_file`, `xlsx_file` and `open_data`.
 */
export function createDatasetParquetWrapper(
  options: Options = {},
): SourceWrapper<DatasetRef> {
  const fetchParquet = options.fetchParquet ?? _fetchParquetFromStorage;

  return {
    name: "dataset-parquet",
    capabilities: CAPABILITIES,

    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },

    describe: async (ref) => {
      return { columns: await _readDatasetColumns(ref) };
    },

    acquire: async ({ ref }): Promise<AcquiredRelation> => {
      return {
        ref,
        parquetBlob: await fetchParquet(ref),
        sourceVersion: undefined,
      };
    },
  };
}
```

Implement `_fetchParquetFromStorage` and `_readDatasetColumns` by moving the
existing logic, unchanged, out of `qetlFactLoading.ts` and the dataset column
client. Use `RelationRef.toTableName(ref)` wherever the old code used the bare
dataset id as a table name.

- [ ] **Step 4: Run both suites**

Run: `pnpm test:frontend DatasetParquetWrapper`
Expected: PASS, 4 tests.

Run: `pnpm test:frontend qetlDiceExtractors`
Expected: PASS, 4 tests still green. The old path is untouched so far.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/wrappers/DatasetParquetWrapper
git commit -m "feat(qetl): add DatasetParquetWrapper for csv, xlsx and open data"
```

---

## Task 10: `VirtualDatasetWrapper` and `GoogleSheetsWrapper`

Two small wrappers, together because neither is more than a capability
declaration plus the behaviour that already exists.

**Files:**
- Create: `src/clients/qetl/wrappers/VirtualDatasetWrapper/VirtualDatasetWrapper.ts`
- Create: `src/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper.ts`
- Test: `src/clients/qetl/wrappers/__tests__/wrapperCapabilities.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createGoogleSheetsWrapper } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import { createVirtualDatasetWrapper } from "@/clients/qetl/wrappers/VirtualDatasetWrapper/VirtualDatasetWrapper";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef";

const DATASET_REF = {
  kind: "dataset",
  id: "11111111-1111-4111-8111-111111111111",
} as RelationRefT;

const CONTEXT = {
  workspaceId: "w" as never,
  logger: console as never,
};

describe("VirtualDatasetWrapper", () => {
  it("declares no freshness signal, recording that a definition edit is not detected", () => {
    expect(createVirtualDatasetWrapper().capabilities.freshnessSignal).toBe(
      "none",
    );
  });
});

describe("GoogleSheetsWrapper", () => {
  it("declares the negative capabilities that make partial acquisition unsound", () => {
    const capabilities = createGoogleSheetsWrapper().capabilities;

    expect(capabilities.predicatePushdown).toBe("none");
    expect(capabilities.rowIdentity).toBe("none");
    expect(capabilities.multiCallAtomicity).toBe(false);
    expect(capabilities.quotaScope).toEqual({
      kind: "project-global",
      readsPerMinute: 300,
    });
  });

  it("still refuses to acquire, preserving today's behaviour", async () => {
    const wrapper = createGoogleSheetsWrapper();

    await expect(
      wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT),
    ).rejects.toThrow(/not supported yet/i);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend wrapperCapabilities`
Expected: FAIL, cannot resolve the two modules.

- [ ] **Step 3: Implement `VirtualDatasetWrapper`**

Copy the `CAPABILITIES` block from Task 9 and change two fields, then route
acquisition to the existing recursive-QETL logic in `qetlFactLoading.ts`:

```ts
const CAPABILITIES = {
  relations: "single",
  acquisitionUnit: { kind: "whole-relation" },
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",
  /**
   * A virtual dataset's materialization is not invalidated when its SQL is
   * edited, so there is no token that tells us it changed. Declaring `none`
   * keeps the mediator from believing it has a freshness answer here.
   */
  freshnessSignal: "none",
  rowIdentity: "none",
  multiCallAtomicity: true,
  quotaScope: { kind: "none" },
  grantedScope: [],
} satisfies RelationCapabilities;
```

- [ ] **Step 4: Implement `GoogleSheetsWrapper`**

`acquire` is present and throws, which is exactly today's behaviour. Making it
absent instead would be a behaviour change, and this spec's budget is zero.

```ts
const CAPABILITIES = {
  relations: "named-tabs",
  acquisitionUnit: { kind: "whole-range", positionalSubranges: true },
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: 10 * 1024 * 1024,
  freshnessSignal: "version-token",
  rowIdentity: "none",
  multiCallAtomicity: false,
  quotaScope: { kind: "project-global", readsPerMinute: 300 },
  grantedScope: ["openid", "email", "auth/drive.file"],
} satisfies RelationCapabilities;

/**
 * Declares what Google Sheets can be asked. Acquisition still refuses: making
 * it work is spec 4, and this wrapper exists so that spec adds a method body
 * rather than a branch.
 */
export function createGoogleSheetsWrapper(): SourceWrapper<DatasetRef> {
  return {
    name: "google-sheets",
    capabilities: CAPABILITIES,
    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },
    describe: async () => {
      throw new Error("Google Sheets extraction is not supported yet");
    },
    acquire: async () => {
      throw new Error("Google Sheets extraction is not supported yet");
    },
  };
}
```

`grantedScope` lists the **target** scope set from proposal section 11, not
what `getAuthURL.ts` requests today. Spec 4 changes the request. Add this
comment above the field so the mismatch is deliberate and visible:

```ts
  // Target scopes. `getAuthURL.ts` still requests `auth/spreadsheets`;
  // spec 4 drops it. Asserted against the request in spec 4, not here.
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm test:frontend wrapperCapabilities`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/clients/qetl/wrappers/VirtualDatasetWrapper \
  src/clients/qetl/wrappers/GoogleSheetsWrapper \
  src/clients/qetl/wrappers/__tests__/wrapperCapabilities.test.ts
git commit -m "feat(qetl): add virtual and Google Sheets wrappers"
```

---

## Task 11: `ConceptWrapper`

The point of this task is to prove the abstraction covers the least
dataset-like source. It delegates to `AttributeAssertionClient` exactly as
`runStructuredQueryWithMetadata` does today, so behaviour is unchanged. Spec 3
makes it a registered relation.

**Files:**
- Create: `src/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper.ts`
- Test: `src/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createConceptWrapper } from "@/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef";

const CONCEPT_REF = {
  kind: "concept",
  id: "22222222-2222-4222-8222-222222222222",
} as RelationRefT;

const CONTEXT = { workspaceId: "w" as never, logger: console as never };

describe("ConceptWrapper", () => {
  it("handles concept refs only", () => {
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn(),
      getConceptExtension: vi.fn(),
    });

    expect(wrapper.handles(CONCEPT_REF)).toBe(true);
    expect(
      wrapper.handles({ kind: "dataset", id: CONCEPT_REF.id } as RelationRefT),
    ).toBe(false);
  });

  it("is the most capable source: full pushdown and a stable row identity", () => {
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn(),
      getConceptExtension: vi.fn(),
    });

    expect(wrapper.capabilities.predicatePushdown).toBe("full");
    expect(wrapper.capabilities.aggregatePushdown).toBe(true);
    expect(wrapper.capabilities.rowIdentity).toBe("stable-key");
  });

  it("describes a concept from its attributes", async () => {
    const getConceptAttributes = vi.fn().mockResolvedValue([
      { name: "district", dataType: "VARCHAR" },
      { name: "cases", dataType: "BIGINT" },
    ]);
    const wrapper = createConceptWrapper({
      getConceptAttributes,
      getConceptExtension: vi.fn(),
    });

    await expect(wrapper.describe(CONCEPT_REF as never, CONTEXT)).resolves
      .toEqual({
        columns: [
          { name: "district", dataType: "VARCHAR" },
          { name: "cases", dataType: "BIGINT" },
        ],
      });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend ConceptWrapper`
Expected: FAIL, cannot resolve `createConceptWrapper`.

- [ ] **Step 3: Implement the wrapper**

Inject both collaborators, so the test needs no client mocks. Default them to
`ConceptAttributeClient` and `AttributeAssertionClient` for production use.

```ts
const CAPABILITIES = {
  relations: "single",
  acquisitionUnit: { kind: "whole-relation" },
  /**
   * A concept is backed by Postgres online and by local stores offline, so the
   * source itself can filter and aggregate. It is the most capable source in
   * the system, and the only one with an id stable across fetches:
   * `individuals.external_id`, unique per concept by database constraint.
   */
  predicatePushdown: "full",
  aggregatePushdown: true,
  /**
   * Corrected after the cutover: this sample declared `"yes"` while the wrapper
   * implements no `acquire`, which trips the registry's own construction-time
   * invariant (Task 7, step 2a) and made the registry throw. `"no"` is also the
   * mode the proposal selects for concepts, since a concept pushes down rather
   * than being acquired whole.
   */
  wholeRelationAcquirable: "no",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",
  freshnessSignal: "modified-time",
  rowIdentity: "stable-key",
  multiCallAtomicity: true,
  quotaScope: { kind: "none" },
  grantedScope: [],
} satisfies RelationCapabilities;
```

`pushDown` delegates to the injected `getConceptExtension`, wrapping its rows
the way `_buildConceptQueryResult` in `runStructuredQueryWithMetadata.ts:211`
already does. **Move that function; do not copy it.**

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend ConceptWrapper`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/clients/qetl/wrappers/ConceptWrapper
git commit -m "feat(qetl): add ConceptWrapper declaring full pushdown"
```

---

## Task 12: Cut over `QetlClient` to the registry

The behaviour-bearing task. The characterization tests from Task 5 are the
safety net: they must still pass, unchanged, afterwards.

**Files:**
- Modify: `src/clients/qetl/QetlClient/qetlDiceExtractors.ts`
- Modify: `src/clients/qetl/QetlClient/qetlFactLoading.ts`
- Create: `src/clients/qetl/wrappers/createDefaultRegistry.ts`

- [ ] **Step 1: Write the registry assembly**

Create `src/clients/qetl/wrappers/createDefaultRegistry.ts`:

```ts
import { createRelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import { createConceptWrapper } from "@/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper";
import { createDatasetParquetWrapper } from "@/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper";
import type { RelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";

/**
 * The wrappers the application runs with. Google Sheets and virtual datasets
 * are resolved by source type inside the dataset wrapper, because all three
 * share the `dataset` relation kind.
 */
export function createDefaultRegistry(): RelationRegistry {
  return createRelationRegistry([
    createDatasetParquetWrapper(),
    createConceptWrapper(),
  ]);
}
```

- [ ] **Step 2: Note the design constraint this exposes, and resolve it**

`dataset`, `virtual` and `google_sheets` all share `kind: "dataset"`, so the
registry cannot distinguish them by ref alone and Task 7's duplicate-kind guard
would reject registering all three. Resolve it by making
`DatasetParquetWrapper` a **composite** that reads `dataset.sourceType` and
delegates to the virtual and Sheets wrappers:

```ts
const bySourceType = {
  csv_file: parquetAcquire,
  xlsx_file: parquetAcquire,
  open_data: parquetAcquire,
  virtual: virtualWrapper.acquire,
  google_sheets: sheetsWrapper.acquire,
};
```

This keeps one wrapper per relation **kind** while preserving per-source-type
behaviour. Record the consequence for spec 5: an open data **API** is still
`kind: "dataset"`, so it becomes another entry in this map, not a new kind.

- [ ] **Step 2b: Preserve three behaviours the characterization tests pinned**

Task 5 observed these in the real code. Two contradict assumptions elsewhere in
this plan, so read them before touching the dispatch.

1. **`getDiceExtractors([])` does not short-circuit.** It still calls
   `DatasetClient.getAll(where("id", "in", []))`. Only `getMissingDice`
   early-returns on an empty list. Task 5's original wording claimed the
   short-circuit for `getDiceExtractors`; that was wrong. Either preserve the
   call or, if you remove it, **update the characterization test in the same
   commit and say so**, because that is a deliberate behaviour change rather
   than a refactor.
2. **`google_sheets` rejects the whole batch, not one relation.** The throw
   happens synchronously inside a `match` arm running inside `promiseFlatMap`,
   so one unsupported dataset in a mixed request rejects the entire
   `getDiceExtractors` call. There is no partial-failure result. The registry
   cutover must keep that all-or-nothing semantics, or a page that today fails
   cleanly will start rendering half its data.
3. **Group ordering is emergent, not designed.** Results come out ordered by
   the first appearance of each `sourceType` while scanning
   `DatasetClient.getAll`'s return, which falls out of `makeBucketRecord`'s
   object-key insertion order plus `Promise.all` preserving order. It is
   neither the caller's id order nor alphabetical. A registry keyed differently
   will change it. The characterization test pins the observed order, so if
   your rewrite changes it the test fails: decide deliberately whether the new
   order is acceptable rather than editing the test to match.

- [ ] **Step 3: Replace the match statement**

In `qetlDiceExtractors.ts`, delete `_getExtractorsForSourceType` and have
`getDiceExtractors` resolve through the registry. Keep the exported function
name and return type for now; Task 13 renames them.

- [ ] **Step 4: Run the characterization tests**

Run: `pnpm test:frontend qetlDiceExtractors`
Expected: PASS, 4 tests, **unchanged**. If any test needed editing to pass, the
refactor changed behaviour. Revert and find out why.

- [ ] **Step 5: Run the whole qetl and DuckDb suites**

Run: `pnpm test:frontend qetl`
Expected: PASS, including the four pre-existing coordination and race tests.

Run: `pnpm test:frontend DuckDbClient`
Expected: PASS, all 12 files.

- [ ] **Step 6: Type check and commit**

Run: `pnpm type-check`
Expected: PASS.

```bash
git add src/clients/qetl
git commit -m "refactor(qetl): dispatch through the relation registry"
```

---

## Task 13: The renames

One mechanical commit, last, once everything is green. No behaviour edits in it.

**Files:** as listed in the table below.

- [ ] **Step 1: Rename the files**

```bash
cd src/clients/qetl
git mv QetlClient QueryMediator
git mv QueryMediator/QetlClient.ts QueryMediator/QueryMediator.ts
git mv QueryMediator/QetlClient.types.ts QueryMediator/QueryMediator.types.ts
git mv QueryMediator/qetlDiceExtractors.ts QueryMediator/getRelationSources.ts
git mv QueryMediator/qetlFactLoading.ts QueryMediator/relationLoading.ts
git mv QueryMediator/qetlQueryRunner.ts QueryMediator/queryRunner.ts
git mv WorkspaceQetlClient WorkspaceQuerySession
git mv PublicQetlClient PublicQuerySession
```

- [ ] **Step 2: Rename the symbols**

| From | To |
|---|---|
| `QetlClient` | `QueryMediator` |
| `IQetlClient` | `IQueryMediator` |
| `QetlClientFactory` | `QueryMediatorFactory` |
| `WorkspaceQetlClient` | `WorkspaceQuerySession` |
| `PublicQetlClient` | `PublicQuerySession` |
| `getDiceExtractors` | `getRelationSources` |
| `getMissingDice` | `probeRelationCache` |
| `getDiceFromSql` | **`getQueryDependencies`** |
| `DiceExtractor` | `RelationSource` |
| `ExtractedFact` | `AcquiredRelationBytes` |
| `insertToStorageCache` (facts param) | keep name, rename param `facts` to `relations` |

Follow the compiler: `pnpm type-check` lists every site.

**Why `getQueryDependencies` and not `extractReferencedRelations`.** Corrected
after Task 8 shipped: that name is **already taken** by
`src/clients/qetl/wrappers/extractReferencedRelations/`, the analyzer adapter
that converts SQL into `RelationRef[]`. Two different things must not carry one
name, and these are confusingly adjacent, so a reader would assume the runner
option *is* the adapter.

They are genuinely different. The adapter is a **pure syntactic conversion**,
SQL to refs. The runner option is a **session-scoped policy hook** answering
"which relations does this statement depend on, as far as this session can
see", which is why `WorkspaceQetlClient` filters to workspace datasets and the
public session answers differently.

`queryDependencies` is already the codebase's word for the result: it is the
parameter name at `QetlClient.ts:19`, `QetlClient.types.ts:61` and `:103`, it is
what `getMissingDice` takes, and `getDiceFromSql`'s result is assigned to
`const queryDependencies` at `qetlQueryRunner.ts:70`. Five sites, one word. A
near-miss like `getReferencedRelations` would sit one verb from the adapter and
keep the ambiguity; "dependencies" carries the resolved-and-filtered sense that
"referenced relations" does not.

- [ ] **Step 3: Update the doc comments that still say "dice", "cube" or "facts"**

A dice is a multidimensional interval of coordinates and this system has none.
Replace with "relation" and "rows". `grep -rn "dice\|cube\|facts" src/clients/qetl`
must return nothing outside a test fixture name.

- [ ] **Step 4: Run everything**

Run: `pnpm test:frontend` then `pnpm test:executed` then `pnpm type-check`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(qetl): rename dice and cube vocabulary to relations"
```

---

## Task 14: Executed row-level suite for `structuredQueryToSql`

`shared/models/queries` has two test files for the whole subtree, and
`structuredQueryToSql` is the most correctness-critical function in the query
path. Proposal Phase 0's exit criterion is that at least one test goes red when
a query returns wrong rows. Today none can.

**Files:**
- Create: `src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts`

**Corrected location.** An earlier draft put this under
`shared/models/queries/StructuredQuery/structuredQueryToSql/__tests__/`. That
**breaks `pnpm type-check`**: `deno check shared` type-checks every file under
`shared/`, and a `shared/` file importing `@/` fails it. Mapping `@/` for Deno
is not the fix, because it would let Deno-reachable code import browser code. So
an executed suite for a `shared/` module cannot live under `shared/`.

- [ ] **Step 1: Write the failing test**

Assert **rows**, not SQL strings. A snapshot of emitted SQL passes when the SQL
is wrong; executing it does not.

```ts
import { DuckDBInstance } from "@duckdb/node-api";
import { beforeAll, describe, expect, it } from "vitest";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts";

let connection: Awaited<ReturnType<DuckDBInstance["connect"]>>;

beforeAll(async () => {
  const instance = await DuckDBInstance.create(":memory:");
  connection = await instance.connect();
  await connection.run(`
    CREATE TABLE cases AS SELECT * FROM (VALUES
      ('North', 'confirmed', 5),
      ('North', 'suspected', 2),
      ('South', 'confirmed', 3)
    ) AS t(district, status, count);
  `);
});

async function _rows(sql: string) {
  return (await connection.runAndReadAll(sql)).getRowObjects();
}

describe("structuredQueryToSql executed", () => {
  it("filters and groups to the right rows", async () => {
    const sql = structuredQueryToSql({
      dataSource: { id: "cases" },
      queryColumns: [{ name: "district" }],
      aggregations: { count: "sum" },
      filters: {
        type: "group",
        conjunction: "and",
        items: [
          {
            type: "rule",
            columnName: "status",
            operator: "eq",
            value: "confirmed",
          },
        ],
      },
    } as never);

    await expect(_rows(sql)).resolves.toEqual([
      { district: "North", count: 5 },
      { district: "South", count: 3 },
    ]);
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm test:executed structuredQueryToSql`
Expected: FAIL first, because the `dataSource` and filter shapes above are
approximations. Read
`shared/models/queries/StructuredQuery/StructuredQuery.types.ts` and
`QueryFilter.types.ts` and correct the fixture until it compiles and the
assertion is the only thing failing. Then make it pass by fixing the fixture,
**not** by changing `structuredQueryToSql`.

- [ ] **Step 3: Add three more executed cases**

One per behaviour the emitter is most likely to get wrong, each asserting rows:
a `left` join preserving unmatched left rows, an `order by` with `limit`
returning the right rows in the right order, and a `having` clause filtering
after aggregation.

- [ ] **Step 4: Run and commit**

Run: `pnpm test:executed structuredQueryToSql`
Expected: PASS, 4 tests.

```bash
git add shared/models/queries/StructuredQuery/structuredQueryToSql/__tests__
git commit -m "test(queries): add executed row-level suite for structuredQueryToSql"
```

---

## Self-review

**Spec coverage.** Every spec section maps to a task:

| Spec section | Task |
|---|---|
| 4.1 `RelationRef` | 2 |
| 4.2 `SourceWrapper` | 4 |
| 4.3 `RelationCapabilities` | 3, declared per wrapper in 9 to 11 |
| 4.4 `RelationRegistry` | 7 |
| 4.5 `QueryMediator` dispatch | 12 |
| 5 Data flow | 12 |
| 6 Relation identification | 6, 8 |
| 7 The renaming | 13 |
| 8 Module layout | file structure table, realised across 2 to 13 |
| 9 Executed test harness | 1 |
| 10 Testing | 5, plus per-task tests, plus 14 |

**Gap found and closed during review.** Task 12 Step 2 exposes something the
spec does not address: `dataset`, `virtual` and `google_sheets` share one
relation **kind**, so a registry keyed on kind cannot hold three wrappers for
them, and Task 7's duplicate-kind guard would reject the attempt. The plan
resolves it with a composite dataset wrapper that dispatches on `sourceType`
internally. **This is worth carrying back into the spec**, because it changes
what "one wrapper per source" means: one wrapper per *kind*, dispatching on
source type within a kind.

**Type consistency.** `RelationRefT` is the type and `RelationRef` the value
namespace throughout, because `shared/models` files already separate
`Concept.types.ts` from `Concept.ts` the same way. `createRelationRegistry`
takes a wrapper array in Tasks 7 and 12. `capabilities` is a property, never a
method, in Tasks 3, 4, 9, 10, 11. `acquire` returns `AcquiredRelation` in Tasks
4 and 9.

**Placeholder scan.** No `TBD` or `TODO`. Three tasks tell the engineer to read
existing code before writing (5, 9, 11) and to move rather than copy specific
functions, which is direction, not a placeholder.
