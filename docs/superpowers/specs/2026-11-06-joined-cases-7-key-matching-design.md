# Joined cases 7: key matching - design

**Status:** Draft
**Date:** 2026-11-06
**Author:** Juan Pablo Sarmiento <pablo@avandarlabs.com>
**Umbrella:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md`
(section 5, "G7. Key matching", and section 6)
**Parents:** `docs/ontology-architecture.md` sections 4, 5, 6, 7.1, 8, 10
**Plan:** `docs/superpowers/plans/2026-11-06-joined-cases-7-key-matching.md`

> Code blocks are illustrative. The repository is the authority on every
> existing signature, and umbrella section 6 is the authority on every shared
> name. Line numbers cite `demo/measles` at `473e133c1`, before plans 1 to 6.

---

## 1. Problem

A record is one key of a case type, and every value is read by matching a
dataset row's key against that record's key. Today the match is exact text:

- The concept view compares `CAST(spine.external_id AS VARCHAR) =
  CAST(dataset."<key>" AS VARCHAR)` (`getEntityKeyComparisonSql`,
  `src/clients/DuckDbClient/duckDbSqlText.ts:117-130`), called from the value
  rules (`getSQLSelectOfMapping.ts:35-39`) and the list path
  (`buildConceptViewSql.ts:141-145`).
- Sync builds the record keys as raw key values:
  `SELECT "<key>" AS external_id FROM "<datasetId>"` for each identifier
  mapping, joined with `UNION ALL`
  (`generateIndividuals.ts:294-299`).

Plans 1 to 6 keep both exact and gather them: the view compares keys in one
function, plan 5's `_buildSourceRowsSql`, and Sync stages
`CAST(<key> AS VARCHAR)` per identifier mapping row in plan 6's
`buildRecordKeyStagingSql` (section 3).

So `P-001` in one dataset never matches `p-001 ` in another, `00017` never
matches the BIGINT `17`, and a dataset that identifies the same people with a
different ID scheme (a lab's sample number, an old registry number) cannot
join at all. The usual cause in real data is formatting drift between
spreadsheets, and the usual fix is a lookup table that pairs one ID scheme
with the other.

## 2. Scope

### In

1. **Normalization.** Each identifier mapping can apply any of `trim`,
   `lowercase`, `alphanumeric_only`, `strip_leading_zeros` to its keys, always
   in one fixed order (section 5.2).
2. **Translation through a lookup dataset** (a crosswalk). An identifier
   mapping can name a dataset and two of its columns: the column holding this
   dataset's keys and the column holding the record key. Normalizations apply
   to the dataset key and to both lookup columns.
3. **Unmatched and ambiguous keys join nothing.** A key with no lookup row, or
   with lookup rows naming more than one distinct record key, gets no record.
   Sync leaves it out and reports how many it left out per dataset. The view
   uses the same expression, so membership and values agree.
4. **One key expression.** `buildRecordKeySql` builds every record key, in
   Sync and in the view, and replaces `getEntityKeyComparisonSql`.
5. **Authoring.** The concept creator form and the chat draft card set key
   matching. Chat may propose it, within the limits of section 5.9.
6. **Loading.** A lookup dataset is a contributing dataset of the view: it is
   loaded, leased, column-projected, and checked against the workspace
   allowlist like any other.
7. **Existing case types do not change.** No normalization and no lookup is
   the default, and that default emits the same key as today.

### Out

- Editing key matching on an existing case type (umbrella section 8: editing
  a case type is its own roadmap item).
- Showing key matching on the case type page after creation (open question 2).
- Fuzzy or probabilistic matching (umbrella section 8).
- Storing the excluded keys or their count (open question 3). The report is a
  notice on the sync job.
- Fixing `DOUBLE` keys, which cast to text as `7.0` (section 7).
- A database check that only identifier mappings carry key matching. The
  columns are inert on any other mapping, and the authoring paths never set
  them there.

## 3. What plans 1 to 6 deliver

This section is reconciled with the final child specs and plans of plans 1
to 6 (`docs/superpowers/specs/2026-11-06-joined-cases-{1..6}-*-design.md`).

| Plan | What this spec builds on |
| --- | --- |
| 1 | `AttributeAssertionClient`, `ConceptWrapper`, the legacy extension, and `getSQLSelectOfMapping` are deleted. The rule SQL lives in `buildAttributeValueSql`. The record page reads `concept_<id>`. |
| 2 | `ValuePickerRule`. Nothing in this spec depends on it. |
| 3, 4 | List and bucketed list fields. Plan 5 moves their source rows into the one stacked module below. |
| 5 | `ConceptAttributeSource = { datasetId; selectColumnName; primaryKeyColumnName; bucketColumnName; position }`, defined in `conceptRelation/buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts`. **Every key comparison of the view, for all three value shapes, happens in one function there, `_buildSourceRowsSql`**, once per source, through `getEntityKeyComparisonSql`. Each dataset's key column is its first identifier source (`_getPrimaryKeyColumnNameByDatasetId`, now over every mapping row through `AttributeSources.getSourceMappingsFromMappings`). New case types get **one ID field with one source per dataset** (`makeAttributesWithIdentifierFromKeyColumns`, used by the form's `transformValues` and by `createdCaseTypeToFormValues`); existing case types keep one identifier field per dataset. An ID field whose key columns differ in type is `varchar`. Hydrated attributes hold `mappings: AttributeMapping[]`; the form's `mappings.datasetColumn` is `AttributeSourceFormValues[]`; chat attributes hold `sources`, and `ChatCaseSourceDataset` still holds each dataset's key. `makeSourceDatasetsFromAttributes` keeps each existing `sourceDatasets` entry whole. `rpc_concepts__create` writes `position`; plan 5's pgTAP cases use the `ac…031` ids. |
| 6 | Sync stages and upserts only `external_id` and `missing_from_source_at`, through `buildRecordKeyStagingSql({ stagingTableName, keySources })` with `RecordKeySource = { datasetId: Dataset.Id; primaryKeyColumnName: string }` (`generateIndividuals/buildRecordKeyStagingSql/`): one `SELECT CAST(<key> AS VARCHAR) AS external_id FROM <dataset>` arm per identifier mapping row, read by `_getRecordKeySources` and run by `_stageRecordKeys`. A record whose label value is empty is named by its `external_id`. |

Key matching therefore lives on each identifier mapping row: for a new case
type, on each source of its one ID field; for an existing one, on each
identifier field's one mapping. Both are the same rows to the engine.

## 4. Approaches

**A. One scalar key expression per dataset row (recommended).**
`buildRecordKeySql` returns a SQL expression that turns one dataset row's key
into its record key, or NULL. Normalization is a chain of string functions.
Translation is a correlated scalar subquery over the lookup dataset that
returns the one distinct normalized record key, or NULL. Sync selects it per
identifier mapping, and the view compares the spine's key against it in each
source branch.

- Plus: one function serves Sync, single values, lists, and buckets, and drops
  into plan 5's per-source branches without changing their shape. No new
  DuckDB objects, lease names, or analyzer prefixes. Verified on DuckDB 1.5.5:
  DuckDB decorrelates the nested subquery inside the view (section 8).
- Minus: the lookup subquery is evaluated inside every query that reads the
  field, rather than once. Sync needs a second statement to count excluded
  keys.

**B. Materialized key tables.** Inside each lease, create
`ava_record_keys_<conceptId>_<datasetId>` mapping each dataset key to its
record key, then have the view join it.

- Plus: each lookup is resolved once per query; Sync could read excluded keys
  straight from the table.
- Minus: a new internal table family that `RelationRef.fromTableName`, the SQL
  analyzer, the lease, and the load order must all learn, as the spine and the
  staging table each had to (`duckDbSqlText.ts:57-76`). Sync and the view
  would build the tables in two places unless Sync also took a lease on them.

**C. Normalize when a dataset is loaded.** Add a normalized key column
through the parquet projection (`columnReplacements`).

- Minus: normalization is a property of a case type, and two case types can
  read the same dataset with different rules, so a dataset cannot carry one
  normalized column. The extra column would also appear in every `SELECT *`.
  It cannot express translation at all.

Recommendation: **A**. It keeps one key implementation, adds no catalog
objects, and its one cost (per-query lookup evaluation) is a DuckDB hash join
at demo scale.

## 5. Design

### 5.1 Schema

`supabase/schemas/00.enum.attribute_mappings__key_normalization.sql` (new,
one datatype per file per `supabase-declarative-schema`):

```sql
create type public.attribute_mappings__key_normalization as enum(
  'trim',
  'lowercase',
  'alphanumeric_only',
  'strip_leading_zeros'
);
```

Declared in application order (section 5.2 and Deviations).

`supabase/schemas/30.attribute_mappings__dataset_column.sql`, columns appended
after plan 5's columns:

```sql
  key_normalizations public.attribute_mappings__key_normalization[] not null default '{}',
  crosswalk_dataset_id uuid,
  crosswalk_source_key_column_id uuid,
  crosswalk_record_key_column_id uuid,
  constraint attribute_mappings__dataset_column__crosswalk_all_or_none check (
    num_nulls(
      crosswalk_dataset_id,
      crosswalk_source_key_column_id,
      crosswalk_record_key_column_id
    ) in (0, 3)
  )
```

No foreign keys, matching `dataset_id` and `dataset_column_id`
(`30.attribute_mappings__dataset_column.sql:19-20`). No RLS change: the
table's policies cover every column. Existing rows take `'{}'` and NULLs, so
their keys do not change (umbrella principle 8).

`rpc_concepts__create` (`50.rpc_concepts__create.sql:130-148`) gains the four
columns in its dataset-column insert, reading `key_normalizations` with
`coalesce(m.key_normalizations, '{}')`, because a payload that omits the key
gives `jsonb_to_recordset` a NULL and the column is `not null`. The signature
does not change.

The desktop mirror lists the table in `ACTIVE_TABLES`
(`apps/desktop/sync/syncable-tables.ts:50`), so the SQLite migrations are
regenerated. The array column becomes JSON text there, like
`data_catalog_listings.pipeline_scope_keys`.

### 5.2 Normalization semantics

Each normalization, as DuckDB SQL over a `VARCHAR` expression `e`. DuckDB
regular expressions are RE2: no lookahead and no backreferences in patterns.

| Value | SQL | Effect |
| --- | --- | --- |
| `trim` | `regexp_replace(e, '^[\s\p{Z}]+\|[\s\p{Z}]+$', '', 'g')` | Removes spaces, tabs, newlines, and Unicode spaces (including U+00A0) at either end. DuckDB's `trim()` keeps tabs and newlines, so it is not used. |
| `lowercase` | `lower(e)` | Unicode lowercase: `ÉCOLE` becomes `école`. |
| `alphanumeric_only` | `regexp_replace(e, '[^\p{L}\p{N}]', '', 'g')` | Keeps Unicode letters and digits only: `José 01` becomes `José01`, `P-001` becomes `P001`. `[[:alnum:]]` is ASCII-only in RE2 and would drop `é`. |
| `strip_leading_zeros` | `regexp_replace(e, '(?s)^0+(.)', '\1')` | Removes every leading `0` that has another character after it, so a lone `0` and `000` both become `0`. `(?s)` lets `.` match a newline. |

They apply in the order of the table whatever order they are stored in, and a
duplicate applies once. After any normalization, an empty result becomes NULL
(`NULLIF(..., '')`): `---` under `alphanumeric_only` or a blank under `trim`
is not a key, and `loadConceptSpine` refuses an empty `external_id`
(`loadConceptSpine.ts:50-66`). With no normalization the expression is exactly
`CAST(<key> AS VARCHAR)`, which is today's dataset side.

Order matters. With the umbrella's order (zeros before symbols), `#007`
becomes `007`; with this order it becomes `7`, which is what a user who ticks
both expects. Verified on DuckDB 1.5.5 (section 8). No input was found where
the umbrella's order matches and this one does not.

### 5.3 Translation semantics

For a mapping on dataset D with key column K, normalizations N, and a lookup
on dataset C with source column S and record column R, the record key of a D
row is:

- the one distinct non-NULL value of N(R) over the rows of C where
  N(S) = N(K), when there is exactly one;
- NULL otherwise: no matching row, or rows naming two or more distinct record
  keys.

Lookup rows whose R is NULL are ignored (umbrella principle 6), so `(55,
NULL)` never makes a key ambiguous. Two rows that differ only before
normalization (`011 -> P-001` and `11 -> p001` under `strip_leading_zeros`,
`lowercase`, `alphanumeric_only`) name one record key and match. A NULL
dataset key matches nothing and is not counted as excluded, as today.

The lookup dataset may be any workspace dataset, including another source of
the same case type (a patients dataset that also holds each patient's lab
number is the natural lookup for a lab dataset).

### 5.4 `buildRecordKeySql`

In `src/clients/DuckDbClient/duckDbSqlText.ts`, replacing
`getEntityKeyComparisonSql`:

```ts
/** How one identifier mapping turns its dataset's key into a record key. */
export type RecordKeyMatching = Readonly<{
  keyNormalizations: readonly DatasetColumnMapping.KeyNormalization[];
  crosswalk: RecordKeyCrosswalk | undefined;
}>;

/** A lookup dataset, by column name, that translates a dataset key. */
export type RecordKeyCrosswalk = Readonly<{
  datasetId: Dataset.Id;
  sourceKeyColumnName: string;
  recordKeyColumnName: string;
}>;

/** Key matching that compares keys exactly, as every case type did before. */
export const EXACT_RECORD_KEY_MATCHING: RecordKeyMatching;

export function buildRecordKeySql(
  options: Readonly<{
    /** The alias the dataset row is read under, for example `dataset`. */
    datasetAlias: string;
    primaryKeyColumnName: string;
    keyMatching: RecordKeyMatching;
  }>,
): string;

/** True when the key matching changes nothing, so no key can be excluded. */
export function isExactRecordKeyMatching(keyMatching: RecordKeyMatching): boolean;
```

Output, with identifiers quoted by `quoteSqlIdentifier`:

- Exact: `CAST("dataset"."person_id" AS VARCHAR)`.
- Normalized: `NULLIF(<chain over CAST(... AS VARCHAR)>, '')`.
- Translated:

  ```sql
  (
    SELECT CASE WHEN count(DISTINCT N("crosswalk"."R")) = 1
      THEN min(N("crosswalk"."R")) END
    FROM "<C>" "crosswalk"
    WHERE N("crosswalk"."S") = N("dataset"."K")
  )
  ```

  where N is the normalization chain, or the plain `CAST` when there is none.
  The subquery reads the lookup's public view `"<C>"`, which needs no row
  order.

**The output is always `VARCHAR`**: the plain cast, a `NULLIF` over string
functions, or a `CASE` over normalized text. Plan 6 stages keys as `VARCHAR`
and diffs them against the stored `external_id`; a key of any other type
would stop matching its existing record, and the stale sweep would flag it
missing. An executed test describes the staging table built with a lookup and
asserts `VARCHAR`.

The view's one call site (section 5.5) compares
`CAST("individuals"."external_id" AS VARCHAR) = <buildRecordKeySql(...)>`,
keeping plan 5's spine cast, so an exact source reads exactly as before. Sync
selects the expression itself and compares nothing.

### 5.5 The view

- `ConceptAttributeSource`, in `buildStackedSourceRowsSql.ts`, gains
  `keyMatching: RecordKeyMatching`, filled from the same mapping row as
  `primaryKeyColumnName`: its dataset's first identifier source.
- `_buildSourceRowsSql`, plan 5's one key comparison for single values,
  lists, and bucketed lists, replaces `getEntityKeyComparisonSql` with
  `CAST("individuals"."external_id" AS VARCHAR) = buildRecordKeySql({
  datasetAlias: "dataset", primaryKeyColumnName: source.primaryKeyColumnName,
  keyMatching: source.keyMatching })`. Nothing else in the value SQL changes.
- `makeConceptAttributeColumnsFromMetadata` replaces
  `_getPrimaryKeyColumnNameByDatasetId` with `_getRecordKeyByDatasetId`,
  which keeps its order (first identifier source per dataset) and returns
  `{ primaryKeyColumnName, keyMatching }` built by
  `getRecordKeyMatchingFromMapping` (new,
  `src/clients/qetl/QueryMediator/conceptRelation/getRecordKeyMatchingFromMapping/`).
  That function resolves the lookup's column ids to names and throws when a
  lookup column is missing or belongs to another dataset (umbrella principle
  7). Sync uses the same function. Plan 5's `_buildSource` copies both fields
  onto each source.
- `_buildAttributeColumn` returns, with each source's dataset, the source's
  lookup dataset, so `contributingDatasetIds` includes every lookup a column
  reads. That one change makes the lookup dataset:
  - checked by `_assertContributorsAllowed`
    (`getConceptRelationPlansFromSql.ts:98-116`), so a lookup in another
    workspace throws;
  - expanded into the query's relations by `expandRelationRefs`
    (`expandRelationRefs.ts:37-44`), so it is loaded and leased before the
    view is created.
- The planner reads the lookup columns too: `_getMappedDatasetColumns`
  (`getConceptRelationPlansFromSql.ts:119-130`) fetches every id from
  `DatasetColumnMapping.getKeyColumnIds(mapping)`, beside plan 4's date
  column.
- Column projection: inside plan 5's per-source loop in
  `_getConceptColumnsByDatasetId` (`getNeededColumnsFromQuery`), each
  lookup's source and record key columns are added under the lookup dataset
  id. Without this a lookup that is also a source would be projected to its
  field columns only and the view would fail to bind.

### 5.6 Sync

Plan 6's `buildRecordKeyStagingSql` is extended, not duplicated:

1. **Staging.** `RecordKeySource` gains `keyMatching: RecordKeyMatching`, and
   `_getRecordKeySources` fills it with `getRecordKeyMatchingFromMapping` for
   each identifier mapping row. Each arm becomes
   `SELECT <buildRecordKeySql> AS external_id FROM "<dataset>" "dataset"`;
   with no key matching that is `CAST("dataset"."<key>" AS VARCHAR)`, the
   value plan 6 staged. Plan 6's throw on no key source, the `DISTINCT`, and
   the NULL filter stay. Plan 6's executed cases pass with
   `keyMatching: EXACT_RECORD_KEY_MATCHING` and nothing else changed.

2. **Excluded keys.** A second builder in the same module,
   `buildExcludedKeyCountsSql(keySources)`, returns the read Sync runs when at
   least one source's key matching is not exact:

   ```sql
   SELECT source_index, count(DISTINCT dataset_key) AS excluded_key_count
   FROM (
     SELECT 1 AS source_index, CAST("dataset"."<K>" AS VARCHAR) AS dataset_key,
       <buildRecordKeySql B> AS external_id
     FROM "<B>" "dataset"
     UNION ALL ...
   )
   WHERE external_id IS NULL AND dataset_key IS NOT NULL
   GROUP BY source_index
   ```

   Only the sources whose matching is not exact appear in it, since an exact
   key is NULL only when the raw key is. It returns `undefined` when none
   does, so an existing case type runs no extra query. The source index is a
   literal integer, not a dataset id, so nothing but quoted identifiers
   reaches the SQL.

3. **Columns read.** `getNeededColumnsFromRecordKeySources(keySources)`, in
   the same module, replaces plan 6's inline `neededColumnsByDatasetId` map in
   `_stageRecordKeys`: each source's key column, plus each lookup's two
   columns under the lookup dataset id, so the `CREATE TABLE AS` does not
   acquire the lookup dataset whole.

The workspace session already refuses a dataset outside the workspace, so a
lookup in another workspace fails Sync the same way the view fails.

The stored `external_id` is the normalized or translated key, which is what
the records list orders by and what plan 6 names a record with no label
value: with `lowercase`, such a record shows `p-001`, not the raw `P-001`,
because the raw key is not stored. The spine holds the same stored keys, so
the view's comparison sees them unchanged.

A record whose key becomes excluded on a later sync (its lookup row was
removed, or a second record key was added) is not seen in the staged set, so
the stale sweep flags it `missing_from_source_at`, exactly as a key that left
the data.

### 5.7 Sync report

`JobProgressStore` (`src/lib/utils/state/JobProgressStore/JobProgressStore.ts`)
gains a fourth entry, kept until the user dismisses it like an error:

```ts
| { status: "notice"; label: string; message: string }
```

and an updater `finishJobWithNotice(jobId, { label, message })`, a no-op when
the job is gone. `JobProgressIndicator` renders it with `role="status"`, a
polite live region, and the dismiss button the error arm already has
(`JobProgressIndicator.tsx:75-86`).

`generateIndividuals` finishes with `finishJob` when nothing was excluded,
and otherwise with `finishJobWithNotice`:

- Label: "Refreshed {conceptName} records"
- Message, one sentence per dataset that lost keys, in source order:
  "{count} ID in {datasetName} did not match a record, so its rows were left
  out." / "{count} IDs in {datasetName} did not match a record, so their rows
  were left out." (Lingui `plural`). Dataset names come from
  `concept.datasets`; an unknown one reads "one of the datasets".

### 5.8 Authoring

**One set of normalizations per case type.** Every authoring surface asks once
("Match IDs that differ only in") and writes the same array to every
identifier mapping row of the case type: every source of plan 5's one ID
field. Storage stays per mapping (umbrella
section 3.1). The reason: a record key from dataset A and one from dataset B
only meet if both went through the same normalization. A per-source choice
lets a user tick "Upper and lower case" for one dataset and not the other,
which splits one person into two records with no error. The engine still
honours each mapping's own array, for a future editor that needs it.

**One lookup per source dataset, optional.** Each source dataset can name a
lookup table and two of its columns.

Models (`shared/models/ontology/AttributeMapping/DatasetColumnMapping/`):

- `DatasetColumnMapping.ts` (new main entry) exports the `DatasetColumnMapping`
  namespace (`T`, `Id`, `KeyNormalization`, `KeyCrosswalk`) merged with the
  value module `DatasetColumnMappingModule`, the way `ConceptStatus` merges
  `ConceptStatusModule`. If an earlier plan already created the entry, the
  members are added to it.
- `DatasetColumnMapping.KeyNormalization` is
  `Enums<"attribute_mappings__key_normalization">` (umbrella section 6).
  `DatasetColumnMapping.KeyCrosswalk` is `{ datasetId: DatasetId;
  sourceKeyColumnId: DatasetColumnId; recordKeyColumnId: DatasetColumnId }`.
- `DatasetColumnMapping.T` gains `keyNormalizations: KeyNormalization[]` and
  optional `crosswalkDatasetId`, `crosswalkSourceKeyColumnId`,
  `crosswalkRecordKeyColumnId`. The insert shape makes `keyNormalizations`
  optional too.
- The parser reads the new columns (missing array becomes `[]`, NULLs become
  `undefined`) and writes `key_normalizations` canonical: deduplicated and in
  application order.
- `DatasetColumnMappingModule` holds `KEY_NORMALIZATIONS` (the registry, in
  application order), `isKeyNormalization`, `toCanonicalKeyNormalizations`,
  `getKeyCrosswalk` (the triple when all three are set), `getKeyCrosswalkIssue`
  (`"incomplete" | "same_column" | undefined` for a draft), and
  `getKeyColumnIds` (key column plus lookup columns).

Shared UI (`src/components/caseKeyMatching/`, mirroring
`src/components/caseStatuses/`):

- `useKeyNormalizationLabels()`: the four labels.
- `KeyNormalizationCheckboxGroup`: a `Checkbox.Group` over
  `KEY_NORMALIZATIONS`, controlled or uncontrolled.
- `KeyLookupFields`: per source, a "Use an ID lookup table for {dataset}"
  button, or, once started, three selects (lookup table from every workspace
  dataset, then its two columns) and a remove button. Controlled or
  uncontrolled (`useUncontrolled`), so it works with the form's uncontrolled
  mode and the card's state alike.

Concept creator form:

- `ConceptFormValues` gains `keyNormalizations` and, per `sourceDatasets`
  entry, `keyCrosswalk?: DatasetColumnMapping.KeyCrosswalkDraft`
  (`conceptFormTypes.ts:65-68`). Plan 5's `makeSourceDatasetsFromAttributes`
  keeps an existing entry whole, so a chosen lookup survives field edits.
- The checkbox group sits after the ID block, and a lookup row per source
  dataset under it.
- Validation blocks submit while a started lookup is incomplete or uses one
  column twice.
- `transformValues` runs `applyKeyMatchingToIdentifierAttributes` (new,
  `src/views/OntologyDesignerApp/applyKeyMatchingToIdentifierAttributes/`)
  over the result of plan 5's `makeAttributesWithIdentifierFromKeyColumns`.
  It writes the normalizations onto every source of every identifier field
  (`mappings.datasetColumn` is a list of sources since plan 5), and each
  source its own dataset's lookup. `createdCaseTypeToFormValues` does the
  same after its fold.

Draft card:

- `useCaseTypeDraftEditor` gains `setKeyNormalizations`, and holds lookup
  drafts beside the draft by dataset id (`keyCrosswalkDrafts`,
  `setKeyCrosswalkDraft`), the way it holds the status set beside the draft
  (`useCaseTypeDraftEditor.ts:122-135`). The returned `draft` carries only
  complete lookups. `canCreate` is false while a started lookup has an issue.
- The checkbox group sits under "Where the fields come from". Each source
  section shows `KeyLookupFields` under its join key select
  (`CaseTypeDraftSourceSection.tsx:68-81`).

Conversion:

- `proposedCaseTypeToCreatedCaseType` carries `keyNormalizations`; each
  source's `keyCrosswalk` already travels with the source object.
- `createdCaseTypeToFormValues` resolves each source's lookup against the
  workspace's columns: both columns must exist, belong to the lookup dataset,
  and differ, or the lookup is dropped (the same treatment unknown column ids
  get today). It applies key matching after plan 5's fold has built the one
  ID field, so every source of that field gets it.
- `insertConceptFromFormValues` and `ConceptClient.create` need no change:
  the mapping drafts already pass through the parser.

### 5.9 Chat

Chat sees catalog metadata only (`ontology-architecture.md` section 10), so
it can see names, types, and descriptions, never whether two keys actually
differ. Decisions:

- **Contract** (`shared/types/chat.types.ts`):
  - `ChatCaseKeyNormalization`, mirroring the enum.
  - `ChatCaseKeyCrosswalk = { datasetId; sourceKeyColumnId; recordKeyColumnId }`.
  - `keyCrosswalk?: ChatCaseKeyCrosswalk` on `ChatCaseSourceDataset`
    (`chat.types.ts:148`), where a dataset's key already lives.
  - `keyNormalizations?: ChatCaseKeyNormalization[]` on `ChatProposedCaseType`
    and `ChatCreatedCaseType` (one set per case type, section 5.8).
- **What the model may propose.** Normalizations only when the catalog gives a
  reason: a key that is numeric in one source and text in another
  (`trim`, `strip_leading_zeros`), a code column whose name implies zero
  padding (zip, FIPS), or a clarification answer that says IDs differ. A
  lookup only when a catalog dataset has one column that names or types like
  a source's key and another that names or types like the shared key, or its
  name or description says it pairs the two. It never invents one to rescue a
  dataset; the rule "leave a dataset out when nothing carries the shared key"
  stays, with this one exception.
- **Why chat may propose a lookup at all.** The composer is disabled in Case
  Manager (`ontology-architecture.md` section 5.3), so the model is the only
  one who scans the whole catalog. A wrong lookup is visible on the card
  (dataset and both column names) and is reported by the first sync as
  excluded IDs. Open question 1 asks Kristi whether to keep this.
- **Tools.** `proposeCaseType` gains top-level `keyNormalizations` (an enum
  array) and `keyCrosswalk` on each `sourceDatasets` item. `createCaseTypes`
  gains the same on each case and identity, so the two paths agree.
- **Parsing.** A shared helper (`parsing/parseCaseKeyMatching/`) keeps known
  normalizations (canonical, deduplicated) and keeps a lookup only when it has
  three UUIDs and two different columns. A partial lookup is dropped and the
  source kept, so the card shows the source without a lookup.
- **Prompt.** `buildCaseManagerSystemPrompt` explains both fields and the
  rules above, inside the "Joining rests entirely on the join keys" list
  (`buildCaseManagerSystemPrompt.ts:81-85`).

### 5.10 User-facing copy

No string says crosswalk, normalization, external id, or identifier
attribute. The concept is an "ID lookup table".

| Where | Copy |
| --- | --- |
| Checkbox group label | Match IDs that differ only in |
| Checkbox group description | Applies to the IDs of every dataset and ID lookup table. |
| `trim` | Spaces at the start or end |
| `lowercase` | Upper and lower case |
| `alphanumeric_only` | Dashes, spaces, and other symbols |
| `strip_leading_zeros` | Zeros at the start |
| Start a lookup | Use an ID lookup table for {datasetName} |
| Lookup description | Use this when {datasetName} identifies records with different IDs. Each ID must match exactly one {recordNoun} in the lookup table. |
| Lookup selects | ID lookup table; Column with {datasetName} IDs; Column with the matching {recordNoun} ID |
| Remove a lookup | Stop using an ID lookup table for {datasetName} |
| Incomplete lookup | Choose the lookup table and both of its columns. |
| Same column twice | Choose two different columns. |
| Sync notice | section 5.7 |

`{recordNoun}` is "case" on the draft card, which already says "case", and the
case type's name on the form, which already uses it.

## 6. Error handling

| Condition | Behaviour |
| --- | --- |
| Lookup column missing, or from another dataset | `getRecordKeyMatchingFromMapping` throws at planning time (the query fails) and inside Sync (the job shows an error). Never NULL values. |
| Lookup dataset in another workspace | The view's allowlist throws; Sync's workspace session refuses the dataset. |
| Lookup dataset deleted | The same failure as any deleted contributor today (`ontology-architecture.md` section 16: no foreign key from mappings to datasets). |
| Partial lookup written directly to the table | `attribute_mappings__dataset_column__crosswalk_all_or_none` rejects it (`23514`). Through the RPC the whole case type rolls back. |
| Unknown normalization label | Postgres rejects it (`22P02`); the parsers never send one. |
| Key normalizes to empty, has no lookup row, or is ambiguous | Record key NULL: no record, no values, counted in the Sync notice. |
| Raw key NULL | No record and not counted, as today. |
| A previously matched key stops matching | Flagged `missing_from_source_at` by the stale sweep. |
| Mappings of one case type with different normalizations | Only through direct writes. Each mapping applies its own; records may split. |
| Lookup in a chat proposal is partial or uses one column twice | Dropped by the edge parser; the source stays. |
| Lookup columns not in the lookup dataset (createCaseTypes path) | Dropped by `createdCaseTypeToFormValues`. |
| Excluded-key query fails | Sync fails with the job's error, after staging and before any write. |

## 7. Known limits kept

- `DOUBLE` key columns cast to text as `7.0`, so they do not match `7` with or
  without normalization. Unchanged from today.
- The lookup subquery runs inside every query that reads a translated field.
  Fine at demo scale; the relation cache is where a precomputed key table
  would go later.
- A lookup table cannot itself be translated through another lookup.

## 8. Testing

DuckDB facts were verified on DuckDB 1.5.5 through the repo's
`@duckdb/node-api` (no `duckdb` CLI is installed): the four normalization
expressions, both orders on `#007`, the lookup rule on unique, ambiguous,
missing, NULL, and padded keys, the Sync staging and excluded-count
statements, and a view that reads a translated source through a nested
correlated subquery for `first`, `sum`, and `list`.

| Layer | Test | Proves |
| --- | --- | --- |
| pgTAP | new `supabase/tests/database/attribute_mappings__dataset_column__key_matching.test.sql` | `'{}'` default; all-or-none (0, 1, and 2 lookup columns set); unknown label rejected |
| pgTAP | `rpc_concepts__create.test.sql` | The RPC stores normalizations (JSON array to enum array) and a lookup; a payload without them stores `'{}'` and NULLs |
| Executed | new `src/clients/DuckDbClient/duckDbSqlText.executed.test.ts` | Each normalization; stored order does not matter; `#007`; empty becomes NULL; lookup unique, missing, ambiguous, NULL record key, padded lookup keys; **exact matching returns the same value as `CAST(key AS VARCHAR)` for every row of a mixed fixture (BIGINT, padded, mixed case)** |
| Executed | `buildConceptViewSql.executed.test.ts` (the view over plan 5's stacked rows) | A translated source attaches values only to matched records, as a single value and as a list; an ambiguous key's rows contribute to no record; plan 5's cases, the per-month ones included, pass unchanged with exact matching on every source |
| Executed | plan 6's `buildRecordKeyStagingSql.executed.test.ts`, extended | Plan 6's cases unchanged with exact matching; staged keys with a lookup; the staged column is `VARCHAR` with normalization and a lookup; excluded counts per source; an all-exact case type builds no excluded-count query |
| Unit | `getRecordKeyMatchingFromMapping.test.ts` | Names resolved; missing or foreign lookup column throws; defaults give exact matching |
| Unit | `makeConceptAttributeColumnsFromMetadata` tests | Sources carry key matching; lookup datasets are contributors; default mappings produce exact matching and the same contributors as before |
| Unit | `getConceptRelationPlansFromSql.test.ts` | Lookup columns are fetched; a lookup dataset outside the allowlist throws |
| Unit | `getNeededColumnsFromQuery.test.ts` | A lookup dataset needs its two columns, also when it is a source |
| Unit | `generateIndividuals.test.ts` | The staging SQL names the lookup dataset (analyzer); needed columns include the lookup columns; excluded keys end the job as a notice; an exact case type runs no excluded-count query |
| Unit | `JobProgressStore.test.ts`, `JobProgressPanel.test.tsx` | Notice entry and its dismissal |
| Unit | `DatasetColumnMappingModule.test.ts`, `DatasetColumnMappingParsers.test.ts` | Canonical order, lookup triple and issues, parser defaults and canonical writes |
| Unit | `parseCaseKeyMatching.test.ts`, `parseProposeCaseType.test.ts`, `parseCreateCaseTypes.test.ts`, `buildCaseManagerSystemPrompt.test.ts` | Contract parsing and prompt text |
| Unit | `proposedCaseTypeToCreatedCaseType.test.ts`, `createdCaseTypeToFormValues.test.ts`, `applyKeyMatchingToIdentifierAttributes.test.ts`, `ConceptClient.test.ts` | Key matching reaches the RPC payload on identifier mappings only |
| Component | `useCaseTypeDraftEditor.test.ts`, `CaseTypeDraftBlock.test.tsx`, `KeyLookupFields.test.tsx` | Card editing and `canCreate` |
| E2E | new `tests/e2e/case-key-matching.spec.ts` | A case type built in the form from two CSVs, with every normalization and a lookup through the first dataset, syncs three records, shows lab totals on the record page, and reports two left-out lab IDs |

## 9. Exit criteria

1. A lab dataset keyed `" lab 9001"`, `LAB9002`, `LAB-9003`, `LAB-9004`,
   joined through a patients dataset that pairs `LAB-9001` and `lab-9002`
   with patients `0017A` and `0018B` and pairs `LAB-9003` with two patients,
   syncs three records, shows lab totals 12 and 4 for the first two, and
   reports "2 IDs in ... did not match a record".
2. A case type with no key matching stages the same keys and returns the same
   view values as before this plan (executed test), and Sync runs no extra
   query for it.
3. `rg -n "getEntityKeyComparisonSql" src shared supabase` returns nothing.
4. `pnpm test:db`, `pnpm test:frontend`, `pnpm test:executed`,
   `pnpm type-check`, `pnpm lint`, `pnpm i18n:check`, and
   `pnpm test:e2e case-key-matching.spec.ts` pass.
5. `docs/ontology-architecture.md` describes key matching in sections 2, 4,
   5, 6, 7.1, 8, 10, and 14.

## 10. Files

```text
supabase/schemas/
  00.enum.attribute_mappings__key_normalization.sql   new enum
  30.attribute_mappings__dataset_column.sql           4 columns, all-or-none check
  50.rpc_concepts__create.sql                         writes the 4 columns
supabase/migrations/<ts>_add_key_matching_to_dataset_column_mappings.sql  generated
supabase/migrations/<ts>_write_key_matching_in_rpc_concepts__create.sql   generated
supabase/tests/database/
  attribute_mappings__dataset_column__key_matching.test.sql   new
  rpc_concepts__create.test.sql                                + 4 assertions
shared/types/database.types.ts                         regenerated
apps/desktop/migrations/*.gen.sql                      regenerated

shared/models/ontology/AttributeMapping/DatasetColumnMapping/
  DatasetColumnMapping.ts                    new main entry (namespace + module)
  DatasetColumnMapping.types.ts              key matching fields and types
  DatasetColumnMappingParsers.ts             new columns, canonical writes
  DatasetColumnMappingParsers.test.ts        new
  DatasetColumnMappingModule/DatasetColumnMappingModule.ts (+ .test.ts)   new
shared/types/chat.types.ts                   ChatCaseKeyNormalization, ChatCaseKeyCrosswalk, fields

src/clients/DuckDbClient/duckDbSqlText.ts    buildRecordKeySql replaces getEntityKeyComparisonSql
src/clients/DuckDbClient/duckDbSqlText.executed.test.ts   new
src/clients/qetl/QueryMediator/conceptRelation/
  buildStackedSourceRowsSql/buildStackedSourceRowsSql.ts   ConceptAttributeSource + keyMatching; _buildSourceRowsSql key filter
  buildConceptViewSql/buildConceptViewSql.executed.test.ts key matching cases
  makeConceptAttributeColumnsFromMetadata.ts                record key per dataset, lookup contributors
  getRecordKeyMatchingFromMapping/ (+ test)                 new
  getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts   lookup columns fetched
  loadConceptSpine/loadConceptSpine.ts                      docstring names buildRecordKeySql
src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts   lookup columns

src/lib/utils/state/JobProgressStore/JobProgressStore.ts   notice entry
src/components/JobProgressPanel/JobProgressIndicator.tsx   notice arm
src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/
  generateIndividuals.ts                     key matching on key sources, excluded counts, notice
  buildRecordKeyStagingSql/ (+ executed test)   plan 6's: RecordKeySource.keyMatching, excluded counts, needed columns

src/components/caseKeyMatching/              new: labels hook, checkbox group, lookup fields
src/views/OntologyDesignerApp/
  applyKeyMatchingToIdentifierAttributes/ (+ test)   new
  ConceptCreatorView/conceptFormTypes.ts, index.tsx, DatasetColumnAttributesBlock/index.tsx,
    DatasetColumnAttributesBlock/KeyMatchingBlock/ (new), makeSourceDatasetsFromAttributes test
  createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts
  proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts
src/components/ChatPanel/CaseTypeDraftBlock/
  useCaseTypeDraftEditor.ts, CaseTypeDraftCard.tsx, CaseTypeDraftSourceSection.tsx

supabase/functions/chat/PostChatMessages/
  parsing/parseCaseKeyMatching/ (+ test)     new
  parsing/parseProposeCaseType.ts, parsing/parseCreateCaseTypes.ts
  prompt/makeChatToolConfigFromOptions.ts, prompt/buildCaseManagerSystemPrompt.ts

tests/data/key-matching/{patients,lab-results}.csv   new fixtures
tests/e2e/case-key-matching.spec.ts                  new
src/i18n/locales/*/messages.{po,ts}                  regenerated
docs/ontology-architecture.md
```

## 11. Deviations from the umbrella spec

1. **Application order.** The umbrella applies `strip_leading_zeros` before
   `alphanumeric_only`. This spec applies `alphanumeric_only` first, and
   declares the enum in that order so there is one order everywhere. The set
   of labels and every shared name are unchanged. Reason: with the
   umbrella's order a key like `#007` keeps its zeros (`007`), because the
   zeros only reach the start after the symbol is removed. Verified on DuckDB
   1.5.5; no input was found where the umbrella's order is better. Accepted
   by the coordinator on 2026-11-06, who is updating the umbrella to match.
2. **Extensions, not changes:** `ConceptAttributeSource` (plan 5) and
   `RecordKeySource` (plan 6) each gain `keyMatching: RecordKeyMatching`. No
   existing field or function is renamed, and Sync keeps plan 6's one
   staging builder.
3. **Clarification:** `buildRecordKeySql` returns the record key expression,
   not a comparison, because Sync needs the key itself after plan 6. The view
   writes the comparison around it. It still replaces
   `getEntityKeyComparisonSql` everywhere.

## 12. Open questions for Kristi

1. **May chat propose an ID lookup table from catalog names alone?** This spec
   says yes, only when one dataset plainly pairs the two IDs, because the
   model is the one scanning the catalog and a wrong guess shows on the card
   and in the sync notice. The alternative is that only users add lookups on
   the card.
2. **Should the case type page show how its IDs are matched** (the
   normalizations and each source's lookup table)? Out of scope here; without
   it a user can only see key matching while creating the case type.
3. **Is a dismissible notice enough for left-out IDs?** It disappears once
   dismissed. Keeping the last sync's counts on the case type page means
   storing them, a new column on `concepts` (not a field value, but new
   state).
