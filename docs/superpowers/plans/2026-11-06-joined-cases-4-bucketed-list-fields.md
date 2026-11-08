# Joined Cases 4: Bucketed List Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a case type field hold one value per day, week, month, quarter, or year of a date column, as `STRUCT(bucket DATE, value R)[]` computed by the concept view with each rule's single-value semantics, authored from the concept creator form and chat, and shown on the record page, in the Data Explorer, and to chat SQL.

**Architecture:** The field stores its period (`concept_attributes.bucket_grain`); its mapping stores the date column (`attribute_mappings__dataset_column.bucket_column_id`), and a trigger keeps the two consistent. `"bucketed_list"` joins plan 3's value shapes, and widening that union first makes `pnpm type-check` list every place that branches on a shape. The concept view reads a per-period field through one correlated subquery that normalizes the source rows to `(bucket, value, row_order)`, reduces each period with the field's rule, and aggregates the periods into an ordered list. Readers receive that list unchanged: the record page renders it as a period and value table, the Data Explorer as text labeled by the period its result column carries, and chat unnests it.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP), TypeScript, Zod, DuckDB (QETL, executed Vitest through `@duckdb/node-api`), React, Mantine, Lingui, AG Grid, Deno edge functions, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-4-bucketed-list-fields-design.md`. Section numbers (§) refer to it. **Umbrella:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md`. **Overview and ground rules:** `docs/superpowers/plans/2026-11-06-joined-cases.md`. Every ground rule there applies to every task here, including the `Co-Authored-By` trailer on each commit.

**Prerequisite:** plans 1 to 3 (`2026-11-06-joined-cases-1-record-page-concept-view.md`, `-2-typed-value-rules.md`, `-3-list-fields.md`) have landed on `feat/joined-cases`. This plan edits code those plans write and names it as they do. Task 0 checks it.

---

## Required skills

- **`supabase-declarative-schema`** before Tasks 1 and 2. Edit `supabase/schemas/`, run `pnpm db:reset` and then immediately `pnpm db:new-migration <name>`, and never hand-edit what it generates. This plan has no hand-written migration: no existing row changes, and the enum is new rather than extended.
- **`test-driven-development`** throughout.
- **`impeccable`** before Task 8. The record page's period table is a new surface (overview ground rule 9).
- **`duckdb-docs`** if a DuckDB construct in Task 6 behaves unexpectedly. Every construct used was probed against `@duckdb/node-api` 1.5.5 while writing this plan.
- **`playwright-best-practices`** before Task 16.

## Database command rule

Every step that runs `pnpm db:reset`, `pnpm db:new-migration`, `pnpm db:gen-types`, `pnpm test:db`, or `supabase test db` starts with:

```bash
ava supabase status
```

Expected: the first line says this branch is on a switched local Supabase database and names the `feat-joined-cases` project. If it says `This is the develop local Supabase` or names `avandar`, stop and run `ava supabase switch`. If `ava` is missing, run `pnpm build:ava-cli`. Never pass `--linked` or `--db-url` to `supabase test db`.

## Migration order (do not deviate)

| Order | Migration | Kind | Contents |
| --- | --- | --- | --- |
| 1 | `<ts>_add_bucketed_list_fields.sql` | generated | `concept_attributes__bucket_grain`, `concept_attributes.bucket_grain` with two checks, `attribute_mappings__dataset_column.bucket_column_id`, the mapping trigger and its function |
| 2 | `<ts>_rpc_concepts__create_writes_bucket_columns.sql` | generated | `rpc_concepts__create` writes both columns and requires a rule on a per-period field |

## Order of the tasks

Tasks 1 to 9 build everything a per-period field needs without touching plan 3's shape union: storage, models, the result reader, the SQL, and the record page's leaf components. Task 10 widens both shape unions; `pnpm type-check` then lists every exhaustive branch, and Task 10 gives each one its arm from the pieces already built. Tasks 11 to 15 are the sites no compiler finds (spec §5.9). Between Task 10 and Task 11 a per-period field fails at planning in the app (its date column is not fetched yet): do not stop between them.

## Names this plan adds

Shared names come from umbrella §6. The rest are local to this gap.

| Kind | Name | Where |
| --- | --- | --- |
| Enum (shared) | `public.concept_attributes__bucket_grain` (`day`, `week`, `month`, `quarter`, `year`); TS `ConceptAttribute.BucketGrain` | `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql` |
| Columns (shared) | `concept_attributes.bucket_grain` (TS `bucketGrain`), `attribute_mappings__dataset_column.bucket_column_id` (TS `bucketColumnId`) | schema, models |
| Checks | `concept_attributes__bucket_grain_requires_array`, `concept_attributes__bucket_grain_dataset_value_only` | `20.concept_attributes.sql` |
| Trigger | `tr__attribute_mappings__dataset_column__validate_bucket_column`, function `attribute_mappings__dataset_column__validate_bucket_column()` | `30.attribute_mappings__dataset_column.sql` |
| Value shape (shared) | `"bucketed_list"` in `ConceptAttribute.ValueShape` and `ChatCaseValueShape` | models, chat contract |
| Model | `ConceptAttribute.BUCKET_GRAINS`, `isBucketDateColumnType`, `toBucketedListEntries`, `BucketedListEntry` | `ConceptAttributeModule` |
| SQL (shared) | struct fields `bucket` and `value` | |
| SQL builder | `buildBucketedListValueSql`, `buildBucketedListTypeSql`, `BucketedListValueSqlOptions` | `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/` |
| Field (shared name, new home) | `bucketGrain` on `QueryResultColumn` and `ProjectionDescriptor`; `QueryColumn.getBucketGrain` | `shared/models/queries/` (spec §10, deviation 1) |
| Chat (shared) | `ChatCaseBucketGrain`; `bucketGrain`, `bucketColumnId` on chat attributes | `shared/types/chat.types.ts` |
| UI | `useBucketGrainLabels`, `useBucketPeriodFormatter`, `PeriodControls`, `makeDateColumnOptions` | `src/components/caseFields/` |
| Record page | `RecordFieldPeriodTable` | `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/` |
| Draft editor | `setAttributeBucket` | `useCaseTypeDraftEditor` |
| Schema context | `SqlTableAlias.formatBucketedFieldNote` | `shared/models/chat/SqlTableAlias/` |

## File map

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql` (new) | The period enum |
| `supabase/schemas/20.concept_attributes.sql` | `bucket_grain` and two checks |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql` | `bucket_column_id` and the validating trigger |
| `supabase/schemas/50.rpc_concepts__create.sql` | Writes both columns; plan 3's rule check admits a per-period field |
| `supabase/tests/database/concept_attributes__bucketed_list.test.sql` (new), `rpc_concepts__create.test.sql` | pgTAP |
| `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql` | Generated |
| `shared/models/ontology/ConceptAttribute/` | Type, field, parser, widened shape, module members |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/` | `bucketColumnId` and its parser |
| `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/` (new) | The per-period SQL and its executed test |
| `buildConceptViewSql.ts`, `makeConceptAttributeColumnsFromMetadata.ts` | The `bucketed_list` rule arm, selectors, resolution, fail-closed throws |
| `getConceptRelationPlansFromSql.ts`, `getNeededColumnsFromQuery.ts` | Fetch and load the date column |
| `src/components/caseFields/` | Period labels, `PeriodControls`, the third `ValueShapeControl` segment |
| `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.ts` (+ test) | Decimals inside a map or union keep their scale |
| `src/views/IndividualManagerApp/SingleIndividualView/` | `CaseDetailsRow`, the row builder, `RecordFieldValue`, `RecordFieldPeriodTable` (its values through plan 3's `useFieldValueFormatter`) |
| `src/components/ChatPanel/CaseTypeDraftBlock/` | Draft card period and date column |
| `proposedCaseTypeToCreatedCaseType/`, `createdCaseTypeToFormValues/`, `insertConceptFromFormValues/` | Conversions and the insert |
| `src/views/OntologyDesignerApp/ConceptCreatorView/` | Form controls, validation, `keepKeyAndLabelFieldsSingle` |
| `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx` | Per-period badge |
| `shared/models/queries/QueryColumn/`, `QueryResult/`, `QueryResultColumnBindings/` | List gate arm, `getBucketGrain`, `bucketGrain` on result columns |
| `src/components/VisualizationContainer/VisualizationContainer.tsx`, `src/lib/ui/viz/DataGrid.tsx`, `makeDataGridColumnDefs/` | Grid text for a per-period cell |
| `shared/types/chat.types.ts`, `parseProposeCaseType.ts`, `makeChatToolConfigFromOptions.ts`, `buildCaseManagerSystemPrompt.ts` | Chat contract, parser, tool schema, prompt |
| `fetchWorkspaceSchema.ts`, `fetchOfflineChatSchema.ts`, `offlineChat.types.ts`, `SqlTableAlias`, `buildSqlSystemPrompt.ts`, `buildOfflinePrompts.ts` | Chat SQL schema context |
| `tests/e2e/case-bucketed-fields.spec.ts`, `tests/e2e/helpers/CaseTypeSeedHelpers.ts`, `tests/e2e/helpers/constants.ts`, `tests/data/case-bucketed-visits/` (new) | End to end |
| `docs/ontology-architecture.md` | The architecture doc |

---

## Task 0: Confirm what plans 1 to 3 left behind

**Files:** none. No commit.

This plan edits code plans 1 to 3 wrote, by the names their plans give it. This task checks that the code landed under those names.

- [ ] **Step 1: Check the names**

```bash
rg -n "export function buildAttributeValueSql" src/clients/qetl/QueryMediator/conceptRelation
rg -n "ConceptAttributeValueRule|function _buildColumnSelector|function _buildUnmappedSelector" src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts
rg -n "function _getValueRule" src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts
rg -n "getValueShape|valueShapeToIsArray|getOutputDataType" shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts
rg -n "ChatCaseValueShape" shared/types/chat.types.ts
rg -n "value_rule_mismatch|list_field_is_key_or_label" supabase/schemas/50.rpc_concepts__create.sql
rg -ln "ValueShapeControl" src
rg -n "export function RecordFieldValue|export function makeCaseDetailsRowsFromAttributes|export function keepKeyAndLabelFieldsSingle" src
rg -n "export function useFieldValueFormatter|export function createFieldValueFormatter" src/components/caseFields
rg -n "isList|getValidAggregations" shared/models/queries/QueryColumn/QueryColumnModule.ts
rg -n "StructRow|isArray: true" src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.ts src/clients/DuckDbClient/arrowFieldToQueryResultField.ts
rg -n "formatListFieldNote|_formatConceptAttributeName" shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts
ls src/clients/qetl/wrappers/ConceptWrapper 2>/dev/null
```

Expected: every `rg` finds its name, and `ConceptWrapper` no longer exists (plan 1 deleted it). In particular:

- `ConceptAttributeValueRule` in `buildConceptViewSql.ts` has a `single` arm with `valuePickerRuleType` and a `list` arm, and `_buildColumnSelector` and `_buildUnmappedSelector` match on `valueShape`.
- `ValueShapeControl` is in `src/components/caseFields/ValueShapeControl/ValueShapeControl.tsx`, labels each shape through a `Record<ConceptAttribute.ValueShape, string>`, and the draft card row (`CaseTypeDraftAttributeRow.tsx`) and the form (`DatasetColumnMappingCreator.tsx`) both use it.
- `RecordFieldValue` is in `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue.tsx`, and renders plan 1's "No value" for a missing value before it matches on the shape.
- `_toJsValueFromArrowValue` converts an `arrow.StructRow` by mapping its fields through itself, and `arrowFieldToQueryResultField` reports a LIST column as `{ dataType: "varchar", isArray: true }`.
- `useFieldValueFormatter` is in `src/components/caseFields/useFieldValueFormatter/useFieldValueFormatter.ts` and takes a field's `data_type`; `createFieldValueFormatter` is its pure core beside it. Task 8's period table formats its values through it.

- [ ] **Step 2: Note the string checks plan 3 left**

```bash
rg -n '=== "list"|!== "list"|=== "single"|!== "single"|is_array === true' src shared supabase --type ts
```

These are the comparisons the compiler cannot find. Tasks 10 to 14 handle the ones in their files. The rule for every hit: a test meaning "does this field hold more than one value?" must be true for `"bucketed_list"` (`!== "single"`), and a list marker or list note must not describe a per-period field.

- [ ] **Step 3: Reconcile names**

If any name or path differs from what Step 1 expects, use the landed one everywhere this plan uses the planned one, and add a row for it to the child spec's "Deviations" section in Task 18.

---

## Task 1: The period enum, the two columns, and the mapping trigger

**Files:**
- Create: `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql`
- Modify: `supabase/schemas/20.concept_attributes.sql:3-24` (the table)
- Modify: `supabase/schemas/30.attribute_mappings__dataset_column.sql:11-21` (the table) and append the trigger after `tr_attribute_mappings__dataset_column_set_updated_at`
- Create: `supabase/tests/database/concept_attributes__bucketed_list.test.sql`
- Create: `supabase/migrations/<ts>_add_bucketed_list_fields.sql` (generated)

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: the switched `feat-joined-cases` project.

- [ ] **Step 2: Write the failing test**

Create `supabase/tests/database/concept_attributes__bucketed_list.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * Per-period (bucketed list) fields. Two checks on `concept_attributes` keep
 * a period on dataset list fields that neither name nor key a record, and a
 * trigger holds each dataset-column mapping's `bucket_column_id` to its
 * field's `bucket_grain` and to a date or timestamp column of the mapping's
 * own dataset.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values ('b4000001-0000-4000-8000-000000000001'::uuid, 'bucketed_fields@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'bucketed fields ws', 'bucketed-fields-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('b4002001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('b4003001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4002001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner')
on conflict (id) do nothing;

-- Visits holds the values and every kind of candidate date column; Labs has a
-- date column of its own, which a Visits mapping must not borrow.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4003001-0000-4000-8000-000000000001'::uuid, 'bucketed visits', 'csv_file'::public.datasets__source_type),
  ('b4004002-0000-4000-8000-000000000002'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4003001-0000-4000-8000-000000000001'::uuid, 'bucketed labs', 'csv_file'::public.datasets__source_type);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('b4005001-0000-4000-8000-000000000001'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'patient_id', 'patient_id', 'VARCHAR', 'VARCHAR', 'varchar', 0),
  ('b4005002-0000-4000-8000-000000000002'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'temperature', 'temperature', 'DOUBLE', 'DOUBLE', 'double', 1),
  ('b4005003-0000-4000-8000-000000000003'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'visit_date', 'visit_date', 'DATE', 'DATE', 'date', 2),
  ('b4005004-0000-4000-8000-000000000004'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'visit_at', 'visit_at', 'TIMESTAMP', 'TIMESTAMP', 'timestamp', 3),
  ('b4005005-0000-4000-8000-000000000005'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'visit_time', 'visit_time', 'TIME', 'TIME', 'time', 4),
  ('b4005006-0000-4000-8000-000000000006'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'note', 'note', 'VARCHAR', 'VARCHAR', 'varchar', 5),
  ('b4005007-0000-4000-8000-000000000007'::uuid, 'b4004002-0000-4000-8000-000000000002'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'lab_date', 'lab_date', 'DATE', 'DATE', 'date', 0);

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('b4006001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'bucketed case type', false, 'b4007001-0000-4000-8000-000000000001'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('b4007001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0);

-- Patient labels and keys the case type. Note has no period. The two
-- per-period fields are mapped by the assertions below.
insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
values
  ('b4008001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Patient', 'varchar', 'dataset_column', true, true, false, false, null),
  ('b4008002-0000-4000-8000-000000000002'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Note', 'varchar', 'dataset_column', false, false, false, false, null),
  ('b4008003-0000-4000-8000-000000000003'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Temperature per week', 'double', 'dataset_column', false, false, true, false, 'week'),
  ('b4008004-0000-4000-8000-000000000004'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Unmapped per month', 'double', 'dataset_column', false, false, true, false, 'month');

insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)
values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008001-0000-4000-8000-000000000001'::uuid, 'first', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005001-0000-4000-8000-000000000001'::uuid);

select plan (14);

-- 1.
select throws_ok (
  $t1$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Scalar per month', 'double', 'dataset_column', false, false, false, false, 'month');
  $t1$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_requires_array"',
  'a field with a period must be a list'
);

-- 2. A hand-entered field has no rows to group by period.
select throws_ok (
  $t2$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Manual per month', 'varchar', 'manual_entry', false, false, true, true, 'month');
  $t2$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_dataset_value_only"',
  'a manual-entry field cannot have a period'
);

-- 3. The check runs before the label trigger, so a second label still fails
-- on the check.
select throws_ok (
  $t3$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Label per month', 'varchar', 'dataset_column', true, false, true, false, 'month');
  $t3$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_dataset_value_only"',
  'a per-period field cannot name the record'
);

-- 4.
select throws_ok (
  $t4$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Key per month', 'varchar', 'dataset_column', false, true, true, false, 'month');
  $t4$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_dataset_value_only"',
  'a per-period field cannot key the record'
);

-- 5.
select lives_ok (
  $t5$
  insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4008005-0000-4000-8000-000000000005'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Temperature per month', 'double', 'dataset_column', false, false, true, false, 'month');
  $t5$,
  'a dataset list field takes a period'
);

-- 6.
select lives_ok (
  $t6$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008005-0000-4000-8000-000000000005'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005003-0000-4000-8000-000000000003'::uuid);
  $t6$,
  'a per-period field is mapped with a date column of its dataset'
);

-- 7.
select lives_ok (
  $t7$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008003-0000-4000-8000-000000000003'::uuid, 'max', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005004-0000-4000-8000-000000000004'::uuid);
  $t7$,
  'a per-period field is mapped with a timestamp column of its dataset'
);

-- 8.
select throws_ok (
  $t8$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid);
  $t8$,
  '23514',
  'A mapping for a field with a bucket_grain needs a bucket_column_id',
  'a per-period field cannot be mapped without a date column'
);

-- 9.
select throws_ok (
  $t9$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008002-0000-4000-8000-000000000002'::uuid, 'first', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005006-0000-4000-8000-000000000006'::uuid, 'b4005003-0000-4000-8000-000000000003'::uuid);
  $t9$,
  '23514',
  'A mapping for a field without a bucket_grain cannot have a bucket_column_id',
  'a field without a period cannot be mapped with a date column'
);

-- 10.
select throws_ok (
  $t10$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005007-0000-4000-8000-000000000007'::uuid);
  $t10$,
  '23514',
  'bucket_column_id must be a column of the mapping''s dataset',
  'a date column of another dataset is refused'
);

-- 11.
select throws_ok (
  $t11$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005099-0000-4000-8000-000000000099'::uuid);
  $t11$,
  '23514',
  'bucket_column_id must be a column of the mapping''s dataset',
  'a date column that does not exist is refused'
);

-- 12.
select throws_ok (
  $t12$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005006-0000-4000-8000-000000000006'::uuid);
  $t12$,
  '23514',
  'bucket_column_id must be a date or timestamp column',
  'a text column cannot place rows in a period'
);

-- 13. A time of day has no calendar date.
select throws_ok (
  $t13$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005005-0000-4000-8000-000000000005'::uuid);
  $t13$,
  '23514',
  'bucket_column_id must be a date or timestamp column',
  'a time column cannot place rows in a period'
);

-- 14. The trigger guards updates as well as inserts.
select throws_ok (
  $t14$
  update public.attribute_mappings__dataset_column
  set bucket_column_id = null
  where concept_attribute_id = 'b4008005-0000-4000-8000-000000000005'::uuid;
  $t14$,
  '23514',
  'A mapping for a field with a bucket_grain needs a bucket_column_id',
  'a per-period mapping cannot lose its date column'
);

select * from finish ();

rollback;
```

- [ ] **Step 3: Run it and watch it fail**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__bucketed_list.test.sql
```

Expected: FAIL before the plan runs, with `column "bucket_grain" of relation "concept_attributes" does not exist` from the setup insert.

- [ ] **Step 4: Create the enum**

Create `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql`:

```sql
/**
 * The period a per-period field groups its rows by. A row belongs to the
 * period that starts on `date_trunc(<value>, <the mapping's date column>)`.
 *
 * Enum values:
 *
 * `day` - One calendar day.
 *
 * `week` - One ISO week, starting on Monday.
 *
 * `month` - One calendar month.
 *
 * `quarter` - One calendar quarter, starting in January, April, July, or
 *  October.
 *
 * `year` - One calendar year.
 *
 * Note: Each value is also the DuckDB `date_trunc` part of the same name.
 * Keep new values at the end.
 */
create type public.concept_attributes__bucket_grain as enum(
  'day',
  'week',
  'month',
  'quarter',
  'year'
);
```

- [ ] **Step 5: Add the field's period**

In `supabase/schemas/20.concept_attributes.sql`, replace:

```sql
  allow_manual_edit boolean not null,
  -- The Data Explorer gives every case type a built-in `status` column, and
  -- DuckDB identifiers ignore case, so no attribute may take that name.
  constraint concept_attributes__name_not_reserved check (lower(btrim(name)) <> 'status')
);
```

with:

```sql
  allow_manual_edit boolean not null,
  -- Set only on a field that keeps one value per period of a date column.
  -- Its dataset-column mapping names that column in `bucket_column_id`.
  bucket_grain public.concept_attributes__bucket_grain,
  -- The Data Explorer gives every case type a built-in `status` column, and
  -- DuckDB identifiers ignore case, so no attribute may take that name.
  constraint concept_attributes__name_not_reserved check (lower(btrim(name)) <> 'status'),
  -- A per-period field is a list of (period, value) pairs.
  constraint concept_attributes__bucket_grain_requires_array check (
    bucket_grain is null or is_array
  ),
  -- Only dataset rows can be grouped by period, and a list can neither name
  -- a record nor match its rows across datasets.
  constraint concept_attributes__bucket_grain_dataset_value_only check (
    bucket_grain is null or (
      mapping_type = 'dataset_column' and not is_label and not is_identifier
    )
  )
);
```

- [ ] **Step 6: Add the mapping's date column and its trigger**

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`, replace:

```sql
  dataset_id uuid not null,
  dataset_column_id uuid not null
);
```

with:

```sql
  dataset_id uuid not null,
  dataset_column_id uuid not null,
  -- The date or timestamp column of this dataset that places each row in a
  -- period. Set exactly when the field has a `bucket_grain`, which
  -- `tr__attribute_mappings__dataset_column__validate_bucket_column` checks.
  -- A bare id, like `dataset_column_id`.
  bucket_column_id uuid
);
```

Then, directly after the `create trigger tr_attribute_mappings__dataset_column_set_updated_at ...` statement, add:

```sql
/**
 * Checks a dataset-column mapping's `bucket_column_id` against its field and
 * its dataset: it is set exactly when the field has a `bucket_grain`, and it
 * then names a `date` or `timestamp` column of the mapping's own dataset.
 * The concept view groups the field's rows by that column, so any other
 * column would group nothing or fail to bind.
 *
 * Runs on the mapping rather than on `concept_attributes`, because
 * `rpc_concepts__create` inserts a case type's fields before their mappings,
 * so the field is always there when its mapping arrives.
 *
 * SECURITY DEFINER so the check sees the column whatever the caller may
 * read: it validates the mapping's shape, not the caller's access to the
 * dataset, and it returns nothing but pass or fail.
 */
create or replace function public.attribute_mappings__dataset_column__validate_bucket_column () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  v_bucket_grain public.concept_attributes__bucket_grain;
  v_column_dataset_id uuid;
  v_column_data_type public.datasets__ava_data_type;
begin
  select attribute.bucket_grain
  into v_bucket_grain
  from public.concept_attributes attribute
  where attribute.id = new.concept_attribute_id;

  if v_bucket_grain is null then
    if new.bucket_column_id is not null then
      raise exception 'A mapping for a field without a bucket_grain cannot have a bucket_column_id'
        using
          errcode = '23514',
          hint = 'bucket_column_not_allowed',
          detail = format('concept_attribute_id %s', new.concept_attribute_id);
    end if;
    return new;
  end if;

  if new.bucket_column_id is null then
    raise exception 'A mapping for a field with a bucket_grain needs a bucket_column_id'
      using
        errcode = '23514',
        hint = 'bucket_column_required',
        detail = format('concept_attribute_id %s', new.concept_attribute_id);
  end if;

  select dataset_column.dataset_id, dataset_column.data_type
  into v_column_dataset_id, v_column_data_type
  from public.dataset_columns dataset_column
  where dataset_column.id = new.bucket_column_id;

  -- A column that does not exist leaves both variables null, which lands
  -- here too.
  if v_column_dataset_id is distinct from new.dataset_id then
    raise exception 'bucket_column_id must be a column of the mapping''s dataset'
      using
        errcode = '23514',
        hint = 'bucket_column_not_in_dataset',
        detail = format(
          'bucket_column_id %s, dataset_id %s',
          new.bucket_column_id,
          new.dataset_id
        );
  end if;

  if v_column_data_type not in ('date', 'timestamp') then
    raise exception 'bucket_column_id must be a date or timestamp column'
      using
        errcode = '23514',
        hint = 'bucket_column_not_a_date',
        detail = format(
          'bucket_column_id %s is %s',
          new.bucket_column_id,
          v_column_data_type
        );
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no Data
-- API role needs a grant for the trigger to fire.
revoke
execute on function public.attribute_mappings__dataset_column__validate_bucket_column ()
from
  public,
  anon,
  authenticated,
  service_role;

-- `before`, so a refused mapping never reaches the unique or foreign key
-- checks and the error names the real problem.
create trigger tr__attribute_mappings__dataset_column__validate_bucket_column before insert
or
update on public.attribute_mappings__dataset_column for each row
execute function public.attribute_mappings__dataset_column__validate_bucket_column ();
```

Run `pnpm format`.

- [ ] **Step 7: Generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration add_bucketed_list_fields
```

Expected: a new `supabase/migrations/<ts>_add_bucketed_list_fields.sql` with `create type "public"."concept_attributes__bucket_grain"`, `alter table ... add column "bucket_grain"` and both `add constraint ... check` statements on `concept_attributes`, `alter table ... add column "bucket_column_id"` on `attribute_mappings__dataset_column`, the function, its `revoke`, and the trigger. It drops nothing. If it drops anything, this is the shared-stack bug in `CLAUDE.md`: reset, regenerate, compare.

- [ ] **Step 8: Run the test and watch it pass**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__bucketed_list.test.sql
```

Expected: PASS, 14 assertions.

- [ ] **Step 9: Commit**

```bash
git add supabase/schemas/00.enum.concept_attributes__bucket_grain.sql supabase/schemas/20.concept_attributes.sql supabase/schemas/30.attribute_mappings__dataset_column.sql supabase/migrations/*_add_bucketed_list_fields.sql supabase/tests/database/concept_attributes__bucketed_list.test.sql
git commit -m "feat(joined-cases): store a field's period and its mapping's date column"
```

---

## Task 2: `rpc_concepts__create` writes both columns and admits a per-period rule

**Files:**
- Modify: `supabase/schemas/50.rpc_concepts__create.sql` (the attribute and dataset-column mapping inserts, plan 3's `value_rule_mismatch` check, the docstring)
- Modify: `supabase/tests/database/concept_attributes__bucketed_list.test.sql`
- Modify: `supabase/tests/database/rpc_concepts__create.test.sql` (plan 3's two assertions of the rule-check message)
- Create: `supabase/migrations/<ts>_rpc_concepts__create_writes_bucket_columns.sql` (generated)

Two silent failures this task closes. `jsonb_to_recordset` only reads the keys its column list names, so the RPC drops a period and a date column today, and the trigger from Task 1 then refuses every per-period mapping. And plan 3's check refuses `is_array = (rule is not null)`, which is every per-period field: it is an array that keeps a rule.

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: the switched `feat-joined-cases` project.

- [ ] **Step 2: Add the failing assertions**

In `supabase/tests/database/concept_attributes__bucketed_list.test.sql`, change `select plan (14);` to `select plan (22);`, and add these assertions directly before `select * from finish ();`:

```sql
-- 15. The RPC runs as the test's superuser, so no signed-in user owns the
-- case type and the payload's owner is used.
select lives_ok (
  $t15$
  select public.rpc_concepts__create (
    '{"id":"b4009001-0000-4000-8000-000000000001","workspace_id":"b4001001-0000-4000-8000-000000000001","owner_id":"b4000001-0000-4000-8000-000000000001","name":"RPC bucketed case type","description":null,"allow_manual_creation":false,"default_status_id":"b4009002-0000-4000-8000-000000000002"}'::jsonb,
    '[{"id":"b4009003-0000-4000-8000-000000000003","name":"Patient","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false},{"id":"b4009004-0000-4000-8000-000000000004","name":"Temperature per month","description":null,"data_type":"double","mapping_type":"dataset_column","is_label":false,"is_identifier":false,"is_array":true,"allow_manual_edit":false,"bucket_grain":"month"}]'::jsonb,
    '[{"concept_attribute_id":"b4009003-0000-4000-8000-000000000003","value_picker_rule_type":"first","dataset_id":"b4004001-0000-4000-8000-000000000001","dataset_column_id":"b4005001-0000-4000-8000-000000000001"},{"concept_attribute_id":"b4009004-0000-4000-8000-000000000004","value_picker_rule_type":"avg","dataset_id":"b4004001-0000-4000-8000-000000000001","dataset_column_id":"b4005002-0000-4000-8000-000000000002","bucket_column_id":"b4005003-0000-4000-8000-000000000003"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"b4009002-0000-4000-8000-000000000002","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t15$,
  'the RPC creates a case type with a per-month field and its rule'
);

-- 16.
select is (
  (select bucket_grain from public.concept_attributes where id = 'b4009004-0000-4000-8000-000000000004'::uuid),
  'month'::public.concept_attributes__bucket_grain,
  'the RPC writes the field''s period'
);

-- 17.
select is (
  (select bucket_column_id from public.attribute_mappings__dataset_column where concept_attribute_id = 'b4009004-0000-4000-8000-000000000004'::uuid),
  'b4005003-0000-4000-8000-000000000003'::uuid,
  'the RPC writes the mapping''s date column'
);

-- 18. A payload with neither key, as every case type before this change
-- sends, still creates a field with no period.
select is (
  (select bucket_grain from public.concept_attributes where id = 'b4009003-0000-4000-8000-000000000003'::uuid),
  null::public.concept_attributes__bucket_grain,
  'a field sent without a period has none'
);

-- 19.
select throws_ok (
  $t19$
  select public.rpc_concepts__create (
    '{"id":"b4009005-0000-4000-8000-000000000005","workspace_id":"b4001001-0000-4000-8000-000000000001","owner_id":"b4000001-0000-4000-8000-000000000001","name":"No date column","description":null,"allow_manual_creation":false,"default_status_id":"b4009006-0000-4000-8000-000000000006"}'::jsonb,
    '[{"id":"b4009007-0000-4000-8000-000000000007","name":"Patient","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false},{"id":"b4009008-0000-4000-8000-000000000008","name":"Temperature per month","description":null,"data_type":"double","mapping_type":"dataset_column","is_label":false,"is_identifier":false,"is_array":true,"allow_manual_edit":false,"bucket_grain":"month"}]'::jsonb,
    '[{"concept_attribute_id":"b4009007-0000-4000-8000-000000000007","value_picker_rule_type":"first","dataset_id":"b4004001-0000-4000-8000-000000000001","dataset_column_id":"b4005001-0000-4000-8000-000000000001"},{"concept_attribute_id":"b4009008-0000-4000-8000-000000000008","value_picker_rule_type":"avg","dataset_id":"b4004001-0000-4000-8000-000000000001","dataset_column_id":"b4005002-0000-4000-8000-000000000002"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"b4009006-0000-4000-8000-000000000006","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t19$,
  '23514',
  'A mapping for a field with a bucket_grain needs a bucket_column_id',
  'the RPC refuses a per-month field without a date column'
);

-- 20.
select is (
  (select count(*)::int from public.concepts where id = 'b4009005-0000-4000-8000-000000000005'::uuid),
  0,
  'a refused date column leaves no case type behind'
);

-- 21. A per-period field reduces each period with a rule, so it needs one.
select throws_ok (
  $t21$
  select public.rpc_concepts__create (
    '{"id":"b4009009-0000-4000-8000-000000000009","workspace_id":"b4001001-0000-4000-8000-000000000001","owner_id":"b4000001-0000-4000-8000-000000000001","name":"No rule","description":null,"allow_manual_creation":false,"default_status_id":"b4009010-0000-4000-8000-000000000010"}'::jsonb,
    '[{"id":"b4009011-0000-4000-8000-000000000011","name":"Patient","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false},{"id":"b4009012-0000-4000-8000-000000000012","name":"Temperature per month","description":null,"data_type":"double","mapping_type":"dataset_column","is_label":false,"is_identifier":false,"is_array":true,"allow_manual_edit":false,"bucket_grain":"month"}]'::jsonb,
    '[{"concept_attribute_id":"b4009011-0000-4000-8000-000000000011","value_picker_rule_type":"first","dataset_id":"b4004001-0000-4000-8000-000000000001","dataset_column_id":"b4005001-0000-4000-8000-000000000001"},{"concept_attribute_id":"b4009012-0000-4000-8000-000000000012","dataset_id":"b4004001-0000-4000-8000-000000000001","dataset_column_id":"b4005002-0000-4000-8000-000000000002","bucket_column_id":"b4005003-0000-4000-8000-000000000003"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"b4009010-0000-4000-8000-000000000010","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t21$,
  '23514',
  'A dataset field has a value rule unless it keeps every value',
  'the RPC refuses a per-month field without a value rule'
);

-- 22.
select is (
  (select count(*)::int from public.concepts where id = 'b4009009-0000-4000-8000-000000000009'::uuid),
  0,
  'a refused rule leaves no case type behind'
);
```

In `supabase/tests/database/rpc_concepts__create.test.sql`, replace both occurrences of the expected message `'A dataset field has a value rule exactly when it keeps one value'` (plan 3's list-with-a-rule and single-without-a-rule assertions) with `'A dataset field has a value rule unless it keeps every value'`.

- [ ] **Step 3: Run them and watch them fail**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__bucketed_list.test.sql
supabase test db supabase/tests/database/rpc_concepts__create.test.sql
```

Expected: FAIL. In the first file, 15 throws `A dataset field has a value rule exactly when it keeps one value` (the RPC drops `bucket_grain`, so plan 3's check sees a list with a rule), 16 and 17 read NULL, 19 throws that same message instead of the date-column one, 21 throws nothing, and 22 counts 1. In the second, plan 3's two message assertions fail on the old message.

- [ ] **Step 4: Write both columns**

In `supabase/schemas/50.rpc_concepts__create.sql`, in the `concept_attributes` insert, add `bucket_grain` as the last column of the insert list, `a.bucket_grain` as the last select expression, and `bucket_grain public.concept_attributes__bucket_grain` as the last column of the `jsonb_to_recordset(p_attributes) as a (...)` definition. The insert then ends:

```sql
    is_array,
    allow_manual_edit,
    bucket_grain
  )
  select
    ...
    a.is_array,
    a.allow_manual_edit,
    a.bucket_grain
  from jsonb_to_recordset(p_attributes) as a (
    ...
    is_array boolean,
    allow_manual_edit boolean,
    bucket_grain public.concept_attributes__bucket_grain
  );
```

In the `attribute_mappings__dataset_column` insert, add `bucket_column_id` the same way, and a comment above it:

```sql
  -- After the attributes, so the bucket column trigger finds each mapping's
  -- field and its period.
  insert into public.attribute_mappings__dataset_column (
    workspace_id,
    concept_attribute_id,
    value_picker_rule_type,
    dataset_id,
    dataset_column_id,
    bucket_column_id
  )
  select
    v_workspace_id,
    m.concept_attribute_id,
    m.value_picker_rule_type,
    m.dataset_id,
    m.dataset_column_id,
    m.bucket_column_id
  from jsonb_to_recordset(p_dataset_column_mappings) as m (
    concept_attribute_id uuid,
    value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
    dataset_id uuid,
    dataset_column_id uuid,
    bucket_column_id uuid
  );
```

Keep every column plans 1 to 3 put in either insert; add only these two.

- [ ] **Step 5: Admit a per-period field's rule**

Replace plan 3's check:

```sql
  -- A list field keeps every value, so its mapping names no rule, and every
  -- other dataset field reduces its rows with exactly one. The rule and
  -- `is_array` live in different tables, so no constraint can say this.
  if exists (
    select 1
    from public.attribute_mappings__dataset_column m
    join public.concept_attributes a on a.id = m.concept_attribute_id
    where
      a.concept_id = v_concept_id
      and a.is_array = (m.value_picker_rule_type is not null)
  ) then
    raise exception 'A dataset field has a value rule exactly when it keeps one value'
      using errcode = '23514', hint = 'value_rule_mismatch';
  end if;
```

with:

```sql
  -- A field that keeps every value names no rule. Every other dataset field
  -- reduces its rows with exactly one, a per-period field once per period.
  -- The rule and `is_array` live in different tables, so no constraint can
  -- say this.
  if exists (
    select 1
    from public.attribute_mappings__dataset_column m
    join public.concept_attributes a on a.id = m.concept_attribute_id
    where
      a.concept_id = v_concept_id
      and (a.is_array and a.bucket_grain is null) = (
        m.value_picker_rule_type is not null
      )
  ) then
    raise exception 'A dataset field has a value rule unless it keeps every value'
      using errcode = '23514', hint = 'value_rule_mismatch';
  end if;
```

Plan 3's `list_field_is_key_or_label` check needs no change: a per-period field is `is_array`.

In the docstring, replace plan 3's paragraph about the checks and the `@param` lines for the two payloads with:

```sql
 * A field that keeps every value (`is_array` with no `bucket_grain`) stores
 * no value rule; every other dataset field stores one, a per-period field
 * included; and no list of either kind is the label or an identifier. Each
 * is refused with errcode `23514` and the hint `value_rule_mismatch` or
 * `list_field_is_key_or_label`.
```

```sql
 * @param p_attributes The `concept_attributes` rows, each with its `id`. A
 *   row without `bucket_grain` creates a field with no period.
 * @param p_dataset_column_mappings The `attribute_mappings__dataset_column`
 *   rows. A row without `bucket_column_id` names no date column.
```

Run `pnpm format`.

- [ ] **Step 6: Generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration rpc_concepts__create_writes_bucket_columns
```

Expected: a new `<ts>_rpc_concepts__create_writes_bucket_columns.sql` holding `create or replace function public.rpc_concepts__create` and nothing else of substance. The signature is unchanged, so no grant moves.

- [ ] **Step 7: Run the tests and watch them pass**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__bucketed_list.test.sql
pnpm test:db
```

Expected: PASS, 22 assertions; then the whole database suite, including `rpc_concepts__create.test.sql` and the migration upgrade tests.

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas/50.rpc_concepts__create.sql supabase/migrations/*_rpc_concepts__create_writes_bucket_columns.sql supabase/tests/database/concept_attributes__bucketed_list.test.sql supabase/tests/database/rpc_concepts__create.test.sql
git commit -m "feat(joined-cases): create a case type's per-period fields in one transaction"
```

---

## Task 3: Database types, the desktop mirror, and the two model fields

**Files:**
- Modify: `shared/types/database.types.ts` (generated)
- Create: `apps/desktop/migrations/<ts>_add_bucketed_list_fields.gen.sql`, `<ts>_rpc_concepts__create_writes_bucket_columns.gen.sql` (generated)
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`, `ConceptAttribute.ts`, `ConceptAttributeParsers.ts`, `ConceptAttributeModule/ConceptAttributeModule.ts`
- Create: `shared/models/ontology/ConceptAttribute/ConceptAttributeParsers.test.ts`
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts`, `DatasetColumnMappingParsers.ts`
- Test: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.test.ts` (plan 3 created it)
- Modify: every fixture the compiler names in Step 10

A parser's `DBReadSchema` is also the list of keys an insert sends: `makeParserRegistry` picks the insert payload down to the schema's keys (`packages/shared/clients/src/makeParserRegistry/makeParserRegistry.ts:195-206`). Without the two new keys, `ConceptClient.create` silently drops a field's period and its date column on the way to the RPC.

- [ ] **Step 1: Regenerate the database types**

```bash
ava supabase status
pnpm db:gen-types
```

Expected: `shared/types/database.types.ts` gains `concept_attributes__bucket_grain` under `Enums`, `bucket_grain` on `concept_attributes`, and `bucket_column_id` on `attribute_mappings__dataset_column` (in `Row`, `Insert`, and `Update`). `pnpm type-check` now fails in both parsers' `ZodConsistencyTests`; Steps 5 to 9 fix it. Never hand-edit this file.

- [ ] **Step 2: Generate the SQLite migrations**

```bash
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
```

Expected: two new `.gen.sql` files, one per migration from Tasks 1 and 2, and no drift. The first adds both columns; the generator prints `needs hand-edit` for the two `add constraint` statements. Leave them recorded in the file's header, as earlier migrations do: the desktop app is pre-release, and its mirror does not need the database's constraints. The second has no schema-shape change.

- [ ] **Step 3: Write the failing parser tests**

Create `shared/models/ontology/ConceptAttribute/ConceptAttributeParsers.test.ts`:

```ts
/**
 * A field's period has to survive both directions: read from its row, and
 * sent with the insert, which only carries the keys the read schema names.
 */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { ConceptAttributeParsers } from "$/models/ontology/ConceptAttribute/ConceptAttributeParsers.ts";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";

const DB_ROW: ConceptAttribute.T<"DBRead"> = {
  allow_manual_edit: false,
  bucket_grain: "month",
  concept_id: "00000000-0000-4000-8000-000000000002",
  created_at: "2026-11-06T00:00:00.000Z",
  data_type: "double",
  description: null,
  id: "00000000-0000-4000-8000-000000000001",
  is_array: true,
  is_identifier: false,
  is_label: false,
  mapping_type: "dataset_column",
  name: "Temperature",
  updated_at: "2026-11-06T00:00:00.000Z",
  workspace_id: "00000000-0000-4000-8000-000000000003",
};

describe("ConceptAttributeParsers", () => {
  it("reads a field's period from its row", () => {
    const attribute = ConceptAttributeParsers.fromDBReadToModelRead(DB_ROW);

    expect(attribute.bucketGrain).toBe("month");
  });

  it("sends a field's period when the field is inserted", () => {
    const dbInsert = ConceptAttributeParsers.fromModelInsertToDBInsert(
      Model.make("ConceptAttribute", {
        conceptId: DB_ROW.concept_id as ConceptAttribute.T["conceptId"],
        workspaceId: DB_ROW.workspace_id as ConceptAttribute.T["workspaceId"],
        name: "Temperature",
        dataType: "double",
        mappingType: "dataset_column",
        isLabel: false,
        isIdentifier: false,
        isArray: true,
        allowManualEdit: false,
        bucketGrain: "week",
      }),
    );

    expect(dbInsert).toMatchObject({ bucket_grain: "week", is_array: true });
  });
});
```

If plans 1 to 3 added a column to `concept_attributes`, add it to `DB_ROW` with the value their tests use.

In plan 3's `DatasetColumnMappingParsers.test.ts`, add at module level and inside its `describe`:

```ts
const PER_MONTH_ROW = {
  bucket_column_id: "eeeeeeee-6666-4666-8666-eeeeeeeeeeee",
  concept_attribute_id: "cccccccc-3333-4333-8333-cccccccccccc",
  created_at: "2026-11-06T00:00:00+00:00",
  dataset_column_id: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
  dataset_id: "dddddddd-4444-4444-8444-dddddddddddd",
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  updated_at: "2026-11-06T00:00:00+00:00",
  value_picker_rule_type: "avg",
  workspace_id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
} as const;
```

```ts
  it("reads a mapping's date column from its row", () => {
    const mapping =
      DatasetColumnMappingParsers.fromDBReadToModelRead(PER_MONTH_ROW);

    expect(mapping.bucketColumnId).toBe(PER_MONTH_ROW.bucket_column_id);
  });

  it("sends a mapping's date column when the mapping is inserted", () => {
    const dbInsert = DatasetColumnMappingParsers.fromModelInsertToDBInsert({
      type: "dataset_column",
      workspaceId:
        PER_MONTH_ROW.workspace_id as DatasetColumnMapping["workspaceId"],
      conceptAttributeId:
        PER_MONTH_ROW.concept_attribute_id as DatasetColumnMapping["conceptAttributeId"],
      valuePickerRuleType: "avg",
      datasetId: PER_MONTH_ROW.dataset_id as DatasetColumnMapping["datasetId"],
      datasetColumnId:
        PER_MONTH_ROW.dataset_column_id as DatasetColumnMapping["datasetColumnId"],
      bucketColumnId:
        PER_MONTH_ROW.bucket_column_id as DatasetColumnMapping["datasetColumnId"],
    });

    expect(dbInsert).toMatchObject({
      bucket_column_id: PER_MONTH_ROW.bucket_column_id,
    });
  });
```

and add `import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";` if the file lacks it.

- [ ] **Step 4: Run them and watch them fail**

Run: `pnpm test:frontend ConceptAttributeParsers DatasetColumnMappingParsers`
Expected: FAIL, the four new tests. The read tests get `undefined` (Zod strips the unknown key); the insert tests get a payload without the key (the registry picks it out).

- [ ] **Step 5: Type the field's period**

In `ConceptAttribute.types.ts`, add `import type { Enums } from "$/types/database.types.ts";` and:

```ts
/**
 * The period a per-period field keeps one value for. Mirrors the
 * `concept_attributes__bucket_grain` database enum.
 */
export type ConceptAttributeBucketGrain =
  Enums<"concept_attributes__bucket_grain">;
```

In `ConceptAttributeRead`, after `isArray: boolean;`:

```ts
    /**
     * Set only on a per-period field: its value is one entry per period of
     * the mapping's date column. Always `undefined` when `isArray` is false.
     */
    bucketGrain: ConceptAttributeBucketGrain | undefined;
```

and make it optional on insert:

```ts
type ConceptAttributeInsert = SetOptional<
  ConceptAttributeRead,
  "id" | "createdAt" | "updatedAt" | "description" | "bucketGrain"
>;
```

In `ConceptAttribute.ts`, import `ConceptAttributeBucketGrain` with the other types and add to the namespace:

```ts
  export type BucketGrain = ConceptAttributeBucketGrain;
```

- [ ] **Step 6: List the periods in the module**

In `ConceptAttributeModule.ts`, add `import { registry } from "@avandar/utils";`, add `ConceptAttributeBucketGrain` to the type import from `ConceptAttribute.types.ts`, and add this member to `ConceptAttributeModule`:

```ts
  /**
   * Every period a per-period field can keep one value for, in the database
   * enum's order. Read by the model's parser, the chat parser and tool
   * schema, and the pickers that offer a period.
   */
  BUCKET_GRAINS: registry<ConceptAttributeBucketGrain>().keys(
    "day",
    "week",
    "month",
    "quarter",
    "year",
  ),
```

`registry` fails to compile if the enum gains a value this list lacks.

- [ ] **Step 7: Parse the field's period**

In `ConceptAttributeParsers.ts`, add `import { ConceptAttributeModule } from "$/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts";` and, in `DBReadSchema`:

```ts
  bucket_grain: z.enum(ConceptAttributeModule.BUCKET_GRAINS).nullable(),
```

`fromModelInsertToDBInsert` needs no change: `undefinedsToNullsDeep` then `excludeNullsExceptInProps("description")` drops an absent period, and the RPC reads a missing key as NULL.

- [ ] **Step 8: Type the mapping's date column**

In `DatasetColumnMapping.types.ts`, add to `DatasetColumnMappingRead`, after `datasetColumnId`:

```ts
  /**
   * The date or timestamp column of `datasetId` that places each row in a
   * period. Set exactly when the field has a `bucketGrain`.
   */
  bucketColumnId: DatasetColumnId | undefined;
```

and add `"bucketColumnId"` to the keys `DatasetColumnMappingInsert` makes optional.

- [ ] **Step 9: Parse the mapping's date column**

In `DatasetColumnMappingParsers.ts`, add to `DBReadSchema`:

```ts
  bucket_column_id: z.uuid().nullable(),
```

and in `fromDBReadToModelRead`, beside `datasetColumnId`:

```ts
          bucketColumnId: obj.bucketColumnId as DatasetColumnId | undefined,
```

- [ ] **Step 10: Fix the fixtures the compiler names**

Run: `pnpm type-check`
Expected: errors only where a test or fixture builds a full `ConceptAttribute.T` (`Read`) or `DatasetColumnMapping` without the new keys, for example `_attribute` and `_mapping` in `conceptAttributeColumns.integration.executed.test.ts`, `_fieldColumn` in `QueryColumn.test.ts`, and the row fixtures of `makeCaseDetailsRowsFromAttributes.test.ts`. Add `bucketGrain: undefined` to each attribute and `bucketColumnId: undefined` to each mapping. Leave `Insert`-typed objects alone: both keys are optional there. Repeat until `pnpm type-check` is clean.

- [ ] **Step 11: Run the tests and the checks**

```bash
pnpm test:frontend shared/models/ontology
pnpm type-check
```

Expected: PASS, and no type errors.

- [ ] **Step 12: Commit**

```bash
pnpm format
git add shared/types/database.types.ts apps/desktop/migrations shared/models/ontology
git commit -m "feat(joined-cases): carry a field's period and date column through the models"
```

Add by path every fixture file Step 10 touched.

---

## Task 4: Reading a date column type and a per-period value

**Files:**
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts`, `ConceptAttribute.types.ts`, `ConceptAttribute.ts`
- Test: `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.test.ts`

Two pure functions every later task uses: which columns can place rows in a period, and how to read the value DuckDB returns.

- [ ] **Step 1: Write the failing tests**

Add to `ConceptAttributeModule.test.ts` (keep its existing imports; add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";` and `import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";` if absent):

```ts
describe("isBucketDateColumnType", () => {
  it("accepts date and timestamp columns and refuses a time of day", () => {
    const dataTypes: AvaDataType.T[] = [
      "date",
      "timestamp",
      "time",
      "varchar",
      "bigint",
    ];

    expect(
      dataTypes.map((dataType) => {
        return ConceptAttribute.isBucketDateColumnType(dataType);
      }),
    ).toEqual([true, true, false, false, false]);
  });
});

describe("toBucketedListEntries", () => {
  // A DuckDB DATE reaches the browser as epoch milliseconds at UTC midnight.
  it("reads epoch milliseconds as the UTC calendar date", () => {
    expect(
      ConceptAttribute.toBucketedListEntries([
        { bucket: Date.UTC(2026, 0, 1), value: 38.5 },
      ]),
    ).toEqual([{ bucket: "2026-01-01", value: 38.5 }]);
  });

  it("reads a Date bucket and keeps a YYYY-MM-DD bucket as it is", () => {
    expect(
      ConceptAttribute.toBucketedListEntries([
        { bucket: new Date(Date.UTC(2026, 1, 1)), value: 1 },
        { bucket: "2026-03-01", value: 2 },
      ]),
    ).toEqual([
      { bucket: "2026-02-01", value: 1 },
      { bucket: "2026-03-01", value: 2 },
    ]);
  });

  it("keeps each value untouched, NULL included", () => {
    expect(
      ConceptAttribute.toBucketedListEntries([
        { bucket: "2026-01-01", value: null },
        { bucket: "2026-02-01", value: "East" },
      ]),
    ).toEqual([
      { bucket: "2026-01-01", value: null },
      { bucket: "2026-02-01", value: "East" },
    ]);
  });

  it("reads an empty list as no periods", () => {
    expect(ConceptAttribute.toBucketedListEntries([])).toEqual([]);
  });

  it.each([
    ["no value", null],
    ["text", "2026-01-01"],
    ["a list of numbers", [1, 2]],
    ["an entry without a value", [{ bucket: "2026-01-01" }]],
    ["an entry with an extra key", [{ bucket: "2026-01-01", value: 1, n: 2 }]],
    ["a bucket that is not a date", [{ bucket: "January", value: 1 }]],
  ])("refuses %s", (_label, value) => {
    expect(ConceptAttribute.toBucketedListEntries(value)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend ConceptAttributeModule`
Expected: FAIL, `ConceptAttribute.isBucketDateColumnType is not a function` and `ConceptAttribute.toBucketedListEntries is not a function`.

- [ ] **Step 3: Type one entry**

In `ConceptAttribute.types.ts`, add:

```ts
/**
 * One period of a per-period field's value, as a reader displays it.
 * `bucket` is the period's first day as `YYYY-MM-DD`; `value` is the field's
 * rule applied to that period's rows.
 */
export type ConceptAttributeBucketedListEntry = {
  bucket: string;
  value: unknown;
};
```

and in `ConceptAttribute.ts` add `export type BucketedListEntry = ConceptAttributeBucketedListEntry;` to the namespace, importing the type.

- [ ] **Step 4: Implement both functions**

In `ConceptAttributeModule.ts`, add `isDefined` to the `@avandar/utils` import, import `ConceptAttributeBucketedListEntry` with the other types and `AvaDataType` as a type, and add above the module object:

```ts
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A period's first day as `YYYY-MM-DD`, read in UTC, or `undefined` for a
 * value that is not a date. A DuckDB `DATE` reaches the browser as epoch
 * milliseconds at UTC midnight, so reading it in local time would move it a
 * day back for anyone west of UTC.
 */
function _toBucketDate(bucket: unknown): string | undefined {
  if (typeof bucket === "string") {
    return ISO_DATE_PATTERN.test(bucket) ? bucket : undefined;
  }
  const epochMs =
    bucket instanceof Date
      ? bucket.getTime()
      : typeof bucket === "number"
        ? bucket
        : Number.NaN;
  return Number.isFinite(epochMs)
    ? new Date(epochMs).toISOString().slice(0, 10)
    : undefined;
}

/** One `{ bucket, value }` struct, or `undefined` for anything else. */
function _toBucketedListEntry(
  item: unknown,
): ConceptAttributeBucketedListEntry | undefined {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return undefined;
  }
  if (
    Object.keys(item).length !== 2 ||
    !("bucket" in item) ||
    !("value" in item)
  ) {
    return undefined;
  }
  const bucket = _toBucketDate(item.bucket);
  return bucket === undefined ? undefined : { bucket, value: item.value };
}
```

and these members on the module object:

```ts
  /**
   * Whether a dataset column of this type can place rows in a period. Used
   * by the pickers that offer a date column and by the concept view's column
   * resolution. A `time` column has no calendar date, so it is refused, even
   * though `AvaDataType.isDateOrTimestamp` accepts it.
   */
  isBucketDateColumnType: (dataType: AvaDataType.T): boolean => {
    return dataType === "date" || dataType === "timestamp";
  },

  /**
   * Reads a per-period field's value as a reader received it from DuckDB:
   * a list of `{ bucket, value }` structs. Returns the entries in the order
   * given (the view orders them by period), or `undefined` for a value of
   * any other shape, so a caller can fall back to plain text. For example,
   * the record page renders the entries as a table, and the Data Explorer
   * grid as one line of text.
   */
  toBucketedListEntries: (
    value: unknown,
  ): ConceptAttributeBucketedListEntry[] | undefined => {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const entries = value.map(_toBucketedListEntry);
    return entries.every(isDefined) ? entries : undefined;
  },
```

- [ ] **Step 5: Run them and watch them pass**

Run: `pnpm test:frontend ConceptAttributeModule`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add shared/models/ontology/ConceptAttribute
git commit -m "feat(joined-cases): read per-period values and date column types"
```

---

## Task 5: Decimals inside a map or union keep their scale

**Files:**
- Modify: `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.ts`
- Test: `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.test.ts`

A per-period value reaches the browser as a list of `STRUCT(bucket, value)`, and Task 4's `toBucketedListEntries` reads each `value` exactly as `arrowTableToJS` hands it over. `arrowTableToJS` already applies a DECIMAL's scale at the top level, inside a list, and inside a struct: plan 1 made struct items inside lists convert field by field, plan 2 applied the scale, and plan 3's Task 7 (list cells) turns a list's dates into ISO strings on the same path. Two containers still lose the scale:

- **A map.** `_toJsValueFromArrowValue` treats an `arrow.MapRow` like a struct and looks each key up among `dataType.children`. A map's only child is its `entries` struct (`key`, `value`), so no key is ever found and `MAP {'a': 2.25}` reads `{ a: 225 }`.
- **A union.** A union cell arrives as its member's value alone, and the union's type is passed down in place of the member's, so a `DECIMAL(4,2)` member reads `225`.

Neither shape is a per-period value, but chat SQL and the Data Explorer return whatever DuckDB computes, and this task closes the reader before the per-period work builds on it. Nothing in Tasks 1 to 4 changes.

- [ ] **Step 1: Write the failing tests**

In `duckDbArrowResults.test.ts`, add these two builders below `createDecimalTable`:

```ts
/** `DECIMAL(4,2)`, the type of every decimal these tests store. */
const PRICE_TYPE = new arrow.Decimal(2, 4, 128);

/**
 * Builds a one-row column holding `MAP {'a': 2.25, 'b': 0.05}`, as DuckDB
 * exports a `MAP(VARCHAR, DECIMAL(4,2))`: one `entries` struct of `key` and
 * `value`.
 */
function createPriceMapColumn(): arrow.Vector {
  const entriesType = new arrow.Struct([
    new arrow.Field("key", new arrow.Utf8(), false),
    new arrow.Field("value", PRICE_TYPE, true),
  ]);
  const keys = arrow.makeData({
    type: new arrow.Utf8(),
    length: 2,
    nullCount: 0,
    valueOffsets: new Int32Array([0, 1, 2]),
    data: new TextEncoder().encode("ab"),
  });
  const values = arrow.makeData({
    type: PRICE_TYPE,
    length: 2,
    nullCount: 0,
    data: new Uint32Array([225, 0, 0, 0, 5, 0, 0, 0]),
  });
  const entries = arrow.makeData({
    type: entriesType,
    length: 2,
    nullCount: 0,
    children: [keys, values],
  });
  return arrow.makeVector(
    arrow.makeData({
      type: new arrow.Map_(new arrow.Field("entries", entriesType, false)),
      length: 1,
      nullCount: 0,
      valueOffsets: new Int32Array([0, 2]),
      child: entries,
    }),
  );
}

/**
 * Builds a two-row column of `UNION(amount DECIMAL(4,2), note VARCHAR)`, as
 * DuckDB exports a union: a sparse union whose first row is the amount 2.25
 * and whose second is the note `pending`.
 */
function createAmountOrNoteColumn(): arrow.Vector {
  const amounts = arrow.makeData({
    type: PRICE_TYPE,
    length: 2,
    nullCount: 0,
    data: new Uint32Array([225, 0, 0, 0, 0, 0, 0, 0]),
  });
  const notes = arrow.makeData({
    type: new arrow.Utf8(),
    length: 2,
    nullCount: 0,
    valueOffsets: new Int32Array([0, 0, 7]),
    data: new TextEncoder().encode("pending"),
  });
  return arrow.makeVector(
    arrow.makeData({
      type: new arrow.SparseUnion(
        [0, 1],
        [
          new arrow.Field("amount", PRICE_TYPE, true),
          new arrow.Field("note", new arrow.Utf8(), true),
        ],
      ),
      length: 2,
      nullCount: 0,
      typeIds: new Int8Array([0, 1]),
      children: [amounts, notes],
    }),
  );
}
```

and these tests inside `describe("arrowTableToJS", ...)`:

```ts
  it("returns the decimals in a map with their scale applied", () => {
    const prices = createPriceMapColumn();

    expect(
      arrowTableToJS(createTableFromColumn("prices", prices)).data,
    ).toEqual([{ prices: { a: 2.25, b: 0.05 } }]);
  });

  it("returns the decimals in a map inside a list with their scale applied", () => {
    const prices = createPriceMapColumn();
    const priceLists = arrow.makeVector(
      arrow.makeData({
        type: new arrow.List(new arrow.Field("item", prices.type, true)),
        length: 1,
        nullCount: 0,
        valueOffsets: new Int32Array([0, 1]),
        child: prices.data[0]!,
      }),
    );

    expect(
      arrowTableToJS(createTableFromColumn("priceLists", priceLists)).data,
    ).toEqual([{ priceLists: [{ a: 2.25, b: 0.05 }] }]);
  });

  it("returns a union's decimal member with its scale applied and its other members as they are", () => {
    const amountOrNote = createAmountOrNoteColumn();

    expect(
      arrowTableToJS(createTableFromColumn("amountOrNote", amountOrNote)).data,
    ).toEqual([{ amountOrNote: 2.25 }, { amountOrNote: "pending" }]);
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend duckDbArrowResults`
Expected: FAIL. The map tests receive `{ a: 225, b: 5 }`, and the union test receives `225` for its first row. Every earlier test in the file still passes.

- [ ] **Step 3: Read a map's values and a union's member by their own types**

In `duckDbArrowResults.ts`, add below `_getDecimalScale`:

```ts
/**
 * Whether a value is a decimal as Arrow hands it over: a big number object
 * holding the unscaled integer.
 */
function _isBigNum(value: unknown): value is object {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const constructorName = (value as { constructor?: { name?: string } })
    .constructor?.name;
  return constructorName === "DecimalBigNum" || constructorName === "BigNum";
}

/**
 * Whether a union member of `memberType` can have produced `value`. A union
 * cell arrives as its member's value with no tag, so the member is told by
 * the value's kind: a list for a vector, a map for a map row, a struct for a
 * struct row, and a decimal for a big number.
 */
function _isUnionMemberOfValue(
  options: Readonly<{ memberType: arrow.DataType; value: unknown }>,
): boolean {
  const { memberType, value } = options;
  if (value instanceof arrow.Vector) {
    return memberType instanceof arrow.List;
  }
  if (value instanceof arrow.MapRow) {
    return memberType instanceof arrow.Map_;
  }
  if (value instanceof arrow.StructRow) {
    return memberType instanceof arrow.Struct;
  }
  return _isBigNum(value) && memberType instanceof arrow.Decimal;
}

/**
 * The type of the union member a value came from, or `undefined` when no
 * member or more than one member of its kind could have produced it. Two
 * decimal members are told apart only by the row's type id, which a cell
 * does not carry, so such a value reads as it arrives.
 */
function _getUnionMemberType(
  options: Readonly<{ unionType: arrow.Union; value: unknown }>,
): arrow.DataType | undefined {
  const memberTypes = options.unionType.children
    .map((field) => {
      return field.type;
    })
    .filter((memberType) => {
      return _isUnionMemberOfValue({ memberType, value: options.value });
    });
  return memberTypes.length === 1 ? memberTypes[0] : undefined;
}

/**
 * Converts every entry of a map cell. All of a map's values share one type,
 * held by the `value` field of its `entries` struct rather than by a field
 * named for each key.
 */
function _toJsObjectFromMapRow(
  options: Readonly<{ mapRow: arrow.MapRow; dataType?: arrow.DataType }>,
): Record<string, unknown> {
  const valueType =
    options.dataType instanceof arrow.Map_
      ? options.dataType.valueType
      : undefined;
  return Object.fromEntries(
    Object.entries(options.mapRow.toJSON()).map(([key, entryValue]) => {
      return [key, _toJsValueFromArrowValue(entryValue, valueType)];
    }),
  );
}
```

Then in `_toJsValueFromArrowValue`:

1. Add as the first statement of the body:

   ```ts
   if (dataType instanceof arrow.Union) {
     // A union cell is its member's value, so it converts as that member.
     return _toJsValueFromArrowValue(
       value,
       _getUnionMemberType({ unionType: dataType, value }),
     );
   }
   ```

2. Replace the branch that starts `if (value instanceof arrow.StructRow || value instanceof arrow.MapRow) {` with a map branch followed by a struct-only branch:

   ```ts
   if (value instanceof arrow.MapRow) {
     return _toJsObjectFromMapRow({ mapRow: value, dataType });
   }
   if (value instanceof arrow.StructRow) {
   ```

   and keep the struct branch's body as it is.

3. Replace the decimal guard from `if (value === null || typeof value !== "object") {` down to its `return value;` after the `constructorName` check with:

   ```ts
   if (!_isBigNum(value)) {
     return value;
   }
   ```

   keeping everything below it (the scale and the `valueOf` fallback) unchanged.

Read the function once more after the edit: it should be under 45 lines (`CLAUDE.md`). If the edit pushes it over, move the struct branch into a `_toJsObjectFromStructRow` helper shaped like `_toJsObjectFromMapRow`.

- [ ] **Step 4: Run them and watch them pass**

Run: `pnpm test:frontend duckDbArrowResults DuckDbClient`
Expected: PASS, the three new tests and every list, struct, and decimal test before them.

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add src/clients/DuckDbClient/duckDbArrowResults
git commit -m "fix(joined-cases): keep the scale of decimals inside a map or union"
```

---

## Task 6: The per-period value SQL

**Files:**
- Create: `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql.ts`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql.executed.test.ts`

Every expected value below was produced by running this exact SQL against `@duckdb/node-api` 1.5.5 while writing this plan, and each one matches the single-value rule's semantics applied to that month's rows by hand.

- [ ] **Step 1: Write the failing test**

Create `buildBucketedListValueSql.executed.test.ts`:

```ts
/**
 * Executed tests for the per-period value SQL.
 *
 * Each case runs the emitted subquery against a real DuckDB over real parquet
 * and asserts the lists it returns, because every property this SQL owes (the
 * NULL rule, the tie-breaks, where each period starts, the order) is a
 * property of returned values. A test of the SQL text would pass with the
 * wrong answer.
 *
 * The visits fixture ties on purpose, and holds a NULL value, a NULL date, a
 * month whose only cells are NULL, and a month whose row sits last in the file
 * but is earliest by date. Each rule's expected months were derived by hand
 * from the single-value rule applied to that month's rows.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import {
  buildBucketedListTypeSql,
  buildBucketedListValueSql,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { BucketedListValueSqlOptions } from "@/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql";
import type { DuckDBConnection } from "@duckdb/node-api";

const VISITS = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const READINGS = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const SPINE = "concept_cccccccc-3333-4333-8333-cccccccccccc__individuals";

/** Monthly `first` of the score; each test overrides what it needs. */
const SCORE_PER_MONTH: BucketedListValueSqlOptions = {
  datasetId: VISITS,
  selectColumnName: "score",
  primaryKeyColumnName: "person_id",
  // The space proves the date column is quoted.
  bucketColumnName: "Visit date",
  bucketGrain: "month",
  ruleType: "first",
  externalIdsTable: "individuals",
  externalIdColumn: "external_id",
};

/** The months `p1` has a non-NULL score in, in date order. */
const SCORE_MONTHS = ["2025-12-01", "2026-01-01", "2026-02-01", "2026-04-01"];

type Period = { bucket: string; value: unknown };

/**
 * Builds the fixture world. File order matters: `row_order` is a row's
 * position here.
 *
 * Visits, by month for `p1`:
 * - 2025-12: one row (1, North), written last but one.
 * - 2026-01: 10 South, 20 North, NULL North, 30 South, then 50 East written
 *   last though dated 2026-01-01. Regions tie at two each.
 * - 2026-02: a NULL row first, then 7 East.
 * - 2026-03: only NULL cells.
 * - 2026-04: 5 West, then 6 and 8 with NULL regions.
 * - A row with no date (99 West).
 * `p2` has one row whose cells are all NULL; `p3` has no rows.
 *
 * Readings are four instants around a year end, with a Sunday, for checking
 * where each period starts on a `TIMESTAMP` and on a `DATE` column.
 */
async function _seed(connection: DuckDBConnection): Promise<void> {
  const visitsPath = join(tmpdir(), "ava-bucketed-visits.parquet");
  const readingsPath = join(tmpdir(), "ava-bucketed-readings.parquet");

  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', DATE '2026-01-05', 10, 'South'),
        ('p1', DATE '2026-01-20', 20, 'North'),
        ('p1', DATE '2026-01-25', NULL, 'North'),
        ('p1', DATE '2026-01-28', 30, 'South'),
        ('p1', DATE '2026-02-03', NULL, NULL),
        ('p1', DATE '2026-02-10', 7, 'East'),
        ('p1', NULL, 99, 'West'),
        ('p1', DATE '2026-03-15', NULL, NULL),
        ('p1', DATE '2026-04-01', 5, 'West'),
        ('p1', DATE '2026-04-02', 6, NULL),
        ('p1', DATE '2026-04-03', 8, NULL),
        ('p1', DATE '2025-12-31', 1, 'North'),
        ('p1', DATE '2026-01-01', 50, 'East'),
        ('p2', DATE '2026-01-10', NULL, NULL)
      ) AS t(person_id, "Visit date", score, region)
    ) TO '${visitsPath}' (FORMAT parquet)
  `);
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', TIMESTAMP '2026-01-04 23:59:59', DATE '2026-01-04', 1),
        ('p1', TIMESTAMP '2026-01-07 10:00:00', DATE '2026-01-07', 1),
        ('p1', TIMESTAMP '2026-05-20 08:00:00', DATE '2026-05-20', 1),
        ('p1', TIMESTAMP '2025-12-31 23:00:00', DATE '2025-12-31', 1)
      ) AS t(person_id, read_at, read_on, reading)
    ) TO '${readingsPath}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${getRowNumberedViewName(VISITS)}" AS
      SELECT * FROM read_parquet('${visitsPath}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(READINGS)}" AS
      SELECT * FROM read_parquet('${readingsPath}', file_row_number = true);
    CREATE TABLE "${SPINE}" AS
      SELECT * FROM (VALUES ('p1'), ('p2'), ('p3')) AS t(external_id);
  `);
}

/**
 * Each record's periods for one field. `to_json` renders a `DATE` as
 * `YYYY-MM-DD` and a `BIGINT` as a number, so the lists compare as plain
 * JSON.
 */
async function _readPeriods(
  overrides: Partial<BucketedListValueSqlOptions> = {},
): Promise<Record<string, Period[]>> {
  const fieldSql = buildBucketedListValueSql({
    ...SCORE_PER_MONTH,
    ...overrides,
  });
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    const reader = await connection.runAndReadAll(`
      SELECT
        individuals.external_id AS external_id,
        CAST(to_json(${fieldSql}) AS VARCHAR) AS field_json
      FROM "${SPINE}" individuals
      ORDER BY external_id
    `);
    return Object.fromEntries(
      reader.getRowObjectsJson().map((row) => {
        return [
          String(row.external_id),
          JSON.parse(String(row.field_json)) as Period[],
        ];
      }),
    );
  });
}

/** Pairs each of `buckets` with the value at the same position. */
function _periods(
  values: readonly unknown[],
  buckets: readonly string[] = SCORE_MONTHS,
): Period[] {
  return buckets.map((bucket, index) => {
    return { bucket, value: values[index] };
  });
}

/** The DuckDB type of each named field, as `DESCRIBE` reports it. */
async function _describeFields(
  fields: Readonly<Record<string, Partial<BucketedListValueSqlOptions>>>,
): Promise<Record<string, string>> {
  const selectors = Object.entries(fields).map(([name, overrides]) => {
    return `${buildBucketedListValueSql({ ...SCORE_PER_MONTH, ...overrides })} AS "${name}"`;
  });
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    await connection.run(`
      CREATE VIEW field_types AS
      SELECT ${selectors.join(",\n")}
      FROM "${SPINE}" individuals
    `);
    const reader = await connection.runAndReadAll("DESCRIBE field_types");
    return Object.fromEntries(
      reader.getRowObjectsJson().map((row) => {
        return [String(row.column_name), String(row.column_type)];
      }),
    );
  });
}

describe("buildBucketedListValueSql", () => {
  it.each([
    { ruleType: "first", values: [1, 10, 7, 5] },
    { ruleType: "sum", values: [1, 110, 7, 19] },
    { ruleType: "avg", values: [1, 27.5, 7, 6.333333333333333] },
    { ruleType: "count", values: [1, 4, 1, 3] },
    { ruleType: "max", values: [1, 50, 7, 8] },
    { ruleType: "min", values: [1, 10, 7, 5] },
    { ruleType: "most_frequent", values: [1, 10, 7, 5] },
  ] as const)(
    "gives the $ruleType of each month's non-NULL scores",
    async ({ ruleType, values }) => {
      const periods = await _readPeriods({ ruleType });

      expect(periods.p1).toEqual(_periods(values));
    },
  );

  // January's earliest date holds 50, but it is the last row in the file.
  // February's first row is NULL.
  it("keeps the first non-NULL value in file order, not the earliest date", async () => {
    const periods = await _readPeriods({ ruleType: "first" });

    expect(periods.p1?.[1]).toEqual({ bucket: "2026-01-01", value: 10 });
    expect(periods.p1?.[2]).toEqual({ bucket: "2026-02-01", value: 7 });
  });

  // January has South twice and North twice, South first in the file.
  it("breaks a most frequent tie within a month by value, not by file order", async () => {
    const periods = await _readPeriods({
      ruleType: "most_frequent",
      selectColumnName: "region",
    });

    expect(periods.p1?.[1]).toEqual({ bucket: "2026-01-01", value: "North" });
  });

  // April's regions are West, NULL, NULL.
  it("never picks NULL as a month's most frequent value", async () => {
    const periods = await _readPeriods({
      ruleType: "most_frequent",
      selectColumnName: "region",
    });

    expect(periods.p1?.[3]).toEqual({ bucket: "2026-04-01", value: "West" });
  });

  it("keeps text in its own type for max and min", async () => {
    const [maxPeriods, minPeriods] = await Promise.all([
      _readPeriods({ ruleType: "max", selectColumnName: "region" }),
      _readPeriods({ ruleType: "min", selectColumnName: "region" }),
    ]);

    expect(maxPeriods.p1).toEqual(
      _periods(["North", "South", "East", "West"]),
    );
    expect(minPeriods.p1).toEqual(_periods(["North", "East", "East", "West"]));
  });

  it("drops a row with no date instead of giving it a period", async () => {
    const periods = await _readPeriods({ ruleType: "max" });

    const buckets = (periods.p1 ?? []).map((period) => {
      return period.bucket;
    });
    expect(buckets).not.toContain(null);
    expect(
      (periods.p1 ?? []).map((period) => {
        return period.value;
      }),
    ).not.toContain(99);
  });

  it("leaves out a month whose only values are NULL", async () => {
    const periods = await _readPeriods({ ruleType: "count" });

    expect(
      (periods.p1 ?? []).map((period) => {
        return period.bucket;
      }),
    ).toEqual(SCORE_MONTHS);
  });

  it("orders months by date even when the earliest month is written last", async () => {
    const periods = await _readPeriods({ ruleType: "first" });

    expect(periods.p1?.[0]).toEqual({ bucket: "2025-12-01", value: 1 });
  });

  it("gives an empty list to a record with only NULL values and to one with no rows", async () => {
    const periods = await _readPeriods({ ruleType: "avg" });

    expect(periods.p2).toEqual([]);
    expect(periods.p3).toEqual([]);
  });

  // 2026-01-04 is a Sunday, so it belongs to the ISO week of 2025-12-29.
  // Quarters start in January, April, July, and October.
  it.each(
    (
      [
        ["day", ["2025-12-31", "2026-01-04", "2026-01-07", "2026-05-20"], [1, 1, 1, 1]],
        ["week", ["2025-12-29", "2026-01-05", "2026-05-18"], [2, 1, 1]],
        ["month", ["2025-12-01", "2026-01-01", "2026-05-01"], [1, 2, 1]],
        ["quarter", ["2025-10-01", "2026-01-01", "2026-04-01"], [1, 2, 1]],
        ["year", ["2025-01-01", "2026-01-01"], [1, 3]],
      ] as const
    ).flatMap(([bucketGrain, buckets, counts]) => {
      return [
        { bucketGrain, columnType: "TIMESTAMP", bucketColumnName: "read_at", buckets, counts },
        { bucketGrain, columnType: "DATE", bucketColumnName: "read_on", buckets, counts },
      ];
    }),
  )(
    "starts each $bucketGrain on its first day for a $columnType column",
    async ({ bucketGrain, bucketColumnName, buckets, counts }) => {
      const periods = await _readPeriods({
        datasetId: READINGS,
        selectColumnName: "reading",
        bucketColumnName,
        bucketGrain,
        ruleType: "count",
      });

      expect(periods.p1).toEqual(_periods(counts, buckets));
    },
  );

  it("types each field as a list of bucket and value structs", async () => {
    const types = await _describeFields({
      first: { ruleType: "first" },
      avg: { ruleType: "avg" },
      count: { ruleType: "count" },
      "max region": { ruleType: "max", selectColumnName: "region" },
    });

    expect(types).toEqual({
      first: 'STRUCT(bucket DATE, "value" INTEGER)[]',
      avg: 'STRUCT(bucket DATE, "value" DOUBLE)[]',
      count: 'STRUCT(bucket DATE, "value" BIGINT)[]',
      "max region": 'STRUCT(bucket DATE, "value" VARCHAR)[]',
    });
  });

  // One run proves nothing: the single-value `first` once returned four
  // different values in six runs.
  it("returns the same first and most frequent months across ten runs", async () => {
    const runs = [];
    for (let run = 0; run < 10; run += 1) {
      const [first, mostFrequent] = await Promise.all([
        _readPeriods({ ruleType: "first" }),
        _readPeriods({ ruleType: "most_frequent", selectColumnName: "region" }),
      ]);
      runs.push(JSON.stringify([first.p1, mostFrequent.p1]));
    }

    expect(new Set(runs).size).toBe(1);
  });
});

describe("buildBucketedListTypeSql", () => {
  it("casts NULL to the per-period list of a value type", async () => {
    const typeName = await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(
        `SELECT typeof(CAST(NULL AS ${buildBucketedListTypeSql("DOUBLE")})) AS type_name`,
      );
      return reader.getRowObjectsJson()[0]?.type_name;
    });

    expect(typeName).toBe('STRUCT(bucket DATE, "value" DOUBLE)[]');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write the builder**

Create `buildBucketedListValueSql.ts`:

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { match } from "ts-pattern";
import {
  getEntityKeyComparisonSql,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

type RuleType = DatasetColumnMapping["valuePickerRuleType"];

/** Everything one per-period field's value subquery reads. */
export type BucketedListValueSqlOptions = Readonly<{
  datasetId: string;
  /** The dataset column whose values are reduced per period. */
  selectColumnName: string;
  /** The dataset column holding the record key. */
  primaryKeyColumnName: string;
  /** The date or timestamp column that places each row in a period. */
  bucketColumnName: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  ruleType: RuleType;
  /** The outer table carrying the record keys, and its key column. */
  externalIdsTable: string;
  externalIdColumn: string;
}>;

/**
 * The DuckDB `date_trunc` part for each period. An exhaustive record, so a
 * period reaches SQL only as one of these five literals.
 */
const DATE_TRUNC_PART_BY_GRAIN: Readonly<
  Record<ConceptAttribute.BucketGrain, string>
> = {
  day: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

/**
 * Each rule but `most_frequent` as one aggregate over a period's rows. The
 * casts match the single-value rules: `sum` and `avg` are `DOUBLE`, `count` is
 * `BIGINT`, and the others keep the column's type.
 */
const AGGREGATE_SQL_BY_RULE: Readonly<
  Record<Exclude<RuleType, "most_frequent">, string>
> = {
  first: "first(source_rows.value ORDER BY source_rows.row_order)",
  sum: "CAST(SUM(source_rows.value) AS DOUBLE)",
  avg: "CAST(AVG(source_rows.value) AS DOUBLE)",
  count: "COUNT(source_rows.value)",
  max: "MAX(source_rows.value)",
  min: "MIN(source_rows.value)",
};

/**
 * One record's rows of the field's dataset as `bucket, value, row_order`.
 *
 * The NULL rule lives here and only here: a row whose value or date is NULL
 * never reaches a rule, so a period exists only when it has a non-NULL value.
 * `row_order` is `file_row_number`, a total order within a dataset, which is
 * what makes `first` deterministic.
 */
function _buildSourceRowsSql(options: BucketedListValueSqlOptions): string {
  const valueColumn = `dataset.${quoteSqlIdentifier(options.selectColumnName)}`;
  const bucketColumn = `dataset.${quoteSqlIdentifier(options.bucketColumnName)}`;
  const datePart = DATE_TRUNC_PART_BY_GRAIN[options.bucketGrain];
  const keyComparison = getEntityKeyComparisonSql({
    externalIdsTable: options.externalIdsTable,
    externalIdColumn: options.externalIdColumn,
    primaryKeyColumnName: options.primaryKeyColumnName,
  });
  return `SELECT
          CAST(date_trunc('${datePart}', ${bucketColumn}) AS DATE) AS bucket,
          ${valueColumn} AS value,
          dataset.file_row_number AS row_order
        FROM ${quoteSqlIdentifier(getRowNumberedViewName(options.datasetId))} dataset
        WHERE ${keyComparison}
          AND ${valueColumn} IS NOT NULL
          AND ${bucketColumn} IS NOT NULL`;
}

/**
 * One row per period, `bucket, value`, with the field's rule applied to the
 * period's rows. `most_frequent` counts each value first, then breaks a tie
 * in count by value, exactly as the single-value rule does.
 */
function _buildPerBucketValuesSql(
  options: Readonly<{ ruleType: RuleType; sourceRowsSql: string }>,
): string {
  const { sourceRowsSql } = options;
  return match(options.ruleType)
    .with("most_frequent", () => {
      return `SELECT
          counted.bucket AS bucket,
          first(counted.value ORDER BY counted.frequency DESC, counted.value) AS value
        FROM (
          SELECT
            source_rows.bucket AS bucket,
            source_rows.value AS value,
            COUNT(*) AS frequency
          FROM (${sourceRowsSql}) source_rows
          GROUP BY source_rows.bucket, source_rows.value
        ) counted
        GROUP BY counted.bucket`;
    })
    .with("first", "sum", "avg", "count", "max", "min", (ruleType) => {
      return `SELECT
          source_rows.bucket AS bucket,
          ${AGGREGATE_SQL_BY_RULE[ruleType]} AS value
        FROM (${sourceRowsSql}) source_rows
        GROUP BY source_rows.bucket`;
    })
    .exhaustive();
}

/**
 * Builds the correlated subquery that is one per-period field's value in the
 * concept view: a list of `{ bucket, value }`, one per period that has a
 * non-NULL value, ordered by period, and `[]` when there is none. `bucket` is
 * the period's first day (`date_trunc`, so weeks start on Monday).
 *
 * Returns the parenthesized subquery without an alias; the caller names the
 * column. The outer query must have the record keys in
 * `externalIdsTable.externalIdColumn`, as the concept view's spine does.
 */
export function buildBucketedListValueSql(
  options: BucketedListValueSqlOptions,
): string {
  const perBucketSql = _buildPerBucketValuesSql({
    ruleType: options.ruleType,
    sourceRowsSql: _buildSourceRowsSql(options),
  });
  return `(
        SELECT COALESCE(
          list(
            struct_pack(bucket := per_bucket.bucket, value := per_bucket.value)
            ORDER BY per_bucket.bucket
          ),
          []
        )
        FROM (${perBucketSql}) per_bucket
      )`;
}

/**
 * The DuckDB type of a per-period field whose values have `valueType`, for
 * casting a NULL when the field has nothing to read. For example, the
 * concept view's typed NULL column for an unmapped per-period field.
 */
export function buildBucketedListTypeSql(valueType: DuckDbDataType): string {
  return `STRUCT("bucket" DATE, "value" ${valueType})[]`;
}
```

Plan 1 made `getEntityKeyComparisonSql` quote its identifiers with `quoteSqlIdentifier`, so the call above needs nothing more.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql`
Expected: PASS, 28 tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql
git commit -m "feat(joined-cases): compute a per-period field's values in DuckDB"
```

---

## Task 7: Period names and period labels

**Files:**
- Create: `src/components/caseFields/useBucketGrainLabels/useBucketGrainLabels.ts`
- Create: `src/components/caseFields/useBucketPeriodFormatter/useBucketPeriodFormatter.ts`
- Test: `src/components/caseFields/useBucketPeriodFormatter/useBucketPeriodFormatter.test.ts`

Two hooks every per-period surface shares. A period's first day arrives as UTC midnight (Task 4 reads it as `YYYY-MM-DD`), so every label is formatted in UTC: formatting it in the viewer's zone shows the previous day, and so the previous month, for anyone west of UTC.

- [ ] **Step 1: Write the failing test**

Create `useBucketPeriodFormatter.test.ts`:

```ts
/**
 * A period is labelled for its length in the reader's language, and always
 * as the calendar day it starts on, whatever the reader's time zone.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useBucketPeriodFormatter } from "@/components/caseFields/useBucketPeriodFormatter/useBucketPeriodFormatter";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

function _label(
  bucketGrain: ConceptAttribute.BucketGrain,
  bucket: string,
): string {
  const { result } = renderHook(
    () => {
      return useBucketPeriodFormatter(bucketGrain);
    },
    { wrapper: TestProviders },
  );
  return result.current(bucket);
}

describe("useBucketPeriodFormatter", () => {
  const originalTimezone = process.env.TZ;

  beforeAll(() => {
    // West of UTC is where a UTC-midnight date slips to the day before.
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTimezone;
  });

  it.each([
    ["day", "2026-01-05", "Jan 5, 2026"],
    ["week", "2026-01-05", "Week of Jan 5, 2026"],
    ["month", "2026-01-01", "Jan 2026"],
    ["quarter", "2026-04-01", "Q2 2026"],
    ["year", "2026-01-01", "2026"],
  ] as const)(
    "labels a %s that starts on %s as %s",
    (bucketGrain, bucket, label) => {
      expect(_label(bucketGrain, bucket)).toBe(label);
    },
  );
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend useBucketPeriodFormatter`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write the period names**

Create `useBucketGrainLabels.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** How one period reads in the interface. */
export type BucketGrainLabels = {
  /** The period as a noun heading a column of periods, such as "Month". */
  period: string;
  /** The period as a choice or a badge, such as "Per month". */
  perPeriod: string;
};

/**
 * The translated names of every period a per-period field can keep one value
 * for. Use it wherever a period is named, for example a picker's options or
 * a table's column heading.
 */
export function useBucketGrainLabels(): Readonly<
  Record<ConceptAttribute.BucketGrain, BucketGrainLabels>
> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      day: { period: t`Day`, perPeriod: t`Per day` },
      week: { period: t`Week`, perPeriod: t`Per week` },
      month: { period: t`Month`, perPeriod: t`Per month` },
      quarter: { period: t`Quarter`, perPeriod: t`Per quarter` },
      year: { period: t`Year`, perPeriod: t`Per year` },
    };
  }, [t]);
}
```

- [ ] **Step 4: Write the period labels**

Create `useBucketPeriodFormatter.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { match } from "ts-pattern";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

const DAY_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeZone: "UTC",
};
const MONTH_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
};
const YEAR_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  timeZone: "UTC",
};

/**
 * A function that labels a period by its first day (`YYYY-MM-DD`, as
 * `ConceptAttribute.toBucketedListEntries` returns it) for the given period
 * length, in the reader's locale: "Jan 5, 2026", "Week of Jan 5, 2026",
 * "Jan 2026", "Q1 2026", or "2026". Use it wherever a per-period value is
 * shown to a person, for example the record page's period table.
 */
export function useBucketPeriodFormatter(
  bucketGrain: ConceptAttribute.BucketGrain,
): (bucket: string) => string {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const dayFormat = new Intl.DateTimeFormat(i18n.locale, DAY_OPTIONS);
    const monthFormat = new Intl.DateTimeFormat(i18n.locale, MONTH_OPTIONS);
    const yearFormat = new Intl.DateTimeFormat(i18n.locale, YEAR_OPTIONS);
    return (bucket: string): string => {
      const firstDay = new Date(`${bucket}T00:00:00Z`);
      return match(bucketGrain)
        .with("day", () => {
          return dayFormat.format(firstDay);
        })
        .with("week", () => {
          const day = dayFormat.format(firstDay);
          return t`Week of ${day}`;
        })
        .with("month", () => {
          return monthFormat.format(firstDay);
        })
        .with("quarter", () => {
          const quarter = Math.floor(firstDay.getUTCMonth() / 3) + 1;
          const year = yearFormat.format(firstDay);
          return t`Q${quarter} ${year}`;
        })
        .with("year", () => {
          return yearFormat.format(firstDay);
        })
        .exhaustive();
    };
  }, [bucketGrain, i18n.locale, t]);
}
```

The week and quarter patterns are messages, so a translator can reorder them.

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm test:frontend useBucketPeriodFormatter`
Expected: PASS, five tests.

- [ ] **Step 6: Commit**

```bash
pnpm format
pnpm i18n:extract && pnpm i18n:compile
git add src/components/caseFields/useBucketGrainLabels src/components/caseFields/useBucketPeriodFormatter src/i18n/locales
git commit -m "feat(joined-cases): name and label periods in the reader's language"
```

---

## Task 8: The record page's period table

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/RecordFieldPeriodTable.tsx`
- Create: `.../RecordFieldPeriodTable/RecordFieldPeriodTable.module.css`
- Create: `.../RecordFieldPeriodTable/useBucketValueFormatter.ts` (wraps plan 3's `useFieldValueFormatter`)
- Test: `.../RecordFieldPeriodTable/RecordFieldPeriodTable.test.tsx`

This is a new surface: load the `impeccable` skill before Step 3, and read `docs/design/app-view-layout.md` ("The rail") and the Named Rules in `DESIGN.md`. The table lives in a rail fact (`AppViewRail.Fact`), whose value column is narrow; plan 3's `RecordFieldValueList` beside it is the closest precedent. Keep it a real table: a per-period value is two-dimensional, and a screen reader should announce the period and the value of each row.

- [ ] **Step 1: Write the failing tests**

Create `RecordFieldPeriodTable.test.tsx`:

```tsx
/**
 * A per-period field reads as a short table of its most recent periods, with
 * every period one step away, so a long history never pushes the record's
 * other facts out of the rail.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { RecordFieldPeriodTable } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/RecordFieldPeriodTable";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** Eight months of averages, January to August 2026. */
const EIGHT_MONTHS: ConceptAttribute.BucketedListEntry[] = [
  38.5, 37.9, 38.1, 38.0, 37.6, 37.4, 37.8, 38.456,
].map((value, index) => {
  return { bucket: `2026-0${index + 1}-01`, value };
});

/** The text of each body row, period then value. */
function _readRows(table: HTMLElement): string[][] {
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => {
      return Array.from(row.querySelectorAll("th, td"), (cell) => {
        return cell.textContent ?? "";
      });
    });
}

describe("RecordFieldPeriodTable", () => {
  const originalTimezone = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTimezone;
  });

  it("lists each month with its value under a caption naming the field and period", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS.slice(0, 2)}
      />,
    );

    const table = screen.getByRole("table", { name: "Temperature per month" });
    expect(
      within(table).getByRole("columnheader", { name: "Month" }),
    ).toBeInTheDocument();
    expect(_readRows(table)).toEqual([
      ["Jan 2026", "38.5"],
      ["Feb 2026", "37.9"],
    ]);
  });

  it("shows the six most recent months, oldest first, and offers the rest", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS}
      />,
    );

    const rows = _readRows(screen.getByRole("table"));
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual(["Mar 2026", "38.1"]);
    expect(rows[5]).toEqual(["Aug 2026", "38.46"]);
    expect(
      screen.getByRole("button", { name: "Show all 8 months" }),
    ).toBeInTheDocument();
  });

  it("opens every month when asked", async () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show all 8 months" }));

    const dialog = await screen.findByRole("dialog");
    expect(_readRows(within(dialog).getByRole("table"))).toHaveLength(8);
  });

  it("offers nothing more when every month already shows", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS.slice(0, 6)}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says so when the field has no values", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={[]}
      />,
    );

    expect(screen.getByText("No values")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // A DATE value arrives as UTC midnight, like the period itself.
  it("shows a date value as the day it holds, whatever the reader's zone", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="First visit"
        bucketGrain="week"
        valueDataType="date"
        entries={[{ bucket: "2026-01-05", value: Date.UTC(2026, 0, 7) }]}
      />,
    );

    expect(_readRows(screen.getByRole("table"))).toEqual([
      ["Week of Jan 5, 2026", "Jan 7, 2026"],
    ]);
  });

  // A TIME value arrives as microseconds since midnight.
  it("shows a time value as a time of day", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Usual visit time"
        bucketGrain="month"
        valueDataType="time"
        entries={[{ bucket: "2026-01-01", value: 52_200_000_000 }]}
      />,
    );

    expect(_readRows(screen.getByRole("table"))).toEqual([
      ["Jan 2026", "2:30 PM"],
    ]);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend RecordFieldPeriodTable`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write the value formatter**

Plan 3's Task 16 already formats a record page value by its field's `data_type`: `useFieldValueFormatter` in `src/components/caseFields/useFieldValueFormatter/useFieldValueFormatter.ts` (dates and timestamps in UTC, a time of day from its microseconds, booleans as `Yes` or `No`, numbers through `Intl.NumberFormat`). The period table reuses it rather than formatting dates a second way. The one difference spec §5.6 asks for is numbers: at most two fraction digits, because a period's value is usually an average. So this hook wraps the shared one and changes numbers only.

Create `useBucketValueFormatter.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useFieldValueFormatter } from "@/components/caseFields/useFieldValueFormatter/useFieldValueFormatter";

const NUMBER_OPTIONS: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };

/**
 * A function that formats one period's value for `RecordFieldPeriodTable`,
 * by the field's data type. Every type reads as it does elsewhere on the
 * record page, except that numbers keep at most two fraction digits: a
 * period's value is usually an average, and a long tail of digits makes the
 * column hard to scan.
 */
export function useBucketValueFormatter(
  valueDataType: AvaDataType.T,
): (value: unknown) => string {
  const { i18n } = useLingui();
  const formatFieldValue = useFieldValueFormatter(valueDataType);
  return useMemo(() => {
    if (!AvaDataType.isNumeric(valueDataType)) {
      return formatFieldValue;
    }
    const numberFormat = new Intl.NumberFormat(i18n.locale, NUMBER_OPTIONS);
    return (value: unknown): string => {
      return typeof value === "number"
        ? numberFormat.format(value)
        : formatFieldValue(value);
    };
  }, [formatFieldValue, i18n.locale, valueDataType]);
}
```

- [ ] **Step 4: Write the table**

Create `RecordFieldPeriodTable.tsx`. The structure below is the contract the tests hold; refine spacing and type with `impeccable`, keeping the roles, names, and counts.

```tsx
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { match } from "ts-pattern";
import { useBucketGrainLabels } from "@/components/caseFields/useBucketGrainLabels/useBucketGrainLabels";
import { useBucketPeriodFormatter } from "@/components/caseFields/useBucketPeriodFormatter/useBucketPeriodFormatter";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/RecordFieldPeriodTable.module.css";
import { useBucketValueFormatter } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/useBucketValueFormatter";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

/**
 * How many periods the rail shows before offering the rest. Six months is
 * half a year, and six rows stay shorter than the facts around them.
 */
const RECENT_PERIOD_COUNT = 6;

type Props = {
  /** The field's name, for the table's caption and the full list's title. */
  fieldName: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  /** The field's `data_type`: the type of each period's value. */
  valueDataType: AvaDataType.T;
  /** The periods, oldest first, as the concept view orders them. */
  entries: readonly ConceptAttribute.BucketedListEntry[];
};

type PeriodTableProps = {
  caption: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  valueDataType: AvaDataType.T;
  entries: readonly ConceptAttribute.BucketedListEntry[];
};

/** One table of periods and values, named by its caption. */
function PeriodTable({
  caption,
  bucketGrain,
  valueDataType,
  entries,
}: Readonly<PeriodTableProps>): ReactNode {
  const formatPeriod = useBucketPeriodFormatter(bucketGrain);
  const formatValue = useBucketValueFormatter(valueDataType);
  const periodHeading = useBucketGrainLabels()[bucketGrain].period;
  return (
    <table className={css.table}>
      <caption className={css.caption}>{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={css.periodHeading}>
            {periodHeading}
          </th>
          <th scope="col" className={css.valueHeading}>
            <Trans>Value</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          return (
            <tr key={entry.bucket}>
              <th scope="row" className={css.period}>
                {formatPeriod(entry.bucket)}
              </th>
              <td className={css.value}>{formatValue(entry.value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** "Show all N <periods>", pluralized for the period. */
function ShowAllLabel({
  bucketGrain,
  count,
}: Readonly<{
  bucketGrain: ConceptAttribute.BucketGrain;
  count: number;
}>): ReactNode {
  return match(bucketGrain)
    .with("day", () => {
      return <Plural value={count} one="Show # day" other="Show all # days" />;
    })
    .with("week", () => {
      return (
        <Plural value={count} one="Show # week" other="Show all # weeks" />
      );
    })
    .with("month", () => {
      return (
        <Plural value={count} one="Show # month" other="Show all # months" />
      );
    })
    .with("quarter", () => {
      return (
        <Plural
          value={count}
          one="Show # quarter"
          other="Show all # quarters"
        />
      );
    })
    .with("year", () => {
      return (
        <Plural value={count} one="Show # year" other="Show all # years" />
      );
    })
    .exhaustive();
}

/**
 * A per-period field's value on the record page: its most recent periods as
 * a table in the rail, and every period in a modal on request. Rendered by
 * `RecordFieldValue` for a field whose shape is `bucketed_list`.
 */
export function RecordFieldPeriodTable({
  fieldName,
  bucketGrain,
  valueDataType,
  entries,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [isFullListOpen, fullList] = useDisclosure(false);
  const caption = match(bucketGrain)
    .with("day", () => {
      return t`${fieldName} per day`;
    })
    .with("week", () => {
      return t`${fieldName} per week`;
    })
    .with("month", () => {
      return t`${fieldName} per month`;
    })
    .with("quarter", () => {
      return t`${fieldName} per quarter`;
    })
    .with("year", () => {
      return t`${fieldName} per year`;
    })
    .exhaustive();

  if (entries.length === 0) {
    return (
      <Text component="span" size="xs" c="dimmed">
        <Trans>No values</Trans>
      </Text>
    );
  }

  const recentEntries = entries.slice(-RECENT_PERIOD_COUNT);
  return (
    <>
      <PeriodTable
        caption={caption}
        bucketGrain={bucketGrain}
        valueDataType={valueDataType}
        entries={recentEntries}
      />
      {entries.length > recentEntries.length ? (
        <Button
          variant="subtle"
          color="neutral"
          size="compact-xs"
          className={css.showAll}
          onClick={fullList.open}
        >
          <ShowAllLabel bucketGrain={bucketGrain} count={entries.length} />
        </Button>
      ) : null}
      <Modal opened={isFullListOpen} onClose={fullList.close} title={caption}>
        <PeriodTable
          caption={caption}
          bucketGrain={bucketGrain}
          valueDataType={valueDataType}
          entries={entries}
        />
      </Modal>
    </>
  );
}
```

`No values` is plan 3's message for an empty list, reused so a reader sees one phrase for "this field has nothing".

Create `RecordFieldPeriodTable.module.css`:

```css
.table {
  border-collapse: collapse;
  font-size: var(--mantine-font-size-xs);
  line-height: 1.45;
  width: 100%;
}

/* Named for assistive technology, hidden on screen: the fact label names it */
.caption {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.periodHeading,
.valueHeading {
  border-bottom: 1px solid var(--ava-border-default);
  color: var(--mantine-color-neutral-6);
  font-weight: 500;
  padding-block-end: 2px;
}

.periodHeading,
.period {
  text-align: start;
}

.valueHeading,
.value {
  text-align: end;
}

.period,
.value {
  padding-block: 2px;
}

.period {
  color: var(--mantine-color-neutral-7);
  font-weight: 400;
}

.value {
  color: var(--mantine-color-neutral-9);
  font-variant-numeric: tabular-nums;
}

.showAll {
  margin-block-start: var(--mantine-spacing-xxs);
  padding-inline: 0;
}
```

- [ ] **Step 5: Run the tests and the design detector**

```bash
pnpm test:frontend RecordFieldPeriodTable
.claude/skills/impeccable/scripts/impeccable detect --json src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable
```

Expected: PASS, seven tests; the detector reports no findings (no `Paper` in the slate, no stock `gray`, token borders, no second accent). Fix any it reports.

- [ ] **Step 6: Commit**

```bash
pnpm format
pnpm i18n:extract && pnpm i18n:compile
git add src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable src/i18n/locales
git commit -m "feat(joined-cases): show a per-period field as a period and value table"
```

---

## Task 9: The period and date column controls

**Files:**
- Create: `src/components/caseFields/PeriodControls/PeriodControls.tsx`
- Test: `src/components/caseFields/PeriodControls/PeriodControls.test.tsx`

The draft card and the concept creator form both show these beside plan 3's `ValueShapeControl` once a field keeps a value per period.

- [ ] **Step 1: Write the failing tests**

Create `PeriodControls.test.tsx`:

```tsx
/**
 * A per-period field needs a period and a date column of its own dataset.
 * These pin what the two pickers offer and what they report.
 */
import { describe, expect, it, vi } from "vitest";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { render, screen } from "@/test-utils";
import {
  makeDateColumnOptions,
  PeriodControls,
} from "@/components/caseFields/PeriodControls/PeriodControls";

const DATE_COLUMN_OPTIONS = [
  { value: "col-visit-date", label: "visit_date" },
  { value: "col-lab-date", label: "lab_date" },
];

describe("PeriodControls", () => {
  it("reports the period picked with the date column already chosen", () => {
    const onChange = vi.fn();
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="month"
        bucketColumnId="col-visit-date"
        dateColumnOptions={DATE_COLUMN_OPTIONS}
        onChange={onChange}
      />,
    );

    pickMantineSelectOption("Period for Temperature", "Per week");

    expect(onChange).toHaveBeenCalledWith({
      bucketGrain: "week",
      bucketColumnId: "col-visit-date",
    });
  });

  it("reports the date column picked with the period already chosen", () => {
    const onChange = vi.fn();
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="quarter"
        bucketColumnId="col-visit-date"
        dateColumnOptions={DATE_COLUMN_OPTIONS}
        onChange={onChange}
      />,
    );

    pickMantineSelectOption("Date column for Temperature", "lab_date");

    expect(onChange).toHaveBeenCalledWith({
      bucketGrain: "quarter",
      bucketColumnId: "col-lab-date",
    });
  });

  it("says so when the field's dataset has no date column", () => {
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="month"
        bucketColumnId={undefined}
        dateColumnOptions={[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("This dataset has no date column"),
    ).toBeInTheDocument();
  });
});

describe("makeDateColumnOptions", () => {
  it("offers only date and timestamp columns", () => {
    expect(
      makeDateColumnOptions([
        { id: "a", name: "visit_date", dataType: "date" },
        { id: "b", name: "seen_at", dataType: "timestamp" },
        { id: "c", name: "seen_time", dataType: "time" },
        { id: "d", name: "note", dataType: "varchar" },
      ]),
    ).toEqual([
      { value: "a", label: "visit_date" },
      { value: "b", label: "seen_at" },
    ]);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend PeriodControls`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write the controls**

Create `PeriodControls.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { useBucketGrainLabels } from "@/components/caseFields/useBucketGrainLabels/useBucketGrainLabels";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { MantineSize } from "@mantine/core";
import type { ReactNode } from "react";

/** One date column a per-period field can group its rows by. */
export type DateColumnOption = { value: string; label: string };

/** A field's period and date column, as the controls report them. */
export type PeriodChoice = {
  bucketGrain: ConceptAttribute.BucketGrain;
  bucketColumnId: string | undefined;
};

type Props = {
  /** The field's name, which names both pickers for assistive technology. */
  fieldName: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  bucketColumnId: string | undefined;
  /** The date and timestamp columns of the field's dataset. */
  dateColumnOptions: readonly DateColumnOption[];
  onChange: (choice: PeriodChoice) => void;
  size?: MantineSize;
  /** Shows each picker's label above it, as a form does. */
  withLabels?: boolean;
};

/**
 * The date and timestamp columns among a dataset's columns, as options for
 * `PeriodControls`. For example, built from the columns a draft card or a
 * form already loaded for the field's dataset.
 */
export function makeDateColumnOptions(
  columns: ReadonlyArray<{ id: string; name: string; dataType: AvaDataType.T }>,
): DateColumnOption[] {
  return columns
    .filter((column) => {
      return ConceptAttribute.isBucketDateColumnType(column.dataType);
    })
    .map((column) => {
      return { value: column.id, label: column.name };
    });
}

/**
 * Picks a per-period field's period and the date column that places each row
 * in one. Use it wherever such a field is designed, for example the chat
 * draft card or the case type form, beside `ValueShapeControl`.
 */
export function PeriodControls({
  fieldName,
  bucketGrain,
  bucketColumnId,
  dateColumnOptions,
  onChange,
  size = "sm",
  withLabels = false,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const grainLabels = useBucketGrainLabels();
  const periodOptions = ConceptAttribute.BUCKET_GRAINS.map((grain) => {
    return { value: grain, label: grainLabels[grain].perPeriod };
  });
  return (
    <>
      <Select
        size={size}
        label={withLabels ? t`Period` : undefined}
        aria-label={t`Period for ${fieldName}`}
        data={periodOptions}
        value={bucketGrain}
        allowDeselect={false}
        onChange={(value) => {
          if (value) {
            onChange({
              bucketGrain: value as ConceptAttribute.BucketGrain,
              bucketColumnId,
            });
          }
        }}
      />
      <Select
        size={size}
        label={withLabels ? t`Date column` : undefined}
        aria-label={t`Date column for ${fieldName}`}
        placeholder={t`Choose a date column`}
        data={[...dateColumnOptions]}
        value={bucketColumnId ?? null}
        allowDeselect={false}
        error={
          dateColumnOptions.length === 0
            ? t`This dataset has no date column`
            : undefined
        }
        onChange={(value) => {
          if (value) {
            onChange({ bucketGrain, bucketColumnId: value });
          }
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `pnpm test:frontend PeriodControls`
Expected: PASS, four tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
pnpm i18n:extract && pnpm i18n:compile
git add src/components/caseFields/PeriodControls src/i18n/locales
git commit -m "feat(joined-cases): add the period and date column pickers"
```

---

## Task 10: Widen the value shape, and give every branch on it a per-period arm

**Files:**
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`, `ConceptAttributeModule/ConceptAttributeModule.ts` (+ test)
- Modify: `shared/types/chat.types.ts`
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts`, `makeConceptAttributeColumnsFromMetadata.ts`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`
- Modify: `shared/models/queries/QueryColumn/QueryColumnModule.ts` (+ `QueryColumn.test.ts`)
- Modify: `src/components/caseFields/ValueShapeControl/ValueShapeControl.tsx`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx`, `RecordFieldValue/RecordFieldValue.tsx` (+ test), `useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes.ts` (+ test)
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList.tsx`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor.ts` (+ test), `CaseTypeDraftAttributeRow.tsx`, `CaseTypeDraftSourceSection.tsx`, `CaseTypeDraftCard.tsx`, `CaseTypeDraftBlock.tsx` (+ test)
- Modify: `src/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType.ts`, `createdCaseTypeToFormValues/createdCaseTypeToFormValues.ts`, `insertConceptFromFormValues/insertConceptFromFormValues.ts` (+ their tests)
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator.tsx`
- Modify: every test that names plan 3's control `One value or every value for <field>`

Plan 3 branches on a shape with `match(...).exhaustive()` or an exhaustive `Record`, so widening the unions first turns every branch into a compile error, and the error list is the checklist (`docs/rules/typescript.md`, "Widening a string literal union"). `ValueShapeControl` is typed by `ConceptAttribute.ValueShape` and feeds the draft card's `ChatCaseValueShape`, so both unions widen together. The pieces every arm needs already exist (Tasks 4 to 9). Vitest does not type-check, so each step's tests run red and green while the tree still has other errors; the task commits once `pnpm type-check` is clean.

- [ ] **Step 1: Widen both unions**

In `ConceptAttribute.types.ts`, replace plan 3's `ConceptAttributeValueShape` with:

```ts
/**
 * How many values a field holds for one record. `single` reduces the field's
 * rows to one value with its value rule; `list` keeps every non-NULL value
 * in source order; `bucketed_list` keeps one value per period of a date
 * column, each reduced with the value rule. Authoring, the concept view, the
 * query form, and the record page each branch on it.
 */
export type ConceptAttributeValueShape = "single" | "list" | "bucketed_list";
```

In `shared/types/chat.types.ts`, replace plan 3's `ChatCaseValueShape` with:

```ts
/** Mirrors `ConceptAttribute.ValueShape`. */
export type ChatCaseValueShape = "single" | "list" | "bucketed_list";

/**
 * The period a per-period attribute keeps one value for. Mirrors
 * `ConceptAttribute.BucketGrain`.
 */
export type ChatCaseBucketGrain = "day" | "week" | "month" | "quarter" | "year";
```

Add to `ChatProposedCaseAttribute`, after `valueShape`:

```ts
  /**
   * The period this attribute keeps one value for. Present when
   * `valueShape` is `"bucketed_list"`, and only then.
   */
  bucketGrain?: ChatCaseBucketGrain;
  /**
   * The date or timestamp column of `datasetId` that places each row in a
   * period. Present when `valueShape` is `"bucketed_list"`, and only then,
   * except in a card whose dataset has no date column, which refuses to
   * create it.
   */
  bucketColumnId?: string;
```

and to the `dataset_column` arm of `ChatCreatedCaseAttribute`, after `valueShape?`:

```ts
      /** The period, exactly when `valueShape` is `"bucketed_list"`. */
      bucketGrain?: ChatCaseBucketGrain;
      /** The date column, exactly when `valueShape` is `"bucketed_list"`. */
      bucketColumnId?: string;
```

- [ ] **Step 2: Let the compiler list the branches**

Run: `pnpm type-check`
Expected: errors at each branch plan 3 made exhaustive, which Steps 3 to 11 fix:

| File | Branch | Step |
| --- | --- | --- |
| `ConceptAttributeModule.ts` | `valueShapeToIsArray`, `getOutputDataType` | 3 |
| `buildConceptViewSql.ts` | `_buildColumnSelector`, `_buildUnmappedSelector` | 4 |
| `makeConceptAttributeColumnsFromMetadata.ts` | `_getValueRule` | 4 |
| `QueryColumnModule.ts` | `_isList` | 5 |
| `RecordFieldValue.tsx` | the shape match | 6 |
| `CaseTypeAttributesList.tsx` | the badge match | 7 |
| `ValueShapeControl.tsx` | `labelsByValueShape` | 8 |
| `CaseTypeDraftAttributeRow.tsx` | the controls match | 9 |
| `proposedCaseTypeToCreatedCaseType.ts` | the rule match | 10 |
| `insertConceptFromFormValues.ts` | `_datasetColumnMappingFromAttribute` | 10 |
| `DatasetColumnMappingCreator.tsx` | the rule select match | 11 |

Any other branch the compiler names gets the arm its `list` neighbour has, unless the branch decides a value rule or a value's type, where a per-period field behaves like `single` (spec §5.2).

- [ ] **Step 3: The model's three functions**

Add to `ConceptAttributeModule.test.ts`:

```ts
describe("per-period fields", () => {
  it("reads a field with a period as a per-period list", () => {
    expect(
      ConceptAttribute.getValueShape({ isArray: true, bucketGrain: "month" }),
    ).toBe("bucketed_list");
  });

  it("stores a per-period field as an array", () => {
    expect(ConceptAttribute.valueShapeToIsArray("bucketed_list")).toBe(true);
  });

  it("types a per-period field as its rule's output, the type of each period's value", () => {
    expect(
      ConceptAttribute.getOutputDataType({
        valueShape: "bucketed_list",
        ruleType: "count",
        columnDataType: "varchar",
      }),
    ).toBe("bigint");
  });
});
```

Run: `pnpm test:frontend ConceptAttributeModule`
Expected: FAIL. The first reads `list`; the other two throw ts-pattern's `NonExhaustiveError`.

In `ConceptAttributeModule.ts`, replace `_getValueShape` with:

```ts
function _getValueShape(
  attribute: Readonly<
    Pick<ConceptAttributeModel["Read"], "isArray"> & {
      // Optional, so form values (an insert shape) are read the same way.
      bucketGrain?: ConceptAttributeBucketGrain | undefined;
    }
  >,
): ConceptAttributeValueShape {
  if (attribute.bucketGrain !== undefined) {
    return "bucketed_list";
  }
  return attribute.isArray ? "list" : "single";
}
```

In `_valueShapeToIsArray`, replace the `list` arm with `.with("list", "bucketed_list", () => { return true; })`. In `_getOutputDataType`, replace `.with("single", () => {` with `.with("single", "bucketed_list", () => {` and add above its return the comment `// A per-period field's value is the rule's output for each period.`. Update the module's `getValueShape` docstring to "A field's value shape, read from its stored columns: a period makes it per-period."

Run: `pnpm test:frontend ConceptAttributeModule`
Expected: PASS.

- [ ] **Step 4: The concept view**

In the integration test, give dataset A a date column by replacing, in `_seed`:

```ts
        (101, 41, 'blue'),
        (101, 42, 'green'),
        (102, 50, 'red')
      ) AS t(person_id, age_years, tag)
```

with:

```ts
        (101, 41, 'blue', DATE '2026-01-05'),
        (101, 42, 'green', DATE '2026-02-10'),
        (102, 50, 'red', DATE '2026-01-20')
      ) AS t(person_id, age_years, tag, seen_on)
```

(the view's columns come from fields, so no existing case changes), add these helpers and fixtures after `_metadata` and the existing fixtures:

```ts
/** `_metadata` plus dataset columns no mapping reads as its value. */
function _metadataWithColumns(
  options: Readonly<{
    attributes: readonly ConceptAttribute.T[];
    mappings: readonly MappedColumn[];
    extraColumns: readonly DatasetColumn.T[];
  }>,
): ConceptRelationMetadata {
  const metadata = _metadata(options);
  return {
    ...metadata,
    datasetColumnsById: {
      ...metadata.datasetColumnsById,
      ...Object.fromEntries(
        options.extraColumns.map((column) => {
          return [column.id, column];
        }),
      ),
    },
  };
}

/** A dataset column with a type, which column resolution checks. */
function _typedColumn(
  options: Readonly<{
    datasetId: Dataset.Id;
    columnName: string;
    dataType: DatasetColumn.T["dataType"];
  }>,
): DatasetColumn.T {
  return {
    id: `col-${options.datasetId}-${options.columnName}` as DatasetColumn.Id,
    name: options.columnName,
    datasetId: options.datasetId,
    dataType: options.dataType,
  } as DatasetColumn.T;
}

const AGE_PER_MONTH = _attribute({
  name: "age per month",
  dataType: "bigint",
  isArray: true,
  bucketGrain: "month",
});
const SEEN_ON = _typedColumn({
  datasetId: DATASET_A,
  columnName: "seen_on",
  dataType: "date",
});
const TAG_COLUMN = _typedColumn({
  datasetId: DATASET_A,
  columnName: "tag",
  dataType: "varchar",
});
const OTHER_DATASET_DATE = _typedColumn({
  datasetId: DATASET_B,
  columnName: "seen_on",
  dataType: "date",
});

/** The per-month field's mapping: the monthly max of `age_years`. */
function _agePerMonthMapping(
  dateColumn: DatasetColumn.T | undefined,
): MappedColumn {
  const mapped = _mapping({
    attributeName: "age per month",
    datasetId: DATASET_A,
    columnName: "age_years",
    ruleType: "max",
  });
  return {
    ...mapped,
    mapping: { ...mapped.mapping, bucketColumnId: dateColumn?.id },
  };
}

/** Builds the view from metadata and reads one field as JSON per record. */
async function _queryFieldAsJson(
  options: Readonly<{ metadata: ConceptRelationMetadata; fieldName: string }>,
): Promise<Array<{ externalId: string; value: unknown; typeName: string }>> {
  const { attributeColumns } = makeConceptAttributeColumnsFromMetadata(
    options.metadata,
  );
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    await connection.run(
      buildConceptViewSql({
        viewName: CONCEPT_VIEW,
        spineTableName: SPINE,
        attributeColumns,
      }),
    );
    const reader = await connection.runAndReadAll(`
      SELECT
        external_id,
        CAST(to_json("${options.fieldName}") AS VARCHAR) AS field_json,
        typeof("${options.fieldName}") AS type_name
      FROM "${CONCEPT_VIEW}"
      ORDER BY external_id
    `);
    return reader.getRowObjectsJson().map((row) => {
      return {
        externalId: String(row.external_id),
        value: JSON.parse(String(row.field_json)),
        typeName: String(row.type_name),
      };
    });
  });
}
```

and these cases inside its `describe`:

```ts
  it("reads a per-month field through its date column", async () => {
    const rows = await _queryFieldAsJson({
      metadata: _metadataWithColumns({
        attributes: [PERSON_ID, AGE_PER_MONTH],
        mappings: [PERSON_ID_MAPPING, _agePerMonthMapping(SEEN_ON)],
        extraColumns: [SEEN_ON],
      }),
      fieldName: "age per month",
    });

    expect(
      rows.map((row) => {
        return [row.externalId, row.value];
      }),
    ).toEqual([
      [
        "101",
        [
          { bucket: "2026-01-01", value: 41 },
          { bucket: "2026-02-01", value: 42 },
        ],
      ],
      ["102", [{ bucket: "2026-01-01", value: 50 }]],
      ["103", []],
    ]);
  });

  // The relation's schema must not change shape when a mapping is missing.
  it("emits a per-month field with no mapping as a typed empty list", async () => {
    const rows = await _queryFieldAsJson({
      metadata: _metadata({
        attributes: [PERSON_ID, AGE_PER_MONTH],
        mappings: [PERSON_ID_MAPPING],
      }),
      fieldName: "age per month",
    });

    expect(rows[0]).toEqual({
      externalId: "101",
      value: [],
      typeName: 'STRUCT(bucket DATE, "value" BIGINT)[]',
    });
  });

  it.each([
    ["names no date column", undefined, [], /names no date column/],
    ["names a date column that does not exist", SEEN_ON, [], /does not exist/],
    [
      "names a date column of another dataset",
      OTHER_DATASET_DATE,
      [OTHER_DATASET_DATE],
      /not of the dataset it reads/,
    ],
    [
      "names a column that is not a date or timestamp",
      TAG_COLUMN,
      [TAG_COLUMN],
      /not a date or timestamp/,
    ],
  ] as const)(
    "refuses a per-month field whose mapping %s",
    (_label, dateColumn, extraColumns, message) => {
      const metadata = _metadataWithColumns({
        attributes: [PERSON_ID, AGE_PER_MONTH],
        mappings: [PERSON_ID_MAPPING, _agePerMonthMapping(dateColumn)],
        extraColumns,
      });

      expect(() => {
        return makeConceptAttributeColumnsFromMetadata(metadata);
      }).toThrow(message);
    },
  );

  it("refuses a date column on a field without a period", () => {
    const metadata = _metadataWithColumns({
      attributes: [PERSON_ID, AGE],
      mappings: [
        PERSON_ID_MAPPING,
        {
          ...AGE_MAPPING,
          mapping: { ...AGE_MAPPING.mapping, bucketColumnId: SEEN_ON.id },
        },
      ],
      extraColumns: [SEEN_ON],
    });

    expect(() => {
      return makeConceptAttributeColumnsFromMetadata(metadata);
    }).toThrow(/has no period/);
  });
```

Run: `pnpm test:executed conceptAttributeColumns`
Expected: FAIL, the new cases, each with ts-pattern's `NonExhaustiveError` or no throw.

In `buildConceptViewSql.ts`, import `buildBucketedListTypeSql` and `buildBucketedListValueSql` from `@/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql`, add a third arm to `ConceptAttributeValueRule`, and update its docstring's first sentence to "How a dataset-column attribute's rows become its value: reduced to one value by a rule, kept whole as a list, or reduced by the rule once per period of a date column.":

```ts
  | {
      valueShape: "bucketed_list";
      valuePickerRuleType: ValuePickerRuleType;
      bucketGrain: ConceptAttribute.BucketGrain;
      /** The dataset column that places each row in a period. */
      bucketColumnName: string;
    };
```

Add to `_buildColumnSelector`'s match:

```ts
    .with({ valueShape: "bucketed_list" }, (bucketedColumn) => {
      return `${buildBucketedListValueSql({
        datasetId: bucketedColumn.datasetId,
        selectColumnName: bucketedColumn.selectColumnName,
        primaryKeyColumnName: bucketedColumn.primaryKeyColumnName,
        bucketColumnName: bucketedColumn.bucketColumnName,
        bucketGrain: bucketedColumn.bucketGrain,
        ruleType: bucketedColumn.valuePickerRuleType,
        externalIdsTable: SPINE_ALIAS,
        externalIdColumn: EXTERNAL_ID_COLUMN,
      })} AS ${quoteSqlIdentifier(bucketedColumn.attributeName)}`;
    })
```

and to `_buildUnmappedSelector`'s match:

```ts
    .with("bucketed_list", () => {
      return `CAST([] AS ${buildBucketedListTypeSql(column.duckDbDataType)}) AS ${alias}`;
    })
```

In `makeConceptAttributeColumnsFromMetadata.ts`, add above `_getValueRule`:

```ts
/**
 * A per-period field's period and the name of the date column it groups its
 * rows by.
 *
 * Fails closed, like the value column: a period with no readable date column
 * would answer every record with an empty list, which reads as "no data"
 * for data that may well exist.
 */
function _resolveBucket(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
  }>,
): { bucketGrain: ConceptAttribute.BucketGrain; bucketColumnName: string } {
  const { attribute, mapping, metadata } = options;
  const field = `Concept attribute '${attribute.name}' (${attribute.id})`;
  // `getValueShape` is per-period only for a field with a period; this
  // restates that for the compiler.
  if (attribute.bucketGrain === undefined) {
    throw new Error(`${field} has no period.`);
  }
  if (mapping.bucketColumnId === undefined) {
    throw new Error(
      `${field} keeps one value per ${attribute.bucketGrain}, but its ` +
        `mapping names no date column.`,
    );
  }
  const bucketColumn = metadata.datasetColumnsById[mapping.bucketColumnId];
  if (!bucketColumn) {
    throw new Error(
      `${field} groups its rows by date column '${mapping.bucketColumnId}', ` +
        `which does not exist.`,
    );
  }
  if (bucketColumn.datasetId !== mapping.datasetId) {
    throw new Error(
      `${field} groups its rows by column '${bucketColumn.name}' of dataset ` +
        `'${bucketColumn.datasetId}', not of the dataset it reads ` +
        `('${mapping.datasetId}').`,
    );
  }
  if (!ConceptAttribute.isBucketDateColumnType(bucketColumn.dataType)) {
    throw new Error(
      `${field} groups its rows by column '${bucketColumn.name}', which is ` +
        `'${bucketColumn.dataType}', not a date or timestamp.`,
    );
  }
  return {
    bucketGrain: attribute.bucketGrain,
    bucketColumnName: bucketColumn.name,
  };
}
```

Give `_getValueRule` the metadata (add `metadata: ConceptRelationMetadata;` to its options, and pass `metadata` where `_buildAttributeColumn` calls it), and replace its body with:

```ts
  const { attribute, mapping } = options;
  const ruleType: ValuePickerRuleType | undefined = mapping.valuePickerRuleType;
  const valueShape = ConceptAttribute.getValueShape(attribute);
  // A date column means something only to a per-period field; anywhere else
  // the ontology is inconsistent, and ignoring it would hide that.
  if (valueShape !== "bucketed_list" && mapping.bucketColumnId !== undefined) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) has no ` +
        `period, but its mapping names date column '${mapping.bucketColumnId}'.`,
    );
  }
  return match(valueShape)
    // Plan 3's "single" and "list" arms, unchanged.
    .with("bucketed_list", (): ConceptAttributeValueRule => {
      if (ruleType === undefined) {
        throw new Error(
          `Concept attribute '${attribute.name}' (${attribute.id}) keeps ` +
            `one value per period, but its mapping names no value rule.`,
        );
      }
      return {
        valueShape: "bucketed_list",
        valuePickerRuleType: ruleType,
        ..._resolveBucket(options),
      };
    })
    .exhaustive();
```

keeping plan 3's two arms between `match(valueShape)` and the new one. Add "A per-period field needs a rule and a date column of its own dataset." to the function's docstring.

Run: `pnpm test:executed conceptAttributeColumns buildConceptViewSql`
Expected: PASS.

- [ ] **Step 5: The query column gate**

In `QueryColumn.test.ts`, give plan 3's `_fieldColumn` a `bucketGrain?: ConceptAttribute.BucketGrain` option and pass `bucketGrain: options.bucketGrain` (replacing the `bucketGrain: undefined` Task 3 added), then add:

```ts
const TEMPERATURE_PER_MONTH = _fieldColumn({
  name: "Temperature per month",
  dataType: "double",
  isArray: true,
  bucketGrain: "month",
});
```

```ts
  // Sort, group by, and count work on a list of periods in DuckDB; sum,
  // filters, and charts do not.
  it("gives a per-month field exactly a list's operations", () => {
    expect(QueryColumn.isList(TEMPERATURE_PER_MONTH)).toBe(true);
    expect(QueryColumn.getValidAggregations(TEMPERATURE_PER_MONTH)).toEqual([
      "none",
      "group_by",
      "count",
    ]);
    expect(QueryColumn.isNumeric(TEMPERATURE_PER_MONTH)).toBe(false);
  });
```

Run: `pnpm test:frontend QueryColumn`
Expected: FAIL, `NonExhaustiveError` from `_isList`.

In `QueryColumnModule.ts`, replace `_isList`'s `list` arm with `.with("list", "bucketed_list", () => { return true; })`.

Run: `pnpm test:frontend QueryColumn`
Expected: PASS. Every gate plan 3 built on `isList` (filters, aggregations, chart measures) now keeps a per-period field out, and the dashboard local filter already does through the result column's `isArray`.

- [ ] **Step 6: The record page**

Add to `RecordFieldValue.test.tsx`:

```tsx
  it("shows a per-month field as a table of months and values", () => {
    render(
      <RecordFieldValue
        fieldName="Temperature"
        valueShape="bucketed_list"
        bucketGrain="month"
        dataType="double"
        value={[{ bucket: Date.UTC(2026, 0, 1), value: 38.5 }]}
      />,
    );

    const table = screen.getByRole("table", { name: "Temperature per month" });
    expect(
      within(table).getByRole("rowheader", { name: "Jan 2026" }),
    ).toBeInTheDocument();
  });
```

and to `makeCaseDetailsRowsFromAttributes.test.ts`, beside plan 3's case for `valueShape`, a case built the same way from one attribute with `isArray: true`, `bucketGrain: "month"`, and `dataType: "double"`, asserting:

```ts
    expect(rows[0]).toMatchObject({
      valueShape: "bucketed_list",
      bucketGrain: "month",
      dataType: "double",
    });
```

Run: `pnpm test:frontend RecordFieldValue makeCaseDetailsRowsFromAttributes`
Expected: FAIL, `NonExhaustiveError`, and rows without `bucketGrain`.

In `CaseDetailsRail.tsx`, add to `CaseDetailsRow` after plan 3's `valueShape`:

```ts
  /** The field's period, when it keeps one value per period. */
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
```

and pass `bucketGrain={attribute.bucketGrain}` to `RecordFieldValue`, beside the `dataType={attribute.dataType}` plan 3 passes. Plan 3's `dataType` (the field's `data_type`) is already the type of each period's value, so the row needs no second type. Spec §5.6 says `CaseDetailsRow` gains `valueDataType`; record in Task 18's "Deviations" row that plan 3's `dataType` serves instead. In `makeCaseDetailsRowsFromAttributes.ts`, add to each row, beside plan 3's `valueShape`:

```ts
        bucketGrain: attribute.bucketGrain,
```

In `RecordFieldValue.tsx`, add to `Props`:

```ts
  /** The field's period; read only for a per-period field. */
  bucketGrain?: ConceptAttribute.BucketGrain;
```

(optional, so plan 3's tests keep rendering without it), destructure `bucketGrain`, import `ConceptAttribute` as a value and `RecordFieldPeriodTable`, and add the arm. Plan 3's required `dataType` prop is each period's value type, and `formatValue` is the component's `useFieldValueFormatter(dataType)` result:

```tsx
    .with("bucketed_list", () => {
      const entries = ConceptAttribute.toBucketedListEntries(value);
      // Anything else is a broken value; show it rather than fail the page.
      if (!entries || bucketGrain === undefined) {
        return formatValue(value);
      }
      return (
        <RecordFieldPeriodTable
          fieldName={fieldName}
          bucketGrain={bucketGrain}
          valueDataType={dataType}
          entries={entries}
        />
      );
    })
```

Plan 1's "No value" still renders first for a missing value. Add to `CaseDetailsRail.test.tsx`'s row fixtures `bucketGrain: undefined,` where the compiler asks (plan 3's fixtures already carry `dataType` and `valueShape`). The rail's source lines are a list labelled `Sources`, so a rail test that reads a field's rows scopes to that field's table (`getByRole("table", { name: ... })`), never to every `row` or `listitem` in the rail.

Run: `pnpm test:frontend RecordFieldValue makeCaseDetailsRowsFromAttributes CaseDetailsRail`
Expected: PASS.

- [ ] **Step 7: The case type page**

In `CaseTypeAttributesList.tsx`'s `AttributeChips`, add `const grainLabels = useBucketGrainLabels();` (imported from `@/components/caseFields/useBucketGrainLabels/useBucketGrainLabels`) and the arm:

```tsx
        .with("bucketed_list", () => {
          return attribute.bucketGrain ? (
            <Badge variant="light" color="neutral" size="sm">
              {grainLabels[attribute.bucketGrain].perPeriod}
            </Badge>
          ) : null;
        })
```

`ConceptMetaView/` already holds a test beside its modules, so this badge is checked by hand in Task 17 rather than in a second test file there (`docs/rules/testing.md`).

- [ ] **Step 8: A third segment in the shape control**

In `ValueShapeControl.tsx`, add the label and rename the control, since it no longer chooses between two:

```ts
  const labelsByValueShape: Record<ConceptAttribute.ValueShape, string> = {
    single: t`One value`,
    list: t`Every value`,
    bucketed_list: t`Per period`,
  };
```

```tsx
      aria-label={t`How many values ${fieldName} keeps`}
```

Update its docstring to "Chooses whether a case type field keeps one value per record, every value, or one value per period." Then find every test that names the control the old way and rename it:

```bash
rg -l "One value or every value for" src tests
```

Expected: `CaseTypeDraftBlock.test.tsx` (plan 3's `_getValueShapeControl`) and `tests/e2e/case-list-field.spec.ts`. In each, replace the template `` `One value or every value for ${fieldName}` `` with `` `How many values ${fieldName} keeps` ``.

- [ ] **Step 9: The draft card**

Add to `useCaseTypeDraftEditor.test.ts`, with `const CENSUS_DATE_COLUMN_ID = "5e6f7081-bbbb-4bbb-8ccc-ddddeeeeffff";` beside the other ids:

```ts
  it("keeps a column's value per month by the date column chosen", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(POPULATION_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: CENSUS_DATE_COLUMN_ID,
      });
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID;
      }),
    ).toMatchObject({
      valueShape: "bucketed_list",
      bucketGrain: "month",
      bucketColumnId: CENSUS_DATE_COLUMN_ID,
      valuePickerRuleType: "max",
    });
  });

  it("drops the period when a column goes back to one value", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(POPULATION_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: CENSUS_DATE_COLUMN_ID,
      });
    });
    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "single");
    });

    const population = result.current.draft.attributes.find((attribute) => {
      return attribute.columnId === POPULATION_COLUMN_ID;
    });
    expect(population?.valueShape).toBe("single");
    expect(population).not.toHaveProperty("bucketGrain");
    expect(population).not.toHaveProperty("bucketColumnId");
  });

  it("keeps a join key at one value when asked for a period", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(PK_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: CENSUS_DATE_COLUMN_ID,
      });
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === PK_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });

  it("cannot create while an included per-period field has no date column", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(POPULATION_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: undefined,
      });
    });

    expect(result.current.canCreate).toBe(false);
  });
```

In `CaseTypeDraftBlock.test.tsx`, add `const REPORT_DATE_COLUMN_ID = "7a8b9c0d-aaaa-4bbb-8ccc-ddddeeeeffff";`, add `{ id: REPORT_DATE_COLUMN_ID, name: "report_date", datasetId: DEATHS_DATASET_ID, dataType: "date" }` to the mocked `DatasetColumnClient.useGetAll` columns, and add:

```tsx
  it("creates a per-month field with its dataset's first date column", async () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByLabelText("Include Total deaths"));
    fireEvent.click(
      within(_getValueShapeControl("Total deaths")).getByRole("radio", {
        name: "Per period",
      }),
    );
    const dateColumnInput = screen
      .getAllByLabelText("Date column for Total deaths")
      .find((element) => {
        return element.tagName === "INPUT";
      });
    expect(dateColumnInput).toHaveValue("report_date");
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const totalDeaths = call?.[0].caseTypes[0].attributes.find(
      (attribute: { name: string }) => {
        return attribute.name === "Total deaths";
      },
    );
    expect(totalDeaths).toMatchObject({
      valueShape: "bucketed_list",
      valuePickerRuleType: "sum",
      bucketGrain: "month",
      bucketColumnId: REPORT_DATE_COLUMN_ID,
    });
  });
```

Run: `pnpm test:frontend useCaseTypeDraftEditor CaseTypeDraftBlock`
Expected: FAIL, `setAttributeBucket is not a function`, and no `Per period` radio.

In `useCaseTypeDraftEditor.ts`, import `omit` from `@avandar/utils` and `ChatCaseBucketGrain` with the chat types. Narrow plan 3's `setAttributeValueShape` to the shapes it can set alone, and add the bucket setter to `CaseTypeDraftEditor`:

```ts
  setAttributeValueShape: (
    columnId: string,
    valueShape: Exclude<ChatCaseValueShape, "bucketed_list">,
  ) => void;
  /**
   * Keeps one value per period for a column: sets its shape, its period,
   * and the date column that places each row in a period. A join key and
   * the label keep one value.
   */
  setAttributeBucket: (
    columnId: string,
    bucket: Readonly<{
      bucketGrain: ChatCaseBucketGrain;
      bucketColumnId: string | undefined;
    }>,
  ) => void;
```

In plan 3's `_withKeyOrLabelColumn` and in `setAttributeValueShape`'s `_mapAttribute` callback, drop the period with the shape:

```ts
    return {
      ...omit(attribute, ["bucketGrain", "bucketColumnId"]),
      isIncluded: true,
      valueShape: "single",
    };
```

```ts
          return {
            ...omit(attribute, ["bucketGrain", "bucketColumnId"]),
            valueShape,
          };
```

Add above `useCaseTypeDraftEditor`:

```ts
/**
 * Whether an included per-period field still has no date column, which the
 * card shows on the row and refuses to create.
 */
function _hasPeriodWithoutDateColumn(draft: ChatProposedCaseType): boolean {
  return draft.attributes.some((attribute) => {
    return (
      attribute.isIncluded &&
      attribute.valueShape === "bucketed_list" &&
      attribute.bucketColumnId === undefined
    );
  });
}
```

add `!_hasPeriodWithoutDateColumn(draft) &&` to `canCreate`, and add to the returned editor:

```ts
    setAttributeBucket: (columnId, bucket) => {
      setDraft((current) => {
        if (_isKeyOrLabelColumn(current, columnId)) {
          return current;
        }
        return _mapAttribute(current, columnId, (attribute) => {
          return {
            ...attribute,
            valueShape: "bucketed_list",
            bucketGrain: bucket.bucketGrain,
            bucketColumnId: bucket.bucketColumnId,
          };
        });
      });
    },
```

In `CaseTypeDraftBlock.tsx`, import `makeDateColumnOptions` and the `DateColumnOption` type from `@/components/caseFields/PeriodControls/PeriodControls`, add above `CaseTypeDraftCardContainer`:

```ts
/** Each source dataset's date and timestamp columns, as picker options. */
function _makeDateColumnOptionsByDatasetId(
  columns: readonly DatasetColumn.T[] | undefined,
): Readonly<Record<string, DateColumnOption[]>> {
  const datasetIds = [
    ...new Set(
      (columns ?? []).map((column) => {
        return column.datasetId;
      }),
    ),
  ];
  return Object.fromEntries(
    datasetIds.map((datasetId) => {
      return [
        datasetId,
        makeDateColumnOptions(
          (columns ?? []).filter((column) => {
            return column.datasetId === datasetId;
          }),
        ),
      ];
    }),
  );
}
```

compute `const dateColumnOptionsByDatasetId = useMemo(() => { return _makeDateColumnOptionsByDatasetId(datasetColumns); }, [datasetColumns]);` beside `columnNamesById`, and pass it to `CaseTypeDraftCard`. Add a `dateColumnOptionsByDatasetId: Readonly<Record<string, readonly DateColumnOption[]>>;` prop to `CaseTypeDraftCard` (documented "Each source dataset's date and timestamp columns, for a per-period field's date column picker.") and pass it to each `CaseTypeDraftSourceSection`, which passes `dateColumnOptions={dateColumnOptionsByDatasetId[group.datasetId] ?? []}` to each `CaseTypeDraftAttributeRow`. Add `dateColumnOptions: readonly DateColumnOption[];` to the row's `Props`.

In `CaseTypeDraftAttributeRow.tsx`, import `PeriodControls`, hoist plan 3's rule `Select` out of the `single` arm into `const ruleSelect = (...)` above the `return`, and replace the `ValueShapeControl`'s `onChange` and the match with:

```tsx
          <ValueShapeControl
            fieldName={attribute.name}
            value={attribute.valueShape}
            disabled={isPrimaryKey || isLabelColumn}
            onChange={(valueShape) => {
              if (valueShape === "bucketed_list") {
                editor.setAttributeBucket(attribute.columnId, {
                  bucketGrain: attribute.bucketGrain ?? "month",
                  bucketColumnId:
                    attribute.bucketColumnId ?? dateColumnOptions[0]?.value,
                });
                return;
              }
              editor.setAttributeValueShape(attribute.columnId, valueShape);
            }}
          />
          {match(attribute.valueShape)
            .with("single", () => {
              return ruleSelect;
            })
            .with("list", () => {
              return null;
            })
            .with("bucketed_list", () => {
              return (
                <>
                  <PeriodControls
                    size="xs"
                    fieldName={attribute.name}
                    bucketGrain={attribute.bucketGrain ?? "month"}
                    bucketColumnId={attribute.bucketColumnId}
                    dateColumnOptions={dateColumnOptions}
                    onChange={(choice) => {
                      editor.setAttributeBucket(attribute.columnId, choice);
                    }}
                  />
                  {ruleSelect}
                </>
              );
            })
            .exhaustive()}
```

Update the row's docstring to "... whether it keeps one value, every value, or one value per period, and for one value or a period, which value to keep."

Run: `pnpm test:frontend useCaseTypeDraftEditor CaseTypeDraftBlock`
Expected: PASS.

- [ ] **Step 10: The conversions and the insert**

Add to `proposedCaseTypeToCreatedCaseType.test.ts`:

```ts
  it("carries a per-year field's rule, period, and date column", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return attribute.name === "Population"
          ? {
              ...attribute,
              valueShape: "bucketed_list",
              bucketGrain: "year",
              bucketColumnId: "6f708192-cccc-4bbb-8ccc-ddddeeeeffff",
            }
          : attribute;
      }),
    });

    expect(
      created.attributes.find((attribute) => {
        return attribute.name === "Population";
      }),
    ).toMatchObject({
      valueShape: "bucketed_list",
      bucketGrain: "year",
      bucketColumnId: "6f708192-cccc-4bbb-8ccc-ddddeeeeffff",
      valuePickerRuleType: "max",
    });
  });
```

If the file's draft names the population column differently, match on that name.

Add to `createdCaseTypeToFormValues.test.ts`, with these constants beside the others and these entries appended to `COLUMNS`:

```ts
const VISIT_DATE_COLUMN_ID = uuid<DatasetColumnId>();
const VISITS_COLUMN_ID = uuid<DatasetColumnId>();
const CENSUS_DATE_COLUMN_ID = uuid<DatasetColumnId>();
```

```ts
  {
    id: VISIT_DATE_COLUMN_ID,
    datasetId: DATASET_ID,
    name: "visit_date",
    dataType: "date" as const,
  },
  {
    id: VISITS_COLUMN_ID,
    datasetId: DATASET_ID,
    name: "visits",
    dataType: "bigint" as const,
  },
  {
    id: CENSUS_DATE_COLUMN_ID,
    datasetId: CENSUS_DATASET_ID,
    name: "census_date",
    dataType: "date" as const,
  },
```

```ts
/** A chat attribute averaging visits per month, by `bucketColumnId`. */
function _visitsPerMonth(
  bucketColumnId: string,
): ChatCreatedCaseAttribute {
  return {
    name: "Visits per month",
    kind: "dataset_column",
    datasetId: DATASET_ID,
    columnId: VISITS_COLUMN_ID,
    valueShape: "bucketed_list",
    valuePickerRuleType: "avg",
    bucketGrain: "month",
    bucketColumnId,
  };
}

function _findAttribute(
  values: ReturnType<typeof createdCaseTypeToFormValues>,
  name: string,
) {
  return values.attributes.find((attribute) => {
    return attribute.name === name;
  });
}
```

```ts
  it("builds a per-month field as a list with its period, date column, and the rule's output type", () => {
    const values = createdCaseTypeToFormValues({
      caseType: _covidCase({
        attributes: [
          ..._covidCase().attributes,
          _visitsPerMonth(VISIT_DATE_COLUMN_ID),
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(_findAttribute(values, "Visits per month")).toMatchObject({
      isArray: true,
      bucketGrain: "month",
      // The average of whole numbers is a decimal.
      dataType: "double",
      mappings: {
        datasetColumn: {
          valuePickerRuleType: "avg",
          bucketColumnId: VISIT_DATE_COLUMN_ID,
        },
      },
    });
  });

  it.each([
    ["is unknown", uuid<DatasetColumnId>()],
    ["belongs to another dataset", CENSUS_DATE_COLUMN_ID],
    ["is not a date", STATUS_COLUMN_ID],
  ])("drops a per-month field whose date column %s", (_reason, columnId) => {
    const values = createdCaseTypeToFormValues({
      caseType: _covidCase({
        attributes: [..._covidCase().attributes, _visitsPerMonth(columnId)],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(_findAttribute(values, "Visits per month")).toBeUndefined();
  });

  it("keeps a join key column as one value even when chat asked for a period", () => {
    const values = createdCaseTypeToFormValues({
      caseType: _covidCase({
        attributes: [
          {
            name: "Case id",
            kind: "dataset_column",
            datasetId: DATASET_ID,
            columnId: PK_COLUMN_ID,
            valueShape: "bucketed_list",
            valuePickerRuleType: "first",
            bucketGrain: "month",
            bucketColumnId: VISIT_DATE_COLUMN_ID,
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(_findAttribute(values, "Case id")).toMatchObject({
      isIdentifier: true,
      isArray: false,
      bucketGrain: undefined,
    });
  });
```

Import `ChatCreatedCaseAttribute` with the file's chat types. In plan 3's `insertConceptFromFormValues.test.ts`, add a case beside its list-field case, built the same way from a form attribute with `isArray: true`, `bucketGrain: "month"`, and a mapping holding `valuePickerRuleType: "avg"` and `bucketColumnId`, asserting that the mapping sent to `ConceptClient.create` is `toMatchObject({ valuePickerRuleType: "avg", bucketColumnId })`.

Run: `pnpm test:frontend proposedCaseTypeToCreatedCaseType createdCaseTypeToFormValues insertConceptFromFormValues`
Expected: FAIL, `NonExhaustiveError` from the two matches, and the per-month form attribute is a plain list.

In `proposedCaseTypeToCreatedCaseType.ts`, add the arm to `_toDatasetColumnAttribute`'s match:

```ts
      .with("bucketed_list", () => {
        return {
          valuePickerRuleType: attribute.valuePickerRuleType,
          ...(attribute.bucketGrain
            ? { bucketGrain: attribute.bucketGrain }
            : {}),
          ...(attribute.bucketColumnId
            ? { bucketColumnId: attribute.bucketColumnId }
            : {}),
        };
      })
```

Plan 3 already forces the label and every join key to `single`, which reaches the `single` arm and so carries no period.

In `createdCaseTypeToFormValues.ts`, import `match` from `ts-pattern`, and add above `_makeMappedAttribute`:

```ts
/**
 * How a mapped attribute keeps its values. A per-period attribute carries
 * its period and its date column, already checked against the catalog.
 */
type MappedAttributeShape =
  | { valueShape: "single" | "list" }
  | {
      valueShape: "bucketed_list";
      bucketGrain: ConceptAttribute.BucketGrain;
      bucketColumnId: DatasetColumn.Id;
    };

/**
 * A chat attribute's shape, checked against the catalog, or `undefined` for
 * a per-period attribute whose date column is unknown, belongs to another
 * dataset, or is not a date or timestamp. Such an attribute is dropped, the
 * way an unknown column id is.
 */
function _resolveShape(
  options: Readonly<{
    attribute: Extract<ChatCreatedCaseAttribute, { kind: "dataset_column" }>;
    column: CatalogColumn;
    columns: readonly CatalogColumn[];
  }>,
): MappedAttributeShape | undefined {
  const { attribute, column, columns } = options;
  return match(attribute.valueShape ?? "single")
    .with("single", "list", (valueShape): MappedAttributeShape => {
      return { valueShape };
    })
    .with("bucketed_list", () => {
      const bucketColumn =
        attribute.bucketColumnId === undefined
          ? undefined
          : _findColumn(columns, attribute.bucketColumnId);
      if (
        attribute.bucketGrain === undefined ||
        bucketColumn === undefined ||
        bucketColumn.datasetId !== column.datasetId ||
        !ConceptAttribute.isBucketDateColumnType(bucketColumn.dataType)
      ) {
        return undefined;
      }
      return {
        valueShape: "bucketed_list",
        bucketGrain: attribute.bucketGrain,
        bucketColumnId: bucketColumn.id,
      } as const;
    })
    .exhaustive();
}
```

In plan 3's `MappedAttributeOptions`, replace `valueShape: ConceptAttribute.ValueShape;` with `shape: MappedAttributeShape;`. In `_makeMappedAttribute`, replace plan 3's `valueShape` constant with:

```ts
  // An identifier matches rows to a record and the label names it, so
  // neither is ever a list of either kind.
  const shape: MappedAttributeShape =
    options.isIdentifier || options.isLabel
      ? { valueShape: "single" }
      : options.shape;
  const { valueShape } = shape;
  const bucket = shape.valueShape === "bucketed_list" ? shape : undefined;
```

and add `bucketGrain: bucket?.bucketGrain,` after `isArray` and `bucketColumnId: bucket?.bucketColumnId,` after `datasetColumnId` in the `datasetColumn` mapping. In `_makeMissingIdentifierAttributes`, pass `shape: { valueShape: "single" },`. In `_attributesFromCaseType`, after the `column` lookup, replace plan 3's `valueShape: attribute.valueShape ?? "single",` with a resolved shape:

```ts
    const isIdentifier = primaryKeyColumnIds.has(column.id);
    const shape: MappedAttributeShape | undefined =
      isIdentifier || attribute.isLabel === true
        ? { valueShape: "single" }
        : _resolveShape({ attribute, column, columns });
    if (shape === undefined) {
      return [];
    }
```

passing `isIdentifier` and `shape` to `_makeMappedAttribute`. A join key and the label resolve no date column, so a bad period never drops them.

In `insertConceptFromFormValues.ts`, change `_datasetColumnMappingFromAttribute`'s `.with("single", () => {` to `.with("single", "bucketed_list", () => {`, and extend its docstring: "A per-period field keeps its rule, which it applies once per period."

Run: `pnpm test:frontend proposedCaseTypeToCreatedCaseType createdCaseTypeToFormValues insertConceptFromFormValues`
Expected: PASS.

- [ ] **Step 11: The concept creator form**

In `DatasetColumnMappingCreator.tsx`, add `useMemo` and `useState` to a `react` import, `PeriodControls` and `makeDateColumnOptions` from `@/components/caseFields/PeriodControls/PeriodControls`, and `import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";`. Add above the component:

```ts
/** A field's stored shape, mirrored in state so the controls re-render. */
type ShapeFields = {
  isArray: boolean;
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
  bucketColumnId: string | undefined;
};
```

Replace plan 3's `valueShape` constant with:

```ts
  const formAttribute =
    conceptForm.getValues().datasetColumnAttributes[attributeIdx];
  // The form is uncontrolled, so setting a value does not re-render this
  // component; state does, and every change below writes both.
  const [shape, setShape] = useState<ShapeFields>(() => {
    return {
      isArray: formAttribute?.isArray ?? false,
      bucketGrain: formAttribute?.bucketGrain,
      bucketColumnId: formAttribute?.mappings.datasetColumn.bucketColumnId,
    };
  });
  const valueShape = ConceptAttribute.getValueShape(shape);
  const datasetId = formAttribute?.mappings.datasetColumn.datasetId;
  const dateColumnOptions = useMemo(() => {
    const source = conceptForm.getValues().sourceDatasets.find((sourceDataset) => {
      return sourceDataset.dataset.id === datasetId;
    });
    return makeDateColumnOptions(source?.dataset.columns ?? []);
  }, [conceptForm, datasetId]);

  const applyShape = (nextShape: ShapeFields) => {
    setShape(nextShape);
    const path = `datasetColumnAttributes.${attributeIdx}` as const;
    conceptForm.setFieldValue(`${path}.isArray`, nextShape.isArray);
    conceptForm.setFieldValue(`${path}.bucketGrain`, nextShape.bucketGrain);
    conceptForm.setFieldValue(
      `${path}.mappings.datasetColumn.bucketColumnId`,
      // Every option is one of this dataset's column ids.
      nextShape.bucketColumnId as DatasetColumnId | undefined,
    );
  };
```

Give `ValueShapeControl` this `onChange`:

```tsx
          onChange={(nextValueShape) => {
            applyShape(
              nextValueShape === "bucketed_list"
                ? {
                    isArray: true,
                    bucketGrain: shape.bucketGrain ?? "month",
                    bucketColumnId:
                      shape.bucketColumnId ?? dateColumnOptions[0]?.value,
                  }
                : {
                    isArray: ConceptAttribute.valueShapeToIsArray(nextValueShape),
                    bucketGrain: undefined,
                    bucketColumnId: undefined,
                  },
            );
          }}
```

hoist plan 3's rule `Select` into `const renderRuleSelect = (label: string) => { return (<Select ... label={label} ... />); };`, and make the match:

```tsx
        {match(valueShape)
          .with("single", () => {
            return renderRuleSelect(
              t`If there are multiple ${attributeName} values for one ${state.singularConceptName}, then...`,
            );
          })
          .with("list", () => {
            return null;
          })
          .with("bucketed_list", () => {
            return (
              <>
                <PeriodControls
                  withLabels
                  fieldName={attributeName}
                  bucketGrain={shape.bucketGrain ?? "month"}
                  bucketColumnId={shape.bucketColumnId}
                  dateColumnOptions={dateColumnOptions}
                  onChange={(choice) => {
                    applyShape({ isArray: true, ...choice });
                  }}
                />
                {renderRuleSelect(
                  t`In each period, if there are multiple ${attributeName} values, then...`,
                )}
              </>
            );
          })
          .exhaustive()}
```

Task 13 adds the form's validation; Task 17 checks the form by hand.

- [ ] **Step 12: Clear the rest of the compiler's list**

Run: `pnpm type-check`
Expected: PASS. If it names a site not in Step 2's table, give it the arm Step 2 describes, and add a test beside that site's existing tests.

- [ ] **Step 13: Run every touched suite**

```bash
pnpm test:frontend ConceptAttributeModule QueryColumn RecordFieldValue makeCaseDetailsRowsFromAttributes CaseDetailsRail useCaseTypeDraftEditor CaseTypeDraftBlock proposedCaseTypeToCreatedCaseType createdCaseTypeToFormValues insertConceptFromFormValues
pnpm test:executed conceptAttributeColumns buildConceptViewSql
pnpm lint
pnpm i18n:extract && pnpm i18n:compile
```

Expected: PASS. `messages.po` gains `Per period`, `How many values {fieldName} keeps`, and `In each period, if there are multiple {attributeName} values, then...`, and loses `One value or every value for {fieldName}`.

- [ ] **Step 14: Commit**

```bash
pnpm format
git add shared src tests/e2e/case-list-field.spec.ts
git commit -m "feat(joined-cases): add per-period fields to every place a field's shape decides"
```

`git status` must show nothing else staged; `supabase/config.toml` stays unstaged.

---

## Task 11: Planning fetches, and the load keeps, the date column

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts:119-130`
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts:78-93`
- Test: `getConceptRelationPlansFromSql.test.ts`, `getNeededColumnsFromQuery.test.ts`

Neither site is in `ontology-architecture.md` section 12, and neither fails to compile. Without the first, planning throws "does not exist" for every per-period field. Without the second, a query whose load is projected to the columns it needs omits the date column, and the view fails to bind.

- [ ] **Step 1: Write the failing planning test**

In `getConceptRelationPlansFromSql.test.ts`, add below `IDENTIFIER_COLUMN`:

```ts
const TEMPERATURE_ATTRIBUTE = {
  ...IDENTIFIER_ATTRIBUTE,
  id: "attr-temperature" as ConceptAttribute.Id,
  name: "temperature per month",
  dataType: "double",
  isIdentifier: false,
  isArray: true,
  bucketGrain: "month",
} as ConceptAttribute.T;

const TEMPERATURE_MAPPING = {
  ...IDENTIFIER_MAPPING,
  id: "map-temperature",
  conceptAttributeId: TEMPERATURE_ATTRIBUTE.id,
  valuePickerRuleType: "avg",
  datasetColumnId: "col-temperature",
  bucketColumnId: "col-visit-date",
} as DatasetColumnMapping;

const TEMPERATURE_COLUMN = {
  id: "col-temperature",
  name: "temperature",
  datasetId: DATASET_ID,
  dataType: "double",
} as DatasetColumn.T;

const VISIT_DATE_COLUMN = {
  id: "col-visit-date",
  name: "visit_date",
  datasetId: DATASET_ID,
  dataType: "date",
} as DatasetColumn.T;
```

and this case inside the `describe`:

```ts
  it("fetches the date column a per-month field groups its rows by", async () => {
    conceptAttributeGetAllMock.mockResolvedValue([
      IDENTIFIER_ATTRIBUTE,
      TEMPERATURE_ATTRIBUTE,
    ]);
    getAllAttributeMappingsMock.mockResolvedValue([
      IDENTIFIER_MAPPING,
      TEMPERATURE_MAPPING,
    ]);
    // Answers only the ids asked for, as the real client does.
    datasetColumnGetAllMock.mockImplementation(
      async (filter: { where: { id: { in: readonly string[] } } }) => {
        return [
          IDENTIFIER_COLUMN,
          TEMPERATURE_COLUMN,
          VISIT_DATE_COLUMN,
        ].filter((column) => {
          return filter.where.id.in.includes(column.id);
        });
      },
    );
    const { getConceptRelationPlansFromSql } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql");

    const plans = await getConceptRelationPlansFromSql({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
      allowlist: _permissiveAllowlist(),
    });

    expect(
      plans[0]?.attributeColumns.find((column) => {
        return column.attributeName === "temperature per month";
      }),
    ).toMatchObject({
      kind: "dataset_column",
      valueShape: "bucketed_list",
      bucketGrain: "month",
      bucketColumnName: "visit_date",
    });
  });
```

- [ ] **Step 2: Write the failing projection test**

In `getNeededColumnsFromQuery.test.ts`, hoist the plan's one column so a test can derive from it: move the literal in `CONCEPT_PLAN.attributeColumns` unchanged into

```ts
const AGE_COLUMN: Extract<ConceptAttributeColumn, { kind: "dataset_column" }> =
  // The literal that was CONCEPT_PLAN.attributeColumns[0], unchanged.
```

set `attributeColumns: [AGE_COLUMN]` in `CONCEPT_PLAN`, add `import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";`, and add:

```ts
  it("takes a per-month field's date column from a concept plan", () => {
    const perMonthPlan: ConceptRelationPlan = {
      ...CONCEPT_PLAN,
      attributeColumns: [
        {
          ...AGE_COLUMN,
          attributeName: "temperature per month",
          selectColumnName: "temperature",
          valueShape: "bucketed_list",
          valuePickerRuleType: "avg",
          bucketGrain: "month",
          bucketColumnName: "visit_date",
        },
      ],
    };

    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [perMonthPlan],
      }),
    ).toEqual({ [DATASET_ID]: ["person_id", "temperature", "visit_date"] });
  });
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm test:frontend getConceptRelationPlansFromSql getNeededColumnsFromQuery`
Expected: FAIL. Planning rejects with `groups its rows by date column 'col-visit-date', which does not exist`; the projection lacks `visit_date`.

- [ ] **Step 4: Fetch the date column**

In `getConceptRelationPlansFromSql.ts`, replace the body of `_getMappedDatasetColumns`'s `flatMap` callback:

```ts
      return mapping.type === "dataset_column" ? [mapping.datasetColumnId] : [];
```

with:

```ts
      if (mapping.type !== "dataset_column") {
        return [];
      }
      // A per-period field also reads the date column that places each row
      // in a period, and column resolution looks that column up by id.
      return mapping.bucketColumnId === undefined
        ? [mapping.datasetColumnId]
        : [mapping.datasetColumnId, mapping.bucketColumnId];
```

Update its docstring to "Every dataset column the given mappings name, as a value or as a date column, keyed by id."

- [ ] **Step 5: Keep the date column in a projected load**

In `getNeededColumnsFromQuery.ts`, replace in `_getConceptColumnsByDatasetId`:

```ts
        nextColumnsByDatasetId[column.datasetId] = unionColumnSets(prior, [
          column.selectColumnName,
          column.primaryKeyColumnName,
        ]);
```

with:

```ts
        nextColumnsByDatasetId[column.datasetId] = unionColumnSets(prior, [
          column.selectColumnName,
          column.primaryKeyColumnName,
          // A per-period field also reads its date column, so a projected
          // load must keep it or the view fails to bind.
          ...(column.valueShape === "bucketed_list"
            ? [column.bucketColumnName]
            : []),
        ]);
```

- [ ] **Step 6: Run them and watch them pass**

Run: `pnpm test:frontend src/clients/qetl`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add src/clients/qetl
git commit -m "fix(joined-cases): fetch and load the date column a per-period field reads"
```

---

## Task 12: Chat proposes per-period fields

**Files:**
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseProposeCaseType.ts` (+ test)
- Modify: `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts` (+ test)
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts` (+ test)

These are string checks the compiler cannot see (plan 3, spec 4.12): the parser reads only `"list"`, the tool schema's enum lists two shapes, and the key and label coercion keeps a period it should drop. `createCaseTypes` is left alone: it carries no value rule, so its parser keeps reading anything but `"list"` as one value (spec §2).

- [ ] **Step 1: Write the failing parser tests**

Add to `parseProposeCaseType.test.ts`:

```ts
const VISITS_DATASET_ID = "0f2c9f3e-cccc-4bbb-8ccc-ddddeeeeffff";
const PATIENT_COLUMN_ID = "1a2b3c4d-cccc-4bbb-8ccc-ddddeeeeffff";
const TEMPERATURE_COLUMN_ID = "2b3c4d5e-cccc-4bbb-8ccc-ddddeeeeffff";
const VISIT_DATE_COLUMN_ID = "3c4d5e6f-cccc-4bbb-8ccc-ddddeeeeffff";

/** A one-dataset proposal whose Temperature attribute takes `temperature`. */
function _proposeTemperature(temperature: Record<string, unknown>): string {
  return JSON.stringify({
    name: "Patient",
    description: "One patient",
    allowManualCreation: false,
    sourceDatasets: [
      { datasetId: VISITS_DATASET_ID, primaryKeyColumnId: PATIENT_COLUMN_ID },
    ],
    labelColumnId: PATIENT_COLUMN_ID,
    attributes: [
      {
        datasetId: VISITS_DATASET_ID,
        columnId: PATIENT_COLUMN_ID,
        name: "Patient",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: VISITS_DATASET_ID,
        columnId: TEMPERATURE_COLUMN_ID,
        name: "Temperature",
        isIncluded: true,
        valuePickerRuleType: "avg",
        ...temperature,
      },
    ],
    manualEntryAttributes: [],
  });
}

function _parseAttribute(
  argsJson: string,
  columnId: string,
): ChatProposedCaseAttribute | undefined {
  return parseProposeCaseType(argsJson)?.attributes.find((attribute) => {
    return attribute.columnId === columnId;
  });
}

describe("parseProposeCaseType and per-period fields", () => {
  it("keeps a per-month proposal with its period and date column", () => {
    expect(
      _parseAttribute(
        _proposeTemperature({
          valueShape: "bucketed_list",
          bucketGrain: "month",
          bucketColumnId: VISIT_DATE_COLUMN_ID,
        }),
        TEMPERATURE_COLUMN_ID,
      ),
    ).toMatchObject({
      valueShape: "bucketed_list",
      bucketGrain: "month",
      bucketColumnId: VISIT_DATE_COLUMN_ID,
      valuePickerRuleType: "avg",
    });
  });

  it.each([
    ["an unknown period", { bucketGrain: "fortnight", bucketColumnId: VISIT_DATE_COLUMN_ID }],
    ["no date column", { bucketGrain: "month" }],
    ["a date column that is not an id", { bucketGrain: "month", bucketColumnId: "visit_date" }],
  ])("reads a per-period proposal with %s as one value", (_label, bucket) => {
    const temperature = _parseAttribute(
      _proposeTemperature({ valueShape: "bucketed_list", ...bucket }),
      TEMPERATURE_COLUMN_ID,
    );

    expect(temperature?.valueShape).toBe("single");
    expect(temperature).not.toHaveProperty("bucketGrain");
    expect(temperature).not.toHaveProperty("bucketColumnId");
  });

  it("drops a period sent with a field that keeps one value", () => {
    const temperature = _parseAttribute(
      _proposeTemperature({
        valueShape: "single",
        bucketGrain: "month",
        bucketColumnId: VISIT_DATE_COLUMN_ID,
      }),
      TEMPERATURE_COLUMN_ID,
    );

    expect(temperature).not.toHaveProperty("bucketGrain");
  });

  it("keeps the label at one value, without a period, when proposed per month", () => {
    const argsJson = JSON.stringify({
      ...JSON.parse(
        _proposeTemperature({
          valueShape: "bucketed_list",
          bucketGrain: "month",
          bucketColumnId: VISIT_DATE_COLUMN_ID,
        }),
      ),
      labelColumnId: TEMPERATURE_COLUMN_ID,
    });

    const temperature = _parseAttribute(argsJson, TEMPERATURE_COLUMN_ID);
    expect(temperature?.valueShape).toBe("single");
    expect(temperature).not.toHaveProperty("bucketGrain");
  });
});
```

Add `import type { ChatProposedCaseAttribute } from "$/types/chat.types.ts";` to the file.

- [ ] **Step 2: Write the failing tool schema and prompt tests**

In `makeChatToolConfigFromOptions.test.ts`, in plan 3's test that asserts `valueShape`'s enum, change the expected enum to `["single", "list", "bucketed_list"]`, and add:

```ts
  it("lets proposeCaseType keep a field per day, week, month, quarter, or year", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: {
          properties: {
            attributes: {
              items: {
                properties: Record<
                  string,
                  { type?: string; enum?: readonly string[] } | undefined
                >;
                required: readonly string[];
              };
            };
          };
        };
      };
    }>;
    const attributeSchema = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    })?.function.parameters.properties.attributes.items;

    expect(attributeSchema?.properties.bucketGrain?.enum).toEqual([
      "day",
      "week",
      "month",
      "quarter",
      "year",
    ]);
    expect(attributeSchema?.properties.bucketColumnId?.type).toBe("string");
    expect(attributeSchema?.required).not.toContain("bucketGrain");
  });
```

In `buildCaseManagerSystemPrompt.test.ts`, add:

```ts
  it("tells the model to keep a value per month when the user asks for one", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain('`valueShape: "bucketed_list"`');
    expect(prompt).toContain("per day, week, month, quarter, or year");
    expect(prompt).toContain(
      "Never make a per-period field the label or a join key",
    );
  });
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm test:frontend parseProposeCaseType makeChatToolConfigFromOptions buildCaseManagerSystemPrompt`
Expected: FAIL. The parser reads every per-month proposal as one value; the schema has no `bucketGrain`; the prompt has no per-period rule.

- [ ] **Step 4: Parse a per-period proposal**

In `parseProposeCaseType.ts`, add `import { omit } from "@avandar/utils";`, `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";`, and `ChatCaseBucketGrain` to the chat type import. Add below plan 3's `_asValueShape`:

```ts
function _asBucketGrain(value: unknown): ChatCaseBucketGrain | undefined {
  const text = _asTrimmedString(value);
  return ConceptAttribute.BUCKET_GRAINS.find((bucketGrain) => {
    return bucketGrain === text;
  });
}

/**
 * An attribute's shape and, for a per-period one, its period and date
 * column. A per-period proposal without a known period and a column id
 * falls back to one value, like an unknown rule: the user can still choose
 * a period in the card. The column's type cannot be checked here, since the
 * tool call carries ids only; the client checks it.
 */
function _parseValueShape(
  record: Readonly<Record<string, unknown>>,
): Pick<
  ChatProposedCaseAttribute,
  "valueShape" | "bucketGrain" | "bucketColumnId"
> {
  if (record.valueShape !== "bucketed_list") {
    return { valueShape: _asValueShape(record.valueShape) };
  }
  const bucketGrain = _asBucketGrain(record.bucketGrain);
  const bucketColumnId = _asUuid(record.bucketColumnId);
  return bucketGrain && bucketColumnId
    ? { valueShape: "bucketed_list", bucketGrain, bucketColumnId }
    : { valueShape: "single" };
}
```

In `_parseAttribute`'s returned object, replace plan 3's `valueShape: _asValueShape(record.valueShape),` with `..._parseValueShape(record),`. In plan 3's `_withKeyAndLabelColumnsSingle`, drop the period with the shape:

```ts
    return singleColumnIds.has(attribute.columnId)
      ? {
          ...omit(attribute, ["bucketGrain", "bucketColumnId"]),
          valueShape: "single",
        }
      : attribute;
```

and change its docstring's "neither can be a list" to "neither can be a list of either kind".

- [ ] **Step 5: Offer the shape in the tool schema**

In `makeChatToolConfigFromOptions.ts`, add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";`. In the `proposeCaseType` attribute item, make plan 3's `valueShape` enum `["single", "list", "bucketed_list"]`, append to its description `" Use bucketed_list for one value per day, week, month, quarter, or year, with bucketGrain and bucketColumnId."`, and add after it:

```ts
                bucketGrain: {
                  type: "string",
                  enum: ConceptAttribute.BUCKET_GRAINS,
                  description:
                    "Only with valueShape bucketed_list: the period to keep one value for, such as month for a monthly average.",
                },
                bucketColumnId: {
                  type: "string",
                  description:
                    "Only with valueShape bucketed_list: the id of a date or timestamp column in the same dataset, copied verbatim from the catalog, that places each row in a period.",
                },
```

Neither joins `required`. Leave `createCaseTypes` alone.

- [ ] **Step 6: Guide the model**

In `buildCaseManagerSystemPrompt.ts`, add after plan 3's list bullet in "Other rules for a good draft":

```
- When the user wants a value per day, week, month, quarter, or year (for example "monthly average temperature" or "cases per week"), propose that column with \`valueShape: "bucketed_list"\`, the period as \`bucketGrain\`, and a date or timestamp column of the same dataset as \`bucketColumnId\`. The value picker then applies within each period: avg for a monthly average, count for cases per week. If the dataset has no date or timestamp column, propose one value instead. Never make a per-period field the label or a join key.
```

In the goal sentence plan 3 changed, add ", or one value per period" after "or as a list of every value".

- [ ] **Step 7: Run them and watch them pass**

```bash
pnpm test:frontend parseProposeCaseType parseCreateCaseTypes makeChatToolConfigFromOptions buildCaseManagerSystemPrompt
pnpm type-check
```

Expected: PASS, including `deno check`.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add supabase/functions/chat/PostChatMessages
git commit -m "feat(joined-cases): let chat propose a field per month or another period"
```

---

## Task 13: The case type form refuses an incomplete per-period field

**Files:**
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle.ts` (+ test)
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx` (the `validate` object)

Plan 3's `keepKeyAndLabelFieldsSingle` sets `isArray: false` on an identifier or the label. A per-period field switched to an ID or title field keeps its period that way, and the check constraint refuses the whole case type.

- [ ] **Step 1: Write the failing test**

Add to `keepKeyAndLabelFieldsSingle.test.ts`, which builds its fields with plan 3's `_listField`:

```ts
  it("drops the period and date column from a key field that had one", () => {
    const key = _listField({ name: "County", isIdentifier: true });
    const perMonthKey = {
      ...key,
      bucketGrain: "month" as const,
      mappings: {
        ...key.mappings,
        datasetColumn: {
          ...key.mappings.datasetColumn,
          bucketColumnId: uuid<DatasetColumnId>(),
        },
      },
    };

    const [kept] = keepKeyAndLabelFieldsSingle({
      attributes: [perMonthKey],
      labelAttributeId: undefined,
    });

    expect(kept).toMatchObject({ isArray: false, bucketGrain: undefined });
    expect(kept?.mappings.datasetColumn.bucketColumnId).toBeUndefined();
  });
```

Add `import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";` if the file lacks it.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend keepKeyAndLabelFieldsSingle`
Expected: FAIL, `bucketGrain` is still `"month"`.

- [ ] **Step 3: Drop the period with the list**

In `keepKeyAndLabelFieldsSingle.ts`, replace `? { ...attribute, isArray: false }` with:

```ts
      ? {
          ...attribute,
          isArray: false,
          // A per-period field is a list too: the key or label drops its
          // period and its date column with it.
          bucketGrain: undefined,
          mappings: {
            ...attribute.mappings,
            datasetColumn: {
              ...attribute.mappings.datasetColumn,
              bucketColumnId: undefined,
            },
          },
        }
```

and change the docstring's "keeps one value" sentence to "Identifiers and the label keep one value: never a list, and never one value per period."

- [ ] **Step 4: Refuse a period without a date column**

In `ConceptCreatorView/index.tsx`, add to the form's `validate` object, beside `manualEntryAttributes`:

```ts
      datasetColumnAttributes: {
        // The field's period controls already say "This dataset has no date
        // column" beside it. This rule only stops the submit while one is
        // missing, as the statuses rule does for its editor.
        bucketGrain: (bucketGrain, values, path) => {
          const attribute =
            values.datasetColumnAttributes[Number(path.split(".")[1])];
          return bucketGrain !== undefined &&
            attribute?.mappings.datasetColumn.bucketColumnId === undefined
            ? t`Choose the date column for this field`
            : null;
        },
      },
```

If `validate.datasetColumnAttributes` already exists, add `bucketGrain` to it.

- [ ] **Step 5: Run the tests and the checks**

```bash
pnpm test:frontend keepKeyAndLabelFieldsSingle conceptFormTypes
pnpm type-check
pnpm i18n:extract && pnpm i18n:compile
```

Expected: PASS; `messages.po` gains `Choose the date column for this field`.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add src/views/OntologyDesignerApp/ConceptCreatorView src/i18n/locales
git commit -m "fix(joined-cases): keep the case type form from saving an incomplete per-period field"
```

---

## Task 14: Chat's SQL context describes per-period fields

**Files:**
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAlias.types.ts`, `SqlTableAliasModule.ts` (+ `SqlTableAlias.test.ts`)
- Modify: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts` (+ test)
- Modify: `supabase/functions/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts` (+ test)
- Modify: `shared/types/offlineChat.types.ts`, `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts` (+ test)
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts.ts` (+ test)

Plan 3 marks a field `(list)` and adds its list note when `is_array` is true, which a per-period field also is. Its note's advice (`list_contains("field", 'value')`) is wrong for a list of structs, so a per-period field gets its own marker and note instead.

- [ ] **Step 1: Write the failing tests**

Add to `SqlTableAlias.test.ts`:

```ts
const PER_MONTH_SCHEMA = {
  aliases: SqlTableAlias.fromSchema({
    datasets: [],
    concepts: [{ id: "concept-visits", name: "Patient" }],
  }),
  columns: [],
  conceptAttributes: [
    { concept_id: "concept-visits", name: "Name" },
    {
      concept_id: "concept-visits",
      name: "Temperature",
      is_array: true,
      bucket_grain: "month",
      data_type: "double",
    },
  ],
};

describe("SqlTableAlias and per-period fields", () => {
  it("writes a per-month field with the struct its entries hold", () => {
    expect(SqlTableAlias.formatSchemaBlock(PER_MONTH_SCHEMA)).toBe(
      "- c0: Patient (Name, Temperature [per month: STRUCT(bucket DATE, value DOUBLE)[]])",
    );
  });

  it("explains how to unnest a per-period field only when the schema has one", () => {
    expect(
      SqlTableAlias.formatBucketedFieldNote(PER_MONTH_SCHEMA.conceptAttributes),
    ).toContain('UNNEST(c."Temperature") AS p(entry)');
    expect(
      SqlTableAlias.formatBucketedFieldNote([
        { concept_id: "concept-visits", name: "Name" },
      ]),
    ).toBe("");
  });

  it("does not give a per-period field the plain list note", () => {
    expect(
      SqlTableAlias.formatListFieldNote(PER_MONTH_SCHEMA.conceptAttributes),
    ).toBe("");
  });
});
```

In `fetchWorkspaceSchema.test.ts`, make the fake client answer only the columns a query selects, as PostgREST does. In `createFakeClient`, declare `let selectedColumns: string | undefined;` inside `from(table)`, and replace the chain's `select` and `throwOnError` with:

```ts
          select: (columns?: string) => {
            selectedColumns = columns;
            return chain;
          },
```

```ts
          throwOnError: async () => {
            const rows = (rowsByTable[table] ?? []) as Array<
              Record<string, unknown>
            >;
            const columnNames = selectedColumns?.split(",").map((name) => {
              return name.trim();
            });
            return {
              data:
                columnNames === undefined
                  ? rows
                  : rows.map((row) => {
                      return Object.fromEntries(
                        columnNames.flatMap((name) => {
                          return name in row ? [[name, row[name]]] : [];
                        }),
                      );
                    }),
            };
          },
```

and add:

```ts
  it("returns each field's period and value type, and nothing else of it", async () => {
    const fake = createFakeClient({
      datasets: [],
      dataset_columns: [],
      concepts: [{ id: CONCEPT_ID, name: "Patient" }],
      concept_attributes: [
        {
          concept_id: CONCEPT_ID,
          name: "Temperature",
          is_array: true,
          bucket_grain: "month",
          data_type: "double",
          description: "Never part of the schema",
        },
      ],
      concept_statuses: [],
    });

    const schema = await fetchWorkspaceSchema({
      supabaseClient: fake.supabaseClient,
      workspaceId: WORKSPACE_ID,
    });

    expect(schema.conceptAttributes).toEqual([
      {
        concept_id: CONCEPT_ID,
        name: "Temperature",
        is_array: true,
        bucket_grain: "month",
        data_type: "double",
      },
    ]);
  });
```

Add to `buildSqlSystemPrompt.test.ts`, beside plan 3's list case and calling the builder the same way:

```ts
  it("marks a per-month field and explains how to unnest it", () => {
    const prompt = buildSqlSystemPrompt({
      prompt: "average temperature per month",
      datasets: [],
      columns: [],
      concepts: [{ id: "concept-visits", name: "Patient" }],
      conceptAttributes: [
        {
          concept_id: "concept-visits",
          name: "Temperature",
          is_array: true,
          bucket_grain: "month",
          data_type: "double",
        },
      ],
    });

    expect(prompt).toContain(
      "Temperature [per month: STRUCT(bucket DATE, value DOUBLE)[]]",
    );
    expect(prompt).toContain('UNNEST(c."Temperature") AS p(entry)');
    expect(prompt).not.toContain("Temperature (list)");
  });
```

Add to `fetchOfflineChatSchema.test.ts`:

```ts
  it("carries each field's period and value type into the offline schema", async () => {
    conceptAttributeGetAllMock.mockResolvedValue([
      {
        conceptId: CONCEPT_ID,
        name: "Temperature",
        isArray: true,
        bucketGrain: "month",
        dataType: "double",
      },
    ]);

    const schema = await fetchOfflineChatSchema({
      workspace: { id: WORKSPACE_ID } as Workspace.T,
      navigatorOnLine: true,
    });

    expect(schema.conceptAttributes).toEqual([
      {
        concept_id: CONCEPT_ID,
        name: "Temperature",
        is_array: true,
        bucket_grain: "month",
        data_type: "double",
      },
    ]);
  });
```

and to `buildOfflinePrompts.test.ts`'s `describe("buildOfflineSqlPrompt", ...)`, beside plan 3's list case and built the same way with `conceptAttributes: [{ concept_id: CONCEPT_ID, name: "Temperature", is_array: true, bucket_grain: "month", data_type: "double" }]`:

```ts
    expect(prompt).toContain(
      "- c0: Case (Temperature [per month: STRUCT(bucket DATE, value DOUBLE)[]])",
    );
    expect(prompt).toContain("UNNEST");
    expect(prompt).not.toContain("list_contains");
```

in a test named "marks a per-month field and explains how to unnest it offline".

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm test:frontend SqlTableAlias fetchWorkspaceSchema buildSqlSystemPrompt fetchOfflineChatSchema buildOfflinePrompts`
Expected: FAIL. The field is written `Temperature (list)`, `formatBucketedFieldNote` is not a function, the list note covers it, and neither schema carries `bucket_grain`.

- [ ] **Step 3: Write the marker and the note**

In `SqlTableAlias.types.ts`, add to `SqlTableAliasConceptAttribute` after plan 3's `is_array`:

```ts
  /**
   * The period of a field that keeps one value per period. Optional, so a
   * schema cached before per-period fields still reads.
   */
  bucket_grain?: string | null;
  /** The type of one value, or of each period's value. */
  data_type?: string;
```

In `SqlTableAliasModule.ts`, make plan 3's `_formatConceptAttributeName` check the period first:

```ts
function _formatConceptAttributeName(
  attribute: SqlTableAliasConceptAttribute,
): string {
  if (attribute.bucket_grain) {
    const valueType = (attribute.data_type ?? "varchar").toUpperCase();
    return `${attribute.name} [per ${attribute.bucket_grain}: STRUCT(bucket DATE, value ${valueType})[]]`;
  }
  return attribute.is_array === true
    ? `${attribute.name} (list)`
    : attribute.name;
}
```

Make plan 3's `_formatListFieldNote` count only lists without a period:

```ts
  return conceptAttributes.some((attribute) => {
    return attribute.is_array === true && !attribute.bucket_grain;
  })
    ? LIST_FIELD_NOTE
    : "";
```

and add below it:

```ts
const BUCKETED_FIELD_NOTE = `- A field marked [per <period>: STRUCT(bucket DATE, value T)[]] holds one entry per period that has data, oldest first. Each entry's bucket is the period's first day. A period with no data is missing, not zero. Read it with UNNEST, for example: SELECT p.entry.bucket AS period, p.entry.value FROM "c0" AS c, UNNEST(c."Temperature") AS p(entry)`;

function _formatBucketedFieldNote(
  conceptAttributes: readonly SqlTableAliasConceptAttribute[],
): string {
  return conceptAttributes.some((attribute) => {
    return Boolean(attribute.bucket_grain);
  })
    ? BUCKETED_FIELD_NOTE
    : "";
}
```

Add to `SqlTableAliasModule`:

```ts
  /**
   * The prompt note that explains how to read a per-period field, or an
   * empty string when no field has a period, so a prompt only pays for it
   * when it applies.
   */
  formatBucketedFieldNote: _formatBucketedFieldNote,
```

- [ ] **Step 4: Read the period online and add the note**

In `fetchWorkspaceSchema.ts`, add `bucket_grain: string | null;` and `data_type: string;` to the `ConceptAttribute` type and change the select to `.select("concept_id, name, is_array, bucket_grain, data_type")`.

In `buildSqlSystemPrompt.ts`, extend the local type to `type ConceptAttribute = { concept_id: string; name: string; is_array?: boolean; bucket_grain?: string | null; data_type?: string };`, add after plan 3's `listFieldNote`:

```ts
  const bucketedFieldNote =
    SqlTableAlias.formatBucketedFieldNote(conceptAttributes);
```

and in the Notes, after plan 3's `${listFieldNote ? ... : ""}` line, add:

```
${bucketedFieldNote ? `${bucketedFieldNote}\n` : ""}
```

- [ ] **Step 5: Carry the period offline and add the note**

In `shared/types/offlineChat.types.ts`, add to `OfflineChatSchemaConceptAttribute`:

```ts
  /** The period of a per-period field. Absent in an older cache. */
  bucket_grain?: string | null;
  /** The type of one value, or of each period's. Absent in an older cache. */
  data_type?: string;
```

In `fetchOfflineChatSchema.ts`'s `_mapConcepts`, return each attribute as:

```ts
      return {
        concept_id: attribute.conceptId,
        name: attribute.name,
        is_array: attribute.isArray,
        data_type: attribute.dataType,
        ...(attribute.bucketGrain ? { bucket_grain: attribute.bucketGrain } : {}),
      };
```

(`bucket_grain` only when set, so plan 3's offline test keeps its expected rows.) In `buildOfflinePrompts.ts`'s `formatOfflineSqlSchemaNotes`, add beside plan 3's `listFieldNote`:

```ts
  const bucketedFieldNote = SqlTableAlias.formatBucketedFieldNote(
    schema.conceptAttributes ?? [],
  );
```

and append `${bucketedFieldNote ? `\n${bucketedFieldNote}` : ""}` after plan 3's list note at the end of the Rules.

- [ ] **Step 6: Run them and watch them pass**

```bash
pnpm test:frontend SqlTableAlias fetchWorkspaceSchema buildSqlSystemPrompt fetchOfflineChatSchema buildOfflinePrompts truncateSchemaForOffline narrowOfflineSchema ensureOfflineChatSchema
pnpm type-check
```

Expected: PASS, including `deno check`.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add shared/models/chat/SqlTableAlias shared/types/offlineChat.types.ts supabase/functions/chat src/components/ChatPanel/useAvandarChatRuntime
git commit -m "feat(joined-cases): tell chat how to read a per-period field"
```

---

## Task 15: The Data Explorer labels each period

**Files:**
- Test: `src/clients/DuckDbClient/duckDbArrowResults/duckDbArrowResults.test.ts` (plan 3's)
- Modify: `shared/models/queries/QueryColumn/QueryColumnModule.ts` (+ `QueryColumn.test.ts`)
- Modify: `shared/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types.ts`, `makeProjectionDescriptorsFromStructuredQuery/makeProjectionDescriptorsFromStructuredQuery.ts` (+ test), `reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings.ts` (+ test)
- Modify: `shared/models/queries/QueryResult/QueryResult.types.ts`
- Modify: `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts` (+ test), `src/lib/ui/viz/DataGrid.tsx`, `src/components/VisualizationContainer/VisualizationContainer.tsx`

Plan 3's grid joins a list's values with `; `, which prints a struct as `[object Object]`. A per-period cell shows `period: value` pairs instead, each period labeled by the grain its result column carries (spec §5.7). The grain reaches the result column through the structured query: `QueryColumn.getBucketGrain` puts it on the projection descriptor, and binding copies it onto the bound column. This is where umbrella §6's `bucketGrain` lives in place of `RelationColumn` (spec §10, deviation 1).

- [ ] **Step 1: Pin how a per-period cell arrives**

Add to plan 3's `duckDbArrowResults.test.ts`:

```ts
  // Plan 3's struct branch already does this; the test pins the two facts
  // every per-period reader depends on.
  it("returns a per-month cell as periods whose bucket is epoch milliseconds and whose BIGINT is a number", () => {
    const periodType = new arrow.Struct([
      new arrow.Field("bucket", new arrow.DateDay()),
      new arrow.Field("value", new arrow.Int64()),
    ]);
    const visits = arrow.vectorFromArray(
      [[{ bucket: new Date(Date.UTC(2026, 0, 1)), value: 4n }]],
      new arrow.List(new arrow.Field("item", periodType, true)),
    );

    expect(_readCells(visits)).toEqual([
      [{ bucket: Date.UTC(2026, 0, 1), value: 4 }],
    ]);
  });
```

Run: `pnpm test:frontend duckDbArrowResults`
Expected: PASS at once. If it fails, plan 3's struct branch is missing: add it as plan 3's Task 7 Step 4 shows (`objectValuesMap(value.toJSON(), _toJsValueFromArrowValue)` for an `arrow.StructRow`).

- [ ] **Step 2: Write the failing tests**

Add to `QueryColumn.test.ts`, using Task 10's `TEMPERATURE_PER_MONTH`:

```ts
  it("gives a per-month column its period when read whole, and none when counted", () => {
    expect(
      QueryColumn.getBucketGrain({
        column: TEMPERATURE_PER_MONTH,
        aggregation: undefined,
      }),
    ).toBe("month");
    expect(
      QueryColumn.getBucketGrain({
        column: TEMPERATURE_PER_MONTH,
        aggregation: "group_by",
      }),
    ).toBe("month");
    expect(
      QueryColumn.getBucketGrain({
        column: TEMPERATURE_PER_MONTH,
        aggregation: "count",
      }),
    ).toBeUndefined();
  });
```

Add to `makeProjectionDescriptorsFromStructuredQuery.test.ts`:

```ts
  it("predicts a per-month column's period for its result", () => {
    const temperature = QueryColumn.makeFromConceptAttribute(
      Model.make("ConceptAttribute", {
        id: "temperature-id",
        name: "Temperature",
        dataType: "double",
        isArray: true,
        bucketGrain: "month",
      }) as ConceptAttribute.T,
    );

    const [descriptor] = makeProjectionDescriptorsFromStructuredQuery({
      ..._query(),
      queryColumns: [temperature],
      aggregations: {},
    });

    expect(descriptor?.bucketGrain).toBe("month");
  });
```

with `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";`. Add to `reconcileQueryResultColumnBindings.test.ts`, calling the function the way the file's other cases do:

```ts
  it("gives a bound result column the period its projection predicted", () => {
    const { columns } = reconcileQueryResultColumnBindings({
      scopeKey: "owner",
      sqlKey: "per-month",
      previous: undefined,
      columns: [{ name: "Temperature", dataType: "varchar", isArray: true }],
      projections: [
        {
          ..._projection({ queryResultColumnName: "Temperature" }),
          bucketGrain: "month",
        },
      ],
    });

    expect(columns[0]?.bucketGrain).toBe("month");
  });
```

Add to `makeDataGridColumnDefs.test.ts`:

```ts
/** One per-period cell's text, in a column that knows `bucketGrain`. */
function _formatPeriods(
  value: unknown,
  bucketGrain: ConceptAttribute.BucketGrain | undefined,
): string {
  const [columnDef] = makeDataGridColumnDefs({
    columnNames: ["Temperature"],
    data: [{ Temperature: value }],
    dateColumns: undefined,
    dateFormat: "YYYY-MM-DD",
    bucketGrains: bucketGrain ? { Temperature: bucketGrain } : {},
  });
  return columnDef!.valueFormatter({ value });
}

const APRIL_AND_JULY = [
  { bucket: Date.UTC(2026, 3, 1), value: 38.5 },
  { bucket: Date.UTC(2026, 6, 1), value: 37.9 },
];
```

```ts
  it.each([
    ["day", [{ bucket: Date.UTC(2026, 3, 1), value: 38.5 }], "2026-04-01: 38.50"],
    ["week", [{ bucket: Date.UTC(2026, 2, 30), value: 38.5 }], "2026-03-30: 38.50"],
    ["month", APRIL_AND_JULY, "2026-04: 38.50; 2026-07: 37.90"],
    ["quarter", APRIL_AND_JULY, "2026-Q2: 38.50; 2026-Q3: 37.90"],
    [
      "year",
      [
        { bucket: Date.UTC(2025, 0, 1), value: 38.5 },
        { bucket: Date.UTC(2026, 0, 1), value: 37.9 },
      ],
      "2025: 38.50; 2026: 37.90",
    ],
    [undefined, APRIL_AND_JULY, "2026-04-01: 38.50; 2026-07-01: 37.90"],
  ] as const)(
    "labels each %s period of a per-period cell",
    (bucketGrain, value, text) => {
      expect(_formatPeriods(value, bucketGrain)).toBe(text);
    },
  );

  it("shows a per-period cell as periods even in a column marked as dates", () => {
    const [columnDef] = makeDataGridColumnDefs({
      columnNames: ["First visit per month"],
      data: [{ "First visit per month": APRIL_AND_JULY }],
      dateColumns: new Set(["First visit per month"]),
      dateFormat: "YYYY-MM-DD",
      bucketGrains: { "First visit per month": "month" },
    });

    expect(columnDef!.valueFormatter({ value: APRIL_AND_JULY })).toBe(
      "2026-04: 38.50; 2026-07: 37.90",
    );
  });
```

with `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";`.

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm test:frontend QueryColumn makeProjectionDescriptorsFromStructuredQuery reconcileQueryResultColumnBindings makeDataGridColumnDefs`
Expected: FAIL. `getBucketGrain` is not a function, no descriptor or binding has `bucketGrain`, and the grid cells read `[object Object]; [object Object]`.

- [ ] **Step 4: A query column's period**

In `QueryColumnModule.ts`, add `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";` if only the value import is present, and add to the module object:

```ts
  /**
   * The period of a per-period field this column reads whole, or `undefined`
   * for any other column. A count of a per-period field is a number, so it
   * has no period; grouping keeps the list. Use it to label a result's
   * periods, for example in a results grid.
   */
  getBucketGrain: (
    options: Readonly<{
      column: QueryColumn.T;
      aggregation: QueryAggregationType.T | undefined;
    }>,
  ): ConceptAttribute.BucketGrain | undefined => {
    const { baseColumn } = options.column;
    if (baseColumn.__type !== "ConceptAttribute") {
      return undefined;
    }
    const isReadWhole =
      options.aggregation === undefined ||
      options.aggregation === "none" ||
      options.aggregation === "group_by";
    return isReadWhole ? baseColumn.bucketGrain : undefined;
  },
```

- [ ] **Step 5: Carry the period to the result column**

In `QueryResult.types.ts`, add `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";` and, to `QueryResultColumn` after plan 3's `isArray`:

```ts
  /**
   * The period of a per-period field read whole, known when the query was
   * built in the query builder. A results grid labels each period by it.
   * Absent for any other column, and for a raw SQL result.
   */
  bucketGrain?: ConceptAttribute.BucketGrain;
```

In `QueryResultColumnBindings.types.ts`, add to `ProjectionDescriptor`:

```ts
  /**
   * The period of a per-period field this projection reads whole, which
   * binding copies onto the result column. Absent otherwise.
   */
  bucketGrain?: ConceptAttribute.BucketGrain;
```

importing the type the same way. In `makeProjectionDescriptorsFromStructuredQuery.ts`, compute the period beside `aggregation` and spread it into each returned descriptor:

```ts
    const bucketGrain = QueryColumn.getBucketGrain({ column, aggregation });
```

```ts
      ...(bucketGrain ? { bucketGrain } : {}),
```

In `reconcileQueryResultColumnBindings.ts`'s `_bindProjection`, add to the returned `binding` after `sqlExpressionKey`:

```ts
      ...(projection.bucketGrain ? { bucketGrain: projection.bucketGrain } : {}),
```

- [ ] **Step 6: Label periods in the grid**

In `makeDataGridColumnDefs.ts`, add `import { match } from "ts-pattern";`, `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";`, a `bucketGrains?: Readonly<Record<string, ConceptAttribute.BucketGrain>>;` option documented "The period of each per-period column, by column name, for labeling its periods.", and, below plan 3's `_formatCellValue`:

```ts
/**
 * A period's label in the grid. ISO-style, so it needs no translation and
 * matches the grid's `YYYY-MM-DD` dates: a month is `2026-04`, a quarter
 * `2026-Q2`, a year `2026`, and a day, a week, or an unknown period its
 * first day.
 */
function _formatPeriod(
  bucket: string,
  bucketGrain: ConceptAttribute.BucketGrain | undefined,
): string {
  return match(bucketGrain)
    .with("month", () => {
      return bucket.slice(0, 7);
    })
    .with("quarter", () => {
      const quarter = Math.floor((Number(bucket.slice(5, 7)) - 1) / 3) + 1;
      return `${bucket.slice(0, 4)}-Q${quarter}`;
    })
    .with("year", () => {
      return bucket.slice(0, 4);
    })
    .with("day", "week", undefined, () => {
      return bucket;
    })
    .exhaustive();
}

/**
 * A per-period cell as `period: value` pairs joined like a list's values, or
 * `undefined` for any other value. An empty list is left to the list
 * formatting, which shows it blank.
 */
function _formatPeriodsCell(
  value: unknown,
  bucketGrain: ConceptAttribute.BucketGrain | undefined,
): string | undefined {
  const entries = ConceptAttribute.toBucketedListEntries(value);
  if (!entries || entries.length === 0) {
    return undefined;
  }
  return entries
    .map((entry) => {
      return `${_formatPeriod(entry.bucket, bucketGrain)}: ${_formatCellValue(entry.value)}`;
    })
    .join("; ");
}
```

Destructure `bucketGrains` with the other options, and wrap each column's formatter so a per-period cell is checked first, before the date branch:

```ts
    const formatValue = isDate
      ? (value: unknown) => {
          return formatQueryResultDate(value, {
            format: columnDateFormat,
            timezone,
          });
        }
      : _formatCellValue;
    return {
      field: field,
      headerName: field,
      filter: true,
      valueFormatter: (params: { value: unknown }) => {
        // First, so a per-period field of dates is never read as one date.
        return (
          _formatPeriodsCell(params.value, bucketGrains?.[field]) ??
          formatValue(params.value)
        );
      },
    };
```

In `DataGrid.tsx`, add the prop `bucketGrains?: Readonly<Record<string, ConceptAttribute.BucketGrain>>;` (same doc), pass it to `makeDataGridColumnDefs`, and add it to the memo's dependencies. In `VisualizationContainer.tsx`, compute the grains of the bound columns once per render of the component:

```ts
  // The period of each per-period column the query builder knew about.
  const bucketGrains = useMemo(() => {
    return Object.fromEntries(
      columns.flatMap((column) => {
        return column.bucketGrain ? [[column.name, column.bucketGrain]] : [];
      }),
    );
  }, [columns]);
```

and pass `bucketGrains={bucketGrains}` to the table branch's `DataGrid`.

- [ ] **Step 7: Run them and watch them pass**

```bash
pnpm test:frontend QueryColumn makeProjectionDescriptorsFromStructuredQuery reconcileQueryResultColumnBindings makeDataGridColumnDefs duckDbArrowResults VisualizationContainer useQueryResultColumnBindings
pnpm type-check
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add src/clients/DuckDbClient/duckDbArrowResults shared/models/queries src/lib/ui/viz src/components/VisualizationContainer
git commit -m "feat(joined-cases): label a per-period field's periods in the Data Explorer"
```

---

## Task 16: E2E: a per-month field on the record page and in the Data Explorer

**Files:**
- Create: `tests/data/case-bucketed-visits/case-bucketed-visits.csv`, `tests/data/case-bucketed-visits/README.md`
- Modify: `tests/e2e/helpers/constants.ts`
- Modify: `tests/e2e/helpers/CaseTypeSeedHelpers.ts`
- Create: `tests/e2e/case-bucketed-fields.spec.ts`

The spec seeds its preconditions (the dataset through the import UI, the case type and its records through `rpc_concepts__create`, as `case-statuses-data-explorer.spec.ts` does) and drives the behavior under test, reading the field, through the UI. Creating a per-period field through the form and the draft card is covered by Task 10's component tests and checked by hand in Task 17.

- [ ] **Step 1: Add the fixture data**

Create `tests/data/case-bucketed-visits/case-bucketed-visits.csv`:

```csv
patient_id,visit_date,temperature
p-001,2026-01-05,38.0
p-001,2026-01-20,39.0
p-001,2026-02-03,
p-001,2026-02-10,37.9
p-001,,40.1
p-001,2026-03-15,
p-002,2026-01-12,37.0
```

Create `tests/data/case-bucketed-visits/README.md`:

```markdown
# case-bucketed-visits

Seven synthetic patient visits, for tests of a case type field that keeps one
value per month.

## What it's for

`p-001` averages 38.5 in January and 37.9 in February. Its rows also hold an
empty temperature (ignored), a visit with no date (ignored), and a March whose
only temperature is empty (no March at all), so a period or a value that
should not exist would show. `p-002` has one January visit.
```

In `tests/e2e/helpers/constants.ts`, add after `SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT`:

```ts
/**
 * Seven patient visits with a date and a temperature, for a per-month case
 * type field. See the README beside it.
 */
export const CASE_BUCKETED_VISITS_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/case-bucketed-visits/case-bucketed-visits.csv",
);

/** Row count reported after DuckDB parses {@link CASE_BUCKETED_VISITS_CSV_PATH}. */
export const CASE_BUCKETED_VISITS_CSV_EXPECTED_ROW_COUNT = 7;
```

- [ ] **Step 2: Add the seeding helper**

In `CaseTypeSeedHelpers.ts`, add above `_deleteCaseType`:

```ts
type SeedCaseTypeWithPerMonthFieldOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  caseTypeName: string;
  datasetId: string;
  /** The dataset column whose values key, and label, each record. */
  keyColumnName: string;
  keyAttributeName: string;
  /** The column averaged per month, and the field's name. */
  valueColumnName: string;
  fieldName: string;
  /** The date column that places each row in a month. */
  dateColumnName: string;
  /** One record per key, named after it. */
  recordKeys: readonly string[];
};

/**
 * Seeds a case type whose label and identifier reads `keyColumnName`, and
 * whose second field keeps the average of `valueColumnName` per month of
 * `dateColumnName`, with Active and Inactive statuses and one Active record
 * per key.
 */
async function _seedCaseTypeWithPerMonthField(
  options: Readonly<SeedCaseTypeWithPerMonthFieldOptions>,
): Promise<SeededCaseType> {
  const { supabaseAdminClient, workspaceId, datasetId } = options;
  const [ownerId, keyColumnId, valueColumnId, dateColumnId] =
    await Promise.all([
      _getWorkspaceOwnerId({ supabaseAdminClient, workspaceId }),
      _getDatasetColumnId({
        supabaseAdminClient,
        datasetId,
        columnName: options.keyColumnName,
      }),
      _getDatasetColumnId({
        supabaseAdminClient,
        datasetId,
        columnName: options.valueColumnName,
      }),
      _getDatasetColumnId({
        supabaseAdminClient,
        datasetId,
        columnName: options.dateColumnName,
      }),
    ]);
  const conceptId = randomUUID();
  const keyAttributeId = randomUUID();
  const fieldAttributeId = randomUUID();
  const statusIdsByName = { Active: randomUUID(), Inactive: randomUUID() };

  await supabaseAdminClient
    .rpc("rpc_concepts__create", {
      p_concept: {
        id: conceptId,
        workspace_id: workspaceId,
        owner_id: ownerId,
        name: options.caseTypeName,
        description: null,
        allow_manual_creation: false,
        default_status_id: statusIdsByName.Active,
      },
      p_statuses: [
        {
          id: statusIdsByName.Active,
          name: "Active",
          description: "Open and being worked on.",
          color: "#40c057",
          position: 0,
        },
        {
          id: statusIdsByName.Inactive,
          name: "Inactive",
          description: "No longer being worked on.",
          color: "#637c95",
          position: 1,
        },
      ],
      p_attributes: [
        {
          id: keyAttributeId,
          name: options.keyAttributeName,
          description: null,
          data_type: "varchar",
          mapping_type: "dataset_column",
          is_label: true,
          is_identifier: true,
          is_array: false,
          allow_manual_edit: false,
        },
        {
          id: fieldAttributeId,
          name: options.fieldName,
          description: null,
          // The type of each month's value: an average is a decimal.
          data_type: "double",
          mapping_type: "dataset_column",
          is_label: false,
          is_identifier: false,
          is_array: true,
          allow_manual_edit: false,
          bucket_grain: "month",
        },
      ],
      p_dataset_column_mappings: [
        {
          concept_attribute_id: keyAttributeId,
          value_picker_rule_type: "first",
          dataset_id: datasetId,
          dataset_column_id: keyColumnId,
        },
        {
          concept_attribute_id: fieldAttributeId,
          value_picker_rule_type: "avg",
          dataset_id: datasetId,
          dataset_column_id: valueColumnId,
          bucket_column_id: dateColumnId,
        },
      ],
      p_manual_entry_mappings: [],
    })
    .throwOnError();

  try {
    await supabaseAdminClient
      .from("individuals")
      .insert(
        options.recordKeys.map((key) => {
          return {
            workspace_id: workspaceId,
            concept_id: conceptId,
            external_id: key,
            name: key,
            status_id: statusIdsByName.Active,
          };
        }),
      )
      .throwOnError();
  } catch (insertError) {
    await _deleteCaseType({ supabaseAdminClient, conceptId });
    throw insertError;
  }

  return { conceptId, statusIdsByName };
}
```

and to `CaseTypeSeedHelpers`:

```ts
  /**
   * Seeds a dataset-backed case type with a field that keeps one average
   * per month, and one Active record per key.
   */
  seedCaseTypeWithPerMonthField: _seedCaseTypeWithPerMonthField,
```

If plans 1 to 3 changed how `_seedCaseTypeOverDataset` inserts records (for example dropping `name`), insert them the same way here.

- [ ] **Step 3: Write the spec**

Create `tests/e2e/case-bucketed-fields.spec.ts`:

```ts
/*
 * A per-month field, end to end: a case type whose Temperature field keeps
 * each month's average shows one row per month on the record page, and the
 * same months and averages in the Data Explorer.
 *
 * The visits dataset is imported and the case type seeded in `beforeAll`, in
 * a browser context of its own: the case type list is cached for minutes once
 * a session loads it, so the session under test has to start after the case
 * type exists. The rows hold an empty temperature, a visit with no date, and
 * a month whose only temperature is empty, so a month or a value that should
 * not exist would show.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CaseTypeSeedHelpers } from "./helpers/CaseTypeSeedHelpers";
import {
  CASE_BUCKETED_VISITS_CSV_EXPECTED_ROW_COUNT,
  CASE_BUCKETED_VISITS_CSV_PATH,
} from "./helpers/constants";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { SeededCaseType } from "./helpers/CaseTypeSeedHelpers";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E patient visits";
const KEY_ATTRIBUTE_NAME = "Patient";
const FIELD_NAME = "Temperature";

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  caseType: SeededCaseType | undefined;
} = { workspaceId: undefined, datasetId: undefined, caseType: undefined };

/** Every value rendered in one column of the results grid. */
async function _getColumnCellTexts(options: {
  page: Page;
  columnName: string;
}): Promise<string[]> {
  const { page, columnName } = options;
  const header = page.getByRole("columnheader", {
    name: columnName,
    exact: true,
  });
  const columnIndex = await header.evaluate((element) => {
    return Number(element.getAttribute("aria-colindex") ?? "0");
  });
  return page
    .locator(`[role="gridcell"][aria-colindex="${columnIndex}"]`)
    .allInnerTexts();
}

/** Selects the case type's patient and temperature in the query form. */
async function _queryPatientTemperatures(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Data Explorer", exact: true }).click();
  await dismissBlockingOverlays(page);
  await openDataExplorerDrawerTab({ page, tab: "query" });

  const queryPanel = page.getByRole("tabpanel", { name: /^query$/i });
  const dataSourceInput = queryPanel.getByRole("combobox", {
    name: "Data source",
    exact: true,
  });
  await expect(dataSourceInput).toBeEnabled({ timeout: MEDIUM_WAIT });
  await dataSourceInput.click();
  await page.getByRole("option", { name: CASE_TYPE_NAME, exact: true }).click();

  const columnsInput = queryPanel.getByPlaceholder("Select columns to query");
  for (const columnName of [KEY_ATTRIBUTE_NAME, FIELD_NAME]) {
    await columnsInput.fill(columnName);
    await page.getByRole("option", { name: columnName, exact: true }).click();
  }
  await page.keyboard.press("Escape");
}

test.describe("Per-month case type fields", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      reducedMotion: "reduce",
    });
    await installDuckDbExtensionCache(context);
    try {
      const page = await context.newPage();
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await importDatasetViaUi({
        page,
        filePath: CASE_BUCKETED_VISITS_CSV_PATH,
        expectedRowCount: CASE_BUCKETED_VISITS_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug,
        onDatasetCreated: (datasetId) => {
          seededWorld.datasetId = datasetId;
        },
      });
    } finally {
      await context.close();
    }

    if (!seededWorld.datasetId) {
      throw new Error("The visits dataset was not created.");
    }
    // The trigger refuses a date column the import did not type as a date,
    // so a sniffing change fails here, not as an empty table later.
    seededWorld.caseType =
      await CaseTypeSeedHelpers.seedCaseTypeWithPerMonthField({
        supabaseAdminClient: admin,
        workspaceId: seededWorld.workspaceId,
        caseTypeName: CASE_TYPE_NAME,
        datasetId: seededWorld.datasetId,
        keyColumnName: "patient_id",
        keyAttributeName: KEY_ATTRIBUTE_NAME,
        valueColumnName: "temperature",
        fieldName: FIELD_NAME,
        dateColumnName: "visit_date",
        recordKeys: ["p-001", "p-002"],
      });
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    if (seededWorld.caseType) {
      await CaseTypeSeedHelpers.deleteCaseType({
        supabaseAdminClient: admin,
        conceptId: seededWorld.caseType.conceptId,
      });
    }
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin,
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("shows each month's average temperature as one row per month on the record page", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
    // Each row's link names the record after its status dot.
    await page.getByRole("link", { name: /p-001$/ }).click();

    const table = page.getByRole("table", { name: `${FIELD_NAME} per month` });
    await expect(table.getByRole("row")).toHaveText(
      [/Month\s*Value/, /Jan 2026\s*38\.5/, /Feb 2026\s*37\.9/],
      { timeout: MEDIUM_WAIT },
    );
  });

  test("shows the same months and averages in the Data Explorer", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await _queryPatientTemperatures(page);

    await expect
      .poll(
        async () => {
          return (
            await _getColumnCellTexts({ page, columnName: FIELD_NAME })
          ).sort();
        },
        { timeout: MEDIUM_WAIT },
      )
      .toEqual(["2026-01: 37.00", "2026-01: 38.50; 2026-02: 37.90"]);
  });
});
```

- [ ] **Step 4: Run it**

Run: `pnpm test:e2e case-bucketed-fields.spec.ts`
Expected: PASS, two tests, each under the 45-second local limit. A failure in `beforeAll` naming `bucket_column_not_a_date` means the import typed `visit_date` as text; check the sniffed type in Data Sources before changing anything.

- [ ] **Step 5: Commit**

```bash
git add tests/data/case-bucketed-visits tests/e2e/helpers/constants.ts tests/e2e/helpers/CaseTypeSeedHelpers.ts tests/e2e/case-bucketed-fields.spec.ts
git commit -m "test(joined-cases): show a per-month field on the record page and in the Data Explorer"
```

---

## Task 17: Translations and full verification

**Files:**
- Modify: `src/i18n/locales/*` (generated)
- Screenshots: `.temp/feat-joined-cases/` (gitignored)

- [ ] **Step 1: Audit the string checks**

```bash
rg -n '=== "list"|!== "list"|=== "single"|!== "single"|is_array === true' src shared supabase --type ts
```

Expected: every hit treats a per-period field as Tasks 10 to 14 decided: more than one value wherever the question is "a list?", its own marker and note in chat's schema context. Fix any hit that does not, with a test beside it.

- [ ] **Step 2: Extract and compile the catalogs**

```bash
pnpm i18n:extract && pnpm i18n:compile
pnpm i18n:check
```

Expected: the catalogs carry every message Tasks 7 to 13 added, with no unreferenced strings; `i18n:check` is clean after the commit in Step 5.

- [ ] **Step 3: Run every automated suite**

```bash
ava supabase status
pnpm test:db
pnpm test:frontend
pnpm test:executed
pnpm type-check
pnpm lint
pnpm desktop:sqlite:check-migrations
pnpm test:e2e case-bucketed-fields.spec.ts
pnpm test:e2e case-list-field.spec.ts
```

Expected: PASS. Run the two E2E specs one at a time; the second is plan 3's, whose control name Task 10 changed.

- [ ] **Step 4: Check the authoring paths in the running app**

Start the app (`pnpm dev`; if it exits on ngrok, run Vite and the edge functions directly as the memory note says), and drive a headless browser with the Playwright MCP, signed in with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from `seed/SeedData.ts` in `TEST_WORKSPACE_SLUG`. Screenshot each step into `.temp/feat-joined-cases/`.

1. Import `tests/data/case-bucketed-visits/case-bucketed-visits.csv`.
2. Open the concept creator (Spotlight, "case type creator"), pick the dataset, choose `patient_id` as its ID field, add `temperature`, choose **Per period**, and confirm the period reads **Per month**, the date column `visit_date`, and the rule select reads "In each period, ...". Choose **Average** and create. The case type page shows a **Per month** badge on Temperature.
3. Open record `p-001`: the rail shows a Temperature table with **Jan 2026 / 38.5** and **Feb 2026 / 37.9**, and no March.
4. If the chat edge function and its model key are configured, start **New case type** from Case Manager, ask for "patients with their average temperature per month", and confirm the draft card shows Temperature with **Per period**, **Per month**, and `visit_date`. Then, in the Data Explorer chat, ask "average temperature per month for each patient" and confirm the SQL unnests the field (`UNNEST(...)`) and returns the same two months for `p-001`. If chat is not configured, record that in the task's report rather than skipping silently.

- [ ] **Step 5: Commit the catalogs**

```bash
git add src/i18n/locales
git commit -m "chore(joined-cases): extract and compile the per-period field messages"
```

---

## Task 18: Update the ontology architecture doc

**Files:**
- Modify: `docs/ontology-architecture.md`
- Modify: `docs/superpowers/specs/2026-11-06-joined-cases-4-bucketed-list-fields-design.md` (only if Task 0 Step 3 found a renamed name)

Plans 1 to 3 rewrote parts of this doc. Edit the sections as they now read, adding per-period fields beside lists; keep every "as of" marker true.

- [ ] **Step 1: Section 4, the data model**

In the ER diagram, add `enum bucket_grain` to `concept_attributes` and `uuid bucket_column_id` to `attribute_mappings__dataset_column`. In the table, extend the `concept_attributes` row's notes with "`bucket_grain` makes a list field keep one value per period" and the mapping row's with "`bucket_column_id` names the date column a per-period field groups its rows by". Add to "Database-enforced integrity":

```markdown
- A field with a `bucket_grain` is a dataset list field that is neither the
  label nor an identifier (`concept_attributes__bucket_grain_requires_array`,
  `concept_attributes__bucket_grain_dataset_value_only`).
- A dataset-column mapping names a `bucket_column_id` exactly when its field
  has a `bucket_grain`, and then a `date` or `timestamp` column of its own
  dataset (`tr__attribute_mappings__dataset_column__validate_bucket_column`).
  It runs on the mapping, after the RPC has written the field, so unlike the
  identifier check it never runs too early.
- `rpc_concepts__create` requires a value rule on every dataset field except
  a list without a period (`value_rule_mismatch`).
```

- [ ] **Step 2: Section 5, authoring**

After plan 3's paragraph on list fields, add:

```markdown
A field can also keep one value per period (`bucketed_list`): per day, week,
month, quarter, or year of a date or timestamp column of its dataset, each
period reduced by the field's rule. The form and the draft card offer it as
a third choice, **Per period**, beside **One value** and **Every value**, and
`PeriodControls` picks the period and the date column. Chat proposes it when
the user asks for a value "per month" or another period. The parser keeps a
per-period proposal only with a known period and a column id, and
`createdCaseTypeToFormValues` drops one whose date column is not a date of
its own dataset, as it drops an unknown column id.
```

- [ ] **Step 3: Sections 7 and 8, reading values**

In section 7, after the list paragraph, add a table:

```markdown
A per-period field is `STRUCT(bucket DATE, value R)[]`: one entry per period
with a non-NULL value, ordered by `bucket`, `[]` when none. `bucket` is
`CAST(date_trunc(<period>, <date column>) AS DATE)`, so weeks start on Monday
and quarters are calendar quarters; a missing period means no data, not zero.
`buildBucketedListValueSql` normalizes the rows to `(bucket, value,
row_order)`, drops NULL values and NULL dates, and applies the rule per
period:

| Rule | Per period | `R` |
| --- | --- | --- |
| `first` | `first(value ORDER BY row_order)` | column type |
| `most_frequent` | count each value, then the highest count, ties by value | column type |
| `sum`, `avg` | `CAST(... AS DOUBLE)` | `DOUBLE` |
| `count` | `COUNT(value)` | `BIGINT` |
| `max`, `min` | uncast | column type |
```

In section 8's guarantees table, add a row: "Per-period columns | `buildBucketedListValueSql/` | one entry per period with a value, ordered, `[]` when none; an unmapped per-period field is a typed `[]`; a missing, foreign, or non-date date column throws at planning". Add to the planning row: "fetches each per-period field's date column", and to the needed-columns note (or the projection row, wherever plans 1 to 3 describe it): "a per-period field's date column is part of its dataset's projection".

- [ ] **Step 4: Sections 9 and 10**

In section 9, add to the record page row "a per-period field shows as a period and value table (`RecordFieldPeriodTable`): the six most recent periods and a Show all modal", and to "Outside the routes" a bullet for `src/components/caseFields/` (`ValueShapeControl`, `PeriodControls`, `useBucketGrainLabels`, `useBucketPeriodFormatter`). In section 10, add rows for the two checks, the trigger, and "A per-period field is a list in every Data Explorer gate | `QueryColumn.isList` | sort, group by, count; no filter, sum, or chart measure".

- [ ] **Step 5: Section 12, adding a field shape**

Add a subsection after the mapping-kind checklist:

```markdown
### 12.1 Adding a value shape

A new value shape (`single`, `list`, and `bucketed_list` exist) starts by
widening `ConceptAttributeValueShape` and `ChatCaseValueShape`; `pnpm
type-check` then lists every exhaustive branch. These sites compile without
change and must be found by hand:

| Site | Failure if missed |
| --- | --- |
| `rpc_concepts__create` column lists and its `value_rule_mismatch` check | Columns silently not written; fields refused |
| The model parsers' `DBReadSchema` | Columns dropped from reads and from the insert payload |
| `getConceptRelationPlansFromSql._getMappedDatasetColumns` | Planning cannot find a column the shape reads |
| `getNeededColumnsFromQuery._getConceptColumnsByDatasetId` | A projected load omits it and the view fails to bind |
| `parseProposeCaseType` and the key and label coercion in the parser, the draft editor, and `keepKeyAndLabelFieldsSingle` | The shape is read as one value, or kept on a key |
| `formatSchemaBlock`'s markers and notes, `fetchWorkspaceSchema`, `fetchOfflineChatSchema` | Chat writes SQL for the wrong shape |
| `makeDataGridColumnDefs` | The grid prints `[object Object]` |
```

- [ ] **Step 6: Sections 15 and 16**

In section 15, add rows: pgTAP `concept_attributes__bucketed_list.test.sql`; executed `buildBucketedListValueSql.executed.test.ts`; E2E `case-bucketed-fields.spec.ts` (run on its own). In section 16, add:

| Limitation | Effect | Status |
| --- | --- | --- |
| Per-period fields have only a list's Data Explorer operations | Filtering or charting by period needs chat SQL | Read |
| Periods are cut on the stored wall clock | A `timestamp` column is never converted between time zones | Read |
| A date column retyped after creation | Every query of the case type fails at planning until the field is fixed | Read |

- [ ] **Step 7: Reconcile the child spec**

If Task 0 Step 3 found a name that differs from the plan, add a row for it under "Deviations from the umbrella spec" in the child spec.

- [ ] **Step 8: Commit**

```bash
git add docs/ontology-architecture.md docs/superpowers/specs/2026-11-06-joined-cases-4-bucketed-list-fields-design.md
git commit -m "docs(joined-cases): describe per-period fields in the ontology architecture"
```

---

## Verification checklist

- [ ] `pnpm test:db` passes, including the 22 assertions of `concept_attributes__bucketed_list.test.sql` and the migration upgrade tests.
- [ ] `pnpm test:executed` passes, including every rule per period in `buildBucketedListValueSql.executed.test.ts`.
- [ ] `pnpm test:frontend`, `pnpm type-check`, and `pnpm lint` pass.
- [ ] `pnpm test:frontend duckDbArrowResults` passes, including the map, map-in-a-list, and union decimals Task 5 added.
- [ ] `RecordFieldPeriodTable` formats its values through `useFieldValueFormatter` (`rg -n "useFieldValueFormatter" src/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable` finds `useBucketValueFormatter.ts`).
- [ ] `pnpm test:e2e case-bucketed-fields.spec.ts` and `pnpm test:e2e case-list-field.spec.ts` pass, each run on its own.
- [ ] `pnpm i18n:check` and `pnpm desktop:sqlite:check-migrations` are clean.
- [ ] The Task 17 screenshots show the form's period controls, the case type page's badge, and the record page's table.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing was run against production.

## What plan 5 inherits

- **The seam.** `buildBucketedListValueSql` has three steps: `_buildSourceRowsSql` (one source's rows as `bucket, value, row_order`), `_buildPerBucketValuesSql` (the rule per period), and the list wrapper. Plan 5 replaces only the first, with a `UNION ALL` of sources, each keyed by its own dataset's key column and its own date column, with the value cast to the field's type and a `source_position` column; `first` then orders by `source_position, row_order`.
- **The names.** `bucketColumnName` on the `bucketed_list` arm of `ConceptAttributeValueRule` moves into `ConceptAttributeSource.bucketColumnName`; `bucketGrain` and `valuePickerRuleType` stay with the field. `bucketColumnId` on the chat attribute moves into `ChatCaseAttributeSource.bucketColumnId`; `bucketGrain` stays on the attribute.
- **Every source needs a date column.** The mapping trigger already checks each mapping row on its own, so it holds with several sources per field. A `date` source and a `timestamp` source stack, because each bucket is cast to `DATE`.
- **The silent sites multiply by source:** the date column of every source must be fetched in planning and kept in each dataset's projection.
- **The rule check.** When the rule moves onto `concept_attributes`, plan 5's check constraint replaces `value_rule_mismatch` and must keep "a rule exactly when the field is not a list without a period".
- **The draft card is keyed by `columnId`.** One column holds one field in a draft; a field drawn from several columns needs its own key.
