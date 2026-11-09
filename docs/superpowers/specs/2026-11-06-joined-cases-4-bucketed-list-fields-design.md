# Joined cases G4: bucketed list fields - design

**Status:** Draft
**Date:** 2026-11-06
**Author:** Juan Pablo Sarmiento <pablo@avandarlabs.com>
**Umbrella:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md`
(sections 2, 3, 5 "G4", 6)
**Parents:** `docs/ontology-architecture.md` sections 4, 5, 7, 8, 12
**Builds on:** `2026-11-06-joined-cases-1-record-page-concept-view-design.md`,
`-2-typed-value-rules-design.md`, `-3-list-fields-design.md`
**Plan:** `docs/superpowers/plans/2026-11-06-joined-cases-4-bucketed-list-fields.md`

> Code blocks are illustrative. The repository is the authority on every
> existing signature, and umbrella section 6 is the authority on every shared
> name. Line numbers cite `demo/measles` at `473e133c1`, before G1 to G3;
> names those plans introduce are cited from their plans.

---

## 1. Problem

A case type cannot say "the monthly average temperature of this patient". A
field is one value (a rule collapses every row to one) or, after G3, every
value. Nothing groups rows by period:

- `concept_attributes` has no grain
  (`supabase/schemas/20.concept_attributes.sql:3-24`) and
  `attribute_mappings__dataset_column` has no date column
  (`supabase/schemas/30.attribute_mappings__dataset_column.sql:11-21`).
- After G3 the view matches each column on
  `ConceptAttribute.ValueShape = "single" | "list"`, so a rule is applied once
  or not at all.
- No reader can show a period and its value. G3's record page lists a
  list's values one per line, and its grid joins them with `; `
  (G3 spec 4.5, 4.10); a struct element would print as `[object Object]`.

Three findings shape the design:

- **The bucket arrives as a number.** G3's Arrow decoding turns a struct
  element into a plain object through its scalar rule, so a `BIGINT` value
  becomes a number but a `DATE` field inside the struct stays epoch
  milliseconds (apache-arrow 17, probed in Node). Every reader has to read it
  as a UTC calendar date.
- **A site no checklist names.** When the mediator projects a contributing
  dataset to the columns a concept reads, it takes each field's value and key
  column only
  (`src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts:78-93`).
  A date column the view reads but the load omits fails to bind.
  `docs/ontology-architecture.md` section 12 does not list it.
- **`RelationColumn` reaches no consumer.** It is built only by
  `readDatasetRelationSchema` once G1 deletes `ConceptWrapper`, and
  `describe` has no production caller (`createDefaultRegistry.ts:195-198`
  only delegates). The consumers that need to tell a per-period field from a
  list read `QueryColumn.baseColumn` and `QueryResultColumn` (G3 spec 4.12).

## 2. Scope

**In**

1. Schema: enum `concept_attributes__bucket_grain`,
   `concept_attributes.bucket_grain`,
   `attribute_mappings__dataset_column.bucket_column_id`, their constraints,
   and `rpc_concepts__create` writing both columns and requiring a rule on a
   per-period field.
2. Models: `ConceptAttribute.BucketGrain`, `bucketGrain`, `bucketColumnId`,
   `"bucketed_list"` in `ConceptAttribute.ValueShape`, and a shared reader for
   the value (`ConceptAttribute.toBucketedListEntries`).
3. The view: one correlated subquery per per-period field producing
   `STRUCT(bucket DATE, value R)[]`, every rule per period with exactly the
   single-value semantics, plus the planning and projection sites that must
   read the date column.
4. `bucketGrain` where consumers read it: on `QueryColumn.baseColumn` (the
   field) and on `QueryResultColumn` (section 5.7).
5. Authoring: the concept creator form, the chat contract
   (`ChatCaseBucketGrain`, `bucketGrain`, `bucketColumnId`, `"bucketed_list"`
   in `ChatCaseValueShape`), the `proposeCaseType` tool schema and parser,
   prompt guidance for "per month" requests, the draft card, and both
   conversions to the insert payload.
6. Reading: the record page period and value table (a new surface), the Data
   Explorer grid and its operation gate, the case type page's field list, and
   chat's SQL schema context (online and offline).
7. `docs/ontology-architecture.md`.

**Out**

- Filling empty periods, rolling windows, and distinct lists (umbrella
  section 8). A query does these over the view.
- Several sources per field (G5). This design keeps one mapping per field and
  marks the seam G5 replaces (section 5.3).
- The `createCaseTypes` tool. It carries no value rule, which a per-period
  field needs, and G3's parser reads anything but `"list"` as one value, so
  nothing changes there.
- `RelationColumn` (section 1; recorded in section 10).
- Editing a field's period or date column after creation (umbrella section 8).
- Time zones. A `timestamp` column is a naive DuckDB `TIMESTAMP`
  (`DuckDbDataTypeUtils.fromDatasetColumnType`), so periods are cut on the
  stored wall clock.

## 3. Approaches

The core choice is how the view computes one list of periods per record.

**A. One correlated subquery per field, grouping a normalized row set by
period (recommended).** The field's subquery selects the source rows as
`(bucket, value, row_order)` with NULL values and NULL dates already removed,
groups them by `bucket` applying the rule, and aggregates the groups into an
ordered list.

- Plus: keeps the view's load-bearing property, "the `FROM` is the spine
  alone" (`buildConceptViewSql.ts:46-58`), so the grain stays one row per
  record by construction.
- Plus: the NULL rule is one `WHERE`, identical for every rule.
- Plus: the row set is the seam G5 needs. G5 replaces the one-source row set
  with a `UNION ALL` of sources and changes nothing above it.
- Minus: three nesting levels for `most_frequent`. Probed in DuckDB 1.5.5:
  correct, typed, deterministic.

**B. A helper relation per per-period field, joined into the view.**

- Plus: one scan per field instead of a correlated subquery.
- Minus: breaks "the `FROM` is the spine alone", regroups after the join,
  and adds DuckDB names the lease must hold (`queryRunner._getLeaseNames`);
  DuckDB already decorrelates A into the same joins.

**C. Bucket in TypeScript on the record page.**

- Minus: a second value implementation, which umbrella principle 3 forbids,
  and the Data Explorer and chat would not see the field.

**Recommendation: A.** Each rule is written with ordered aggregates
(`first(value ORDER BY row_order)`, and for `most_frequent`
`first(value ORDER BY frequency DESC, value)` over counted values) rather
than DuckDB's `mode()`, whose tie-break is unspecified.

A second, smaller choice is where "a per-period field's mapping names a date
column of its own dataset" is enforced:

| Option | Catches | Cost |
| --- | --- | --- |
| Trigger on the mapping table (recommended) | Every writer, including a hand-built PostgREST call | One trigger function reading `dataset_columns` |
| Authoring code and planning only | The app's own paths | The same gap as "one identifier per dataset" (`ontology-architecture.md` section 4) |

The trigger runs on the mapping row, after the RPC has inserted the fields,
so it cannot repeat the vacuous-check mistake of
`concept_attributes__validate_label_and_identifiers`. Planning still fails
closed (section 6) for anything the trigger cannot see, such as a date column
retyped later.

## 4. What this builds on

| Gap | Delivered (from its plan) | Used here |
| --- | --- | --- |
| G1 | `buildAttributeValueSql` (the single-value SQL; `getEntityKeyComparisonSql` now quotes with `quoteSqlIdentifier`); `ConceptAttributeColumn.attributeId`; the record page reads `concept_<id>` through `ConceptRecordValuesClient` and builds rows in `makeCaseDetailsRowsFromAttributes`; "No value"; `ConceptWrapper` deleted | The per-period arm sits beside the single-value arm; the row builder carries the period |
| G2 | `ValuePickerRule.getOutputDataType` and `isAllowedForColumnType` | A per-period field's `data_type` is its rule's output type |
| G3 | `ConceptAttribute.ValueShape`, `getValueShape`, `valueShapeToIsArray`, `getOutputDataType` in `ConceptAttributeModule`; `ConceptAttributeColumn` carries `ConceptAttributeValueRule` (`single` with a rule, `list` without); an unmapped list is a typed `[]`; the mapping's rule is nullable and `rpc_concepts__create` refuses `value_rule_mismatch` and `list_field_is_key_or_label`; `ChatCaseValueShape` and `valueShape`; `ValueShapeControl` (One value / Every value); `RecordFieldValue`; `QueryColumn.isList` and `getValidAggregations`; `QueryResultColumn.isArray`; Arrow struct rows become plain objects; the `(list)` marker and list note in chat's SQL context; `keepKeyAndLabelFieldsSingle` | G4 widens both shape unions, so `pnpm type-check` lists every exhaustive branch, then edits by hand the string checks G3 listed (G3 spec 4.12) |

The plan's Task 0 confirms each name in the landed code.

## 5. Design

### 5.1 Schema

```sql
-- supabase/schemas/00.enum.concept_attributes__bucket_grain.sql
create type public.concept_attributes__bucket_grain as enum(
  'day', 'week', 'month', 'quarter', 'year'
);
```

`concept_attributes`:

```sql
  bucket_grain public.concept_attributes__bucket_grain,
  constraint concept_attributes__bucket_grain_requires_array check (
    bucket_grain is null or is_array
  ),
  constraint concept_attributes__bucket_grain_dataset_value_only check (
    bucket_grain is null or (
      mapping_type = 'dataset_column' and not is_label and not is_identifier
    )
  )
```

The first check is the umbrella's. The second is an addition (section 10): a
per-period list cannot name a record or join datasets, and a manual-entry
field has no rows to group. G3 refuses a list label or identifier only in the
RPC; this makes the per-period case a table rule.

`attribute_mappings__dataset_column` gains `bucket_column_id uuid`: the date
or timestamp column of this mapping's dataset that places each row in a
period. A bare id with no foreign key, like `dataset_column_id`.

Trigger `tr__attribute_mappings__dataset_column__validate_bucket_column`,
`before insert or update` on the mapping table, raises `check_violation`
(`23514`) with a stable hint:

| Hint | Raised when |
| --- | --- |
| `bucket_column_required` | the field has a `bucket_grain` and `bucket_column_id` is null |
| `bucket_column_not_allowed` | the field has no `bucket_grain` and `bucket_column_id` is set |
| `bucket_column_not_in_dataset` | `bucket_column_id` is not a column of `dataset_id` |
| `bucket_column_not_a_date` | the column's `data_type` is not `date` or `timestamp` |

The function is `security definer` with `search_path = ''` and no `EXECUTE`
grant. It checks a mapping's shape, not the caller's access: a Case Types
editor can already map a dataset by id, and RLS on `dataset_columns`
(`20.dataset_columns.sql:57-65`, dataset viewer) would otherwise turn "you
cannot see this dataset" into a misleading "not a date column".

**`rpc_concepts__create`.** The attribute insert reads `bucket_grain`, and the
dataset-column mapping insert reads `bucket_column_id`. G3's
`value_rule_mismatch` check refuses `is_array = (rule is not null)`, which
would refuse every per-period field, since a per-period field is an array
that keeps a rule. The condition becomes "a rule exactly when the field does
not keep every value":

```sql
and (a.is_array and a.bucket_grain is null) = (m.value_picker_rule_type is not null)
```

and its message becomes `A dataset field has a value rule unless it keeps
every value`, which G3's two assertions of that message adopt. G3's
`list_field_is_key_or_label` check already covers a per-period field
(`is_array` is true).

### 5.2 Models

`shared/models/ontology/ConceptAttribute/`:

- `ConceptAttributeBucketGrain = Enums<"concept_attributes__bucket_grain">`,
  exposed as `ConceptAttribute.BucketGrain`.
- `ConceptAttribute.T` gains `bucketGrain: ConceptAttribute.BucketGrain |
  undefined` (required key; optional on `Insert`). The parser's
  `DBReadSchema` gains `bucket_grain`. That schema is also the list of keys an
  insert sends (`makeParserRegistry.ts:195-206`), so without it the grain is
  silently dropped on the way to the RPC.
- `ConceptAttributeValueShape` becomes `"single" | "list" | "bucketed_list"`.
- `ConceptAttributeModule` changes and gains:

| Member | Signature | Behavior |
| --- | --- | --- |
| `getValueShape` | parameter `{ isArray: boolean; bucketGrain?: BucketGrain }` | `"bucketed_list"` when `bucketGrain` is set, otherwise G3's rule. `bucketGrain` is optional so form values (an `Insert` shape) pass too |
| `valueShapeToIsArray` | widened | `true` for `"bucketed_list"` |
| `getOutputDataType` | widened | the rule's output type for `"bucketed_list"`, as for `"single"` (umbrella 3.1: the type of `value`) |
| `BUCKET_GRAINS` | `readonly BucketGrain[]` | `day, week, month, quarter, year`, built with `registry` |
| `isBucketDateColumnType` | `(dataType: AvaDataType.T) => boolean` | `date` and `timestamp` only. `AvaDataType.isDateOrTimestamp` also admits `time` (`AvaDataTypeModule.ts:17-21`) |
| `toBucketedListEntries` | `(value: unknown) => BucketedListEntry[] \| undefined` | Reads a per-period value as any DuckDB client delivers it. `bucket` may be epoch milliseconds, a `Date`, or `YYYY-MM-DD`, and always comes back as `YYYY-MM-DD` read in UTC. `undefined` for anything that is not a list of exactly `{ bucket, value }` |

`ConceptAttribute.BucketedListEntry = { bucket: string; value: unknown }`.

`DatasetColumnMapping` gains `bucketColumnId: DatasetColumnId | undefined`
(required key; optional on `Insert`), with `bucket_column_id` in its parser.

### 5.3 The value SQL

New module
`src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql.ts`
exports `buildBucketedListValueSql(options)`, returning the parenthesized
scalar subquery without an alias, and `buildBucketedListTypeSql(valueType)`,
returning `STRUCT("bucket" DATE, "value" <valueType>)[]`. The SQL for a
monthly average:

```sql
(
  SELECT COALESCE(
    list(struct_pack(bucket := per_bucket.bucket, value := per_bucket.value)
      ORDER BY per_bucket.bucket),
    []
  )
  FROM (
    SELECT source_rows.bucket AS bucket,
      CAST(AVG(source_rows.value) AS DOUBLE) AS value
    FROM (
      SELECT
        CAST(date_trunc('month', dataset."visit_date") AS DATE) AS bucket,
        dataset."temperature" AS value,
        dataset.file_row_number AS row_order
      FROM "ava_rows_<datasetId>" dataset
      WHERE <getEntityKeyComparisonSql>
        AND dataset."temperature" IS NOT NULL
        AND dataset."visit_date" IS NOT NULL
    ) source_rows
    GROUP BY source_rows.bucket
  ) per_bucket
)
```

| Rule | Per-period expression over `source_rows` | Output `R` |
| --- | --- | --- |
| `first` | `first(source_rows.value ORDER BY source_rows.row_order)` | column type |
| `most_frequent` | count `(bucket, value)` pairs, then `first(counted.value ORDER BY counted.frequency DESC, counted.value)` per bucket | column type |
| `sum` | `CAST(SUM(source_rows.value) AS DOUBLE)` | `DOUBLE` |
| `avg` | `CAST(AVG(source_rows.value) AS DOUBLE)` | `DOUBLE` |
| `count` | `COUNT(source_rows.value)` | `BIGINT` |
| `max` | `MAX(source_rows.value)` | column type |
| `min` | `MIN(source_rows.value)` | column type |

Each property below was verified with `@duckdb/node-api` 1.5.5 against the
fixture the plan's executed test uses (ties, a NULL first row, NULL-majority,
a NULL date, a NULL-only month, an out-of-order month):

- **NULL rule.** A row whose value or date is NULL never enters
  `source_rows`, so a period exists only when it has a non-NULL value, `first`
  skips a NULL first row, and `most_frequent` never returns NULL even when
  NULL is the commonest cell. A record with no such row gets `[]`.
- **Tie-breaks.** `first` orders by `file_row_number`, never by date.
  `most_frequent` breaks equal counts by value, as the single-value rule does.
- **Order.** Periods are unique per record, so `ORDER BY bucket` is total.
- **Periods.** `CAST(date_trunc(grain, column) AS DATE)` gives the first day
  for `DATE` and `TIMESTAMP` alike. Weeks start on Monday (2026-01-04, a
  Sunday, falls in the week of 2025-12-29). Quarters are calendar quarters.
- **Types.** The view column is `STRUCT(bucket DATE, "value" R)[]`, typed even
  when every record has `[]`.
- **Determinism.** Ten consecutive runs return identical lists.
- **No user data in SQL.** Identifiers go through `quoteSqlIdentifier`; the
  grain reaches SQL only through an exhaustive
  `Record<ConceptAttribute.BucketGrain, string>`.
- **Operations G3 keeps for lists work here too:** `ORDER BY`, `GROUP BY`,
  `count`, and `count(DISTINCT ...)` on a struct list; `sum` and `ILIKE` fail,
  as on any list.

Every construct used predates DuckDB 1.0; the browser's DuckDB-wasm build is
on the 1.5 line.

**The seam for G5.** Three internal steps: `_buildSourceRowsSql` (one
source's rows as `bucket, value, row_order`), `_buildPerBucketValuesSql` (the
rule per period), and the list wrapper. G5 replaces only the first, with a
`UNION ALL` of sources that adds `source_position`, and orders `first` by
`source_position, row_order`.

### 5.4 The view, planning, and projection

G3's `ConceptAttributeValueRule` gains a third arm:

```ts
export type ConceptAttributeValueRule =
  | { valueShape: "single"; valuePickerRuleType: ValuePickerRuleType }
  | { valueShape: "list" }
  | {
      valueShape: "bucketed_list";
      valuePickerRuleType: ValuePickerRuleType;
      bucketGrain: ConceptAttribute.BucketGrain;
      bucketColumnName: string;
    };
```

G5 moves `bucketColumnName` into `ConceptAttributeSource`; the grain and the
rule stay with the field. The view's selector match gets a `bucketed_list`
arm calling `buildBucketedListValueSql`, and the unmapped selector a
`bucketed_list` arm emitting `CAST([] AS STRUCT("bucket" DATE, "value" R)[])`,
following G3's "an unmapped list is a typed empty list".

`makeConceptAttributeColumnsFromMetadata`'s `_getValueRule` builds the
`bucketed_list` arm, failing closed (umbrella principle 7) when the field has
no rule, its mapping names no date column, the column is missing, belongs to
another dataset, or is not a date or timestamp. A mapping that names a date
column for a field without a period also throws.

Two sites the section 12 checklist does not name must read the date column:

- `_getMappedDatasetColumns`
  (`getConceptRelationPlansFromSql.ts:119-130`) fetches the date column ids
  with the value column ids. Without it planning throws "does not exist".
- `_getConceptColumnsByDatasetId` (`getNeededColumnsFromQuery.ts:78-93`)
  adds `bucketColumnName` to the dataset's needed columns. Without it a
  projected load omits the date column and the view fails to bind.

### 5.5 Authoring

Copy never says "bucket" or "grain".

**The controls.** G3's `ValueShapeControl` (a `SegmentedControl` labeled per
shape through an exhaustive record) gains a third segment, **Per period**,
and its accessible name becomes `How many values <field> keeps`. A new
`PeriodControls` (`src/components/caseFields/`), shown for Per period, holds
two selects: the period (**Per day**, **Per week**, **Per month**,
**Per quarter**, **Per year**, named `Period for <field>`) and the date column
(the field's dataset's `date` and `timestamp` columns, named
`Date column for <field>`, with the error `This dataset has no date column`
when there are none). The value rule select stays, now applying within each
period. Choosing Per period defaults the period to month and the date column
to the dataset's first date or timestamp column; choosing another shape
clears both.

**Concept creator form.** `DatasetColumnMappingCreator` uses the same
controls. Validation refuses a per-period field with no date column
(`Choose the date column for this field`). G3's
`keepKeyAndLabelFieldsSingle` sets `isArray: false` on identifiers and the
label; it must also clear `bucketGrain` and the mapping's `bucketColumnId`,
or the check constraint refuses the insert. The submitted `data_type` comes
from G3's `ConceptAttribute.getOutputDataType`, which the widening makes the
rule's output type.

**Chat contract** (`shared/types/chat.types.ts`):

```ts
/** Mirrors `ConceptAttribute.BucketGrain`. */
export type ChatCaseBucketGrain = "day" | "week" | "month" | "quarter" | "year";
// ChatCaseValueShape gains "bucketed_list".
// ChatProposedCaseAttribute and the dataset_column arm of
// ChatCreatedCaseAttribute gain:
//   bucketGrain?: ChatCaseBucketGrain;
//   bucketColumnId?: string;
// Both are present exactly when valueShape is "bucketed_list" (the draft
// editor may hold a per-period field whose date column is still missing).
```

**Parser.** G3's `parseProposeCaseType` reads `"list"` and coerces anything
else to `"single"`. It also accepts `"bucketed_list"`, kept only with a known
grain and a UUID `bucketColumnId`; otherwise the field falls back to
`"single"` and drops both keys, the stance G3 and the existing code take on a
bad guess. A join key or the label is single whatever the model said (G3).
The parser cannot check column types (it has only the tool arguments), so
the client does.

**Tool schema.** `proposeCaseType`'s `valueShape` enum gains
`"bucketed_list"`; `bucketGrain` (enum of the five) and `bucketColumnId`
(string) are optional properties with descriptions.

**Prompt.** One rule beside G3's list rule: when the user wants a value per
day, week, month, quarter, or year ("monthly average temperature", "cases per
week"), propose the column with `valueShape: "bucketed_list"`, the period as
`bucketGrain`, and a `date` or `timestamp` column of the same dataset as
`bucketColumnId`, choosing the value picker that applies within each period;
propose one value when the dataset has no such column; never make a
per-period field the label or a join key.

**Draft card.** `useCaseTypeDraftEditor` gains
`setAttributeBucket(columnId, { bucketGrain, bucketColumnId })`, which sets
the shape too and respects G3's key and label lock; G3's
`setAttributeValueShape` clears both keys. `CaseTypeDraftBlock` already loads
every source dataset's columns (`CaseTypeDraftBlock.tsx:49-58`) and passes
each dataset's date columns down to the row. `canCreate` is false while an
included per-period field has no date column. Rows stay keyed by `columnId`
(`useCaseTypeDraftEditor.ts:44-54`), so one column holds one field in a
draft, as today.

**Conversions.** `proposedCaseTypeToCreatedCaseType` carries the rule and both
keys for a per-period field (its exhaustive match gains the arm).
`createdCaseTypeToFormValues` resolves `bucketColumnId` against the catalog
and drops a per-period field whose date column is unknown, of another
dataset, or not a date or timestamp, the way it drops an unknown column id;
G3 already forces identifiers and the label to one value. G3's
`insertConceptFromFormValues` match keeps the rule for a per-period field.

### 5.6 The record page (new surface)

G3's `RecordFieldValue` matches on the shape; its `bucketed_list` arm renders
`RecordFieldPeriodTable`
(`src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/`)
inside the rail fact:

```text
Temperature   Month      Value
              Aug 2026    38.2
              ...         ...
              Jan 2027    37.9
              Show all 14 months
```

- The six most recent periods, oldest first. **Show all N months** (a Lingui
  plural per period) opens a modal with every period. A modal floats, so it
  is allowed inside the slate (`docs/design/app-view-layout.md`, "The rule").
  G3 shows five list values in the rail; six periods is half a year of
  months.
- Period labels for the grain in the user's locale, read in UTC because the
  bucket arrives as UTC midnight: Day `Jan 5, 2026`, Week
  `Week of Jan 5, 2026`, Month `Jan 2026`, Quarter `Q1 2026`, Year `2026`.
  Week and quarter are Lingui messages, so a translator can reorder them.
- Values by the field's `data_type`: numbers through `Intl.NumberFormat` (at
  most two fraction digits), dates and timestamps in UTC, booleans Yes or No.
- `[]` shows G3's `No values`; NULL shows G1's `No value`.
- A real `<table>` with a visually hidden caption ("Temperature per month")
  and `scope` on header cells; hairlines and type from tokens, no `Paper`,
  `tabular-nums` for values.

`CaseDetailsRow` gains `bucketGrain` and `valueDataType`, set in G1's
`makeCaseDetailsRowsFromAttributes`. The rail keeps its job (reference
material); a content-column section would compete with the activity feed,
which owns that column and docks the composer to its bottom.

### 5.7 The Data Explorer, dashboards, and the case type page

**Operations.** A per-period field is a list for every gate: G3's
`QueryColumn.isList` is true for any shape but `single`, so it gets exactly
G3's list operations (show, sort, group by, count) and never a filter, sum,
average, max, min, chart measure, or dashboard local filter. Sort and group
by compare whole lists, as they do for G3's lists; each was probed on a struct
list. Filtering or charting by period goes through chat SQL, which unnests
the field.

**Display.** The grid shows a per-period cell as `period: value` pairs joined
with G3's `; `, empty for `[]`. The period label depends on whether the
result column knows its grain:

| Grain known | Label | Example |
| --- | --- | --- |
| `day`, `week` | the period's first day | `2026-01-05: 38.50` |
| `month` | `YYYY-MM` | `2026-01: 38.50` |
| `quarter` | `YYYY-Qn` | `2026-Q1: 38.50` |
| `year` | `YYYY` | `2026: 38.50` |
| unknown (raw SQL) | the period's first day | `2026-01-01: 38.50` |

These are ISO-style, so the grid needs no translation and matches its
`YYYY-MM-DD` date columns.

**Where the grain is carried.** The coordinator's correction to the
umbrella's `RelationColumn.bucketGrain` (section 10):

- `QueryColumn.baseColumn` is the `ConceptAttribute`, so it carries
  `bucketGrain` from section 5.2 on. `QueryColumn.getBucketGrain(column)`
  returns it when the column is read whole (no aggregation, or group by) and
  `undefined` otherwise, since a count of a per-period field is a number.
- `QueryResultColumn` gains `bucketGrain?: ConceptAttribute.BucketGrain`.
  `makeProjectionDescriptorsFromStructuredQuery` puts
  `QueryColumn.getBucketGrain` on each `ProjectionDescriptor`, and
  `reconcileQueryResultColumnBindings` copies it onto the bound result column.
  `VisualizationContainer` hands the grains of its bound columns to
  `DataGrid`, which hands them to `makeDataGridColumnDefs`. A raw SQL result
  has no descriptor with a grain, so its periods show their first day.

**Case type page.** `CaseTypeAttributesList` (G3's exhaustive badge match)
shows **Per month** (or the field's period) beside the source.

### 5.8 Chat's SQL schema context

G3 writes a list field as `<name> (list)` when `is_array` and adds a list note
when any field is a list. A per-period field is `is_array`, so both are hand
edits:

- Online (`fetchWorkspaceSchema` selects `concept_id, name, is_array` after
  G3) and offline (`fetchOfflineChatSchema`) attribute rows gain
  `bucket_grain` and `data_type`.
- `formatSchemaBlock` writes a per-period field as
  `Temperature [per month: STRUCT(bucket DATE, value DOUBLE)[]]`, before G3's
  `(list)` check.
- G3's list note counts only lists without a period, because its
  `list_contains` advice is wrong for a struct list.
- `SqlTableAlias.formatBucketedFieldNote` adds one note when a per-period
  field exists, to `buildSqlSystemPrompt` and the offline prompt:

```text
- A field marked [per <period>: STRUCT(bucket DATE, value T)[]] holds one
  entry per period that has data, oldest first. `bucket` is the period's
  first day. A period with no data is missing, not zero. Read it with
  UNNEST, for example:
  SELECT p.entry.bucket AS period, p.entry.value
  FROM "c0" AS c, UNNEST(c."Temperature") AS p(entry)
```

The lateral `UNNEST` form was probed in DuckDB 1.5.5.

### 5.9 Silent sites

`docs/ontology-architecture.md` section 12 is written for a new mapping kind.
For a new field shape, these compile without change and then fail at run
time. Every other site is an exhaustive match the widening turns into a
compile error.

| Site | Failure without the change |
| --- | --- |
| `50.rpc_concepts__create.sql` column lists | The grain and date column are silently not written; the trigger then refuses every per-period mapping |
| `rpc_concepts__create` `value_rule_mismatch` | Every per-period field refused |
| `ConceptAttributeParsers`, `DatasetColumnMappingParsers` `DBReadSchema` | The grain and date column are dropped from the insert payload and from every read |
| `getConceptRelationPlansFromSql._getMappedDatasetColumns` | Planning throws for every per-period field |
| `getNeededColumnsFromQuery._getConceptColumnsByDatasetId` | The view fails to bind under a projected load |
| `parseProposeCaseType` shape read | A proposal's period is read as one value |
| `keepKeyAndLabelFieldsSingle` | A key or label switched from Per period keeps its grain, and the check constraint refuses the case type |
| `formatSchemaBlock` `(list)` marker and G3's list note | Chat writes `list_contains` against a struct list |
| `fetchWorkspaceSchema` and `fetchOfflineChatSchema` selects | Chat never sees the period |
| `makeDataGridColumnDefs` | `[object Object]` in the grid |

## 6. Error handling

| Where | Condition | Behavior |
| --- | --- | --- |
| Database | Grain without `is_array`; grain on a manual-entry, label, or identifier field | `23514`, the two checks |
| Database | Mapping inconsistent with its field's grain, or a date column of another dataset or type | `23514` with the hints in section 5.1; the RPC rolls the whole case type back |
| Database | A per-period field without a rule | `23514`, `value_rule_mismatch` |
| Planning | Any section 5.4 inconsistency, for example a date column retyped to text after creation | Throws, naming the field and the column. The query fails rather than answering with `[]`, as for a missing value column today |
| Chat parser | Unknown grain or no date column on a per-period proposal | Falls back to One value |
| Draft card | No date column in the dataset | Row error; Create disabled |
| `createdCaseTypeToFormValues` | Unknown, foreign, or non-date bucket column | Field dropped, as for an unknown column id |
| Form | Per period without a date column | Field-level validation message |
| Record page | A value that is not a per-period list | Rendered with `unknownToString`, never thrown |

## 7. Testing

| Layer | File | Asserts |
| --- | --- | --- |
| pgTAP | `supabase/tests/database/concept_attributes__bucketed_list.test.sql` (new) | Both checks; all four trigger hints; a date and a timestamp column accepted; the RPC round-trips both columns; a per-period field without a rule refused; a field sent without the keys has none |
| Executed DuckDB | `buildBucketedListValueSql/buildBucketedListValueSql.executed.test.ts` (new) | Every rule per month with ties, a NULL first row, NULL-majority, a NULL date, a NULL-only month, an out-of-order month; every period on `DATE` and `TIMESTAMP`; `[]` for no rows and for only NULLs; column types; ten identical runs |
| Executed DuckDB | `__tests__/conceptAttributeColumns.integration.executed.test.ts` | The view reads the field from metadata; an unmapped per-period field is a typed `[]`; each fail-closed throw |
| Unit | `ConceptAttributeModule.test.ts`, both parser tests, `getConceptRelationPlansFromSql.test.ts`, `getNeededColumnsFromQuery.test.ts`, `duckDbArrowResults.test.ts`, `QueryColumn.test.ts`, `makeProjectionDescriptorsFromStructuredQuery.test.ts`, `reconcileQueryResultColumnBindings.test.ts`, `makeDataGridColumnDefs.test.ts` | As named in the plan |
| Chat | `parseProposeCaseType.test.ts`, `makeChatToolConfigFromOptions.test.ts`, `buildCaseManagerSystemPrompt.test.ts`, `SqlTableAlias.test.ts`, `fetchWorkspaceSchema.test.ts`, `fetchOfflineChatSchema.test.ts`, `buildSqlSystemPrompt.test.ts` | Shapes parsed and coerced; schema, guidance, marker, and note |
| Authoring | `useCaseTypeDraftEditor.test.ts`, `CaseTypeDraftBlock.test.tsx`, `proposedCaseTypeToCreatedCaseType.test.ts`, `createdCaseTypeToFormValues.test.ts`, `insertConceptFromFormValues.test.ts`, `keepKeyAndLabelFieldsSingle.test.ts`, `PeriodControls.test.tsx` | Period chosen, defaulted, cleared, carried, resolved, and persisted |
| Record page | `useBucketPeriodFormatter.test.ts`, `RecordFieldPeriodTable.test.tsx`, `RecordFieldValue.test.tsx` | Labels per grain in UTC; recent periods; show all; empty |
| E2E | `tests/e2e/case-bucketed-fields.spec.ts` (new) | A seeded per-month field shows one row per month on the record page and the same months and averages in the Data Explorer |

## 8. Exit criteria

1. A case type with a monthly `avg` field over a dataset with a NULL value, a
   NULL date, and an empty month shows the same periods and values on the
   record page, in the Data Explorer, and in a chat SQL answer that unnests
   the field.
2. Every rule, per period, returns the values the executed test derives by
   hand from the single-value rule applied to that period's rows.
3. `pnpm test:db`, `pnpm test:executed`, `pnpm test:frontend`,
   `pnpm type-check`, `pnpm lint`, and `pnpm i18n:check` pass, and
   `pnpm test:e2e case-bucketed-fields.spec.ts` passes on its own.
4. Existing case types read exactly as before: every new column defaults to
   NULL, and existing tests change only where a fixture gains `bucketGrain`
   or `bucketColumnId`, or where they assert G3's rule-check message, its
   shape control's accessible name, or its tool schema's shape enum.
5. `docs/ontology-architecture.md` describes per-period fields (sections 4,
   5, 7, 8, 9, 10, 12, 15, 16).

## 9. Files

| File | Change |
| --- | --- |
| `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql` (new) | Enum |
| `supabase/schemas/20.concept_attributes.sql` | Column, two checks |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql` | Column, trigger function, trigger |
| `supabase/schemas/50.rpc_concepts__create.sql` | Two columns; G3's rule check |
| `supabase/migrations/<ts>_add_bucketed_list_fields.sql`, `<ts>_rpc_concepts__create_writes_bucket_columns.sql` (generated) | |
| `supabase/tests/database/concept_attributes__bucketed_list.test.sql` (new), `rpc_concepts__create.test.sql` | pgTAP |
| `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql` (generated) | |
| `shared/models/ontology/ConceptAttribute/` | Type, field, parser, widened shape, module members, tests |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/` | Field, parser |
| `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/` (new) | SQL and executed test |
| `buildConceptViewSql.ts`, `makeConceptAttributeColumnsFromMetadata.ts`, `getConceptRelationPlansFromSql.ts`, `getNeededColumnsFromQuery.ts` | Rule arm, selectors, resolution, fetch, projection |
| `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.test.ts` | One case pinning how a period arrives |
| `shared/models/queries/QueryColumn/QueryColumnModule.ts`, `QueryResult/QueryResult.types.ts`, `QueryResultColumnBindings/` | `isList` arm, `getBucketGrain`, `bucketGrain` on result columns and descriptors |
| `src/components/VisualizationContainer/VisualizationContainer.tsx`, `src/lib/ui/viz/DataGrid.tsx`, `makeDataGridColumnDefs/` | Per-period cells |
| `src/components/caseFields/` | `ValueShapeControl` third segment; new `PeriodControls`, `useBucketGrainLabels`, `useBucketPeriodFormatter` |
| `src/views/IndividualManagerApp/SingleIndividualView/` | `CaseDetailsRow`, `makeCaseDetailsRowsFromAttributes`, `RecordFieldValue`, new `RecordFieldPeriodTable` |
| `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx` | Badge |
| `src/views/OntologyDesignerApp/ConceptCreatorView/` | Controls, validation, `keepKeyAndLabelFieldsSingle` |
| `shared/types/chat.types.ts`, `parseProposeCaseType.ts`, `makeChatToolConfigFromOptions.ts`, `buildCaseManagerSystemPrompt.ts` | Chat contract, parser, schema, guidance |
| `src/components/ChatPanel/CaseTypeDraftBlock/` | Editor, row, block |
| `proposedCaseTypeToCreatedCaseType/`, `createdCaseTypeToFormValues/`, `insertConceptFromFormValues/` | Conversions |
| `fetchWorkspaceSchema.ts`, `fetchOfflineChatSchema.ts`, `offlineChat.types.ts`, `shared/models/chat/SqlTableAlias/`, `buildSqlSystemPrompt.ts`, `buildOfflinePrompts.ts` | Schema context |
| `tests/e2e/case-bucketed-fields.spec.ts`, `tests/e2e/helpers/CaseTypeSeedHelpers.ts`, `tests/e2e/helpers/constants.ts`, `tests/data/case-bucketed-visits/` (new) | E2E |
| `src/i18n/locales/*` (generated) | Catalogs |
| `docs/ontology-architecture.md` | Sections in exit criterion 5 |

## 10. Deviations from the umbrella spec

1. **`bucketGrain` is not added to `RelationColumn`.** Umbrella section 6
   names `bucketGrain` on `RelationColumn` "so every consumer can tell a
   bucketed list from a plain list", but `RelationColumn` reaches no consumer
   (section 1). The name is kept and carried where consumers read it: on the
   field behind `QueryColumn.baseColumn`, on `QueryResultColumn`, and on
   `ProjectionDescriptor` (section 5.7). If a future caller of `describe`
   needs it, adding the same field there is one line in each producer.
2. **A second check constraint,**
   `concept_attributes__bucket_grain_dataset_value_only`, beside the umbrella's
   `check (bucket_grain is null or is_array)` (kept as
   `concept_attributes__bucket_grain_requires_array`).
3. **The mapping rule is enforced both ways by a trigger.** Umbrella 3.1 says
   `bucket_column_id` is "required when the field has a `bucket_grain`". The
   trigger also refuses a date column on a field without a grain, and one
   that is not a date or timestamp of the mapping's own dataset.
4. **G3's `value_rule_mismatch` check and message change** (section 5.1), and
   G3's two assertions of the message change with it.
5. **An unmapped per-period field is a typed `[]`,** following G3's choice for
   unmapped lists, not a NULL.
6. **New names on the shared model namespace:** `BUCKET_GRAINS`,
   `isBucketDateColumnType`, `toBucketedListEntries`, `BucketedListEntry`, and
   `QueryColumn.getBucketGrain`.

## 11. Open questions for Kristi

1. **Data Explorer filters.** A per-period field gets G3's list operations:
   show, sort, group, and count, with no filters and no charting by period.
   "Patients whose January average was above 38" works through chat SQL.
   Should the query form also unnest a per-period field into one row per
   period, so periods can be filtered and charted without chat? (This extends
   G3's open question 2.)
2. **Week labels.** The record page says "Week of Jan 5, 2026"; the grid says
   `2026-01-05`. Epidemiological reporting often uses ISO week numbers
   (`2026-W02`) instead. Which should a week read as?
3. **Record page density.** The rail shows the six most recent periods and a
   "Show all" modal. Would a small chart serve the demo better than a table
   for numeric per-period fields?

## 12. Implementation notes

Plan 4 was built on `feat/joined-cases` on top of plans 1 to 3. Code review
during execution changed the built code in the ways below. Later plans must
start from this code, not from the plan text.

### What differs from the plan text

1. **The mapping trigger is scoped to the mapping's workspace (security).** A
   BEFORE trigger runs ahead of RLS `with check`, so any signed-in user
   reaches it. Its field and column lookups match on `workspace_id`, so another
   workspace's field or column reads as missing, and the
   `bucket_column_not_a_date` detail no longer echoes a column's type. It fires
   only on updates of `concept_attribute_id`, `dataset_id`, and
   `bucket_column_id`. Migration `20261108193037_add_bucketed_list_fields.sql`;
   pgTAP asserts each hint and an `authenticated` editor case.
2. **The RPC's rule check** is `(is_array and bucket_grain is null) = (rule is
   not null)`: a per-period field keeps a rule, a list does not.
3. **Zoned timestamps bucket in UTC.** DuckDB reads an offset-bearing CSV value
   as `TIMESTAMP WITH TIME ZONE`, which the app types as `timestamp`.
   `date_trunc` on it depends on the session time zone, so a period could
   differ between viewers. `BucketedListValueSqlOptions.isBucketColumnZoned`
   (from the column's `detectedDataType`) reads it as `timezone('UTC', col)`.
4. **Text `max` and `min` per period** use the same `arg_max`/`arg_min` over
   `{k: lower(strip_accents(CAST(v AS VARCHAR))), v: v}` as single values
   (section 5.4's table says `MAX`/`MIN`). A review compared per-period results
   with single values over 110 combinations: no mismatches.
5. **Buckets arrive as `YYYY-MM-DD` text.** `arrowTableToJS` turns any date,
   timestamp, or time inside a list element (struct fields included) into
   text. Decimals inside a map or union keep their scale.
   The Arrow-reader test "returns a struct inside a list with each field
   converted as at top level" was replaced, because dates inside a struct in a
   list now become text. Only text and `Date` buckets read as periods: a number
   is never taken for epoch milliseconds.
6. **The record page table** shows the six most recent periods with an inline
   "Show all <n> <periods>" toggle (not a modal), locale period labels, and
   values to at most two decimals (`useBucketValueFormatter`, in
   `src/components/caseFields/`). `CaseDetailsRow` carries plan 3's `dataType`,
   not `valueDataType` (section 5.6).
   An empty per-period field shows "No value", not "No values" as section 5.6
   says.
7. **The Data Explorer grid** labels periods with the same locale hooks
   (`Jan 2026: 38.5; Feb 2026: 37.9`), not ISO labels. `bucketGrain` rides on
   result columns and projection descriptors.
8. **Chat.** The parser keeps a proposed per-period field only when its date
   column is a catalog `date` or `timestamp` column of the attribute's dataset;
   otherwise the field falls back to one value. The SQL context marks
   `Name [per month: STRUCT(bucket DATE, value T)[]]` and adds
   `formatBucketedFieldNote`; the list marker and list note skip per-period
   fields.
9. **Keys and titles never keep a period.** The form clears the period when a
   field becomes a key or the title (`_keepKeyFieldsSingle`,
   `keepKeyAndLabelFieldsSingle`). The draft card disables Create while a
   per-period field's date column is missing, not a date column of its
   dataset, or still loading (`useCaseTypeDraftEditor` takes
   `{ proposedDraft, dateColumnOptionsByDatasetId }`). The form shows "Choose
   the date column for this field" on the date picker.
10. **Planning** fetches the date column in
    `getConceptAttributeColumnsFromConceptId` and keeps it in projected loads
    in `getNeededColumnsFromQuery`.

### Follow-ups

1. **E2E not yet run green.** `tests/e2e/case-bucketed-fields.spec.ts` is
   committed, but no run got past sign-in: the machine was overloaded and the
   local Supabase stack stopped answering. Plan 3's list-field spec failed the
   same way. Re-run all three record page specs once the stack is healthy.
   The final full check also could not reach the local database: every
   migration applied, but seeding and `pnpm test:db` timed out connecting.
   `pnpm test:db` last passed after the RPC change (1222 tests), and no
   database change came after it.
2. **Grid values are formatted as numbers.** A per-period date or boolean
   value shows raw in the Data Explorer; carry the value type onto the result
   column.
3. **Raw SQL results** have no grain, so their periods show as `YYYY-MM-DD`.
4. **Nothing refuses a later `bucket_grain` change** on a field that already
   has a mapping (a direct PostgREST PATCH by an editor). No app path does it.
5. **A mapping can reference another workspace's field** when it has no date
   column (general mapping integrity, older than this plan).
