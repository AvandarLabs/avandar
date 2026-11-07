# Joined Cases 4: Bucketed List Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a case type field hold one value per day, week, month, quarter, or year of a date column, as `STRUCT(bucket DATE, value R)[]` computed by the concept view with each rule's single-value semantics, authored from the concept creator form and chat, and shown on the record page, in the Data Explorer, and to chat SQL.

**Architecture:** The field stores its period (`concept_attributes.bucket_grain`); its mapping stores the date column (`attribute_mappings__dataset_column.bucket_column_id`), and a trigger keeps the two consistent. The concept view reads a per-period field through one correlated subquery that normalizes the source rows to `(bucket, value, row_order)`, reduces each period with the field's rule, and aggregates the periods into an ordered list. Every reader receives that list unchanged; a shared model function (`ConceptAttribute.toBucketedListEntries`) reads it, and the record page renders it as a period and value table.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP), TypeScript, Zod, DuckDB (QETL, executed Vitest through `@duckdb/node-api`), React, Mantine, Lingui, Deno edge functions, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-4-bucketed-list-fields-design.md`. Section numbers (§) refer to it. **Umbrella:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md`. **Overview and ground rules:** `docs/superpowers/plans/2026-11-06-joined-cases.md`. Every ground rule there applies to every task here.

**Prerequisite:** plans 1 to 3 (`2026-11-06-joined-cases-1-record-page-concept-view.md`, `-2-typed-value-rules.md`, `-3-list-fields.md`) have landed on `feat/joined-cases`. Task 0 checks what they left behind.

---

## Required skills

- **`supabase-declarative-schema`** before Tasks 1 and 2. Edit `supabase/schemas/`, run `pnpm db:reset` and then immediately `pnpm db:new-migration <name>`, and never hand-edit what it generates. This plan has no hand-written migration: no existing row changes, and the enum is new rather than extended.
- **`test-driven-development`** throughout.
- **`impeccable`** before Task 11. The record page's per-period table is a new surface (overview ground rule 9).
- **`duckdb-docs`** if a DuckDB construct in Task 5 behaves unexpectedly. Every construct used was probed against `@duckdb/node-api` 1.5.5 while writing this plan.
- **`playwright-best-practices`** before Task 17.

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
| 2 | `<ts>_rpc_concepts__create_writes_bucket_columns.sql` | generated | `rpc_concepts__create` writes both new columns |

## Names this plan adds

Shared names come from umbrella §6. The rest are local to this gap.

| Kind | Name | Where |
| --- | --- | --- |
| Enum (shared) | `public.concept_attributes__bucket_grain` (`day`, `week`, `month`, `quarter`, `year`); TS `ConceptAttribute.BucketGrain` | `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql` |
| Columns (shared) | `concept_attributes.bucket_grain` (TS `bucketGrain`), `attribute_mappings__dataset_column.bucket_column_id` (TS `bucketColumnId`) | schema, models |
| Checks | `concept_attributes__bucket_grain_requires_array`, `concept_attributes__bucket_grain_dataset_value_only` | `20.concept_attributes.sql` |
| Trigger | `tr__attribute_mappings__dataset_column__validate_bucket_column`, function `attribute_mappings__dataset_column__validate_bucket_column()` | `30.attribute_mappings__dataset_column.sql` |
| Value shape (shared) | `"bucketed_list"` in `ConceptAttribute.ValueShape` and `ChatCaseValueShape` | models, chat contract |
| Model | `ConceptAttribute.BUCKET_GRAINS`, `ConceptAttribute.isBucketDateColumnType`, `ConceptAttribute.toBucketedListEntries`, `ConceptAttribute.BucketedListEntry` | the attribute module |
| SQL (shared) | struct fields `bucket` and `value` | |
| SQL builder | `buildBucketedListValueSql`, `buildBucketedListTypeSql`, `BucketedListValueSqlOptions` | `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/` |
| Field (shared) | `RelationColumn.bucketGrain` | `RelationSchema.types.ts` |
| Chat (shared) | `ChatCaseBucketGrain`; `bucketGrain`, `bucketColumnId` on chat attributes | `shared/types/chat.types.ts` |
| UI | `ValueShapeChoice`, `useValueShapeOptions`, `useBucketPeriodFormatter`, `BucketedListTable` | `src/components/caseFields/` |
| Draft editor | `setAttributeBucket` | `useCaseTypeDraftEditor` |
| Schema context | `SqlTableAlias.formatBucketedFieldNote` | `shared/models/chat/SqlTableAlias/` |

## File map

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.concept_attributes__bucket_grain.sql` (new) | The period enum |
| `supabase/schemas/20.concept_attributes.sql` | `bucket_grain` and two checks |
| `supabase/schemas/30.attribute_mappings__dataset_column.sql` | `bucket_column_id` and the validating trigger |
| `supabase/schemas/50.rpc_concepts__create.sql` | Writes both columns |
| `supabase/tests/database/concept_attributes__bucketed_list.test.sql` (new) | Checks, trigger, RPC round trip |
| `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql` | Generated |
| `shared/models/ontology/ConceptAttribute/` | Type, field, parser, `BUCKET_GRAINS`, `isBucketDateColumnType`, `toBucketedListEntries`, widened `ValueShape` |
| `shared/models/ontology/AttributeMapping/DatasetColumnMapping/` | `bucketColumnId` and its parser |
| `src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/` (new) | The per-period SQL and its executed test |
| The column dispatch (Task 0), `makeConceptAttributeColumnsFromMetadata.ts` | Column fields, resolution, fail-closed throws, typed NULL |
| `getConceptRelationPlansFromSql.ts`, `getNeededColumnsFromQuery.ts` | Fetch and project the date column |
| `shared/models/relations/RelationSchema/RelationSchema.types.ts` and its producers | `bucketGrain` |
| `src/clients/DuckDbClient/duckDbArrowResults.ts` | Struct rows become plain objects with numbers |
| `src/components/caseFields/` (new) | Shape choice, option labels, period labels, the record page table |
| `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.ts` | Grid text for a per-period cell |
| `shared/types/chat.types.ts`, `parseProposeCaseType.ts`, `makeChatToolConfigFromOptions.ts`, `buildCaseManagerSystemPrompt.ts` | Chat contract, parser, tool schema, prompt |
| `src/components/ChatPanel/CaseTypeDraftBlock/` | Draft card period and date column controls |
| `proposedCaseTypeToCreatedCaseType.ts`, `createdCaseTypeToFormValues.ts` | Conversions |
| `fetchWorkspaceSchema.ts`, `fetchOfflineChatSchema.ts`, `offlineChat.types.ts`, `SqlTableAlias`, `buildSqlSystemPrompt.ts`, `buildOfflinePrompts.ts` | Chat SQL schema context |
| `src/views/OntologyDesignerApp/ConceptCreatorView/` | Form shape control, date column, validation |
| `CaseDetailsRail.tsx`, `SingleIndividualView/index.tsx`, the operation gate, `CaseTypeAttributesList.tsx` | Per-period rendering and gating |
| `tests/e2e/case-bucketed-fields.spec.ts`, `tests/e2e/helpers/CaseTypeSeedHelpers.ts`, `tests/data/case-bucketed-visits/` (new) | End to end |
| `docs/ontology-architecture.md` | The architecture doc |

---

## Task 0: Confirm what plans 1 to 3 left behind

**Files:** none. No commit.

Plans 1 to 3 were written in parallel with this one. This task finds the code they produced, so every later task edits the right place.

- [ ] **Step 1: Find the column dispatch**

```bash
rg -n "export function buildAttributeValueSql" src/clients/qetl/QueryMediator/conceptRelation
rg -n "_buildColumnSelector|_buildArraySelector|isArray|valueShape" src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts src/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql.ts
```

Expected: `buildAttributeValueSql` exists. The code choosing between a single value, a list, and an unmapped typed NULL is either still `_buildColumnSelector` in `buildConceptViewSql.ts` or has moved into `buildAttributeValueSql.ts`. This plan calls it **the column dispatch**. If the `dataset_column` arm of `ConceptAttributeColumn` no longer carries `isArray` but a `valueShape`, do Task 16 Step 3 (widen the union) at the start of Task 6.

- [ ] **Step 2: Find the value shape**

```bash
rg -n "ValueShape|getValueShape" shared/models/ontology/ConceptAttribute
rg -ln "getValueShape\(" src shared supabase
rg -n "ChatCaseValueShape" shared/types/chat.types.ts
```

Expected: `ConceptAttribute.ValueShape` and `getValueShape` live in `shared/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts`, merged into the `ConceptAttribute` namespace by `ConceptAttribute.ts` the way `ConceptStatus.ts` merges `ConceptStatusModule`. This plan calls that file **the attribute module** and its test, `ConceptAttributeModule/ConceptAttributeModule.test.ts`, **the attribute module test**. Keep the second command's file list: Task 16 is not done until every file in it handles `"bucketed_list"`.

- [ ] **Step 3: Find the comparisons the compiler cannot find**

```bash
rg -n '=== "list"|!== "list"|=== "single"|!== "single"' src shared supabase --type ts
rg -n "getOutputDataType" src shared supabase --type ts
```

Write the hits down. The rule for each one (spec §5.2, §5.6):

- A test that means "does this field hold more than one value?" must be true for `"bucketed_list"`. Write it as `!== "single"`.
- A field's `data_type` is the rule's output type for `"single"` and `"bucketed_list"`, and the column's type only for `"list"`.

Tasks 13, 15, and 16 fix the hits in the files they touch. Any hit left after Task 16 is fixed in Task 18 Step 1.

- [ ] **Step 4: Find the reading surfaces**

```bash
rg -n "ConceptRecordValuesClient|valuesByAttributeId" src/views/IndividualManagerApp
rg -n "valueShape|isArray" src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx
rg -ln "getValueShape|isArray" src/views/DataExplorerApp shared/models/queries
rg -n "toJSON|StructRow" src/clients/DuckDbClient/duckDbArrowResults.ts
ls src/clients/qetl/wrappers/ConceptWrapper 2>/dev/null
ls src/components/caseFields 2>/dev/null
```

Expected: the record page builds `CaseDetailsRow`s from `getConceptRecordValues`; the rail renders a list field differently from a single one; one function in the Data Explorer decides which operations a list column offers (this plan calls it **the operation gate**); `_toJsValueFromArrowValue` converts each list element through itself instead of calling `toJSON` on it. Note whether `ConceptWrapper` still exists (Task 8) and whether plan 3 created `src/components/caseFields/` (Task 10 adds to it either way).

- [ ] **Step 5: Reconcile names**

If any name or path differs from this plan, use the landed one everywhere this plan uses the planned one, and add a row for it to the child spec's "Deviations" section in Task 19.

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

## Task 2: `rpc_concepts__create` writes both columns

**Files:**
- Modify: `supabase/schemas/50.rpc_concepts__create.sql:93-149` (the attribute and dataset-column mapping inserts) and its docstring
- Modify: `supabase/tests/database/concept_attributes__bucketed_list.test.sql`
- Create: `supabase/migrations/<ts>_rpc_concepts__create_writes_bucket_columns.sql` (generated)

`jsonb_to_recordset` only reads the keys its column list names, so without this change the RPC silently drops a period and a date column, and the trigger from Task 1 then refuses every per-period mapping.

- [ ] **Step 1: Check the Supabase switch**

Run: `ava supabase status`
Expected: the switched `feat-joined-cases` project.

- [ ] **Step 2: Add the failing assertions**

In `supabase/tests/database/concept_attributes__bucketed_list.test.sql`, change `select plan (14);` to `select plan (20);`, and add these assertions directly before `select * from finish ();`:

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
  'the RPC creates a case type with a per-month field'
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
  'a refused per-month field leaves no case type behind'
);
```

- [ ] **Step 3: Run it and watch it fail**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__bucketed_list.test.sql
```

Expected: FAIL on 16 (`have: NULL`), 17 (`have: NULL`), and 19 (`no exception thrown`). Assertion 15 passes because the RPC ignores both keys and the trigger then sees a field without a period and a mapping without a date column.

- [ ] **Step 4: Write both columns**

In `supabase/schemas/50.rpc_concepts__create.sql`, replace the attribute insert:

```sql
  -- One statement, so the label trigger counts every attribute at once.
  insert into public.concept_attributes (
    id,
    workspace_id,
    concept_id,
    name,
    description,
    data_type,
    mapping_type,
    is_label,
    is_identifier,
    is_array,
    allow_manual_edit
  )
  select
    a.id,
    v_workspace_id,
    v_concept_id,
    a.name,
    a.description,
    a.data_type,
    a.mapping_type,
    a.is_label,
    a.is_identifier,
    a.is_array,
    a.allow_manual_edit
  from jsonb_to_recordset(p_attributes) as a (
    id uuid,
    name text,
    description text,
    data_type public.datasets__ava_data_type,
    mapping_type public.concept_attributes__mapping_type,
    is_label boolean,
    is_identifier boolean,
    is_array boolean,
    allow_manual_edit boolean
  );
```

with:

```sql
  -- One statement, so the label trigger counts every attribute at once.
  insert into public.concept_attributes (
    id,
    workspace_id,
    concept_id,
    name,
    description,
    data_type,
    mapping_type,
    is_label,
    is_identifier,
    is_array,
    allow_manual_edit,
    bucket_grain
  )
  select
    a.id,
    v_workspace_id,
    v_concept_id,
    a.name,
    a.description,
    a.data_type,
    a.mapping_type,
    a.is_label,
    a.is_identifier,
    a.is_array,
    a.allow_manual_edit,
    a.bucket_grain
  from jsonb_to_recordset(p_attributes) as a (
    id uuid,
    name text,
    description text,
    data_type public.datasets__ava_data_type,
    mapping_type public.concept_attributes__mapping_type,
    is_label boolean,
    is_identifier boolean,
    is_array boolean,
    allow_manual_edit boolean,
    bucket_grain public.concept_attributes__bucket_grain
  );
```

and the dataset-column mapping insert:

```sql
  insert into public.attribute_mappings__dataset_column (
    workspace_id,
    concept_attribute_id,
    value_picker_rule_type,
    dataset_id,
    dataset_column_id
  )
  select
    v_workspace_id,
    m.concept_attribute_id,
    m.value_picker_rule_type,
    m.dataset_id,
    m.dataset_column_id
  from jsonb_to_recordset(p_dataset_column_mappings) as m (
    concept_attribute_id uuid,
    value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
    dataset_id uuid,
    dataset_column_id uuid
  );
```

with:

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

In the docstring, replace:

```sql
 * @param p_attributes The `concept_attributes` rows, each with its `id`.
 * @param p_dataset_column_mappings The `attribute_mappings__dataset_column`
 *   rows.
```

with:

```sql
 * @param p_attributes The `concept_attributes` rows, each with its `id`. A
 *   row without `bucket_grain` creates a field with no period.
 * @param p_dataset_column_mappings The `attribute_mappings__dataset_column`
 *   rows. A row without `bucket_column_id` names no date column.
```

If plans 1 to 3 changed these inserts, keep their columns and add only `bucket_grain` and `bucket_column_id` as shown. Run `pnpm format`.

- [ ] **Step 5: Generate the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration rpc_concepts__create_writes_bucket_columns
```

Expected: a new `<ts>_rpc_concepts__create_writes_bucket_columns.sql` holding `create or replace function public.rpc_concepts__create` and nothing else of substance. Its signature is unchanged, so no grant moves.

- [ ] **Step 6: Run the tests and watch them pass**

```bash
ava supabase status
supabase test db supabase/tests/database/concept_attributes__bucketed_list.test.sql
pnpm test:db
```

Expected: PASS, 20 assertions; then the whole database suite passes, including `rpc_concepts__create.test.sql`, whose payloads send neither new key.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/50.rpc_concepts__create.sql supabase/migrations/*_rpc_concepts__create_writes_bucket_columns.sql supabase/tests/database/concept_attributes__bucketed_list.test.sql
git commit -m "feat(joined-cases): create a case type's per-period fields in one transaction"
```

---

## Task 3: Database types, the desktop mirror, and the two model fields

**Files:**
- Modify: `shared/types/database.types.ts` (generated)
- Create: `apps/desktop/migrations/<ts>_add_bucketed_list_fields.gen.sql`, `apps/desktop/migrations/<ts>_rpc_concepts__create_writes_bucket_columns.gen.sql` (generated)
- Modify: `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts:12-34`, `ConceptAttribute.ts`, `ConceptAttributeParsers.ts:22-36`, the attribute module
- Create: `shared/models/ontology/ConceptAttribute/ConceptAttributeParsers.test.ts`
- Modify: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts:15-47`, `DatasetColumnMappingParsers.ts:24-55`
- Create: `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.test.ts`
- Modify: every fixture the compiler names in Step 10

A parser's `DBReadSchema` is also the list of keys an insert sends (`makeParserRegistry` picks the insert payload down to the schema's keys, `packages/shared/clients/src/makeParserRegistry/makeParserRegistry.ts:195-206`). Without the two new keys, `ConceptClient.create` silently drops a field's period and its date column on the way to the RPC.

- [ ] **Step 1: Regenerate the database types**

```bash
ava supabase status
pnpm db:gen-types
```

Expected: `shared/types/database.types.ts` gains `concept_attributes__bucket_grain` under `Enums`, `bucket_grain` on `concept_attributes` and `bucket_column_id` on `attribute_mappings__dataset_column` (in `Row`, `Insert`, and `Update`). `pnpm type-check` now fails in the two parsers' `ZodConsistencyTests`; Steps 5 to 9 fix it. Never hand-edit this file.

- [ ] **Step 2: Generate the SQLite migrations**

```bash
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
```

Expected: two new `.gen.sql` files, one per migration from Tasks 1 and 2, and no drift. The first adds both columns; the generator prints `needs hand-edit` for the two `add constraint` statements. Leave them recorded in the file's header, as earlier migrations do: the desktop app is pre-release, and its mirror does not need the database's constraints. The second has no schema-shape change.

- [ ] **Step 3: Write the failing parser tests**

Create `shared/models/ontology/ConceptAttribute/ConceptAttributeParsers.test.ts`:

```ts
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

If plans 1 to 3 added a column to `concept_attributes`, add it to `DB_ROW` with the value its own tests use.

Create `shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";

const DB_ROW: DatasetColumnMapping<"DBRead"> = {
  bucket_column_id: "00000000-0000-4000-8000-000000000006",
  concept_attribute_id: "00000000-0000-4000-8000-000000000002",
  created_at: "2026-11-06T00:00:00.000+00:00",
  dataset_column_id: "00000000-0000-4000-8000-000000000005",
  dataset_id: "00000000-0000-4000-8000-000000000004",
  id: "00000000-0000-4000-8000-000000000001",
  updated_at: "2026-11-06T00:00:00.000+00:00",
  value_picker_rule_type: "avg",
  workspace_id: "00000000-0000-4000-8000-000000000003",
};

describe("DatasetColumnMappingParsers", () => {
  it("reads a mapping's date column from its row", () => {
    const mapping = DatasetColumnMappingParsers.fromDBReadToModelRead(DB_ROW);

    expect(mapping.bucketColumnId).toBe(DB_ROW.bucket_column_id);
  });

  it("sends a mapping's date column when the mapping is inserted", () => {
    const dbInsert = DatasetColumnMappingParsers.fromModelInsertToDBInsert({
      type: "dataset_column",
      workspaceId: DB_ROW.workspace_id as DatasetColumnMapping["workspaceId"],
      conceptAttributeId:
        DB_ROW.concept_attribute_id as DatasetColumnMapping["conceptAttributeId"],
      valuePickerRuleType: "avg",
      datasetId: DB_ROW.dataset_id as DatasetColumnMapping["datasetId"],
      datasetColumnId:
        DB_ROW.dataset_column_id as DatasetColumnMapping["datasetColumnId"],
      bucketColumnId:
        DB_ROW.bucket_column_id as DatasetColumnMapping["datasetColumnId"],
    });

    expect(dbInsert).toMatchObject({
      bucket_column_id: DB_ROW.bucket_column_id,
    });
  });
});
```

- [ ] **Step 4: Run them and watch them fail**

Run: `pnpm test:frontend shared/models/ontology/ConceptAttribute/ConceptAttributeParsers.test.ts shared/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.test.ts`
Expected: FAIL, four tests. The read tests get `undefined` (Zod strips the unknown key); the insert tests get a payload without the key (the registry picks it out).

- [ ] **Step 5: Type the field's period**

In `shared/models/ontology/ConceptAttribute/ConceptAttribute.types.ts`, add `import type { Enums } from "$/types/database.types.ts";` and, below `ConceptAttributeId`:

```ts
/**
 * The period a per-period field keeps one value for. Mirrors the
 * `concept_attributes__bucket_grain` database enum.
 */
export type ConceptAttributeBucketGrain =
  Enums<"concept_attributes__bucket_grain">;
```

In `ConceptAttributeRead`, after `isArray: boolean;`, add:

```ts
    /**
     * Set only on a per-period field: its value is one entry per period of
     * the mapping's date column. Always `undefined` when `isArray` is false.
     */
    bucketGrain: ConceptAttributeBucketGrain | undefined;
```

and add `"bucketGrain"` to the keys `ConceptAttributeInsert` makes optional:

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

- [ ] **Step 6: List the periods in the attribute module**

In the attribute module, add `import { registry } from "@avandar/utils";` and `import type { ConceptAttributeBucketGrain } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";`, then add this member to the module object:

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

In `ConceptAttributeParsers.ts`, add `import { ConceptAttributeModule } from "$/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts";` (the attribute module, imported directly so the parser does not import the namespace file that may re-export it) and add to `DBReadSchema`:

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

and make it optional on insert:

```ts
type DatasetColumnMappingInsert = SetOptional<
  DatasetColumnMappingRead,
  "id" | "createdAt" | "updatedAt" | "bucketColumnId"
>;
```

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
Expected: errors only where a test or fixture builds a full `ConceptAttribute.T` or `DatasetColumnMapping` without the new keys. Today that includes `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts` (`_attribute` and `_mapping`) and `src/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper.test.ts` (`_createConceptAttribute`, if it survived plan 1). Add `bucketGrain: undefined` to each attribute fixture and `bucketColumnId: undefined` to each mapping fixture. Do not add them to `Insert`-typed objects: both keys are optional there. Repeat until `pnpm type-check` is clean.

- [ ] **Step 11: Run the tests and the checks**

```bash
pnpm test:frontend shared/models/ontology
pnpm type-check
```

Expected: PASS, and no type errors.

- [ ] **Step 12: Commit**

```bash
pnpm format
git add shared/types/database.types.ts apps/desktop/migrations shared/models/ontology src/clients/qetl
git commit -m "feat(joined-cases): carry a field's period and date column through the models"
```

If Step 10 touched files outside `src/clients/qetl`, add them by path too.

---

## Task 4: Reading a date column type and a per-period value

**Files:**
- Modify: the attribute module, `ConceptAttribute.types.ts`, `ConceptAttribute.ts`
- Test: the attribute module test

Two pure functions every later task uses: which columns can place rows in a period, and how to read the value DuckDB returns.

- [ ] **Step 1: Write the failing tests**

Add to the attribute module test (keep its existing imports; add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";` and `import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";` if absent):

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

Run: `pnpm test:frontend shared/models/ontology/ConceptAttribute`
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

In the attribute module, add `isDefined` to the `@avandar/utils` import, import `ConceptAttributeBucketedListEntry` with the other types and `AvaDataType` as a type, and add above the module object:

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

Run: `pnpm test:frontend shared/models/ontology/ConceptAttribute`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add shared/models/ontology/ConceptAttribute
git commit -m "feat(joined-cases): read per-period values and date column types"
```

---

## Task 5: The per-period value SQL

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
    expect(periods.p1?.map((period) => period.value)).not.toContain(99);
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

If plan 1 changed `getEntityKeyComparisonSql`'s signature, call it the way `buildAttributeValueSql` does.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql`
Expected: PASS, 30 tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add src/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql
git commit -m "feat(joined-cases): compute a per-period field's values in DuckDB"
```

---

## Task 6: The concept view reads per-period fields

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql.ts:17-40` (`ConceptAttributeColumn`) and the column dispatch (Task 0 Step 1)
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata.ts:160-236`
- Test: `src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`
- Modify: every `ConceptAttributeColumn` fixture the compiler names in Step 7

- [ ] **Step 1: Give dataset A a date column**

In the integration test's `_seed`, replace dataset A's rows and columns:

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

The view's columns come from attributes, not dataset columns, so no existing case changes.

- [ ] **Step 2: Write the failing tests**

Add `import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";` is not needed here. Add, below `_metadata`, a variant that also knows extra columns, and below the existing fixtures the per-month ones:

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

/** The per-month field's mapping, reading `age_years` grouped by `dateColumn`. */
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

Then add these cases inside the file's `describe`:

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
  it("emits a per-month field with no mapping as a typed NULL list", async () => {
    const rows = await _queryFieldAsJson({
      metadata: _metadata({
        attributes: [PERSON_ID, AGE_PER_MONTH],
        mappings: [PERSON_ID_MAPPING],
      }),
      fieldName: "age per month",
    });

    expect(rows[0]).toEqual({
      externalId: "101",
      value: null,
      typeName: 'STRUCT(bucket DATE, "value" BIGINT)[]',
    });
  });

  it.each([
    ["names no date column", undefined, [], /names no date column/],
    [
      "names a date column that does not exist",
      SEEN_ON,
      [],
      /which does not exist/,
    ],
    [
      "names a date column of another dataset",
      _typedColumn({ datasetId: DATASET_B, columnName: "seen_on", dataType: "date" }),
      [_typedColumn({ datasetId: DATASET_B, columnName: "seen_on", dataType: "date" })],
      /not of the dataset it reads/,
    ],
    [
      "names a column that is not a date or timestamp",
      _typedColumn({ datasetId: DATASET_A, columnName: "tag", dataType: "varchar" }),
      [_typedColumn({ datasetId: DATASET_A, columnName: "tag", dataType: "varchar" })],
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

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation/__tests__/conceptAttributeColumns.integration.executed.test.ts`
Expected: FAIL. The per-month field comes back as a list of every age (the plain list arm), the unmapped one as `BIGINT`, and none of the five refusals throws.

- [ ] **Step 4: Give the column its period and date column**

In `buildConceptViewSql.ts`, import `ConceptAttribute` as a type from `$/models/ontology/ConceptAttribute/ConceptAttribute` and add to the `dataset_column` arm of `ConceptAttributeColumn`, after `isArray` (or after whatever field plan 3 put there):

```ts
      /**
       * Set on a per-period field: the period it keeps one value for.
       * `bucketColumnName` is then the dataset column that places each row
       * in a period, and both are `undefined` for any other field.
       */
      bucketGrain: ConceptAttribute.BucketGrain | undefined;
      bucketColumnName: string | undefined;
```

and to the `unmapped` arm, after `duckDbDataType`:

```ts
      /**
       * Set on a per-period field, so its typed NULL is a list of periods
       * whose values have `duckDbDataType`.
       */
      bucketGrain: ConceptAttribute.BucketGrain | undefined;
```

- [ ] **Step 5: Dispatch a per-period column**

In the file holding the column dispatch, import `buildBucketedListTypeSql` and `buildBucketedListValueSql` from `@/clients/qetl/QueryMediator/conceptRelation/buildBucketedListValueSql/buildBucketedListValueSql`, and add above the dispatch:

```ts
/** A dataset column that keeps one value per period. */
type BucketedConceptAttributeColumn = Extract<
  ConceptAttributeColumn,
  { kind: "dataset_column" }
> & {
  bucketGrain: ConceptAttribute.BucketGrain;
  bucketColumnName: string;
};

function _isBucketedColumn(
  column: ConceptAttributeColumn,
): column is BucketedConceptAttributeColumn {
  return (
    column.kind === "dataset_column" &&
    column.bucketGrain !== undefined &&
    column.bucketColumnName !== undefined
  );
}
```

In the dispatch, make the unmapped branch cast a per-period field's NULL to its list type. Today's code is:

```ts
  if (column.kind === "unmapped") {
    return `CAST(NULL AS ${column.duckDbDataType}) AS ${quoteSqlIdentifier(column.attributeName)}`;
  }
```

Change it to (keeping, in the `: ...` branch, whatever type expression plans 1 to 3 left there):

```ts
  if (column.kind === "unmapped") {
    // A per-period field with nothing to read is still a list of periods, so
    // the relation's schema is the same with or without a mapping.
    const nullType =
      column.bucketGrain === undefined
        ? column.duckDbDataType
        : buildBucketedListTypeSql(column.duckDbDataType);
    return `CAST(NULL AS ${nullType}) AS ${quoteSqlIdentifier(column.attributeName)}`;
  }
```

Then, directly after the unmapped branch and before the list and single-value branches:

```ts
  if (_isBucketedColumn(column)) {
    return `${buildBucketedListValueSql({
      datasetId: column.datasetId,
      selectColumnName: column.selectColumnName,
      primaryKeyColumnName: column.primaryKeyColumnName,
      bucketColumnName: column.bucketColumnName,
      bucketGrain: column.bucketGrain,
      ruleType: column.valuePickerRuleType,
      externalIdsTable: SPINE_ALIAS,
      externalIdColumn: EXTERNAL_ID_COLUMN,
    })} AS ${quoteSqlIdentifier(column.attributeName)}`;
  }
```

If the dispatch lives in `buildAttributeValueSql`, pass the outer table and key column that its single-value arm passes instead of `SPINE_ALIAS` and `EXTERNAL_ID_COLUMN`. The per-period branch must come before the list branch: a per-period column also has `isArray` true.

- [ ] **Step 6: Resolve the date column and fail closed**

In `makeConceptAttributeColumnsFromMetadata.ts`, change `import type { ConceptAttribute }` to a value import (`import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";`, which plan 3 made a value), and add above `_buildAttributeColumn`:

```ts
/**
 * The name of the date column a per-period field groups its rows by, or
 * `undefined` for a field without a period.
 *
 * Fails closed, like the value column: a period with no readable date column
 * would answer every record with an empty list, which reads as "no data"
 * for data that may well exist.
 */
function _resolveBucketColumnName(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
  }>,
): string | undefined {
  const { attribute, mapping, metadata } = options;
  const field = `Concept attribute '${attribute.name}' (${attribute.id})`;
  if (attribute.bucketGrain === undefined) {
    if (mapping.bucketColumnId !== undefined) {
      throw new Error(
        `${field} has no period, but its mapping names date column ` +
          `'${mapping.bucketColumnId}'.`,
      );
    }
    return undefined;
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
  return bucketColumn.name;
}
```

In `_buildUnmappedColumn`, add `bucketGrain: attribute.bucketGrain,` to the returned column. In `_buildAttributeColumn`, add to the returned `dataset_column` column, after `isArray` (and any field plan 3 added):

```ts
      bucketGrain: attribute.bucketGrain,
      bucketColumnName: _resolveBucketColumnName({
        attribute,
        mapping,
        metadata,
      }),
```

- [ ] **Step 7: Fix the fixtures the compiler names**

Run: `pnpm type-check`
Expected: errors where a test builds a `dataset_column` or `unmapped` `ConceptAttributeColumn` literal, today in `buildConceptViewSql.executed.test.ts` (`AGE`, `REGION`, `TAGS`, `NOTE`), `getNeededColumnsFromQuery.test.ts` (`CONCEPT_PLAN`), and `src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts`. Add `bucketGrain: undefined, bucketColumnName: undefined` to each `dataset_column` literal and `bucketGrain: undefined` to each `unmapped` one, until the check is clean.

- [ ] **Step 8: Run the tests and watch them pass**

```bash
pnpm test:executed src/clients/qetl/QueryMediator/conceptRelation
pnpm test:frontend src/clients/qetl
pnpm type-check
```

Expected: PASS, including every existing view test.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add src/clients/qetl
git commit -m "feat(joined-cases): read per-period fields in the concept view"
```

---

## Task 7: Planning fetches, and the load keeps, the date column

**Files:**
- Modify: `src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql.ts:119-130`
- Modify: `src/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery.ts:78-93`
- Test: `getConceptRelationPlansFromSql.test.ts`, `getNeededColumnsFromQuery.test.ts`

Neither site is in `ontology-architecture.md` section 12, and neither fails to compile without this task. Without the first, planning throws "does not exist" for every per-period field. Without the second, a query whose load is projected to the columns it needs omits the date column, and the view fails to bind.

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
        return [IDENTIFIER_COLUMN, TEMPERATURE_COLUMN, VISIT_DATE_COLUMN].filter(
          (column) => {
            return filter.where.id.in.includes(column.id);
          },
        );
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
      bucketGrain: "month",
      bucketColumnName: "visit_date",
    });
  });
```

- [ ] **Step 2: Write the failing projection test**

In `getNeededColumnsFromQuery.test.ts`, hoist the plan's one column so a test can derive from it. Replace the `attributeColumns` literal in `CONCEPT_PLAN` with `attributeColumns: [AGE_COLUMN],` and declare above it, with the literal the fixture held (including the fields Task 6 Step 7 added):

```ts
const AGE_COLUMN: Extract<ConceptAttributeColumn, { kind: "dataset_column" }> =
  {
    // The literal that was in CONCEPT_PLAN.attributeColumns, unchanged.
  };
```

Fill that object with the existing literal's fields verbatim, and add `import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";`. Then add:

```ts
  it("takes a per-month field's date column from a concept plan", () => {
    const perMonthPlan: ConceptRelationPlan = {
      ...CONCEPT_PLAN,
      attributeColumns: [
        {
          ...AGE_COLUMN,
          attributeName: "temperature per month",
          selectColumnName: "temperature",
          valuePickerRuleType: "avg",
          isArray: true,
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

Run: `pnpm test:frontend src/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql src/clients/qetl/QueryMediator/getNeededColumnsFromQuery`
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
          ...(column.bucketColumnName === undefined
            ? []
            : [column.bucketColumnName]),
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

## Task 8: `RelationColumn.bucketGrain`

**Files:**
- Modify: `shared/models/relations/RelationSchema/RelationSchema.types.ts:4-27`
- Modify: `src/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema.ts:26-36`
- Modify: `src/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper.ts:104-110` and its test, if plan 1 kept them (Task 0 Step 4)

- [ ] **Step 1: Write the failing test (only if `ConceptWrapper` exists)**

In `ConceptWrapper.test.ts`, give `_createConceptAttribute` a `bucketGrain?: ConceptAttribute.BucketGrain` parameter and pass `bucketGrain: params.bucketGrain` (replacing the `bucketGrain: undefined` Task 3 added). Then add:

```ts
  it("describes a per-month attribute as a list that names its period", async () => {
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn().mockResolvedValue([
        _createConceptAttribute({
          name: "visits per month",
          dataType: "bigint",
          isArray: true,
          bucketGrain: "month",
        }),
      ]),
      getConceptExtension: vi.fn(),
    });

    await expect(wrapper.describe(CONCEPT_REF, CONTEXT)).resolves.toEqual({
      columns: [
        {
          name: "visits per month",
          dataType: "BIGINT",
          isArray: true,
          bucketGrain: "month",
        },
      ],
    });
  });
```

Run: `pnpm test:frontend src/clients/qetl/wrappers/ConceptWrapper`
Expected: FAIL, the described column has no `bucketGrain`.

If plan 1 deleted `ConceptWrapper`, skip this step: the only remaining producer always writes `undefined`, which the compiler enforces and no test can turn red.

- [ ] **Step 2: Add the field**

In `RelationSchema.types.ts`, add `import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";` and, after `isArray`:

```ts
  /**
   * Set when the column keeps one value per period: `isArray` is then true
   * and each element is `STRUCT(bucket DATE, value <dataType>)`, `bucket`
   * being the period's first day. Mirrors `ConceptAttribute.bucketGrain`.
   *
   * Required rather than optional, for the reason `isArray` is: a producer
   * that forgot it would describe a list of periods as a plain list.
   */
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
```

- [ ] **Step 3: Set it in every producer**

In `readDatasetRelationSchema.ts`, after `isArray: false,`:

```ts
        // Likewise, a dataset column never keeps one value per period.
        bucketGrain: undefined,
```

In `ConceptWrapper._toRelationColumn` (if it exists), after `isArray: attribute.isArray,`:

```ts
    bucketGrain: attribute.bucketGrain,
```

- [ ] **Step 4: Run the tests and the type check**

```bash
pnpm test:frontend src/clients/qetl/wrappers
pnpm type-check
```

Expected: PASS. The wrapper tests that compare `describe` output with `toEqual` ignore an `undefined` key.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add shared/models/relations src/clients/qetl/wrappers
git commit -m "feat(joined-cases): describe a per-period relation column"
```

---

## Task 9: Query results carry plain periods

**Files:**
- Modify: `src/clients/DuckDbClient/duckDbArrowResults.ts:10-29`
- Test: `src/clients/DuckDbClient/duckDbArrowResults.test.ts` (create it beside its siblings in this directory, unless plan 3 already did)

apache-arrow 17 returns a struct element as a `StructRow` and keeps a `BIGINT` inside it as `bigint`, which React cannot render and `count` always produces.

- [ ] **Step 1: Write the failing test**

Create the test (or add the `it` to plan 3's file):

```ts
import { createWebLogger } from "@avandar/logger";
import * as arrow from "apache-arrow";
import { describe, expect, it } from "vitest";
import { arrowTableToJS } from "@/clients/DuckDbClient/duckDbArrowResults";

const LOGGER = createWebLogger({
  loggerName: "duckDbArrowResults",
  enabled: false,
});
const JAN_1_2026 = Date.UTC(2026, 0, 1);
const FEB_1_2026 = Date.UTC(2026, 1, 1);

/** One row whose `visits` cell is a per-month list, as DuckDB returns it. */
function _createPerMonthTable(): arrow.Table {
  const periodType = new arrow.Struct([
    new arrow.Field("bucket", new arrow.DateDay()),
    new arrow.Field("value", new arrow.Int64()),
  ]);
  const visits = arrow.vectorFromArray(
    [
      [
        { bucket: new Date(JAN_1_2026), value: 4n },
        { bucket: new Date(FEB_1_2026), value: 7n },
      ],
    ],
    new arrow.List(new arrow.Field("item", periodType)),
  );
  return new arrow.Table({ visits });
}

describe("arrowTableToJS", () => {
  it("turns a per-month cell into plain periods whose BIGINT values are numbers", () => {
    const result = arrowTableToJS(_createPerMonthTable(), { logger: LOGGER });

    expect(result.data).toEqual([
      {
        visits: [
          { bucket: JAN_1_2026, value: 4 },
          { bucket: FEB_1_2026, value: 7 },
        ],
      },
    ]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/clients/DuckDbClient/duckDbArrowResults.test.ts`
Expected: FAIL, `value` is `4n`, not `4`.

- [ ] **Step 3: Convert struct rows**

In `_toJsValueFromArrowValue`, make the list branch convert each element through the same function (plan 3 may have done this already), and add a struct branch after it:

```ts
  if (value instanceof arrow.Vector) {
    // A list cell. Each element goes through this same conversion, so a list
    // of numbers, text, or structs comes out as plain values.
    return [...value].map(_toJsValueFromArrowValue);
  }
  if (value instanceof arrow.StructRow) {
    // A struct, such as one period of a per-period field. Its fields convert
    // like top-level values, so a BIGINT inside it becomes a number and a
    // DATE stays epoch milliseconds.
    return objectValuesMap(value.toJSON(), _toJsValueFromArrowValue);
  }
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend src/clients/DuckDbClient`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add src/clients/DuckDbClient/duckDbArrowResults.ts src/clients/DuckDbClient/duckDbArrowResults.test.ts
git commit -m "fix(joined-cases): return struct values from DuckDB as plain objects"
```

---
