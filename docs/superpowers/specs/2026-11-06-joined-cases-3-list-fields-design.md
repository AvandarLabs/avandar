# Joined cases 3: list fields - design

**Status:** Draft
**Date:** 2026-11-06
**Author:** Juan Pablo Sarmiento <pablo@avandarlabs.com>
**Umbrella:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md`
(gap G3; sections 2, 3.2, 5 "G3", and 6 are binding here)
**Plan:** `docs/superpowers/plans/2026-11-06-joined-cases-3-list-fields.md`

> This child spec assumes the plans for G1 (record page on the concept view)
> and G2 (typed value rules) have landed. Line numbers below cite
> `demo/measles` at `473e133c1`, before either of them. Where G1 or G2 moves
> or renames a file, this spec uses the umbrella's name for it. G1's own
> spec is `2026-11-06-joined-cases-1-record-page-concept-view-design.md`.

---

## 1. Problem

A field can already be a list in the query engine, and nowhere else.

**The engine has lists.** A field with `is_array` true becomes
`COALESCE(list(value ORDER BY file_row_number), [])` in the concept view
(`_buildArraySelector`, `buildConceptViewSql.ts:133-155`). G1 moves that arm
into `buildAttributeValueSql` and adds the NULL rule, so after G1 a list keeps
every non-NULL value in file order and is `[]` when there is none (umbrella
3.2).

**Nothing else does.** Verified against the code and, where marked, by
running it:

| # | Where | What happens today |
| --- | --- | --- |
| 1 | Chat contract | `ChatCreatedCaseAttribute` (`shared/types/chat.types.ts:123-137`) and `ChatProposedCaseAttribute` (`:192-201`) have no way to say "every value". |
| 2 | Chat parsers and tool schema | `parseProposeCaseType.ts:67-89` and `parseCreateCaseTypes.ts:21-40` read no list option; the `proposeCaseType` attribute schema (`makeChatToolConfigFromOptions.ts:172-221`) offers none. |
| 3 | Chat prompt | `buildCaseManagerSystemPrompt.ts:92` only explains value pickers. |
| 4 | Chat to form | `createdCaseTypeToFormValues.ts:57` hard-codes `isArray: false`. |
| 5 | Draft card | `CaseTypeDraftAttributeRow.tsx:83-97` offers only a value picker. |
| 6 | Concept creator form | The only place `isArray` can be set (`DatasetColumnMappingCreator.tsx:58-99`). It hides the rule select for a list, but the draft keeps its rule (`conceptFormTypes.ts:143`) and the insert parser defaults a missing one to `most_frequent` (`DatasetColumnMappingParsers.ts:62`), so a list field always stores a rule nothing reads. |
| 7 | Storage | `attribute_mappings__dataset_column.value_picker_rule_type` is `not null` (`supabase/schemas/30.attribute_mappings__dataset_column.sql:18`), so a list field cannot store "no rule", which umbrella 3.2 requires. |
| 8 | Keys and labels | Nothing stops a list from being a case type's label or an identifier. Sync names records through the label's rule (`generateIndividuals.ts:300-308`) and matches keys through identifier columns, and neither means anything for a list. |
| 9 | Reading results | `_toJsValueFromArrowValue` (`src/clients/DuckDbClient/duckDbArrowResults.ts:14-17`) calls `item.toJSON()` on every list element. **Verified with apache-arrow 17.0.0:** any non-empty list of text, numbers, or dates throws `item.toJSON is not a function`, and an empty number list becomes a typed array. Every browser query that returns a list column fails. **G1 fixes this** (its section 4.6): list cells become plain arrays. G1 leaves a list's dates as epoch numbers. |
| 10 | Result column types | `arrowFieldToQueryResultField.ts:61-86` reports a list column as `varchar` and logs `Unhandleable arrow type` for it. |
| 11 | Data Explorer filters | Every column is offered (`QueryFiltersField.tsx:67-81`) with operators chosen by `dataType` (`QueryFilterOperator.ts:203-220`), so a text list gets all text operators. **Verified in DuckDB:** `lower`, `trim`, `LIKE`, `ILIKE`, `=`, `IN`, and `>` all fail on a list. |
| 12 | Data Explorer aggregations | `AggregationSelect.tsx:48` offers `getValidQueryAggregations(dataType)` (`AvaDataTypeModule.ts:57-75`), so a whole-number list is offered `sum` and `avg`. **Verified:** both fail. |
| 13 | Results grid | `makeDataGridColumnDefs.ts:80-83` renders a list with `String(value)`: `31,48`, and nothing for `[]`. |
| 14 | Chart hydration | `QueryColumnModule.isNumeric` (`QueryColumnModule.ts:69-71`) reads only `dataType`, so a whole-number list is picked as a chart measure. |
| 15 | Dashboard local filters | Every result column is offered (`LocalFilterEditor.tsx:71-73`) and the filter emits `IN`, `ILIKE`, or `=` (`applyDashboardFiltersToSql.ts:38-61`). All fail on a list. |
| 16 | Unmapped list fields | A manual-entry list field becomes a scalar `CAST(NULL AS VARCHAR)` (`makeConceptAttributeColumnsFromMetadata.ts:161-170`, `buildConceptViewSql.ts:102-104`), so its view type disagrees with its shape. |
| 17 | Chat SQL context | The schema line names fields only (`SqlTableAliasModule.ts:133-166`, read by `fetchWorkspaceSchema.ts:94` and `fetchOfflineChatSchema.ts:55-57`), so the model cannot know a field is a list and writes `=` against it. |
| 18 | Record page | Today it shows one value per field, chosen by the field's rule (`CaseDetailsRail.tsx:66`). After G1 the rail reads the concept view and prints a list with `unknownToString`, joined with `;` into one line (G1 section 4.10). |

**DuckDB facts this spec relies on** (run against `@duckdb/node-api` from
the repository): on a `VARCHAR[]` or `BIGINT[]` column, `GROUP BY`,
`ORDER BY`, `count(col)`, `count(DISTINCT col)`, `min`, `IS NULL`,
`list_contains`, `contains(list, x)`, `len`, and `UNNEST` work;
`CAST([] AS VARCHAR[])` has type `VARCHAR[]`.

## 2. Scope

### In

- `ConceptAttribute.ValueShape` (`"single" | "list"`) and
  `ConceptAttribute.getValueShape` (umbrella 6), plus two helpers on the same
  module that every authoring path uses.
- A list field stores no value rule: the mapping's
  `value_picker_rule_type` becomes nullable, and `rpc_concepts__create`
  refuses a rule on a list, a missing rule on a single field, and a list label
  or identifier.
- The concept view types an unmapped list field as an empty list, and refuses
  a single field with no rule at planning time.
- List result columns are marked, and a list's dates and timestamps read as
  ISO strings. G1 already makes list cells plain arrays.
- Data Explorer and dashboard controls offer only the operations that work on
  a list (section 4.5).
- Chat: `ChatCaseValueShape`, `valueShape` on the contract (umbrella 6), the
  parsers, both tool schemas, and prompt guidance for when to propose a list.
- Draft card: a per-field switch between **One value** and **Every value**.
- Concept creator form: the same switch in place of "Only allow one value".
- Record page: a list field shows every value, with long lists collapsed.
  The case type page marks a list field.
- Chat's SQL context marks list fields and explains list SQL, online and
  offline.
- One E2E spec: a field switched to every value in the chat draft shows every
  value on the record page.
- `docs/ontology-architecture.md`.

### Out

- **List filters in the Data Explorer** ("has any of", "is empty"). Approach B
  in section 3; an open question in section 10.
- **Global dashboard filters.** A global filter binds to a column by name
  across blocks (`makeColumnBindingsFromDashboardFilters.ts`). G3 does not gate
  it, so a global filter bound to a list column's name fails that block's
  query. Recorded in `ontology-architecture.md` section 16.
- **Saving a result with a list column as a new dataset**
  (`SaveAsNewDatasetForm`). The list column would be saved with a `varchar`
  column type. Recorded in section 16.
- **Manual-entry list fields in chat.** The umbrella puts `valueShape` only on
  dataset-column attributes. The form's "Allow multiple values" checkbox for
  manual-entry fields (`ManualEntryAttributesBlock.tsx:75-78`) is unchanged.
- **Distinct-only lists, buckets, several sources.** Umbrella 8, G4, G5.
- **Existing list fields' stored rule.** A list field created before G3
  keeps the rule it was saved with. Nothing reads it (section 4.3), and G5's
  move of the rule onto the field nulls it (section 4.12).
- **Editing a case type after creation.** Umbrella 8.

## 3. Approaches

**A. Lists end to end, a list-safe explorer (recommended).** A list field
stores no rule. Chat, the draft card, and the form all create lists. The
record page lists every value. The explorer shows a list as text and keeps
every control that works on one (show, sort, group by, count) while hiding
the ones that fail (filters, number aggregations, chart measures, dashboard
local filters). Analysis over the values inside a list goes through chat SQL,
whose schema context marks list fields and explains `list_contains`, `len`,
and `UNNEST`.

**B. A plus list operators in the explorer.** Add "has any of", "has all of",
and "is empty" filter operators (`list_has_any`, `list_has_all`,
`len(col) = 0`) and a "Count of values" aggregation (`sum(len(col))`).
Better for a user who never opens chat, but it adds operators to
`QueryFilterOperator`, the react-querybuilder controls, `structuredQueryToSql`,
and the dashboard filter SQL, and "any of" versus "all of" is a product
choice nobody has made. It can follow A without undoing any of it.

**C. A placeholder rule, record page only.** Keep the rule column
`not null`, store whatever rule the draft held, ignore it in the view, and
fix only the Arrow crash and the record page. Least work, but it stores a
rule the field does not use (which the case type page or G5 would then have
to explain away), contradicts umbrella 3.2, and leaves explorer controls
that fail.

**Recommendation: A.** It meets the umbrella's bar ("must not offer an
operation that would fail") with the smallest surface, makes the stored model
match umbrella 3.2 from G3 on, and leaves B as an additive follow-up.

## 4. Design

### 4.1 The value shape

```ts
// shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts
export type ConceptAttributeValueShape = "single" | "list";

// namespace ConceptAttribute
export type ValueShape = ConceptAttributeValueShape;
```

`ConceptAttribute` gains a module, merged with its namespace the way
`Concept` and `ConceptStatus` are
(`shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts`):

| Member | Signature | Behaviour |
| --- | --- | --- |
| `getValueShape` | `(attribute: Pick<ConceptAttribute.T, "isArray">) => ValueShape` | `"list"` when `isArray`, else `"single"`. G4 widens the parameter to include `bucketGrain`. |
| `valueShapeToIsArray` | `(valueShape: ValueShape) => boolean` | The stored `is_array` for a shape. |
| `getOutputDataType` | `(options: { valueShape; ruleType: ValuePickerRuleType; columnDataType: AvaDataType.T }) => AvaDataType.T` | The field's stored `data_type`: `ValuePickerRule.getOutputDataType` for `single`, the column's type for `list` (umbrella 3.1: the type of one value as the view emits it). `ruleType` is required for every shape because every authoring path holds one while the user can still switch back to one value. |

Every branch on a shape is exhaustive (`match(...).exhaustive()`), so G4's
`"bucketed_list"` turns each site into a compile error
(`docs/rules/typescript.md`, "Widening a string literal union").

### 4.2 A list field stores no rule

**Schema.** `attribute_mappings__dataset_column.value_picker_rule_type`
drops `not null`. No data migration (section 2, Out).

**RPC.** `rpc_concepts__create` checks the inserted case type after its
mappings are written, inside the same transaction:

| Refused | errcode | hint | Message |
| --- | --- | --- | --- |
| A dataset-column mapping whose field is a list and names a rule, or whose field keeps one value and names none | `23514` | `value_rule_mismatch` | `A dataset field has a value rule exactly when it keeps one value` |
| A list field that is the label or an identifier | `23514` | `list_field_is_key_or_label` | `A list field cannot be the label or an identifier` |

Both are checks on the one write path every creation uses
(`ontology-architecture.md` section 5.1). A table constraint is not possible yet: the rule
and `is_array` live in different tables until G5 moves the rule onto the
field, and G5's check constraint replaces the first check.

**Model and parsers.** `DatasetColumnMapping.T.valuePickerRuleType` becomes
`ValuePickerRuleType | undefined`. `DatasetColumnMappingParsers` stops
inventing `most_frequent` on read (`:52`) and on insert (`:58-64`): a missing
rule stays missing, so the RPC sees exactly what the client meant.

**Where the rule is dropped.** Every authoring path keeps a rule in its draft
while the user can switch a field back to one value. The draft is turned into
rows in one place, `insertConceptFromFormValues._mappingsFromAttributes`,
which writes no rule for a list field. Chat's
`proposedCaseTypeToCreatedCaseType` also omits it, so `ChatCreatedCaseType`
says what will be stored.

**Readers of the rule.**

- Column resolution throws for a single-value field with no rule (umbrella
  principle 7), naming the field.
- `buildAttributeValueSql`, the only code that turns a rule into SQL after
  G1, throws when asked for one value without a rule. That covers Sync's
  label read; the RPC already refuses a list label. G6 removes that read.
- G1 deletes the legacy readers (`AttributeAssertionClient`,
  `_runConceptQuery`, `ConceptWrapper`), so there is no other reader.

### 4.3 The concept view

`ConceptAttributeColumn` carries the shape instead of `isArray`:

```ts
export type ConceptAttributeValueRule =
  | { valueShape: "single"; valuePickerRuleType: ValuePickerRuleType }
  | { valueShape: "list" };

export type ConceptAttributeColumn =
  | ({ kind: "dataset_column"; attributeId; attributeName; selectColumnName;
       datasetId; primaryKeyColumnName } & ConceptAttributeValueRule)
  | { kind: "unmapped"; attributeId; attributeName; duckDbDataType;
      valueShape: ConceptAttribute.ValueShape };
```

- `makeConceptAttributeColumnsFromMetadata` builds the rule from
  `ConceptAttribute.getValueShape(attribute)`: a list drops any stored rule
  (which is what keeps pre-G3 list fields working), and a single field
  without one throws.
- G1's `buildAttributeValueSql` holds every arm, the list included, behind an
  `isArray` option and a `valuePickerRuleType` that a list ignores
  (G1 section 4.2). G3 replaces `isArray` with
  `valueShape: ConceptAttribute.ValueShape` and lets `valuePickerRuleType` be
  undefined; `single` without a rule throws. G1's NULL rule is unchanged.
- `buildConceptViewSql` passes each dataset column's shape and, for one
  value, its rule to `buildAttributeValueSql`.
- An unmapped list field emits `CAST([] AS <type>[])`, so its view column
  is a typed empty list, consistent with umbrella 3.2 and with what chat's
  schema context tells the model. G1 keeps the typed NULL for every other
  unmapped field.

### 4.4 Reading lists out of DuckDB

G1 (its section 4.6, plan Task 7) moves `arrowTableToJS` into
`src/clients/DuckDbClient/duckDbArrowResults/` and makes a list cell a plain
array by iterating the vector. G3 adds two things on top:

- A **date** element of a list becomes `YYYY-MM-DD` and a **timestamp**
  element an ISO 8601 string. A list result column is typed as text (below),
  so nothing downstream could tell an epoch number in it from a count.
  Verified with apache-arrow 17: both arrive as epoch milliseconds.
- `arrowFieldToQueryResultField` reports a list column as
  `{ dataType: "varchar", isArray: true }` and logs nothing.
  `QueryResultColumn` gains `isArray?: boolean`. `varchar` because a list
  renders as text everywhere a result is shown, and because every number gate
  that reads only `dataType` (chart measures, pie values, funnel values) then
  keeps a list out without being touched.

### 4.5 Data Explorer and dashboards

| Operation | On a list column | How |
| --- | --- | --- |
| Show in results | Yes, values joined with `; ` (the CSV export's separator), empty for `[]` | `makeDataGridColumnDefs` formats an array element by element |
| Sort | Yes | `ORDER BY` on a list works; nothing to change |
| Group by, Count | Yes | `QueryColumn.getValidAggregations` returns `none`, `group_by`, `count` for a list |
| Sum, Average, Max, Min | No | Same function; `sum`/`avg` fail, `min`/`max` of whole lists mean nothing |
| Filter | No: the column is not offered | `QueryFiltersField` drops `QueryColumn.isList` columns |
| Chart measure (auto-hydration from a query) | No | `QueryColumn.isNumeric` is false for a list |
| Chart measure (from a result) | No | The result column is `varchar` (4.4) |
| Dashboard local filter | No: the column is not offered | `LocalFilterEditor` and `LocalFiltersPField` drop `isArray` result columns |
| CSV export | Yes, unchanged: `unknownToString` joins with `;` | `downloadRowsAsCsv.ts:5-20` |
| URL restore | Unchanged | Matches by name |

`QueryColumn.isList(column)` is true when the base column is a
`ConceptAttribute` whose shape is not `single`, so G4's bucketed lists fall
under it without another change. `AggregationSelect` takes the valid
aggregations instead of a data type.

### 4.6 Chat contract, parsers, tool schema, prompt

```ts
/** Mirrors `ConceptAttribute.ValueShape`. */
export type ChatCaseValueShape = "single" | "list";

// ChatProposedCaseAttribute
valueShape: ChatCaseValueShape;
valuePickerRuleType: ChatCaseValuePickerRuleType; // kept for a switch back

// ChatCreatedCaseAttribute, dataset_column arm
valueShape?: ChatCaseValueShape; // absent means "single"
valuePickerRuleType?: ChatCaseValuePickerRuleType; // absent for a list
```

- **`parseProposeCaseType`** reads `valueShape: "list"`, and anything else as
  `"single"`. A join key column or the label column is always `"single"`,
  whatever the model said.
- **`parseCreateCaseTypes`** reads `valueShape: "list"` onto the attribute and
  leaves it out otherwise. A join key or an `isLabel` attribute is never a
  list.
- **Tool schemas.** `proposeCaseType` attributes gain a required
  `valueShape` enum (`single`, `list`); the `valuePickerRuleType` description
  says to give the rule the field would use with one value even for a list.
  `createCaseTypes` attributes gain an optional `valueShape`.
- **Prompt.** A new bullet in "Other rules for a good draft":

  > Set `valueShape` to `list` only when one case can genuinely have several
  > values of the column and a person would want to see each of them, not a
  > summary: symptoms recorded at several visits, every phone number, every
  > test date. Judge this from column names, dataset descriptions, and the
  > case type's grain. Keep `single` for anything that is one fact per case
  > (age, county, name), for measures you summarize with a value picker
  > (totals, averages, latest), and always for the label column and every
  > join key. A list keeps every non-empty value in dataset order; still give
  > it the value picker it would use if the user switches it to one value.

  The goal sentence (`buildCaseManagerSystemPrompt.ts:71`) reads "every
  attribute worth mapping with its value picker, or as a list of every value".

### 4.7 Draft card

Each dataset attribute row (`CaseTypeDraftAttributeRow`) becomes a checkbox
beside a column of: the name input, the column hint line (`join key`,
`label`), and a controls line holding

- `ValueShapeControl` (`src/components/caseFields/`, shared with the form),
  a Mantine `SegmentedControl` with **One value** and **Every value**, named
  `One value or every value for <name>`, disabled on a join key or the label
  column;
- the existing value-picker `Select` (`Value to keep for <name>`), rendered
  only for **One value**.

The grid drops its third column (`CaseTypeDraftCard.module.css:8-13`); the
controls line wraps if the panel is narrow.

`useCaseTypeDraftEditor` gains `setAttributeValueShape(columnId, valueShape)`.
`setPrimaryKeyColumnId` and `setLabelColumnId`, which already force the column
in, also force it to one value. The label options stay every included field:
choosing a list field as the label switches it to one value, and its control
shows that it is locked.

Switching shape keeps the field's rule in the draft, so switching back to one
value restores it.

### 4.8 Conversions and the insert

- **`proposedCaseTypeToCreatedCaseType`** carries `valueShape`, forced to
  `single` for the label and every join key, and carries
  `valuePickerRuleType` only for a single field (exhaustive match).
- **`createdCaseTypeToFormValues`** gives each mapped attribute
  `isArray: ConceptAttribute.valueShapeToIsArray(valueShape)` (identifiers and
  the label forced single) and
  `dataType: ConceptAttribute.getOutputDataType(...)`, replacing G2's direct
  `ValuePickerRule.getOutputDataType` call. Its draft keeps a rule, defaulted
  as today when chat sent none.
- **`insertConceptFromFormValues`** writes `valuePickerRuleType: undefined`
  into a list field's mapping (4.2).

### 4.9 Concept creator form

`DatasetColumnMappingCreator` replaces the "Only allow one value" checkbox
and its tooltip with the same **One value** / **Every value** control, and
keeps hiding the rule select for every value. `transformValues` forces
identifiers and the label to one value, and computes each dataset field's
`dataType` with `ConceptAttribute.getOutputDataType` in place of G2's direct
call.

### 4.10 Record page and case type page

G1's rail renders each `CaseDetailsRow` (`id`, `name`, `value`,
`sourceNames`), built by `makeCaseDetailsRowsFromAttributes` in
`useRecordFields`, with a dimmed "No value" for a NULL or missing value and
`unknownToString` otherwise (G1 section 4.7). G3 adds `valueShape` to the row,
set by `makeCaseDetailsRowsFromAttributes` from the field, and moves the value
rendering into a new `RecordFieldValue`:

- No value (NULL, missing from the view, or an empty list): G1's dimmed
  "No value", whatever the shape.
- `single`: `unknownToString`, as G1 renders it.
- `list`: an unstyled `<ul>` named after the field, one `<li>` per value,
  each formatted like a single value. Duplicates stay (umbrella 8). The first
  five show; a longer list adds a `Show all <n> values` / `Show fewer` text
  button with `aria-expanded` and `aria-controls`.

Five, because the rail is a narrow reference column
(`docs/design/app-view-layout.md`, "The rail") and a line list longer than the
fields around it pushes the record's facts out of view. The toggle discloses
content; it is not an action on the record, so the rail rule holds.

The case type page (`CaseTypeAttributesList`) adds an `Every value` badge to
a list field, beside `ID` and `Name`.

This adds no new surface: it restyles one fact's value inside the existing
rail, so `impeccable` is not loaded (overview ground rule 9).

### 4.11 Chat's SQL context

- `SqlTableAliasConceptAttribute` gains `is_array?: boolean`. Optional, so an
  offline schema cached before G3 still parses.
- `formatSchemaBlock` writes a list field as `<name> (list)`:
  `- c0: Measles case (age, Symptoms (list), status: Suspected | Confirmed)`.
- `SqlTableAlias.formatListFieldNote(conceptAttributes)` returns one note when
  any field is a list, and nothing otherwise:

  > A field marked (list) holds every value one record has, as a DuckDB list,
  > and is [] when it has none. Filter with list_contains("field", 'value'),
  > count values with len("field"), and use UNNEST("field") for one row per
  > value. Never compare a list with =, IN, or LIKE.

  `buildSqlSystemPrompt` appends it to its Notes; offline
  `formatOfflineSqlSchemaNotes` appends it to its Rules.
- `fetchWorkspaceSchema` selects `concept_id, name, is_array`;
  `fetchOfflineChatSchema` maps `isArray` to `is_array`.

### 4.12 What later gaps inherit

- **G4.** Widen `ConceptAttributeValueShape` first and let `pnpm type-check`
  list the sites: `getValueShape`, `valueShapeToIsArray`, `getOutputDataType`,
  `ConceptAttributeValueRule` and its builder, `buildAttributeValueSql`'s
  shape match, `_buildUnmappedSelector`,
  `_mappingsFromAttributes`, `proposedCaseTypeToCreatedCaseType`,
  `RecordFieldValue`, and `QueryColumn.isList`. Then by hand, because they are
  string checks: `ChatCaseValueShape`, both parsers, both tool schemas, the
  RPC's two checks (a bucketed list keeps a rule and is still an array), and
  `formatSchemaBlock`'s marker.
- **G4, `RelationColumn`.** Umbrella 5 (G4) puts `bucketGrain` on
  `RelationColumn` "so every consumer can tell a bucketed list from a plain
  list". `RelationColumn` reaches no consumer: G1 deletes `ConceptWrapper`,
  its only concept producer, which leaves `readDatasetRelationSchema.ts:34`
  (always `isArray: false`) behind `describe`, which has no production caller
  (`createDefaultRegistry.ts:197` only delegates). Consumers read
  `QueryColumn.baseColumn` (the `ConceptAttribute`, so `isArray` and later
  `bucketGrain`) and `QueryResultColumn` (`isArray` from G3). G4 should key
  its consumers off those.
- **G4, Arrow.** A bucketed list arrives as a list of struct rows. G1
  converts each with its own `toJSON()` and does not convert its fields
  further (G1 section 4.10), and G3's ISO conversion applies only to a list
  whose elements are dates or timestamps, so `bucket` arrives as epoch
  milliseconds and a `bigint` value as a `bigint`. G4 converts struct fields.
- **G5.** Moving the rule onto `concept_attributes`: copy each mapping's rule,
  then set it to NULL where the field is a list without a grain, which also
  covers list fields created before G3. G5's check constraint replaces the
  RPC's `value_rule_mismatch` check; the `list_field_is_key_or_label` check can
  then become a check constraint on `concept_attributes` too.

## 5. Error handling

| Failure | Where | Result |
| --- | --- | --- |
| A list field with a rule, a single dataset field without one, or a list label or identifier reaches the RPC | `rpc_concepts__create` | `23514` with the hint above; the transaction rolls back; the draft card keeps the draft and shows "Could not create that case type" (`useCaseTypeDraftCreation.ts:34-37`) |
| A single field has no rule at query time | `makeConceptAttributeColumnsFromMetadata` | Throws naming the field; the query fails closed (umbrella principle 7) |
| A label has no rule at Sync | `buildAttributeValueSql`, called by `generateIndividuals` | Throws naming the missing rule; the progress job fails with the message |
| The model proposes a list for a join key or the label | `parseProposeCaseType`, `parseCreateCaseTypes` | Coerced to `single` silently, as other malformed proposal fields are |
| A list cell holds NULL | Arrow conversion | `null` in the array (G1's NULL rule should prevent it) |
| A cached offline schema has no `is_array` | `formatSchemaBlock` | Treated as `false`: no marker, as before G3 |

## 6. Testing

Red/green per `docs/rules/testing.md`; each test is named after its claim.

| Layer | File | Claims |
| --- | --- | --- |
| Model | `ConceptAttributeModule.test.ts` (new) | shape from `isArray`; round trip to `isArray`; a list's data type is its column's; a single field's is its rule's |
| pgTAP | `supabase/tests/database/rpc_concepts__create.test.sql` | a list without a rule is created and stores NULL; a list with a rule, a single field without one, and a list label are refused, leaving nothing |
| Parser | `DatasetColumnMappingParsers.test.ts` (new) | a NULL rule reads as no rule |
| Client | `ConceptClient.test.ts` | a mapping with no rule is sent with none |
| Executed | `buildAttributeValueSql.executed.test.ts` (G1's) | one value without a rule throws; a list ignores a rule |
| Executed | `buildConceptViewSql.executed.test.ts` | an unmapped list is `[]` and binds `len` |
| Executed | `conceptAttributeColumns.integration.executed.test.ts` | a single field without a rule throws; a list field's stored rule is ignored |
| Sync | `generateIndividuals.test.ts` | a label without a rule fails the sync |
| Arrow | `duckDbArrowResults.test.ts` (G1's) | date and timestamp lists as ISO strings; list columns marked without logging |
| Explorer | `QueryColumn.test.ts`, `QueryFiltersField.test.tsx`, `makeDataGridColumnDefs.test.ts` | list aggregations, not numeric, not filterable, cells joined |
| Dashboards | `LocalFilterEditor.test.tsx` (new) | a list result column is not offered |
| Chat edge | `parseProposeCaseType.test.ts`, `parseCreateCaseTypes.test.ts`, `makeChatToolConfigFromOptions.test.ts`, `buildCaseManagerSystemPrompt.test.ts` | shapes parsed and coerced; schema and prompt carry them |
| Conversions | `proposedCaseTypeToCreatedCaseType.test.ts`, `createdCaseTypeToFormValues.test.ts`, `insertConceptFromFormValues.test.ts` | shape carried and coerced, type and rule set |
| Draft card | `useCaseTypeDraftEditor.test.ts`, `CaseTypeDraftBlock.test.tsx` | switch, lock on key and label, rule hidden, persisted |
| Form | `keepKeyAndLabelFieldsSingle.test.ts` (new) | identifiers and the label keep one value; other lists stay |
| Record page | `RecordFieldValue.test.tsx` (new), `CaseDetailsRail.test.tsx`, `makeCaseDetailsRowsFromAttributes.test.ts` (G1's) | list items, collapse and expand, empty list as "No value", each row's shape |
| Chat SQL | `SqlTableAlias.test.ts`, `fetchWorkspaceSchema.test.ts`, `buildSqlSystemPrompt.test.ts`, `fetchOfflineChatSchema.test.ts`, `buildOfflinePrompts.test.ts` | marker and note, online and offline |
| E2E | `tests/e2e/case-list-field.spec.ts` (new) | a field switched to every value in the chat draft shows every value on the record page |

## 7. Exit criteria

1. A case type created through the chat draft card with one field switched
   to **Every value** stores that field with `is_array = true` and a NULL
   `value_picker_rule_type`, and its record page lists every value of that
   field in dataset order (the E2E spec).
2. In the Data Explorer that field shows as `31; 48`, sorts, groups, and
   counts, and is offered no filter and no sum, average, max, or min.
3. Chat's SQL schema line marks it `(list)` and the prompt carries the list
   note.
4. `pnpm type-check`, `pnpm lint`, `pnpm test:frontend`,
   `pnpm test:executed`, and `pnpm test:db` pass, and
   `pnpm test:e2e case-list-field.spec.ts` passes on its own.
5. `docs/ontology-architecture.md` describes list fields and lists the two
   remaining limitations (global dashboard filters, save as dataset).

## 8. Files

| File | Change |
| --- | --- |
| `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`, `ConceptAttribute.ts` | Value shape type; namespace merged with the module |
| `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts` (+ test) | New |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql`, `50.rpc_concepts__create.sql` | Nullable rule; two checks |
| `supabase/migrations/<generated>_list_field_value_rules.sql` | Generated |
| `supabase/tests/database/rpc_concepts__create.test.sql` | Six assertions |
| `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql` | Generated |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts`, `DatasetColumnMappingParsers.ts` (+ new test) | Optional rule, no invented default |
| `src/clients/ontology/ConceptClient.test.ts` | One test |
| `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` (+ executed test) | `valueShape` option; one value needs a rule |
| `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts` (+ executed test) | Shape-aware columns |
| `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts` (+ integration test) | Value rule from the shape |
| `getNeededColumnsFromQuery.test.ts`, `QueryMediator.concepts.test.ts` | Fixtures |
| `src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals.ts` (+ test) | Label read as one value |
| `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.ts` (+ G1's test), `arrowFieldToQueryResultField.ts` | List dates and list columns |
| `shared/models/queries/QueryResult/QueryResult.types.ts` | `isArray` |
| `shared/models/queries/QueryColumn/QueryColumnModule.ts` (+ test) | `isList`, `getValidAggregations`, `isNumeric` |
| `src/views/DataExplorerApp/AggregationSelect.tsx`, `QueryForm/ManualQueryForm/AggregationFields.tsx`, `QueryForm/QueryFiltersField/QueryFiltersField.tsx` (+ test) | List-safe controls |
| `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts` (+ test) | List cells |
| `src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor.tsx` (+ new test), `LocalFiltersPField.tsx` | No list columns |
| `shared/types/chat.types.ts` | Chat value shape |
| `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts`, `parseCreateCaseTypes.ts` (+ tests) | Parse and coerce |
| `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`, `buildCaseManagerSystemPrompt.ts` (+ tests) | Schema and guidance |
| `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/`, `createdCaseTypeToFormValues/`, `insertConceptFromFormValues/` (+ tests) | Carry the shape, drop the rule |
| `src/components/caseFields/ValueShapeControl/ValueShapeControl.tsx` (new) | The **One value** / **Every value** control the card and the form share |
| `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts`, `CaseTypeDraftAttributeRow.tsx`, `CaseTypeDraftCard.module.css` (+ tests) | The switch |
| `src/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/` (new, + test) | Keys and label keep one value at submit |
| `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`, `ConceptCreatorView/index.tsx` | The switch; data type from the shape |
| `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/` (new), `CaseDetailsRail.tsx` (+ test), `useRecordFields/makeCaseDetailsRowsFromAttributes/` (+ test) | Lists on the record page |
| `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx` | `Every value` badge |
| `shared/models/chat/SqlTableAlias/` (+ test), `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts`, `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts`, `shared/types/offlineChat.types.ts`, `fetchOfflineChatSchema.ts`, `buildOfflinePrompts.ts` (+ tests) | List marker and note |
| `src/i18n/locales/*` | Extracted and compiled |
| `tests/e2e/case-list-field.spec.ts` | New |
| `docs/ontology-architecture.md` | Sections 4, 5.2, 5.3, 7, 7.1, 8, 9, 10, 16 |

## 9. Deviations from the umbrella spec

No shared name changes. Four refinements and one finding:

1. **The mapping's rule becomes nullable in G3**, not only moved in G5. Umbrella
   3.2 says a list's rule is null; with `not null` (`30.attribute_mappings__dataset_column.sql:18`)
   that cannot be stored until G5. G3 drops `not null` and enforces "null
   exactly for a list" in the RPC (4.2). G5 still moves the column.
2. **`rpc_concepts__create` gains two checks** the umbrella does not mention
   (4.2), one of which G5 replaces with its constraint.
3. **An unmapped list field is `[]` of its type**, not a scalar NULL (4.3):
   umbrella 3.2's "a list is `[]` when there is none", applied to manual-entry
   list fields.
4. **`isArray` becomes `valueShape`** on `ConceptAttributeColumn` and on
   G1's `buildAttributeValueSql` options (4.3), as G1 section 4.10 expects.
   Neither is a shared name; G5 restructures both again.
5. **The Arrow fix is G1's** (problem row 9). G3 adds only list dates as ISO
   strings and the list column marker (4.4). The finding on `RelationColumn`
   for G4 is in 4.12.

## 10. Open questions for Kristi

1. **Should chat propose list fields on its own judgement?** This spec lets
   it, conservatively (4.6): only when a column's name says one case has
   several of them. The alternative is that chat always proposes one value and
   lists appear only when a user switches a field in the card. Default if
   unanswered: chat may propose them.
2. **Do list filters belong in the Data Explorer (approach B)?** G3 leaves
   filtering inside a list to chat SQL. If people who never use chat need it,
   "has any of" and "has all of" are the two candidate operators, and the
   choice between them per filter is the product decision. Default if
   unanswered: not in this effort.

## 11. Implementation notes

Plan 3 shipped on `feat/joined-cases`. Code review during execution changed
the built code in the ways below. Later plans must start from this code, not
from the plan text.

### What differs from the plan text

1. **Public snapshot reads (security).** Public mode refuses any relation
   that is not a dataset, and any internal table (Sync staging tables,
   `reject_errors`, `reject_scans`), which the analyzer now reports in a
   required `internalTableNames`. Review found that the hand-written SQL
   tokenizer disagreed with DuckDB in 16 ways that hid a read of a private
   view, each confirmed against DuckDB. All are closed and tested: `TABLE`,
   `PIVOT_WIDER`, `PIVOT_LONGER`, and `SHOW` read as sources; a CTE's scope
   starts after its body (a recursive CTE's at its last top-level `UNION`,
   unless a top-level `EXCEPT` or `INTERSECT` follows); only `WITH` lists
   declare CTEs; only symbol tokens count as structure; a parenthesized
   join's first table and a table after a join's `ON` are read; a line
   comment ends at `\r`; dollar quotes, E strings, and nested block comments
   are refused as `unsupported-syntax` everywhere; every statement must start
   with a read keyword, and `PRAGMA`, transaction, and `PREPARE`/`EXECUTE`
   statements are refused everywhere; public mode allows one plain query.
   Staging table names need a UUID suffix.
2. **View column names.** `ConceptAttribute.getViewColumnNames` returns
   `{ columnName, resultName }` per field and drives the view, structured
   queries, map layers, and chat's SQL context. A field that shares its name
   with another field ignoring case gets a distinct result name (`Age_2`); a
   field suffixed only for a reserved name keeps its name in results.
   `Concept.RECORD_KEY_COLUMN_NAME` and `Concept.STATUS_COLUMN_NAME` are the
   single source for `external_id` and `status`. `QueryColumn` carries
   `sourceColumnName` and `resultColumnName`; held columns refresh through
   `QueryColumn.refreshFromSourceColumn`.
3. **The form keeps key and title fields single.** The form's switch is
   locked, with a note, for ID columns and the title field, and the field is
   stored with `isArray: false` when it becomes either. The draft card locks
   join keys and the label the same way.
4. **Saved state on a list field.** A saved aggregation a list cannot take is
   reset to `none` before SQL runs (lists only; other columns keep `max` and
   `min`). A saved local filter on a list reports `unsupported`; a saved
   explorer rule on a list is dropped with a translated reason. GIS measure,
   operation, time, size-by, and data-key pickers leave lists out.
5. **List values in JS.** A list's dates arrive as `YYYY-MM-DD`, timestamps as
   ISO strings, and times as `HH:MM:SS(.ffffff)`. Grid cells drop NULL items.
6. **Record page values.** `createFieldValueFormatter` shows numbers at full
   precision with locale grouping, accepts bigints, reads zone-less timestamp
   text as UTC, parses time text, treats `""` as no value, and takes optional
   `booleanLabels`. `RecordFieldValue` drops NULL and empty items from a list.
   The Arabic "Show all <n> values" carries all six plural forms. Each field's
   sources are a list named "Sources of <field>".
7. **Chat.** Its SQL context lists each case type field under its view column
   name and marks lists, online and offline. Its model imports must not reach
   `shared/lib/uuid.ts`: a bare `uuid` import broke the chat and queries edge
   functions at boot while `deno check` passed. `deno info` per function
   catches this.
8. **Desktop.** `attribute_mappings__dataset_column` is synced to desktop, so
   its SQLite table is rebuilt to allow a NULL rule. Plan 2's migration also
   got its missing desktop mirror.
9. **`@avandar/ui`.** `Callout` gained `titleOrder`, a new API.

### Follow-ups

1. **A stronger public read boundary.** The analyzer is still a hand
   tokenizer. Run public snapshot SQL in a separate DuckDB database holding
   only published datasets, or take table references from DuckDB's own parser
   (`json_serialize_sql`). Today's impact is limited: a malicious dashboard
   author could show a viewer that viewer's own workspace data in that
   viewer's browser; nothing leaves the browser.
2. **Edge function boot check.** Add `deno info` per function (or an
   equivalent) to `pnpm type-check:deno` or CI.
3. **Map "Size by" on a list** is cleared silently when the inspector opens.
   Keep it and show an issue instead.
4. **No "is empty" filter for lists** (`IS NULL` misses `[]`).
5. **Dashboard global Filter block** takes a free-text column name, so a list
   field's name yields `IN`/`ILIKE` on a list. Validate against result columns.
6. **A saved local filter on a list** shows a blank Column select in the
   dashboard editor.
7. **`arrowTableToJS` converts BIGINT with `Number()`**, losing precision above
   2^53 before formatting.
8. **Video producer cursor targets** (`mapping-single-value`) are stale and
   need `component:measure`, which needs Remotion license keys.
9. **The list-key invariant is enforced only in `rpc_concepts__create`.** A
   check constraint on `concept_attributes` would harden it once production
   data is confirmed to satisfy it.
10. **Release.** The PR that lands this on `develop` should be titled
    `feat(...)` so `@avandar/ui` gets a minor bump.
