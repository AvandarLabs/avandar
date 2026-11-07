# Joined cases 2: typed value rules - design

**Status:** Draft
**Date:** 2026-11-06
**Author:** Juan Pablo Sarmiento <pablo@avandarlabs.com>
**Umbrella:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md`
(gap G2; sections 2, 3.3, 5, 6 are binding)
**Plan:** `docs/superpowers/plans/2026-11-06-joined-cases-2-typed-value-rules.md`
**Parents:** `docs/ontology-architecture.md` sections 5, 7, 8, 12, 16
**Builds on:** G1, `2026-11-06-joined-cases-1-record-page-concept-view-design.md`

> Code blocks are illustrative. The repository is the authority on every
> existing signature, and umbrella section 6 on every shared name.
>
> Line numbers cite `demo/measles` at `473e133c1`, before G1 lands. G1 moves
> `getSQLSelectOfMapping`
> (`src/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getSQLSelectOfMapping.ts`)
> to `buildAttributeValueSql`
> (`src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts`),
> quotes its identifiers, and makes every rule ignore NULLs. This design
> edits G1's version.

---

## 1. Problem

Value rules have no notion of type, and that one gap shows up three ways.

**1. The view casts `max`, `min`, and `count` to `DOUBLE`.** The arms are
`CAST(COUNT(...) AS DOUBLE)`, `CAST(MAX(...) AS DOUBLE)`, and
`CAST(MIN(...) AS DOUBLE)` (`getSQLSelectOfMapping.ts:107`, `:118`, `:129`).
A date, time, or timestamp column under `max` or `min` fails when a query
reads the column, and a text column fails on its first non-numeric value. A
text column of numbers fails silently instead: it returns the alphabetical
maximum converted to a number, so `'9'` beats `'10'`. The record page and the
Data Explorer's default query read every column, so one such field breaks the
whole case type there.

**2. Authoring offers every rule for every column.** Both option lists map
`DatasetColumnMappings.ValuePickerTypes` unfiltered
(`src/components/ChatPanel/CaseTypeDraftBlock/useValuePickerOptions.ts:14-27`,
`src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx:19-38`),
and the chat parser accepts any of the seven names
(`supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts:14-22`,
`:43-50`). `sum` over text is worse than `max` over a date: DuckDB rejects
`sum(VARCHAR)` when the view is created, so every query naming the case type
fails, including queries that never read that field.

**3. A field's stored `data_type` is always its column's type**, whatever its
rule (`src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts:127`,
`src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts:52`).
The view emits something else for `count` and for `sum` or `avg` over whole
numbers. Two readers trust `data_type`, and a third did until G1 deleted it:

- The Data Explorer wraps each field as a query column
  (`src/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept.ts:17-19`,
  `shared/models/queries/QueryColumn/QueryColumnModule.ts:11-19`) and picks
  its aggregations from the type
  (`shared/models/datasets/AvaDataType/AvaDataTypeModule.ts:57-75`). A count
  over a text column is offered only Count, never Sum or Max.
- A field with nothing to read becomes `CAST(NULL AS <data_type>)`
  (`src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts:161-171`).
- `ConceptWrapper._toRelationColumn`
  (`src/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper.ts:104-110`),
  which G1 deletes (G1 spec section 4.8).

### 1.1 DuckDB behaviour this design relies on

Verified with `@duckdb/node-api` 1.5.5, the build the executed tests use. The
app runs `@duckdb/duckdb-wasm` `1.33.1-dev20.0` (`package.json:124`).

| Expression | Result |
| --- | --- |
| `max`/`min` over `DATE`, `TIME`, `TIMESTAMP`, `VARCHAR`, `BIGINT` | The column's own type |
| `max`/`min` over `BOOLEAN` | `BOOLEAN` (allowed by DuckDB, refused by umbrella section 3.3) |
| `max('9', '10', 'b')`, `min(...)` | `'b'`, `'10'`: byte order, so `'10' < '9'` and `'Z' < 'a'` |
| `CAST(max(<date>) AS DOUBLE)` | Created view, then `Conversion Error: Unimplemented type for cast (DATE -> DOUBLE)` on read |
| `CAST(max(<text>) AS DOUBLE)` | `Could not convert string 'b' to DOUBLE` on read; numeric strings convert |
| `count(...)` | `BIGINT`, `0` over no rows |
| `sum(<bigint>)`, `avg(<bigint>)` | `HUGEINT`, `DOUBLE` |
| `sum`/`avg` over `VARCHAR`, `sum` over `DATE` or `TIME`, `avg` over `BOOLEAN` | `Binder Error: No function matches...`, raised by `CREATE VIEW` |
| `sum(<boolean>)`, `avg(<date>)`, `avg(<timestamp>)` | Allowed by DuckDB, refused by umbrella section 3.3 |

## 2. Scope

**In**

1. `ValuePickerRule` (umbrella section 6) in
   `shared/models/ontology/ValuePickerRule/ValuePickerRule.ts`, encoding
   umbrella section 3.3.
2. The view emits each rule's output type: `max`, `min`, and `count` stop
   casting. `sum` and `avg` keep `CAST(... AS DOUBLE)`.
3. The query planner refuses a rule its column's current type does not allow.
4. Every authoring path offers only allowed rules and stores the output type
   as `data_type`: chat parsing, the draft card, `createdCaseTypeToFormValues`,
   and the concept creator form.
5. Copy for `max` and `min` on text names what they do.
6. The Case Manager prompt and the `proposeCaseType` tool schema say which
   rules need which column types.
7. A hand-written data migration that corrects existing rows, with a
   migration upgrade test.
8. `docs/ontology-architecture.md` updated.

**Out**

- **Column types in chat's schema context.** Chat's schema line shows no type
  for any column of any relation: online, `fetchWorkspaceSchema` reads only
  `concept_id, name` for fields
  (`supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts:92-95`)
  and `SqlTableAlias.formatSchemaBlock` prints names only, for datasets too
  (`shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts:141-163`).
  Offline, `fetchOfflineChatSchema` maps fields to names only
  (`src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts:55-57`).
  So chat has no wrong type to correct. Its SQL runs against the view, which
  now emits the right one. G3 adds list markers to that line.
- **Keeping `data_type` in step when a dataset column's type is edited later.**
  The Data Manager lets a user change a column's type
  (`src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx:114-165`),
  and nothing updates the fields that read it. This design makes the query
  planner refuse a rule that the new type disallows (section 4.3) and leaves
  the rest to open question 2.
- **Casting a field's values to its `data_type`.** G5 casts each source to the
  field's type, because `UNION ALL` needs one type. Section 4.2 explains why
  G2 does not.
- New rules ("any", "median"), filling empty buckets, and editing a case type
  after creation (umbrella section 8).
- Precision of `sum` over very large whole numbers. It stays `DOUBLE`, as
  umbrella section 3.3 fixes.

## 3. Approaches

**A. One rule module in `shared/`, used by every authoring path, plus a
planning-time check and a one-time data migration (recommended).**
`ValuePickerRule` holds the rule table. The four authoring paths offer only
allowed rules and store `getOutputDataType` as `data_type`. The planner
refuses a stored rule its column's current type disallows. A hand-written
migration fixes existing rows.

- Plus: one TypeScript implementation, imported by the browser and the Deno
  edge function alike (`$/` and `ts-pattern` are both in `deno.json`).
  `data_type` keeps the meaning umbrella section 3.1 gives it, so every
  reader that trusts it today is right without a change.
- Minus: the table also appears once in SQL, in the migration. It runs once
  and is covered by an upgrade test, so it cannot drift afterwards.

**B. Derive the type when reading, and ignore the stored `data_type`.** The
planner and the Data Explorer would compute each field's type from its rule
and its column on every load.

- Plus: a column type edited later could never leave a stale `data_type`.
- Minus: contradicts umbrella section 3.1, which makes `data_type` the
  authority. Every reader (Data Explorer column list, the typed NULL column,
  G5's cast) would have to load mappings and dataset columns it does not
  load today. The rule would still need checking at
  authoring time, so B adds work without removing A's.

**C. Enforce the table in Postgres.** A SQL function mirroring section 3.3,
and a deferred constraint trigger on `attribute_mappings__dataset_column`
that rejects a disallowed rule and sets `concept_attributes.data_type`.

- Plus: no writer could bypass it.
- Minus: a second, permanent implementation of the table in PL/pgSQL that
  must track the TypeScript one. Mappings have no foreign key to
  `dataset_columns` (`ontology-architecture.md` section 4), so a column type
  edited later would need a third trigger on `dataset_columns`. Today the only
  writer is `rpc_concepts__create`, fed by the paths A already covers. Worth
  revisiting when case-type editing lands.

A is the recommendation. It is what umbrella section 3.3 describes, and the
planner check gives it C's fail-closed property at the point a stale rule
would actually do harm.

## 4. Design

### 4.1 `ValuePickerRule`

`shared/models/ontology/ValuePickerRule/ValuePickerRule.ts` re-exports a
module as `ValuePickerRule` and declares a namespace for its type, the pattern
`shared/models/ontology/ConceptStatus/ConceptStatus.ts:1-26` uses. The module
lives in `ValuePickerRuleModule/ValuePickerRuleModule.ts` with its test
beside it.

| Member | Signature | Behaviour |
| --- | --- | --- |
| `ValuePickerRule.T` | type, `= ValuePickerRuleType` | The seven rules (the `attribute_mappings__value_picker_rule_type` enum) |
| `DEFAULT_RULE_TYPE` | `"most_frequent"` | Allowed for every column type, so it replaces any rule that is not |
| `getOutputDataType` | `({ ruleType, columnDataType }) => AvaDataType.T` | `first`, `most_frequent`, `max`, `min`: `columnDataType`. `sum`, `avg`: `double`. `count`: `bigint`. It does not check that the rule is allowed |
| `isAllowedForColumnType` | `({ ruleType, columnDataType }) => boolean` | `first`, `most_frequent`, `count`: always. `max`, `min`: not `boolean`. `sum`, `avg`: only `bigint` or `double` |
| `getAllowedRuleTypes` | `({ columnDataType }) => ValuePickerRule.T[]` | The allowed rules, in `DatasetColumnMappings.ValuePickerTypes` order, for option lists |
| `toAllowedRuleType` | `({ ruleType, columnDataType }) => ValuePickerRule.T` | `ruleType` when allowed, otherwise `DEFAULT_RULE_TYPE` |

The first two are umbrella section 6's names. The other four are additions
the option lists and parsers need, and they conflict with nothing.

Both functions use an exhaustive `ts-pattern` `match` on the rule, so adding
an enum value fails to compile until its output type and allowed columns are
declared.

Imports use the `.ts` suffix and only `$/`, `ts-pattern`, and model types, so
the edge function imports it as `$/models/ontology/ValuePickerRule/ValuePickerRule.ts`,
the way `parseProposeCaseType.ts:2` imports `ConceptStatus`.

**List fields.** A field with `is_array` keeps every value, so each element is
one of the column's values and its `data_type` is the column's type (umbrella
section 3.2). `getOutputDataType` describes single-value fields only. The
form, the one path that can create a list field today, applies this in
`getDatasetColumnAttributeDataType` (section 4.4).

### 4.2 The concept view

In G1's `buildAttributeValueSql`, every cast lives in
`_buildReducedValueSql`, whose inner `aggregateSql` wraps each aggregate in
`CAST(... AS DOUBLE)` inside a subquery that already skips NULL (G1 plan,
Task 1). `aggregateSql` takes the whole aggregate expression instead, and
each arm passes its own:

| Rule | Today | After |
| --- | --- | --- |
| `count` | `CAST(COUNT(<col>) AS DOUBLE)` | `COUNT(<col>)`, `BIGINT` |
| `max` | `CAST(MAX(<col>) AS DOUBLE)` | `MAX(<col>)`, the column's type |
| `min` | `CAST(MIN(<col>) AS DOUBLE)` | `MIN(<col>)`, the column's type |
| `sum`, `avg` | `CAST(<agg>(<col>) AS DOUBLE)` | unchanged |
| `first`, `most_frequent` | the column's type | unchanged |

**No cast to the field's type for rules that keep the column's type.**
DuckDB returns the parquet column's own type, which already agrees with the
column's Ava type:

- `DuckDbDataTypeUtils.toAvaDataType` maps an `INTEGER` or `HUGEINT` result to
  `bigint`, exactly as it maps the dataset column
  (`src/clients/DuckDbClient/DuckDbDataType.ts:31-45`).
- A column whose type the user edited is cast to that type when the dataset
  loads (`src/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns/getColumnReplacementsFromColumns.ts:16-35`).

A cast would add a failure mode, a stale `data_type` turning into a cast
error, and no information. G5 adds the cast where `UNION ALL` needs it.

**`max` and `min` on text are alphabetical.** DuckDB compares `VARCHAR` by
bytes, so `'10' < '9'` and `'Zebra' < 'apple'`. That is correct for codes and
names and wrong for numbers stored as text. Section 4.5 decides the copy.

**No new type reaches any reader.** `first` and `most_frequent` already emit
`DATE`, `TIME`, `TIMESTAMP`, and `BIGINT`, so every value `max`, `min`, and
`count` now produce is a kind the record page, the Data Explorer, and chat
already handle. BIGINT results become JavaScript numbers in
`src/clients/DuckDbClient/duckDbArrowResults.ts:10-13`.

### 4.3 The planner refuses a disallowed rule

`makeConceptAttributeColumnsFromMetadata` already has the field, its mapping,
and the current dataset column (`makeConceptAttributeColumnsFromMetadata.ts:183-236`).
After it resolves the column, a single-value field whose rule
`ValuePickerRule.isAllowedForColumnType` refuses throws:

```text
Concept attribute 'Total' (<id>) applies 'sum' to dataset column 'amount',
whose type 'varchar' does not allow it.
```

This is umbrella principle 7, failing closed at planning time. After the
migration, this can only happen when a column's type is edited after the
field was made. Today that case surfaces as a DuckDB binder error naming
neither the field nor the rule (for `sum` and `avg`), or as a silent `1.0`
or `0.0` (for `max` and `min` on yes/no). List fields are exempt: they apply
no rule (`buildConceptViewSql.ts:101-117`).

The planner does not compare `data_type` with the column's type. A stale
`data_type` does not affect the view, which never reads it for a mapped
field. It affects only the Data Explorer's menus (open question 2).

### 4.4 Authoring paths

| Path | File | Change |
| --- | --- | --- |
| Chat `proposeCaseType` | `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts` | Takes the catalog's columns as a second argument. A rule the column's type does not allow becomes `most_frequent`, the same fallback an unknown rule gets (`:38-50`). A column the catalog does not list keeps the model's rule, and the client drops that attribute later (`createdCaseTypeToFormValues.ts:139-142`) |
| Threading | `parseOpenRouterResponse.ts`, `runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts`, `PostChatMessages.ts` | `schema.columns`, already fetched for the prompt (`PostChatMessages.ts:113-133`, `fetchWorkspaceSchema.ts:51-53`), reaches the parser. Required on `runChatAttemptsWithEscalation`, so `PostChatMessages` cannot forget it |
| Chat `createCaseTypes` | `parseCreateCaseTypes.ts` | None. It never reads a rule (`:21-40`), and the tool schema has none (`makeChatToolConfigFromOptions.ts:325-342`), so each attribute it emits takes `most_frequent`, which every type allows |
| Draft card | `CaseTypeDraftBlock.tsx`, `CaseTypeDraftCard.tsx`, `CaseTypeDraftSourceSection.tsx`, `CaseTypeDraftAttributeRow.tsx`, `useValuePickerOptions.ts` | The block already loads the sources' columns (`CaseTypeDraftBlock.tsx:49-58`). It passes `columnDataTypesById` down, and each row asks `useValuePickerOptions(columnDataType)` for its own options instead of the card computing one list for all (`CaseTypeDraftCard.tsx:49`). Until the columns load, a row offers every rule: the edge function checked the rule against the same catalog, and creation checks again |
| `proposedCaseTypeToCreatedCaseType` | `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts` | None. It does no I/O and has no catalog. It carries the card's rule, which the next step checks |
| `createdCaseTypeToFormValues` | `createdCaseTypeToFormValues.ts` | `_makeMappedAttribute` stores `toAllowedRuleType(...)` as the rule and `getOutputDataType(...)` as `dataType`. It already has each column's type (`:23-26`) and serves both chat tools (`applyCreatedCaseTypes.ts:21-28`) |
| Concept creator form | `DatasetColumnMappingCreator.tsx`, `DatasetColumnAttributesBlock/index.tsx` | The parent passes the selected field's column type from its `datasetColumnLookup`, and the form's `useValuePickerOptions(columnDataType)` offers only allowed rules |
| Concept creator form submit | `conceptFormTypes.ts`, `ConceptCreatorView/index.tsx` | `transformValues` (`index.tsx:84-152`) runs every field through `withFieldDataTypes`, which sets each dataset-column field's `dataType` from its column (found in `sourceDatasets`), its rule, and `isArray`, using `getDatasetColumnAttributeDataType` |
| Insert | `insertConceptFromFormValues.ts`, `rpc_concepts__create` | None. They write what they are given |

**Why the form computes `dataType` at submit.** While the user edits, the
form's `dataType` is the column's type (`conceptFormTypes.ts:127`), and two
controls change what the field stores: the rule select and the "Only allow
one value" checkbox (`DatasetColumnMappingCreator.tsx:72-98`). Computing the
stored type once in `transformValues`, from the final rule and `isArray`, is
correct whichever control the user touched last. Updating it inside each
control's handler would make every future control responsible for it too.

The form's default rule is `most_frequent`, so a new field never starts on a
disallowed rule, and the select cannot offer one.

### 4.5 Copy: say what `max` and `min` do on text

Decision: **no warning; the option names the behaviour.** On a text column:

| Surface | `max` | `min` |
| --- | --- | --- |
| Draft card (short) | "Alphabetically last" | "Alphabetically first" |
| Concept creator form (sentence) | "Choose the value that comes last alphabetically" | "Choose the value that comes first alphabetically" |

Other column types keep "Max"/"Min" and "Choose the maximum value"/"Choose
the minimum value".

Why: a label is read every time someone picks a rule, while a warning is read
once and then ignored. "Alphabetically last" makes "10 before 9" predictable
without one. Detecting numbers stored as text would need row values, which
the chat prompt must never see (`ontology-architecture.md` section 10) and
the form does not load. The prompt tells the model instead (section 4.6).

### 4.6 Case Manager prompt and tool schema

`buildCaseManagerSystemPrompt` already shows each column's type
(`supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts:33`).
After its value-picker bullet (`:92`) it gains:

> sum and avg only work on bigint and double columns. max and min work on
> every column type except boolean, and on a varchar column they compare
> alphabetically, so "10" comes before "9": never use them for numbers stored
> as text. count, first, and most_frequent work on every column.

The `valuePickerRuleType` description in the `proposeCaseType` schema
(`makeChatToolConfigFromOptions.ts:209-210`) gains "sum and avg need a bigint
or double column; max and min never apply to a boolean column." The parser
remains the guarantee; the prompt only reduces how often it has to step in.

### 4.7 Readers

| Reader | What it reads | Change |
| --- | --- | --- |
| Data Explorer columns, filters, aggregations | `concept_attributes.data_type` | None in code. Correct once authoring and the migration fix `data_type` |
| Typed NULL for a field with nothing to read | `data_type` | None |
| Chat SQL, online and offline | Field names only (section 2, Out) | None. Answers now get real dates for `max` and `min` instead of an error |
| Record page (G1: the view) | View values | None. No new value kind (section 4.2) |
| Sync's record name, until G6 removes it | The label field through its rule (`generateIndividuals.ts:300-308`) | None. A `max` or `min` label on a date or text column stops failing. Dates are staged as ISO text (`:347`) |
| Saved Data Explorer queries | Reconciled against fresh columns | None. The only emitted type that changes for a field that worked before is `count`, from `DOUBLE` to `BIGINT`. Both are numeric, with the same aggregation menu and identical JavaScript values |

### 4.8 Data migration

Hand-written, created with `supabase migration new correct_value_rule_data_types`,
because `db diff` never emits DML. There is no schema change, so there is no
generated migration, no `pnpm db:gen-types`, and no desktop SQLite
migration.

One `do $$ ... $$` block, in this order:

1. **Replace each disallowed rule with `most_frequent`**: `sum` or `avg` over
   anything but `bigint` or `double`, and `max` or `min` over `boolean`. The
   column type comes from `dataset_columns.data_type`, joined on
   `dataset_column_id` and `dataset_id`. This applies to list fields too: they
   ignore their rule, but every stored rule should then be allowed, which the
   upgrade test can check.
2. **Set each dataset-column field's `data_type`** to `dataset_columns.data_type`
   for a list field, `double` for `sum` or `avg`, `bigint` for `count`, and
   the column's type otherwise. Only rows where it differs are written.
3. **Report** both row counts with `raise notice`, so whoever applies the
   migration sees how much it changed.

Rows it leaves alone: a mapping whose column no longer exists, or belongs to
another dataset, which the planner already refuses
(`makeConceptAttributeColumnsFromMetadata.ts:203-212`); manual-entry fields;
and fields with no mapping row. A re-run changes nothing.

**The label-and-identifier trigger is disabled around step 2.**
`tr_concept_attributes__validate_label_and_identifiers` fires after every
update of `concept_attributes` and checks the whole case type
(`supabase/schemas/20.concept_attributes.sql:105-135`, `:150-153`). Its
identifier half checks nothing at creation (`ontology-architecture.md`
section 4), so a case type that already breaks it can exist, and updating any
of its fields would abort this migration for every workspace. Step 2 changes
only `data_type`, which the trigger never reads, so the migration runs
`alter table public.concept_attributes disable trigger ...` before it and
`enable trigger ...` after it, inside the migration's transaction. No other
migration in this repository does this. The alternative, letting one broken
case type block the deploy, is worse. The upgrade test proves the trigger is
enabled afterwards. The `updated_at` triggers on both tables still fire.

**Upgrade test.** `supabase/migration-upgrade-tests/value_rule_data_types.{prelude,assertions}.sql`,
run by `scripts/test-dashboard-publishing-migrations.sh` like the existing
replays. Fixtures, all with ids starting `ae`:

- a count over text, a count over a decimal, a sum over whole numbers, a max
  over a date, and a min over text (types corrected or kept);
- a sum over text and a max over a yes/no column (rules replaced);
- a list field with a sum over text (rule replaced, type kept);
- a mapping whose column does not exist (left alone);
- a manual-entry field (left alone);
- a second case type with two identifier fields mapped into one dataset,
  which the trigger would refuse (corrected, migration still succeeds).

## 5. Error handling

| Situation | Behaviour |
| --- | --- |
| Model proposes a rule the column's type disallows | Parser replaces it with `most_frequent`. The card shows that rule. No message, the same as an unknown rule today |
| Model proposes a rule for a column the catalog does not list | Rule kept. `createdCaseTypeToFormValues` drops the attribute, as today |
| A disallowed rule reaches `createdCaseTypeToFormValues` (a stale card, or a future path) | Replaced with `most_frequent`, and `data_type` set from that |
| Column types not loaded yet in the draft card | Every rule offered, as today. Creation re-checks |
| Form field whose column is missing from `sourceDatasets` at submit | `dataType` left as it is. Unreachable today: the block adds the column's dataset to `sourceDatasets` whenever it adds the field (`DatasetColumnAttributesBlock/index.tsx:123-130`) |
| Stored single-value rule disallowed by the column's current type | Planning throws, naming the field, rule, column, and type (section 4.3). The case type is unqueryable, as it already is under DuckDB's binder error, but now the message says why |
| Stale `data_type` after a column type edit, rule still allowed | View is correct; Data Explorer menus follow the stale type. Open question 2 |
| Migration meets a case type that breaks the label or identifier rule | Corrected anyway, with the trigger disabled for the update |
| Migration meets a mapping to a missing column | Skipped |

## 6. Testing

Red/green TDD throughout, following `docs/rules/testing.md`. Value-rule tests
construct ties and NULLs.

| Layer | File | Covers |
| --- | --- | --- |
| Unit | `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.test.ts` | The whole section 3.3 table for all seven column types: output types, allowed pairs, option order, the fallback |
| Executed (DuckDB) | `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts` | `DESCRIBE` of the view shows `DATE`, `TIME`, `TIMESTAMP`, `VARCHAR`, `BIGINT`, and `DOUBLE` where section 4.2 says. The fixture has a tie at the maximum (two rows share the latest date, two share the most visits), a NULL row for the record, a record whose rows are all NULL, and a record no row matches. Asserts the latest date, alphabetical text order (`'9'` over `'10'`), a count of non-NULL values and `0` for no rows, and a decimal sum that skips NULL |
| Executed (planner) | `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts` | A `sum` over text throws. A list field with the same stored rule does not |
| Unit (edge) | `parseProposeCaseType.test.ts`, `parseOpenRouterResponse.test.ts`, `runChatAttemptsWithEscalation.test.ts` | Replacement, keeping an allowed rule, keeping an uncatalogued column's rule, catalog threading |
| Unit (prompt) | `buildCaseManagerSystemPrompt.test.ts`, `makeChatToolConfigFromOptions.test.ts` | The column-type guidance is present |
| Unit | `createdCaseTypeToFormValues.test.ts` | `count` stores `bigint`, `sum` over whole numbers stores `double`, `max` keeps the type, `sum` over text becomes `most_frequent` |
| Unit | `conceptFormTypes.test.ts` | `withFieldDataTypes`: a count field, a list field, a field whose column is not among the sources |
| Component | `CaseTypeDraftBlock.test.tsx`, new `DatasetColumnMappingCreator.test.tsx` | Text, number, and yes/no columns offer exactly the allowed rules, with the alphabetical labels on text |
| Migration upgrade | `supabase/migration-upgrade-tests/value_rule_data_types.*.sql` | Section 4.8 fixtures |

**No new E2E spec.** Every G2 behaviour is a pure function, a DuckDB type, a
parser or converter, an option list, or a data migration, and each has a test
at the layer where it can fail. G2 adds no surface. The cross-surface check,
that one value matches on the record page, the Data Explorer, and chat, is
umbrella exit criterion 1, which spans every gap. The plan's verification
task drives the running app once, headless, and takes screenshots.

## 7. Exit criteria

1. In `buildAttributeValueSql.ts`, `AS DOUBLE` appears only in the `sum` and
   `avg` arms of `_buildReducedValueSql`.
2. The executed view test passes: `max` and `min` keep the column's type,
   `count` is `BIGINT`, `sum` and `avg` are `DOUBLE`.
3. No authoring path can store a disallowed rule or a `data_type` other than
   the output type: the parser, converter, form, and card tests pass.
4. The planner refuses a disallowed stored rule with a message naming the
   field and rule.
5. After the migration, this read-only query returns `0` on any database it
   has run against:

   ```sql
   select count(*)
   from public.concept_attributes a
   join public.attribute_mappings__dataset_column m on m.concept_attribute_id = a.id
   join public.dataset_columns c on c.id = m.dataset_column_id and c.dataset_id = m.dataset_id
   where
     (m.value_picker_rule_type in ('sum', 'avg') and c.data_type not in ('bigint', 'double'))
     or (m.value_picker_rule_type in ('max', 'min') and c.data_type = 'boolean')
     or a.data_type is distinct from (
       case
         when a.is_array then c.data_type
         when m.value_picker_rule_type in ('sum', 'avg') then 'double'::public.datasets__ava_data_type
         when m.value_picker_rule_type = 'count' then 'bigint'::public.datasets__ava_data_type
         else c.data_type
       end
     );
   ```

6. `pnpm type-check`, `pnpm lint`, `pnpm test:frontend`, `pnpm test:executed`,
   and `pnpm test:db` pass, and `pnpm i18n:check` is clean.
7. `docs/ontology-architecture.md` describes typed rules, and its section 16
   no longer lists the `max`/`min` cast.

## 8. Files

**Created**

- `shared/models/ontology/ValuePickerRule/ValuePickerRule.ts`
- `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.ts`
- `shared/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.test.ts`
- `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.test.tsx`
- `supabase/migrations/<ts>_correct_value_rule_data_types.sql`
- `supabase/migration-upgrade-tests/value_rule_data_types.prelude.sql`
- `supabase/migration-upgrade-tests/value_rule_data_types.assertions.sql`

**Modified**

- `src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts` (created by G1)
- `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.executed.test.ts`
- `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts`
- `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`
- `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts` and its test
- `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts` and its test
- `supabase/functions/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts` and its test
- `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`
- `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts` and its test
- `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts` and its test
- `src/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts` and its test
- `src/components/ChatPanel/CaseTypeDraftBlock/useValuePickerOptions.ts`, `CaseTypeDraftBlock.tsx`, `CaseTypeDraftCard.tsx`, `CaseTypeDraftSourceSection.tsx`, `CaseTypeDraftAttributeRow.tsx`, `CaseTypeDraftBlock.test.tsx`
- `src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts` and its test
- `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx`
- `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`, `index.tsx`
- `scripts/test-dashboard-publishing-migrations.sh`
- `src/i18n/locales/*` (generated)
- `docs/ontology-architecture.md`

## 9. Deviations from the umbrella spec

1. **Chat parsing does not set `data_type`.** Umbrella section 5 (G2) says
   chat parsing, the draft card, the form, and `createdCaseTypeToFormValues`
   "all set `data_type`". The chat contract has no data type field
   (`shared/types/chat.types.ts:123-202`), and adding one would create a
   second source of truth that the client would have to recompute anyway. So
   the chat parser and the draft card only keep and offer allowed rules, and
   `createdCaseTypeToFormValues`, which both chat tools pass through, sets
   `data_type`. In the same spirit, "refuses a disallowed rule" (umbrella
   section 3.3) means the option lists never offer one and the code paths
   that receive one replace it with `most_frequent`. They do not fail the
   draft, which matches how the parser already treats an unknown rule.
2. **Principle 8, "existing case types keep working unchanged", bends in one
   place.** DuckDB answers `max` and `min` over yes/no, and `sum` over yes/no,
   today, but section 3.3 disallows them. The migration replaces those rules
   with `most_frequent`, which changes what those fields show. See open
   question 1. The `data_type` corrections on existing `count`, `sum`, and
   `avg` fields are the umbrella's own G2 decision, not a deviation.

The four `ValuePickerRule` members beyond umbrella section 6's two (section
4.1) are additions, not deviations.

## 10. Open questions for Kristi

1. **Stored rules on yes/no columns that work today.** `max`, `min`, or `sum`
   on a yes/no column returns `1.0` or `0.0` (or a count of yes values) now,
   and section 3.3 disallows them. The recommendation: the migration replaces
   them with "most frequent", which changes those fields' values. The
   alternative is to leave them stored and exempt them from the planner
   check, which keeps their values but leaves rules no one can pick again.
   There are probably none, and the migration reports how many it changed.
2. **A dataset column's type edited after a case type reads it.** G2 makes
   the query fail with a clear message when the new type disallows the
   field's rule, and otherwise leaves the field's stored type stale, which
   only affects the Data Explorer's menus. The options: block the type edit
   while a field reads the column, retype the fields that read it
   automatically (and reset a rule that becomes disallowed), or keep G2's
   behaviour until case-type editing exists. G5's cast to the field's type
   makes a stale type matter more, so G5 is the latest point to decide.
