# QETL relation registry and capability contract - design

**Status:** Draft for review
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-18
**Spec:** 1 of 6. Parent: `.temp/qetl/final_proposal.md` (revision 6), sections
6.1, 6.2, 11, 11.1, 11.2
**Related:** `src/clients/qetl/`, `src/clients/DuckDbClient/`,
`shared/models/queries/QueryDataSource/`,
`shared/models/queries/StructuredQuery/structuredQueryToSql/`,
`supabase/schemas/10.datasets.sql`, `src/lib/sql/DuckDbSqlAnalyzer/`,
`.temp/qetl/proposal-questions.md` (Q7, Q8, Q20, Q24), `.temp/qetl/proposal-questions-2.md` (Q46, Q47, Q48, Q49)

---

## 1. Problem

Avandar is about to add several data sources at once: Google Sheets properly,
open data APIs with HDX, and every ontology concept as a separately queryable
relation. The current query engine cannot absorb any of them without being edited
in the same three places each time, and it has no way to express what a source
can and cannot do.

### 1.1 Source dispatch is a match statement, duplicated

`datasets.source_type` has five values (`csv_file`, `google_sheets`, `virtual`,
`open_data`, `xlsx_file`). Two exhaustive `ts-pattern` matches switch on it:

- `src/clients/qetl/QetlClient/qetlDiceExtractors.ts:107` (`_getExtractorsForSourceType`),
  with one `_get*Extractors` function per type
- `src/clients/qetl/QetlClient/qetlFactLoading.ts:132`, which throws for
  `google_sheets`

Adding a source means editing both. Adding a *kind* of source that is not a row
in `datasets` at all, which is what a concept is, means editing neither, because
neither can express it: the type is `datasets.source_type`.

### 1.2 Capabilities are implicit, so nothing can ask

Whether a source supports predicate pushdown, can be acquired whole, has a
stable row identity, offers a freshness token, or shares a rate limit with other
tenants is nowhere declared. It is implied by which branch throws.

The consequence is not only inconvenience. It means the engine cannot make the
one decision that matters most for cost: **acquire the whole relation, or push
the query down and cache its result.** Google Sheets can only do the former
(`values.get` has no server-side filtering). CKAN's datastore caps a response at
32,000 rows and so can only do the latter. A concept relation, backed by
Postgres, can do either and should do the latter. With capabilities undeclared,
every one of those becomes a hard-coded branch instead of a lookup.

### 1.3 A concept is a data source that cannot be compiled

`shared/models/queries/QueryDataSource/QueryDataSource.types.ts` already reads:

```ts
export type QueryDataSource = DatasetModel["Read"] | ConceptModel["Read"];
```

So a concept is already a first-class source in the DSL. But
`structuredQueryToSql.ts:48-50` throws
`"Querying Concepts through DuckDB is not supported."`, so
`runStructuredQueryWithMetadata.ts:168-207` carries a parallel branch that calls
`AttributeAssertionClient.getConceptExtension()` and returns a computed row set.
Two TODOs in that file record that group-bys, aggregations and sorting are not
applied to it.

The parallel branch is the problem this spec removes the need for. A concept
should be a source like any other, resolved through one path.

### 1.4 Relation identification sees datasets and nothing else

**Corrected during planning, 2026-08-18.** An earlier draft of this spec said
relation identification was a `rawSql.includes(datasetId)` substring scan, and
proposed replacing it with a `node-sql-parser` pass. **Both halves were wrong**,
and the correction matters because it deletes most of a task.

`WorkspaceQetlClient.ts:118-125` no longer scans. It calls
**`DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences`**
(`src/lib/sql/DuckDbSqlAnalyzer/`, 1,297 lines across 9 files, 22 tests), a
**fail-closed static dataset-effect analyzer** built on its own DuckDB
tokenizer. It already does everything this spec was going to ask for, and two
things it was not:

| Concern | Status |
|---|---|
| UUID inside a string literal must not count | Done: *"extracts UUID tables while ignoring UUID string literals"* |
| CTE names must not count | Done: *"ignores a UUID-shaped CTE alias"*, *"scopes CTE aliases without suppressing qualified real tables"* |
| DDL and mutation targets must not count as reads | Done: *"distinguishes mutation targets from read sources"*, *"rejects mutating statements"*, plus `COPY` direction and `DELETE`/`MERGE USING` handling |
| Fail closed, never return a partial answer | Done: *"rejects dynamic table and query sources without returning partial IDs"*; the public entry point **throws** on `unsafe` or `mutating` |
| DuckDB-only syntax must not break analysis | Done, and better than proposed: *"supports DuckDB EXCLUDE, QUALIFY, and PIVOT syntax"*. It uses **its own tokenizer, not `node-sql-parser`**, so the PostgreSQL-dialect throw that `sqlToStructuredQuery.ts:118` suffers does not apply here at all |

**So the only real gap is the return type.** It returns `string[]` of dataset
UUIDs, so it cannot see a concept, which means it cannot answer "which relations
does this statement touch" once concepts are relations. That is what spec 2's
authorization check will consume, and a wrong answer there is either an outage or
a hole.

The task is therefore **extend, do not build**: teach the analyzer to return
`RelationRef[]`. Section 6 specifies that narrowly.

### 1.5 Nothing can be executed against a real engine

`vite.config.ts` sets `environment: "jsdom"`, where duckdb-wasm cannot run, and
there is a single vitest project. `@duckdb/node-api` is not installed. So no test
in the repository can assert that a query returns the right **rows**; tests can
only assert that the right calls were made. `shared/models/queries` has two test
files for the whole subtree.

The refactor this spec performs is exactly the kind that mocked tests cannot
protect.

---

## 2. Goals and non-goals

**Goals.**

1. One abstraction, the **source wrapper**, that covers datasets, concepts and
   external APIs alike.
2. A **declared, typed capability record** per wrapper, whose negative
   declarations are load-bearing.
3. A **registry** resolving a relation reference to its wrapper.
4. Adding a source means **registering a wrapper and declaring capabilities**,
   editing no match statement.
5. **Relation identification that can see a concept**, by extending the existing
   `DuckDbSqlAnalyzer` rather than replacing it.
6. The **renaming** in proposal section 6.2, so later specs are not written in
   dead vocabulary.
7. An **executed test harness**, so specs 2 through 6 can assert rows.

**Non-goals.** Each belongs to a later spec and is named here so this one stays
bounded:

- The relation cache, the cache probe reordering, and authorization (spec 2)
- Column-projected caching (spec 2)
- Registering concept extensions in DuckDB and deleting the
  `structuredQueryToSql` throw (spec 3)
- Making Google Sheets actually work (spec 4)
- Open data APIs, HDX, and executing pushdown (spec 5)
- Catalog caps and the LLM-facing surface (spec 6)
- Any change to `StructuredQuery` itself, or to raw SQL behaviour

**Behaviour change budget: zero.** This spec is a pure refactor. Every existing
source type behaves identically afterwards, including `google_sheets` continuing
to throw, and every existing statement resolves to the same relations. The
analyzer extension in section 6 adds a relation kind that no wrapper resolves
yet. That is what makes it safe to land first.

---

## 3. Decisions (resolved)

| Decision | Resolution | Why |
|---|---|---|
| Name of the per-source abstraction | **`SourceWrapper`** | Proposal section 6.1 adopts Wiederhold's *wrapper*. Bare `Wrapper` is unusable in a React and Vitest codebase, and `Provider` collides with React context. The prefix keeps the literature's word and disambiguates |
| Name of the coordinating layer | **`QueryMediator`**, replacing `QetlClient` | Wiederhold's *mediator*, not the GoF pattern. Proposal section 6.1 |
| Do wrappers know about caching? | **No.** A wrapper acquires or pushes down; it never consults a cache | Keeps spec 2 free to change cache policy without touching wrappers |
| Do wrappers know about authorization? | **No.** Authorization stays in the query session (spec 2) | Proposal section 12: exactly one authorization home |
| Are capabilities data or behaviour? | **Data**: a plain typed value per wrapper | Proposal question 37. A value can be asserted in tests, narrowed at the type level, and diffed in review; a method cannot be read without running it |
| Does this spec add a Concept wrapper? | **Yes, declaring capabilities; no, not implementing acquisition.** It wraps the existing `AttributeAssertionClient` call path unchanged | Proves the abstraction covers concepts without pulling spec 3's work forward |
| Where does the contract live? | `shared/models/relations/` | Proposal section 11 said `shared/models/datasets/`. It is no longer dataset-specific |
| Test runtime | A **second vitest project** with `environment: "node"` and `@duckdb/node-api` | Proposal section 17. duckdb-wasm cannot run under jsdom |

---

## 4. Architecture

Four types and one registry. Everything else in this spec is the mechanical
consequence.

```text
  StructuredQuery / raw SQL
            |
   extractReferencedRelations  (AST, section 6)
            |
      RelationRef[]
            |
   RelationRegistry.getWrapperForRelation
            |
      SourceWrapper  +  RelationCapabilities
            |
      QueryMediator decides: acquire, or push down
            |
      QueryableRelationCache  (spec 2 owns this)
```

### 4.1 `RelationRef`: what a relation is called

Today a relation is identified by a dataset UUID that doubles as its DuckDB table
name. That cannot name a concept, and it is why 1.4's scan exists.

```ts
/** A reference to something queryable, independent of what backs it. */
export type RelationRef =
  | { kind: "dataset"; id: Dataset.Id }
  | { kind: "concept"; id: Concept.Id };
```

`kind` is the discriminant the registry dispatches on, and it is open for
extension: spec 5 adds no new kind (an open data API is still a `dataset`, with
a different wrapper), while a future comment or document relation adds one.

Two functions convert between a ref and the name SQL uses:

```ts
export function relationRefToTableName(ref: RelationRef): string;
export function tableNameToRelationRef(name: string): RelationRef | undefined;
```

**The encoding must be stable, collision-free against dataset UUIDs, and valid as
a quoted DuckDB identifier.** Datasets keep their bare UUID so every existing
bookmarked `?sql=` URL and stored dashboard SQL keeps working unchanged, which
proposal section 16 makes sacrosanct. New kinds take a prefix
(`concept_<uuid>`). A bare UUID is therefore always a dataset, which is
backwards-compatible by construction.

### 4.2 `SourceWrapper`: what a source can be asked

```ts
export type SourceWrapper<TRef extends RelationRef = RelationRef> = {
  /** Stable identifier for logs, telemetry and the quota counter. */
  readonly name: string;

  /** What this wrapper can and cannot be asked. Section 4.3. */
  readonly capabilities: RelationCapabilities;

  /** True when this wrapper handles the given reference. */
  handles(ref: RelationRef): ref is TRef;

  /** The relation's columns, without acquiring its rows. */
  describe(ref: TRef, ctx: WrapperContext): Promise<RelationSchema>;

  /** A cheap token that changes when the source changes, or undefined. */
  readFreshness?(ref: TRef, ctx: WrapperContext): Promise<SourceVersion>;

  /** Fetch rows. Present only when acquisition is declared. */
  acquire?(req: AcquireRequest<TRef>, ctx: WrapperContext): Promise<AcquiredRelation>;

  /** Ask the source to answer. Present only when pushdown is declared. */
  pushDown?(req: PushDownRequest<TRef>, ctx: WrapperContext): Promise<QueryResult.T<UnknownRow>>;
};
```

`acquire` and `pushDown` are both optional, and **which are present is what the
capability record declares.** A wrapper with `predicatePushdown: "none"` has no
`pushDown`; one that cannot be acquired whole has no `acquire`. The mediator
narrows on the capability record and the compiler then guarantees the method
exists, so "asked a source to do something it cannot do" is unrepresentable
rather than a runtime throw.

`WrapperContext` carries the ambient identity and clients a wrapper needs
(`workspaceId`, the principal, a logger, a quota counter). It is injected, never
imported, so `shared/` code stays free of Avandar auth (proposal question 10).

**`AcquireRequest` carries a column set from the start**, even though nothing
projects yet:

```ts
export type AcquireRequest<TRef extends RelationRef> = {
  ref: TRef;
  /**
   * The columns the caller needs, or "all". Wrappers that can project at the
   * source should; the rest may ignore it and return every column, which is
   * always correct because a superset satisfies a subset.
   */
  columns: readonly string[] | "all";
};
```

This is a correction found during self-review. Proposal section 12.1 assigns
column projection to spec 2, and an earlier draft of this spec deferred the field
with it. That was wrong: **this spec creates five wrappers, so deferring the
field means changing five signatures later.** Adding an ignorable field now costs
nothing, and "ignore it and return everything" is a sound default rather than a
stub, because a returned superset always satisfies the request.

### 4.3 `RelationCapabilities`: twelve fields, and the noes matter most

Proposal section 11's eight fields, section 11.1's three, and one more found
during self-review (`maxBytesPerCall`, because Sheets caps bytes where CKAN caps
rows).

```ts
export type RelationCapabilities = {
  /**
   * How many relations one `RelationRef` exposes. A dataset or a concept is
   * one; a Google spreadsheet is many, one per named tab.
   */
  relations: "single" | "named-tabs" | "tables";

  /** The smallest thing one call can fetch. Not what we want; what it gives. */
  acquisitionUnit: AcquisitionUnit;

  /** Can a filter be sent to the source, so it returns fewer rows? */
  predicatePushdown: "none" | "equality" | "range" | "full";

  /** Can the source compute an aggregate, so it returns fewer rows still? */
  aggregatePushdown: boolean;

  /** Can the whole relation be fetched? "probe" when it is per-resource. */
  wholeRelationAcquirable: "yes" | "no" | "probe";

  /**
   * Hard ceiling per call, which forces paging. Two separate limits because
   * sources cap different things: CKAN caps rows (32,000), Google Sheets caps
   * response bytes (~10 MB). A source may declare either, both or neither.
   */
  maxRowsPerCall: number | "unbounded";
  maxBytesPerCall: number | "unbounded";

  /** A cheap token that tells us it changed, without refetching. */
  freshnessSignal: "none" | "version-token" | "etag" | "modified-time";

  /** A per-row id stable across fetches. Without it, no delta and no union. */
  rowIdentity: "none" | "positional" | "stable-key";

  /** If several calls build one result, do they see one snapshot? */
  multiCallAtomicity: boolean;

  /** Who shares the rate limit. Project-global is the dangerous case. */
  quotaScope: QuotaScope;

  /** OAuth or API scopes actually granted, if any. */
  grantedScope: readonly string[];
};
```

**Negative declarations are the point** (proposal question 8). A record whose
fields all say yes tells us nothing we would not have assumed. The value is in
the noes, because they delete work from the roadmap and make unsound designs fail
at declaration time. `rowIdentity: "none"` for Sheets is what makes fragment
union provably unsound there, by declaration rather than by argument.

The five wrappers this spec ships declare, verified against each source:

| Field | `dataset` (local Parquet) | `google_sheets` | `open_data` (blob) | `virtual` | `concept` |
|---|---|---|---|---|---|
| `relations` | `single` | `named-tabs` | `single` | `single` | `single` |
| `predicatePushdown` | `none` | `none` | `none` | `none` | **`full`** |
| `aggregatePushdown` | `false` | `false` | `false` | `false` | **`true`** |
| `wholeRelationAcquirable` | `yes` | `yes` | `yes` | `yes` | `yes` |
| `maxRowsPerCall` | `unbounded` | `unbounded` | `unbounded` | `unbounded` | `unbounded` |
| `maxBytesPerCall` | `unbounded` | **~10 MB** | `unbounded` | `unbounded` | `unbounded` |
| `freshnessSignal` | `none` | `version-token` | `modified-time` | `none` | `modified-time` |
| `rowIdentity` | `positional` | `none` | `positional` | `none` | **`stable-key`** |
| `multiCallAtomicity` | `true` | `false` | `true` | `true` | `true` |
| `quotaScope` | none | **project-global, 300/min** | per-host | none | none |

Two entries deserve attention. **A concept is the most capable source in the
table**, because it is backed by Postgres online and local stores offline, and it
is the only one with a stable row identity (`individuals.external_id`, unique per
concept by database constraint). And **Google Sheets is the least capable**, which
is why proposal section 3 cut the extraction optimizer: with one call shape and no
pushdown, the plan space has size one.

`virtual` declares `freshnessSignal: "none"` deliberately, which records the known
bug rather than hiding it: a virtual dataset's materialization is never
invalidated when its SQL is edited. Spec 2 fixes it by putting the logical
definition in the cache key. Declaring `none` here means the mediator cannot
accidentally believe it has a freshness answer for virtual datasets.

### 4.4 `RelationRegistry`: map a ref to its wrapper

**Naming note (corrected 2026-08-18).** An earlier draft called these methods
`resolve` / `resolveAll` and the module `relationResolution.ts`.
`docs/rules/typescript.md:272` **bans naming a conversion `resolve...`**, because
the word names neither side and the reader learns nothing about what went in or
came out; `:310` extends the ban to `_resolve...`. The verbs below name both
sides. Task 13 carries the rename through any code already written against the
old names.

```ts
export type RelationRegistry = {
  getWrapperForRelation(ref: RelationRef.T): SourceWrapper | undefined;
  getWrappersForRelations(
    refs: readonly RelationRef.T[],
  ): RelationWrapperAssignments;
  register(wrapper: SourceWrapper): void;
};
```

Construction is explicit and injected, not a module-level singleton with
side-effectful imports, so a test can build a registry containing one fake
wrapper. `getWrappersForRelations` returns matched and unmatched refs separately, because an
unresolvable ref must become `needs_clarification` rather than an exception
(proposal section 10).

**Ordering rule: registration order is resolution order**, first `handles` wins.
Ambiguity is a programming error, so registration throws when two wrappers claim
the same `kind`.

**One wrapper per relation kind, not per source type.** Found while planning:
`csv_file`, `xlsx_file`, `open_data`, `virtual` and `google_sheets` are all
`kind: "dataset"`, so a registry keyed on kind cannot hold five wrappers for
them, and the duplicate-kind guard would reject the attempt. The resolution is a
**composite dataset wrapper** that dispatches on `dataset.sourceType` internally:

```text
RelationRegistry            keyed by kind
  DatasetWrapper            kind: "dataset"
    -> csv_file | xlsx_file | open_data   parquet acquisition
    -> virtual                            recursive QETL
    -> google_sheets                       throws, until spec 4
  ConceptWrapper            kind: "concept"
```

The inner dispatch is a `Record<sourceType, acquire>`, not a `match`, so adding
a source type is a map entry. **Consequence for spec 5:** an open data *API* is
still `kind: "dataset"`, so it is another entry in that map rather than a new
kind, and it inherits dataset authorization unchanged. A new kind is warranted
only when the thing is not a `datasets` row at all, as a concept is not, and as
comments and documents will not be.

### 4.5 `QueryMediator`: what replaces the match statements

`QueryMediator` (today's `QetlClient`) keeps its current responsibility, which is
to get every referenced relation into the queryable cache and then execute. What
changes is how it decides:

```text
before:  match(dataset.source_type)
           .with("csv_file",      ...)
           .with("google_sheets", () => { throw })
           .with("virtual",       ...)
           ...

after:   const wrapper = registry.getWrapperForRelation(ref)
         match(wrapper.capabilities.predicatePushdown)
           .with("none", () => acquireThroughWrapper(wrapper, ref))
           .otherwise(() => pushDownThroughWrapper(wrapper, ref))
```

**In this spec the second branch is not reachable**, because the only wrapper
declaring pushdown is `concept`, and the concept wrapper keeps delegating to
`AttributeAssertionClient` exactly as today. Spec 3 makes it real. The branch
exists now so that specs 3 and 5 add a wrapper rather than a code path.

---

## 5. Data flow

Unchanged in effect, restructured in shape. Numbered to match proposal section 9.

1. **Resolve.** SQL or a `StructuredQuery` yields `RelationRef[]` through
   `extractReferencedRelations` (section 6).
2. **Look up.** `registry.resolveAll` maps refs to wrappers. Unresolved refs
   return `needs_clarification`.
3. *(Spec 2 inserts `authorize` here, before any probe.)*
4. *(Spec 2 inserts the cache probe here.)*
5. **Acquire or push down.** Per capability, per section 4.5.
6. **Execute** locally and record telemetry.

The one ordering fact this spec must not disturb: **source dispatch currently
sits between the two cache tiers**, which is the bug that makes a perfectly good
local Parquet unreachable for `google_sheets`. This spec **does not** fix that,
because moving the probe removes the only authorization check on the hit path and
the two must land together (proposal section 12). What this spec does is make the
fix a reordering of two named steps instead of an untangling.

---

## 6. Relation identification

**Extend `DuckDbSqlAnalyzer`; do not write a new extractor.** Section 1.4
explains why: it already filters CTE names, excludes mutation targets from reads,
tolerates DuckDB-only syntax, and fails closed. Rewriting that on
`node-sql-parser` would be a regression, because `node-sql-parser`'s
`postgresql` dialect throws on `QUALIFY` and `SELECT * EXCLUDE`, which the
analyzer's own tokenizer handles.

**The change is the return type, and only that.**

```ts
// today, in DuckDbSqlAnalyzer.types.ts
{ kind: "read"; datasetIds: string[] }

// after
{ kind: "read"; relations: RelationRef[] }
```

A bare UUID token maps to `{ kind: "dataset", id }`. A prefixed token
(`concept_<uuid>`) maps to its kind, through `tableNameToRelationRef`
(section 4.1). A token that is neither is not a relation this system owns and is
already excluded by the analyzer's UUID-shape check, so nothing new is needed
for the negative case.

`extractReferencedRelations` becomes a **thin adapter** over the analyzer,
living with the wrappers, whose job is to convert an analysis into refs and to
translate the analyzer's `throw` into the `unsupported` outcome that proposal
section 10 defines. It is the seam spec 2's `authorize` calls, so it exists as a
named function even though it is small.

**Two properties must be preserved, and tested for, because spec 2 depends on
them:**

1. **Fail closed.** The analyzer throws on `unsafe` and `mutating`. The adapter
   must convert that to `unsupported`, never to an empty list. An empty list
   reads as "this statement touches nothing", so authorization would pass and
   cached rows would be served with no access check. That is the exact hole spec
   2 exists to close.
2. **No partial answers.** The analyzer already refuses to return partial ids
   when it meets a dynamic boundary. The adapter must not soften that.

**Behaviour change in this spec: none here.** Dataset identification is already
correct. The extension adds a kind that no wrapper resolves yet, so the observable
result for every existing statement is unchanged, which is what makes it safe to
land in a refactor-only spec.

---

## 7. The renaming

Proposal section 6.2, applied to the names as they exist after the GIS merge.
Mechanical, and it lands as **one commit, after the characterization tests in
section 9 exist**.

| Now | Becomes |
|---|---|
| `QetlClient` | `QueryMediator` |
| `WorkspaceQetlClient`, `PublicQetlClient` | `WorkspaceQuerySession`, `PublicQuerySession` |
| `getDiceExtractors` (`qetlDiceExtractors.ts:138`) | `extractReferencedRelations` |
| `getMissingDice` (`qetlDiceExtractors.ts:31`) | `probeRelationCache` |
| `qetlDiceExtractors.ts` | `relationResolution.ts` |
| `qetlFactLoading.ts` | `relationLoading.ts` |
| `EtlService.prepareFacts` | deleted (identity function) |
| "facts" | "rows" |
| "memory cube" | `QueryableRelationCache` (spec 2 builds it) |
| "storage cube" | `StorageRelationCache` (spec 2 builds it) |

Why the vocabulary goes, in one sentence: a *dice* is a multidimensional interval
of coordinates, and `getDiceFromSql` returns dataset ids found by substring
scanning SQL text. Keeping the word is what made an extraction optimizer look
applicable, and it cost the review weeks.

**QETL stays.** The paradigm is literally what this system does: a query
arrives, and only then is data extracted, transformed and loaded. The package
name is `@avandar/qetl` when this is extracted, which is not in this spec.

---

## 8. Module layout

```text
shared/models/relations/                      new, portable, no Avandar auth
  RelationRef/
    RelationRef.ts                            kind discriminant, ref <-> table name
    RelationRef.test.ts
  RelationCapabilities/
    RelationCapabilities.types.ts              the twelve fields
  SourceWrapper/
    SourceWrapper.types.ts                     the interface, requests, context
  RelationSchema/
    RelationSchema.types.ts                    columns without rows

src/clients/qetl/
  QueryMediator/                               was QetlClient/
    QueryMediator.ts
    relationResolution.ts                      was qetlDiceExtractors.ts
    relationLoading.ts                         was qetlFactLoading.ts
    queryRunner.ts                             was qetlQueryRunner.ts
  WorkspaceQuerySession/                       was WorkspaceQetlClient/
  PublicQuerySession/                          was PublicQetlClient/
  RelationRegistry/
    RelationRegistry.ts
    RelationRegistry.test.ts
  wrappers/
    DatasetParquetWrapper/                     csv_file, xlsx_file, open_data blob
    GoogleSheetsWrapper/                       declares capabilities; still throws
    VirtualDatasetWrapper/
    ConceptWrapper/                            delegates to AttributeAssertionClient

  extractReferencedRelations/
    extractReferencedRelations.ts
    extractReferencedRelations.executed.test.ts
```

`shared/models/relations/` holds only types and pure functions, so it is
importable from edge functions and from the future Tauri shell. Wrappers live
under `src/clients/` because they need clients.

---

## 9. Executed test harness

Prerequisite for this spec and for every spec after it.

**Install `@duckdb/node-api`** as a dev dependency. It is not currently present.

**Add a second vitest project** with `environment: "node"`, alongside the
existing jsdom one, because duckdb-wasm cannot run under jsdom and
`vite.config.ts:207` sets jsdom for everything. Node tests match a distinct
pattern (`*.executed.test.ts`) so the jsdom project excludes them and neither
project silently swallows the other's files.

**Add a script**, `test:executed`, and include it in `scripts/runAllTests.sh`.

**What the harness is for.** Assertions about **rows**, not about calls. The
proposal's Phase 0 exit criterion is that at least one test goes red when a query
returns wrong rows, and today none can. Two executed suites land with this spec:

- `extractReferencedRelations`, against statements actually parsed
- a row-level suite for `structuredQueryToSql`, which has two test files for the
  whole `shared/models/queries` subtree and is the most correctness-critical
  function in the query path

A test that mocks DuckDB characterizes the mock. For this purpose that is
worthless.

---

## 10. Testing

**Characterization first.** `src/clients/qetl` already has four coordination and
race tests from the GIS-era refactor. They are the starting point, not the
finish: they assert coordination, not results. Before the renames in section 7,
add characterization tests pinning current behaviour for each of the five source
types, including `google_sheets` throwing. A characterization test records what
the code does now, including what is wrong, so that a refactor changing behaviour
fails loudly.

| Area | Test |
|---|---|
| `RelationRef` | Round-trip for each kind. A bare UUID resolves to `dataset`. A prefixed name resolves to its kind. Output is a valid quoted DuckDB identifier |
| `extractReferencedRelations` | The analyzer's own 22 tests already cover CTE aliases, string literals, mutation targets and DuckDB syntax; **do not duplicate them**. Test only the adapter: a bare UUID becomes a `dataset` ref, a prefixed name becomes its kind, and an analyzer `throw` becomes `unsupported` and **never an empty list** |
| `RelationCapabilities` | A declaration exists for every registered wrapper, iterated from the registry so a new wrapper cannot omit one. `grantedScope` matches what `getAuthURL.ts` actually requests |
| `SourceWrapper` narrowing | Type-level: a wrapper declaring `predicatePushdown: "none"` has no `pushDown`; calling it fails to compile |
| `RelationRegistry` | Resolves each kind. Unknown ref returns undefined, not a throw. Duplicate `kind` registration throws in development |
| Each wrapper | Behaviour identical to the pre-refactor branch, asserted against the characterization tests |
| `structuredQueryToSql` | Executed, row-level, against real DuckDB |

**Regression guard for the whole spec:** raw SQL behaviour is unchanged. A
bookmarked `?sql=` URL, including one containing a CTE, returns what it returned
before. Proposal section 16 makes this permanent.

---

## 11. What this spec deliberately leaves open

Recorded so the next spec's author does not read silence as an answer.

1. **The pushdown branch is unreachable.** Only `concept` declares pushdown, and
   the concept wrapper delegates to today's code. Spec 3 makes it real, spec 5
   uses it for APIs.
2. **`wholeRelationAcquirable: "probe"` has no prober.** No source in this spec
   needs it; CKAN and Socrata do (spec 5). The field exists so spec 5 adds a
   prober, not a field.
3. **`maxRowsPerCall` is not enforced.** Nothing pages yet. Spec 5 pages.
4. **`quotaScope` is declared and not counted.** The per-service quota counter is
   spec 4, where Sheets' project-global 300 per minute first bites.
5. **`readFreshness` is declared and not called.** The cache that would consult
   it is spec 2.
6. **Column projection is declared but not performed.** `AcquireRequest` carries
   a column set from the start (section 4.2), and every wrapper in this spec is
   allowed to ignore it and return all columns. Spec 2 adds the cache key and
   makes the projection real; wrappers that can project at the source (Parquet
   most obviously) start honouring it then, one wrapper at a time, with no
   signature change.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| A rename wave over code with thin tests introduces a silent regression | Characterization tests before renames (section 10). One mechanical commit, no behaviour edits in it |
| Three things in this tree are called "structured query", and this spec adds `RelationRef` next to `QueryDataSource` | `RelationRef` is a **reference**, `QueryDataSource` is a **model row**. Stated in the types' doc comments. `DuckDbClient.runStructuredQuery` has no application caller and is out of scope |
| The capability record drifts from reality, especially `grantedScope` and `quotaScope`, which describe external systems | A test asserts declared scopes equal requested scopes. The others are reviewed when a wrapper changes |
| `RelationRef` encoding breaks a stored dashboard or a bookmarked URL | Datasets keep their bare UUID, so every existing name is unchanged. Only new kinds take a prefix |
| The abstraction is wrong because it was designed against five similar sources | Deliberately includes `ConceptWrapper`, the least dataset-like source, precisely to test that. If concepts do not fit, this spec is wrong and it is cheaper to know now than after spec 3 |
