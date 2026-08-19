# QETL concept relations: every concept becomes a queryable relation - design

**Status:** Draft for review
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-18
**Spec:** 3 of 6. Parent: `.temp/qetl/final_proposal.md` (revision 6), sections
17 (Phase 3, rewritten in revision 6), 12.1, 11, 11.2
**Related:** `shared/models/queries/StructuredQuery/structuredQueryToSql/`,
`src/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata.ts`,
`src/clients/ontology/AttributeAssertionClient/`,
`src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/`,
`src/clients/DuckDbClient/duckDbParquetLoad.ts`,
`shared/models/relations/RelationRef/`,
`supabase/schemas/20.individuals.sql`,
`supabase/schemas/20.concept_attributes.sql`,
`supabase/schemas/30.attribute_mappings__dataset_column.sql`
**Depends on:** spec 1, `2026-08-18-qetl-relation-registry-design.md`, approved,
which ships `RelationRef`, `RelationCapabilities`, `SourceWrapper` and the
`ConceptWrapper` that declares `predicatePushdown: full` and
`aggregatePushdown: true` while still delegating to `AttributeAssertionClient`
unchanged. This spec makes that declaration true. It does not redo it.
**Adjacent:** spec 2 (`2026-08-18-qetl-relation-cache-design.md`, in progress)
owns the cache key and the pushdown-plus-result-cache seam. Section 9 states
exactly what this spec needs from it and nothing more.

---

## 1. Problem

A concept is already a `QueryDataSource`, the Data Explorer already lists
concepts in its source picker, and `QueryColumn.makeFromConceptAttribute`
already turns a concept attribute into a query column. Everything above the
query engine is in place. The engine is the part that cannot answer.

### 1.1 The throw, and what it actually breaks today

`structuredQueryToSql.ts:48-50` reads:

```ts
if (
  query.dataSource !== undefined &&
  Model.isOfModelType(query.dataSource, "Concept")
) {
  throw new Error("Querying Concepts through DuckDB is not supported.");
}
```

**Verified during planning, and it changes the risk story: the concept path in
the Data Explorer throws today rather than falling back.** Trace it:

1. `useDataQuery` defaults `isStructuredQueryInSync` to `true`.
2. `dataExplorerStateHelpers._regenerateRawSqlFromQuery` calls
   `structuredQueryToSql` inside a `try`/`catch` that swallows the throw, so
   `rawSql` stays `undefined` and the SQL panel shows nothing.
3. `runStructuredQueryWithMetadata._selectSqlForExecution` then calls
   `selectSqlToExecute`, which has **no** `try`/`catch`, and with
   `rawSql === undefined` and the form in sync it calls `structuredQueryToSql`
   again. The throw escapes.

So `_runSourceQuery`'s `Concept` arm is reached only when `rawSql` is the empty
string, because `selectSqlToExecute` returns `""` and
`runStructuredQueryWithMetadata`'s `if (sqlToRun)` is falsy for it. Every
ordinary interaction throws first.

**Consequence for this spec:** deleting the throw fixes a live failure, and
deleting `_runConceptQuery` deletes near-dead code rather than a working
feature. That lowers the regression risk of the whole spec, and it raises the
value of the smallest change. It also means the demo cannot be rehearsed on
today's build: **click a concept in Data Explorer once before starting, and
confirm it throws.** If it does not, this section is wrong and section 5.2
needs a characterization test before the deletion.

### 1.2 An ABox is many relations, not one

Revision 5 of the proposal said "the ABox becomes a relation", singular,
full-outer-joined across contributing datasets on `external_id`. Revision 6
corrects it: **each concept is its own relation.** `Person`, `Household` and
`Assessment` are separately named, separately queryable, and joinable to each
other and to datasets. This spec implements the corrected shape and never
builds the singular one.

### 1.3 The extension is a computed row set, and its grain is wrong

`AttributeAssertionClient.getConceptExtension()` reaches QETL already, so the
gap is not that concepts bypass the engine. The gap is that the result is a
computed row set rather than a registered relation, and that row set has a
defect the relation shape removes:

`getDatasetColumnAssertions.ts:309-328` runs one query per contributing dataset
and combines them with `promiseFlatMap`, that is, it **concatenates** them.
Each per-dataset query builds its own spine from that dataset
(`SELECT DISTINCT "<pk>" AS external_id FROM "<datasetId>"`). So an individual
contributed to by two datasets yields **two rows**, each carrying the other
dataset's attributes as missing keys, and an `external_id` present in a dataset
but not in `individuals` yields a row anyway.

That is not one row per individual, and it means the two TODOs in
`_runConceptQuery` ("we still need to apply group bys, aggregations, and
sorting") are not the only thing missing: aggregating a concatenated row set
would double count.

### 1.4 `first` is not deterministic, and there are two copies of the bug

`getDatasetColumnAssertions.ts:60-70` emits `LIMIT 1` with no `ORDER BY`. It was
observed returning four distinct values in six runs. `most_frequent` at line 81
emits `ORDER BY COUNT(*) DESC, "<col>"` and is already correct.

**Found during planning: there is a second, divergent copy.**
`AttributeAssertionClient.ts:228-285` reimplements all seven rules inline for
the single-individual path, and its `most_frequent` at line 245 emits
`ORDER BY COUNT(*) DESC` with **no** tie-break. So the correct version and the
incorrect version of the same rule both ship. Any fix that lands in only one
place leaves the individual detail page disagreeing with the concept relation
about the same attribute of the same individual, which is worse than either bug
alone.

### 1.5 Nothing names a concept in DuckDB

`RelationRef.toTableName` (committed, `shared/models/relations/RelationRef/`)
already answers what a concept relation is called: `concept_<uuid>`. Nothing
creates anything under that name. Until something does, `structuredQueryToSql`
has nothing to put in a `FROM` clause, which is why the throw exists.

There is also a name in the way. `generateIndividuals/index.ts:79-101` creates a
DuckDB staging table named with the concept's **bare** UUID
(`DROP TABLE IF EXISTS "$conceptId$"; CREATE TABLE "$conceptId$" AS ...`) and
never drops it afterwards. A bare UUID is, by
`RelationRef.fromTableName`'s definition, always a **dataset**. So the catalog
holds a table that reads back as a dataset ref for an id that is not a dataset.
Section 4.2 renames it.

---

## 2. Goals and non-goals

**Goals.**

1. **One view per concept**, registered in DuckDB under
   `RelationRef.toTableName`, so `structuredQueryToSql` emits an ordinary
   relation reference.
2. **The throw is deleted** and `_runConceptQuery` is **gone**, not extended.
3. **Grain: one row per individual**, proved through the join rather than
   asserted.
4. **All seven value-picker rules deterministic**, with every test input
   constructed to tie.
5. **Filter, group-by, sort and join work on a concept for free**, because they
   come from the existing SQL path.
6. **A6 obligations honoured**: authorization and the cache key both see the
   expanded relation set.

**Non-goals.** Each is named so this spec stays bounded:

- The relation cache, the cache key, the pushdown-plus-result-cache seam
  (spec 2). This spec consumes them; it designs neither.
- New acquisition machinery for concepts. The proposal is explicit that none is
  needed: a concept is Postgres-backed online and DuckDB-backed offline, and
  section 11.2's existing pushdown mode applies unchanged.
- Manual-entry attribute mappings (still unsupported; section 4.4 degrades
  instead of throwing).
- Array-valued attributes (`concept_attributes.is_array`), see section 12.
- Concepts on public and published dashboard snapshots, see section 12.
- Subsumption itself. This spec makes expansion a named seam so that when
  relations land, both obligations are already satisfied; if relations slip,
  expansion is the identity function.

**Behaviour change budget: one deliberate change and one deliberate fix.** The
deliberate change is that a concept source now returns rows instead of throwing.
The deliberate fix is that `first` becomes deterministic, which **will change
some displayed values once**, and that is the point. Everything about dataset
queries and raw SQL is unchanged, including every bookmarked `?sql=` URL.

---

## 3. Decisions (resolved)

| Decision | Resolution | Why |
|---|---|---|
| Table or view for the concept relation? | **View**, `CREATE OR REPLACE VIEW`, rebuilt on every query that references the concept | A view is a definition, so rebuilding is nearly free and **invalidation disappears entirely**. A materialized table would need its own freshness rule the day a contributing dataset reloads or a mapping changes, and that rule is spec 2's job, not this spec's |
| Full-width view or projected view? | **Full width**: every attribute of the concept is a column, always | The view has a stable name, so its schema cannot vary per query, or a bookmarked `SELECT "age" FROM concept_x` breaks when the next query needs fewer columns. Narrowness comes from DuckDB's projection pushdown (section 8) |
| Where do rows come from? | **`individuals`**, the Postgres table, which is authoritative | Proposal section 17. It is also the only spine under which `unique (concept_id, external_id)` proves the grain |
| How do individuals reach DuckDB? | **A registered CSV text file** loaded through the existing `DuckDbClient.loadCsv({ tableName, fileText })` | It puts **zero user-controlled text into a SQL string**. Inlining a `VALUES` list would add an escaping obligation on `external_id`, which is user data; the codebase already has that exposure at `AttributeAssertionClient.ts:208` and this spec should not add a second one |
| Where does per-attribute value-picker SQL come from? | **Reuse `getSQLSelectOfMapping`** unchanged in shape, with `externalIdsTable` pointed at the spine | It already takes `externalIdsTable` and `externalIdColumn` as parameters, so the seam exists. Fixing `first` inside it fixes it for `generateIndividuals` too, which imports the same function |
| How does `first` get a total order? | **A second, row-numbered view per dataset**, `ava_rows_<datasetId>`, over `read_parquet(..., file_row_number=true)` | A dataset's public view is `SELECT * FROM read_parquet("<id>")`, so `file_row_number` is not visible through it, and adding it there would leak a column into every `SELECT *` in the product. A parallel view costs one extra `CREATE VIEW` and changes nothing observable |
| Is `row_number() OVER ()` acceptable instead? | **No** | DuckDB's scan order under parallelism is unspecified, so it is an order but not a *stable* one. A rule deterministic only by luck is not deterministic |
| Does the relation expose non-attribute columns? | **`external_id` only**, and only when no attribute is already named `external_id` | It is the join key two concepts share when their identifier attributes are named differently, which the exit criteria need. Everything else (individual id, name, status, `assigned_to`) is deferred rather than guessed |
| Does `AttributeAssertionClient.getConceptExtension` survive? | **Yes, unchanged, for now.** The relation does not call it | The single-individual detail path still uses the client. Consolidating the two is a follow-up (section 12), and forcing it now would grow this spec past tonight |

---

## 4. Architecture

One view per concept. Everything else in this spec is a consequence of that
view's definition.

```text
  StructuredQuery { dataSource: Concept }   or   raw SQL naming concept_<id>
                    |
        RelationRef { kind: "concept", id }
                    |
        expandRelationRefs   (section 5.3)
          -> the concept ref itself
          -> every contributing dataset ref
                    |
        authorize(expanded)   +   cacheKey(expanded)     (A6, section 7)
                    |
        load contributing datasets   (existing relation loading, unchanged)
          -> "<datasetId>"          existing public view
          -> "ava_rows_<datasetId>" row-numbered view    (section 4.6)
                    |
        load the spine   -> "concept_<id>__individuals"  (section 4.3)
                    |
        CREATE OR REPLACE VIEW "concept_<id>"            (section 4.4)
                    |
        run the caller's SQL, unmodified
```

### 4.1 What the relation is

For a concept with attributes `age` (from dataset A) and `region` (from
dataset B), the registered view is:

```sql
CREATE OR REPLACE VIEW "concept_9f1c...e2" AS
SELECT
  individuals."external_id" AS "external_id",
  (
    SELECT "age_years"
    FROM "ava_rows_<datasetA>" dataset
    WHERE individuals."external_id" = dataset."person_id"
    ORDER BY dataset."file_row_number"
    LIMIT 1
  ) AS "age",
  (
    SELECT "region_name"
    FROM "ava_rows_<datasetB>" dataset
    WHERE individuals."external_id" = dataset."hh_id"
    GROUP BY "region_name"
    ORDER BY COUNT(*) DESC, "region_name"
    LIMIT 1
  ) AS "region"
FROM "concept_9f1c...e2__individuals" individuals;
```

Three properties of that shape are load-bearing:

1. **The `FROM` is the spine alone.** Every attribute is a correlated scalar
   subquery, so no join can multiply rows. The grain is the spine's grain, by
   construction (section 4.5).
2. **A missing contribution is a NULL, not a lost row.** A scalar subquery with
   no matching rows returns NULL, which is `LEFT JOIN` semantics without a
   `LEFT JOIN`. An individual contributed to by no dataset still appears, with
   every attribute NULL, which is correct and is what the current concatenating
   implementation cannot express.
3. **It is the same shape the code already emits.** `getSQLSelectOfMapping`
   already produces exactly these correlated subqueries against a spine it is
   told the name of. This is not a new query strategy; it is the existing one
   with one spine instead of many.

### 4.2 Naming

**Use `RelationRef.toTableName`; invent nothing.** It is committed at
`shared/models/relations/RelationRef/RelationRefModule.ts` and it is the single
source of truth for both directions. A concept relation is
`concept_<uuid>`; a dataset stays a bare `<uuid>`.

Two derived names this spec introduces, both deliberately **not** UUID-shaped so
`RelationRef.fromTableName` returns `undefined` for them and the SQL analyzer
never mistakes one for a relation:

| Name | What it is | Lifetime |
|---|---|---|
| `ava_rows_<datasetId>` | Row-numbered view over the same registered parquet file (section 4.6) | Created beside the dataset's public view, dropped with it |
| `concept_<id>__individuals` | The spine table for one concept (section 4.3) | Replaced on every query that references the concept |

`concept_<id>__individuals` starts with the `concept_` prefix, so
`fromTableName` strips it and then tests `<id>__individuals` for UUID shape,
which fails, so the name resolves to `undefined` rather than to a concept ref.
That is the behaviour we want and it is worth a test, because it is the one
place where a derived name deliberately shadows a real prefix.

**One rename is required, not optional.** `generateIndividuals` must stop
naming its staging table with the concept's bare UUID (section 1.5) and use
`ava_staging_individuals_<conceptId>` instead, dropping it when it finishes. As
long as a bare-UUID table exists for a non-dataset id, the invariant "a bare
UUID is always a dataset" is false in the live catalog, and every later spec
that trusts `fromTableName` inherits the hole.

### 4.3 The spine

```ts
// 1. Authoritative rows, from Postgres.
const individuals = await IndividualClient.getAll(
  where("concept_id", "eq", conceptId),
);

// 2. One column, as CSV text. No SQL string carries user data.
const fileText = toCsv(["external_id"], individuals.map(prop("externalId")));

// 3. Existing, tested loader.
await DuckDbClient.loadCsv({
  tableName: `${RelationRef.toTableName(ref)}__individuals`,
  fileText,
  datasetDuckDbLease,
});
```

`toCsv` is RFC 4180 quoting and nothing more (double every `"`, wrap any field
containing a quote, comma or newline). An `external_id` of `O'Brien` must
survive, and an `external_id` containing `","` must survive; both are tests.

**Why not `VALUES`:** inlining requires escaping user text into SQL, and the
one place the codebase already does that
(`AttributeAssertionClient.ts:208`, `WHERE "<pk>" = '$externalId$'`) is an
injection surface this spec would otherwise duplicate. Keep the fallback in
mind if `loadCsv`'s lease handling fights the query's lease: a `VALUES` list
with a single shared escape helper is the fallback, not the plan.

**Scale.** Whole-spine reload per query is right for demo-scale individual
counts (thousands). At tens of thousands it becomes the dominant cost, and the
fix is spec 2's business: cache the spine keyed on the concept plus a freshness
token. `ConceptWrapper` already declares `freshnessSignal: "modified-time"`,
which is exactly the token that would key it.

### 4.4 The attribute columns

For each of the concept's attributes, in a stable order (sorted by attribute
name, so two runs emit byte-identical SQL):

| Attribute's `mapping_type` | Column emitted |
|---|---|
| `dataset_column` | `getSQLSelectOfMapping(...)` against `ava_rows_<datasetId>`, correlated to the spine, aliased to the **attribute name** |
| `manual_entry` | `CAST(NULL AS <duckdb type>) AS "<name>"` |
| no mapping row at all | `CAST(NULL AS <duckdb type>) AS "<name>"` |

**Manual-entry attributes must not throw.** Today
`getAttributeAssertions._getAssertionsByMappingType` throws
`"manual_entry mappings are not supported yet"` for any concept that has one, so
a single manual attribute makes the whole concept unqueryable. A typed NULL
column keeps the concept's schema complete and the concept queryable, and it is
honest: we hold no value. Section 12 records that manual entry stays unread.

**Columns are named by attribute name, not attribute id.** That is what deletes
`_buildConceptQueryResult`'s id-to-name remapping (section 5.2), and it is what
`structuredQueryToSql` already expects, since it selects
`prop("baseColumn.name")`.

**Two naming hazards, both real:**

1. **`concept_attributes` has no unique constraint on `(concept_id, name)`.**
   Verified: `supabase/schemas/20.concept_attributes.sql` has a validation
   trigger for label and identifier attributes only, and one index. Two
   attributes of one concept may share a name, which would emit a view with a
   duplicate column name. **Demo behaviour:** on a duplicate, keep the
   alphabetically first attribute id and suffix the rest as `<name>_2`,
   `<name>_3`, and log a warning. **Follow-up:** add the unique constraint
   through the declarative schema workflow, which is a migration and therefore
   not tonight.
2. **Identifier quoting.** Attribute names are free text and reach SQL as
   identifiers. Use `quoteSqlIdentifier` for every one of them, including the
   `AS` alias, and test an attribute name containing a double quote.

### 4.5 The grain proof

The proposal asks this spec to *prove* the grain holds through the join, not to
add a uniqueness check, because the database already enforces one.

| Step | Why the grain survives |
|---|---|
| `individuals` in Postgres | `unique (concept_id, external_id)` (`20.individuals.sql:24`). Filtering by one `concept_id` therefore yields distinct `external_id` |
| `external_id` is never NULL | `external_id text not null`. The NULL-key exclusion rule revision 5 specified is not needed and must not be added |
| CSV round trip | One row in, one row out; `toCsv` neither deduplicates nor drops. Test: row count in equals `COUNT(*)` out |
| Spine table | `SELECT ... FROM spine`, no join, no `DISTINCT`. A `DISTINCT` here would be a latent bug, not a safety net, because it would mask a spine that had already lost the invariant |
| Attribute columns | Correlated **scalar** subqueries. A scalar subquery contributes exactly one value per outer row or errors; it cannot add rows |

Observable form of the proof, and it is one query:

```sql
SELECT COUNT(*) = COUNT(DISTINCT "external_id") FROM "concept_<id>";
```

That must be `true` for a fixture where one individual is contributed to by
**two** datasets, which is precisely the input that makes today's concatenating
implementation return two rows.

### 4.6 Row-numbered views: what `first` needs

`duckDbParquetLoad.ts:27-29` creates a dataset's view as:

```sql
CREATE VIEW IF NOT EXISTS "<tableName>" AS
SELECT * <exclude> <replace> FROM read_parquet("<tableName>")
```

`file_row_number` is a `read_parquet` option, so it is not in that view, and
turning it on there would add a column to `SELECT *` for every dataset query in
the product. Instead, create a second view over the **same already-registered
file**, in the same function, under the same lease, with the same exclude and
replace clauses:

```sql
CREATE VIEW IF NOT EXISTS "ava_rows_<tableName>" AS
SELECT * <exclude> <replace>
FROM read_parquet("<tableName>", file_row_number = true)
```

Cost: one extra `CREATE VIEW` per dataset load, no extra bytes, no extra file
registration. `dropTableViewAndFile` must drop it alongside the public view, or
a stale row-numbered view outlives its file.

Only the concept relation reads these views. Dataset queries keep reading the
public view, so `SELECT *` on a dataset is unchanged, which is the property that
makes this safe to land in a hurry.

**Fallback, if the second view misbehaves under duckdb-wasm:** order `first` by
the selected column itself, `ORDER BY dataset."<col>" NULLS LAST`. That is
deterministic in the returned *value*, which is what the exit criterion
measures, and it needs no new views. It changes the meaning of `first` from
"first in file order" to "smallest", which is a semantic change worth stating
out loud rather than shipping quietly. Prefer the view; keep this in the pocket.

### 4.7 Relation schema

`ConceptWrapper.describe(ref)` (the method spec 1 declares) returns a
`RelationSchema` built from `concept_attributes` with no rows read:

| `RelationSchema` column | Source |
|---|---|
| name | `concept_attributes.name`, after the de-duplication in 4.4 |
| data type | `concept_attributes.data_type`, an `AvaDataType`, mapped through the existing `DuckDbDataTypeUtils` |
| nullable | always true; a value picker may find nothing |
| plus one | `external_id`, text, not null, unless an attribute has taken the name |

`is_array` is read and **rejected** for now (section 12), not silently
flattened.

---

## 5. Data flow, and the two branches that disappear

Numbered to match spec 1 section 5, with the concept-specific steps marked.

1. **Resolve.** SQL or a `StructuredQuery` yields `RelationRef[]`. For a
   structured query with a concept source this is now
   `[{ kind: "concept", id }]`; for raw SQL it is whatever
   `extractReferencedRelations` finds, which spec 1 taught to recognize
   `concept_<uuid>`.
2. **Expand.** *(new, section 5.3)* Each concept ref expands to itself plus its
   contributing dataset refs.
3. **Authorize** the **expanded** set (section 7).
4. **Probe the cache** with a key computed over the **expanded** set (spec 2).
5. **Load.** Contributing datasets load exactly as today. Then, per concept
   ref: load the spine, then `CREATE OR REPLACE VIEW`.
6. **Execute** the caller's SQL, unmodified.

### 5.1 `structuredQueryToSql`: delete the throw, name the relation

Three edits, all small, all in one file:

| Edit | Before | After |
|---|---|---|
| The throw at lines 48-50 | throws for any `Concept` source | deleted |
| The table name at line 73 | `nestedSubquery ? undefined : dataSource?.id` | `nestedSubquery ? undefined : dataSource && RelationRef.toTableName(toRelationRef(dataSource))` |
| The aggregation gate at line 84 | `if (Model.isOfModelType(column?.baseColumn, "DatasetColumn"))` | accepts a `ConceptAttribute` base column too |

**The third edit is easy to miss and it silently voids an exit criterion.** That
`if` is what populates `groupByColumnNames` and `duckDbAggregations`. A
`ConceptAttribute` base column fails the check, so with only the first two edits
a concept query compiles, runs, and **silently drops every group-by and
aggregation**, which is the same defect `_runConceptQuery`'s TODO recorded, now
hidden one layer deeper. Both branches need only `baseColumn.name`, so the fix
is to drop the model-type narrowing rather than to add a second arm.

`toRelationRef(dataSource)` is a two-line adapter from a `QueryDataSource` model
row to a `RelationRef` (`Model.isOfModelType(source, "Concept")` picks the
kind). It belongs next to `RelationRef`, and its doc comment must say what spec
1's risk table says: a `RelationRef` is a **reference**, a `QueryDataSource` is
a **model row**.

Everything else in the function is already relation-agnostic. Filters, joins,
group-by, having, order-by and limit all operate on quoted column names against
a table name, so they start working on concepts the moment the name resolves.
That is the whole argument for this design: the features arrive by deletion.

### 5.2 `_runConceptQuery`: gone

With `structuredQueryToSql` no longer throwing, `selectSqlToExecute` returns SQL
for a concept source, so `runStructuredQueryWithMetadata` takes its
`if (sqlToRun)` branch and `_runRawSql` runs it. The following become
unreachable and are **deleted**, not left behind:

- `_runConceptQuery`, with both TODOs
- the `Concept` arm of `_runSourceQuery`'s `Model.match`
- `buildConceptQueryResult`, the attribute-id-to-name remap. **Spec 1's lane has
  already extracted it** from this file to
  `src/clients/qetl/wrappers/ConceptWrapper/buildConceptQueryResult.ts`, where
  it serves the wrapper's delegating implementation. It dies with that
  delegation, so check for remaining callers rather than deleting on sight
- the now-unused `Concept` and `AttributeAssertionClient` imports in
  `runStructuredQueryWithMetadata.ts`
- `sortedQueryColumns` threading into `_runSourceQuery`, if nothing needs it

After the deletion, `_runSourceQuery`'s `Model.match` has one arm. Collapse it
to a direct call rather than keeping a one-arm match, so nothing invites a
second special case back in.

**A deletion is only safe if something covers the behaviour it removes.** The
executed row-level test in section 10 covers it, and section 1.1 argues the
removed path was near-dead anyway. Land the test first.

### 5.3 Expansion: a concept ref implies dataset refs

```ts
/**
 * Expands each relation reference to every relation the engine must reach to
 * answer a query naming it. A dataset expands to itself. A concept expands to
 * itself plus every dataset that contributes one of its attributes (and, once
 * subsumption ships, plus every subconcept and their contributors).
 */
export async function expandRelationRefs(
  refs: readonly RelationRef.T[],
  ctx: WrapperContext,
): Promise<RelationRef.T[]>;
```

For a concept, the contributors are found from `concept_attributes` joined to
`attribute_mappings__dataset_column`, taking `dataset_id`. The clients for both
already exist (`ConceptAttributeClient.getAllAttributeMappings`), so this is a
query, not new machinery.

Two properties, both consumed by section 7:

1. **Idempotent and order-independent**, because spec 2 hashes the result. Sort
   the output by `(kind, id)` and de-duplicate before returning.
2. **Fail closed.** If a contributor cannot be resolved (a mapping pointing at a
   deleted dataset), return `unsupported` in spec 1's sense rather than a
   shorter list. A shorter list means a relation gets loaded that nothing
   authorized, or authorized rows served from a key that does not mention them.

**The workspace allowlist must learn about concepts.**
`WorkspaceQetlClient.ts:118-125` intersects the analyzer's ids with every
dataset id in the workspace, and that intersection is a security control, not a
convenience: a table name for a dataset in another workspace is dropped. A
concept ref must pass the same gate, against the workspace's concept ids. If it
is added to the loading path without being added to the gate, a `concept_<uuid>`
from another workspace loads. This is the single highest-risk line in the spec.

---

## 6. Deterministic collapse: all seven rules

The rule set is a Postgres enum
(`attribute_mappings__value_picker_rule_type`), so it is closed at seven and
adding one is a migration. Every rule must return the same value for the same
input on every run.

### 6.1 The seven

| Rule | Today | Change | Determinism argument |
|---|---|---|---|
| `first` | `LIMIT 1`, no `ORDER BY` (`getDatasetColumnAssertions.ts:60-70`). Observed: four distinct values in six runs | Add `ORDER BY dataset."file_row_number"` against `ava_rows_<datasetId>`. Across datasets, order by dataset id first (each attribute reads exactly one dataset, so this is only visible once an attribute has several mappings) | `file_row_number` is unique within a parquet file, so the order is **total**, not merely defined. Dataset id alone is insufficient when two rows come from the same dataset, which is the common case |
| `most_frequent` | `ORDER BY COUNT(*) DESC, "<col>"` (line 81) | **None. Verify and leave alone** | Count descending then the value itself is a total order on distinct values, because `GROUP BY` has already made them distinct |
| `sum` | `CAST(SUM(col) AS DOUBLE)` | Sum in `DECIMAL` where the attribute's type allows, then cast | Order-insensitive over a fixed input set, and 4.5 fixes the input set. The residual hazard is **float non-associativity**: DuckDB may add partitions in a different order across runs, so a `DOUBLE` sum can differ in its last bits. Exact `DECIMAL` addition removes the hazard rather than hoping |
| `avg` | `CAST(AVG(col) AS DOUBLE)` | Same treatment as `sum` | `AVG` is `SUM/COUNT` and inherits exactly the same hazard |
| `count` | `CAST(COUNT(col) AS DOUBLE)` | None | Integer, order-insensitive, input set fixed by 4.5. `COUNT(col)` skips NULLs, which is the existing behaviour and is left alone deliberately |
| `max` | `CAST(MAX(col) AS DOUBLE)` | **Drop the `DOUBLE` cast**; cast per the attribute's declared type or not at all | See 6.2: the tie-break the proposal asks for is unnecessary here, and the cast is a live defect |
| `min` | `CAST(MIN(col) AS DOUBLE)` | Same as `max` | Same as `max` |

**Both copies, one fix.** The single-individual path
(`AttributeAssertionClient.ts:228-285`) reimplements all seven inline and its
`most_frequent` lacks the tie-break (section 1.4). Every change in the table
above must land in both places, or the concept relation and the individual
detail page will disagree about the same attribute of the same individual.
Consolidating the two onto one implementation is a follow-up (section 12); for
tonight, fix both and add a test that the two agree on a tied fixture.

### 6.2 Two corrections to the proposal

**`max` and `min` do not need a tie-break, and the proposal's reason for asking
does not apply as implemented.** A tie-break matters for *arg-max*, that is,
"return column B from the row with the greatest A". These rules return the
extremum of the compared column itself, so ties return the same value by
definition. The obligation should be recorded as **conditional**: the day
`max`/`min` become arg-max, they inherit `first`'s total order. Stating this
prevents a reviewer from adding a meaningless `ORDER BY` and believing something
was fixed.

**The live defect in `max`/`min` is the `DOUBLE` cast, which the proposal does
not mention.** `CAST(MAX(col) AS DOUBLE)` on a text or date attribute either
errors or returns a wrong value, so "the maximum assessment date" is broken
today for reasons unrelated to determinism. Casting per the attribute's declared
`data_type` is the correct fix. If that turns out to be more than a small
change, the demo-path shortcut is to keep the cast and restrict `max`/`min` to
numeric attributes with a clear error, which is strictly better than a wrong
number.

### 6.3 Tests must tie

**A rule deterministic only in the absence of ties is not deterministic.** One
fixture, constructed so that every rule ties:

- one individual, `external_id = 'p1'`
- four contributing rows for it, in one dataset, in a known file order
- the picked column holds `'b', 'a', 'a', 'b'`: `first` must resolve by file
  order, `most_frequent` has a two-way count tie broken by value
- a numeric column holding `1, 2, 2, 1`: `max`, `min`, `sum`, `avg`, `count`
  all see repeats
- a text column and a date column, so the `max`/`min` cast is exercised

Assertions, all row-level and executed:

1. Each of the seven returns the documented value on that fixture.
2. **`first` returns the same value across ten consecutive runs** (the
   proposal's exit criterion, asserted literally: run the query ten times in one
   test and assert one distinct value).
3. Both implementations of `most_frequent` return the same value.
4. The generated SQL is byte-identical across two builds of the same view, which
   catches non-deterministic attribute ordering before it becomes a flaky test.

---

## 7. A6: the subsumption obligations

Phase 3 lands in the same window as the ontology gaining relations, so two
obligations must be satisfied now, while they are cheap, rather than after
subsumption exists, when they are a migration.

**Obligation 1: `authorize()` runs on the expanded relation set.** A query
naming only `concept_<id>` reaches every contributing dataset. If authorization
sees only the concept, a user who may see the concept but not one of its
contributing datasets reads that dataset's values through the concept. The
concept view is a read-through, so this is a real escalation, not a theoretical
one.

Verifiable as behaviour: with the principal denied on one contributing dataset,
a query naming only the concept returns `forbidden`. Not empty rows, not NULLs
for that dataset's columns: `forbidden`. This is spec 2's `authorize`, called on
this spec's expanded set, so it is a joint test and section 9 names it as such.

**Obligation 2: the cache key is computed after expansion.** Two queries with
the same meaning must not miss each other, and a key naming only the concept
cannot notice that a contributing dataset changed. The key input is therefore
`expandRelationRefs`' output, which is why 5.3 requires it to be sorted,
de-duplicated and idempotent. Spec 2 owns the key's shape; this spec owns the
set that goes into it.

Verifiable as behaviour: two structured queries that expand to the same set
produce the same key, and reloading one contributing dataset changes it.

**If relations slip, both reduce to no-ops rather than blocking.** With no
subsumption, `expandRelationRefs` still expands a concept to its contributors,
which is obligation 1's real content today. Subclass expansion is one more
branch inside the same function later, with no caller changes. That is the
entire reason to name the function now.

---

## 8. Column projection

Proposal section 12.1 exists because of this query shape: an individual's fields
are drawn from many relations, one column from each, so acquiring whole
relations to read one column each is the motivating cost problem.

**This spec does not implement projected caching (spec 2 owns it), but it must
not block it, and it gets most of the benefit for free.**

The concept view is full width, so a narrow query such as
`SELECT "age" FROM concept_x` still names a view whose definition contains a
subquery per attribute. Two things make that acceptable:

1. **DuckDB prunes unreferenced projection expressions.** A scalar subquery in a
   view's select list that the outer query never references should be eliminated
   during projection pushdown, so a two-column query pays for two subqueries
   rather than twenty. **This must be verified with `EXPLAIN`, not assumed**,
   and it is the single measurement this spec asks for.
2. **If pruning does not happen, the result is still correct**, only slower. At
   demo scale that is acceptable; it is not acceptable at ontology scale, and
   the fix is spec 2's column-set cache key plus, if needed, building the view
   with only the referenced columns under a per-column-set name.

Two obligations from 12.1 apply directly and must be respected tonight:

- **Never deduplicate a projection.** No `DISTINCT` anywhere in the view,
  including the spine (4.5 explains why a `DISTINCT` there would be a mask, not
  a guard).
- **Positional alignment needs a row key.** `ava_rows_<datasetId>` carries
  `file_row_number`, which is that key. It exists here for `first`; 12.1 is the
  other reason it is worth having.

---

## 9. What this spec needs from spec 2, and what it owes

Spec 2 owns the cache key and the pushdown-plus-result-cache seam. This spec
designs neither. The seam between them:

| Direction | Item | Note |
|---|---|---|
| Needs from spec 2 | `authorize(refs)` called on the **expanded** set, before any cache probe | Section 7, obligation 1. This spec provides the expansion; spec 2 provides the check and its position in the pipeline |
| Needs from spec 2 | The cache key computed from the **expanded** set | Section 7, obligation 2. This spec guarantees the set is sorted, de-duplicated and idempotent so it can be hashed |
| Needs from spec 2 | A statement of whether a cache hit can serve a query naming a concept at all, given the view is rebuilt per query | The rows are what is cached, not the view, so this should be yes. It needs saying, not assuming |
| Nice from spec 2, not required | Spine caching keyed on concept plus freshness token | Section 4.3. Without it, every concept query reloads the spine, which is fine at demo scale |
| Owes spec 2 | `expandRelationRefs`, as the single named seam both obligations hang on | Section 5.3 |
| Owes spec 2 | The fact that a concept reference implies dataset references, so the cache must not treat a concept as a leaf | Section 5.3 |
| Owes spec 5 | Nothing. Per the proposal, **no new acquisition machinery is needed for concepts** | Section 11.2's existing pushdown mode applies unchanged |

---

## 10. Testing

Executed and row-level, in spec 1's `*.executed.test.ts` node project against
real DuckDB. A test that mocks DuckDB characterizes the mock, and every claim in
this spec is a claim about rows.

| Area | Test |
|---|---|
| Grain | `COUNT(*) = COUNT(DISTINCT external_id)` on a fixture where one individual is contributed to by two datasets. This is the test that fails on today's concatenating implementation |
| Missing contribution | An individual with no row in a contributing dataset appears once, with NULL for that dataset's attributes |
| Unknown external id | A dataset row whose `external_id` has no `individuals` row does **not** appear |
| The seven rules | Section 6.3's tied fixture, all seven, plus the ten-run `first` assertion |
| Both rule copies agree | The relation and `AttributeAssertionClient`'s single-individual path return the same value for the same tied attribute |
| Spine escaping | `external_id` values `O'Brien`, `a,b` and `he said "hi"` all round-trip, and the row count is preserved |
| Attribute name hazards | Duplicate attribute names de-duplicate deterministically; a name containing a double quote is queryable; an attribute named `external_id` wins and suppresses the reserved column |
| Manual entry | A concept with one manual-entry attribute is queryable, with that column NULL, and does not throw |
| `structuredQueryToSql` | A concept source compiles to `FROM "concept_<uuid>"`; a group-by on a `ConceptAttribute` emits a `GROUP BY`; an aggregation on one emits the aggregate. **The group-by case is the regression guard for 5.1's third edit** |
| Naming | `RelationRef.fromTableName("concept_<uuid>__individuals")` is `undefined`; `fromTableName("ava_rows_<uuid>")` is `undefined` |
| Deletion | No reference to `_runConceptQuery`, `buildConceptQueryResult` or `getConceptExtension` remains in `runStructuredQueryWithMetadata` |
| Dataset regression | `SELECT *` on a dataset returns the same columns as before, with **no** `file_row_number`. This is what proves the second view is invisible |
| Raw SQL regression | A bookmarked `?sql=` URL against a dataset, including one with a CTE, returns exactly what it returned before |
| Authorization (with spec 2) | Denied on one contributing dataset, a query naming only the concept returns `forbidden` |
| Determinism of the SQL itself | Building the same view twice produces byte-identical SQL |

---

## 11. Exit criteria

Observable behaviour, in the proposal's words plus the ones this spec added.

1. **Two different concepts** are each selectable in Data Explorer and return
   rows.
2. Each is **chartable on a dashboard** (workspace-authenticated; public
   snapshots are out of scope, section 12).
3. The two are **joined to each other** and the result is correct.
4. One is **joined to a dataset**, with **filter, group-by and sort applied**,
   and the result is correct.
5. `structuredQueryToSql` **no longer throws** for a `Concept`.
6. `_runConceptQuery`'s special-case branch is **gone**, not extended, and so
   are `buildConceptQueryResult` and the `Concept` arm of `_runSourceQuery`.
7. **`first` returns the same value across ten consecutive runs** on an input
   constructed to tie.
8. `COUNT(*) = COUNT(DISTINCT external_id)` on a concept whose individuals are
   contributed to by two datasets.
9. A dataset `SELECT *` returns no `file_row_number` column.
10. **Then read the A2 measurement and decide Phase 4.**

Criteria 3 and 4 do not need a join builder in the UI. There is none: a grep for
join-target producers finds only the DSL, so joins are expressed as raw SQL in
the Data Explorer today. Once the view exists, `SELECT ... FROM "concept_a"
JOIN "concept_b" ON ...` works with no UI work at all, which is why the demo
path is as short as it is.

---

## 12. What this spec deliberately leaves open

Recorded so the next author does not read silence as an answer.

1. **Array-valued attributes are rejected, not supported.**
   `concept_attributes.is_array` exists and no value-picker rule has array
   semantics: all seven collapse to a scalar. Emitting a `LIST` would need an
   ordering rule to stay deterministic (`list(x ORDER BY ...)`), and inventing
   one tonight is guessing. Reject with a clear message and decide the semantics
   deliberately.
2. **Manual-entry mappings stay unread.** They become typed NULL columns
   (4.4). Reading them means resolving `attribute_mappings__manual_entry`, which
   is a different data path and a different spec.
3. **The single-individual path is not consolidated.**
   `AttributeAssertionClient.getAttributeAssertions` keeps its own inline copy
   of the seven rules, fixed in parallel (6.1). The right end state is one
   implementation, most likely `SELECT * FROM concept_<id> WHERE external_id =
   ?` against this spec's view, which would delete roughly 120 lines. It is a
   follow-up because the detail page is not on the demo path.
4. **Concepts on public and published snapshots are unsupported.**
   `PublicQetlClient` has no ontology access and a snapshot stores raw SQL, so a
   published dashboard whose SQL names `concept_<uuid>` will fail. The demo
   target is the workspace-authenticated dashboard. What a snapshot should do
   (materialize the concept's rows at publish time, most likely) is undecided.
5. **The auto-limit does not apply to concepts.**
   `resolveManualQueryForExecution` returns early for a non-`Dataset` source, so
   a concept with a very large extension has no `LIMIT` guard. It does not
   crash; it can be slow. The proposal already assigns the auto-limit seam to
   spec 2's phase.
6. **The spine is reloaded on every query.** Deliberate (4.3). Caching it is
   spec 2 shaped and needs a freshness token, which `ConceptWrapper` already
   declares.
7. **`(concept_id, name)` uniqueness is not enforced in the database.** The view
   de-duplicates deterministically (4.4); the constraint is a migration.
8. **Whether DuckDB prunes unreferenced view subqueries is unmeasured.**
   Section 8. Correctness does not depend on the answer; cost does.
9. **Subsumption expansion is a stub.** `expandRelationRefs` expands concepts to
   contributors only. Subclass expansion is one more branch, no caller changes.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| The group-by gate at `structuredQueryToSql.ts:84` is missed, so concepts return rows but silently ignore group-by and aggregation, reproducing the deleted TODO one layer deeper | Called out as edit three of three in 5.1, with a dedicated row-level test in section 10. It is the most likely way this spec ships looking finished and is not |
| The workspace allowlist is not extended, so a concept from another workspace loads | Named in 5.3 as the highest-risk line. The gate is a security control; test a cross-workspace concept id and expect it dropped |
| `first` becoming deterministic changes values users have already seen and possibly printed | It is a defect fix and the proposal calls it a correctness defect. Say so in the release note rather than hiding it. Determinism is the point; the previous value was one of four |
| Two copies of the seven rules drift further apart because only one is fixed | 6.1 requires both, and a test asserts they agree on a tied fixture. Consolidation is scheduled (section 12) rather than assumed |
| The `ava_rows_` view leaks `file_row_number` into a user-visible result | Only the concept relation reads it. Guarded by the dataset `SELECT *` regression test, which is exit criterion 9 |
| A stale `ava_rows_` view outlives its parquet file | Created in `loadParquetIntoDuckDb` beside the public view and dropped by `dropTableViewAndFile`. Both live in the same file; changing one without the other should be caught in review |
| A bare-UUID staging table for a concept breaks the "bare UUID is always a dataset" invariant that every later spec trusts | The rename in 4.2 is required, not optional, and it is one string plus a drop |
| The spine's CSV round trip mangles an `external_id`, silently dropping or merging individuals | Three escaping tests plus a row-count assertion (section 10). The alternative, `VALUES` inlining, would have made this an injection risk instead of a quoting risk |
| Float sums differ across runs, failing the determinism bar in a way that looks like flakiness | Exact `DECIMAL` addition where the type allows (6.1). If deferred, the ten-run assertion must cover `sum` and `avg` too so the flake is diagnosed as this and not as infrastructure |
| A full-width view makes narrow queries slow enough to look broken in the demo | Measure with `EXPLAIN` (section 8). Correctness is unaffected; if it is slow, cut the demo to concepts with few attributes and let spec 2 fix it properly |
| `loadCsv`'s coordinator lease fights the query's lease, deadlocking the spine load | Pass the query's existing `datasetDuckDbLease` through, exactly as `loadDiceFacts` already does for parquet. The `VALUES` fallback in 4.3 exists for this case |

---

## 14. Minimum demo path

The smallest ordered set of changes that gets two concepts joined and charted.
Everything else in this spec is either a correctness obligation that can land
immediately after, or a follow-up already marked as such. Estimates are for one
engineer who has read the spec.

| # | Step | Effort | Why it is on the path |
|---|---|---|---|
| 1 | Confirm section 1.1: click a concept in Data Explorer, see the throw | 5 min | If it does not throw, the risk story changes and step 6 needs a characterization test first |
| 2 | Add `ava_rows_<datasetId>` beside the dataset view in `duckDbParquetLoad.ts`, and drop it in `dropTableViewAndFile` | 30 min | `first` needs a total order, and the whole determinism exit criterion hangs on it. Fallback in 4.6 if it fights duckdb-wasm |
| 3 | Fix `first` in `getSQLSelectOfMapping` (`ORDER BY file_row_number`, reading `ava_rows_`), and add the `most_frequent` tie-break to the second copy in `AttributeAssertionClient.ts:245` | 45 min | Exit criterion 7. One edit in a shared function also fixes `generateIndividuals`' label picker |
| 4 | Build the concept view: spine from `individuals` through `loadCsv`, one `getSQLSelectOfMapping` column per attribute, typed NULL for manual entry, `CREATE OR REPLACE VIEW` under `RelationRef.toTableName` | 2-3 h | This is the spec. Everything else is plumbing around it |
| 5 | Wire it into relation loading: expand a concept ref to its contributing datasets, extend the workspace allowlist to accept concept refs, load datasets then spine then view | 1-2 h | Without expansion the datasets the view reads are not loaded, and without the allowlist the ref is dropped |
| 6 | `structuredQueryToSql`: delete the throw, name the table through `RelationRef.toTableName`, **and open the aggregation gate at line 84** | 30 min | Exit criteria 5, and criterion 4's group-by. Three edits, one file |
| 7 | Delete `_runConceptQuery`, the `Concept` arm, `ConceptWrapper`'s delegating `buildConceptQueryResult`, and collapse the one-arm match | 20 min | Exit criterion 6 |
| 8 | Rename `generateIndividuals`' bare-UUID staging table and drop it when done | 15 min | Protects the naming invariant every later spec trusts. Cheap now, expensive to discover later |
| 9 | Demo rehearsal: two concepts each selected and charted, then joined in raw SQL, then one joined to a dataset with filter, group-by and sort | 45 min | Exit criteria 1 through 4. No join UI is needed; joins are raw SQL today |

Rough total: **6 to 8 hours**, of which steps 4 and 5 are the substance.

**Deliberately not on the demo path**, and all listed in section 12 or as
obligations above: the `max`/`min` `DOUBLE` cast fix (6.2), exact `DECIMAL`
sums (6.1), spine caching, consolidating the two rule implementations, the
`(concept_id, name)` unique constraint, array attributes, manual-entry reads,
public snapshots, and the `EXPLAIN` pruning measurement.

**On the path but immediately after the rehearsal, tonight if the rehearsal
passes early:** the executed tests in section 10 for grain, the tied fixture and
the ten-run `first` assertion. Steps 3, 4 and 7 are exactly the kind of change
that mocked tests cannot protect, and criteria 6 through 8 are not observable in
a demo at all.
